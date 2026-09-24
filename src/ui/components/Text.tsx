/**
 * Text mit gedeckelter Systemschriftgröße.
 *
 * Wer auf dem Telefon die größte Bedienungshilfen-Schrift eingestellt hat,
 * bekommt sonst einen Punktestand in dreifacher Größe, der die Kopfzeile
 * sprengt. Bis zum 1,3-Fachen wächst die Schrift mit — genug für bessere
 * Lesbarkeit, ohne dass das Spielfeld aus dem Bildschirm gedrückt wird.
 */
import React, { forwardRef } from 'react';
import { Text as RNText, TextProps } from 'react-native';

export const MAX_SCHRIFTFAKTOR = 1.3;

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  return <RNText maxFontSizeMultiplier={MAX_SCHRIFTFAKTOR} {...props} ref={ref} />;
});
