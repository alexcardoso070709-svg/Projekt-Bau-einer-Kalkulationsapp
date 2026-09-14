/**
 * Ein Spielstein.
 *
 * Zwei Dinge machen ihn aus. Erstens die Form: Jede Stufe hat neben ihrer
 * Farbe eine eigene (Kreis, Ring, Quadrat, Raute, Stern). Das ist kein
 * Zierrat — etwa acht Prozent der Männer unterscheiden Rot und Grün
 * schlecht, und ein Spiel, dessen Mechanik ganz auf Farbe beruht, wäre für
 * sie unspielbar. Nebenbei steigt die Formkomplexität mit der Stufe, man
 * sieht also auf einen Blick, was wertvoll ist.
 *
 * Zweitens die Tiefe: ein senkrechter Verlauf von Licht über Grundton zu
 * Schatten, eine harte Lichtkante oben und eine eingeprägte Innenform. Ohne
 * das bleibt ein Merge-Puzzle optisch eine Tabelle aus Farbfeldern.
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path, Polygon, Rect } from 'react-native-svg';
import { Level } from '../../game/types';
import { STONES, StoneStyle } from '../theme';

/** Zeichnet die Form einer Stufe in der übergebenen Farbe. */
function shapeNode(
  shape: StoneStyle['shape'],
  size: number,
  colour: string,
  strokeWidth: number,
): React.ReactNode {
  const c = size / 2;
  const r = size * 0.2;

  switch (shape) {
    case 'circle':
      return <Circle cx={c} cy={c} r={r} fill={colour} />;
    case 'ring':
      return (
        <Circle cx={c} cy={c} r={r} stroke={colour} strokeWidth={strokeWidth} fill="none" />
      );
    case 'square':
      return (
        <Rect
          x={c - r * 0.92}
          y={c - r * 0.92}
          width={r * 1.84}
          height={r * 1.84}
          rx={r * 0.26}
          fill={colour}
        />
      );
    case 'diamond':
      return (
        <Polygon
          points={`${c},${c - r * 1.2} ${c + r * 1.2},${c} ${c},${c + r * 1.2} ${c - r * 1.2},${c}`}
          fill={colour}
        />
      );
    case 'star':
      return (
        <Path
          d={[
            `M ${c} ${c - r * 1.38}`,
            `Q ${c + r * 0.22} ${c - r * 0.22} ${c + r * 1.38} ${c}`,
            `Q ${c + r * 0.22} ${c + r * 0.22} ${c} ${c + r * 1.38}`,
            `Q ${c - r * 0.22} ${c + r * 0.22} ${c - r * 1.38} ${c}`,
            `Q ${c - r * 0.22} ${c - r * 0.22} ${c} ${c - r * 1.38}`,
            'Z',
          ].join(' ')}
          fill={colour}
        />
      );
  }
}

/**
 * Die Prägung: dieselbe Form zweimal übereinander, die untere hell und
 * minimal versetzt. Dadurch wirkt sie in den Stein eingelassen statt
 * aufgemalt — derselbe Trick, mit dem geprägtes Papier Tiefe vortäuscht.
 */
const Mark = React.memo(function Mark({
  style,
  size,
}: {
  style: StoneStyle;
  size: number;
}) {
  const versatz = size * 0.024;
  const strich = size * 0.095;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G translateY={versatz}>
        {shapeNode(style.shape, size, 'rgba(255,255,255,0.32)', strich)}
      </G>
      {shapeNode(style.shape, size, style.mark, strich)}
    </Svg>
  );
});

export interface StoneProps {
  level: Level;
  size: number;
  /** Formen ausblenden, wenn jemand nur die Farben sehen möchte. */
  showShape?: boolean;
  /** Höhere Stufen werfen einen Schein — macht sie auf dem Feld auffindbar. */
  glow?: boolean;
}

export const Stone = React.memo(function Stone({
  level,
  size,
  showShape = true,
  glow = true,
}: StoneProps) {
  const style = STONES[level];
  const radius = size * 0.28;

  // Nur die beiden obersten Stufen leuchten. Leuchtete alles, hätte das Feld
  // keine Hierarchie mehr und wirkte bloß unruhig.
  const scheint = glow && level >= 4 && size > 20;

  return (
    <View
      style={[
        { width: size, height: size, borderRadius: radius },
        scheint
          ? Platform.OS === 'web'
            ? ({ boxShadow: `0 0 ${Math.round(size * 0.28)}px ${style.aura}` } as object)
            : {
                shadowColor: style.fill,
                shadowOpacity: 0.5,
                shadowRadius: size * 0.2,
                shadowOffset: { width: 0, height: 0 },
                elevation: 5,
              }
          : null,
      ]}
    >
      <LinearGradient
        colors={[style.glow, style.fill, style.shade]}
        locations={[0, 0.46, 1]}
        start={{ x: 0.22, y: 0 }}
        end={{ x: 0.78, y: 1 }}
        style={[styles.body, { borderRadius: radius }]}
      >
        {/* Harte Lichtkante oben — fängt das Licht wie eine gewölbte Fläche. */}
        <View
          style={[
            styles.topLight,
            {
              height: Math.max(1, size * 0.065),
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
            },
          ]}
        />
        {showShape ? <Mark style={style} size={size} /> : null}
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  topLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },
});
