/**
 * Irisa — Einstiegspunkt.
 *
 * Hält Bildschirmwechsel und gespeicherte Daten zusammen. Bewusst ohne
 * Navigations-Bibliothek: Bei vier Ansichten wäre sie mehr Ballast als Hilfe.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { puzzleNumber } from './src/game/daily';
import { TUTORIAL } from './src/game/tutorial';
import { GameState, Mode } from './src/game/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  SavedGames,
  Settings,
  Stats,
  archivedDailyGame,
  currentStreak,
  dailyDone,
  isTodaysDaily,
  loadSavedGames,
  loadSettings,
  loadStats,
  recordGame,
  saveGame,
  saveSettings,
  saveStats,
} from './src/storage/store';
import * as feedback from './src/ui/feedback';
import { DARK, LIGHT } from './src/ui/theme';
import { ScreenFade } from './src/ui/components/ScreenFade';
import { GameScreen } from './src/ui/screens/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { ResultSheet } from './src/ui/screens/ResultSheet';
import { HowToSheet, SettingsSheet, StatsSheet } from './src/ui/screens/Sheets';

type ScreenSpec =
  | { name: 'home' }
  | { name: 'tutorial' }
  | { name: 'game'; mode: Mode; fortsetzen?: GameState };
type Screen = ScreenSpec & { id: number };
type SheetName = 'stats' | 'settings' | 'howto' | null;
type Ergebnis = { game: GameState; archiv: boolean; vorherBest?: number };

export default function App() {
  const systemTheme = useColorScheme();
  const [schriftBereit, schriftFehler] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });
  const [bereit, setBereit] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: 'home', id: 0 });
  const [sheet, setSheet] = useState<SheetName>(null);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  /** Nummer des heutigen Rätsels — wechselt um Mitternacht, auch bei offener App. */
  const [heute, setHeute] = useState(() => puzzleNumber());

  /**
   * Gespeicherte Partien liegen in einem Ref statt im Zustand: Sie ändern sich
   * mit jedem Zug, und jeder Zug sollte nicht die ganze App neu zeichnen.
   * Der Startbildschirm liest sie beim Zurückkehren.
   */
  const gespeichert = useRef<SavedGames>({ daily: null, endless: null, zen: null });
  const statsRef = useRef(stats);
  statsRef.current = stats;
  /** Ergebnis, das schon verbucht, aber noch nicht gezeigt ist. */
  const ausstehend = useRef<Ergebnis | null>(null);
  const zaehler = useRef(1);

  const zeige = useCallback((s: ScreenSpec) => {
    setScreen({ ...s, id: zaehler.current++ });
  }, []);

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const [s, e, spiele] = await Promise.all([loadStats(), loadSettings(), loadSavedGames()]);
      if (abgebrochen) return;
      setStats(s);
      setSettings(e);
      gespeichert.current = spiele;
      feedback.configure(e.haptics, e.sound);
      // Beim allerersten Start zeigt das Spiel sich selbst, statt ein Menü
      // anzubieten, das noch niemand versteht.
      if (!e.tutorialDone) zeige({ name: 'tutorial' });
      setBereit(true);
      feedback.init();
    })();
    return () => {
      abgebrochen = true;
    };
  }, [zeige]);

  useEffect(() => {
    const id = setInterval(() => {
      const n = puzzleNumber();
      setHeute((alt) => (alt === n ? alt : n));
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  const dunkel = settings.theme === 'auto' ? systemTheme !== 'light' : settings.theme === 'dark';
  const palette = dunkel ? DARK : LIGHT;

  // Im Browser und als Web-App auf dem Home-Bildschirm färbt theme-color die
  // Statusleiste. Sie muss dem gewählten Thema folgen, sonst sitzt im hellen
  // Thema ein dunkler Balken über dem Spiel (und umgekehrt).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', palette.bg));
    document.documentElement.style.colorScheme = dunkel ? 'dark' : 'light';
    document.body.style.backgroundColor = palette.bg;
  }, [dunkel, palette.bg]);

  /** Statistik mit der für heute gültigen Serie — ändert sich auch um Mitternacht. */
  const anzeigeStats = useMemo(
    () => ({ ...stats, streak: currentStreak(stats) }),
    // heute ist Absicht: Um Mitternacht muss die Serie neu bewertet werden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats, heute],
  );

  const aendereEinstellungen = useCallback((neu: Settings) => {
    setSettings(neu);
    feedback.configure(neu.haptics, neu.sound);
    saveSettings(neu);
  }, []);

  /**
   * Startet einen Modus. Das Tagesrätsel ist dabei unbestechlich: Ein
   * laufendes wird fortgesetzt statt neu begonnen, ein abgeschlossenes zeigt
   * sein Ergebnis. Beides schließt den Zweitversuch durch die Hintertür aus.
   */
  const starte = useCallback(
    (mode: Mode) => {
      setErgebnis(null);
      if (mode === 'daily') {
        const erledigt = dailyDone(statsRef.current);
        if (erledigt) {
          setErgebnis({ game: archivedDailyGame(erledigt), archiv: true });
          return;
        }
        const laufend = gespeichert.current.daily;
        // Über Mitternacht offen gelassen? Dann gehört der Stand zu gestern.
        if (laufend && !isTodaysDaily(laufend)) {
          gespeichert.current.daily = null;
          saveGame('daily', null);
        }
        zeige({ name: 'game', mode, fortsetzen: gespeichert.current.daily ?? undefined });
        return;
      }
      gespeichert.current[mode] = null;
      saveGame(mode, null);
      zeige({ name: 'game', mode });
    },
    [zeige],
  );

  const setzeFort = useCallback(
    (mode: Mode) => {
      const game = gespeichert.current[mode];
      if (!game) return;
      setErgebnis(null);
      zeige({ name: 'game', mode, fortsetzen: game });
    },
    [zeige],
  );

  /** Nach jedem Zug — sofort, nicht erst nach der Animation. */
  const merke = useCallback((game: GameState) => {
    gespeichert.current[game.mode] = game;
    saveGame(game.mode, game);
  }, []);

  /**
   * Spielende: sofort verbuchen, erst später zeigen. Wer während der letzten
   * Animation die Partie verlässt, verliert so weder Ergebnis noch Bestwert —
   * und das Tagesrätsel ist verbucht, bevor irgendetwas schiefgehen kann.
   */
  const spielVorbei = useCallback((game: GameState) => {
    const vorher = statsRef.current;
    const vorherBest = vorher.bestScore[game.mode] ?? 0;
    const neu = recordGame(vorher, game);
    statsRef.current = neu;
    setStats(neu);
    saveStats(neu);
    gespeichert.current[game.mode] = null;
    saveGame(game.mode, null);
    ausstehend.current = { game, archiv: false, vorherBest };
  }, []);

  const zeigeErgebnis = useCallback(() => {
    if (!ausstehend.current) return;
    setErgebnis(ausstehend.current);
    ausstehend.current = null;
  }, []);

  const tutorialFertig = useCallback(() => {
    aendereEinstellungen({ ...settings, tutorialDone: true });
    zeige({ name: 'home' });
  }, [settings, aendereEinstellungen, zeige]);

  const zumMenue = useCallback(() => {
    // Ein verbuchtes, aber noch nicht gezeigtes Ergebnis erscheint im Menü.
    setErgebnis(ausstehend.current);
    ausstehend.current = null;
    if (screen.name !== 'home') zeige({ name: 'home' });
  }, [screen.name, zeige]);

  /**
   * Android-Zurück-Taste: schließt, was obenauf liegt — Fenster, Ergebnis,
   * Spiel. Erst im Menü verlässt sie die App.
   */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) {
        setSheet(null);
        return true;
      }
      if (screen.name === 'tutorial') {
        tutorialFertig();
        return true;
      }
      if (ergebnis || screen.name !== 'home') {
        zumMenue();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [sheet, ergebnis, screen.name, tutorialFertig, zumMenue]);

  // Erst zeichnen, wenn Daten und Schrift da sind — sonst springt das Layout
  // beim Schriftwechsel. Lädt die Schrift nicht, geht es mit der Systemschrift
  // weiter statt mit einem schwarzen Bildschirm für immer.
  if (!bereit || (!schriftBereit && !schriftFehler)) {
    return <View style={[styles.root, { backgroundColor: DARK.bg }]} />;
  }

  const tagesStand = isTodaysDaily(gespeichert.current.daily) ? gespeichert.current.daily : null;
  const pausiert = (['endless', 'zen'] as Mode[]).filter((m) => gespeichert.current[m]);

  return (
    <SafeAreaProvider>
      <View style={[styles.root, { backgroundColor: palette.bg }]}>
        <StatusBar style={dunkel ? 'light' : 'dark'} />

        {screen.name === 'home' ? (
          <ScreenFade key={screen.id} testID="screen-home">
            <HomeScreen
              palette={palette}
              dark={dunkel}
              stats={anzeigeStats}
              heuteGespielt={dailyDone(stats)}
              tagesStand={tagesStand}
              pausiert={pausiert}
              showShapes={settings.colorAssist}
              onStart={starte}
              onResume={setzeFort}
              onStats={() => setSheet('stats')}
              onSettings={() => setSheet('settings')}
              onHowTo={() => setSheet('howto')}
            />
          </ScreenFade>
        ) : screen.name === 'tutorial' ? (
          <ScreenFade key={screen.id} testID="screen-tutorial">
            <GameScreen
              mode="zen"
              palette={palette}
              dark={dunkel}
              settings={settings}
              tutorial={{ steps: TUTORIAL, onDone: tutorialFertig }}
              onExit={tutorialFertig}
              onGameOver={() => {}}
              onShowResult={() => {}}
              onPersist={() => {}}
            />
          </ScreenFade>
        ) : (
          <ScreenFade key={screen.id} testID="screen-game">
            <GameScreen
              mode={screen.mode}
              palette={palette}
              dark={dunkel}
              settings={settings}
              initialGame={screen.fortsetzen ?? null}
              onExit={zumMenue}
              onGameOver={spielVorbei}
              onShowResult={zeigeErgebnis}
              onPersist={merke}
            />
          </ScreenFade>
        )}

        {ergebnis ? (
          <ResultSheet
            key={`${ergebnis.game.mode}-${ergebnis.game.score}-${ergebnis.archiv}`}
            game={ergebnis.game}
            stats={anzeigeStats}
            palette={palette}
            archived={ergebnis.archiv}
            previousBest={ergebnis.vorherBest}
            onAgain={ergebnis.game.mode === 'daily' ? undefined : () => starte(ergebnis.game.mode)}
            onHome={zumMenue}
          />
        ) : null}

        {sheet === 'stats' ? <StatsSheet stats={anzeigeStats} palette={palette} onClose={() => setSheet(null)} /> : null}
        {sheet === 'settings' ? (
          <SettingsSheet settings={settings} palette={palette} onChange={aendereEinstellungen} onClose={() => setSheet(null)} />
        ) : null}
        {sheet === 'howto' ? (
          <HowToSheet
            palette={palette}
            showShapes={settings.colorAssist}
            onClose={() => setSheet(null)}
            onTry={() => {
              setSheet(null);
              zeige({ name: 'tutorial' });
            }}
          />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
