/**
 * Das wortlose Tutorial: drei geskriptete Züge.
 *
 * Ein sprachfreies Spiel kann seine Regeln nicht erklären, es muss sie
 * zeigen. Jeder Schritt ist ein vorbereitetes Feld mit genau einer Spalte,
 * die zum Ziel führt — ein pochender Ring zeigt sie an. Der Spieler lernt
 * durch Tun statt durch Lesen, und nach drei Zügen hat er alles gesehen,
 * was das Spiel ausmacht: Verschmelzen, Kette, Prisma.
 */
import { createBoard } from './board';
import { Board, Cell, GameState, Level } from './types';

export interface TutorialStep {
  /** Was dieser Schritt beibringt — nur für Tests und Lesbarkeit des Codes. */
  lesson: 'merge' | 'chain' | 'prisma';
  board: Board;
  queue: Level[];
  /** Die eine Spalte, die zum Ziel führt. */
  target: number;
}

/** Baut ein Feld aus Textzeilen von unten her auf ('.' = leer). */
function feld(zeilen: string[]): Board {
  const board = createBoard();
  const versatz = board.length - zeilen.length;
  zeilen.forEach((zeile, i) => {
    [...zeile].forEach((z, c) => {
      board[versatz + i][c] = (z === '.' ? 0 : Number(z)) as Cell;
    });
  });
  return board;
}

export const TUTORIAL: TutorialStep[] = [
  {
    // Zwei rote Steine mit einer Lücke dazwischen: Nur wer genau die Lücke
    // füllt, bringt drei zusammen. Jede andere Spalte ergibt bloß ein Paar.
    lesson: 'merge',
    board: feld(['.1.1.']),
    queue: [1, 2, 1],
    target: 2,
  },
  {
    // Das entstehende Orange fällt neben zwei weitere — eine Kette.
    lesson: 'chain',
    board: feld(['22...', '11...']),
    queue: [1, 1, 2],
    target: 2,
  },
  {
    // Zwei Blaue mit einer Lücke: Weiter als Blau geht es nicht, also zündet
    // ein Prisma und reißt alles ringsum mit. Das Feld ist danach leer — ein
    // sichtbarer Schlusspunkt. Jeder Stein liegt auf, nichts schwebt.
    lesson: 'prisma',
    board: feld(['3...2', '15.51']),
    queue: [5, 1, 1],
    target: 2,
  },
];

/** Spielzustand für einen Tutorial-Schritt. Zen-Modus: Es gibt kein Verlieren. */
export function tutorialGame(step: TutorialStep): GameState {
  return {
    mode: 'zen',
    moveLimit: null,
    board: step.board.map((r) => r.slice()),
    queue: step.queue.slice(),
    score: 0,
    bestChain: 0,
    highestLevel: 1,
    prismas: 0,
    moves: 0,
    over: false,
    puzzleNumber: null,
    seed: 1,
    rngCalls: 0,
  };
}
