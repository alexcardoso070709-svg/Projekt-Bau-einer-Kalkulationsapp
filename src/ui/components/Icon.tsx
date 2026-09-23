/**
 * Gezeichnete Symbole.
 *
 * Ersetzt Textzeichen wie ‹, ✕ oder ★. Die sehen je nach Schrift und System
 * anders aus, sitzen nie ganz auf der Grundlinie und verraten auf den ersten
 * Blick eine Bastellösung. Gezeichnete Pfade sind überall gleich und scharf.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'close'
  | 'check'
  | 'star'
  | 'prisma'
  | 'chain'
  | 'undo'
  | 'hint'
  | 'next'
  | 'down';

/** Strichpfade im 24er-Raster, runde Enden. */
const STRICH: Partial<Record<IconName, string[]>> = {
  back: ['M15 5 L8 12 L15 19'],
  close: ['M6 6 L18 18', 'M18 6 L6 18'],
  check: ['M5 12.5 L10 17.5 L19 7'],
  chain: [
    'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1',
    'M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  ],
  undo: ['M9 14 L4 9 L9 4', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  hint: [
    'M9.5 18h5',
    'M10.5 21h3',
    'M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z',
  ],
  next: ['M9 5 L16 12 L9 19'],
  down: ['M6 9 L12 15 L18 9'],
};

/** Gefüllte Formen. */
const FLAECHE: Partial<Record<IconName, string[]>> = {
  star: ['M12 2.8l2.75 5.6 6.15.9-4.45 4.35 1.05 6.1L12 16.85l-5.5 2.9 1.05-6.1L3.1 9.3l6.15-.9z'],
  prisma: ['M12 1.5 L22.5 12 L12 22.5 L1.5 12 Z'],
};

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  /** Nur für das Prisma-Symbol: Farbe des inneren Kerns. */
  inner?: string;
}

export const Icon = React.memo(function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 2.2,
  inner,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" pointerEvents="none">
      {(FLAECHE[name] ?? []).map((d, i) => (
        <Path key={`f${i}`} d={d} fill={color} />
      ))}
      {name === 'prisma' ? (
        <Path d="M12 7 L17 12 L12 17 L7 12 Z" fill={inner ?? 'rgba(255,255,255,0.85)'} />
      ) : null}
      {(STRICH[name] ?? []).map((d, i) => (
        <Path
          key={`s${i}`}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
});
