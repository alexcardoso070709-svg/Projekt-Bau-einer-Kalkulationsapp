import { createGame } from '../../game/engine';
import { puzzleNumber } from '../../game/daily';
import { GameState } from '../../game/types';
import {
  DEFAULT_STATS,
  HINTS_MAX,
  archivedDailyGame,
  currentStreak,
  dailyDone,
  earnHint,
  isTodaysDaily,
  normalizeStats,
  recordGame,
  spendHint,
} from '../stats';

const tag = (d: number, m = 8) => new Date(2026, m, d, 12);

function tagesSpiel(d: number, score = 1000, m = 8): GameState {
  return { ...createGame({ mode: 'daily', date: tag(d, m) }), score, over: true, moves: 90 };
}

describe('Serie', () => {
  it('beginnt beim ersten Tagesrätsel bei eins', () => {
    expect(recordGame(DEFAULT_STATS, tagesSpiel(10)).streak).toBe(1);
  });

  it('wächst an aufeinanderfolgenden Tagen', () => {
    let s = recordGame(DEFAULT_STATS, tagesSpiel(10));
    s = recordGame(s, tagesSpiel(11));
    s = recordGame(s, tagesSpiel(12));
    expect(s.streak).toBe(3);
    expect(s.longestStreak).toBe(3);
  });

  it('beginnt nach einer Lücke von vorn, behält aber den Rekord', () => {
    let s = recordGame(DEFAULT_STATS, tagesSpiel(10));
    s = recordGame(s, tagesSpiel(11));
    s = recordGame(s, tagesSpiel(14));
    expect(s.streak).toBe(1);
    expect(s.longestStreak).toBe(2);
  });

  it('gilt heute und morgen noch, übermorgen nicht mehr', () => {
    const s = recordGame(DEFAULT_STATS, tagesSpiel(10));
    expect(currentStreak(s, tag(10))).toBe(1);
    expect(currentStreak(s, tag(11))).toBe(1);
    expect(currentStreak(s, tag(12))).toBe(0);
  });

  it('übersteht den Monatswechsel', () => {
    let s = recordGame(DEFAULT_STATS, tagesSpiel(30, 1000, 8));
    s = recordGame(s, tagesSpiel(1, 1000, 9));
    expect(s.streak).toBe(2);
  });

  it('übersteht die Sommerzeitumstellung', () => {
    // 28. auf 29. März: In der Nacht wird die Uhr vorgestellt.
    let s = recordGame(DEFAULT_STATS, tagesSpiel(28, 1000, 2));
    s = recordGame(s, tagesSpiel(29, 1000, 2));
    s = recordGame(s, tagesSpiel(30, 1000, 2));
    expect(s.streak).toBe(3);
    expect(dailyDone(s, tag(30, 2))).not.toBeNull();
  });

  it('lässt sich von einem nachgereichten älteren Rätsel nicht verschieben', () => {
    let s = recordGame(DEFAULT_STATS, tagesSpiel(10));
    s = recordGame(s, tagesSpiel(11));
    s = recordGame(s, tagesSpiel(5));
    expect(s.streak).toBe(2);
    expect(s.lastDailyPuzzle).toBe(puzzleNumber(tag(11)));
  });
});

describe('Unbestechliches Tagesrätsel', () => {
  it('überschreibt ein eingetragenes Tagesergebnis nie', () => {
    const erst = recordGame(DEFAULT_STATS, tagesSpiel(10, 1200));
    const zweit = recordGame(erst, tagesSpiel(10, 9999));
    expect(dailyDone(zweit, tag(10))!.score).toBe(1200);
    expect(zweit.played).toBe(1);
    expect(zweit.bestScore.daily).toBe(1200);
  });

  it('bewahrt das Endfeld auf, damit das Ergebnis erneut gezeigt werden kann', () => {
    const s = recordGame(DEFAULT_STATS, tagesSpiel(10));
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

describe('Rätsel über Mitternacht', () => {
  it('rechnet ein nach Mitternacht beendetes Rätsel seinem eigenen Tag zu', () => {
    const s = recordGame(DEFAULT_STATS, tagesSpiel(10));
    expect(dailyDone(s, tag(10))).not.toBeNull();
    // Das Rätsel des neuen Tages bleibt frei.
    expect(dailyDone(s, new Date(2026, 8, 11, 0, 4))).toBeNull();
  });

  it('zählt die Serie danach normal weiter', () => {
    let s = recordGame(DEFAULT_STATS, tagesSpiel(10));
    s = recordGame(s, tagesSpiel(11));
    expect(s.streak).toBe(2);
  });
});

describe('Ältere gespeicherte Statistik', () => {
  it('wird von Datums- auf Rätselnummer-Schlüssel umgestellt', () => {
    const n = puzzleNumber(tag(10));
    const alt = {
      ...DEFAULT_STATS,
      streak: 4,
      lastDailyKey: '2026-09-10',
      daily: { '2026-09-10': { score: 800, chain: 2, prismas: 0, moves: 90, puzzle: n } },
    } as unknown as Parameters<typeof normalizeStats>[0];
    const neu = normalizeStats(alt);
    expect(neu.lastDailyPuzzle).toBe(n);
    expect(dailyDone(neu, tag(10))!.score).toBe(800);
    expect(currentStreak(neu, tag(11))).toBe(4);
    expect('lastDailyKey' in neu).toBe(false);
  });

  it('übersteht eine leere oder unvollständige Speicherung', () => {
    expect(normalizeStats({})).toEqual(DEFAULT_STATS);
  });
});

describe('Freie Partien', () => {
  it('zählen für Bestwerte, aber nicht für die Serie', () => {
    const endlos = { ...createGame({ mode: 'endless', seed: 3 }), score: 5000, bestChain: 4 };
    const s = recordGame(DEFAULT_STATS, endlos);
    expect(s.bestScore.endless).toBe(5000);
    expect(s.bestChain).toBe(4);
    expect(s.streak).toBe(0);
    expect(Object.keys(s.daily)).toHaveLength(0);
  });

  it('dürfen beliebig oft wiederholt werden', () => {
    const e = { ...createGame({ mode: 'endless', seed: 3 }), score: 100 };
    let s = recordGame(DEFAULT_STATS, e);
    s = recordGame(s, e);
    expect(s.played).toBe(2);
  });
});

describe('Tipp-Guthaben', () => {
  it('startet mit dem vollen Vorrat', () => {
    expect(DEFAULT_STATS.hints).toBe(HINTS_MAX);
  });

  it('verbraucht einen Tipp, aber nie ins Negative', () => {
    let s = { ...DEFAULT_STATS, hints: 1 };
    s = spendHint(s);
    expect(s.hints).toBe(0);
    s = spendHint(s);
    expect(s.hints).toBe(0);
  });

  it('schreibt einen Tipp gut, aber nie über den Höchststand hinaus', () => {
    let s = { ...DEFAULT_STATS, hints: HINTS_MAX - 1 };
    s = earnHint(s);
    expect(s.hints).toBe(HINTS_MAX);
    s = earnHint(s);
    expect(s.hints).toBe(HINTS_MAX);
  });

  it('normalisiert einen fehlenden oder unsinnigen Wert auf den gültigen Bereich', () => {
    expect(normalizeStats({}).hints).toBe(HINTS_MAX);
    expect(normalizeStats({ hints: -5 } as never).hints).toBe(0);
    expect(normalizeStats({ hints: 99 } as never).hints).toBe(HINTS_MAX);
    expect(normalizeStats({ hints: 2 } as never).hints).toBe(2);
  });
});
