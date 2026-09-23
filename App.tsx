/**
 * PRISMA — Einstiegspunkt.
 *
 * Hält Bildschirmwechsel und gespeicherte Daten zusammen. Bewusst ohne
 * Navigations-Bibliothek: Bei vier Ansichten wäre sie mehr Ballast als Hilfe.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
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
import { TUTORIAL } from './src/game/tutorial';
import { GameState, Mode } from './src/game/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  SaveSlot,
  Settings,
  Stats,
  archivedDailyGame,
  currentStreak,
  dailyDone,
  isTodaysDaily,
  loadGame,
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

export default function App() {
  const systemTheme = useColorScheme();
  const [schriftBereit] = useFonts({
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
  const [ergebnis, setErgebnis] = useState<{ game: GameState; archiv: boolean } | null>(null);
  const [freiesSpiel, setFreiesSpiel] = useState<GameState | null>(null);
  const [tagesSpiel, setTagesSpiel] = useState<GameState | null>(null);
  const zaehler = useRef(1);

  const zeige = useCallback((s: ScreenSpec) => {
    setScreen({ ...s, id: zaehler.current++ });
  }, []);

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const [s, e, frei, tages] = await Promise.all([
        loadStats(),
        loadSettings(),
        loadGame('free'),
        loadGame('daily'),
      ]);
      if (abgebrochen) return;
      setStats({ ...s, streak: currentStreak(s) });
      setSettings(e);
      feedback.configure(e.haptics, e.sound);
      setFreiesSpiel(frei);
      setTagesSpiel(tages);
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

  const dunkel = settings.theme === 'auto' ? systemTheme !== 'light' : settings.theme === 'dark';
  const palette = dunkel ? DARK : LIGHT;

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
        const erledigt = dailyDone(stats);
        if (erledigt) {
          setErgebnis({ game: archivedDailyGame(erledigt), archiv: true });
          return;
        }
        // Über Mitternacht offen gelassen? Dann gehört der gespeicherte Stand
        // zu gestern und wird verworfen, statt fortgesetzt.
        const laufend = isTodaysDaily(tagesSpiel) ? tagesSpiel : null;
        if (!laufend && tagesSpiel) {
          setTagesSpiel(null);
          saveGame('daily', null);
        }
        zeige({ name: 'game', mode, fortsetzen: laufend ?? undefined });
        return;
      }
      setFreiesSpiel(null);
      saveGame('free', null);
      zeige({ name: 'game', mode });
    },
    [stats, tagesSpiel, zeige],
  );

  const setzeFort = useCallback(() => {
    if (!freiesSpiel) return;
    setErgebnis(null);
    zeige({ name: 'game', mode: freiesSpiel.mode, fortsetzen: freiesSpiel });
  }, [freiesSpiel, zeige]);

  const merke = useCallback((slot: SaveSlot, game: GameState | null) => {
    saveGame(slot, game);
    if (slot === 'daily') setTagesSpiel(game);
    else setFreiesSpiel(game);
  }, []);

  const beende = useCallback(
    (game: GameState) => {
      const neu = recordGame(stats, game);
      setStats(neu);
      saveStats(neu);
      setErgebnis({ game, archiv: false });
    },
    [stats],
  );

  const tutorialFertig = useCallback(() => {
    aendereEinstellungen({ ...settings, tutorialDone: true });
    zeige({ name: 'home' });
  }, [settings, aendereEinstellungen, zeige]);

  const zumMenue = useCallback(() => {
    setErgebnis(null);
    if (screen.name !== 'home') zeige({ name: 'home' });
  }, [screen.name, zeige]);

  if (!bereit || !schriftBereit) {
    // Erst zeichnen, wenn Daten und Schrift da sind — sonst springt das
    // Layout beim Schriftwechsel sichtbar um.
    return <View style={[styles.root, { backgroundColor: DARK.bg }]} />;
  }

  return (
    <SafeAreaProvider>
      <View style={[styles.root, { backgroundColor: palette.bg }]}>
        <StatusBar style={dunkel ? 'light' : 'dark'} />

        {screen.name === 'home' ? (
          <ScreenFade key={screen.id} testID="screen-home">
            <HomeScreen
              palette={palette}
              dark={dunkel}
              stats={stats}
              heuteGespielt={dailyDone(stats)}
              tagesStand={tagesSpiel}
              hatGespeichertesSpiel={freiesSpiel !== null}
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
              onFinish={() => {}}
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
              onFinish={beende}
              onPersist={(g) => merke(screen.mode === 'daily' ? 'daily' : 'free', g)}
            />
          </ScreenFade>
        )}

        {ergebnis ? (
          <ResultSheet
            key={`${ergebnis.game.mode}-${ergebnis.game.score}-${ergebnis.archiv}`}
            game={ergebnis.game}
            stats={stats}
            palette={palette}
            archived={ergebnis.archiv}
            onAgain={ergebnis.game.mode === 'daily' ? undefined : () => starte(ergebnis.game.mode)}
            onHome={zumMenue}
          />
        ) : null}

        {sheet === 'stats' ? <StatsSheet stats={stats} palette={palette} onClose={() => setSheet(null)} /> : null}
        {sheet === 'settings' ? (
          <SettingsSheet
            settings={settings}
            palette={palette}
            onChange={aendereEinstellungen}
            onClose={() => setSheet(null)}
          />
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
