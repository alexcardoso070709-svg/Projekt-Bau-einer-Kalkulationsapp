/**
 * Atmosphärischer Hintergrund.
 *
 * Zwei sehr weiche Lichtkegel — ein kühler oben, ein warmer unten — über dem
 * Grundton. Beide sind bewusst kaum wahrnehmbar: Man soll sie nicht als
 * Effekt bemerken, sondern nur spüren, dass der Bildschirm Tiefe hat statt
 * einer flachen Farbfläche. Ein deutlicher Verlauf würde mit den Spielsteinen
 * konkurrieren, und die sollen die einzigen kräftigen Farben bleiben.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Palette } from '../theme';

export interface BackdropProps {
  palette: Palette;
  dark: boolean;
  /** Stärke der Lichtkegel. Im Spiel etwas zurückgenommen. */
  intensity?: number;
}

export const Backdrop = React.memo(function Backdrop({
  palette,
  dark,
  intensity = 1,
}: BackdropProps) {
  // Im hellen Design tragen dieselben Lichtkegel viel schneller auf, weil sie
  // gegen Weiß arbeiten statt gegen Schwarz.
  const oben = (dark ? 0.22 : 0.1) * intensity;
  const unten = (dark ? 0.13 : 0.06) * intensity;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="kuehl" cx="50%" cy="16%" rx="82%" ry="52%">
            <Stop offset="0" stopColor="#4D9BFF" stopOpacity={oben} />
            <Stop offset="1" stopColor="#4D9BFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="warm" cx="76%" cy="92%" rx="70%" ry="46%">
            <Stop offset="0" stopColor="#FF9038" stopOpacity={unten} />
            <Stop offset="1" stopColor="#FF9038" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#kuehl)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#warm)" />
      </Svg>
    </View>
  );
});
