import {
  applyGravity,
  canDrop,
  drop,
  findGroups,
  isFull,
  landingRow,
  occupiedCount,
} from '../board';
import { ROWS } from '../types';
import { boardFrom, boardToRows } from './helpers';

describe('Ablegen und Schwerkraft', () => {
  it('legt einen Stein auf der untersten freien Zeile ab', () => {
    const board = boardFrom(['.....', '..1..']);
    const result = drop(board, 2, 3);
    expect(result).not.toBeNull();
    expect(result!.landed).toEqual({ row: ROWS - 2, col: 2 });
    expect(boardToRows(result!.board).slice(-2)).toEqual(['..3..', '..1..']);
  });

  it('lässt eine leere Spalte bis ganz nach unten fallen', () => {
    const result = drop(boardFrom(['.....']), 0, 1);
    expect(result!.landed.row).toBe(ROWS - 1);
  });

  it('meldet eine volle Spalte statt einen Fehler zu werfen', () => {
    const full = boardFrom(Array(ROWS).fill('1....'));
    expect(canDrop(full, 0)).toBe(false);
    expect(drop(full, 0, 1)).toBeNull();
    expect(landingRow(full, 1)).toBe(ROWS - 1);
  });

  it('lässt schwebende Steine nachrutschen', () => {
    const board = boardFrom(['1....', '.....', '.....']);
    const settled = applyGravity(board);
    expect(boardToRows(settled).slice(-1)).toEqual(['1....']);
    expect(occupiedCount(settled)).toBe(1);
  });

  it('erkennt ein vollständig belegtes Feld', () => {
    expect(isFull(boardFrom(Array(ROWS).fill('11111')))).toBe(true);
    expect(isFull(boardFrom(Array(ROWS - 1).fill('11111')))).toBe(false);
  });
});

describe('Gruppensuche', () => {
  it('findet drei waagerecht benachbarte Steine', () => {
    const groups = findGroups(boardFrom(['111..']));
    expect(groups).toHaveLength(1);
    expect(groups[0].level).toBe(1);
    expect(groups[0].cells).toHaveLength(3);
  });

  it('findet drei senkrecht benachbarte Steine', () => {
    const groups = findGroups(boardFrom(['2....', '2....', '2....']));
    expect(groups).toHaveLength(1);
    expect(groups[0].cells).toHaveLength(3);
  });

  it('erfasst auch abgewinkelte Formen als eine Gruppe', () => {
    const groups = findGroups(boardFrom(['3....', '333..']));
    expect(groups).toHaveLength(1);
    expect(groups[0].cells).toHaveLength(4);
  });

  it('ignoriert Paare — erst ab drei wird verschmolzen', () => {
    expect(findGroups(boardFrom(['11...']))).toHaveLength(0);
  });

  it('verbindet nicht über die Diagonale', () => {
    expect(findGroups(boardFrom(['1....', '.1...', '..1..']))).toHaveLength(0);
  });

  it('trennt Gruppen unterschiedlicher Stufen', () => {
    const groups = findGroups(boardFrom(['111..', '222..']));
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.level).sort()).toEqual([1, 2]);
  });

  it('setzt den aufgestiegenen Stein auf die Zelle des Spielers', () => {
    const board = boardFrom(['111..']);
    const played = { row: ROWS - 1, col: 0 };
    expect(findGroups(board, played)[0].anchor).toEqual(played);
  });

  it('nimmt ohne Spielerzug die tiefste Zelle als Ziel', () => {
    // Senkrechte Dreiergruppe: der aufgestiegene Stein sackt nach unten.
    const groups = findGroups(boardFrom(['4....', '4....', '4....']));
    expect(groups[0].anchor).toEqual({ row: ROWS - 1, col: 0 });
  });
});
