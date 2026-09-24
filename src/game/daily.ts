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
 * Fortlaufende Nummer des Tagesrätsels.
 *
 * Gerechnet wird in Kalendertagen: Jahr, Monat und Tag der lokalen Zeit
 * werden als UTC-Datum gedeutet, in dem es keine Sommerzeit gibt. Eine
 * frühere Fassung zog lokale Mitternächte in Millisekunden voneinander ab
 * und rundete ab — während der Sommerzeit fehlte dabei eine Stunde, und die
 * Nummer lag von Ende März bis Ende Oktober einen Tag daneben.
 */
export function puzzleNumber(date: Date = new Date()): number {
  const tag = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const start = Date.UTC(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY);
  return Math.round((tag - start) / 86_400_000) + 1;
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

/**
 * Kalendertag eines Rätsels. Umkehrung von puzzleNumber — nötig, damit ein
 * kurz vor Mitternacht begonnenes und danach beendetes Rätsel seinem eigenen
 * Tag zugerechnet wird statt dem folgenden.
 */
export function dateForPuzzle(n: number): Date {
  return new Date(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY + n - 1);
}
