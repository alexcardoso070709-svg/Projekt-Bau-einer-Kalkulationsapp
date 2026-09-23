/**
 * Vibrations-Feedback.
 *
 * Der Unterschied zwischen einem Spiel, das sich billig anfühlt, und einem,
 * das sich wertig anfühlt, liegt zu einem überraschend großen Teil hier.
 * Jede Rückmeldung ist an ihr Ereignis gekoppelt: ein leichter Tick beim
 * Ablegen, ein festerer Schlag beim Verschmelzen, ein Erfolgsmuster beim
 * Prisma.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let aktiv = true;

export function setHaptics(on: boolean): void {
  aktiv = on;
}

function safe(fn: () => Promise<void>): void {
  if (!aktiv || Platform.OS === 'web') return;
  fn().catch(() => {
    // Geräte ohne Vibrationsmotor dürfen keinen Fehler auslösen.
  });
}

/** Stein abgelegt: kaum spürbar, aber vorhanden. */
export const tapDrop = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** Verschmelzung: deutlicher, wächst mit der Länge der Kette. */
export const tapMerge = (chain: number) =>
  safe(() =>
    Haptics.impactAsync(
      chain >= 3
        ? Haptics.ImpactFeedbackStyle.Heavy
        : chain === 2
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
    ),
  );

/** Prisma: der Höhepunkt, entsprechend deutlich. */
export const tapPrisma = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Abgewiesen: kurzer, harter Impuls — fühlt sich an wie ein Anschlag. */
export const tapReject = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));

/** Spielende. */
export const tapGameOver = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

/** Knopfdruck in Menüs. */
export const tapButton = () =>
  safe(() => Haptics.selectionAsync());
