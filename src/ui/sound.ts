/**
 * Klangwiedergabe.
 *
 * Alle Klänge sind synthetisch erzeugt (siehe README) — kein Lizenzrisiko
 * und exakt auf das Spiel abgestimmt. Die Merge-Töne folgen einer
 * pentatonischen Leiter: In ihr gibt es keine dissonanten Intervalle, also
 * klingt jede Kettenfolge harmonisch, obwohl niemand vorhersagen kann,
 * welche Töne in welcher Reihenfolge erklingen. Der Spieler spielt beim
 * Verschmelzen unbewusst eine Melodie.
 *
 * Die Wiedergabe ist durchgängig fehlertolerant: Ein Gerät ohne Audio, ein
 * blockierter Browser oder ein fehlgeschlagenes Laden dürfen das Spiel nie
 * anhalten. Ton ist Beiwerk, nicht Voraussetzung.
 */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Statische Einbindung ist Pflicht: Der Bündler löst Pfade zur Bauzeit auf
 * und kann mit zusammengesetzten Namen nichts anfangen.
 */
const QUELLEN = {
  drop: require('../../assets/sounds/drop.wav'),
  merge1: require('../../assets/sounds/merge1.wav'),
  merge2: require('../../assets/sounds/merge2.wav'),
  merge3: require('../../assets/sounds/merge3.wav'),
  merge4: require('../../assets/sounds/merge4.wav'),
  merge5: require('../../assets/sounds/merge5.wav'),
  merge6: require('../../assets/sounds/merge6.wav'),
  merge7: require('../../assets/sounds/merge7.wav'),
  merge8: require('../../assets/sounds/merge8.wav'),
  prisma: require('../../assets/sounds/prisma.wav'),
  gameover: require('../../assets/sounds/gameover.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  blocked: require('../../assets/sounds/blocked.wav'),
} as const;

type Klang = keyof typeof QUELLEN;

/** Höchstes vorhandenes Kettenglied — längere Ketten wiederholen den Spitzenton. */
const MERGE_STUFEN = 8;

const spieler = new Map<Klang, AudioPlayer>();
let aktiv = true;
let bereit = false;

export function setSound(on: boolean): void {
  aktiv = on;
}

/**
 * Lädt alle Klänge vorab.
 *
 * Ohne Vorabladen entstünde beim ersten Abspielen eine hörbare Verzögerung —
 * ausgerechnet beim ersten Zug, wo der Eindruck entsteht.
 */
export async function initSound(): Promise<void> {
  try {
    await setAudioModeAsync({
      // Wer sein Telefon stumm geschaltet hat, will keinen Ton hören.
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      // Entscheidend: Die Musik des Nutzers weiterlaufen lassen, statt sie
      // für einen Klick-Ton zu unterbrechen.
      interruptionMode: 'mixWithOthers',
    });
  } catch {
    // Ein Gerät, das den Audiomodus nicht setzen lässt, kann trotzdem spielen.
  }

  for (const name of Object.keys(QUELLEN) as Klang[]) {
    try {
      spieler.set(name, createAudioPlayer(QUELLEN[name]));
    } catch {
      // Einzelne Klänge dürfen fehlen, ohne die übrigen mitzureißen.
    }
  }
  bereit = true;
}

function spiele(name: Klang): void {
  if (!aktiv || !bereit) return;
  const p = spieler.get(name);
  if (!p) return;
  try {
    // Zurückspulen, damit ein schnell wiederholter Klang erneut von vorn
    // beginnt statt stumm zu bleiben, weil er schon durchgelaufen ist.
    p.seekTo(0);
    p.play();
  } catch {
    // Verweigerte Wiedergabe (etwa ein Browser vor der ersten Berührung)
    // ist kein Fehlerfall.
  }
}

/** Stein abgelegt — tief und kurz, er erklingt bis zu 90-mal je Partie. */
export const playDrop = () => spiele('drop');

/** Verschmelzung: je Kettenglied ein Ton höher auf der pentatonischen Leiter. */
export function playMerge(chain: number): void {
  const stufe = Math.min(Math.max(chain, 1), MERGE_STUFEN);
  spiele(`merge${stufe}` as Klang);
}

/** Prisma — der einzige volle Akkord im Spiel. */
export const playPrisma = () => spiele('prisma');

/** Spielende: weich fallend, kein Strafklang. */
export const playGameOver = () => spiele('gameover');

/** Knopfdruck in Menüs. */
export const playTap = () => spiele('tap');

/** Zug abgewiesen, weil die Spalte voll ist. */
export const playBlocked = () => spiele('blocked');

/** Beim Beenden aufräumen. */
export function releaseSound(): void {
  for (const p of spieler.values()) {
    try {
      p.remove();
    } catch {
      // Bereits freigegebene Spieler sind kein Problem.
    }
  }
  spieler.clear();
  bereit = false;
}
