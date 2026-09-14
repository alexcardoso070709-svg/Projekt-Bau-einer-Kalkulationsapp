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
  /** Grundfarbe des Steins. */
  fill: string;
  /** Hellere Kante für die Lichtkante oben. */
  glow: string;
  /** Farbe der inneren Form. */
  mark: string;
  /** Form der Stufe — die Rückfallebene, wenn Farbe nicht erkennbar ist. */
  shape: 'circle' | 'ring' | 'square' | 'diamond' | 'star';
}

export const STONES: Record<Level, StoneStyle> = {
  1: { fill: '#FF4D6A', glow: '#FF8098', mark: '#8C0F28', shape: 'circle' },
  2: { fill: '#FF9038', glow: '#FFB36E', mark: '#8A4407', shape: 'ring' },
  3: { fill: '#FFD23F', glow: '#FFE483', mark: '#8A6800', shape: 'square' },
  4: { fill: '#3ED598', glow: '#79E7BB', mark: '#0A6141', shape: 'diamond' },
  5: { fill: '#4D9BFF', glow: '#86BCFF', mark: '#0B3C80', shape: 'star' },
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
  bg: '#0A0D14',
  bgElevated: '#141926',
  boardBg: '#10151F',
  cellEmpty: '#1A2030',
  text: '#F2F5FA',
  textMuted: '#98A2B8',
  textFaint: '#5A6478',
  accent: '#4D9BFF',
  border: '#222A3C',
  overlay: 'rgba(6,9,15,0.86)',
  danger: '#FF6B6B',
};

export const LIGHT: Palette = {
  bg: '#F6F7FB',
  bgElevated: '#FFFFFF',
  boardBg: '#ECEEF5',
  cellEmpty: '#DFE3ED',
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

export const FONT = {
  /** Zahlen laufen monospace, damit der Punktestand beim Zählen nicht zappelt. */
  mono: 'System',
  display: 'System',
};
