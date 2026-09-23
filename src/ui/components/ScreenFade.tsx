/**
 * Weicher Bildschirmwechsel.
 *
 * Jeder neue Bildschirm blendet in einer Viertelsekunde ein und wächst dabei
 * unmerklich auf volle Größe. Harte Schnitte wirken wie ein Neuladen; eine
 * kurze Überblendung wie ein Raum, der sich öffnet. Bei „Bewegung
 * reduzieren" bleibt nur die Überblendung — so empfiehlt es auch Apple.
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export function ScreenFade({ testID, children }: { testID: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [p]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: reduced ? 1 : 0.985 + p.value * 0.015 }],
  }));

  return (
    <Animated.View testID={testID} style={[styles.fill, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
