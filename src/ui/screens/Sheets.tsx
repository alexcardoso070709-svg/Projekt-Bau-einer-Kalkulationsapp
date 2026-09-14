/**
 * Statistik, Einstellungen und Spielregeln.
 *
 * Alle drei sind Überlagerungen statt eigener Seiten: Sie unterbrechen den
 * Weg ins Spiel nicht, und man ist mit einer Bewegung wieder draußen.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dateKey } from '../../game/daily';
import { formatNumber } from '../../game/share';
import { Level } from '../../game/types';
import { numberLocale, strings } from '../../i18n/strings';
import { Settings, Stats, ThemeChoice } from '../../storage/store';
import * as haptics from '../haptics';
import { Palette, RADIUS, SPACING, STONES } from '../theme';
import { Button } from '../components/Button';
import { Stone } from '../components/Stone';

interface SheetProps {
  palette: Palette;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

function Sheet({ palette, onClose, children, title }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: palette.overlay }]}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={strings.close} />
      <Animated.View
        entering={FadeInDown.duration(300).springify().damping(19)}
        style={[
          styles.sheet,
          {
            backgroundColor: palette.bgElevated,
            borderColor: palette.border,
            paddingBottom: insets.bottom + SPACING.md,
          },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: palette.text }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.close, { color: palette.textMuted }]}>✕</Text>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </Animated.View>
    </View>
  );
}

/* ── Statistik ─────────────────────────────────────────────────── */

export function StatsSheet({
  stats,
  palette,
  onClose,
}: {
  stats: Stats;
  palette: Palette;
  onClose: () => void;
}) {
  const tage = Object.keys(stats.daily).sort();
  const schnitt = stats.played > 0 ? Math.round(stats.totalScore / stats.played) : 0;

  // Die letzten 35 Tage als Raster — auf einen Blick sichtbar, wie treu
  // jemand spielt. Das ist der stärkste Anreiz, die Serie nicht abreißen
  // zu lassen.
  const heute = new Date();
  const raster = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - (34 - i));
    const key = dateKey(d);
    return { key, ergebnis: stats.daily[key] ?? null };
  });

  return (
    <Sheet palette={palette} onClose={onClose} title={strings.stats}>
      {stats.played === 0 ? (
        <Text style={[styles.empty, { color: palette.textMuted }]}>{strings.noStats}</Text>
      ) : (
        <>
          <View style={styles.kachelReihe}>
            <Kachel label={strings.played} value={`${stats.played}`} palette={palette} />
            <Kachel label={strings.streak} value={`${stats.streak}`} palette={palette} />
            <Kachel
              label={strings.best}
              value={formatNumber(stats.bestScore.daily, numberLocale)}
              palette={palette}
            />
          </View>
          <View style={styles.kachelReihe}>
            <Kachel
              label={strings.avgScore}
              value={formatNumber(schnitt, numberLocale)}
              palette={palette}
            />
            <Kachel label={strings.bestChain} value={`×${stats.bestChain}`} palette={palette} />
            <Kachel label={strings.prismas} value={`${stats.prismas}`} palette={palette} />
          </View>

          <Text style={[styles.abschnitt, { color: palette.textMuted }]}>
            {strings.daily}
          </Text>
          <View style={styles.raster}>
            {raster.map(({ key, ergebnis }) => (
              <View
                key={key}
                style={[
                  styles.rasterZelle,
                  {
                    backgroundColor: ergebnis ? palette.accent : palette.cellEmpty,
                    opacity: ergebnis ? Math.min(1, 0.45 + ergebnis.score / 12000) : 1,
                  },
                ]}
              />
            ))}
          </View>
        </>
      )}
    </Sheet>
  );
}

function Kachel({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: Palette;
}) {
  return (
    <View style={[styles.kachel, { backgroundColor: palette.bg }]}>
      <Text style={[styles.kachelValue, { color: palette.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.kachelLabel, { color: palette.textFaint }]}>{label}</Text>
    </View>
  );
}

/* ── Einstellungen ─────────────────────────────────────────────── */

export function SettingsSheet({
  settings,
  palette,
  onChange,
  onClose,
}: {
  settings: Settings;
  palette: Palette;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const themeOptionen: { key: ThemeChoice; label: string }[] = [
    { key: 'auto', label: strings.themeAuto },
    { key: 'dark', label: strings.themeDark },
    { key: 'light', label: strings.themeLight },
  ];

  return (
    <Sheet palette={palette} onClose={onClose} title={strings.settings}>
      <Text style={[styles.abschnitt, { color: palette.textMuted }]}>{strings.theme}</Text>
      <View style={styles.segment}>
        {themeOptionen.map((o) => {
          const aktiv = settings.theme === o.key;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              accessibilityState={{ selected: aktiv }}
              onPress={() => {
                haptics.tapButton();
                onChange({ ...settings, theme: o.key });
              }}
              style={[
                styles.segmentItem,
                {
                  backgroundColor: aktiv ? palette.accent : palette.bg,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: aktiv ? '#FFFFFF' : palette.text },
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Schalter
        label={strings.haptics}
        value={settings.haptics}
        palette={palette}
        onChange={(v) => onChange({ ...settings, haptics: v })}
      />
      <Schalter
        label={strings.colorAssist}
        hint={strings.colorAssistSub}
        value={settings.colorAssist}
        palette={palette}
        onChange={(v) => onChange({ ...settings, colorAssist: v })}
      />

      <View style={styles.vorschau}>
        {([1, 2, 3, 4, 5] as Level[]).map((l) => (
          <Stone key={l} level={l} size={38} showShape={settings.colorAssist} />
        ))}
      </View>

      <Text style={[styles.hinweis, { color: palette.textFaint }]}>
        {strings.offlineNote}
      </Text>
    </Sheet>
  );
}

function Schalter({
  label,
  hint,
  value,
  onChange,
  palette,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  palette: Palette;
}) {
  return (
    <View style={[styles.zeile, { borderBottomColor: palette.border }]}>
      <View style={styles.zeileText}>
        <Text style={[styles.zeileLabel, { color: palette.text }]}>{label}</Text>
        {hint ? (
          <Text style={[styles.zeileHint, { color: palette.textFaint }]}>{hint}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptics.tapButton();
          onChange(v);
        }}
        trackColor={{ true: palette.accent, false: palette.cellEmpty }}
      />
    </View>
  );
}

/* ── Spielregeln ───────────────────────────────────────────────── */

export function HowToSheet({
  palette,
  showShapes,
  onClose,
}: {
  palette: Palette;
  showShapes: boolean;
  onClose: () => void;
}) {
  const regeln = [strings.rule1, strings.rule2, strings.rule3, strings.rule4];

  return (
    <Sheet palette={palette} onClose={onClose} title={strings.rulesTitle}>
      {/* Das Spektrum zeigt den Aufstiegsweg auf einen Blick — meist genügt
          das Bild, und die Zeilen darunter muss niemand lesen. */}
      <View style={styles.spektrum}>
        {([1, 2, 3, 4, 5] as Level[]).map((l, i) => (
          <React.Fragment key={l}>
            <Stone level={l} size={34} showShape={showShapes} />
            {i < 4 ? (
              <Text style={[styles.pfeil, { color: palette.textFaint }]}>›</Text>
            ) : (
              <>
                <Text style={[styles.pfeil, { color: palette.textFaint }]}>›</Text>
                <View style={[styles.prismaChip, { borderColor: palette.border }]}>
                  <Text style={styles.prismaChipText}>◈</Text>
                </View>
              </>
            )}
          </React.Fragment>
        ))}
      </View>

      {regeln.map((r, i) => (
        <View key={i} style={styles.regel}>
          <View style={[styles.regelNummer, { backgroundColor: palette.bg }]}>
            <Text style={[styles.regelNummerText, { color: palette.textMuted }]}>
              {i + 1}
            </Text>
          </View>
          <Text style={[styles.regelText, { color: palette.text }]}>{r}</Text>
        </View>
      ))}

      <View style={styles.abschluss}>
        <Button label={strings.close} palette={palette} onPress={onClose} block />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    borderTopLeftRadius: RADIUS.lg + 10,
    borderTopRightRadius: RADIUS.lg + 10,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    maxHeight: '86%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sheetTitle: { fontSize: 22, fontWeight: '700' },
  close: { fontSize: 19, fontWeight: '600' },
  empty: { fontSize: 15, lineHeight: 22, paddingVertical: SPACING.lg, textAlign: 'center' },
  kachelReihe: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  kachel: { flex: 1, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center' },
  kachelValue: { fontSize: 21, fontWeight: '700' },
  kachelLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },
  abschnitt: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  raster: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rasterZelle: { width: 30, height: 30, borderRadius: 7 },
  segment: { flexDirection: 'row', gap: SPACING.sm },
  segmentItem: {
    flex: 1,
    paddingVertical: SPACING.sm + 3,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  zeile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  zeileText: { flexShrink: 1 },
  zeileLabel: { fontSize: 16, fontWeight: '600' },
  zeileHint: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  vorschau: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  hinweis: { fontSize: 12, lineHeight: 17, textAlign: 'center', paddingBottom: SPACING.md },
  spektrum: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: SPACING.md,
    flexWrap: 'wrap',
  },
  pfeil: { fontSize: 18, fontWeight: '700', marginHorizontal: 1 },
  prismaChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  prismaChipText: { fontSize: 16, color: '#1A2030' },
  regel: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md, alignItems: 'flex-start' },
  regelNummer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regelNummerText: { fontSize: 13, fontWeight: '700' },
  regelText: { flex: 1, fontSize: 15, lineHeight: 22 },
  abschluss: { paddingTop: SPACING.sm, paddingBottom: SPACING.md },
});
