/**
 * Das Ergebnis nach einer Partie.
 *
 * Wirtschaftlich der wichtigste Bildschirm: Ohne Werbebudget wächst ein
 * Spiel nur, wenn Menschen von sich aus davon erzählen, und der Moment dafür
 * ist genau hier. Deshalb steht Teilen an erster Stelle, und deshalb ist der
 * Bildschirm selbst eine kleine Inszenierung: Die Punkte zählen hoch, das
 * Endfeld erscheint aus echten Steinen, und ein neuer Bestwert wird gefeiert.
 * Das geteilte Ergebnis bleibt ein Emoji-Raster — das ist, was in einer
 * Nachricht funktioniert. Auf dem eigenen Bildschirm verdient es mehr.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { puzzleNumber } from '../../game/daily';
import { buildShareText, formatNumber } from '../../game/share';
import { Board, GameState, Level } from '../../game/types';
import { numberLocale, strings } from '../../i18n/strings';
import { Stats } from '../../storage/stats';
import * as feedback from '../feedback';
import { FONT, Palette, RADIUS, SPACING, TABULAR } from '../theme';
import { Button } from '../components/Button';
import { Counter } from '../components/Counter';
import { Countdown } from '../components/Countdown';
import { Confetti } from '../components/Effects';
import { Icon } from '../components/Icon';
import { Stone } from '../components/Stone';

export interface ResultSheetProps {
  game: GameState;
  stats: Stats;
  palette: Palette;
  /** Ein schon früher abgeschlossenes Tagesrätsel, erneut angezeigt. */
  archived?: boolean;
  /** Bestwert vor dieser Partie. Nur wer ihn übertrifft, bekommt die Feier. */
  previousBest?: number;
  onAgain?: () => void;
  onHome: () => void;
}

/** Endfeld aus echten Steinen, leere Zeilen oben abgeschnitten. */
function MiniBoard({ board, palette, size }: { board: Board; palette: Palette; size: number }) {
  const erste = board.findIndex((row) => row.some((c) => c !== 0));
  if (erste === -1) return null;
  const gap = Math.max(2, Math.round(size * 0.14));
  return (
    <View style={{ gap }}>
      {board.slice(erste).map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row.map((cell, c) =>
            cell === 0 ? (
              <View
                key={c}
                style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: palette.cellEmpty }}
              />
            ) : (
              <Animated.View key={c} testID="result-stone" entering={FadeIn.delay(260 + (r * 5 + c) * 18).duration(260)}>
                <Stone level={cell as Level} size={size} glow={false} />
              </Animated.View>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

export function ResultSheet({ game, stats, palette, archived = false, previousBest = 0, onAgain, onHome }: ResultSheetProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const istTagesraetsel = game.mode === 'daily';
  const [kopiert, setKopiert] = useState(false);
  const [punkte, setPunkte] = useState(0);
  const [sheetHoehe, setSheetHoehe] = useState(600);

  const bestwert = stats.bestScore[game.mode] ?? 0;
  // Gleichstand mit dem alten Bestwert ist kein Rekord.
  const istRekord = !archived && game.score > previousBest;

  // Die Punkte zählen erst hoch, wenn das Fenster steht — sonst verpasst man es.
  useEffect(() => {
    const t = setTimeout(() => setPunkte(game.score), 280);
    return () => clearTimeout(t);
  }, [game.score]);

  const steinGroesse = useMemo(() => Math.min(22, Math.floor((Math.min(width, 440) - 160) / 5)), [width]);

  const teilen = async () => {
    feedback.button();
    const text = buildShareText(game, { locale: numberLocale });
    try {
      if (Platform.OS !== 'web') {
        await Share.share({ message: text });
        return;
      }
      // Im Browser gibt es nicht überall ein Teilen-Menü (etwa am Desktop oder
      // in eingebetteten Seiten). Dann landet das Ergebnis in der
      // Zwischenablage — ein Knopf ohne Wirkung wäre schlimmer als keiner.
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: object) => Promise<void> }) : null;
      if (nav?.share) {
        try {
          await nav.share({ text });
          return;
        } catch (e) {
          if ((e as Error)?.name === 'AbortError') return;
        }
      }
      await nav?.clipboard?.writeText(text);
      setKopiert(true);
    } catch {
      // Abgebrochenes Teilen ist kein Fehler.
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.overlay }]}>
      <Animated.View
        testID="result-sheet"
        entering={FadeInDown.duration(340).springify().damping(18)}
        onLayout={(e) => setSheetHoehe(e.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          { backgroundColor: palette.bgElevated, borderColor: palette.border, paddingBottom: insets.bottom + SPACING.lg },
        ]}
      >
        {istRekord && !reduced ? <Confetti width={Math.min(width, 520)} height={sheetHoehe} /> : null}

        <Text style={[styles.kicker, { color: palette.textMuted }]}>
          {istTagesraetsel ? `${strings.dailyDone} · #${game.puzzleNumber}` : strings.gameOver}
        </Text>

        <Counter
          testID="result-score"
          value={punkte}
          duration={1100}
          style={[styles.score, { color: palette.text }]}
        />

        {istRekord ? (
          <Animated.View entering={FadeIn.delay(1250)} style={[styles.record, { backgroundColor: palette.accent }]}>
            <Icon name="star" size={14} color="#FFFFFF" />
            <Text style={styles.recordText}>{strings.best}</Text>
          </Animated.View>
        ) : (
          <Text style={[styles.previousBest, { color: palette.textFaint }]}>
            {strings.best} {formatNumber(bestwert, numberLocale)}
          </Text>
        )}

        {game.board.length ? (
          <View style={[styles.boardBox, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <MiniBoard board={game.board} palette={palette} size={steinGroesse} />
          </View>
        ) : null}

        <View style={styles.row}>
          <Kennzahl icon="chain" value={`×${game.bestChain}`} label={strings.bestChain} palette={palette} />
          <Kennzahl icon="prisma" value={`${game.prismas}`} label={strings.prismas} palette={palette} />
          {istTagesraetsel ? (
            <Kennzahl icon="star" value={`${stats.streak}`} label={strings.streak} palette={palette} />
          ) : (
            <Kennzahl value={`${game.moves}`} label={strings.moves} palette={palette} />
          )}
        </View>

        {istTagesraetsel ? (
          <Text style={[styles.countdown, { color: palette.textFaint }]}>
            {game.puzzleNumber !== null && game.puzzleNumber < puzzleNumber() ? (
              strings.newPuzzleReady
            ) : (
              <>
                {strings.nextPuzzle} <Countdown />
              </>
            )}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button label={kopiert ? strings.shared : strings.share} palette={palette} onPress={teilen} block />
          <View style={styles.actionRow}>
            {istTagesraetsel || !onAgain ? null : (
              <Button label={strings.again} palette={palette} variant="secondary" onPress={onAgain} style={styles.flex} />
            )}
            <Button label={strings.home} palette={palette} variant="secondary" onPress={onHome} style={styles.flex} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function Kennzahl({
  icon,
  value,
  label,
  palette,
}: {
  icon?: 'chain' | 'prisma' | 'star';
  value: string;
  label: string;
  palette: Palette;
}) {
  return (
    <View style={styles.kennzahl}>
      <View style={styles.kennzahlTop}>
        {icon ? <Icon name={icon} size={15} color={palette.textMuted} inner={palette.bgElevated} /> : null}
        <Text style={[styles.kennzahlValue, { color: palette.text }]}>{value}</Text>
      </View>
      <Text style={[styles.kennzahlLabel, { color: palette.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: RADIUS.lg + 10,
    borderTopRightRadius: RADIUS.lg + 10,
    borderWidth: 1,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  kicker: { fontSize: 13, fontFamily: FONT.semiBold, letterSpacing: 0.6 },
  score: { fontSize: 58, fontFamily: FONT.extraBold, letterSpacing: -1.5, marginTop: SPACING.xs, ...TABULAR },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.xs,
  },
  recordText: { color: '#FFFFFF', fontFamily: FONT.bold, fontSize: 13, letterSpacing: 0.4 },
  previousBest: { fontSize: 13, fontFamily: FONT.semiBold, marginTop: SPACING.xs, ...TABULAR },
  boardBox: { marginTop: SPACING.md, padding: SPACING.md - 4, borderRadius: RADIUS.md, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, marginTop: SPACING.md },
  kennzahl: { alignItems: 'center' },
  kennzahlTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kennzahlValue: { fontSize: 20, fontFamily: FONT.bold, ...TABULAR },
  kennzahlLabel: { fontSize: 11, fontFamily: FONT.semiBold, letterSpacing: 0.4, marginTop: 1 },
  countdown: { fontSize: 13, fontFamily: FONT.semiBold, marginTop: SPACING.md, ...TABULAR },
  actions: { width: '100%', marginTop: SPACING.lg, gap: SPACING.sm },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  flex: { flex: 1 },
});
