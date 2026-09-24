/**
 * Wirkungseffekte beim Verschmelzen.
 *
 * Nichts hiervon verändert das Spiel — und trotzdem entscheidet es darüber,
 * ob sich ein Zug gut anfühlt. Ein Merge ohne Rückmeldung ist eine
 * Zustandsänderung; ein Merge mit wegfliegenden Funken, aufsteigender
 * Punktzahl und einem Stoß im Handgelenk ist eine Belohnung. Bei 90 Zügen
 * pro Partie summiert sich dieser Unterschied.
 *
 * Alle Effekte sind bewusst kurz (unter einer halben Sekunde) und stören den
 * nächsten Zug nicht: Sie laufen über dem Feld, nie davor.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FONT, PRISMA } from '../theme';

/* ── Funken ────────────────────────────────────────────────────── */

interface SparkProps {
  angle: number;
  distance: number;
  colour: string;
  size: number;
  delay: number;
}

function Spark({ angle, distance, colour, size, delay }: SparkProps) {
  const p = useSharedValue(0);

  React.useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) }),
    );
  }, [p, delay]);

  const style = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85,
      transform: [
        { translateX: Math.cos(angle) * distance * t },
        // Der quadratische Anteil lässt die Funken am Ende leicht absacken —
        // ohne diese angedeutete Schwerkraft wirkt die Streuung mechanisch.
        { translateY: Math.sin(angle) * distance * t + t * t * distance * 0.42 },
        { scale: 1 - t * 0.55 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colour,
          // Heller Kern und farbiger Schein: Ohne das wirken die Funken wie
          // Krümel statt wie etwas, das gerade auseinandergesprungen ist.
          borderWidth: size * 0.22,
          borderColor: 'rgba(255,255,255,0.9)',
          shadowColor: colour,
          shadowOpacity: 0.9,
          shadowRadius: size * 0.8,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

export interface BurstProps {
  colour: string;
  /** Kantenlänge der Zelle — alle Streuweiten leiten sich daraus ab. */
  cell: number;
  count?: number;
}

/** Ein Funkenstoß aus einer verschmelzenden Zelle. */
export const Burst = React.memo(function Burst({ colour, cell, count = 7 }: BurstProps) {
  // Die Winkel einmalig festlegen, sonst springen die Funken bei jedem
  // Neuzeichnen an eine andere Stelle.
  const funken = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7,
        distance: cell * (0.55 + Math.random() * 0.5),
        size: cell * (0.15 + Math.random() * 0.1),
        delay: Math.random() * 45,
      })),
    [count, cell],
  );

  return (
    <View style={styles.centre} pointerEvents="none">
      {funken.map((f, i) => (
        <Spark key={i} colour={colour} {...f} />
      ))}
    </View>
  );
});

/* ── Aufsteigende Punktzahl ────────────────────────────────────── */

export interface FloatingScoreProps {
  value: number;
  colour: string;
  /** Ab Kette 2 wird die Zahl größer und kräftiger. */
  chain: number;
  cell: number;
}

export const FloatingScore = React.memo(function FloatingScore({
  value,
  colour,
  chain,
  cell,
}: FloatingScoreProps) {
  const p = useSharedValue(0);

  React.useEffect(() => {
    p.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [p]);

  const style = useAnimatedStyle(() => ({
    // Erst kurz stehen bleiben, dann aufsteigen und verblassen — eine Zahl,
    // die sofort losfliegt, ist nicht lesbar.
    opacity:
      p.value < 0.08
        ? p.value / 0.08
        : p.value < 0.55
          ? 1
          : 1 - Math.pow((p.value - 0.55) / 0.45, 2),
    transform: [
      { translateY: -cell * 1.5 * Math.pow(p.value, 1.4) },
      { scale: 0.6 + Math.min(1, p.value * 5) * 0.4 },
    ],
  }));

  const gross = Math.min(chain, 4);

  return (
    <Animated.View style={[styles.centre, style]} pointerEvents="none">
      <View style={[styles.floatPill, { backgroundColor: colour }]}>
        <Text
          style={[
            styles.floatText,
            { fontSize: cell * (0.3 + gross * 0.035) },
          ]}
          allowFontScaling={false}
        >
          +{value}
        </Text>
      </View>
    </Animated.View>
  );
});

/* ── Prisma ────────────────────────────────────────────────────── */

/** Ein Lichtstrahl der Explosion. */
function Ray({ angle, cell, delay }: { angle: number; cell: number; delay: number }) {
  const p = useSharedValue(0);

  React.useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) }));
  }, [p, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.9,
    transform: [
      { rotate: `${angle}rad` },
      { translateY: -cell * (0.3 + p.value * 1.5) },
      { scaleY: 0.4 + p.value * 1.5 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: Math.max(2, cell * 0.06),
          height: cell * 0.5,
          borderRadius: cell * 0.03,
          backgroundColor: PRISMA.spark,
        },
        style,
      ]}
    />
  );
}

export interface PrismaBlastProps {
  cell: number;
}

/**
 * Die Prisma-Explosion: Kern, zwei Schockwellen und acht Strahlen.
 *
 * Sie ist der seltenste Moment des Spiels — in der Messung schafft ihn ein
 * geübter Spieler an rund einem Drittel der Tage. Genau der Moment, den
 * jemand teilen würde, also darf er ruhig groß ausfallen.
 */
export const PrismaBlast = React.memo(function PrismaBlast({ cell }: PrismaBlastProps) {
  const p = useSharedValue(0);

  React.useEffect(() => {
    p.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
  }, [p]);

  const kern = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - p.value * 1.6),
    transform: [{ scale: 0.3 + p.value * 2.4 }],
  }));

  const welle1 = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.85,
    transform: [{ scale: 0.2 + p.value * 3.6 }],
  }));

  const welle2 = useAnimatedStyle(() => ({
    opacity: Math.max(0, (1 - p.value) * 0.55 - 0.12),
    transform: [{ scale: 0.2 + p.value * 5.4 }],
  }));

  const strahlen = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ((Math.PI * 2) / 8) * i),
    [],
  );

  return (
    <View style={styles.centre} pointerEvents="none">
      <Animated.View
        style={[
          styles.ring,
          { width: cell, height: cell, borderRadius: cell / 2, borderColor: PRISMA.ring },
          welle2,
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: cell, height: cell, borderRadius: cell / 2, borderColor: PRISMA.core },
          welle1,
        ]}
      />
      {strahlen.map((a, i) => (
        <Ray key={i} angle={a} cell={cell} delay={i * 8} />
      ))}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: cell * 0.62,
            height: cell * 0.62,
            borderRadius: cell * 0.31,
            backgroundColor: PRISMA.core,
          },
          kern,
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  centre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', borderWidth: 2, backgroundColor: 'transparent' },
  /* Die Zahl sitzt auf einer farbigen Plakette: Weiß auf Farbe bleibt über
     jedem Untergrund lesbar, während farbiger Text auf farbigem Feld je nach
     Spielstand verschwindet. */
  floatPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  floatText: {
    fontFamily: FONT.extraBold,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
});

/* ── Konfetti ──────────────────────────────────────────────────── */

const KONFETTI_FARBEN = ['#FF4D6A', '#FF9038', '#FFD23F', '#3ED598', '#4D9BFF', '#FFFFFF'];

function Schnipsel({
  x,
  breite,
  hoehe,
  farbe,
  verzoegerung,
  drift,
  dreh,
  fall,
}: {
  x: number;
  breite: number;
  hoehe: number;
  farbe: string;
  verzoegerung: number;
  drift: number;
  dreh: number;
  fall: number;
}) {
  const p = useSharedValue(0);

  React.useEffect(() => {
    p.value = withDelay(
      verzoegerung,
      withTiming(1, { duration: 1700 + Math.random() * 600, easing: Easing.out(Easing.quad) }),
    );
  }, [p, verzoegerung]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.75 ? 1 : 1 - (p.value - 0.75) / 0.25,
    transform: [
      { translateX: drift * p.value + Math.sin(p.value * 9) * 6 },
      { translateY: -40 + fall * p.value },
      { rotate: `${dreh * p.value}deg` },
      { scaleX: 0.4 + Math.abs(Math.cos(p.value * 12)) * 0.6 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, left: x, width: breite, height: hoehe, borderRadius: 2, backgroundColor: farbe },
        style,
      ]}
    />
  );
}

/**
 * Konfetti in den Spielfarben — nur bei einem neuen Bestwert. Würde es nach
 * jeder Partie regnen, bedeutete es nichts mehr.
 */
export const Confetti = React.memo(function Confetti({
  width,
  height,
  count = 34,
}: {
  width: number;
  height: number;
  count?: number;
}) {
  const teile = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        breite: 6 + Math.random() * 5,
        hoehe: 9 + Math.random() * 7,
        farbe: KONFETTI_FARBEN[i % KONFETTI_FARBEN.length],
        verzoegerung: Math.random() * 380,
        drift: (Math.random() - 0.5) * 120,
        dreh: (Math.random() - 0.5) * 720,
        fall: height * (0.55 + Math.random() * 0.4),
      })),
    [count, width, height],
  );

  return (
    <View testID="confetti" pointerEvents="none" style={[styles.centre, { overflow: 'hidden' }]}>
      {teile.map((t, i) => (
        <Schnipsel key={i} {...t} />
      ))}
    </View>
  );
});
