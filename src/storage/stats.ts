/**
 * Statistik, Serie und Tagesrätsel-Archiv — reine Logik ohne Speicherzugriff.
 *
 * Tagesergebnisse werden nach Rätselnummer abgelegt, nicht nach Datum. Früher
 * gab es beides nebeneinander — Datum hier, Nummer dort — und jede
 * Abweichung zwischen den Umrechnungen (Sommerzeit, Mitternacht) brach
 * Serie und Archiv. Mit der Nummer als einziger Wahrheit gibt es diese
 * Fehlerklasse nicht mehr.
 */
import { puzzleNumber } from '../game/daily';
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
  /** Aufeinanderfolgende Rätsel ohne Lücke. */
  streak: number;
  longestStreak: number;
  /** Nummer des zuletzt gelösten Tagesrätsels. */
  lastDailyPuzzle: number | null;
  /** Tagesergebnisse, Schlüssel ist die Rätselnummer. */
  daily: Record<string, DailyResult>;
  /** Verbleibende Tipps, modusübergreifend. Höchstens HINTS_MAX. */
  hints: number;
}

/**
 * Höchstzahl gleichzeitig vorrätiger Tipps.
 *
 * Ein unbegrenzter Tipp-Knopf nimmt jedem Zug seine Spannung — man tippt
 * einfach, bis es passt. Drei sind knapp genug, dass ein Tipp eine
 * Entscheidung bleibt, aber nie so knapp, dass ein einziger falscher
 * Fingertipp die letzte Reserve verbrennt.
 */
export const HINTS_MAX = 3;

/** Nach so vielen Zügen in einer laufenden Partie gibt es einen Tipp zurück. */
export const HINT_MOVES_MILESTONE = 100;

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
  bestScore: { daily: 0, endless: 0, zen: 0, tempo: 0 },
  bestChain: 0,
  prismas: 0,
  streak: 0,
  longestStreak: 0,
  lastDailyPuzzle: null,
  daily: {},
  hints: HINTS_MAX,
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

/**
 * Bringt gespeicherte Statistik auf den aktuellen Stand. Ältere Fassungen
 * legten Tagesergebnisse nach Datum ab („2026-09-14"); jedes Ergebnis trägt
 * aber seine Rätselnummer, also wird danach neu einsortiert.
 */
export function normalizeStats(raw: Partial<Stats> & { lastDailyKey?: string | null }): Stats {
  const daily: Record<string, DailyResult> = {};
  for (const ergebnis of Object.values(raw.daily ?? {})) {
    if (ergebnis && typeof ergebnis.puzzle === 'number') daily[String(ergebnis.puzzle)] = ergebnis;
  }
  let last = raw.lastDailyPuzzle ?? null;
  if (last === null && raw.lastDailyKey) {
    const [y, m, d] = raw.lastDailyKey.split('-').map(Number);
    if (y && m && d) last = puzzleNumber(new Date(y, m - 1, d));
  }
  const { lastDailyKey: _alt, ...rest } = raw;
  return {
    ...DEFAULT_STATS,
    ...rest,
    bestScore: { ...DEFAULT_STATS.bestScore, ...(raw.bestScore ?? {}) },
    lastDailyPuzzle: last,
    daily,
    hints: clampHints(raw.hints ?? DEFAULT_STATS.hints),
  };
}

function clampHints(n: number): number {
  return Math.max(0, Math.min(HINTS_MAX, Math.round(n)));
}

/** Verbraucht einen Tipp. Ohne Vorrat unverändert — nie ins Negative. */
export function spendHint(stats: Stats): Stats {
  if (stats.hints <= 0) return stats;
  return { ...stats, hints: stats.hints - 1 };
}

/** Schreibt einen Tipp gut, gedeckelt bei HINTS_MAX. */
export function earnHint(stats: Stats): Stats {
  if (stats.hints >= HINTS_MAX) return stats;
  return { ...stats, hints: stats.hints + 1 };
}

/**
 * Trägt ein beendetes Spiel in die Statistik ein.
 *
 * Die Serie zählt nur Tagesrätsel: Sie wächst, wenn das vorige Rätsel gelöst
 * wurde, und beginnt nach einer Lücke bei eins. Ein eingetragenes
 * Tagesergebnis wird nie überschrieben — sonst ließe sich das Rätsel so
 * lange wiederholen, bis das Ergebnis gefällt.
 */
export function recordGame(stats: Stats, game: GameState): Stats {
  const n = game.mode === 'daily' ? game.puzzleNumber : null;
  if (n !== null && String(n) in stats.daily) return stats;

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
  if (n === null) return next;

  next.daily[String(n)] = {
    score: game.score,
    chain: game.bestChain,
    prismas: game.prismas,
    moves: game.moves,
    puzzle: n,
    board: game.board.map((r) => r.slice()),
  };

  // Nur ein neueres Rätsel bewegt die Serie; ein nachgereichtes älteres nicht.
  const last = stats.lastDailyPuzzle;
  if (last === null || n > last) {
    next.streak = last === n - 1 ? stats.streak + 1 : 1;
    next.longestStreak = Math.max(stats.longestStreak, next.streak);
    next.lastDailyPuzzle = n;
  }

  const nummern = Object.keys(next.daily).map(Number).sort((a, b) => a - b);
  for (const alt of nummern.slice(0, Math.max(0, nummern.length - ARCHIVE_LIMIT))) {
    delete next.daily[String(alt)];
  }
  return next;
}

/** Die Serie gilt, solange das heutige oder das gestrige Rätsel gelöst ist. */
export function currentStreak(stats: Stats, now = new Date()): number {
  const last = stats.lastDailyPuzzle;
  if (last === null) return 0;
  const heute = puzzleNumber(now);
  return last === heute || last === heute - 1 ? stats.streak : 0;
}

/** Ergebnis des heutigen Rätsels, falls schon gelöst. */
export function dailyDone(stats: Stats, now = new Date()): DailyResult | null {
  return stats.daily[String(puzzleNumber(now))] ?? null;
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

/** Ist ein gespeicherter Spielstand das heutige Tagesrätsel? */
export function isTodaysDaily(game: GameState | null, now = new Date()): boolean {
  return !!game && game.mode === 'daily' && game.puzzleNumber === puzzleNumber(now);
}
