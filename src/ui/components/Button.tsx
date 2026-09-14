/**
 * Knopf mit Druckrückmeldung.
 *
 * Die kurze Verkleinerung beim Antippen kostet wenig Code und macht den
 * Unterschied zwischen "reagiert" und "hängt" — gerade auf älteren Geräten,
 * wo der eigentliche Bildwechsel einen Moment braucht.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { button as feedbackButton } from '../feedback';
import { FONT, Palette, RADIUS, SPACING } from '../theme';

export interface ButtonProps {
  label: string;
  sublabel?: string;
  onPress: () => void;
  palette: Palette;
  variant?: 'primary' | 'secondary' | 'ghost';
  accent?: string;
  disabled?: boolean;
  style?: ViewStyle;
  /** Für Menükarten: nimmt die volle Breite und gibt Raum für eine Zeile mehr. */
  block?: boolean;
  right?: React.ReactNode;
}

export function Button({
  label,
  sublabel,
  onPress,
  palette,
  variant = 'primary',
  accent,
  disabled = false,
  style,
  block = false,
  right,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.965, { damping: 18, stiffness: 320 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 16, stiffness: 280 });
  }, [scale]);

  const handlePress = useCallback(() => {
    feedbackButton();
    onPress();
  }, [onPress]);

  const farbe = accent ?? palette.accent;
  const background =
    variant === 'primary'
      ? farbe
      : variant === 'secondary'
        ? palette.bgElevated
        : 'transparent';
  const textColor = variant === 'primary' ? '#FFFFFF' : palette.text;

  return (
    <Animated.View style={[animated, block && styles.block, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.base,
          block && styles.blockInner,
          {
            backgroundColor: background,
            borderColor: variant === 'secondary' ? palette.border : 'transparent',
            borderWidth: variant === 'secondary' ? 1 : 0,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <View style={styles.labels}>
          <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
            {label}
          </Text>
          {sublabel ? (
            <Text
              style={[
                styles.sublabel,
                { color: variant === 'primary' ? 'rgba(255,255,255,0.82)' : palette.textMuted },
              ]}
              numberOfLines={1}
            >
              {sublabel}
            </Text>
          ) : null}
        </View>
        {right}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { width: '100%' },
  blockInner: { paddingVertical: SPACING.md + 2 },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    minHeight: 52,
  },
  labels: { flexShrink: 1 },
  label: { fontSize: 17, fontFamily: FONT.semiBold, letterSpacing: 0.1 },
  sublabel: { fontSize: 13, marginTop: 2, fontFamily: FONT.medium },
});
