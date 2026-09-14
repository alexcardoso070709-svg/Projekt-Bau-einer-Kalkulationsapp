/**
 * Testhilfen: Spielfelder aus Textzeilen bauen, damit Tests lesbar bleiben.
 * '.' steht für eine leere Zelle, '1'-'7' für die jeweilige Stufe.
 * Fehlende Zeilen werden oben mit Leerzeilen aufgefüllt.
 */
import { createBoard } from '../board';
import { Board, Cell, COLS, ROWS } from '../types';

export function boardFrom(rows: string[]): Board {
  const board = createBoard();
  const offset = ROWS - rows.length;
  if (offset < 0) throw new Error(`Zu viele Zeilen: ${rows.length} > ${ROWS}`);
  rows.forEach((line, i) => {
    const cells = line.replace(/\s/g, '');
    if (cells.length !== COLS) {
      throw new Error(`Zeile "${line}" hat ${cells.length} Spalten, erwartet ${COLS}`);
    }
    for (let col = 0; col < COLS; col++) {
      const ch = cells[col];
      board[offset + i][col] = (ch === '.' ? 0 : Number(ch)) as Cell;
    }
  });
  return board;
}

/** Gegenstück zu boardFrom — für aussagekräftige Fehlermeldungen. */
export function boardToRows(board: Board): string[] {
  return board.map((row) => row.map((c) => (c === 0 ? '.' : String(c))).join(''));
}
