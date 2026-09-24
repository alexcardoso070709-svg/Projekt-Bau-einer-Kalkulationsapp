/**
 * PRISMA — Spiellogik.
 *
 * Ein Zug besteht aus: Stein ablegen, verschmelzen, nachrutschen lassen,
 * erneut prüfen. Die Schleife aus Verschmelzung und Nachrutschen erzeugt
 * die Kettenreaktionen, die den Reiz des Spiels ausmachen — und weil jeder
 * Schritt einzeln zurückgegeben wird, kann die Oberfläche sie nacheinander
 * abspielen, statt das Ergebnis nur hinzuschnippen.
 */
import {
  applyGravity,
  cloneBoard,
  createBoard,
  drop,
  findGroups,
  isFull,
  neighbours8,
} from './board';
import { puzzleNumber, randomSeed, seedForPuzzle } from './daily';
import { Rng } from './rng';
import {
  Board,
  GameState,
  Level,
  Mode,
  MoveResult,
  Position,
  ResolutionStep,
  levelGain,
} from './types';

/** Wie viele Steine im Voraus sichtbar sind: der aktuelle plus zwei. */
export const QUEUE_SIZE = 3;

/** Punkte je Stein einer verschmelzenden Gruppe, mit der Stufe gewichtet. */
const POINTS_PER_STONE = 10;
/** Zusatzpunkte je Stein einer Prisma-Explosion. */
const PRISMA_BONUS_PER_STONE = 400;

/**
 * Anzahl Züge im Tagesrätsel. Alle spielen dieselben Steine in derselben
 * Reihenfolge — die Frage ist nur, wer mehr daraus macht.
 *
 * 90 Züge sind bewusst gewählt: Bei 60 reichte die anfallende Spielmasse
 * nicht aus, um je ein Prisma zu zünden; der Höhepunkt des Spiels kam in
 * der Messung an 98 von 100 Tagen überhaupt nicht vor. Bei rund zwei
 * Sekunden pro Zug bleibt eine Partie damit unter drei Minuten.
 */
export const DAILY_MOVES = 90;

/**
 * Wahrscheinlichkeiten der nachrückenden Steine. Zu Beginn nur die beiden
 * untersten Stufen, damit sofort etwas passiert; mit wachsender Zugzahl
 * kommen höhere Stufen dazu. So steigt der Anspruch mit der Zeit, ohne dass
 * ein Timer Druck erzeugen muss.
 *
 * Die Kurve ist bewusst steil: In einer früheren Fassung stieg sie so träge
 * an, dass sich das Feld schneller leerte als es sich füllte und Partien
 * über 200 Züge liefen.
 */
export function spawnWeights(moves: number): number[] {
  if (moves < 12) return [58, 42];
  if (moves < 30) return [44, 34, 22];
  if (moves < 55) return [36, 30, 22, 12];
  return [30, 28, 24, 18];
}

function spawnLevel(rng: Rng, moves: number): Level {
  return (rng.weighted(spawnWeights(moves)) + 1) as Level;
}

/** Füllt die Vorschau auf, ohne bereits gezogene Steine zu verändern. */
function fillQueue(queue: Level[], rng: Rng, moves: number): Level[] {
  const next = queue.slice();
  while (next.length < QUEUE_SIZE) {
    next.push(spawnLevel(rng, moves + next.length));
  }
  return next;
}

export interface NewGameOptions {
  mode: Mode;
  /** Nur für das Tagesrätsel; sonst wird ein Zufalls-Seed gezogen. */
  date?: Date;
  /** Erzwingt einen bestimmten Seed — vor allem für Tests. */
  seed?: number;
}

export function createGame(options: NewGameOptions): GameState {
  const { mode } = options;
  let seed: number;
  let puzzle: number | null = null;

  if (options.seed !== undefined) {
    seed = options.seed >>> 0;
    if (mode === 'daily') puzzle = puzzleNumber(options.date ?? new Date());
  } else if (mode === 'daily') {
    puzzle = puzzleNumber(options.date ?? new Date());
    seed = seedForPuzzle(puzzle);
  } else {
    seed = randomSeed();
  }

  const rng = new Rng(seed);
  const queue = fillQueue([], rng, 0);

  return {
    mode,
    moveLimit: mode === 'daily' ? DAILY_MOVES : null,
    board: createBoard(),
    queue,
    score: 0,
    bestChain: 0,
    highestLevel: 1,
    prismas: 0,
    moves: 0,
    over: false,
    puzzleNumber: puzzle,
    seed,
    rngCalls: rng.calls,
  };
}

/**
 * Löst alle Verschmelzungen und die daraus folgenden Ketten auf.
 * `landed` ist die Zelle, auf der der Spieler abgelegt hat — dort erscheint
 * der aufgestiegene Stein, falls sie Teil einer Gruppe ist.
 */
export function resolve(
  startBoard: Board,
  landed: Position | null,
): {
  board: Board;
  steps: ResolutionStep[];
  points: number;
  chain: number;
  prismas: number;
  highestLevel: Level;
} {
  let board = startBoard;
  const steps: ResolutionStep[] = [];
  let totalPoints = 0;
  let chain = 0;
  let prismas = 0;
  let highestLevel: Level = 1;

  // Der Anker gilt nur für die erste Runde: danach entstehen Gruppen durch
  // Nachrutschen, nicht mehr durch die Hand des Spielers.
  let anchorHint: Position | null = landed;

  for (;;) {
    const groups = findGroups(board, anchorHint);
    if (groups.length === 0) break;

    chain += 1;
    anchorHint = null;

    const next = cloneBoard(board);
    const cleared: Position[] = [];
    let stepPoints = 0;

    // Zellen, die zu einer verschmelzenden Gruppe gehören, sollen von einer
    // Prisma-Explosion nicht doppelt erfasst werden.
    const inGroup = new Set<string>();
    for (const g of groups) {
      for (const c of g.cells) inGroup.add(`${c.row},${c.col}`);
    }

    for (const group of groups) {
      const isPrisma = group.resultLevel === null;
      // Der Stufensprung geht als Faktor in die Punkte ein: Eine Fünfergruppe
      // ist damit nicht nur schneller oben, sie zählt auch doppelt. Ohne das
      // blieb der Unterschied zwischen geübtem und blindem Spiel unsichtbar.
      stepPoints +=
        group.cells.length * group.level * POINTS_PER_STONE * levelGain(group.cells.length);

      if (isPrisma) {
        prismas += 1;
        stepPoints += group.cells.length * PRISMA_BONUS_PER_STONE;
        // Eine Prisma-Explosion reißt zusätzlich die Umgebung mit.
        for (const cell of group.cells) {
          for (const n of neighbours8(board, cell)) {
            const key = `${n.row},${n.col}`;
            if (board[n.row][n.col] === 0 || inGroup.has(key)) continue;
            if (cleared.some((c) => c.row === n.row && c.col === n.col)) continue;
            cleared.push(n);
          }
        }
      }
    }

    // Reihenfolge ist wichtig: erst alles leeren, dann die aufgestiegenen
    // Steine setzen. Sonst könnte eine Explosion einen frisch entstandenen
    // Stein wieder wegräumen.
    for (const group of groups) {
      for (const c of group.cells) next[c.row][c.col] = 0;
    }
    for (const c of cleared) next[c.row][c.col] = 0;
    for (const group of groups) {
      const up = group.resultLevel;
      if (up === null) continue;
      next[group.anchor.row][group.anchor.col] = up;
      if (up > highestLevel) highestLevel = up;
    }

    const settled = applyGravity(next);
    const earned = stepPoints * chain;
    totalPoints += earned;

    steps.push({
      chain,
      groups,
      cleared,
      points: earned,
      board: settled,
    });

    board = settled;
  }

  return { board, steps, points: totalPoints, chain, prismas, highestLevel };
}

/**
 * Räumt im Zen-Modus die oberste belegte Reihe, wenn das Feld voll ist.
 * Damit endet dort nie ein Spiel — wer entspannen will, soll nicht verlieren.
 */
function zenRelief(board: Board): Board {
  const next = cloneBoard(board);
  for (let row = 0; row < next.length; row++) {
    if (next[row].some((c) => c !== 0)) {
      next[row].fill(0);
      return applyGravity(next);
    }
  }
  return next;
}

/**
 * Spielt einen Zug. Gibt null zurück, wenn der Zug nicht möglich ist
 * (volle Spalte oder beendetes Spiel) — der Aufrufer ignoriert das einfach.
 */
export function playMove(
  state: GameState,
  col: number,
): { state: GameState; result: MoveResult } | null {
  if (state.over) return null;

  const level = state.queue[0];
  const placed = drop(state.board, col, level);
  if (!placed) return null;

  const outcome = resolve(placed.board, placed.landed);

  const rng = new Rng(state.seed, state.rngCalls);
  const moves = state.moves + 1;
  const queue = fillQueue(state.queue.slice(1), rng, moves);

  let board = outcome.board;
  let over = false;
  if (isFull(board)) {
    if (state.mode === 'zen') {
      board = zenRelief(board);
    } else {
      over = true;
    }
  }
  // Das Tagesrätsel endet nach der festen Zugzahl, auch wenn noch Platz wäre.
  if (state.moveLimit !== null && moves >= state.moveLimit) over = true;

  const highestLevel = Math.max(
    state.highestLevel,
    outcome.highestLevel,
    level,
  ) as Level;

  const next: GameState = {
    ...state,
    board,
    queue,
    score: state.score + outcome.points,
    bestChain: Math.max(state.bestChain, outcome.chain),
    highestLevel,
    prismas: state.prismas + outcome.prismas,
    moves,
    over,
    rngCalls: rng.calls,
  };

  return {
    state: next,
    result: {
      board: outcome.board,
      boardAfterDrop: placed.board,
      steps: outcome.steps,
      points: outcome.points,
      chain: outcome.chain,
      landed: placed.landed,
      highestLevel: outcome.highestLevel,
      prismas: outcome.prismas,
    },
  };
}

/** Vorschau: Was würde dieser Zug einbringen? Für den Hinweis-Knopf im Zen-Modus. */
export function previewMove(state: GameState, col: number): number {
  const placed = drop(state.board, col, state.queue[0]);
  if (!placed) return -1;
  return resolve(placed.board, placed.landed).points;
}

/**
 * Empfohlene Spalte für den Tipp-Knopf.
 *
 * Vorrang hat, was sofort Punkte bringt. Bringt kein Zug etwas — der häufige
 * Fall —, entscheidet, ob der Stein neben seinesgleichen landet und so eine
 * spätere Verschmelzung vorbereitet; danach, wie niedrig der Stapel ist.
 * Früher gewann bei Gleichstand schlicht die erste Spalte: Der Tipp riet
 * dann oft zu Spalte 1, ohne jeden Grund.
 */
export function suggestColumn(state: GameState): number | null {
  const level = state.queue[0];
  const rows = state.board.length;
  let best: number | null = null;
  let bestWert = -Infinity;
  for (let col = 0; col < state.board[0].length; col++) {
    const placed = drop(state.board, col, level);
    if (!placed) continue;
    const points = resolve(placed.board, placed.landed).points;
    const { row } = placed.landed;
    let nachbarn = 0;
    for (const [dr, dc] of [[1, 0], [0, -1], [0, 1]]) {
      const r = row + dr;
      const c = col + dc;
      if (r < rows && c >= 0 && c < state.board[0].length && state.board[r][c] === level) nachbarn++;
    }
    const wert = points * 1000 + nachbarn * 10 + row;
    if (wert > bestWert) {
      bestWert = wert;
      best = col;
    }
  }
  return best;
}
