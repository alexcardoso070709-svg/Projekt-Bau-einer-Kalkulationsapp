/**
 * Statistik, Serie und Tagesrätsel-Archiv — reine Logik ohne Speicherzugriff.
 *
 * Getrennt von store.ts, damit sie ohne Gerät testbar ist. Gerade die
 * Serienzählung ist heikel: Sie entscheidet, ob jemand nach 40 Tagen seine
 * Serie verliert, und darf sich dabei nicht verzählen.
 */
import { dateForPuzzle, dateKey, puzzleNumber } from '../game/daily';
import { Board, GameState, Mode } from '../game/types';

export interface DailyResult {
  score: number;
  chain: number;
  prismas: number;
  moves: number;
  puzzle: number;
  /** Endstand des Feldes — damit das Ergebnis später wieder gezeigt werden kann. */
  board?: Board;
}

export interface Stats {
  played: number;
  totalScore: number;
  bestScore: Record<Mode, number>;
  bestChain: number;
  prismas: number;
  /** Aufeinanderfolgende Tage mit gelöstem Tagesrätsel. */
  streak: number;
  longestStreak: number;
  lastDailyKey: string | null;
  daily: Record<string, DailyResult>;
}

export type ThemeChoice = 'auto' | 'dark' | 'light';

export interface Settings {
  theme: ThemeChoice;
  haptics: boolean;
  sound: boolean;
  /** Formen zusätzlich zur Farbe zeigen. Standardmäßig an. */
  colorAssist: boolean;
  /** Wurde das wortlose Tutorial durchlaufen? */
  tutorialDone: boolean;
}

export const DEFAULT_STATS: Stats = {
  played: 0,
  totalScore: 0,
  bestScore: { daily: 0, endless: 0, zen: 0 },
  bestChain: 0,
  prismas: 0,
  streak: 0,
  longestStreak: 0,
  lastDailyKey: null,
  daily: {},
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  haptics: true,
  sound: true,
  colorAssist: true,
  tutorialDone: false,
};

/** So viele Tagesergebnisse werden aufbewahrt — ein Jahr Rückblick genügt. */
const ARCHIVE_LIMIT = 365;

function yesterdayKey(today: Date): string {
  return dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
}

/**
 * Trägt ein beendetes Spiel in die Statistik ein.
 *
 * Die Serie zählt nur das Tagesrätsel: Sie wächst, wenn gestern gespielt
 * wurde, beginnt nach einer Lücke wieder bei eins und bleibt unverändert,
 * wenn derselbe Tag ein zweites Mal gemeldet wird. Ein bereits
 * eingetragenes Tagesergebnis wird nie überschrieben — sonst ließe sich das
 * Rätsel so lange wiederholen, bis das Ergebnis gefällt.
 */
export function recordGame(stats: Stats, game: GameState, now = new Date()): Stats {
  const istTages = game.mode === 'daily' && game.puzzleNumber !== null;
  // Maßgeblich ist der Tag des Rätsels, nicht der Moment des Spielendes: Wer
  // um 23:58 beginnt und um 0:03 fertig wird, hat das Rätsel von gestern
  // gelöst — und darf das von heute noch spielen.
  const tagDesRaetsels = istTages ? dateForPuzzle(game.puzzleNumber as number) : now;
  const key = dateKey(tagDesRaetsels);
  if (istTages && key in stats.daily) return stats;

  const next: Stats = {
    ...stats,
    played: stats.played + 1,
    totalScore: stats.totalScore + game.score,
    bestScore: {
      ...stats.bestScore,
      [game.mode]: Math.max(stats.bestScore[game.mode] ?? 0, game.score),
    },
    bestChain: Math.max(stats.bestChain, game.bestChain),
    prismas: stats.prismas + game.prismas,
    daily: { ...stats.daily },
  };

  if (!istTages) return next;

  next.daily[key] = {
    score: game.score,
    chain: game.bestChain,
    prismas: game.prismas,
    moves: game.moves,
    puzzle: game.puzzleNumber as number,
    board: game.board.map((r) => r.slice()),
  };
  next.streak = stats.lastDailyKey === yesterdayKey(tagDesRaetsels) ? stats.streak + 1 : 1;
  next.longestStreak = Math.max(stats.longestStreak, next.streak);
  // Nie rückwärts: Ein nachgereichtes älteres Rätsel verschiebt die Serie nicht.
  if (!stats.lastDailyKey || key > stats.lastDailyKey) next.lastDailyKey = key;
  else next.streak = stats.streak;

  const keys = Object.keys(next.daily).sort();
  for (const alt of keys.slice(0, Math.max(0, keys.length - ARCHIVE_LIMIT))) {
    delete next.daily[alt];
  }
  return next;
}

/** Die Serie gilt nur, solange der letzte Eintrag von heute oder gestern ist. */
export function currentStreak(stats: Stats, now = new Date()): number {
  if (!stats.lastDailyKey) return 0;
  return stats.lastDailyKey === dateKey(now) || stats.lastDailyKey === yesterdayKey(now)
    ? stats.streak
    : 0;
}

/** Heutiges Tagesergebnis, falls das Rätsel schon gelöst wurde. */
export function dailyDone(stats: Stats, now = new Date()): DailyResult | null {
  return stats.daily[dateKey(now)] ?? null;
}

/** Baut aus einem archivierten Tagesergebnis einen Zustand fürs Ergebnisfenster. */
export function archivedDailyGame(result: DailyResult): GameState {
  return {
    mode: 'daily',
    moveLimit: null,
    board: result.board ?? [],
    queue: [1, 1, 1],
    score: result.score,
    bestChain: result.chain,
    highestLevel: 1,
    prismas: result.prismas,
    moves: result.moves,
    over: true,
    puzzleNumber: result.puzzle,
    seed: 0,
    rngCalls: 0,
  };
}

/** Ist ein gespeichertes Tagesrätsel noch von heute? */
export function isTodaysDaily(game: GameState | null, now = new Date()): boolean {
  return !!game && game.mode === 'daily' && game.puzzleNumber === puzzleNumber(now);
}
