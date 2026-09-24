/**
 * Teilbares Ergebnis nach dem Wordle-Prinzip.
 *
 * Das ist der Wachstumsmotor der App: ein Ergebnis, das man in WhatsApp
 * einwirft, ohne das Rätsel zu verraten. Es besteht fast nur aus Emoji,
 * ist also in jeder Sprache lesbar, und jedes Spielfeld sieht anders aus —
 * das macht neugierig, ohne zu spoilern.
 */
import { SHARE_TITLE } from '../brand';
import { Board, GameState, Level } from './types';

/**
 * Emoji je Stufe — dieselben fünf Spektralfarben wie im Spiel. Bewusst nur
 * Emoji, die auf iOS, Android und im Web gleich aussehen. Prisma taucht hier
 * nicht auf: Es explodiert im Moment seiner Entstehung und bleibt nie liegen,
 * deshalb zählt es der ◈-Zähler unter dem Raster.
 */
const EMOJI: Record<number, string> = {
  0: '⬛',
  1: '🟥',
  2: '🟧',
  3: '🟨',
  4: '🟩',
  5: '🟦',
};

export function cellEmoji(level: number): string {
  return EMOJI[level] ?? EMOJI[0];
}

/**
 * Wandelt das Spielfeld in ein Emoji-Raster. Leere Zeilen am oberen Rand
 * werden abgeschnitten: Das hält die Nachricht kurz und zeigt nebenbei,
 * wie aufgeräumt das Feld geblieben ist.
 */
export function boardToEmoji(board: Board): string {
  const firstUsed = board.findIndex((row) => row.some((c) => c !== 0));
  if (firstUsed === -1) return '';
  return board
    .slice(firstUsed)
    .map((row) => row.map((cell) => cellEmoji(cell)).join(''))
    .join('\n');
}

/** Tausenderpunkte, mit Rückfallebene falls Intl nicht verfügbar ist. */
export function formatNumber(value: number, locale = 'de-DE'): string {
  try {
    return value.toLocaleString(locale);
  } catch {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}

export interface ShareOptions {
  locale?: string;
  /** Übersetzte Modusnamen; ohne Angabe Deutsch. */
  labels?: { endless: string; zen: string };
  /** Wird als letzte Zeile angehängt, sobald die App im Store steht. */
  link?: string;
}

/**
 * Baut den Text für die Teilen-Funktion. Bewusst symbolgestützt:
 * ▲ steht für die Punktzahl, ⛓ für die längste Kette, ◈ für Prisma-Steine.
 */
export function buildShareText(state: GameState, options: ShareOptions = {}): string {
  const { locale = 'de-DE', link, labels = { endless: 'Endlos', zen: 'Zen' } } = options;
  const title =
    state.mode === 'daily' && state.puzzleNumber !== null
      ? `${SHARE_TITLE} #${state.puzzleNumber}`
      : `${SHARE_TITLE} · ${state.mode === 'zen' ? labels.zen : labels.endless}`;

  const lines: string[] = [title, ''];

  const grid = boardToEmoji(state.board);
  if (grid) lines.push(grid, '');

  const stats = [`▲ ${formatNumber(state.score, locale)}`];
  if (state.bestChain > 1) stats.push(`⛓ ×${state.bestChain}`);
  if (state.prismas > 0) stats.push(`◈ ${state.prismas}`);
  lines.push(stats.join('   '));

  if (link) lines.push('', link);
  return lines.join('\n');
}

/** Höchste erreichte Stufe als Emoji — für die Statistikansicht. */
export function levelEmoji(level: Level): string {
  return cellEmoji(level);
}
