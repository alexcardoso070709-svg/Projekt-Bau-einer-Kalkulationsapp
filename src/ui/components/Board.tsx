/**
 * Das Spielfeld.
 *
 * Der angezeigte Zustand ist bewusst vom Spielzustand getrennt: Die Engine
 * rechnet einen Zug in einem Schritt durch, die Anzeige spielt ihn in Etappen
 * ab. Nur so sieht man die Kettenreaktion, die den Reiz des Spiels ausmacht.
 *
 * Eingabe: Eine einzige Berührungsfläche verfolgt den Finger. Beim Aufsetzen
 * erscheint der Stein durchscheinend an der Stelle, an der er landen würde;
 * Verschieben wechselt die Spalte, Loslassen wirft. Ein schneller Tipp
 * funktioniert wie ein Knopfdruck, aber wer zögert, sieht vorher, was
 * passiert. Auf einem kleinen Telefon ist das der Unterschied zwischen
 * „ich habe mich vertippt" und „ich habe mich verrechnet".
 */
import React, { useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { landingRow } from '../../game/board';
import { Cell, Level, Position } from '../../game/types';
import { strings } from '../../i18n/strings';
import { Palette, STONES, TIMING } from '../theme';
import { Burst, FloatingScore, PrismaBlast } from './Effects';
import { Icon } from './Icon';
import { Stone } from './Stone';

const GAP_RATIO = 0.085;

/** Ab so vielen freien Feldern oder weniger warnt eine Spalte. */
const GEFAHR_AB = 2;

/** Ein Effekt, der an einer Zelle des Feldes sitzt. */
interface CellEffect {
  /** Eindeutig je Auslösung, damit die Animation neu startet. */
  id: string;
  row: number;
  col: number;
}

export interface BurstEffect extends CellEffect {
  colour: string;
}

export interface FloatEffect extends CellEffect {
  value: number;
  colour: string;
  chain: number;
}

export interface FallingStone {
  col: number;
  row: number;
  level: Level;
  /** Zählt hoch, damit auch zwei gleiche Würfe hintereinander neu animieren. */
  nonce: number;
}

/* ── Zelle ─────────────────────────────────────────────────────── */

/**
 * Eine Zelle. Sie animiert sich selbst, wenn sich ihr Inhalt ändert: Ein
 * aufgestiegener Stein pocht kurz auf, ein neu erschienener wächst heran.
 */
const CellView = React.memo(function CellView({
  level,
  size,
  showShape,
  emptyColor,
}: {
  level: Cell;
  size: number;
  showShape: boolean;
  emptyColor: string;
}) {
  const scale = useSharedValue(1);
  const previous = useRef<Cell>(level);

  useEffect(() => {
    const vorher = previous.current;
    previous.current = level;
    if (level === 0) return;
    if (vorher === 0) {
      scale.value = withSequence(
        withTiming(0.62, { duration: 0 }),
        withSpring(1, { damping: 14, stiffness: 260 }),
      );
    } else if (level !== vorher) {
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
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: emptyColor,
        }}
      />
    );
  }

  return (
    <Animated.View style={[{ width: size, height: size }, animated]}>
      <Stone level={level as Level} size={size} showShape={showShape} />
    </Animated.View>
  );
});

/* ── Fallender Stein ───────────────────────────────────────────── */

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
    y.value = withSequence(
      withTiming(-cellSize, { duration: 0 }),
      withTiming(ziel, { duration: TIMING.drop, easing: Easing.in(Easing.quad) }),
      withTiming(ziel - cellSize * 0.07, { duration: 50 }),
      withSpring(ziel, { damping: 15, stiffness: 400 }),
    );
  }, [stone.nonce, stone.row, cellSize, gap, y]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        { top: 0, left: stone.col * (cellSize + gap), width: cellSize, height: cellSize },
        animated,
      ]}
    >
      <Stone level={stone.level} size={cellSize} showShape={showShape} />
    </Animated.View>
  );
}

/* ── Landevorschau ─────────────────────────────────────────────── */

/**
 * Der Stein als Platzhalter: farbige Kontur, zarte Füllung, die Form in
 * voller Farbe. Ein bloß halbdurchsichtiger Stein vermischt sich mit dem
 * dunklen Grund zu einem schmutzigen Farbton — Gelb wurde Oliv. Eine Kontur
 * bleibt rein und sagt unmissverständlich: Hier wird etwas sein.
 */
function GhostStone({ level, size, showShape }: { level: Level; size: number; showShape: boolean }) {
  const farbe = STONES[level];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        borderWidth: Math.max(2, size * 0.055),
        borderColor: farbe.fill,
        backgroundColor: farbe.aura.replace(/[\d.]+\)$/, '0.16)'),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showShape ? (
        <View style={{ opacity: 0.85 }}>
          <Stone level={level} size={size * 0.62} showShape glow={false} />
        </View>
      ) : null}
    </View>
  );
}

/* ── Warnung vor dem Überlaufen ────────────────────────────────── */

/**
 * Rotes Glimmen am oberen Ende einer fast vollen Spalte. Es pulsiert langsam,
 * damit es aus dem Augenwinkel auffällt, ohne das Spiel zu übertönen —
 * Spannung, kein Alarm.
 */
function DangerGlow({
  col,
  cellSize,
  gap,
  colour,
  still,
}: {
  col: number;
  cellSize: number;
  gap: number;
  colour: string;
  still: boolean;
}) {
  const puls = useSharedValue(0.6);

  useEffect(() => {
    if (still) return;
    puls.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 950, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 950, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [puls, still]);

  const animated = useAnimatedStyle(() => ({ opacity: puls.value }));

  return (
    <Animated.View
      testID={`danger-${col}`}
      pointerEvents="none"
      style={[
        styles.abs,
        {
          top: -gap * 1.2,
          left: col * (cellSize + gap) - gap * 0.3,
          width: cellSize + gap * 0.6,
          height: cellSize * 1.6,
          overflow: 'hidden',
        },
        animated,
      ]}
    >
      {/* Eine klare Kante oben markiert die Grenze, darunter verläuft ein
          weiches Glimmen. Beides zusammen liest sich als „bis hierhin". */}
      <LinearGradient
        colors={[colour + '66', colour + '00']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: cellSize * 0.18,
          right: cellSize * 0.18,
          height: Math.max(2, cellSize * 0.05),
          borderRadius: 2,
          backgroundColor: colour,
        }}
      />
    </Animated.View>
  );
}

/* ── Abweisung ─────────────────────────────────────────────────── */

/** Kurzes rotes Aufflackern samt Zucken, wenn eine Spalte voll ist. */
function RejectFlash({
  col,
  cellSize,
  gap,
  height,
  colour,
}: {
  col: number;
  cellSize: number;
  gap: number;
  height: number;
  colour: string;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
  }, [p]);

  const animated = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - p.value),
    transform: [{ translateX: Math.sin(p.value * Math.PI * 5) * (1 - p.value) * cellSize * 0.08 }],
  }));

  return (
    <Animated.View
      testID="reject"
      pointerEvents="none"
      style={[
        styles.abs,
        {
          top: 0,
          left: col * (cellSize + gap),
          width: cellSize,
          height,
          borderRadius: cellSize * 0.28,
          backgroundColor: colour,
        },
        animated,
      ]}
    />
  );
}

/* ── Tipp-Hinweis ──────────────────────────────────────────────── */

/**
 * Pulsierender Ring auf dem Landefeld und ein Pfeil darüber. Kommt ohne ein
 * Wort aus — ein pochender Kreis bedeutet in jeder Sprache „hier".
 */
function TapHint({
  col,
  row,
  cellSize,
  gap,
  colour,
  still,
  level,
  showShape,
}: {
  col: number;
  row: number;
  cellSize: number;
  gap: number;
  colour: string;
  still: boolean;
  /** Stein, der hier landen soll — zeigt nicht nur wo, sondern auch was. */
  level: Level | null;
  showShape: boolean;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    p.value = withRepeat(withTiming(1, { duration: 1150, easing: Easing.out(Easing.quad) }), -1);
  }, [p, still]);

  const ring = useAnimatedStyle(() => ({
    opacity: still ? 0.9 : 0.95 * (1 - p.value),
    transform: [{ scale: still ? 1 : 0.7 + p.value * 0.55 }],
  }));

  const pfeil = useAnimatedStyle(() => ({
    transform: [{ translateY: still ? 0 : Math.sin(p.value * Math.PI) * cellSize * 0.18 }],
  }));

  const x = col * (cellSize + gap);
  const y = row * (cellSize + gap);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.abs, { left: x, top: -cellSize * 0.95, width: cellSize, alignItems: 'center' }, pfeil]}
      >
        <Icon name="down" size={cellSize * 0.62} color={colour} strokeWidth={2.8} />
      </Animated.View>
      <View
        testID="tap-hint"
        pointerEvents="none"
        style={[styles.abs, styles.centre, { left: x, top: y, width: cellSize, height: cellSize }]}
      >
        {level ? (
          <View style={StyleSheet.absoluteFill}>
            <GhostStone level={level} size={cellSize} showShape={showShape} />
          </View>
        ) : null}
        <Animated.View
          style={[
            {
              width: cellSize,
              height: cellSize,
              borderRadius: cellSize * 0.3,
              borderWidth: Math.max(2, cellSize * 0.06),
              borderColor: colour,
            },
            ring,
          ]}
        />
      </View>
    </>
  );
}

/* ── Spielfeld ─────────────────────────────────────────────────── */

export interface BoardProps {
  board: Cell[][];
  cellSize: number;
  palette: Palette;
  showShapes: boolean;
  onColumnPress: (col: number) => void;
  disabled?: boolean;
  /** Stufe des Steins, der als Nächstes fällt — für die Landevorschau. */
  ghostLevel?: Level | null;
  falling?: FallingStone | null;
  flashes?: Position[];
  bursts?: BurstEffect[];
  floats?: FloatEffect[];
  /** Zuletzt abgewiesene Spalte, blitzt kurz rot auf. */
  rejected?: { col: number; nonce: number } | null;
  /** Pulsierender Hinweis über einer Spalte — Tutorial und Zen-Tipp. */
  hintColumn?: number | null;
  /** Warnung vor dem Überlaufen. Im Zen-Modus sinnlos, dort gibt es kein Ende. */
  showDanger?: boolean;
  reducedMotion?: boolean;
}

export function GameBoard({
  board,
  cellSize,
  palette,
  showShapes,
  onColumnPress,
  disabled = false,
  ghostLevel = null,
  falling = null,
  flashes = [],
  bursts = [],
  floats = [],
  rejected = null,
  hintColumn = null,
  showDanger = true,
  reducedMotion = false,
}: BoardProps) {
  const gap = Math.round(cellSize * GAP_RATIO);
  const rows = board.length;
  const cols = board[0].length;
  const width = cols * cellSize + (cols - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap;
  const schritt = cellSize + gap;

  const [aim, setAim] = useState<number | null>(null);
  const aimRef = useRef<number | null>(null);
  /** Seitenversatz der Berührungsfläche, beim Aufsetzen einmal ermittelt. */
  const versatz = useRef({ x: 0, y: 0 });

  const spalteBei = (x: number) =>
    Math.max(0, Math.min(cols - 1, Math.floor((x + gap / 2) / schritt)));

  const zielen = (c: number | null) => {
    if (aimRef.current === c) return;
    aimRef.current = c;
    setAim(c);
  };

  const beiAufsetzen = (e: GestureResponderEvent) => {
    const { pageX, pageY, locationX, locationY } = e.nativeEvent;
    // Beim Aufsetzen ist die Fläche selbst das Ziel, locationX also relativ
    // zu ihr. Daraus ergibt sich ihre Lage auf der Seite — spätere Bewegungen
    // rechnen über pageX, weil der Finger die Fläche verlassen kann.
    versatz.current = { x: pageX - locationX, y: pageY - locationY };
    zielen(spalteBei(locationX));
  };

  const beiBewegung = (e: GestureResponderEvent) => {
    zielen(spalteBei(e.nativeEvent.pageX - versatz.current.x));
  };

  const beiLoslassen = (e: GestureResponderEvent) => {
    const c = aimRef.current;
    const y = e.nativeEvent.pageY - versatz.current.y;
    zielen(null);
    // Weit aus dem Feld herausgezogen heißt: abbrechen, nicht werfen.
    if (c !== null && y > -cellSize * 1.5 && y < height + cellSize * 1.5) onColumnPress(c);
  };

  const zielZeile = aim !== null ? landingRow(board, aim) : -1;

  return (
    <View
      style={[
        styles.tray,
        {
          padding: gap * 1.6,
          borderRadius: cellSize * 0.42,
          backgroundColor: palette.boardBg,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={{ width, height }}>
        {/* Leuchtende Bahn der gezielten Spalte */}
        {aim !== null ? (
          <View
            pointerEvents="none"
            style={[
              styles.abs,
              {
                top: 0,
                left: aim * schritt - gap * 0.35,
                width: cellSize + gap * 0.7,
                height,
                borderRadius: cellSize * 0.32,
                backgroundColor: zielZeile < 0 ? palette.danger : palette.accent,
                opacity: zielZeile < 0 ? 0.2 : 0.11,
              },
            ]}
          />
        ) : null}

        <View style={{ gap }}>
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

        {showDanger
          ? board[0].map((_, c) =>
              landingRow(board, c) < GEFAHR_AB ? (
                <DangerGlow
                  key={`d${c}`}
                  col={c}
                  cellSize={cellSize}
                  gap={gap}
                  colour={palette.danger}
                  still={reducedMotion}
                />
              ) : null,
            )
          : null}

        {/* Landevorschau */}
        {aim !== null && zielZeile >= 0 && ghostLevel ? (
          <View
            testID="ghost"
            pointerEvents="none"
            style={[
              styles.abs,
              { left: aim * schritt, top: zielZeile * schritt },
            ]}
          >
            <GhostStone level={ghostLevel} size={cellSize} showShape={showShapes} />
          </View>
        ) : null}

        {rejected ? (
          <RejectFlash
            key={`rej${rejected.nonce}`}
            col={rejected.col}
            cellSize={cellSize}
            gap={gap}
            height={height}
            colour={palette.danger}
          />
        ) : null}

        {falling ? (
          <Falling stone={falling} cellSize={cellSize} gap={gap} showShape={showShapes} />
        ) : null}

        {bursts.map((b) => (
          <View
            key={b.id}
            pointerEvents="none"
            style={[styles.abs, { left: b.col * schritt, top: b.row * schritt, width: cellSize, height: cellSize }]}
          >
            <Burst colour={b.colour} cell={cellSize} count={reducedMotion ? 3 : 7} />
          </View>
        ))}

        {flashes.map((p, i) => (
          <View
            key={`f${p.row}-${p.col}-${i}`}
            pointerEvents="none"
            style={[styles.abs, { left: p.col * schritt, top: p.row * schritt, width: cellSize, height: cellSize }]}
          >
            <PrismaBlast cell={cellSize} />
          </View>
        ))}

        {floats.map((f) => (
          <View
            key={f.id}
            pointerEvents="none"
            style={[
              styles.abs,
              { left: f.col * schritt, top: f.row * schritt, width: cellSize, height: cellSize, zIndex: 10 },
            ]}
          >
            <FloatingScore value={f.value} colour={f.colour} chain={f.chain} cell={cellSize} />
          </View>
        ))}

        {hintColumn !== null && landingRow(board, hintColumn) >= 0 ? (
          <TapHint
            col={hintColumn}
            row={landingRow(board, hintColumn)}
            cellSize={cellSize}
            gap={gap}
            colour={palette.accent}
            still={reducedMotion}
            level={ghostLevel}
            showShape={showShapes}
          />
        ) : null}

        {/* Berührungsfläche. Die Spalten darin sind für Vorleseprogramme da:
            Sie beschreiben ihren Inhalt und lassen sich per Doppeltipp
            auslösen. Für den Finger reagiert allein die Fläche. */}
        <View
          style={[styles.touchLayer, { gap }]}
          onStartShouldSetResponder={() => !disabled}
          onMoveShouldSetResponder={() => !disabled}
          onResponderTerminationRequest={() => false}
          onResponderGrant={beiAufsetzen}
          onResponderMove={beiBewegung}
          onResponderRelease={beiLoslassen}
          onResponderTerminate={() => zielen(null)}
        >
          {board[0].map((_, c) => (
            <View
              key={`t${c}`}
              pointerEvents="none"
              accessible
              accessibilityRole="button"
              accessibilityLabel={spaltenText(board, c)}
              accessibilityState={{ disabled }}
              accessibilityActions={[{ name: 'activate' }]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'activate' && !disabled) onColumnPress(c);
              }}
              style={{ width: cellSize, height: '100%' }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Vorlesetext einer Spalte, etwa „Spalte 3 · 6 frei · oben Orange". So lässt
 * sich das Feld auch blind erkunden: Jede Spalte sagt, wie viel Platz sie hat
 * und welche Farbe obenauf liegt.
 */
function spaltenText(board: Cell[][], c: number): string {
  const frei = landingRow(board, c) + 1;
  let oben: Cell = 0;
  for (let r = 0; r < board.length; r++) {
    if (board[r][c] !== 0) {
      oben = board[r][c];
      break;
    }
  }
  const teile = [`${strings.column} ${c + 1}`, `${frei} ${strings.free}`];
  if (oben) teile.push(`${strings.top} ${strings.colours[oben - 1]}`);
  return teile.join(' · ');
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  tray: { borderWidth: 1 },
  row: { flexDirection: 'row' },
  touchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
});
