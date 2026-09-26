/**
 * Der Spielbildschirm.
 *
 * Seine eigentliche Aufgabe ist Zeitregie. Die Engine rechnet einen Zug in
 * einem einzigen Schritt durch; hier wird er wieder auseinandergelegt: erst
 * fällt der Stein, dann verschmilzt er, dann läuft die Kette.
 *
 * Dabei darf keine Eingabe verloren gehen. Wer während einer Kette schon den
 * nächsten Stein wirft, wird nicht ignoriert: Der Zug wird vorgemerkt, die
 * laufende Animation beschleunigt sich, und der vorgemerkte Zug folgt
 * nahtlos. Ein Spiel, das Eingaben verschluckt, fühlt sich kaputt an — egal
 * wie schön es aussieht.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createGame, playMove, suggestColumn, tickClock, timeLeftMs } from '../../game/engine';
import { TutorialStep, tutorialGame } from '../../game/tutorial';
import { COLS, GameState, Level, Mode, Position, ROWS } from '../../game/types';
import { strings } from '../../i18n/strings';
import { HINT_MOVES_MILESTONE, Settings } from '../../storage/stats';
import * as feedback from '../feedback';
import { FONT, Palette, RADIUS, SPACING, STONES, TABULAR, TIMING } from '../theme';
import { Backdrop } from '../components/Backdrop';
import { BurstEffect, FallingStone, FloatEffect, GameBoard } from '../components/Board';
import { Counter } from '../components/Counter';
import { Icon, IconName } from '../components/Icon';
import { Stone } from '../components/Stone';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Randmaße des Bretts, relativ zur Zellengröße — für die Größenberechnung. */
const BRETT_BREITE = COLS + (COLS - 1) * 0.085 + 3.2 * 0.085;
const BRETT_HOEHE = ROWS + (ROWS - 1) * 0.085 + 3.2 * 0.085;

/** Sind Züge vorgemerkt, läuft die aktuelle Animation mit diesem Faktor. */
const EILTEMPO = 0.45;

/**
 * Höchstens so viele Züge werden vorgemerkt. Genug, dass schnelles Spiel nie
 * etwas verschluckt; wenig genug, dass ein Zittern keine Salve auslöst.
 */
const MAX_VORGEMERKT = 3;

export interface TutorialScript {
  steps: TutorialStep[];
  onDone: () => void;
}

export interface GameScreenProps {
  mode: Mode;
  palette: Palette;
  /** Steuert, wie kräftig die Lichtkegel im Hintergrund auftragen dürfen. */
  dark: boolean;
  settings: Settings;
  initialGame?: GameState | null;
  /** Geskriptete Schritte statt freiem Spiel. */
  tutorial?: TutorialScript | null;
  /** Verbleibende Tipps, modusübergreifend und dauerhaft — siehe App.tsx. */
  hints?: number;
  /** Bisheriger Bestwert dieses Modus, für den Tipp-Bonus bei neuem Rekord. */
  bestScore?: number;
  /** Bucht sofort einen Tipp ab. */
  onSpendHint?: () => void;
  /** Schreibt einen Tipp gut (gedeckelt beim Aufrufer). */
  onEarnHint?: () => void;
  onExit: () => void;
  /** Sichert den Stand — sofort beim Zug, nicht erst nach der Animation. */
  onPersist: (game: GameState) => void;
  /** Spielende verbuchen, noch bevor die letzte Animation läuft. */
  onGameOver: (game: GameState) => void;
  /** Ergebnisfenster zeigen, wenn die letzte Animation vorbei ist. */
  onShowResult: () => void;
}

export function GameScreen({
  mode,
  palette,
  dark,
  settings,
  initialGame,
  tutorial = null,
  hints = 0,
  bestScore = 0,
  onSpendHint,
  onEarnHint,
  onExit,
  onPersist,
  onGameOver,
  onShowResult,
}: GameScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const [game, setGame] = useState<GameState>(
    () =>
      (tutorial ? tutorialGame(tutorial.steps[0]) : null) ??
      initialGame ??
      createGame({ mode }),
  );
  /** Maßgeblicher Stand für die Zugfolge — der Renderzustand hinkt hinterher. */
  const gameRef = useRef(game);
  /**
   * Vorausberechneter Stand für die Vorschau-Anzeige.
   *
   * Ohne ihn zeigte die Vorschau bei mehreren vorgemerkten Zügen für alle
   * denselben Stein: Sie wurde nur beim tatsächlichen Ausführen aktualisiert,
   * nicht schon beim bloßen Annehmen eines Zuges. Wer schnell zweimal tippte,
   * während noch ein Zug lief, sah zweimal dieselbe Farbe angekündigt — der
   * zweite Tipp bekam aber längst die übernächste, weil der erste Tipp die
   * angekündigte schon für sich beansprucht hatte. Die Warteschlange selbst
   * hängt nur von der Zahl der Züge ab, nicht vom Spielfeld — deshalb lässt
   * sie sich hier mit dem echten `playMove` rein zur Vorschau vorspulen, ohne
   * dass ein Zug wirklich stattfindet.
   */
  const vorschauRef = useRef(game);

  const [display, setDisplay] = useState(() => game.board);
  const [shownScore, setShownScore] = useState(game.score);
  /** Rückt schon beim Abwurf nach, nicht erst nach der Kette. */
  const [shownQueue, setShownQueue] = useState(game.queue);
  const [falling, setFalling] = useState<FallingStone | null>(null);
  const [flashes, setFlashes] = useState<Position[]>([]);
  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const [floats, setFloats] = useState<FloatEffect[]>([]);
  const [chainBadge, setChainBadge] = useState<number | null>(null);
  const [zenHint, setZenHint] = useState<number | null>(null);
  const [rejected, setRejected] = useState<{ col: number; nonce: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [schritt, setSchritt] = useState(0);
  const [geschafft, setGeschafft] = useState(false);
  const [rueckgaengig, setRueckgaengig] = useState(0);
  /** Tempo: angezeigte Restzeit und kurz eingeblendeter Zeitbonus. */
  const [restMs, setRestMs] = useState(() => timeLeftMs(game));
  const [zeitBonus, setZeitBonus] = useState<{ ms: number; nonce: number } | null>(null);
  /** Tempo: Die Zeit lief ab, während noch ein Zug animiert wurde. */
  const zeitUmRef = useRef(false);

  const busyRef = useRef(false);
  /** Vorgemerkte Züge in Eingabereihenfolge. */
  const pendingRef = useRef<number[]>([]);
  const schrittRef = useRef(0);
  const history = useRef<GameState[]>([]);
  const nonce = useRef(0);
  const alive = useRef(true);
  const aufraeumen = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (aufraeumen.current) clearTimeout(aufraeumen.current);
    };
  }, []);

  /* ── Animierte Werte ─────────────────────────────────────────── */

  const badge = useSharedValue(0);
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badge.value,
    transform: [{ scale: 0.7 + badge.value * 0.3 }],
  }));

  // Erschütterung und Lichtblitz sind allein dem Prisma vorbehalten — und
  // entfallen ganz, wenn jemand „Bewegung reduzieren" eingeschaltet hat.
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  /** Beim Spielende atmet das Feld aus, bevor das Ergebnis erscheint. */
  const dim = useSharedValue(0);
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value * 0.5 }));

  const erschuettern = useCallback(() => {
    if (reduced) return;
    shake.value = withSequence(
      withTiming(-7, { duration: 42 }),
      withTiming(7, { duration: 58 }),
      withTiming(-4, { duration: 52 }),
      withTiming(2, { duration: 48 }),
      withTiming(0, { duration: 56 }),
    );
    flash.value = withSequence(withTiming(0.4, { duration: 55 }), withTiming(0, { duration: 320 }));
  }, [reduced, shake, flash]);

  const zeigeKette = useCallback(
    (chain: number) => {
      setChainBadge(chain);
      badge.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(1, { duration: 420 }),
        withTiming(0, { duration: 220 }),
      );
    },
    [badge],
  );

  const cellSize = useMemo(() => {
    const breite = Math.min(width - SPACING.md * 2, 460) - 2;
    const hoehe = height - insets.top - insets.bottom - 262 - 2;
    return Math.max(28, Math.floor(Math.min(breite / BRETT_BREITE, hoehe / BRETT_HOEHE)));
  }, [width, height, insets.top, insets.bottom]);

  /* ── Zugablauf ───────────────────────────────────────────────── */

  const warte = (ms: number) => sleep(pendingRef.current.length ? ms * EILTEMPO : ms);

  const abweisen = useCallback((col: number) => {
    const n = ++nonce.current;
    setRejected({ col, nonce: n });
    feedback.reject();
    setTimeout(() => {
      if (alive.current) setRejected((r) => (r && r.nonce === n ? null : r));
    }, 480);
  }, []);

  const naechsterSchritt = useCallback(async () => {
    if (!tutorial) return;
    await sleep(700);
    if (!alive.current) return;
    const s = schrittRef.current + 1;
    if (s >= tutorial.steps.length) {
      setGeschafft(true);
      feedback.merge(5);
      await sleep(1300);
      if (alive.current) tutorial.onDone();
      return;
    }
    schrittRef.current = s;
    setSchritt(s);
    const neu = { ...tutorialGame(tutorial.steps[s]), score: gameRef.current.score };
    gameRef.current = neu;
    vorschauRef.current = neu;
    setGame(neu);
    setDisplay(neu.board);
    setShownQueue(neu.queue);
  }, [tutorial]);

  /** Das Feld atmet aus, dann erscheint das Ergebnis. */
  const zeigeEnde = useCallback(async () => {
    pendingRef.current = [];
    feedback.gameOver();
    dim.value = withTiming(1, { duration: 450 });
    await sleep(650);
    if (alive.current) onShowResult();
  }, [dim, onShowResult]);

  const fuehreAus = useCallback(
    async (col: number) => {
      const g = gameRef.current;
      if (g.over) return;
      if (tutorial && col !== tutorial.steps[schrittRef.current].target) {
        abweisen(col);
        return;
      }
      const outcome = playMove(g, col);
      if (!outcome) {
        abweisen(col);
        return;
      }

      setZenHint(null);
      if (mode === 'zen' && !tutorial) {
        history.current = [...history.current.slice(-49), g];
        setRueckgaengig(history.current.length);
      }

      const { result, state: next } = outcome;

      // Der Zug gilt ab jetzt — auch wenn jemand die Partie verlässt, bevor
      // die Animation durch ist. Früher wurde erst danach gesichert: Wer
      // mitten im Zug ging, bekam ihn zurück, im Tagesrätsel ein verdecktes
      // Rückgängig.
      gameRef.current = next;
      // Die Vorschau lief diesem Zug voraus (siehe vorschauRef) oder war
      // schon deckungsgleich — beides trifft hier zu, dies hält sie fest
      // synchron, statt sich auf lückenlose Vorausberechnung zu verlassen.
      vorschauRef.current = next;
      if (!tutorial) {
        if (next.over) onGameOver(next);
        else onPersist(next);
      }
      // Tipp-Bonus: alle 100 Züge, oder in dem einen Moment, in dem der
      // Punktestand den bisherigen Bestwert dieses Modus überholt. Der
      // Punktestand steigt in dieser Partie nur, deshalb genügt der einfache
      // Vergleich vor/nach dem Zug — die Grenze kann höchstens einmal fallen.
      if (!tutorial) {
        if (next.moves % HINT_MOVES_MILESTONE === 0) onEarnHint?.();
        else if (g.score <= bestScore && next.score > bestScore) onEarnHint?.();
      }
      if (result.timeBonusMs > 0) {
        const b = ++nonce.current;
        setZeitBonus({ ms: result.timeBonusMs, nonce: b });
        setRestMs(timeLeftMs(next));
        setTimeout(() => {
          if (alive.current) setZeitBonus((z) => (z && z.nonce === b ? null : z));
        }, 1400);
      }

      // 1. Der Stein fällt, die Vorschau rückt sofort nach.
      const n = ++nonce.current;
      setFalling({ col, row: result.landed.row, level: g.queue[0] as Level, nonce: n });
      setShownQueue(next.queue);
      feedback.drop();
      await warte(TIMING.drop + 40);
      if (!alive.current) return;

      // 2. Der Stein liegt — kurz sichtbar, bevor er verschmilzt.
      setFalling(null);
      setDisplay(result.boardAfterDrop);

      // 3. Kettenglieder nacheinander abspielen.
      let punkte = g.score;
      for (const step of result.steps) {
        await warte(TIMING.mergeCollapse);
        if (!alive.current) return;

        const prismaGruppen = step.groups.filter((gr) => gr.resultLevel === null);
        const prismaHier = prismaGruppen.length > 0;
        const marke = `${n}-${step.chain}`;

        setBursts(
          step.groups.flatMap((gr, gi) =>
            gr.cells.map((cell, ci) => ({
              id: `${marke}-${gi}-${ci}`,
              row: cell.row,
              col: cell.col,
              colour: STONES[gr.level].glow,
            })),
          ),
        );
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
          setFlashes(prismaGruppen.map((gr) => gr.anchor));
          erschuettern();
          feedback.prisma();
        } else {
          feedback.merge(step.chain);
        }

        setDisplay(step.board);
        punkte += step.points;
        setShownScore(punkte);
        if (step.chain >= 2) zeigeKette(step.chain);

        await warte(prismaHier ? TIMING.prismaFlash * 0.7 : TIMING.chainGap);
        if (!alive.current) return;
        setFlashes([]);
      }

      // Funken und Zahlen erst nach ihrer Laufzeit entfernen.
      if (aufraeumen.current) clearTimeout(aufraeumen.current);
      aufraeumen.current = setTimeout(() => {
        if (!alive.current) return;
        setBursts([]);
        setFloats([]);
      }, 900);

      // 4. Anzeige nachziehen.
      setDisplay(next.board);
      setShownScore(next.score);
      setGame(next);

      if (tutorial) {
        await naechsterSchritt();
        return;
      }

      if (next.over) await zeigeEnde();
    },
    // warte liest nur Refs und muss nicht in die Abhängigkeiten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tutorial, mode, abweisen, erschuettern, zeigeKette, naechsterSchritt, onGameOver, onPersist, bestScore, onEarnHint],
  );

  const spieleZug = useCallback(
    async (col: number) => {
      if (gameRef.current.over || geschafft) return;
      if (busyRef.current) {
        // Im Tutorial nichts vormerken: Ein Doppeltipp würde sonst schon den
        // nächsten, noch unsichtbaren Schritt auslösen.
        if (!tutorial && pendingRef.current.length < MAX_VORGEMERKT) {
          // Der Zug wird erst später ausgeführt, aber die Vorschau muss ihn
          // schon jetzt vorwegnehmen — sonst kündigt sie beim nächsten Tipp
          // wieder denselben Stein an, den dieser hier sich gerade sichert.
          const vorschau = playMove(vorschauRef.current, col);
          if (vorschau) {
            vorschauRef.current = vorschau.state;
            pendingRef.current.push(col);
            setShownQueue(vorschau.state.queue);
          } else {
            abweisen(col);
          }
        }
        return;
      }
      busyRef.current = true;
      setBusy(true);
      let naechste: number | undefined = col;
      while (naechste !== undefined && alive.current) {
        await fuehreAus(naechste);
        if (gameRef.current.over) break;
        naechste = pendingRef.current.shift();
      }
      busyRef.current = false;
      if (alive.current) setBusy(false);
      // Lief die Uhr mitten im Zug ab, wartet das Ende, bis der Zug zu sehen war.
      if (zeitUmRef.current && alive.current) {
        zeitUmRef.current = false;
        await zeigeEnde();
      }
    },
    [fuehreAus, geschafft, tutorial, zeigeEnde, abweisen],
  );

  /*
   * Tempo-Uhr. Sie läuft nur, solange dieser Bildschirm offen und die App im
   * Vordergrund ist — wer kurz eine Nachricht beantwortet, verliert keine Zeit.
   * Der Stand wird jede Sekunde gesichert und beim Verlassen noch einmal.
   */
  useEffect(() => {
    if (mode !== 'tempo' || tutorial) return;
    let aktiv = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    let zuletzt = Date.now();
    let gesichert = zuletzt;
    const sub = AppState.addEventListener('change', (s) => {
      aktiv = s === 'active';
      zuletzt = Date.now();
      if (!aktiv && !gameRef.current.over) onPersist(gameRef.current);
    });
    const id = setInterval(() => {
      const jetzt = Date.now();
      // Gedrosselte oder angehaltene Timer zählen nie mehr als eine Sekunde.
      const delta = Math.min(1000, jetzt - zuletzt);
      zuletzt = jetzt;
      const g = gameRef.current;
      if (!aktiv || g.over) return;
      const next = tickClock(g, delta);
      gameRef.current = next;
      setRestMs(timeLeftMs(next));
      if (next.over) {
        vorschauRef.current = next;
        onGameOver(next);
        setGame(next);
        if (busyRef.current) zeitUmRef.current = true;
        else void zeigeEnde();
      } else if (jetzt - gesichert >= 1000) {
        gesichert = jetzt;
        onPersist(next);
      }
    }, 100);
    return () => {
      clearInterval(id);
      sub.remove();
      if (!gameRef.current.over) onPersist(gameRef.current);
    };
  }, [mode, tutorial, onPersist, onGameOver, zeigeEnde]);

  const handleUndo = useCallback(() => {
    if (busyRef.current) return;
    const vorher = history.current.pop();
    if (!vorher) return;
    feedback.button();
    setRueckgaengig(history.current.length);
    gameRef.current = vorher;
    vorschauRef.current = vorher;
    setGame(vorher);
    setDisplay(vorher.board);
    setShownScore(vorher.score);
    setShownQueue(vorher.queue);
    onPersist(vorher);
  }, [onPersist]);

  const handleHint = useCallback(() => {
    if (busyRef.current || gameRef.current.over || hints <= 0) return;
    const col = suggestColumn(gameRef.current);
    if (col === null) return;
    feedback.button();
    onSpendHint?.();
    setZenHint(col);
    setTimeout(() => alive.current && setZenHint(null), 1800);
  }, [hints, onSpendHint]);

  /* ── Darstellung ─────────────────────────────────────────────── */

  const zuegeUebrig = game.moveLimit !== null ? Math.max(0, game.moveLimit - game.moves) : null;
  const hinweis = tutorial ? (busy || geschafft ? null : tutorial.steps[schritt].target) : zenHint;

  const titel =
    mode === 'daily'
      ? `${strings.puzzleLabel} #${game.puzzleNumber ?? ''}`
      : mode === 'endless'
        ? strings.endless
        : mode === 'tempo'
          ? strings.tempo
          : strings.zen;

  return (
    <View testID={tutorial ? 'tutorial' : undefined} style={[styles.root, { backgroundColor: palette.bg }]}>
      <Backdrop palette={palette} dark={dark} intensity={0.75} />

      <Animated.View testID="shake-layer" style={[styles.root, { paddingTop: insets.top }, shakeStyle]}>
        {/* Kopfzeile */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tutorial ? strings.skip : strings.home}
            onPress={() => {
              feedback.button();
              onExit();
            }}
            hitSlop={14}
            style={styles.headerButton}
          >
            <Icon name={tutorial ? 'close' : 'back'} size={26} color={palette.textMuted} />
          </Pressable>

          <View style={styles.headerCentre}>
            {tutorial ? (
              <View style={styles.dots}>
                {tutorial.steps.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: i <= schritt ? palette.accent : palette.cellEmpty,
                        width: i === schritt && !geschafft ? 22 : 8,
                      },
                    ]}
                  />
                ))}
              </View>
            ) : (
              <Text maxFontSizeMultiplier={1.2} style={[styles.headerTitle, { color: palette.textMuted }]}>{titel}</Text>
            )}
            <Counter value={shownScore} style={[styles.score, { color: palette.text }]} />
          </View>

          <View style={styles.headerButton}>
            {zuegeUebrig !== null && !tutorial ? (
              <View style={styles.movesBox}>
                <Text maxFontSizeMultiplier={1.2} testID="moves-left" style={[styles.movesValue, { color: palette.text }]}>
                  {zuegeUebrig}
                </Text>
                <Text maxFontSizeMultiplier={1.2} style={[styles.movesLabel, { color: palette.textFaint }]}>{strings.moves}</Text>
              </View>
            ) : restMs !== null && !tutorial ? (
              <View style={styles.movesBox}>
                <Text
                  maxFontSizeMultiplier={1.2}
                  testID="time-left"
                  style={[styles.movesValue, { color: restMs <= 10_000 ? palette.danger : palette.text }]}
                >
                  {Math.ceil(restMs / 1000)}
                </Text>
                <Text maxFontSizeMultiplier={1.2} style={[styles.movesLabel, { color: palette.textFaint }]}>{strings.seconds}</Text>
                {zeitBonus ? (
                  <Animated.Text
                    key={zeitBonus.nonce}
                    entering={FadeIn.duration(160)}
                    testID="time-bonus"
                    style={[styles.timeBonus, { color: palette.accent }]}
                  >
                    +{Math.round(zeitBonus.ms / 1000)}
                  </Animated.Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Fortschritt im Tagesrätsel: eine Linie statt einer weiteren Zahl. */}
        {game.moveLimit !== null && !tutorial ? (
          <View style={[styles.progressTrack, { backgroundColor: palette.cellEmpty }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: palette.accent,
                  width: `${Math.min(100, (game.moves / game.moveLimit) * 100)}%`,
                },
              ]}
            />
          </View>
        ) : restMs !== null && game.timeLimitMs && !tutorial ? (
          <View style={[styles.progressTrack, { backgroundColor: palette.cellEmpty }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: restMs <= 10_000 ? palette.danger : palette.accent,
                  width: `${Math.min(100, (restMs / Math.max(game.timeLimitMs, 60_000)) * 100)}%`,
                },
              ]}
            />
          </View>
        ) : (
          <View style={styles.progressSpacer} />
        )}

        {/* Vorschau der nächsten Steine */}
        <View style={styles.queue}>
          <View style={[styles.queueNext, { borderColor: palette.border, backgroundColor: palette.boardBg }]}>
            <Stone level={shownQueue[0] as Level} size={cellSize * 0.86} showShape={settings.colorAssist} />
          </View>
          <View style={styles.queueRest}>
            {shownQueue.slice(1).map((l, i) => (
              <View key={`q${i}`} style={{ opacity: 0.55 - i * 0.16 }}>
                <Stone level={l as Level} size={cellSize * 0.42} showShape={settings.colorAssist} glow={false} />
              </View>
            ))}
          </View>

          {chainBadge !== null ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.chainBadge, { backgroundColor: palette.accent }, badgeStyle]}
            >
              <Icon name="chain" size={15} color="#FFFFFF" strokeWidth={2.4} />
              <Text maxFontSizeMultiplier={1.2} style={styles.chainText}>×{chainBadge}</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* Spielfeld */}
        <View style={styles.boardWrap}>
          <View>
            <GameBoard
              board={display}
              cellSize={cellSize}
              palette={palette}
              showShapes={settings.colorAssist}
              onColumnPress={spieleZug}
              disabled={game.over || geschafft}
              ghostLevel={shownQueue[0] as Level}
              falling={falling}
              flashes={flashes}
              bursts={bursts}
              floats={floats}
              rejected={rejected}
              hintColumn={hinweis}
              showDanger={mode !== 'zen'}
              reducedMotion={reduced}
            />
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.dim, { backgroundColor: palette.bg }, dimStyle]}
            />
            {geschafft ? (
              <Animated.View entering={FadeIn.duration(320)} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centre]}>
                <View style={[styles.successRing, { backgroundColor: palette.accent }]}>
                  <Icon name="check" size={56} color="#FFFFFF" strokeWidth={3} />
                </View>
              </Animated.View>
            ) : null}
          </View>
        </View>

        {/* Fußzeile */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
          {tutorial ? null : (
            <>
              {mode === 'zen' ? (
                <FooterButton icon="undo" label={strings.undo} palette={palette} disabled={rueckgaengig === 0 || busy} onPress={handleUndo} />
              ) : (
                <View style={styles.chips}>
                  <Chip icon="chain" value={`×${game.bestChain}`} palette={palette} label={strings.bestChain} />
                  <Chip icon="prisma" value={`${game.prismas}`} palette={palette} label={strings.prismas} />
                </View>
              )}
              <FooterButton
                icon="hint"
                label={`${strings.hint} · ${hints}`}
                palette={palette}
                disabled={busy || hints <= 0}
                onPress={handleHint}
              />
            </>
          )}
        </View>
      </Animated.View>

      {/* Lichtblitz einer Prisma-Explosion — über allem, blockiert aber keine Eingaben. */}
      <Animated.View testID="flash-layer" pointerEvents="none" style={[styles.flashOverlay, flashStyle]} />
    </View>
  );
}

function FooterButton({
  icon,
  label,
  onPress,
  palette,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  palette: Palette;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.footerButton,
        { backgroundColor: palette.bgElevated, borderColor: palette.border, opacity: disabled ? 0.35 : 1 },
      ]}
    >
      <Icon name={icon} size={18} color={palette.text} />
      <Text maxFontSizeMultiplier={1.2} style={[styles.footerLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Kennzahl als Symbol plus Wert — ohne Wort, wie das Spielfeld selbst. */
function Chip({
  icon,
  value,
  label,
  palette,
}: {
  icon: IconName;
  value: string;
  label: string;
  palette: Palette;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.chip, { backgroundColor: palette.boardBg, borderColor: palette.border }]}
    >
      <Icon name={icon} size={16} color={palette.textMuted} inner={palette.bg} />
      <Text maxFontSizeMultiplier={1.2} style={[styles.chipValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  flashOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  headerButton: { width: 64, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerCentre: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 13, fontFamily: FONT.semiBold, letterSpacing: 0.6 },
  dots: { flexDirection: 'row', gap: 6, height: 17, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  score: { fontSize: 38, fontFamily: FONT.bold, letterSpacing: -0.5, marginTop: 2, ...TABULAR },
  movesBox: { alignItems: 'center' },
  movesValue: { fontSize: 20, fontFamily: FONT.bold, ...TABULAR },
  timeBonus: { position: 'absolute', top: -2, right: -4, fontSize: 13, fontFamily: FONT.bold, ...TABULAR },
  movesLabel: { fontSize: 10, fontFamily: FONT.semiBold, letterSpacing: 0.4 },
  progressTrack: { height: 3, borderRadius: 2, marginHorizontal: SPACING.xl, marginTop: SPACING.sm, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  progressSpacer: { height: 3 + SPACING.sm },
  queue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingVertical: SPACING.md, minHeight: 72 },
  queueNext: { padding: SPACING.xs + 1, borderRadius: RADIUS.md, borderWidth: 1 },
  queueRest: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  chainBadge: {
    position: 'absolute',
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
  },
  chainText: { color: '#FFFFFF', fontFamily: FONT.bold, fontSize: 15, ...TABULAR },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dim: { borderRadius: 20 },
  successRing: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, minHeight: 84 },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  footerLabel: { fontSize: 15, fontFamily: FONT.semiBold },
  chips: { flexDirection: 'row', gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm - 1,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  chipValue: { fontSize: 15, fontFamily: FONT.bold, ...TABULAR },
});
