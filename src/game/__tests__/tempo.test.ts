import {
  TEMPO_BONUS_CHAIN_MS,
  TEMPO_BONUS_PRISMA_MS,
  TEMPO_MS,
  createGame,
  playMove,
  tempoBonusMs,
  tickClock,
  timeLeftMs,
} from '../engine';
import { GameState } from '../types';
import { boardFrom } from './helpers';

const tempo = (): GameState => createGame({ mode: 'tempo', seed: 7 });

describe('Tempo', () => {
  it('beginnt mit einer Minute und ohne Zuglimit', () => {
    const g = tempo();
    expect(g.moveLimit).toBeNull();
    expect(timeLeftMs(g)).toBe(TEMPO_MS);
  });

  it('andere Modi haben keine Uhr, und die Uhr lässt sie unberührt', () => {
    const g = createGame({ mode: 'endless', seed: 7 });
    expect(timeLeftMs(g)).toBeNull();
    expect(tickClock(g, 5_000)).toBe(g);
  });

  it('endet genau, wenn die Zeit abgelaufen ist', () => {
    let g = tickClock(tempo(), TEMPO_MS - 1);
    expect(g.over).toBe(false);
    expect(timeLeftMs(g)).toBe(1);
    g = tickClock(g, 500);
    expect(g.over).toBe(true);
    expect(timeLeftMs(g)).toBe(0);
    expect(playMove(g, 0)).toBeNull();
  });

  it('ignoriert negative oder fehlende Zeitspannen', () => {
    const g = tempo();
    expect(tickClock(g, -100)).toBe(g);
    expect(tickClock(g, Number.NaN)).toBe(g);
  });

  it('Ketten und Prismen schenken Zeit, ein einfacher Zug nicht', () => {
    expect(tempoBonusMs(0, 0)).toBe(0);
    expect(tempoBonusMs(1, 0)).toBe(0);
    expect(tempoBonusMs(3, 0)).toBe(2 * TEMPO_BONUS_CHAIN_MS);
    expect(tempoBonusMs(1, 1)).toBe(TEMPO_BONUS_PRISMA_MS);
  });

  it('schreibt den Bonus eines Zuges der Spielzeit gut', () => {
    // Rot fällt in Spalte 2 → drei Rote werden Orange → drei Orange werden Gelb: Kette 2.
    const g: GameState = { ...tempo(), board: boardFrom(['22...', '11...']), queue: [1, 1, 1] };
    const out = playMove(g, 2)!;
    expect(out.result.chain).toBe(2);
    expect(out.result.timeBonusMs).toBe(TEMPO_BONUS_CHAIN_MS);
    expect(timeLeftMs(out.state)).toBe(TEMPO_MS + TEMPO_BONUS_CHAIN_MS);
  });

  it('gibt außerhalb von Tempo keinen Bonus', () => {
    const g: GameState = { ...createGame({ mode: 'endless', seed: 7 }), board: boardFrom(['22...', '11...']), queue: [1, 1, 1] };
    expect(playMove(g, 2)!.result.timeBonusMs).toBe(0);
  });
});
