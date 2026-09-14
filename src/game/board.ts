/**
 * Spielfeld-Operationen: Ablegen, Schwerkraft, Gruppensuche.
 *
 * Alle Funktionen sind seiteneffektfrei, sofern nicht anders vermerkt —
 * sie geben ein neues Spielfeld zurück, statt das übergebene zu verändern.
 */
import {
  Board,
  Cell,
  COLS,
  Level,
  MAX_LEVEL,
  MERGE_MIN,
  MergeGroup,
  Position,
  ROWS,
  levelGain,
} from './types';

export function createBoard(rows = ROWS, cols = COLS): Board {
  return Array.from({ length: rows }, () => Array<Cell>(cols).fill(0));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function inBounds(board: Board, row: number, col: number): boolean {
  return row >= 0 && row < board.length && col >= 0 && col < board[0].length;
}

/** Unterste freie Zeile einer Spalte, oder -1 wenn die Spalte voll ist. */
export function landingRow(board: Board, col: number): number {
  for (let row = board.length - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row;
  }
  return -1;
}

export function canDrop(board: Board, col: number): boolean {
  return landingRow(board, col) !== -1;
}

/** Wahr, wenn kein Stein mehr abgelegt werden kann — das Spielende. */
export function isFull(board: Board): boolean {
  for (let col = 0; col < board[0].length; col++) {
    if (canDrop(board, col)) return false;
  }
  return true;
}

/** Zahl der belegten Zellen. */
export function occupiedCount(board: Board): number {
  let n = 0;
  for (const row of board) for (const cell of row) if (cell !== 0) n++;
  return n;
}

/**
 * Legt einen Stein in einer Spalte ab. Gibt null zurück, wenn die Spalte
 * voll ist; der Aufrufer behandelt das als ungültigen Zug, nicht als Fehler.
 */
export function drop(
  board: Board,
  col: number,
  level: Level,
): { board: Board; landed: Position } | null {
  const row = landingRow(board, col);
  if (row === -1) return null;
  const next = cloneBoard(board);
  next[row][col] = level;
  return { board: next, landed: { row, col } };
}

/**
 * Lässt schwebende Steine nachrutschen. Nach einer Verschmelzung entstehen
 * Lücken — dieses Nachrutschen erzeugt die Kettenreaktionen, die den
 * Punktemotor des Spiels ausmachen.
 */
export function applyGravity(board: Board): Board {
  const rows = board.length;
  const cols = board[0].length;
  const next = createBoard(rows, cols);
  for (let col = 0; col < cols; col++) {
    let write = rows - 1;
    for (let row = rows - 1; row >= 0; row--) {
      const cell = board[row][col];
      if (cell !== 0) {
        next[write][col] = cell;
        write--;
      }
    }
  }
  return next;
}

/**
 * Findet alle zusammenhängenden Gruppen gleicher Stufe ab MERGE_MIN Steinen.
 * Verbunden heißt waagerecht oder senkrecht benachbart — nicht diagonal.
 *
 * `preferred` ist die Zelle, auf der der Spieler gerade abgelegt hat. Liegt
 * sie in einer Gruppe, erscheint der aufgestiegene Stein genau dort. Das
 * lässt die Verschmelzung dem Zug des Spielers folgen statt an einer
 * scheinbar willkürlichen Stelle zu passieren.
 */
export function findGroups(
  board: Board,
  preferred: Position | null = null,
  minSize = MERGE_MIN,
): MergeGroup[] {
  const rows = board.length;
  const cols = board[0].length;
  const seen = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
  const groups: MergeGroup[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const level = board[row][col];
      if (level === 0 || seen[row][col]) continue;

      // Breitensuche über alle gleichfarbigen Nachbarn.
      const cells: Position[] = [];
      const queue: Position[] = [{ row, col }];
      seen[row][col] = true;

      while (queue.length > 0) {
        const cur = queue.pop() as Position;
        cells.push(cur);
        const neighbours: Position[] = [
          { row: cur.row - 1, col: cur.col },
          { row: cur.row + 1, col: cur.col },
          { row: cur.row, col: cur.col - 1 },
          { row: cur.row, col: cur.col + 1 },
        ];
        for (const n of neighbours) {
          if (!inBounds(board, n.row, n.col)) continue;
          if (seen[n.row][n.col]) continue;
          if (board[n.row][n.col] !== level) continue;
          seen[n.row][n.col] = true;
          queue.push(n);
        }
      }

      if (cells.length >= minSize) {
        // Würde der Sprung über Violett hinausgehen, entsteht kein Stein,
        // sondern ein Prisma — markiert durch resultLevel === null.
        const target = (level as Level) + levelGain(cells.length);
        groups.push({
          level: level as Level,
          cells,
          anchor: pickAnchor(cells, preferred),
          resultLevel: target > MAX_LEVEL ? null : (target as Level),
        });
      }
    }
  }

  return groups;
}

/**
 * Zielzelle des aufgestiegenen Steins.
 *
 * Hat der Spieler gerade in diese Gruppe abgelegt, erscheint der neue Stein
 * genau dort — die Verschmelzung folgt sichtbar seinem Zug. Bei
 * Kettenreaktionen gibt es keinen solchen Zug; dann sackt die Gruppe in
 * ihren eigenen Schwerpunkt zusammen: tiefste Zeile, darin die Zelle am
 * nächsten zur Mitte der Gruppe. Das wirkt wie Zusammenfallen unter
 * Schwerkraft, während ein Sprung an den linken Rand willkürlich aussähe.
 */
function pickAnchor(cells: Position[], preferred: Position | null): Position {
  if (preferred) {
    for (const c of cells) {
      if (c.row === preferred.row && c.col === preferred.col) return c;
    }
  }

  let deepest = cells[0].row;
  for (const c of cells) if (c.row > deepest) deepest = c.row;

  let sum = 0;
  for (const c of cells) sum += c.col;
  const centre = sum / cells.length;

  let best: Position | null = null;
  let bestDistance = Infinity;
  for (const c of cells) {
    if (c.row !== deepest) continue;
    const distance = Math.abs(c.col - centre);
    // Bei exaktem Gleichstand die linkere Zelle — damit das Ergebnis
    // deterministisch bleibt, was das Tagesrätsel zwingend braucht.
    if (distance < bestDistance || (distance === bestDistance && best && c.col < best.col)) {
      bestDistance = distance;
      best = c;
    }
  }
  return best ?? cells[0];
}

/** Die acht Nachbarzellen inklusive Diagonalen — Radius einer Prisma-Explosion. */
export function neighbours8(board: Board, pos: Position): Position[] {
  const out: Position[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const row = pos.row + dr;
      const col = pos.col + dc;
      if (inBounds(board, row, col)) out.push({ row, col });
    }
  }
  return out;
}

/** Höchste auf dem Feld liegende Stufe, 0 bei leerem Feld. */
export function highestOnBoard(board: Board): number {
  let max = 0;
  for (const row of board) for (const cell of row) if (cell > max) max = cell;
  return max;
}
