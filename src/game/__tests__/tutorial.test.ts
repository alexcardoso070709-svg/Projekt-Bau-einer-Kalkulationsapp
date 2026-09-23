import { occupiedCount } from '../board';
import { playMove } from '../engine';
import { TUTORIAL, tutorialGame } from '../tutorial';
import { COLS } from '../types';

describe('Tutorial', () => {
  it('hat genau drei Schritte in der richtigen Reihenfolge', () => {
    expect(TUTORIAL.map((s) => s.lesson)).toEqual(['merge', 'chain', 'prisma']);
  });

  it('bringt im ersten Schritt das Verschmelzen bei', () => {
    const out = playMove(tutorialGame(TUTORIAL[0]), TUTORIAL[0].target)!;
    expect(out.result.chain).toBe(1);
    expect(out.result.prismas).toBe(0);
  });

  it('löst im zweiten Schritt eine Kette aus', () => {
    const out = playMove(tutorialGame(TUTORIAL[1]), TUTORIAL[1].target)!;
    expect(out.result.chain).toBeGreaterThanOrEqual(2);
  });

  it('zündet im dritten Schritt ein Prisma und leert das Feld', () => {
    const out = playMove(tutorialGame(TUTORIAL[2]), TUTORIAL[2].target)!;
    expect(out.result.prismas).toBe(1);
    expect(occupiedCount(out.state.board)).toBe(0);
  });

  it('führt in jedem Schritt nur über die markierte Spalte zum Ziel', () => {
    // Sonst könnte ein Spieler zufällig richtig liegen, ohne auf den Hinweis
    // zu achten — und lernt nicht, dass der Hinweis etwas bedeutet.
    TUTORIAL.forEach((step) => {
      for (let c = 0; c < COLS; c++) {
        if (c === step.target) continue;
        const out = playMove(tutorialGame(step), c);
        if (!out) continue;
        const erreicht =
          step.lesson === 'merge' ? out.result.chain >= 1
          : step.lesson === 'chain' ? out.result.chain >= 2
          : out.result.prismas >= 1;
        expect({ spalte: c, lektion: step.lesson, erreicht }).toEqual({
          spalte: c, lektion: step.lesson, erreicht: false,
        });
      }
    });
  });

  it('kann nicht verloren werden', () => {
    TUTORIAL.forEach((step) => {
      const game = tutorialGame(step);
      expect(game.mode).toBe('zen');
      expect(game.moveLimit).toBeNull();
    });
  });
});

describe('Tutorial-Felder', () => {
  it('enthalten keine schwebenden Steine', () => {
    // Ein Stein über einer Lücke wäre physikalisch unmöglich und würde beim
    // ersten Zug unerwartet absacken.
    TUTORIAL.forEach((step) => {
      for (let c = 0; c < COLS; c++) {
        let luecke = false;
        for (let r = step.board.length - 1; r >= 0; r--) {
          if (step.board[r][c] === 0) luecke = true;
          else expect({ lektion: step.lesson, spalte: c, schwebt: luecke }).toEqual({
            lektion: step.lesson, spalte: c, schwebt: false,
          });
        }
      }
    });
  });
});
