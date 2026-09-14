/**
 * Dauerhafte Speicherung — ausschließlich auf dem Gerät.
 *
 * Es gibt keinen Server, kein Konto, keine Synchronisierung. Das ist eine
 * bewusste Entscheidung: Die App funktioniert im Flugzeug wie zu Hause, und
 * es gibt schlicht nichts, was über den Nutzer verloren gehen könnte. In der
 * Datenschutzerklärung des App Store steht dadurch "Es werden keine Daten
 * erfasst" — was heute ein Verkaufsargument ist, kein Verzicht.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey } from '../game/daily';
import { GameState, Mode } from '../game/types';

const KEY_STATS = 'prisma.stats.v1';
const KEY_SETTINGS = 'prisma.settings.v1';
const KEY_SAVE = 'prisma.save.v1';

/** So viele Tagesergebnisse werden aufbewahrt — ein Jahr Rückblick genügt. */
const ARCHIVE_LIMIT = 365;

export interface DailyResult {
  score: number;
  chain: number;
  prismas: number;
  moves: number;
  puzzle: number;
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
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    // Beschädigte Daten dürfen nie den Start verhindern.
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Voller Speicher darf das laufende Spiel nicht abbrechen.
  }
}

export const loadStats = () => readJson<Stats>(KEY_STATS, DEFAULT_STATS);
export const saveStats = (s: Stats) => writeJson(KEY_STATS, s);
export const loadSettings = () => readJson<Settings>(KEY_SETTINGS, DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => writeJson(KEY_SETTINGS, s);

/** Gestern in Tagesschlüssel-Form — Grundlage der Serienzählung. */
function yesterdayKey(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return dateKey(d);
}

/**
 * Trägt ein beendetes Spiel in die Statistik ein.
 *
 * Die Serie zählt nur das Tagesrätsel: Sie wächst, wenn gestern gespielt
 * wurde, beginnt nach einer Lücke wieder bei eins und bleibt unverändert,
 * wenn derselbe Tag ein zweites Mal abgeschlossen wird.
 */
export function recordGame(stats: Stats, game: GameState, now = new Date()): Stats {
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

  if (game.mode !== 'daily' || game.puzzleNumber === null) return next;

  const key = dateKey(now);
  const schonGespielt = key in stats.daily;

  next.daily[key] = {
    score: game.score,
    chain: game.bestChain,
    prismas: game.prismas,
    moves: game.moves,
    puzzle: game.puzzleNumber,
  };

  if (!schonGespielt) {
    next.streak = stats.lastDailyKey === yesterdayKey(now) ? stats.streak + 1 : 1;
    next.longestStreak = Math.max(stats.longestStreak, next.streak);
    next.lastDailyKey = key;
  }

  // Archiv beschneiden, damit der Speicher nicht unbegrenzt wächst.
  const keys = Object.keys(next.daily).sort();
  if (keys.length > ARCHIVE_LIMIT) {
    for (const alt of keys.slice(0, keys.length - ARCHIVE_LIMIT)) delete next.daily[alt];
  }

  return next;
}

/**
 * Die Serie ist gebrochen, wenn der letzte Eintrag älter als gestern ist.
 * Wird beim Start geprüft, damit die Anzeige nicht veraltet.
 */
export function currentStreak(stats: Stats, now = new Date()): number {
  if (!stats.lastDailyKey) return 0;
  const heute = dateKey(now);
  if (stats.lastDailyKey === heute || stats.lastDailyKey === yesterdayKey(now)) {
    return stats.streak;
  }
  return 0;
}

/** Wurde das heutige Tagesrätsel bereits abgeschlossen? */
export function dailyDone(stats: Stats, now = new Date()): DailyResult | null {
  return stats.daily[dateKey(now)] ?? null;
}

/** Laufendes Spiel sichern, damit ein Anruf keine Partie kostet. */
export const saveGame = (game: GameState | null) =>
  game ? writeJson(KEY_SAVE, game) : AsyncStorage.removeItem(KEY_SAVE).catch(() => {});

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SAVE);
    if (!raw) return null;
    const game = JSON.parse(raw) as GameState;
    // Ein gespeichertes Tagesrätsel von gestern ist wertlos: Der Seed gehört
    // zu einem anderen Tag, und ein zweiter Versuch wäre ohnehin unfair.
    if (game.mode === 'daily' && game.puzzleNumber !== null) {
      const heute = await import('../game/daily').then((m) => m.puzzleNumber());
      if (game.puzzleNumber !== heute) return null;
    }
    return game.over ? null : game;
  } catch {
    return null;
  }
}

/** Alles löschen — für die Einstellungen, falls jemand neu anfangen will. */
export async function resetAll(): Promise<void> {
  await Promise.all(
    [KEY_STATS, KEY_SETTINGS, KEY_SAVE].map((k) =>
      AsyncStorage.removeItem(k).catch(() => {
        // Auch hier gilt: kein Absturz, wenn der Speicher zickt.
      }),
    ),
  );
}
