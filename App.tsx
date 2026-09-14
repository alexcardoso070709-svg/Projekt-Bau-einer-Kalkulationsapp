/**
 * PRISMA — Einstiegspunkt.
 *
 * Hält den Bildschirmwechsel und die gespeicherten Daten zusammen. Bewusst
 * ohne Navigations-Bibliothek: Bei vier Ansichten wäre sie mehr Ballast als
 * Hilfe, und jede eingesparte Abhängigkeit ist eine Fehlerquelle weniger
 * und ein schnellerer Start.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createGame } from './src/game/engine';
import { GameState, Mode } from './src/game/types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  Settings,
  Stats,
  currentStreak,
  dailyDone,
  loadGame,
  loadSettings,
  loadStats,
  recordGame,
  saveGame,
  saveSettings,
  saveStats,
} from './src/storage/store';
import { setHaptics } from './src/ui/haptics';
import { DARK, LIGHT } from './src/ui/theme';
import { GameScreen } from './src/ui/screens/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { ResultSheet } from './src/ui/screens/ResultSheet';
import { HowToSheet, SettingsSheet, StatsSheet } from './src/ui/screens/Sheets';

type Screen = { name: 'home' } | { name: 'game'; mode: Mode; fortsetzen?: GameState };
type SheetName = 'stats' | 'settings' | 'howto' | null;

export default function App() {
  const systemTheme = useColorScheme();
  const [bereit, setBereit] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [sheet, setSheet] = useState<SheetName>(null);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ergebnis, setErgebnis] = useState<GameState | null>(null);
  const [gespeichert, setGespeichert] = useState<GameState | null>(null);

  // Einmalig beim Start laden.
  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      const [s, e, g] = await Promise.all([loadStats(), loadSettings(), loadGame()]);
      if (abgebrochen) return;
      // Serie zurücksetzen, falls ein Tag ausgelassen wurde.
      setStats({ ...s, streak: currentStreak(s) });
      setSettings(e);
      setHaptics(e.haptics);
      setGespeichert(g);
      setBereit(true);
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const dunkel =
    settings.theme === 'auto' ? systemTheme !== 'light' : settings.theme === 'dark';
  const palette = dunkel ? DARK : LIGHT;

  const aendereEinstellungen = useCallback((neu: Settings) => {
    setSettings(neu);
    setHaptics(neu.haptics);
    saveSettings(neu);
  }, []);

  const starte = useCallback((mode: Mode) => {
    setErgebnis(null);
    setGespeichert(null);
    saveGame(null);
    setScreen({ name: 'game', mode });
  }, []);

  const setzeFort = useCallback(() => {
    if (!gespeichert) return;
    setErgebnis(null);
    setScreen({ name: 'game', mode: gespeichert.mode, fortsetzen: gespeichert });
  }, [gespeichert]);

  const beende = useCallback(
    (game: GameState) => {
      const neu = recordGame(stats, game);
      setStats(neu);
      saveStats(neu);
      setGespeichert(null);
      setErgebnis(game);
    },
    [stats],
  );

  const merkeSpielstand = useCallback((game: GameState | null) => {
    setGespeichert(game);
    saveGame(game);
  }, []);

  const zurueckZumMenue = useCallback(() => {
    setErgebnis(null);
    setScreen({ name: 'home' });
  }, []);

  if (!bereit) {
    // Kurzer, ruhiger Startbildschirm statt eines Ladebalkens — die Daten
    // sind in aller Regel in wenigen Millisekunden da.
    return <View style={[styles.root, { backgroundColor: DARK.bg }]} />;
  }

  return (
    <SafeAreaProvider>
      <View style={[styles.root, { backgroundColor: palette.bg }]}>
        <StatusBar style={dunkel ? 'light' : 'dark'} />

        {screen.name === 'home' ? (
          <HomeScreen
            palette={palette}
            stats={stats}
            heuteGespielt={dailyDone(stats)}
            hatGespeichertesSpiel={gespeichert !== null}
            showShapes={settings.colorAssist}
            onStart={starte}
            onResume={setzeFort}
            onStats={() => setSheet('stats')}
            onSettings={() => setSheet('settings')}
            onHowTo={() => setSheet('howto')}
          />
        ) : (
          <GameScreen
            // Der Schlüssel erzwingt einen frischen Bildschirm pro Partie —
            // sonst bliebe der Zustand der vorigen Runde hängen.
            key={`${screen.mode}-${screen.fortsetzen?.seed ?? 'neu'}-${ergebnis ? 'e' : 'l'}`}
            mode={screen.mode}
            palette={palette}
            settings={settings}
            initialGame={screen.fortsetzen ?? null}
            onExit={zurueckZumMenue}
            onFinish={beende}
            onPersist={merkeSpielstand}
          />
        )}

        {ergebnis ? (
          <ResultSheet
            game={ergebnis}
            stats={stats}
            palette={palette}
            onAgain={() => starte(ergebnis.mode)}
            onHome={zurueckZumMenue}
          />
        ) : null}

        {sheet === 'stats' ? (
          <StatsSheet stats={stats} palette={palette} onClose={() => setSheet(null)} />
        ) : null}
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
          />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
