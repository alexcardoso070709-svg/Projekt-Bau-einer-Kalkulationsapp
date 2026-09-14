/**
 * Das Ergebnis nach einer Partie.
 *
 * Wirtschaftlich ist das der wichtigste Bildschirm der App. Ohne Werbebudget
 * wächst ein Spiel nur, wenn Menschen von sich aus davon erzählen — und der
 * Moment, in dem jemand das tun würde, ist genau hier: direkt nachdem etwas
 * Bemerkenswertes passiert ist. Deshalb steht der Teilen-Knopf an erster
 * Stelle und nicht versteckt hinter einem Menü, und deshalb ist das geteilte
 * Ergebnis ein Emoji-Bild statt einer nackten Zahl: Es verrät nichts über die
 * Lösung, macht aber neugierig.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { msUntilNextPuzzle } from '../../game/daily';
import { boardToEmoji, buildShareText, formatNumber } from '../../game/share';
import { GameState } from '../../game/types';
import { numberLocale, strings } from '../../i18n/strings';
import { Stats } from '../../storage/store';
import * as haptics from '../haptics';
import { Palette, RADIUS, SPACING } from '../theme';
import { Button } from '../components/Button';

export interface ResultSheetProps {
  game: GameState;
  stats: Stats;
  palette: Palette;
  onAgain: () => void;
  onHome: () => void;
}

/** Restzeit bis Mitternacht als hh:mm:ss. */
function useCountdown(active: boolean): string {
  const [rest, setRest] = useState(() => msUntilNextPuzzle());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setRest(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const s = Math.max(0, Math.floor(rest / 1000));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function ResultSheet({ game, stats, palette, onAgain, onHome }: ResultSheetProps) {
  const insets = useSafeAreaInsets();
  const istTagesraetsel = game.mode === 'daily';
  const countdown = useCountdown(istTagesraetsel);
  const [geteilt, setGeteilt] = useState(false);

  const grid = useMemo(() => boardToEmoji(game.board), [game.board]);
  const bestwert = stats.bestScore[game.mode] ?? 0;
  const istRekord = game.score > 0 && game.score >= bestwert;

  const teilen = async () => {
    haptics.tapButton();
    const text = buildShareText(game, { locale: numberLocale });
    try {
      await Share.share({ message: text });
      setGeteilt(true);
    } catch {
      // Abgebrochenes Teilen ist kein Fehler — einfach nichts tun.
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.overlay }]}>
      <Animated.View
        entering={FadeInDown.duration(320).springify().damping(18)}
        style={[
          styles.sheet,
          {
            backgroundColor: palette.bgElevated,
            borderColor: palette.border,
            paddingBottom: insets.bottom + SPACING.lg,
          },
        ]}
      >
        <Text style={[styles.kicker, { color: palette.textMuted }]}>
          {istTagesraetsel
            ? `${strings.dailyDone} · #${game.puzzleNumber}`
            : strings.gameOver}
        </Text>

        <Animated.View entering={FadeIn.delay(120).duration(400)}>
          <Text style={[styles.score, { color: palette.text }]}>
            {formatNumber(game.score, numberLocale)}
          </Text>
        </Animated.View>

        {istRekord ? (
          <Animated.View
            entering={FadeIn.delay(280)}
            style={[styles.record, { backgroundColor: palette.accent }]}
          >
            <Text style={styles.recordText}>★ {strings.best}</Text>
          </Animated.View>
        ) : (
          <Text style={[styles.previousBest, { color: palette.textFaint }]}>
            {strings.best} {formatNumber(bestwert, numberLocale)}
          </Text>
        )}

        {grid ? (
          <Animated.View
            entering={FadeIn.delay(200).duration(420)}
            style={[styles.gridBox, { backgroundColor: palette.bg }]}
          >
            <Text style={styles.grid} allowFontScaling={false}>
              {grid}
            </Text>
          </Animated.View>
        ) : null}

        <View style={styles.row}>
          <Kennzahl label={strings.chain} value={`×${game.bestChain}`} palette={palette} />
          <Kennzahl label={strings.prismas} value={`${game.prismas}`} palette={palette} />
          <Kennzahl label={strings.moves} value={`${game.moves}`} palette={palette} />
          {istTagesraetsel ? (
            <Kennzahl label={strings.streak} value={`${stats.streak}`} palette={palette} />
          ) : null}
        </View>

        {istTagesraetsel ? (
          <Text style={[styles.countdown, { color: palette.textFaint }]}>
            {strings.nextPuzzle} {countdown}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Button
            label={geteilt ? strings.shared : strings.share}
            palette={palette}
            onPress={teilen}
            block
          />
          <View style={styles.actionRow}>
            {istTagesraetsel ? null : (
              <Button
                label={strings.again}
                palette={palette}
                variant="secondary"
                onPress={onAgain}
                style={styles.flex}
              />
            )}
            <Button
              label={strings.home}
              palette={palette}
              variant="secondary"
              onPress={onHome}
              style={styles.flex}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function Kennzahl({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: Palette;
}) {
  return (
    <View style={styles.kennzahl}>
      <Text style={[styles.kennzahlValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.kennzahlLabel, { color: palette.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.lg + 10,
    borderTopRightRadius: RADIUS.lg + 10,
    borderWidth: 1,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  kicker: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6 },
  score: { fontSize: 56, fontWeight: '800', letterSpacing: -1.5, marginTop: SPACING.xs },
  record: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.xs,
  },
  recordText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, letterSpacing: 0.4 },
  previousBest: { fontSize: 13, fontWeight: '600', marginTop: SPACING.xs },
  gridBox: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  grid: { fontSize: 15, lineHeight: 19, letterSpacing: 1, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginTop: SPACING.md,
  },
  kennzahl: { alignItems: 'center' },
  kennzahlValue: { fontSize: 20, fontWeight: '700' },
  kennzahlLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, marginTop: 1 },
  countdown: { fontSize: 13, fontWeight: '600', marginTop: SPACING.md },
  actions: { width: '100%', marginTop: SPACING.lg, gap: SPACING.sm },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  flex: { flex: 1 },
});
