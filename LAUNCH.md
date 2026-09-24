# Irisa – Launch-Checkliste

Was erledigt ist, ist abgehakt. Was offen ist, kann nur der Inhaber tun: Konten anlegen, Namen und Daten eintragen, einreichen.

## Erledigt
- [x] Spiel, Tutorial, Ton, Barrierefreiheit – Prüfstand `scripts/premium-audit.js`: 16/16
- [x] 102 automatische Tests, laufen in Berliner Zeit (Sommerzeit wird mitgeprüft)
- [x] Native Bibliotheken exakt auf Expo SDK 57; iOS-, Android- und Web-Bundle bauen; `expo prebuild` ohne Warnung
- [x] GitHub Actions prüft jeden Push (Typen, Tests, Versionsabgleich, alle Bundles)
- [x] App-Icon 1024×1024 ohne Alphakanal (Apple-Vorgabe), Android-Icons, Startbild
- [x] Sprachen Deutsch/Englisch hinterlegt; Export-Compliance beantwortet
- [x] Store-Texte DE/EN: `store/listing.de.md`, `store/listing.en.md`
- [x] Screenshots in Pflichtgrößen, DE/EN: `store/screenshots/` (iPhone 6,9" 1320×2868 · iPad 13" 2064×2752 · Android 1080×2340); neu erzeugen mit `scripts/store-screenshots.js`
- [x] Datenschutz (DE/EN), Support-Seite, Impressum-Vorlage: `docs/`

## Offen – nur du kannst das
1. **Name absichern.** „Irisa" war in der Websuche als App frei. Vor dem Einreichen im Markenregister prüfen: DPMA (register.dpma.de), EUIPO (euipo.europa.eu/eSearch), Klasse 9 und 41.
2. **Konten.** Apple Developer Program (99 €/Jahr), Google Play Console (einmalig 25 $), Expo-Konto (kostenlos).
3. **Platzhalter ausfüllen.**
   - `docs/impressum.html`, `docs/datenschutz.html`, `docs/privacy.html`, `docs/index.html`: Name, Anschrift, E-Mail
   - `eas.json` → `submit.production.ios`: Apple-ID, App-Store-Connect-App-ID, Team-ID
   - `app.json`: Bundle-ID `com.irisagame.app` – ändern, falls bei Apple/Google schon vergeben (danach unveränderlich!)
4. **Webseiten veröffentlichen.** GitHub → Settings → Pages → Branch `main` (nach dem Zusammenführen), Ordner `/docs`. Die Adresse ist Support- und Datenschutz-URL.
5. **Auf echten Geräten testen.** `npx expo start` → mit Expo Go scannen, oder `eas build --profile preview`. Einmal komplett durchspielen: Ton, Vibration, Zurück-Taste (Android), Stummschalter (iPhone).
6. **Bauen und einreichen.**
   ```
   npm install -g eas-cli && eas login
   eas build --platform all --profile production
   eas submit --platform ios --latest
   eas submit --platform android --latest
   ```
7. **Store-Formulare** – Antworten stehen in `store/listing.de.md` (Datenschutz: „keine Daten erfasst", Alter 4+, keine Werbung, keine Käufe).
8. **Nach der Freigabe:** Store-Link in `src/brand.ts` bei `STORE_URL` eintragen – ab dem nächsten Update enthält jedes geteilte Ergebnis den Download-Link.

## Bewusst nicht enthalten
- Kein Konto, keine Cloud-Synchronisierung, keine Werbung, keine Käufe. Ein späteres Premium-Paket ließe sich nachrüsten.
