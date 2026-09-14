/**
 * Ein Spielstein.
 *
 * Jede Stufe hat eine eigene Farbe UND eine eigene Form. Die Form ist kein
 * Zierrat: Etwa acht Prozent der Männer unterscheiden Rot und Grün schlecht,
 * und ein Spiel, dessen ganze Mechanik auf Farbe beruht, wäre für sie
 * unspielbar. Kreis, Ring, Quadrat, Raute und Stern lösen das, ohne dass ein
 * Menü nötig wäre — sie sind von Anfang an sichtbar.
 *
 * Nebeneffekt: Die Formen steigen in ihrer Komplexität mit der Stufe. Man
 * sieht auf einen Blick, was wertvoll ist.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { Level } from '../../game/types';
import { RADIUS, STONES } from '../theme';

interface MarkProps {
  level: Level;
  size: number;
  color: string;
}

/** Die innere Form eines Steins — die Rückfallebene, wenn Farbe nicht trägt. */
const Mark = React.memo(function Mark({ level, size, color }: MarkProps) {
  const shape = STONES[level].shape;
  const c = size / 2;
  const r = size * 0.2;

  switch (shape) {
    case 'circle':
      return <Circle cx={c} cy={c} r={r} fill={color} />;
    case 'ring':
      return (
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={size * 0.095}
          fill="none"
        />
      );
    case 'square':
      return (
        <Rect
          x={c - r * 0.92}
          y={c - r * 0.92}
          width={r * 1.84}
          height={r * 1.84}
          rx={size * 0.045}
          fill={color}
        />
      );
    case 'diamond':
      return (
        <Polygon
          points={`${c},${c - r * 1.18} ${c + r * 1.18},${c} ${c},${c + r * 1.18} ${c - r * 1.18},${c}`}
          fill={color}
        />
      );
    case 'star':
      // Vierzackiger Stern mit eingezogenen Flanken — wirkt wie ein Funkeln
      // und hebt die höchste Stufe deutlich von der Raute darunter ab.
      return (
        <Path
          d={[
            `M ${c} ${c - r * 1.35}`,
            `Q ${c + r * 0.2} ${c - r * 0.2} ${c + r * 1.35} ${c}`,
            `Q ${c + r * 0.2} ${c + r * 0.2} ${c} ${c + r * 1.35}`,
            `Q ${c - r * 0.2} ${c + r * 0.2} ${c - r * 1.35} ${c}`,
            `Q ${c - r * 0.2} ${c - r * 0.2} ${c} ${c - r * 1.35}`,
            'Z',
          ].join(' ')}
          fill={color}
        />
      );
  }
});

export interface StoneProps {
  level: Level;
  size: number;
  /** Formen ausblenden, wenn jemand nur die Farben sehen möchte. */
  showShape?: boolean;
}

export const Stone = React.memo(function Stone({
  level,
  size,
  showShape = true,
}: StoneProps) {
  const style = STONES[level];
  return (
    <View
      style={[
        styles.body,
        {
          width: size,
          height: size,
          backgroundColor: style.fill,
          borderRadius: size * 0.28,
          // Lichtkante oben: gibt dem flachen Stein Tiefe, ohne Schattenbilder.
          borderTopColor: style.glow,
          borderTopWidth: Math.max(1, size * 0.055),
        },
      ]}
    >
      {showShape ? (
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Mark level={level} size={size} color={style.mark} />
        </Svg>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
