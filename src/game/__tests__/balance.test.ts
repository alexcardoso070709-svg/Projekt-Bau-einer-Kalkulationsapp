/**
 * Balance-Wächter.
 *
 * Diese Tests prüfen keine einzelne Funktion, sondern das Spielgefühl im
 * Ganzen: Dauert eine Partie die richtige Zeit? Ist der Höhepunkt erreichbar?
 * Lohnt sich Können? Beim Entwurf zeigte sich, dass eine einzelne Zahl —
 * etwa die Anzahl der Farbstufen — all das kippen kann, ohne dass ein
 * einziger Funktionstest ausschlägt. Deshalb stehen die Grenzen hier.
 */
import { canDrop } from '../board';
import { DAILY_MOVES, createGame, playMove, previewMove, suggestColumn } from '../engine';
import { COLS, GameState } from '../types';

type Strategy = (s: GameState) => number | null;

/** Anfänger: tippt irgendeine mögliche Spalte an. */
function zufallsZug(rand: () => number): Strategy {
  return (s) => {
    const moeglich: number[] = [];
    for (let c = 0; c < COLS; c++) if (canDrop(s.board, c)) moeglich.push(c);
    return moeglich.length ? moeglich[Math.floor(rand() * moeglich.length)] : null;
  };
}

/**
 * Geübt: nimmt den Zug mit dem besten Sofortertrag, bei Gleichstand die erste
 * Spalte. Auf diesen Spieler sind die Grenzen unten kalibriert. Er ist hier
 * fest verankert, statt den Tipp-Knopf zu verwenden: Als der Tipp klüger
 * wurde, verschob sich sonst stillschweigend die Messlatte.
 */
const geuebt: Strategy = (s) => {
  let best: number | null = null;
  let bestPunkte = -1;
  for (let c = 0; c < COLS; c++) {
    const punkte = previewMove(s, c);
    if (punkte > bestPunkte) {
      bestPunkte = punkte;
      best = c;
    }
  }
  return best;
};

/** Könner: folgt dem Tipp-Knopf, der auch Verschmelzungen vorbereitet. */
const koennerZug: Strategy = (s) => suggestColumn(s);

function spieleTag(tag: number, strategie: Strategy): GameState {
  let s = createGame({ mode: 'daily', date: new Date(2026, 0, tag) });
  let notbremse = 0;
  while (!s.over && notbremse++ < 1000) {
    const col = strategie(s);
    if (col === null) break;
    const out = playMove(s, col);
    if (!out) break;
    s = out.state;
  }
  return s;
}

function auswerten(tage: number, strategie: Strategy) {
  const ergebnisse: GameState[] = [];
  for (let t = 1; t <= tage; t++) ergebnisse.push(spieleTag(t, strategie));
  const summe = (f: (s: GameState) => number) =>
    ergebnisse.reduce((a, s) => a + f(s), 0);
  return {
    ergebnisse,
    punkteSchnitt: summe((s) => s.score) / tage,
    zuegeSchnitt: summe((s) => s.moves) / tage,
    prismaAnteil: ergebnisse.filter((s) => s.prismas > 0).length / tage,
  };
}

// Fester Zufall, damit der Test nicht sporadisch ausschlägt.
function festerZufall(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAGE = 60;

describe('Spielbalance im Tagesrätsel', () => {
  const anfaenger = auswerten(TAGE, zufallsZug(festerZufall(20260914)));
  const koenner = auswerten(TAGE, geuebt);

  it('endet jede Partie zuverlässig', () => {
    for (const s of anfaenger.ergebnisse) {
      expect(s.over).toBe(true);
      expect(s.moves).toBeLessThanOrEqual(DAILY_MOVES);
    }
  });

  it('dauert lang genug für ein Ritual, aber kurz genug für den Alltag', () => {
    // Rund zwei Sekunden pro Zug: unter 90 Zügen bleibt eine Partie damit
    // unter drei Minuten — die Spanne, in der Wordle zur Gewohnheit wurde.
    expect(anfaenger.zuegeSchnitt).toBeGreaterThan(60);
    expect(anfaenger.zuegeSchnitt).toBeLessThanOrEqual(DAILY_MOVES);
  });

  it('macht den Höhepunkt erreichbar, ohne ihn zu verschenken', () => {
    // Zu selten und niemand lernt die Mechanik; zu häufig und sie verliert
    // ihren Reiz. Selbst wer blind tippt, soll gelegentlich eines sehen.
    expect(anfaenger.prismaAnteil).toBeGreaterThan(0.05);
    expect(koenner.prismaAnteil).toBeLessThan(0.75);
    expect(koenner.prismaAnteil).toBeGreaterThan(anfaenger.prismaAnteil);
  });

  it('belohnt Können sichtbar', () => {
    // Ohne spürbaren Abstand gäbe es keinen Grund, besser werden zu wollen —
    // und ein geteiltes Ergebnis hätte keine Aussage.
    expect(koenner.punkteSchnitt).toBeGreaterThan(anfaenger.punkteSchnitt * 1.2);
  });

  it('erzeugt Ausreißer nach oben, über die man reden kann', () => {
    const bestes = Math.max(...koenner.ergebnisse.map((s) => s.score));
    expect(bestes).toBeGreaterThan(koenner.punkteSchnitt * 2.5);
  });

  it('macht keine zwei Tage gleich', () => {
    const punkte = new Set(koenner.ergebnisse.map((s) => s.score));
    expect(punkte.size).toBeGreaterThan(TAGE * 0.8);
  });

  it('lässt sich durch den Tipp-Knopf nachweislich besser spielen', () => {
    // Ein Tipp, der nicht besser spielt als reine Gier, wäre wertlos.
    const koenner = auswerten(TAGE, koennerZug);
    expect(koenner.punkteSchnitt).toBeGreaterThan(auswerten(TAGE, geuebt).punkteSchnitt);
  });
});
