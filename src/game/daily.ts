/**
 * Tagesrätsel: Datum -> Puzzle-Nummer -> Seed.
 *
 * Bewusst nach lokalem Datum, nicht nach UTC. So beginnt für jede Person
 * um ihre eigene Mitternacht ein neues Rätsel — und alle, die am selben
 * Kalendertag spielen, spielen dasselbe Spielfeld.
 */
import { hashString } from './rng';

/** Startpunkt der Zählung. Rätsel Nr. 1 ist der 1. Januar 2026. */
export const EPOCH_YEAR = 2026;
export const EPOCH_MONTH = 0;
export const EPOCH_DAY = 1;

/** Tagesschlüssel im Format JJJJ-MM-TT nach lokaler Zeit. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Fortlaufende Nummer des Tagesrätsels. Rechnet über lokale Mitternacht,
 * damit Sommerzeitumstellungen die Zählung nicht verschieben.
 */
export function puzzleNumber(date: Date = new Date()): number {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const epoch = new Date(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY).getTime();
  return Math.floor((today - epoch) / 86_400_000) + 1;
}

/** Seed eines Tagesrätsels. Gleiche Nummer -> gleiches Spielfeld, weltweit. */
export function seedForPuzzle(n: number): number {
  return hashString(`prisma-daily-v1-${n}`);
}

/** Seed für ein Endlos- oder Zen-Spiel. */
export function randomSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
}

/** Millisekunden bis zum nächsten Tagesrätsel (lokale Mitternacht). */
export function msUntilNextPuzzle(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
