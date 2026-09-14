/**
 * Gestaltung: Farben, Abstände, Zeiten.
 *
 * Die fünf Spielfarben sind nicht nur nach Schönheit gewählt, sondern nach
 * Unterscheidbarkeit — auch für die rund acht Prozent der Männer mit einer
 * Rot-Grün-Schwäche. Weil Farbe allein dafür nie reicht, trägt jede Stufe
 * zusätzlich eine eigene Form (siehe Stone.tsx). Wer die Farben nicht
 * auseinanderhalten kann, erkennt die Steine an Kreis, Ring, Quadrat,
 * Raute und Stern.
 */
import { Level } from '../game/types';

export interface StoneStyle {
  /** Grundfarbe des Steins — die Mitte des Verlaufs. */
  fill: string;
  /** Lichtseite oben. */
  glow: string;
  /** Schattenseite unten. Gibt dem Stein Volumen statt einer Flachfarbe. */
  shade: string;
  /** Farbe der inneren Form. */
  mark: string;
  /** Schein, den höhere Stufen um sich werfen. */
  aura: string;
  /** Form der Stufe — die Rückfallebene, wenn Farbe nicht erkennbar ist. */
  shape: 'circle' | 'ring' | 'square' | 'diamond' | 'star';
}

/**
 * Die fünf Spielfarben.
 *
 * Jede Stufe ist als Dreiklang aus Licht, Grundton und Schatten angelegt,
 * nicht als einzelner Wert. Ein senkrechter Verlauf zwischen diesen dreien
 * lässt den Stein gewölbt wirken, als fiele Licht von oben darauf — der
 * Unterschied zwischen einem farbigen Rechteck und einem Spielstein, den
 * man anfassen möchte.
 */
export const STONES: Record<Level, StoneStyle> = {
  1: { fill: '#FF4D6A', glow: '#FF8FA3', shade: '#D93755', mark: '#7A0C22', aura: 'rgba(255,77,106,0.45)', shape: 'circle' },
  2: { fill: '#FF9038', glow: '#FFBE82', shade: '#E06E17', mark: '#7A3A05', aura: 'rgba(255,144,56,0.45)', shape: 'ring' },
  3: { fill: '#FFD23F', glow: '#FFE999', shade: '#E5B111', mark: '#7A5A00', aura: 'rgba(255,210,63,0.45)', shape: 'square' },
  4: { fill: '#3ED598', glow: '#84EBC2', shade: '#1CB479', mark: '#07553A', aura: 'rgba(62,213,152,0.45)', shape: 'diamond' },
  5: { fill: '#4D9BFF', glow: '#95C6FF', shade: '#2676E6', mark: '#08336E', aura: 'rgba(77,155,255,0.55)', shape: 'star' },
};

/** Prisma: kein Stein, sondern ein Aufleuchten im Moment der Explosion. */
export const PRISMA = {
  core: '#FFFFFF',
  ring: '#B8E4FF',
  spark: '#FFE9A8',
};

export interface Palette {
  bg: string;
  bgElevated: string;
  boardBg: string;
  cellEmpty: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  border: string;
  overlay: string;
  danger: string;
}

export const DARK: Palette = {
  bg: '#080B11',
  bgElevated: '#141926',
  boardBg: 'rgba(255,255,255,0.022)',
  cellEmpty: 'rgba(255,255,255,0.045)',
  text: '#F2F5FA',
  textMuted: '#98A2B8',
  textFaint: '#5A6478',
  accent: '#4D9BFF',
  border: '#222A3C',
  overlay: 'rgba(6,9,15,0.86)',
  danger: '#FF6B6B',
};

export const LIGHT: Palette = {
  bg: '#F4F6FB',
  bgElevated: '#FFFFFF',
  boardBg: 'rgba(16,21,31,0.022)',
  cellEmpty: 'rgba(16,21,31,0.062)',
  text: '#10151F',
  textMuted: '#5A6478',
  textFaint: '#98A2B8',
  accent: '#2B7FFF',
  border: '#DFE3ED',
  overlay: 'rgba(246,247,251,0.9)',
  danger: '#E5484D',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
};

/**
 * Zeiten der Spielanimationen in Millisekunden.
 *
 * Bewusst knapp gehalten: Ein Zug samt Kettenreaktion muss deutlich unter
 * einer Sekunde bleiben, sonst wartet der Spieler auf das Spiel statt zu
 * spielen — und bei 90 Zügen pro Partie summiert sich jede Zehntelsekunde.
 */
export const TIMING = {
  drop: 170,
  mergeCollapse: 130,
  mergePop: 150,
  chainGap: 90,
  prismaFlash: 380,
  screenFade: 220,
};

/**
 * Schrift: Outfit.
 *
 * Eine geometrische Grotesk mit sehr runden Kleinbuchstaben und offenen
 * Ziffern — sie greift die Kreise, Ringe und abgerundeten Quadrate der
 * Spielsteine auf, statt daneben zu stehen. Bewusst nicht eine der
 * üblichen Standardschriften, die inzwischen jede zweite App verwendet.
 *
 * Bei eingebundenen Schriften wird das Gewicht über die Familie gewählt,
 * nicht über fontWeight: Sonst rechnet das System sich ein Gewicht selbst
 * zusammen, was auf Android sichtbar verzerrt.
 */
export const FONT = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semiBold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extraBold: 'Outfit_800ExtraBold',
};

/**
 * Ziffern mit gleicher Laufweite. Ohne das springt der Punktestand beim
 * Hochzählen seitlich hin und her, weil eine 1 schmaler ist als eine 8.
 */
export const TABULAR = { fontVariant: ['tabular-nums' as const] };
