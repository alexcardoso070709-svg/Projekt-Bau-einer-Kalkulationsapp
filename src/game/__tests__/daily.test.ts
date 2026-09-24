import { dateForPuzzle, dateKey, msUntilNextPuzzle, puzzleNumber, seedForPuzzle } from '../daily';
import { createGame, playMove } from '../engine';
import { Rng, hashString } from '../rng';
import { COLS } from '../types';

describe('Tagesrätsel-Nummer', () => {
  it('beginnt am Stichtag bei eins', () => {
    expect(puzzleNumber(new Date(2026, 0, 1))).toBe(1);
  });

  it('zählt Tag für Tag hoch', () => {
    expect(puzzleNumber(new Date(2026, 0, 2))).toBe(2);
    expect(puzzleNumber(new Date(2026, 1, 1))).toBe(32);
  });

  it('ändert sich innerhalb eines Tages nicht', () => {
    const morgens = puzzleNumber(new Date(2026, 5, 15, 0, 1));
    const nachts = puzzleNumber(new Date(2026, 5, 15, 23, 59));
    expect(morgens).toBe(nachts);
  });

  it('übersteht die Sommerzeitumstellung ohne Sprung', () => {
    // Ende März wird in Europa die Uhr umgestellt; die Zählung darf das
    // nicht mitbekommen, weil sie über lokale Mitternacht rechnet.
    const davor = puzzleNumber(new Date(2026, 2, 28, 12));
    expect(puzzleNumber(new Date(2026, 2, 29, 12))).toBe(davor + 1);
    expect(puzzleNumber(new Date(2026, 2, 30, 12))).toBe(davor + 2);
  });

  it('bildet den Tagesschlüssel mit führenden Nullen', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('zählt bis zur nächsten lokalen Mitternacht herunter', () => {
    const ms = msUntilNextPuzzle(new Date(2026, 5, 15, 23, 0, 0));
    expect(ms).toBe(60 * 60 * 1000);
  });
});

describe('Determinismus des Tagesrätsels', () => {
  it('liefert für dieselbe Nummer denselben Seed', () => {
    expect(seedForPuzzle(247)).toBe(seedForPuzzle(247));
  });

  it('liefert für verschiedene Tage verschiedene Seeds', () => {
    const seeds = new Set<number>();
    for (let n = 1; n <= 500; n++) seeds.add(seedForPuzzle(n));
    expect(seeds.size).toBe(500);
  });

  it('erzeugt weltweit dieselbe Steinabfolge', () => {
    // Das ist das Kernversprechen: Zwei Geräte, die am selben Tag spielen,
    // müssen bei gleichen Zügen exakt dasselbe Ergebnis bekommen.
    const tag = new Date(2026, 8, 14);
    const spielA = createGame({ mode: 'daily', date: tag });
    const spielB = createGame({ mode: 'daily', date: tag });

    let a = spielA;
    let b = spielB;
    const zuege = [0, 1, 2, 3, 4, 2, 2, 1, 0, 3, 4, 4, 1, 0, 2, 3, 1, 2, 0, 4];
    for (const zug of zuege) {
      const na = playMove(a, zug);
      const nb = playMove(b, zug);
      expect(na === null).toBe(nb === null);
      if (!na || !nb) break;
      a = na.state;
      b = nb.state;
      expect(a.board).toEqual(b.board);
      expect(a.score).toBe(b.score);
      expect(a.queue).toEqual(b.queue);
    }
    expect(a.moves).toBeGreaterThan(0);
  });

  it('erzeugt an verschiedenen Tagen verschiedene Spielfelder', () => {
    const heute = createGame({ mode: 'daily', date: new Date(2026, 8, 14) });
    const morgen = createGame({ mode: 'daily', date: new Date(2026, 8, 15) });
    expect(heute.puzzleNumber).not.toBe(morgen.puzzleNumber);
    expect(heute.seed).not.toBe(morgen.seed);
  });
});

describe('Zufallsgenerator', () => {
  it('liefert bei gleichem Seed die gleiche Folge', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('lässt sich exakt auf einen gespeicherten Stand zurücksetzen', () => {
    // Dadurch kann ein unterbrochenes Spiel fortgesetzt werden, ohne dass
    // sich die kommenden Steine ändern.
    const original = new Rng(777);
    const werte = Array.from({ length: 25 }, () => original.next());
    const fortgesetzt = new Rng(777, 25);
    expect(fortgesetzt.calls).toBe(25);
    expect(fortgesetzt.next()).not.toBe(werte[0]);

    const wiederholt = new Rng(777, 10);
    expect(wiederholt.next()).toBe(werte[10]);
  });

  it('bleibt im Bereich zwischen null und eins', () => {
    const rng = new Rng(4242);
    for (let i = 0; i < 5000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('verteilt gewichtete Ziehungen im erwarteten Verhältnis', () => {
    const rng = new Rng(2024);
    const treffer = [0, 0];
    for (let i = 0; i < 20000; i++) treffer[rng.weighted([75, 25])]++;
    const anteil = treffer[0] / 20000;
    expect(anteil).toBeGreaterThan(0.72);
    expect(anteil).toBeLessThan(0.78);
  });

  it('streut Streuwerte ähnlicher Zeichenketten weit auseinander', () => {
    expect(hashString('prisma-daily-v1-1')).not.toBe(hashString('prisma-daily-v1-2'));
  });

  it('deckt bei wiederholtem Spiel alle Spalten ab', () => {
    let game = createGame({ mode: 'endless', seed: 31337 });
    const belegt = new Set<number>();
    for (let i = 0; i < 30 && !game.over; i++) {
      const col = i % COLS;
      const out = playMove(game, col);
      if (!out) continue;
      belegt.add(col);
      game = out.state;
    }
    expect(belegt.size).toBe(COLS);
  });
});

describe('Rätselnummer in allen Zeitzonen', () => {
  const ZONEN = ['Europe/Berlin', 'America/New_York', 'Australia/Sydney', 'Asia/Kolkata', 'UTC'];
  const vorher = process.env.TZ;
  afterAll(() => {
    process.env.TZ = vorher;
  });

  it.each(ZONEN)('zählt in %s jeden Tag genau einmal, auch über die Zeitumstellung', (zone) => {
    process.env.TZ = zone;
    // Zwei volle Jahre, zu drei Tageszeiten: kurz nach Mitternacht, mittags,
    // kurz vor Mitternacht. Jeder Kalendertag muss genau eine Nummer haben,
    // lückenlos und ohne Doppelung.
    for (let t = 0; t < 730; t++) {
      for (const stunde of [0, 12, 23]) {
        const d = new Date(2026, 0, 1 + t, stunde, stunde === 0 ? 5 : 55);
        expect({ zone, tag: t, n: puzzleNumber(d) }).toEqual({ zone, tag: t, n: t + 1 });
      }
      expect(puzzleNumber(dateForPuzzle(t + 1))).toBe(t + 1);
    }
  });
});
