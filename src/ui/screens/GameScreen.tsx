/**
 * Der Spielbildschirm.
 *
 * Seine eigentliche Aufgabe ist Zeitregie. Die Engine rechnet einen Zug in
 * einem einzigen Schritt durch; hier wird er wieder auseinandergelegt:
 * erst fällt der Stein, dann verschmilzt er, dann läuft die Kette. Ohne
 * diese Pausen sähe der Spieler nur das Endergebnis und verstünde nie,
 * warum er gerade 3.000 Punkte bekommen hat.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createGame, playMove, suggestColumn } from '../../game/engine';
import { COLS, GameState, Level, Mode, Position, ROWS } from '../../game/types';
import { strings } from '../../i18n/strings';
import { Settings } from '../../storage/store';
import * as feedback from '../feedback';
import { FONT, Palette, RADIUS, SPACING, STONES, TABULAR, TIMING } from '../theme';
import { Backdrop } from '../components/Backdrop';
import { BurstEffect, FallingStone, FloatEffect, GameBoard } from '../components/Board';
import { Counter } from '../components/Counter';
import { Stone } from '../components/Stone';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface GameScreenProps {
  mode: Mode;
  palette: Palette;
  /** Steuert, wie kräftig die Lichtkegel im Hintergrund auftragen dürfen. */
  dark: boolean;
  settings: Settings;
  initialGame?: GameState | null;
  onExit: () => void;
  onFinish: (game: GameState) => void;
  /** Wird bei jeder Zustandsänderung gerufen, um den Spielstand zu sichern. */
  onPersist: (game: GameState | null) => void;
}

export function GameScreen({
  mode,
  palette,
  dark,
  settings,
  initialGame,
  onExit,
  onFinish,
  onPersist,
}: GameScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [game, setGame] = useState<GameState>(
    () => initialGame ?? createGame({ mode }),
  );
  /** Was gerade zu sehen ist — hinkt dem Spielzustand absichtlich hinterher. */
  const [display, setDisplay] = useState(() => game.board);
  const [shownScore, setShownScore] = useState(game.score);
  const [falling, setFalling] = useState<FallingStone | null>(null);
  const [flashes, setFlashes] = useState<Position[]>([]);
  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const [floats, setFloats] = useState<FloatEffect[]>([]);
  const [chainBadge, setChainBadge] = useState<number | null>(null);
  const [hintColumn, setHintColumn] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  /** Für Zen: Zustände zum Zurücknehmen. */
  const history = useRef<GameState[]>([]);
  const nonce = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const badgeScale = useSharedValue(0);
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeScale.value,
    transform: [{ scale: 0.7 + badgeScale.value * 0.3 }],
  }));

  // Erschütterung und Lichtblitz sind allein dem Prisma vorbehalten. Würde
  // jede Verschmelzung den Bildschirm bewegen, wäre nach zehn Zügen niemand
  // mehr beeindruckt — und das Spiel schwer zu lesen.
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const erschuettern = useCallback(() => {
    shake.value = withSequence(
      withTiming(-7, { duration: 42 }),
      withTiming(7, { duration: 58 }),
      withTiming(-4, { duration: 52 }),
      withTiming(2, { duration: 48 }),
      withTiming(0, { duration: 56 }),
    );
    flash.value = withSequence(
      withTiming(0.4, { duration: 55 }),
      withTiming(0, { duration: 320 }),
    );
  }, [shake, flash]);

  // Zellengröße aus dem verfügbaren Platz: Das Feld soll auf einem kleinen
  // Telefon genauso vollständig sichtbar sein wie auf einem Tablet.
  const cellSize = useMemo(() => {
    const gap = 0.085;
    const verfuegbarBreite = Math.min(width - SPACING.md * 2, 440);
    const verfuegbarHoehe = height - insets.top - insets.bottom - 252;
    const nachBreite = verfuegbarBreite / (COLS + (COLS - 1) * gap);
    const nachHoehe = verfuegbarHoehe / (ROWS + (ROWS - 1) * gap);
    return Math.max(28, Math.floor(Math.min(nachBreite, nachHoehe)));
  }, [width, height, insets.top, insets.bottom]);

  const zeigeKette = useCallback(
    (chain: number) => {
      setChainBadge(chain);
      badgeScale.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(1, { duration: 420 }),
        withTiming(0, { duration: 220 }),
      );
    },
    [badgeScale],
  );

  const handleColumn = useCallback(
    async (col: number) => {
      if (busy || game.over) return;

      const outcome = playMove(game, col);
      // Volle Spalte: kein Fehler, einfach nichts tun.
      if (!outcome) return;

      setBusy(true);
      setHintColumn(null);
      if (mode === 'zen') history.current = [...history.current.slice(-49), game];

      const { result, state: nextState } = outcome;

      // 1. Der Stein fällt.
      nonce.current += 1;
      setFalling({
        col,
        row: result.landed.row,
        level: game.queue[0] as Level,
        nonce: nonce.current,
      });
      feedback.drop();
      await sleep(TIMING.drop + 40);
      if (!alive.current) return;

      // 2. Der Stein liegt — kurz sichtbar, bevor er verschmilzt.
      setFalling(null);
      setDisplay(result.boardAfterDrop);

      // 3. Kettenglieder nacheinander abspielen.
      let punkte = game.score;
      for (const step of result.steps) {
        await sleep(TIMING.mergeCollapse);
        if (!alive.current) return;

        const prismaGruppen = step.groups.filter((g) => g.resultLevel === null);
        const prismaHier = prismaGruppen.length > 0;
        const marke = `${nonce.current}-${step.chain}`;

        // Funken aus jeder verschmelzenden Zelle, in der Farbe, die dort
        // gerade verschwindet.
        setBursts(
          step.groups.flatMap((g, gi) =>
            g.cells.map((cell, ci) => ({
              id: `${marke}-${gi}-${ci}`,
              row: cell.row,
              col: cell.col,
              colour: STONES[g.level].glow,
            })),
          ),
        );

        // Die Punktzahl steigt dort auf, wo der neue Stein entsteht.
        const leit = step.groups[0];
        setFloats([
          {
            id: marke,
            row: leit.anchor.row,
            col: leit.anchor.col,
            value: step.points,
            colour: prismaHier ? '#2B7FFF' : STONES[leit.level].shade,
            chain: step.chain,
          },
        ]);

        if (prismaHier) {
          setFlashes(prismaGruppen.map((g) => g.anchor));
          erschuettern();
          feedback.prisma();
        } else {
          feedback.merge(step.chain);
        }

        setDisplay(step.board);
        punkte += step.points;
        setShownScore(punkte);
        if (step.chain >= 2) zeigeKette(step.chain);

        await sleep(prismaHier ? TIMING.prismaFlash * 0.7 : TIMING.chainGap);
        if (!alive.current) return;
        setFlashes([]);
      }

      // Funken und Zahlen erst nach ihrer Laufzeit entfernen, damit sie nicht
      // mitten in der Animation verschwinden.
      setTimeout(() => {
        if (!alive.current) return;
        setBursts([]);
        setFloats([]);
      }, 800);

      // 4. Zustand übernehmen.
      setDisplay(nextState.board);
      setShownScore(nextState.score);
      setGame(nextState);
      setBusy(false);

      if (nextState.over) {
        feedback.gameOver();
        onPersist(null);
        await sleep(420);
        if (!alive.current) return;
        onFinish(nextState);
      } else {
        onPersist(nextState);
      }
    },
    [busy, game, mode, onFinish, onPersist, zeigeKette, erschuettern],
  );

  const handleUndo = useCallback(() => {
    const vorher = history.current.pop();
    if (!vorher || busy) return;
    feedback.button();
    setGame(vorher);
    setDisplay(vorher.board);
    setShownScore(vorher.score);
    onPersist(vorher);
  }, [busy, onPersist]);

  const handleHint = useCallback(() => {
    if (busy || game.over) return;
    const col = suggestColumn(game);
    if (col === null) return;
    feedback.button();
    setHintColumn(col);
    setTimeout(() => alive.current && setHintColumn(null), 1400);
  }, [busy, game]);

  const zuegeUebrig =
    game.moveLimit !== null ? Math.max(0, game.moveLimit - game.moves) : null;

  const titel =
    mode === 'daily'
      ? `${strings.puzzleLabel} #${game.puzzleNumber ?? ''}`
      : mode === 'endless'
        ? strings.endless
        : strings.zen;

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <Backdrop palette={palette} dark={dark} intensity={0.75} />

      <Animated.View style={[styles.root, { paddingTop: insets.top }, shakeStyle]}>
      {/* Kopfzeile */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.home}
          onPress={() => {
            feedback.button();
            onExit();
          }}
          hitSlop={12}
          style={styles.headerButton}
        >
          <Text style={[styles.headerIcon, { color: palette.textMuted }]}>‹</Text>
        </Pressable>

        <View style={styles.headerCentre}>
          <Text style={[styles.headerTitle, { color: palette.textMuted }]}>{titel}</Text>
          <Counter value={shownScore} style={[styles.score, { color: palette.text }]} />
        </View>

        <View style={styles.headerButton}>
          {zuegeUebrig !== null ? (
            <View style={styles.movesBox}>
              <Text style={[styles.movesValue, { color: palette.text }]}>{zuegeUebrig}</Text>
              <Text style={[styles.movesLabel, { color: palette.textFaint }]}>
                {strings.moves}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Vorschau der nächsten Steine */}
      <View style={styles.queue}>
        <View style={[styles.queueNext, { borderColor: palette.border }]}>
          <Stone
            level={game.queue[0] as Level}
            size={cellSize * 0.86}
            showShape={settings.colorAssist}
          />
        </View>
        <View style={styles.queueRest}>
          {game.queue.slice(1).map((l, i) => (
            <View key={`q${i}`} style={{ opacity: 0.55 - i * 0.16 }}>
              <Stone
                level={l as Level}
                size={cellSize * 0.42}
                showShape={settings.colorAssist}
              />
            </View>
          ))}
        </View>

        {chainBadge !== null ? (
          <Animated.View
            style={[
              styles.chainBadge,
              { backgroundColor: palette.accent },
              badgeStyle,
            ]}
            pointerEvents="none"
          >
            <Text style={styles.chainText}>
              {strings.chain} ×{chainBadge}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      {/* Spielfeld */}
      <View style={styles.boardWrap}>
        <GameBoard
          board={display}
          cellSize={cellSize}
          palette={palette}
          showShapes={settings.colorAssist}
          onColumnPress={handleColumn}
          disabled={busy || game.over}
          falling={falling}
          flashes={flashes}
          bursts={bursts}
          floats={floats}
          highlightColumn={hintColumn}
        />
      </View>

      {/* Fußzeile: im Zen-Modus mit Hilfsmitteln, sonst bewusst leer, damit
          Endlos und Tagesrätsel unter gleichen Bedingungen gespielt werden. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        {mode === 'zen' ? (
          <>
            <FooterButton
              label={strings.undo}
              palette={palette}
              disabled={history.current.length === 0 || busy}
              onPress={handleUndo}
            />
            <FooterButton
              label={strings.hint}
              palette={palette}
              disabled={busy}
              onPress={handleHint}
            />
          </>
        ) : (
          <View style={styles.stats}>
            <Stat label={strings.chain} value={`×${game.bestChain}`} palette={palette} />
            {game.prismas > 0 ? (
              <Stat label={strings.prisma} value={`${game.prismas}`} palette={palette} />
            ) : null}
          </View>
        )}
      </View>
      </Animated.View>

      {/* Lichtblitz einer Prisma-Explosion — liegt über allem, blockiert aber
          keine Eingaben, damit der nächste Zug nicht verzögert wird. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, flashStyle]}
      />
    </View>
  );
}

function FooterButton({
  label,
  onPress,
  palette,
  disabled,
}: {
  label: string;
  onPress: () => void;
  palette: Palette;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.footerButton,
        {
          backgroundColor: palette.bgElevated,
          borderColor: palette.border,
          opacity: disabled ? 0.35 : 1,
        },
      ]}
    >
      <Text style={[styles.footerLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

function Stat({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: Palette;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  headerButton: { width: 64, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 34, fontFamily: FONT.regular, marginTop: -4 },
  headerCentre: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 13, fontFamily: FONT.semiBold, letterSpacing: 0.6 },
  score: { fontSize: 38, fontFamily: FONT.bold, letterSpacing: -0.5, marginTop: 2, ...TABULAR },
  movesBox: { alignItems: 'center' },
  movesValue: { fontSize: 20, fontFamily: FONT.bold, ...TABULAR },
  movesLabel: { fontSize: 10, fontFamily: FONT.semiBold, letterSpacing: 0.4 },
  queue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 72,
  },
  queueNext: {
    padding: SPACING.xs + 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  queueRest: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  chainBadge: {
    position: 'absolute',
    right: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
  },
  chainText: { color: '#FFFFFF', fontFamily: FONT.bold, fontSize: 14 },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    minHeight: 84,
  },
  footerButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  footerLabel: { fontSize: 15, fontFamily: FONT.semiBold },
  stats: { flexDirection: 'row', gap: SPACING.xl },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontFamily: FONT.bold },
  statLabel: { fontSize: 11, fontFamily: FONT.semiBold, letterSpacing: 0.4, marginTop: 1 },
});
