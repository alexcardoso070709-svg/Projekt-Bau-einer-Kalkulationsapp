import {
  DAILY_MOVES,
  createGame,
  playMove,
  resolve,
  spawnWeights,
  suggestColumn,
} from '../engine';
import { occupiedCount } from '../board';
import { COLS, Level, ROWS } from '../types';
import { boardFrom, boardToRows } from './helpers';

describe('Verschmelzen', () => {
  it('macht aus drei Steinen einen der nächsten Stufe', () => {
    const out = resolve(boardFrom(['111..']), { row: ROWS - 1, col: 0 });
    expect(boardToRows(out.board).slice(-1)).toEqual(['2....']);
    expect(out.chain).toBe(1);
  });

  it('verschmilzt auch Gruppen über drei Steinen zu genau einem', () => {
    const out = resolve(boardFrom(['11111']), null);
    expect(occupiedCount(out.board)).toBe(1);
  });

  it('rechnet Punkte nach Gruppengröße und Stufe', () => {
    // 3 Steine × Stufe 1 × 10 Punkte × Kettenfaktor 1
    expect(resolve(boardFrom(['111..']), null).points).toBe(30);
    // Dieselbe Gruppengröße auf Stufe 3 ist dreimal so viel wert.
    expect(resolve(boardFrom(['333..']), null).points).toBe(90);
  });

  it('lässt Verschmelzungen Ketten auslösen', () => {
    // Ausgangslage nach dem Ablegen: Der dritte Einser in der Grundreihe
    // vervollständigt eine Dreiergruppe. Der daraus entstehende Zweier trifft
    // nach dem Nachrutschen auf die beiden Zweier darüber — Kette.
    const out = resolve(boardFrom(['22...', '111..']), { row: ROWS - 1, col: 2 });

    expect(out.chain).toBe(2);
    // Der Kettenstein sackt in den Schwerpunkt seiner Gruppe, nicht an den Rand.
    expect(boardToRows(out.board).slice(-1)).toEqual(['.3...']);
    // Kette 1: 3×1×10 ×1 = 30. Kette 2: 3×2×10 ×2 = 120. Zusammen 150.
    expect(out.points).toBe(150);
  });

  it('belohnt eine Kette stärker als zwei einzelne Verschmelzungen', () => {
    // Genau darin liegt der Reiz: Wer Ketten plant, spielt nicht doppelt so
    // gut, sondern um ein Vielfaches besser.
    const einzeln = resolve(boardFrom(['111..']), null);
    const kette = resolve(boardFrom(['22...', '111..']), { row: ROWS - 1, col: 2 });

    expect(kette.chain).toBeGreaterThan(einzeln.chain);
    expect(kette.points).toBeGreaterThan(einzeln.points * 2);
  });
});

describe('Prisma', () => {
  it('zündet, wenn der Aufstieg über die höchste Farbe hinausginge', () => {
    // Drei blaue Steine unten, darüber ein Stein im Explosionsradius.
    const out = resolve(boardFrom(['3....', '555..']), null);
    expect(out.prismas).toBe(1);
    // Die blaue Gruppe und ihr Nachbar sind beide verschwunden.
    expect(occupiedCount(out.board)).toBe(0);
    // 3×5×10 = 150 Grundpunkte plus 3×400 Prisma-Bonus.
    expect(out.points).toBe(150 + 1200);
  });

  it('lohnt sich weit mehr als eine gewöhnliche Verschmelzung', () => {
    // Prisma muss sich wie ein Höhepunkt anfühlen, nicht wie ein Nebeneffekt.
    const gewoehnlich = resolve(boardFrom(['444..']), null).points;
    const prisma = resolve(boardFrom(['555..']), null).points;
    expect(prisma).toBeGreaterThan(gewoehnlich * 5);
  });

  it('hinterlässt keinen Stein und steigt nicht weiter auf', () => {
    const out = resolve(boardFrom(['555..']), null);
    expect(occupiedCount(out.board)).toBe(0);
    for (const row of out.board) {
      for (const cell of row) expect(cell).toBeLessThanOrEqual(5);
    }
  });

  it('räumt nur die Umgebung, nicht das halbe Feld', () => {
    // Der Stein ganz rechts steht zwei Spalten neben der Gruppe, also außerhalb
    // des Radius — er muss die Explosion überstehen.
    const out = resolve(boardFrom(['555.2']), null);
    expect(occupiedCount(out.board)).toBe(1);
  });

  it('entsteht auch aus einer großen Gruppe niedriger Farbe', () => {
    // Fünf grüne Steine springen zwei Stufen — das geht über Blau hinaus und
    // zündet ebenfalls. Es führen also mehrere Wege zum Höhepunkt.
    const out = resolve(boardFrom(['44444']), null);
    expect(out.prismas).toBe(1);
    expect(occupiedCount(out.board)).toBe(0);
  });
});

describe('Spielablauf', () => {
  it('startet mit vollständiger Vorschau und leerem Feld', () => {
    const game = createGame({ mode: 'endless', seed: 42 });
    expect(game.queue).toHaveLength(3);
    expect(occupiedCount(game.board)).toBe(0);
    expect(game.score).toBe(0);
    expect(game.over).toBe(false);
  });

  it('rückt die Vorschau nach jedem Zug nach', () => {
    const game = createGame({ mode: 'endless', seed: 7 });
    const upcoming = game.queue[1];
    const next = playMove(game, 0)!;
    expect(next.state.queue[0]).toBe(upcoming);
    expect(next.state.queue).toHaveLength(3);
    expect(next.state.moves).toBe(1);
  });

  it('weist Züge auf volle Spalten zurück, ohne das Spiel zu beenden', () => {
    let game = createGame({ mode: 'endless', seed: 3 });
    // Eine Spalte auffüllen, ohne dass etwas verschmilzt.
    game = { ...game, board: boardFrom(Array(ROWS).fill('1....')) };
    expect(playMove(game, 0)).toBeNull();
    expect(game.over).toBe(false);
  });

  it('beendet das Spiel, wenn kein Zug mehr möglich ist', () => {
    // Schachbrettmuster: nichts verschmilzt, das Feld läuft zwangsläufig voll.
    const rows = Array.from({ length: ROWS }, (_, i) =>
      i % 2 === 0 ? '12121' : '21212',
    );
    const nearlyFull = boardFrom(rows);
    nearlyFull[0][4] = 0;
    // Steinfolge festlegen: Die Eins hat an dieser Stelle keine gleichfarbigen
    // Nachbarn, verschmilzt also nicht und schafft keinen neuen Platz.
    const game = {
      ...createGame({ mode: 'endless', seed: 5 }),
      board: nearlyFull,
      queue: [1, 1, 1] as Level[],
    };
    const out = playMove(game, 4)!;
    expect(out.state.over).toBe(true);
  });

  it('beendet im Zen-Modus nie, sondern räumt die oberste Reihe', () => {
    const rows = Array.from({ length: ROWS }, (_, i) =>
      i % 2 === 0 ? '12121' : '21212',
    );
    const nearlyFull = boardFrom(rows);
    nearlyFull[0][4] = 0;
    const game = {
      ...createGame({ mode: 'zen', seed: 5 }),
      board: nearlyFull,
      queue: [1, 1, 1] as Level[],
    };
    const out = playMove(game, 4)!;
    expect(out.state.over).toBe(false);
    expect(occupiedCount(out.state.board)).toBeLessThan(ROWS * COLS);
  });

  it('merkt sich die längste Kette und die höchste Stufe über das Spiel', () => {
    let game = createGame({ mode: 'endless', seed: 11 });
    for (let i = 0; i < 40 && !game.over; i++) {
      const out = playMove(game, i % COLS);
      if (out) game = out.state;
    }
    expect(game.bestChain).toBeGreaterThanOrEqual(1);
    expect(game.highestLevel).toBeGreaterThanOrEqual(2);
    expect(game.score).toBeGreaterThan(0);
  });
});

describe('Steinverteilung', () => {
  it('beginnt mit zwei Stufen und führt später höhere ein', () => {
    expect(spawnWeights(0)).toHaveLength(2);
    expect(spawnWeights(60).length).toBeGreaterThan(spawnWeights(0).length);
  });

  it('gewichtet niedrige Stufen immer stärker als hohe', () => {
    for (const moves of [0, 30, 60, 120]) {
      const weights = spawnWeights(moves);
      for (let i = 1; i < weights.length; i++) {
        expect(weights[i]).toBeLessThan(weights[i - 1]);
      }
    }
  });

  it('erzeugt nie einen Stein oberhalb der vierten Stufe', () => {
    let game = createGame({ mode: 'endless', seed: 99 });
    const seen = new Set<Level>();
    for (let i = 0; i < 200 && !game.over; i++) {
      game.queue.forEach((l) => seen.add(l));
      const out = playMove(game, i % COLS);
      if (!out) break;
      game = out.state;
    }
    for (const level of seen) expect(level).toBeLessThanOrEqual(4);
  });
});

describe('Hinweis', () => {
  it('schlägt die Spalte mit dem besten Ertrag vor', () => {
    const game = {
      ...createGame({ mode: 'zen', seed: 1 }),
      board: boardFrom(['1.1..']),
      queue: [1, 1, 1] as Level[],
    };
    // Nur Spalte 1 schließt die Lücke zu einer Dreiergruppe. Jede andere
    // Spalte stapelt bloß einen zweiten Stein auf einen bestehenden.
    expect(suggestColumn(game)).toBe(1);
  });

  it('gibt null zurück, wenn kein Zug möglich ist', () => {
    const game = {
      ...createGame({ mode: 'endless', seed: 1 }),
      board: boardFrom(Array(ROWS).fill('12121')),
    };
    expect(suggestColumn(game)).toBeNull();
  });
});

describe('Zugbegrenzung im Tagesrätsel', () => {
  it('endet nach der festgelegten Zugzahl', () => {
    let game = createGame({ mode: 'daily', date: new Date(2026, 8, 14) });
    expect(game.moveLimit).toBe(DAILY_MOVES);

    let played = 0;
    for (let i = 0; i < 500 && !game.over; i++) {
      const out = playMove(game, i % COLS);
      if (!out) continue;
      game = out.state;
      played++;
    }
    expect(game.over).toBe(true);
    expect(played).toBeLessThanOrEqual(DAILY_MOVES);
  });

  it('lässt Endlos- und Zen-Spiele unbegrenzt laufen', () => {
    expect(createGame({ mode: 'endless', seed: 1 }).moveLimit).toBeNull();
    expect(createGame({ mode: 'zen', seed: 1 }).moveLimit).toBeNull();
  });

  it('gibt allen Spielern dieselbe Ausgangslage — gleiche Steine, gleiche Zugzahl', () => {
    const tag = new Date(2026, 8, 14);
    const a = createGame({ mode: 'daily', date: tag });
    const b = createGame({ mode: 'daily', date: tag });
    expect(a.moveLimit).toBe(b.moveLimit);
    expect(a.seed).toBe(b.seed);
    expect(a.queue).toEqual(b.queue);
  });
});

describe('Tipp ohne punktbringenden Zug', () => {
  it('legt den Stein neben seinesgleichen statt in die erste Spalte', () => {
    const game = {
      ...createGame({ mode: 'zen', seed: 1 }),
      board: boardFrom(['2..3.']),
      queue: [3, 1, 1] as Level[],
    };
    // Nichts verschmilzt, aber Spalte 3 und 5 liegen neben der Drei; die
    // Drei selbst zu überdecken (Spalte 4) bereitet nichts vor.
    expect([2, 4]).toContain(suggestColumn(game));
  });

  it('bevorzugt bei völligem Gleichstand den niedrigsten Stapel', () => {
    const game = {
      ...createGame({ mode: 'zen', seed: 1 }),
      board: boardFrom(['4....', '4....', '5....']),
      queue: [1, 1, 1] as Level[],
    };
    expect(suggestColumn(game)).not.toBe(0);
  });
});
