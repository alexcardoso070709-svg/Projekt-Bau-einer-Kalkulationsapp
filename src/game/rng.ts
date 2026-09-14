/**
 * Deterministischer Zufallsgenerator (Mulberry32).
 *
 * Warum nicht Math.random? Das Tagesrätsel muss auf jedem Gerät der Welt
 * exakt dieselbe Steinabfolge erzeugen — nur dann sind Ergebnisse
 * vergleichbar und das Teilen hat Bedeutung. Zusätzlich lässt sich der
 * Zustand über den Zählerstand exakt wiederherstellen, sodass ein
 * unterbrochenes Spiel nahtlos fortgesetzt werden kann.
 */
export class Rng {
  private state: number;
  /** Zahl der bisher gezogenen Werte. Zusammen mit dem Seed der volle Zustand. */
  public calls: number;

  constructor(seed: number, calls = 0) {
    this.state = seed >>> 0;
    this.calls = 0;
    // Auf den gespeicherten Stand vorspulen.
    for (let i = 0; i < calls; i++) this.next();
  }

  /** Nächster Wert im Bereich [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    this.calls++;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganzzahl im Bereich [0, maxExclusive). */
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /**
   * Zieht einen Index anhand von Gewichten. Ein Gewicht von 0 wird nie gezogen.
   */
  weighted(weights: number[]): number {
    let total = 0;
    for (const w of weights) total += w;
    let roll = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll < 0) return i;
    }
    return weights.length - 1;
  }
}

/**
 * Streuwert einer Zeichenkette (FNV-1a, 32 Bit). Wandelt einen Datums-
 * schlüssel in einen Seed um, der sich gut über den Zahlenraum verteilt.
 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
