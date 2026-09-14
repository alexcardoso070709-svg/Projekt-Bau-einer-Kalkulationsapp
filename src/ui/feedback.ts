/**
 * Sinnliche Rückmeldung: Vibration und Ton gemeinsam.
 *
 * Beide gehören zum selben Ereignis und werden deshalb an einer Stelle
 * ausgelöst statt an zwei. Ob sie tatsächlich erklingen, entscheiden die
 * beiden Module selbst anhand der Einstellungen — der Spielablauf muss das
 * nicht bei jedem Aufruf abfragen.
 */
import * as haptics from './haptics';
import * as sound from './sound';

/** Klänge vorab laden. Einmal beim Start aufrufen. */
export const init = sound.initSound;

export function configure(vibration: boolean, ton: boolean): void {
  haptics.setHaptics(vibration);
  sound.setSound(ton);
}

/** Stein abgelegt. */
export function drop(): void {
  haptics.tapDrop();
  sound.playDrop();
}

/** Verschmelzung — Stärke und Tonhöhe wachsen mit dem Kettenglied. */
export function merge(chain: number): void {
  haptics.tapMerge(chain);
  sound.playMerge(chain);
}

/** Prisma gezündet. */
export function prisma(): void {
  haptics.tapPrisma();
  sound.playPrisma();
}

/** Partie beendet. */
export function gameOver(): void {
  haptics.tapGameOver();
  sound.playGameOver();
}

/** Knopfdruck in Menüs. */
export function button(): void {
  haptics.tapButton();
  sound.playTap();
}

export const release = sound.releaseSound;
