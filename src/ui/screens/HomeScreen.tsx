/**
 * Startbildschirm.
 *
 * Das Tagesrätsel steht bewusst ganz oben und ist die einzige farbig
 * hervorgehobene Fläche: Es ist der Modus, der wiederkehrende Besuche
 * erzeugt. Endlos und Zen sind für alle da, die heute mehr wollen.
 */
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { puzzleNumber } from '../../game/daily';
import { GameState, Level, Mode } from '../../game/types';
import { numberLocale, strings } from '../../i18n/strings';
import { DailyResult, Stats } from '../../storage/store';
import { formatNumber } from '../../game/share';
import * as feedback from '../feedback';
import { FONT, Palette, RADIUS, SPACING, STONES } from '../theme';
import { Backdrop } from '../components/Backdrop';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Countdown } from '../components/Countdown';
import { Stone } from '../components/Stone';

/**
 * Ein Stein im Titel, der sanft auf und ab schwebt.
 *
 * Die fünf sind zeitlich versetzt, wodurch eine langsame Welle durch das
 * Spektrum läuft. Das gibt dem Startbildschirm Leben, ohne dass etwas
 * blinkt oder um Aufmerksamkeit bettelt — er soll ruhig wirken, nicht
 * aufdringlich.
 */
function FloatingStone({
  level,
  size,
  index,
  showShape,
}: {
  level: Level;
  size: number;
  index: number;
  showShape: boolean;
}) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      index * 170,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [y, index]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={style}>
      <Stone level={level} size={size} showShape={showShape} />
    </Animated.View>
  );
}

export interface HomeScreenProps {
  palette: Palette;
  dark: boolean;
  stats: Stats;
  heuteGespielt: DailyResult | null;
  /** Laufendes, noch nicht beendetes Tagesrätsel. */
  tagesStand: GameState | null;
  /** Freie Modi mit pausierter Partie. */
  pausiert: Mode[];
  showShapes: boolean;
  onStart: (mode: Mode) => void;
  onResume: (mode: Mode) => void;
  onStats: () => void;
  onSettings: () => void;
  onHowTo: () => void;
}

export function HomeScreen({
  palette,
  dark,
  stats,
  heuteGespielt,
  tagesStand,
  pausiert,
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
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <Backdrop palette={palette} dark={dark} />
      <ScrollView
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
              <FloatingStone level={l} size={30} index={i} showShape={showShapes} />
            </Animated.View>
          ))}
        </View>
        <Text style={[styles.title, { color: palette.text }]}>PRISMA</Text>
      </Animated.View>

      <View style={styles.modes}>
        {pausiert.map((modus) => (
          <Animated.View key={modus} entering={FadeInDown.delay(100).duration(380)} style={styles.full}>
            <Button
              label={strings.resume}
              sublabel={modus === 'zen' ? strings.zen : strings.endless}
              palette={palette}
              variant="secondary"
              onPress={() => onResume(modus)}
              block
            />
          </Animated.View>
        ))}

        {/* Tagesrätsel */}
        <Animated.View entering={FadeInDown.delay(140).duration(400)} style={styles.full}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${strings.daily}. ${strings.dailySub}`}
            onPress={() => {
              feedback.button();
              onStart('daily');
            }}
            style={styles.dailyCardWrap}
          >
            <LinearGradient
              colors={dark ? ['#5BA4FF', '#2B6FE0'] : ['#4D9BFF', '#2B7FFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyCard}
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
                <Icon name="check" size={15} color="#FFFFFF" strokeWidth={2.8} />
                <Text style={styles.dailyDoneText}>
                  {formatNumber(heuteGespielt.score, numberLocale)} · {strings.nextIn} <Countdown />
                </Text>
              </View>
            ) : tagesStand && tagesStand.moveLimit !== null ? (
              <View style={styles.dailyDone}>
                <View style={styles.dailyProgress}>
                  <View
                    style={[
                      styles.dailyProgressFill,
                      { width: `${(tagesStand.moves / tagesStand.moveLimit) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.dailyDoneText}>
                  {strings.resume} · {tagesStand.moveLimit - tagesStand.moves} {strings.movesLeft}
                </Text>
              </View>
            ) : null}
            </LinearGradient>
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
    </View>
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
        feedback.button();
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
  root: { flex: 1 },
  content: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  brand: { alignItems: 'center', marginBottom: SPACING.xl + SPACING.sm },
  spectrum: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  title: { fontSize: 42, fontFamily: FONT.extraBold, letterSpacing: 9, marginLeft: 9 },
  modes: { width: '100%', maxWidth: 460, gap: SPACING.sm },
  full: { width: '100%' },
  flexShrink: { flexShrink: 1 },
  dailyCardWrap: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#2B7FFF',
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  dailyCard: {
    padding: SPACING.lg,
    minHeight: 100,
    justifyContent: 'center',
  },
  dailyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dailyTitle: { color: '#FFFFFF', fontSize: 22, fontFamily: FONT.bold },
  dailySub: { color: 'rgba(255,255,255,0.84)', fontSize: 13, marginTop: 3, fontFamily: FONT.medium },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
    borderRadius: RADIUS.md,
    marginLeft: SPACING.sm,
  },
  streakValue: { color: '#FFFFFF', fontSize: 20, fontFamily: FONT.extraBold },
  streakLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: FONT.semiBold },
  dailyDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.22)',
  },
  dailyProgress: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  dailyProgressFill: { height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  dailyDoneText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONT.semiBold },
  links: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.xl,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  link: { paddingVertical: SPACING.sm },
  linkText: { fontSize: 15, fontFamily: FONT.semiBold },
  note: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: SPACING.xxl,
    maxWidth: 320,
    lineHeight: 17,
  },
});
