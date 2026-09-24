import { SHARE_TITLE } from '../../brand';
import { boardToEmoji, buildShareText, cellEmoji, formatNumber } from '../share';
import { createGame } from '../engine';
import { GameState } from '../types';
import { boardFrom } from './helpers';

describe('Emoji-Raster', () => {
  it('übersetzt jede Stufe in ein eigenes Emoji', () => {
    const alle = [0, 1, 2, 3, 4, 5].map(cellEmoji);
    expect(new Set(alle).size).toBe(6);
  });

  it('schneidet leere Zeilen am oberen Rand ab', () => {
    const grid = boardToEmoji(boardFrom(['.....', '..1..']));
    expect(grid.split('\n')).toHaveLength(1);
    expect(grid).toBe('⬛⬛🟥⬛⬛');
  });

  it('gibt bei leerem Feld nichts aus', () => {
    expect(boardToEmoji(boardFrom(['.....']))).toBe('');
  });

  it('behält leere Zeilen innerhalb des Feldes', () => {
    const grid = boardToEmoji(boardFrom(['1....', '.....', '....2']));
    expect(grid.split('\n')).toHaveLength(3);
  });
});

describe('Teilen-Text', () => {
  const beispiel = (over: Partial<GameState> = {}): GameState => ({
    ...createGame({ mode: 'daily', date: new Date(2026, 8, 14) }),
    board: boardFrom(['..1..', '.123.']),
    score: 24680,
    bestChain: 7,
    prismas: 2,
    ...over,
  });

  it('nennt die Rätselnummer, verrät aber nichts über die Lösung', () => {
    const text = buildShareText(beispiel());
    expect(text).toContain(`${SHARE_TITLE} #`);
    expect(text).toMatch(/▲ 24\.680/);
    expect(text).toContain('⛓ ×7');
    expect(text).toContain('◈ 2');
  });

  it('lässt Kette und Prisma weg, wenn es nichts zu zeigen gibt', () => {
    const text = buildShareText(beispiel({ bestChain: 1, prismas: 0 }));
    expect(text).not.toContain('⛓');
    expect(text).not.toContain('◈');
  });

  it('übersetzt den Modus im geteilten Text', () => {
    const text = buildShareText(beispiel({ mode: 'endless', puzzleNumber: null }), {
      labels: { endless: 'Endless', zen: 'Zen' },
    });
    expect(text).toContain('Endless');
    expect(text).not.toContain('Endlos');
  });

  it('unterscheidet die Spielmodi in der Überschrift', () => {
    expect(buildShareText(beispiel({ mode: 'endless', puzzleNumber: null }))).toContain('Endlos');
    expect(buildShareText(beispiel({ mode: 'zen', puzzleNumber: null }))).toContain('Zen');
  });

  it('hängt den Store-Link nur an, wenn einer übergeben wird', () => {
    expect(buildShareText(beispiel())).not.toContain('http');
    expect(buildShareText(beispiel(), { link: 'https://prisma.app' })).toContain('https://prisma.app');
  });

  it('besteht bis auf Zahlen und Titel nur aus Symbolen', () => {
    // Sprachfrei heißt: der Text funktioniert ohne Übersetzung in jedem Markt.
    const text = buildShareText(beispiel());
    const buchstaben = text.split(SHARE_TITLE).join('').match(/[a-zA-ZäöüÄÖÜß]/g);
    expect(buchstaben).toBeNull();
  });
});

describe('Zahlenformat', () => {
  it('setzt Tausenderpunkte', () => {
    expect(formatNumber(1234567, 'de-DE')).toBe('1.234.567');
  });

  it('lässt kleine Zahlen unverändert', () => {
    expect(formatNumber(42, 'de-DE')).toBe('42');
  });
});
