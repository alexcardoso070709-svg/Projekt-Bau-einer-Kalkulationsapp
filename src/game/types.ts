/**
 * Irisa — Kerntypen der Spiel-Engine.
 *
 * Die Engine ist bewusst frei von React und Plattform-APIs: sie ist reines,
 * deterministisches TypeScript. Das macht sie testbar und erlaubt es, das
 * Tagesrätsel auf jedem Gerät bitgenau identisch zu erzeugen.
 */

/** Die fünf Stufen des Farbspektrums: Rot, Orange, Gelb, Grün, Blau. */
export type Level = 1 | 2 | 3 | 4 | 5;

/** Eine Zelle des Spielfelds: entweder leer (0) oder ein Stein einer Stufe. */
export type Cell = 0 | Level;

/** Spielfeld als Zeilen-Array. Zeile 0 ist oben, die letzte Zeile unten. */
export type Board = Cell[][];

export const COLS = 5;
export const ROWS = 8;

/**
 * Die höchste Stufe. Blau steigt nicht weiter auf — was darüber hinausginge,
 * zündet ein Prisma, das sich und seine Umgebung auflöst.
 *
 * Warum fünf Stufen und nicht mehr: In 60 Zügen fallen rund 186 Einheiten an
 * Spielmasse an (ein Stein der Stufe n entspricht 3^(n-1) roten Steinen). Eine
 * sechste Stufe kostet allein 243 Einheiten — sie wäre in einem Tagesrätsel
 * nie erreichbar gewesen, und mit ihr der Höhepunkt des Spiels. Fünf Stufen
 * legen das Prisma genau in die Reichweite eines guten Spielers.
 */
export const MAX_LEVEL: Level = 5;

/** Ab wie vielen gleichfarbigen, zusammenhängenden Steinen verschmolzen wird. */
export const MERGE_MIN = 3;

/**
 * Stufensprung nach Gruppengröße.
 *
 * Drei Steine heben eine Stufe, fünf heben zwei, acht heben drei. Das ist der
 * Kern der Spieltiefe: Wer Geduld hat und eine große Gruppe aufbaut, statt
 * beim dritten Stein sofort zu verschmelzen, kommt ungleich schneller voran.
 * Ohne diese Regel entschied fast nur das Glück — ein geübter Spieler kam im
 * Tagesrätsel bloß 27 Prozent weiter als jemand, der blind tippt.
 */
export function levelGain(groupSize: number): number {
  if (groupSize >= 8) return 3;
  if (groupSize >= 5) return 2;
  return 1;
}

export type Mode = 'daily' | 'endless' | 'zen' | 'tempo';

export interface Position {
  row: number;
  col: number;
}

/** Eine zusammenhängende Gruppe gleichfarbiger Steine, die verschmilzt. */
export interface MergeGroup {
  level: Level;
  cells: Position[];
  /** Zielzelle, an der der aufgestiegene Stein erscheint. */
  anchor: Position;
  /** Stufe des entstehenden Steins, oder null bei einer Prisma-Detonation. */
  resultLevel: Level | null;
}

/**
 * Ein einzelner Schritt der Auflösung. Die Oberfläche spielt diese Schritte
 * nacheinander ab, um Verschmelzung und Kettenreaktion sichtbar zu machen.
 */
export interface ResolutionStep {
  /** Kettenglied: 1 für die erste Verschmelzung, 2 für die Folge daraus, usw. */
  chain: number;
  groups: MergeGroup[];
  /** Zellen, die eine Prisma-Explosion zusätzlich weggeräumt hat. */
  cleared: Position[];
  /** In diesem Schritt erzielte Punkte, Kettenfaktor bereits eingerechnet. */
  points: number;
  /** Spielfeld nach diesem Schritt (bereits nachgerutscht). */
  board: Board;
}

/** Ergebnis eines vollständigen Zuges inklusive aller Folge-Ketten. */
export interface MoveResult {
  board: Board;
  /**
   * Das Feld unmittelbar nach dem Ablegen, vor der ersten Verschmelzung.
   * Die Oberfläche zeigt diesen Zwischenstand kurz an — sonst verschmölze
   * der Stein im selben Moment, in dem er landet, und die Ursache der
   * Kettenreaktion bliebe unsichtbar.
   */
  boardAfterDrop: Board;
  steps: ResolutionStep[];
  points: number;
  /** Längste Kette dieses Zuges. */
  chain: number;
  /** Position, auf der der abgelegte Stein zur Ruhe kam. */
  landed: Position;
  /** Stufe des höchsten in diesem Zug entstandenen Steins. */
  highestLevel: Level;
  /** Zahl der Prisma-Explosionen in diesem Zug. */
  prismas: number;
  /** Im Tempo-Modus gutgeschriebene Bonuszeit in Millisekunden, sonst 0. */
  timeBonusMs: number;
}

export interface GameState {
  mode: Mode;
  board: Board;
  /** Stein, der als Nächstes fällt, gefolgt von der Vorschau. */
  queue: Level[];
  score: number;
  /** Längste Kette des gesamten Spiels. */
  bestChain: number;
  /** Höchste bislang erreichte Stufe. */
  highestLevel: Level;
  prismas: number;
  moves: number;
  over: boolean;
  /** Puzzle-Nummer des Tagesrätsels, sonst null. */
  puzzleNumber: number | null;
  /**
   * Zugbegrenzung, oder null für unbegrenzt. Das Tagesrätsel ist begrenzt,
   * damit alle unter exakt gleichen Bedingungen spielen — nur dann ist ein
   * geteiltes Ergebnis überhaupt vergleichbar.
   */
  moveLimit: number | null;
  /**
   * Nur im Tempo-Modus: verfügbare Spielzeit in Millisekunden, wächst durch
   * Zeitboni. Fehlt bei allen anderen Modi (und bei älteren Spielständen).
   */
  timeLimitMs?: number | null;
  /** Nur im Tempo-Modus: bereits verbrauchte Spielzeit in Millisekunden. */
  elapsedMs?: number;
  seed: number;
  /** Interner Zählerstand des Zufallsgenerators, macht den Zustand speicherbar. */
  rngCalls: number;
}
