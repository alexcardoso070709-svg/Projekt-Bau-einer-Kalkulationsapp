# PRISMA

Ein sprachfreies Farb-Merge-Puzzle mit täglichem Rätsel. Offline spielbar,
werbefrei, ohne Konto, ohne Datensammlung.

---

## Das Spiel in einem Absatz

Du lässt Farbsteine in Spalten fallen. Drei gleiche Farben, die sich berühren,
verschmelzen zur nächsten Farbe im Spektrum: Rot → Orange → Gelb → Grün → Blau.
Wer eine größere Gruppe zusammenbekommt, überspringt Stufen — fünf Steine auf
einmal springen zwei, acht sogar drei. Geht ein Aufstieg über Blau hinaus,
zündet ein **Prisma** und reißt alles um sich herum mit. Verschmelzungen lassen
Steine nachrutschen, das löst Ketten aus, und Ketten sind der Punktemotor.

Kein einziges Wort davon steht im Spiel. Farbe und Form erklären alles.

### So fühlt es sich an

- **Zielen statt raten.** Finger aufsetzen zeigt, wo der Stein landen würde;
  verschieben wechselt die Spalte, loslassen wirft. Ein schneller Tipp
  funktioniert trotzdem wie ein Knopfdruck.
- **Nichts wird verschluckt.** Wer während einer Kette schon weiterspielt,
  wird vorgemerkt (bis zu drei Züge), und die laufende Animation beschleunigt.
- **Jede Eingabe hat eine Antwort.** Eine volle Spalte weist sichtbar, hörbar
  und fühlbar ab. Fast volle Spalten glimmen rot an ihrer Oberkante.
- **Wortloses Tutorial.** Beim ersten Start zeigt das Spiel sich selbst in
  drei Zügen: Verschmelzen, Kette, Prisma.

### Drei Modi

| Modus | Was es ist |
|---|---|
| **Tagesrätsel** | 90 Züge, weltweit dieselbe Steinfolge. Einmal am Tag, Ergebnis teilbar. |
| **Endlos** | Bis nichts mehr geht. Für die Bestenjagd. |
| **Zen** | Kein Spielende, unbegrenzt Züge zurücknehmen, Tipp-Knopf. |

---

## Warum es so gebaut ist, wie es gebaut ist

Diese Entscheidungen sind keine Geschmacksfragen — sie folgen aus der Frage,
wie ein Spiel ohne Werbebudget Menschen erreicht.

**Sprachfrei.** Das Spielfeld enthält keinen Text. Ein Build funktioniert in
allen 175 App-Store-Ländern ohne Übersetzung, ohne Lokalisierungskosten, ohne
nachzuziehende Inhalte. Nur der Rahmen (Menü, Statistik) ist übersetzt, derzeit
Deutsch und Englisch.

**Tägliches Ritual statt Endlos-Grind.** Wordle hat bewiesen, dass ein Rätsel
pro Tag mit teilbarem Ergebnis stärker bindet als jede Energie-Leiste. Fast
alle Nachahmer sind aber wortbasiert und damit an eine Sprache gekettet. Ein
sprachfreies Tagesrätsel besetzt diese Lücke.

**Teilbares Emoji-Ergebnis.** Der Wachstumsmotor. Ohne Werbebudget wächst ein
Spiel nur, wenn Menschen von sich aus davon erzählen. Das geteilte Ergebnis ist
ein Emoji-Bild des Endfelds: Es verrät nichts über die Lösung, sieht bei jedem
anders aus und macht neugierig.

**Offline und ohne Datensammlung.** Es gibt keinen Server und kein Konto. In
App Store Connect steht dadurch "Es werden keine Daten erfasst" — heute ein
Verkaufsargument, kein Verzicht.

**Form zusätzlich zur Farbe.** Jede Stufe hat neben ihrer Farbe eine eigene
Form (Kreis, Ring, Quadrat, Raute, Stern). Rund acht Prozent der Männer
unterscheiden Rot und Grün schlecht; ein Spiel, dessen ganze Mechanik auf Farbe
beruht, wäre für sie sonst unspielbar.

**Pentatonische Klänge.** Alle Töne sind synthetisch erzeugt (`scripts/`),
kein Lizenzrisiko. Die Merge-Töne folgen einer pentatonischen Leiter — in ihr
gibt es keine dissonanten Intervalle, also klingt jede Kettenfolge harmonisch,
obwohl niemand vorhersagen kann, welche Töne in welcher Reihenfolge erklingen.
Der Spieler spielt beim Verschmelzen unbewusst eine Melodie. Das Spiel
respektiert den Stummschalter des Geräts und unterbricht laufende Musik nicht.

### Wie die Balance entstanden ist

Die Spielwerte sind nicht geschätzt, sondern erspielt: Eine Simulation hat
tausende Partien mit unterschiedlich guten Strategien durchgerechnet. Sie deckte
zwei Fehler auf, die in keinem Funktionstest aufgetaucht wären:

1. **Prisma war unerreichbar.** Mit sechs Farbstufen kostete ein violetter Stein
   243 Masse-Einheiten, in 60 Zügen fielen aber nur rund 186 an. Der Höhepunkt
   des Spiels kam an 98 von 100 Tagen nicht vor. Gelöst durch fünf statt sechs
   Stufen und 90 statt 60 Züge.
2. **Können zahlte sich kaum aus.** Anfangs lag ein geübter Spieler nur 27
   Prozent vor jemandem, der blind tippt — Glück entschied. Gelöst durch den
   Stufensprung bei großen Gruppen, der Geduld belohnt.

Heutiger Stand (60 simulierte Tagesrätsel):

| Spielweise | Punkte Ø | Tage mit Prisma |
|---|---|---|
| Anfänger (zufällig) | 3.613 | 19 % |
| Geübt | 4.756 | 34 % |

Diese Werte sind als Test hinterlegt (`src/game/__tests__/balance.test.ts`) und
schlagen an, wenn eine spätere Änderung die Balance kippt.

---

## Entwicklung

```bash
npm install
npm start          # Expo starten, dann QR-Code mit Expo Go scannen
npm run web        # im Browser
npm test           # 87 Tests, unter 2 Sekunden
npm run typecheck
```

### Aufbau

```
src/game/      Spiellogik — reines TypeScript, kein React, vollständig getestet
  types.ts       Typen, Stufensprung-Regel
  rng.ts         Deterministischer Zufall (Mulberry32)
  daily.ts       Datum → Rätselnummer → Seed
  board.ts       Ablegen, Schwerkraft, Gruppensuche
  engine.ts      Zugauflösung, Ketten, Punkte
  share.ts       Emoji-Ergebnis
src/ui/        Oberfläche, Gestaltung, Ton und Vibration
  sound.ts       Klangwiedergabe
  feedback.ts    Ton und Vibration gemeinsam ausgelöst
src/storage/   Lokale Speicherung (kein Server)
src/i18n/      Texte (DE/EN)
```

Die Trennung ist bewusst: Die Engine ist frei von React und Plattform-APIs. Sie
läuft in Node, ist in Millisekunden testbar, und dieselbe Logik erzeugt auf
jedem Gerät der Welt bitgenau dasselbe Tagesrätsel.

---

## Premium-Checkliste

Zwölf Ziele, die ein automatischer Browser-Test gegen den echten Build prüft
(`scripts/premium-audit.js`, Aufruf steht im Dateikopf). Ausgangsstand vor der
Überarbeitung: 1 von 12. Heute: **12 von 12**, ohne Konsolenfehler.

| # | Ziel | Gemessen |
|---|---|---|
| 1 | Kein Fehlwurf | Vorschau erscheint beim Halten, folgt dem Finger |
| 2 | Keine Eingabe geht verloren | Drei schnelle Züge zählen alle |
| 3 | Jede Eingabe hat Rückmeldung | Volle Spalte weist sichtbar ab |
| 4 | Flüssig | Keine Blockade des Hauptthreads über 50 ms in 30 Zügen |
| 5 | Ohne ein Wort verstanden | Tutorial ohne Buchstaben, durchspielbar, nur einmal |
| 6 | Tagesrätsel unbestechlich | Abbrechen setzt fort, Erledigtes zeigt das Ergebnis |
| 7 | Weiche Übergänge | Einblendung über mehrere Bilder statt Schnitt |
| 8 | Ergebnis als Höhepunkt | Echte Steine, hochzählende Punkte, Rekordfeier |
| 9 | Spannung sichtbar | Fast volle Spalte warnt, leere nicht |
| 10 | Echte Symbole | Keine Ersatzzeichen wie ‹ ✕ ★ im Bild |
| 11 | Barrierefrei | „Bewegung reduzieren" respektiert, Vorlesetexte übersetzt |
| 12 | Teilen überall | Ohne Teilen-Menü landet das Ergebnis in der Zwischenablage |

Wer das Spiel ändert, lässt den Prüfstand danach erneut laufen.

---

## Weg in den App Store

### Was du dafür brauchst

- **Apple Developer Program**, 99 € im Jahr → https://developer.apple.com/programs/
- **Expo-Konto**, kostenlos → https://expo.dev
- Keinen Mac. EAS baut in der Cloud und lädt direkt hoch.

### Schritt 1 — Bundle-ID festlegen

In `app.json` steht derzeit ein Platzhalter:

```json
"ios":     { "bundleIdentifier": "com.prismapuzzle.app" }
"android": { "package":          "com.prismapuzzle.app" }
```

Ersetze das durch etwas Eindeutiges, üblicherweise nach deiner Domain rückwärts
(`de.deinname.prisma`). **Die ID lässt sich nach der ersten Veröffentlichung
nicht mehr ändern.**

### Schritt 2 — Namen prüfen

„Prisma" ist im App Store möglicherweise vergeben. Such im App Store danach,
bevor du weitermachst. Falls belegt: `name` in `app.json` und den Titel in
App Store Connect ändern — der Code bleibt unberührt.

### Schritt 3 — Bauen

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
```

Der erste Durchlauf fragt nach Zertifikaten — lass EAS sie verwalten, das ist
der unkomplizierteste Weg. Der Build dauert typischerweise 10–20 Minuten.

### Schritt 4 — App in App Store Connect anlegen

Unter https://appstoreconnect.apple.com eine neue App anlegen, dabei dieselbe
Bundle-ID wählen. Die dort vergebene **App-ID** und deine **Team-ID** in
`eas.json` unter `submit.production.ios` eintragen.

### Schritt 5 — Hochladen

```bash
eas submit --platform ios --latest
```

### Schritt 6 — Store-Eintrag ausfüllen

Vorgeschlagene Texte stehen unten. Du brauchst außerdem Screenshots in
6,7 Zoll (1290 × 2796) und 6,5 Zoll (1284 × 2778). Die lassen sich im
iOS-Simulator oder per `npm run web` im Browser bei passender Fenstergröße
aufnehmen.

**Wichtig beim Datenschutz-Fragebogen:** Bei „Datenerfassung" wahrheitsgemäß
**„Es werden keine Daten erfasst"** wählen. Die App sammelt nichts, hat keine
Netzwerkverbindung und keine Analyse-Werkzeuge.

Die Export-Compliance-Frage ist bereits über
`ITSAppUsesNonExemptEncryption: false` in `app.json` beantwortet — das spart
dir die Rückfrage bei **jedem** Upload.

### Schritt 7 — Prüfung

Apple prüft meist innerhalb von 24–48 Stunden. Häufigster Ablehnungsgrund bei
Spielen: fehlende oder irreführende Screenshots. Zeig echtes Spielgeschehen,
keine Marketinggrafiken.

---

## Vorgeschlagene Store-Texte

**Name** (max. 30)
```
Prisma
```

**Untertitel** (max. 30)
```
Das tägliche Farbpuzzle
```

**Schlagwörter** (max. 100 Zeichen, ohne Leerzeichen nach Kommas)
```
puzzle,täglich,offline,farben,denkspiel,rätsel,knobeln,merge,entspannen,werbefrei
```

**Werbetext** (max. 170)
```
Jeden Tag ein neues Rätsel — für alle auf der Welt dasselbe. Ohne Werbung, ohne Konto, ohne Internet. Teile dein Ergebnis, ohne die Lösung zu verraten.
```

**Beschreibung**
```
Lass Farbsteine fallen. Drei gleiche, die sich berühren, werden zur nächsten
Farbe. Größere Gruppen überspringen Stufen. Und wer über Blau hinauskommt,
zündet ein Prisma.

Klingt einfach. Ist es auch — in fünf Sekunden verstanden, ohne ein Wort
Erklärung. Gut zu werden dauert länger.

DAS TAGESRÄTSEL
Jeden Tag ein neues Spielfeld, weltweit für alle gleich. 90 Züge, dieselben
Steine in derselben Reihenfolge. Die Frage ist nur, wer mehr daraus macht.
Teile dein Ergebnis als Farbmuster — es verrät nichts über die Lösung.

ENDLOS
Spiel weiter, bis kein Zug mehr möglich ist. Für die Bestenjagd.

ZEN
Kein Spielende, kein Zeitdruck. Züge beliebig zurücknehmen. Für zwischendurch.

KLANG UND GEFÜHL
Jede Verschmelzung klingt eine Stufe höher als die vorige. Weil die Töne einer
pentatonischen Leiter folgen, klingt jede Kette harmonisch — du spielst beim
Puzzeln nebenbei eine Melodie. Das Spiel respektiert deinen Stummschalter und
unterbricht deine Musik nicht.

WAS NICHT DRIN IST
Keine Werbung. Keine Käufe. Keine Energie-Leisten, die dich zum Warten zwingen.
Kein Konto. Keine Datensammlung. Die App braucht kein Internet — im Flugzeug,
in der U-Bahn und im Funkloch funktioniert sie genauso.

Alles bleibt auf deinem Gerät.

BARRIEREFREI
Jede Farbe hat zusätzlich eine eigene Form. Wer Farben schlecht unterscheidet,
erkennt die Steine an Kreis, Ring, Quadrat, Raute und Stern.
```

**Kategorie:** Spiele → Puzzle (zweitrangig: Gelegenheitsspiele)
**Altersfreigabe:** 4+

---

## Ehrliche Einordnung

Was geprüft ist:

- 87 automatisierte Tests, darunter Wächter für die Spielbalance, die
  Serienzählung und die Eindeutigkeit jedes Tutorial-Schritts
- Die Premium-Checkliste besteht vollständig im Browser
- Das Tagesrätsel erzeugt nachweislich auf jedem Gerät dieselbe Steinfolge
  und lässt sich weder neu starten noch nachträglich verbessern

Was noch aussteht:

- **Kein Test auf echter iOS- oder Android-Hardware.** Vibration und
  Fall-Animationen laufen im Browser anders als auf dem Gerät. Vor dem
  Hochladen mit Expo Go auf einem echten Telefon durchspielen.
- **Die Klänge sind nicht abgehört.** Sie wurden rechnerisch erzeugt und auf
  Übersteuerung, Knacken und Pegelverhältnis geprüft, aber nie angehört. Hör
  sie einmal mit Kopfhörern durch; die Erzeugung liegt in `scripts/klang.py`
  und lässt sich in Sekunden neu abstimmen.
- **Der Name ist ungeprüft** (siehe Schritt 2).

Und eine Erwartung geradegerückt: Ob eine App in die Charts kommt, hängt an
Timing, an einer möglichen Empfehlung durch Apple und an Glück. Garantieren
lässt sich das nicht. Was hier steht, ist ein Spiel, das technisch und
gestalterisch auf diesem Niveau spielt und die Wachstumsmechanik eingebaut
hat — den Rest entscheidet der Markt.
