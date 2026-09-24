/**
 * Texte der Oberfläche.
 *
 * Das Spielfeld selbst kommt ohne ein einziges Wort aus — Farben und Formen
 * erklären sich von selbst. Übersetzt werden muss deshalb nur der Rahmen:
 * Knöpfe, Statistik, Ergebnis. Das hält die App in allen Märkten
 * veröffentlichbar, ohne dass Inhalte nachgezogen werden müssen.
 */
import { getLocales } from 'expo-localization';

export interface Strings {
  play: string;
  daily: string;
  dailySub: string;
  endless: string;
  endlessSub: string;
  zen: string;
  zenSub: string;
  stats: string;
  howTo: string;
  score: string;
  best: string;
  chain: string;
  moves: string;
  movesLeft: string;
  prisma: string;
  gameOver: string;
  dailyDone: string;
  nextPuzzle: string;
  share: string;
  shared: string;
  again: string;
  home: string;
  resume: string;
  newGame: string;
  streak: string;
  played: string;
  avgScore: string;
  bestChain: string;
  prismas: string;
  noStats: string;
  undo: string;
  hint: string;
  settings: string;
  sound: string;
  haptics: string;
  theme: string;
  themeAuto: string;
  themeDark: string;
  themeLight: string;
  colorAssist: string;
  colorAssistSub: string;
  close: string;
  rulesTitle: string;
  rule1: string;
  rule2: string;
  rule3: string;
  rule4: string;
  offlineNote: string;
  puzzleLabel: string;
  todayDone: string;
  column: string;
  free: string;
  top: string;
  empty: string;
  colours: [string, string, string, string, string];
  tryIt: string;
  skip: string;
  nextIn: string;
  resultTitle: string;
}

const de: Strings = {
  play: 'Spielen',
  daily: 'Tagesrätsel',
  dailySub: 'Jeden Tag neu · für alle gleich',
  endless: 'Endlos',
  endlessSub: 'Spiel, bis nichts mehr geht',
  zen: 'Zen',
  zenSub: 'Ohne Ende, ohne Druck',
  stats: 'Statistik',
  howTo: 'So geht’s',
  score: 'Punkte',
  best: 'Bestwert',
  chain: 'Kette',
  moves: 'Züge',
  movesLeft: 'Züge übrig',
  prisma: 'Prisma',
  gameOver: 'Kein Zug mehr möglich',
  dailyDone: 'Tagesrätsel geschafft',
  nextPuzzle: 'Nächstes Rätsel in',
  share: 'Ergebnis teilen',
  shared: 'Kopiert',
  again: 'Nochmal',
  home: 'Menü',
  resume: 'Fortsetzen',
  newGame: 'Neues Spiel',
  streak: 'Serie',
  played: 'Gespielt',
  avgScore: 'Schnitt',
  bestChain: 'Längste Kette',
  prismas: 'Prismen',
  noStats: 'Spiel dein erstes Rätsel, dann steht hier etwas.',
  undo: 'Zurück',
  hint: 'Tipp',
  settings: 'Einstellungen',
  sound: 'Ton',
  haptics: 'Vibration',
  theme: 'Darstellung',
  themeAuto: 'Automatisch',
  themeDark: 'Dunkel',
  themeLight: 'Hell',
  colorAssist: 'Formen zeigen',
  colorAssistSub: 'Jede Farbe bekommt zusätzlich eine eigene Form',
  close: 'Schließen',
  rulesTitle: 'So geht’s',
  rule1: 'Tippe auf eine Spalte, um den Stein fallen zu lassen.',
  rule2: 'Drei gleiche Farben, die sich berühren, werden zur nächsten Farbe.',
  rule3: 'Fünf auf einmal überspringen eine Farbe, acht sogar zwei.',
  rule4: 'Geht es über Blau hinaus, zündet ein Prisma und reißt alles um sich herum mit.',
  offlineNote: 'Alles bleibt auf deinem Gerät. Kein Konto, keine Werbung, kein Internet nötig.',
  puzzleLabel: 'Rätsel',
  todayDone: 'Für heute erledigt',
  column: 'Spalte',
  free: 'frei',
  top: 'oben',
  empty: 'leer',
  colours: ['Rot', 'Orange', 'Gelb', 'Grün', 'Blau'],
  tryIt: 'Interaktiv ausprobieren',
  skip: 'Überspringen',
  nextIn: 'Neu in',
  resultTitle: 'Ergebnis',
};

const en: Strings = {
  play: 'Play',
  daily: 'Daily',
  dailySub: 'New every day · same for everyone',
  endless: 'Endless',
  endlessSub: 'Play until you’re stuck',
  zen: 'Zen',
  zenSub: 'No end, no pressure',
  stats: 'Stats',
  howTo: 'How to play',
  score: 'Score',
  best: 'Best',
  chain: 'Chain',
  moves: 'Moves',
  movesLeft: 'Moves left',
  prisma: 'Prisma',
  gameOver: 'No moves left',
  dailyDone: 'Daily complete',
  nextPuzzle: 'Next puzzle in',
  share: 'Share result',
  shared: 'Copied',
  again: 'Play again',
  home: 'Menu',
  resume: 'Resume',
  newGame: 'New game',
  streak: 'Streak',
  played: 'Played',
  avgScore: 'Average',
  bestChain: 'Longest chain',
  prismas: 'Prismas',
  noStats: 'Play your first puzzle and this fills up.',
  undo: 'Undo',
  hint: 'Hint',
  settings: 'Settings',
  sound: 'Sound',
  haptics: 'Haptics',
  theme: 'Appearance',
  themeAuto: 'Automatic',
  themeDark: 'Dark',
  themeLight: 'Light',
  colorAssist: 'Show shapes',
  colorAssistSub: 'Each colour also gets its own shape',
  close: 'Close',
  rulesTitle: 'How to play',
  rule1: 'Tap a column to drop the stone.',
  rule2: 'Three touching stones of one colour become the next colour.',
  rule3: 'Five at once skip a colour, eight skip two.',
  rule4: 'Go past blue and a Prisma ignites, clearing everything around it.',
  offlineNote: 'Everything stays on your device. No account, no ads, no internet needed.',
  puzzleLabel: 'Puzzle',
  todayDone: 'Done for today',
  column: 'Column',
  free: 'free',
  top: 'top',
  empty: 'empty',
  colours: ['Red', 'Orange', 'Yellow', 'Green', 'Blue'],
  tryIt: 'Try it interactively',
  skip: 'Skip',
  nextIn: 'New in',
  resultTitle: 'Result',
};

/**
 * Gerätesprache über expo-localization. Früher wurde sie aus
 * NativeModules.SettingsManager gelesen — eine Schnittstelle der alten
 * React-Native-Architektur, die in der neuen nicht verlässlich existiert.
 * Deutsche Geräte hätten dann Englisch gezeigt.
 */
function deviceLocale(): string {
  try {
    return getLocales()[0]?.languageTag ?? 'en';
  } catch {
    return 'en';
  }
}

export const locale = deviceLocale();
export const strings: Strings = locale.toLowerCase().startsWith('de') ? de : en;
export const numberLocale = locale.toLowerCase().startsWith('de') ? 'de-DE' : 'en-US';
