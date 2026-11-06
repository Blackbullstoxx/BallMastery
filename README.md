# Mein Fußballtraining · BallMastery

Browserbasierte Trainings-App mit Ballbeherrschung, Finten, Jonglieren, Timern, Rekorden und Dropbox-Sicherungen.

## GitHub Pages aktivieren

1. Diese Dateien und `.nojekyll` direkt in die oberste Ebene des Repositorys `Blackbullstoxx/BallMastery` hochladen. `index.html` liegt neben dieser README, nicht in einem zusätzlichen Ordner.
2. In GitHub **Settings → Pages → Build and deployment** öffnen.
3. **Source: Deploy from a branch**, **Branch: main**, **Folder: / (root)** wählen und speichern.
4. Warten, bis GitHub unter Pages den veröffentlichten Link anzeigt. Diesen Link verwenden.

## Vor dem Geräteumzug

- Auf jedem Gerät in der bisherigen App eine aktuelle Sicherung erstellen und zusätzlich als Backupdatei auf dem Gerät sichern.
- Neue Adresse zuerst separat öffnen; bisherige App und ihr Homebildschirm-Symbol zunächst behalten.
- Vorhandene Trainingsdaten einmal in der neuen App wiederherstellen. Daten wandern beim Adresswechsel nicht automatisch mit.
- Dropbox dort neu verbinden und den passenden vorhandenen Sicherungsstand wählen; nicht versehentlich einen fremden Trainingsordner zum Weitersichern übernehmen.
- Erst nach Prüfung das neue Homebildschirm-Symbol hinzufügen. Safari und die Homebildschirm-App können getrennte Speicher haben; den Datenstand auch im endgültigen Homebildschirm-Aufruf prüfen und dort nötigenfalls wiederherstellen/verbinden.

## Offline testen

- App zunächst mit Internet öffnen. Im Fußbereich muss **App offline bereit** stehen.
- App schließen; Flugmodus einschalten und WLAN ebenfalls ausschalten.
- App über ihr endgültiges Homebildschirm-Symbol erneut starten. Übungen, Einstellungen und Rekorde müssen verfügbar sein. Einen Timer mit Ton testen und einen Testwert nach erneutem Öffnen prüfen.
- Dropbox-Sicherung und Videos benötigen Internet. Farberkennung separat im Flugmodus testen; deren Offline-Fähigkeit hängt vom Gerät und Browser ab.
- Browserdaten und Offline-Dateien können vom Benutzer oder Betriebssystem entfernt werden. Der Cache ersetzt kein Backup.

## Updates

- Aktualisierte Projektdateien wieder an derselben Stelle hochladen. Benutzername, Repositoryname und HTTPS-Adresse beibehalten.
- `sw.js` gehört zu jedem Update. Seine Releasekennung wird beim Erstellen des Pakets aus den App-Dateien erzeugt.
- Eine neue Version wird vollständig heruntergeladen, bevor sie als Offline-Version installiert wird.
- Kein automatisches Neuladen mitten im Training: vorhandene App-Fenster und Safari-Tabs schließen, damit ein bereitstehendes Update aktiv werden kann. Nach einem Upload gegebenenfalls einmal online öffnen, dann alle App-Fenster schließen und wieder öffnen.
- Manuelle Änderungen an App-Dateien erfordern auch eine neue eindeutige Releasekennung in `sw.js`. Andernfalls könnte die bisherige Offline-Version weiterlaufen.

## Daten und öffentliche Inhalte

Trainingsdaten liegen im Browserspeicher des jeweiligen Geräts; Sicherungen liegen in der verbundenen Dropbox. Das Repository enthält keine persönlichen Trainingsbackups und keine Dropbox-Zugangstoken. Der öffentliche Dropbox-App-Key ist eine Anwendungskennung, kein Zugangsschlüssel.

Die Videos werden über die auf dem Gerät autorisierte Dropbox-Verbindung geladen. Die aktuelle App enthält Dateipfade, aber keine dauerhaft öffentlichen Video-Freigabelinks. Beim Laden entsteht ein temporärer Abspiellink. Ohne passende Dropbox-Verbindung gibt es keinen Zugriff. Alte Freigabelinks aus dem Git-Verlauf bleiben unabhängig davon gültig, bis sie in Dropbox deaktiviert werden. Bereits heruntergeladene Kopien lassen sich nicht zurückholen.

## Technik

Statische HTML-/CSS-/JavaScript-Dateien, kein Build und kein eigener Server nötig. `manifest.webmanifest` und `sw.js` verwenden relative Pfade für GitHub-Projektseiten. Der Service Worker speichert nur die App-Dateien; Dropbox, Videos und Trainingsdaten werden nicht in den App-Cache aufgenommen.

Exportbasis: veröffentlichter App-Stand 89, Quellstand `0501c59abae4dc8f2cf7a85239edeacb79b93263`. Für GitHub wurden Startpfad und Offline-Unterstützung ergänzt. Die bisherige veröffentlichte App wird dadurch nicht geändert.

## Private Videos testen und alte Freigaben beenden

1. Aktualisierte Dateien hochladen und die erfolgreiche Pages-Veröffentlichung abwarten.
2. App online öffnen, danach alle App-Fenster und zugehörigen Safari-Tabs schließen und erneut öffnen, um die neue Offline-Version zu aktivieren.
3. Dropbox verbunden lassen. Videos stehen unter `/Videos/Ball Mastery/...` und `/Videos/Moves/...`, relativ zum Dropbox-App-Ordner.
4. Vor dem Training oder in der Videoliste auf **Video laden** tippen. Auf iOS nötigenfalls danach im Player auf Play tippen.
5. Je ein Video aus Anfänger, Fortgeschrittene, Könner, Meister sowie Richtungswechsel, Stops und Starts und Finten prüfen. Bild, Ton und Spulen testen. Anschließend auf jedem Familiengerät prüfen.
6. In einer privaten Browseransicht ohne Dropbox-Verbindung darf sich kein Video laden lassen. Die App-Dateien dürfen weiterhin sichtbar sein.
7. Erst nach erfolgreichem Test in Dropbox den öffentlichen Link des Ordners Videos und alle separat erzeugten öffentlichen Videolinks löschen. Nicht die Videos oder Ordner löschen und nicht die App-Verbindung widerrufen.
8. Alte Freigabelinks danach in einer privaten Browseransicht testen: Es darf kein Zugriff mehr möglich sein. Die neue App muss Videos weiterhin abspielen.

Ein temporärer Link kann während seiner Gültigkeit weitergegeben werden; berechtigte Nutzer können Inhalte speichern. Eine fehlende Datei, Offline-Zustand oder eine abgelaufene Verbindung führen zu einer Fehlermeldung mit erneutem Ladeversuch, nie zum Rückfall auf einen öffentlichen Link. Zugangsdaten und temporäre Links werden weder in das Repository noch in Trainingsbackups geschrieben. Alte Trainingsbackups können noch frühere öffentliche Links enthalten, die die neue Videowiedergabe ignoriert. Die Offline-Speicherung enthält ausschließlich App-Dateien und Pfad-Metadaten, keine Videodateien.

