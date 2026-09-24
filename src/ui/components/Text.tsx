/**
 * Text mit begrenzter Systemschriftgröße.
 *
 * Menüs, Einstellungen und Regeln scrollen und dürfen deutlich mitwachsen
 * (bis 1,6-fach). Die feste Kopfzeile im Spiel und die großen Zahlen setzen
 * ihre eigene, engere Grenze — dort sprengte die größte Bedienungshilfen-
 * Schrift sonst das Layout.
 */
import React, { forwardRef } from 'react';
import { Text as RNText, TextProps } from 'react-native';

export const MAX_SCHRIFTFAKTOR = 1.6;

export const Text = forwardRef<RNText, TextProps>(function Text(props, ref) {
  return <RNText maxFontSizeMultiplier={MAX_SCHRIFTFAKTOR} {...props} ref={ref} />;
});
