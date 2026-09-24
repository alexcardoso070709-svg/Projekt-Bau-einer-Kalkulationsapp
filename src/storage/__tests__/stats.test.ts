import { createGame } from '../../game/engine';
import { GameState } from '../../game/types';
import {
  DEFAULT_STATS,
  archivedDailyGame,
  currentStreak,
  dailyDone,
  isTodaysDaily,
  recordGame,
} from '../stats';

const tag = (d: number) => new Date(2026, 8, d, 12);

function tagesSpiel(d: number, score = 1000): GameState {
  return { ...createGame({ mode: 'daily', date: tag(d) }), score, over: true, moves: 90 };
}

describe('Serie', () => {
  it('beginnt beim ersten Tagesrätsel bei eins', () => {
    expect(recordGame(DEFAULT_STATS, tagesSpiel(10), tag(10)).streak).toBe(1);
  });

  it('wächst an aufeinanderfolgenden Tagen', () => {
    let s = recordGame(DEFAULT_STATS, tagesSpiel(10), tag(10));
    s = recordGame(s, tagesSpiel(11), tag(11));
    s = recordGame(s, tagesSpiel(12), tag(12));
    expect(s.streak).toBe(3);
    expect(s.longestStreak).toBe(3);
  });

  it('beginnt nach einer Lücke von vorn, behält aber den Rekord', () => {
    let s = recordGame(DEFAULT_STATS, tagesSpiel(10), tag(10));
    s = recordGame(s, tagesSpiel(11), tag(11));
    s = recordGame(s, tagesSpiel(14), tag(14));
    expect(s.streak).toBe(1);
    expect(s.longestStreak).toBe(2);
  });

  it('gilt heute und morgen noch, übermorgen nicht mehr', () => {
    const s = recordGame(DEFAULT_STATS, tagesSpiel(10), tag(10));
    expect(currentStreak(s, tag(10))).toBe(1);
    expect(currentStreak(s, tag(11))).toBe(1);
    expect(currentStreak(s, tag(12))).toBe(0);
  });

  it('übersteht den Monatswechsel', () => {
    let s = recordGame(DEFAULT_STATS, { ...tagesSpiel(1), puzzleNumber: 1 }, new Date(2026, 8, 30, 12));
    s = recordGame(s, { ...tagesSpiel(1), puzzleNumber: 2 }, new Date(2026, 9, 1, 12));
    expect(s.streak).toBe(2);
  });
});

describe('Unbestechliches Tagesrätsel', () => {
  it('überschreibt ein eingetragenes Tagesergebnis nie', () => {
    const erst = recordGame(DEFAULT_STATS, tagesSpiel(10, 1200), tag(10));
    const zweit = recordGame(erst, tagesSpiel(10, 9999), tag(10));
    expect(dailyDone(zweit, tag(10))!.score).toBe(1200);
    expect(zweit.played).toBe(1);
    expect(zweit.bestScore.daily).toBe(1200);
  });

  it('bewahrt das Endfeld auf, damit das Ergebnis erneut gezeigt werden kann', () => {
    const s = recordGame(DEFAULT_STATS, tagesSpiel(10), tag(10));
    const archiv = archivedDailyGame(dailyDone(s, tag(10))!);
    expect(archiv.board).toHaveLength(8);
    expect(archiv.over).toBe(true);
    expect(archiv.mode).toBe('daily');
  });

  it('erkennt einen gespeicherten Spielstand von gestern als veraltet', () => {
    const gestern = createGame({ mode: 'daily', date: tag(9) });
    const heute = createGame({ mode: 'daily', date: tag(10) });
    expect(isTodaysDaily(gestern, tag(10))).toBe(false);
    expect(isTodaysDaily(heute, tag(10))).toBe(true);
    expect(isTodaysDaily(createGame({ mode: 'endless', seed: 1 }), tag(10))).toBe(false);
  });
});

describe('Freie Partien', () => {
  it('zählen für Bestwerte, aber nicht für die Serie', () => {
    const endlos = { ...createGame({ mode: 'endless', seed: 3 }), score: 5000, bestChain: 4 };
    const s = recordGame(DEFAULT_STATS, endlos, tag(10));
    expect(s.bestScore.endless).toBe(5000);
    expect(s.bestChain).toBe(4);
    expect(s.streak).toBe(0);
    expect(Object.keys(s.daily)).toHaveLength(0);
  });

  it('dürfen beliebig oft wiederholt werden', () => {
    const e = { ...createGame({ mode: 'endless', seed: 3 }), score: 100 };
    let s = recordGame(DEFAULT_STATS, e, tag(10));
    s = recordGame(s, e, tag(10));
    expect(s.played).toBe(2);
  });
});

describe('Rätsel über Mitternacht', () => {
  it('rechnet ein nach Mitternacht beendetes Rätsel seinem eigenen Tag zu', () => {
    const spiel = tagesSpiel(10);
    const kurzNachMitternacht = new Date(2026, 8, 11, 0, 4);
    const s = recordGame(DEFAULT_STATS, spiel, kurzNachMitternacht);
    expect(dailyDone(s, tag(10))).not.toBeNull();
    // Das Rätsel des neuen Tages bleibt frei.
    expect(dailyDone(s, kurzNachMitternacht)).toBeNull();
  });

  it('zählt die Serie danach normal weiter', () => {
    let s = recordGame(DEFAULT_STATS, tagesSpiel(10), new Date(2026, 8, 11, 0, 4));
    s = recordGame(s, tagesSpiel(11), tag(11));
    expect(s.streak).toBe(2);
  });
});
