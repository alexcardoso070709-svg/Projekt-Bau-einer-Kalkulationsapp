/**
 * Dauerhafte Speicherung — ausschließlich auf dem Gerät.
 *
 * Kein Server, kein Konto, keine Synchronisierung. In der Datenschutzangabe
 * des App Store steht dadurch „Es werden keine Daten erfasst". Die Logik
 * dahinter liegt getestet in stats.ts; hier geschieht nur Lesen und Schreiben.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, Mode } from '../game/types';
import { DEFAULT_SETTINGS, Settings, Stats, isTodaysDaily, normalizeStats } from './stats';

export * from './stats';

// Die Schlüssel tragen noch den Arbeitstitel. Absicht: Eine Umbenennung
// würde bestehende Spielstände verwaisen lassen.
const KEY_STATS = 'prisma.stats.v1';
const KEY_SETTINGS = 'prisma.settings.v1';

/**
 * Ein Speicherplatz je Modus. Früher teilten sich Endlos und Zen einen Platz:
 * Wer eine pausierte Endlos-Partie hatte und Zen antippte, verlor sie.
 */
const KEY_SAVE: Record<Mode, string> = {
  endless: 'prisma.save.v1',
  zen: 'prisma.save.zen.v1',
  daily: 'prisma.save.daily.v1',
  tempo: 'prisma.save.tempo.v1',
};

export type SavedGames = Record<Mode, GameState | null>;

async function read(key: string): Promise<unknown> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Beschädigte Daten dürfen nie den Start verhindern.
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Voller Speicher darf das laufende Spiel nicht abbrechen.
  }
}

export async function loadStats(): Promise<Stats> {
  const raw = await read(KEY_STATS);
  return normalizeStats(raw && typeof raw === 'object' ? (raw as object) : {});
}

export const saveStats = (s: Stats) => write(KEY_STATS, s);

export async function loadSettings(): Promise<Settings> {
  const raw = await read(KEY_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? (raw as object) : {}) };
}

export const saveSettings = (s: Settings) => write(KEY_SETTINGS, s);

/** Spielstand eines Modus sichern oder mit null löschen. */
export function saveGame(mode: Mode, game: GameState | null): Promise<void> {
  return game ? write(KEY_SAVE[mode], game) : AsyncStorage.removeItem(KEY_SAVE[mode]).catch(() => {});
}

/**
 * Alle gespeicherten Partien. Jede wird nach ihrem eigenen Modus einsortiert,
 * nicht nach dem Platz, an dem sie lag — so wandert eine Zen-Partie aus der
 * älteren, gemeinsamen Ablage an ihren richtigen Platz.
 */
export async function loadSavedGames(): Promise<SavedGames> {
  const plaetze = Object.keys(KEY_SAVE) as Mode[];
  const gelesen = await Promise.all(plaetze.map((p) => read(KEY_SAVE[p]) as Promise<GameState | null>));
  const gueltig = (g: GameState | null): g is GameState =>
    !!g && !g.over && g.mode in KEY_SAVE && (g.mode !== 'daily' || isTodaysDaily(g));

  // 1. Entscheiden: je Modus die beste gültige Partie, egal wo sie lag.
  //    Liegen zwei vor (alte gemeinsame Ablage und eigener Platz), gewinnt
  //    die mit mehr Fortschritt — eine bewusste Wahl statt Zufall der Reihenfolge.
  const result: SavedGames = { daily: null, endless: null, zen: null, tempo: null };
  // Partien am eigenen Platz zuerst: Bei Gleichstand bleibt die richtig
  // einsortierte, nicht die aus der alten Ablage.
  const reihenfolge = gelesen
    .map((g, i) => ({ g, eigen: !!g && g.mode === plaetze[i] }))
    .sort((x, y) => Number(y.eigen) - Number(x.eigen))
    .map((x) => x.g);
  reihenfolge.forEach((g) => {
    if (!gueltig(g)) return;
    const bisher = result[g.mode];
    if (!bisher || g.moves > bisher.moves) result[g.mode] = g;
  });

  // 2. Aufräumen: Nur Plätze, deren Inhalt einem anderen Modus gehört, und
  //    nur nachdem ihr Inhalt übernommen oder bewusst verworfen wurde. Eigene,
  //    veraltete Stände bleiben liegen; loadSavedGames ignoriert sie ohnehin.
  const zuSchreiben = new Set<Mode>();
  plaetze.forEach((platz, i) => {
    const g = gelesen[i];
    if (g && g.mode !== platz && g.mode in KEY_SAVE) {
      if (result[g.mode] === g) zuSchreiben.add(g.mode);
    }
  });
  for (const mode of zuSchreiben) await saveGame(mode, result[mode]);
  for (let i = 0; i < plaetze.length; i++) {
    const g = gelesen[i];
    const platz = plaetze[i];
    if (g && g.mode !== platz && !zuSchreiben.has(platz)) await saveGame(platz, null);
  }
  return result;
}

/** Alles löschen — für einen Neuanfang aus den Einstellungen. */
export async function resetAll(): Promise<void> {
  await Promise.all(
    [KEY_STATS, KEY_SETTINGS, ...Object.values(KEY_SAVE)].map((k) => AsyncStorage.removeItem(k).catch(() => {})),
  );
}
