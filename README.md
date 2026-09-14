# Mein Kleiderschrank

Eine Web-App, um den eigenen Kleiderschrank zu erfassen, Outfits zu kombinieren und zu sehen, was man eigentlich alles besitzt. Läuft ohne Server und ohne Build-Schritt direkt im Browser und lässt sich auf dem iPhone als App installieren.

## Funktionen

**Schrank** – Teile mit Foto, Kategorie, Farbe, Saison, Marke und Notiz erfassen. Suche, Filter nach Kategorie/Farbe/Saison und Sortierung (zuletzt hinzugefügt, A–Z, häufig/selten getragen). Lieblingsstücke markieren.

**Kombinieren** – Pro Kategorie ein Teil aus den Foto-Reihen antippen, mit Live-Vorschau. Der Vorschlags-Button würfelt nicht blind, sondern hält sich an die Regeln, die man beim Anziehen auch anwendet: entweder Kleid oder Oberteil plus Hose, Schuhe immer, Jacke je nach Saison. Teile, die farblich mit der aktuellen Auswahl kollidieren, werden abgeblendet; Hinweise melden fehlende Schuhe oder zu viele kräftige Farben.

**Outfits** – Zusammenstellungen speichern, bearbeiten, favorisieren und mit „Heute getragen" vermerken. Das zählt auch alle enthaltenen Einzelteile mit.

**Übersicht** – Wie viele Teile pro Kategorie, Farbe und Saison, was am häufigsten getragen wird und – oft der interessanteste Teil – welche Teile noch nie an waren.

**Backup** – Über das Zahnrad oben rechts lassen sich alle Daten inklusive Fotos als JSON-Datei sichern und wieder einlesen, etwa beim Gerätewechsel.

## Auf dem iPhone installieren

Die App braucht eine über HTTPS erreichbare URL, damit Safari sie zum Home-Bildschirm hinzufügen kann.

1. **GitHub Pages aktivieren** (einmalig): Im Repo unter *Settings → Pages → Source* auf **GitHub Actions** stellen. Der Workflow `.github/workflows/deploy-pages.yml` deployed die App danach bei jedem Push auf den Default-Branch automatisch.
2. Nach dem ersten erfolgreichen Deploy findest du die URL unter *Settings → Pages* (z. B. `https://<user>.github.io/<repo>/`).
3. Diese URL auf dem iPhone in **Safari** öffnen.
4. Auf das **Teilen-Symbol** tippen → **„Zum Home-Bildschirm"** auswählen.
5. Die App erscheint als Icon auf dem Home-Bildschirm und startet im Vollbild ohne Browser-Leiste.

## Lokal testen

```bash
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen.

## Wo die Daten liegen

Alles wird lokal im Browser gespeichert (IndexedDB), es gibt keinen Server und keine Cloud. Damit gilt:

- Die Daten gehören zu **einem** Gerät und Browser. Für den Umzug auf ein anderes Gerät ist der Export gedacht.
- Fotos werden beim Hinzufügen automatisch auf max. 900 px verkleinert und als JPEG gespeichert, damit auch mehrere hundert Teile handhabbar bleiben.
- Die App fordert beim Start dauerhaften Speicher an, damit iOS die Daten nicht nach längerer Nichtnutzung verwirft. Ein regelmäßiger Export bleibt trotzdem die einzige echte Sicherung.
- Löscht man die Website-Daten in den Safari-Einstellungen, ist der Schrank weg.

## Aufbau

Kein Framework, kein Build-Schritt – die Dateien werden direkt so ausgeliefert:

| Datei | Zweck |
| --- | --- |
| `index.html` | Struktur der vier Tabs und der Dialoge |
| `style.css` | Styling, mobil zuerst, inklusive iPhone-Safe-Areas |
| `js/store.js` | IndexedDB-Zugriff, Migration alter Daten, Export/Import |
| `js/images.js` | Verkleinern und Drehen der Fotos vor dem Speichern |
| `js/app.js` | Oberfläche, Kombinationsregeln, Auswertung |
| `sw.js` | Service Worker für den Offline-Betrieb |
