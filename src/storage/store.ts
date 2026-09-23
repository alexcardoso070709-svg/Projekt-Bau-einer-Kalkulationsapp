/**
 * Dauerhafte Speicherung — ausschließlich auf dem Gerät.
 *
 * Es gibt keinen Server, kein Konto, keine Synchronisierung. Die App
 * funktioniert im Flugzeug wie zu Hause, und in der Datenschutzangabe des
 * App Store steht „Es werden keine Daten erfasst".
 *
 * Die Logik dahinter (Serie, Archiv) liegt in stats.ts und ist dort getestet;
 * hier geschieht nur Lesen und Schreiben.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../game/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  Settings,
  Stats,
  isTodaysDaily,
} from './stats';

export * from './stats';

const KEY_STATS = 'prisma.stats.v1';
const KEY_SETTINGS = 'prisma.settings.v1';

/**
 * Zwei getrennte Spielstände: einer für Endlos und Zen, einer allein für das
 * Tagesrätsel. Früher teilten sie sich einen Platz — wer mitten im
 * Tagesrätsel eine Endlos-Partie begann, verlor es und konnte dann von vorn
 * anfangen. Ein Zweitversuch durch die Hintertür.
 */
export type SaveSlot = 'free' | 'daily';
const KEY_SAVE: Record<SaveSlot, string> = {
  free: 'prisma.save.v1',
  daily: 'prisma.save.daily.v1',
};

async function readJson<T extends object>(key: string, fallback: T): Promise<T> {
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

export function slotFor(game: GameState): SaveSlot {
  return game.mode === 'daily' ? 'daily' : 'free';
}

/** Spielstand sichern (oder mit null löschen), damit ein Anruf keine Partie kostet. */
export function saveGame(slot: SaveSlot, game: GameState | null): Promise<void> {
  return game
    ? writeJson(KEY_SAVE[slot], game)
    : AsyncStorage.removeItem(KEY_SAVE[slot]).catch(() => {});
}

export async function loadGame(slot: SaveSlot): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SAVE[slot]);
    if (!raw) return null;
    const game = JSON.parse(raw) as GameState;
    if (game.over) return null;
    // Ein Tagesrätsel von gestern ist wertlos: Sein Seed gehört zu einem
    // anderen Tag.
    if (slot === 'daily' && !isTodaysDaily(game)) return null;
    return game;
  } catch {
    return null;
  }
}

/** Alles löschen — für einen Neuanfang aus den Einstellungen. */
export async function resetAll(): Promise<void> {
  await Promise.all(
    [KEY_STATS, KEY_SETTINGS, KEY_SAVE.free, KEY_SAVE.daily].map((k) =>
      AsyncStorage.removeItem(k).catch(() => {}),
    ),
  );
}
