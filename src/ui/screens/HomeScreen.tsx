/**
 * Startbildschirm.
 *
 * Das Tagesrätsel steht bewusst ganz oben und ist die einzige farbig
 * hervorgehobene Fläche: Es ist der Modus, der wiederkehrende Besuche
 * erzeugt. Endlos und Zen sind für alle da, die heute mehr wollen.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { puzzleNumber } from '../../game/daily';
import { Level, Mode } from '../../game/types';
import { numberLocale, strings } from '../../i18n/strings';
import { DailyResult, Stats } from '../../storage/store';
import { formatNumber } from '../../game/share';
import * as haptics from '../haptics';
import { Palette, RADIUS, SPACING, STONES } from '../theme';
import { Button } from '../components/Button';
import { Stone } from '../components/Stone';

export interface HomeScreenProps {
  palette: Palette;
  stats: Stats;
  heuteGespielt: DailyResult | null;
  hatGespeichertesSpiel: boolean;
  showShapes: boolean;
  onStart: (mode: Mode) => void;
  onResume: () => void;
  onStats: () => void;
  onSettings: () => void;
  onHowTo: () => void;
}

export function HomeScreen({
  palette,
  stats,
  heuteGespielt,
  hatGespeichertesSpiel,
  showShapes,
  onStart,
  onResume,
  onStats,
  onSettings,
  onHowTo,
}: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const nummer = puzzleNumber();

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.xl, paddingBottom: insets.bottom + SPACING.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Titel mit dem Farbspektrum als Signatur */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.brand}>
        <View style={styles.spectrum}>
          {([1, 2, 3, 4, 5] as Level[]).map((l, i) => (
            <Animated.View key={l} entering={FadeInDown.delay(60 * i).duration(420)}>
              <Stone level={l} size={26} showShape={showShapes} />
            </Animated.View>
          ))}
        </View>
        <Text style={[styles.title, { color: palette.text }]}>PRISMA</Text>
      </Animated.View>

      <View style={styles.modes}>
        {hatGespeichertesSpiel ? (
          <Animated.View entering={FadeInDown.delay(100).duration(380)} style={styles.full}>
            <Button
              label={strings.resume}
              palette={palette}
              variant="secondary"
              onPress={onResume}
              block
            />
          </Animated.View>
        ) : null}

        {/* Tagesrätsel */}
        <Animated.View entering={FadeInDown.delay(140).duration(400)} style={styles.full}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${strings.daily}. ${strings.dailySub}`}
            onPress={() => {
              haptics.tapButton();
              onStart('daily');
            }}
            style={[styles.dailyCard, { backgroundColor: palette.accent }]}
          >
            <View style={styles.dailyTop}>
              <View style={styles.flexShrink}>
                <Text style={styles.dailyTitle}>{strings.daily}</Text>
                <Text style={styles.dailySub}>
                  {strings.puzzleLabel} #{nummer} · {strings.dailySub}
                </Text>
              </View>
              {stats.streak > 0 ? (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakValue}>{stats.streak}</Text>
                  <Text style={styles.streakLabel}>{strings.streak}</Text>
                </View>
              ) : null}
            </View>

            {heuteGespielt ? (
              <View style={styles.dailyDone}>
                <Text style={styles.dailyDoneText}>
                  ✓ {strings.todayDone} · {formatNumber(heuteGespielt.score, numberLocale)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.full}>
          <Button
            label={strings.endless}
            sublabel={strings.endlessSub}
            palette={palette}
            variant="secondary"
            onPress={() => onStart('endless')}
            block
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.full}>
          <Button
            label={strings.zen}
            sublabel={strings.zenSub}
            palette={palette}
            variant="secondary"
            onPress={() => onStart('zen')}
            block
          />
        </Animated.View>
      </View>

      {/* Nebensächliches klein und ruhig */}
      <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.links}>
        <LinkButton label={strings.stats} onPress={onStats} palette={palette} />
        <LinkButton label={strings.howTo} onPress={onHowTo} palette={palette} />
        <LinkButton label={strings.settings} onPress={onSettings} palette={palette} />
      </Animated.View>

      <Text style={[styles.note, { color: palette.textFaint }]}>{strings.offlineNote}</Text>
    </ScrollView>
  );
}

function LinkButton({
  label,
  onPress,
  palette,
}: {
  label: string;
  onPress: () => void;
  palette: Palette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tapButton();
        onPress();
      }}
      hitSlop={8}
      style={styles.link}
    >
      <Text style={[styles.linkText, { color: palette.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minHeight: '100%',
  },
  brand: { alignItems: 'center', marginBottom: SPACING.xxl, marginTop: 'auto' },
  spectrum: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  title: { fontSize: 40, fontWeight: '800', letterSpacing: 8, marginLeft: 8 },
  modes: { width: '100%', maxWidth: 460, gap: SPACING.sm },
  full: { width: '100%' },
  flexShrink: { flexShrink: 1 },
  dailyCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    minHeight: 96,
    justifyContent: 'center',
  },
  dailyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dailyTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  dailySub: { color: 'rgba(255,255,255,0.84)', fontSize: 13, marginTop: 3, fontWeight: '500' },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
    borderRadius: RADIUS.md,
    marginLeft: SPACING.sm,
  },
  streakValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  streakLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },
  dailyDone: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  dailyDoneText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  links: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: 'auto',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  link: { paddingVertical: SPACING.sm },
  linkText: { fontSize: 15, fontWeight: '600' },
  note: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: SPACING.xl,
    maxWidth: 320,
    lineHeight: 17,
  },
});
