/**
 * Das Spielfeld.
 *
 * Der angezeigte Zustand ist bewusst vom Spielzustand getrennt: Die Engine
 * rechnet einen Zug in einem Schritt durch, die Anzeige spielt ihn in Etappen
 * ab. Nur so sieht man die Kettenreaktion, die den Reiz des Spiels ausmacht —
 * sonst würde das Ergebnis einfach erscheinen.
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Cell, Level, Position } from '../../game/types';
import { Palette, PRISMA, RADIUS, TIMING } from '../theme';
import { Stone } from './Stone';

const GAP_RATIO = 0.085;

interface CellViewProps {
  level: Cell;
  size: number;
  showShape: boolean;
  emptyColor: string;
}

/**
 * Eine Zelle. Sie animiert sich selbst, wenn sich ihr Inhalt ändert: Ein
 * aufgestiegener Stein pocht kurz auf, ein neu erschienener wächst heran.
 * Das hält die Animationslogik lokal, statt sie über das ganze Feld zu ziehen.
 */
const CellView = React.memo(function CellView({
  level,
  size,
  showShape,
  emptyColor,
}: CellViewProps) {
  const scale = useSharedValue(1);
  const previous = useRef<Cell>(level);

  useEffect(() => {
    const vorher = previous.current;
    previous.current = level;
    if (level === 0) return;

    if (vorher === 0) {
      // Neu erschienen — heranwachsen lassen.
      scale.value = withSequence(
        withTiming(0.62, { duration: 0 }),
        withSpring(1, { damping: 14, stiffness: 260 }),
      );
    } else if (level !== vorher) {
      // Aufgestiegen — kurz aufpochen, damit der Aufstieg auffällt.
      scale.value = withSequence(
        withTiming(1.24, { duration: TIMING.mergePop * 0.45 }),
        withSpring(1, { damping: 11, stiffness: 240 }),
      );
    }
  }, [level, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (level === 0) {
    return (
      <View
        style={[
          styles.cell,
          { width: size, height: size, borderRadius: size * 0.28, backgroundColor: emptyColor },
        ]}
      />
    );
  }

  return (
    <Animated.View style={[styles.cell, { width: size, height: size }, animated]}>
      <Stone level={level as Level} size={size} showShape={showShape} />
    </Animated.View>
  );
});

/** Der Lichtblitz einer Prisma-Explosion. */
function PrismaFlash({ size }: { size: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: TIMING.prismaFlash });
  }, [progress]);

  const core = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 0.5 + progress.value * 2.1 }],
  }));

  const ring = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.75,
    transform: [{ scale: 0.3 + progress.value * 3.2 }],
  }));

  return (
    <View pointerEvents="none" style={[styles.flashWrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.flashRing,
          { width: size, height: size, borderRadius: size / 2, borderColor: PRISMA.ring },
          ring,
        ]}
      />
      <Animated.View
        style={[
          styles.flashCore,
          { width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3 },
          core,
        ]}
      />
    </View>
  );
}

export interface FallingStone {
  col: number;
  row: number;
  level: Level;
  /** Zählt hoch, damit auch zwei gleiche Würfe hintereinander neu animieren. */
  nonce: number;
}

/** Der Stein, der gerade fällt — als Überlagerung über dem Feld. */
function Falling({
  stone,
  cellSize,
  gap,
  showShape,
}: {
  stone: FallingStone;
  cellSize: number;
  gap: number;
  showShape: boolean;
}) {
  const y = useSharedValue(-cellSize);

  useEffect(() => {
    const ziel = stone.row * (cellSize + gap);
    y.value = withTiming(-cellSize, { duration: 0 });
    // Leichtes Nachfedern beim Aufprall: Der Stein sackt minimal ein.
    y.value = withSequence(
      withTiming(ziel, { duration: TIMING.drop }),
      withTiming(ziel - cellSize * 0.07, { duration: 50 }),
      withSpring(ziel, { damping: 15, stiffness: 400 }),
    );
  }, [stone.nonce, stone.row, cellSize, gap, y]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.falling,
        { left: stone.col * (cellSize + gap), width: cellSize, height: cellSize },
        animated,
      ]}
    >
      <Stone level={stone.level} size={cellSize} showShape={showShape} />
    </Animated.View>
  );
}

export interface BoardProps {
  board: Cell[][];
  cellSize: number;
  palette: Palette;
  showShapes: boolean;
  onColumnPress: (col: number) => void;
  disabled?: boolean;
  falling?: FallingStone | null;
  /** Stellen, an denen gerade ein Prisma gezündet hat. */
  flashes?: Position[];
  /** Hebt eine Spalte hervor — für den Tipp-Knopf. */
  highlightColumn?: number | null;
}

export function GameBoard({
  board,
  cellSize,
  palette,
  showShapes,
  onColumnPress,
  disabled = false,
  falling = null,
  flashes = [],
  highlightColumn = null,
}: BoardProps) {
  const gap = Math.round(cellSize * GAP_RATIO);
  const rows = board.length;
  const cols = board[0].length;
  const width = cols * cellSize + (cols - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <View style={[styles.grid, { gap }]}>
        {board.map((row, r) => (
          <View key={`r${r}`} style={[styles.row, { gap }]}>
            {row.map((cell, c) => (
              <CellView
                key={`c${r}-${c}`}
                level={cell}
                size={cellSize}
                showShape={showShapes}
                emptyColor={palette.cellEmpty}
              />
            ))}
          </View>
        ))}
      </View>

      {falling ? (
        <Falling stone={falling} cellSize={cellSize} gap={gap} showShape={showShapes} />
      ) : null}

      {flashes.map((p, i) => (
        <View
          key={`f${p.row}-${p.col}-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: p.col * (cellSize + gap),
            top: p.row * (cellSize + gap),
          }}
        >
          <PrismaFlash size={cellSize} />
        </View>
      ))}

      {/* Die Tippflächen liegen über dem gesamten Feld: Eine Spalte trifft
          man so überall, nicht nur unten am Stapel. */}
      <View style={[styles.touchLayer, { gap }]} pointerEvents="box-none">
        {board[0].map((_, c) => (
          <Pressable
            key={`t${c}`}
            accessibilityRole="button"
            accessibilityLabel={`Spalte ${c + 1}`}
            disabled={disabled}
            onPress={() => onColumnPress(c)}
            style={[
              styles.touch,
              { width: cellSize, borderRadius: cellSize * 0.28 },
              highlightColumn === c && {
                backgroundColor: palette.accent,
                opacity: 0.16,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  grid: { flexDirection: 'column' },
  row: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  falling: { position: 'absolute', top: 0 },
  touchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  touch: { height: '100%' },
  flashWrap: { alignItems: 'center', justifyContent: 'center' },
  flashRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  flashCore: { position: 'absolute', backgroundColor: PRISMA.core },
});
