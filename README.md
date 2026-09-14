# Mein Kleiderschrank

Eine kleine Web-App, um deinen Kleiderschrank digital zu erfassen, Outfits zu kombinieren und zu speichern. Läuft komplett im Browser (Daten werden lokal via `localStorage` gespeichert) und ist als installierbare PWA nutzbar.

## Funktionen

- **Kleiderschrank**: Kleidungsstücke mit Foto, Kategorie, Farbe, Saison und Notiz anlegen, filtern und durchsuchen.
- **Kombinieren**: Pro Kategorie ein Teil auswählen, Live-Vorschau des Outfits, Zufalls-Outfit-Vorschlag.
- **Outfits**: Gespeicherte Kombinationen ansehen, bearbeiten oder löschen.

## Auf dem iPhone installieren

Die App braucht eine über HTTPS erreichbare URL, damit Safari sie zum Home-Bildschirm hinzufügen kann.

1. **GitHub Pages aktivieren** (einmalig): Im Repo unter *Settings → Pages → Source* auf **GitHub Actions** stellen. Der Workflow `.github/workflows/deploy-pages.yml` deployed die App bei jedem Push auf `main` automatisch.
2. Nach dem ersten erfolgreichen Deploy findest du die URL unter *Settings → Pages* (z. B. `https://<user>.github.io/<repo>/`).
3. Diese URL auf dem iPhone in **Safari** öffnen.
4. Auf das **Teilen-Symbol** tippen → **„Zum Home-Bildschirm"** auswählen.
5. Die App erscheint als Icon auf dem Home-Bildschirm und startet im Vollbild ohne Browser-Leiste.

## Lokal testen

```bash
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen.

## Daten

Alle Kleidungsstücke und Outfits werden lokal im Browser gespeichert (`localStorage`). Es gibt keinen Server und keine Cloud-Synchronisierung — die Daten bleiben auf dem jeweiligen Gerät/Browser.
