/**
 * Name und Store-Adresse der App — an genau einer Stelle.
 *
 * „Prisma" ist ein Arbeitstitel: Im App Store gibt es bereits die bekannte
 * Foto-App „Prisma" von Prisma Labs. Vor dem Launch wird hier umbenannt
 * (und in app.json sowie locales/*.json, siehe LAUNCH.md).
 *
 * Die Spielmechanik „Prisma" (die Explosion) ist davon unabhängig und darf
 * ihren Namen behalten.
 */
export const APP_NAME = 'Prisma';

/** Kopfzeile des geteilten Ergebnisses. */
export const SHARE_TITLE = APP_NAME.toUpperCase();

/**
 * Adresse im Store, sobald die App veröffentlicht ist. Dann hängt jedes
 * geteilte Ergebnis den Link an — wer in einer Gruppe das Emoji-Raster
 * sieht, ist einen Tipp vom Download entfernt.
 */
export const STORE_URL: string | null = null;
