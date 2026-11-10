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


## Persönliche Spielerkarten

Unter **Einstellungen → Spielerkarte** ein freigestelltes PNG oder WebP auswählen. Transparenz ist erforderlich; die App stellt Fotos nicht selbst frei. Bildgröße und Position lassen sich innerhalb des festen Portraitfensters anpassen. Der waagerechte, kurz weich auslaufende Bildabschluss und die inneren Rahmenbegrenzungen bleiben auf allen Stufen erhalten. Unter **Rekorde → Meine Spielerkarte** ist die aktuelle Karte jederzeit sichtbar.

Nur die acht unpersönlichen Bronze-/Silber-/Gold-/Legende-Vorlagen und das Vereinslogo liegen in `cards/`. Portraits, Ausschnitt, Kartenbereiche, Zeitkonten und der zuletzt gezeigte Stand gehören zum gerätelokalen Trainingszustand und zur privaten Backup-Datei. Keine Portraits oder Trainingsbackups in Git veröffentlichen. Die Fotodatei wird mit Transparenz auf maximal 1000 Pixel Kantenlänge vorbereitet.

### Bewertungsregeln

Alle Werte liegen zwischen 30 und 99. BALL = gerundet 30 + 69 × gemeisterte Drills / Gesamtzahl; 99 erst mit dem letzten Drill. FINT und der Zeitanteil von JONG werden zwischen diesen Minuten-/Rating-Paaren linear interpoliert; die Anzeige verwendet ganze Punkte ohne vorzeitiges Aufrunden:

- FINT: 0/30, 30/40, 120/55, 360/70, 780/85, 1200/95, 1460/99.
- JONG: 0/30, 30/40, 120/50, 600/60, 1800/70, 3600/80, 6600/90, 10200/99.
- FLEISS: Trainingstage/Rating 0/30, 5/40, 20/55, 50/70, 100/85, 180/95, 250/99. Ein vollständig beendeter Satz belegt einen Tag, mehrere Sätze zählen denselben Tag nur einmal. Historische belegte Übungsdurchgänge werden berücksichtigt.

JONG erhält zusätzlich bis zu 15 Leistungspunkte: Pro Technik werden Tagesmaxima gebildet. In jedem Fenster von sechs unterschiedlichen Eintragstagen belegt der vierthöchste Wert die regelmäßige Leistung. Das höchste belegte Fenster zählt; fehlende Tage sind keine Nullen. Nach Korrekturen oder Löschungen wird neu gerechnet. Zwischen den Bonusankern wird kontinuierlich interpoliert: Zehen 0/0, 25/3, 50/6, 100/9, 200/12, 300/15; frei 0/0, 10/3, 25/6, 50/9, 100/12, 200/15. Bei zwei ausgewählten Techniken werden die Boni gemittelt. Gezielte Kontakte tragen Trainingszeit, aber keinen Kontaktbonus bei.

Gesamt: BALL 40 %, JONG 25 %, FINT 15 %, FLEISS 20 %, über die dauerhaft gewählten Kartenbereiche neu normiert. Die Auswahl ist unabhängig vom Wochenplan und wird bei einer Änderung bestätigt. Gesamt 99 setzt 99 in allen einbezogenen Skills voraus. Bronze bis 49, Silber ab 50, Gold ab 70, Legende ab 85. Pausen oder Krankheit senken keinen Wert.

Jonglier- und Fintenzeit wird seit Einführung exakt in Arbeitsphasen erfasst, ohne Countdown, Pause und geschlossene App. Fehlende historische Zeit wird nicht aus heutigen Einstellungen geschätzt. `cardTraining` ergänzt die bisherige Ballzeit; beide bleiben getrennt.

### Enthüllung und Sicherungen

Nach einem Bereichsabschluss laufen stets Gesamt, der betreffende Skill und FLEISS hoch, auch ohne Veränderung. Andere Skills bleiben stehen. Die letzten Einer-Schritte werden langsamer; Änderungen erscheinen erst nach Stillstand. Keine Kartentöne. Änderungen nur an tatsächlich geänderten Skills, niemals unter Gesamt. Bei Datenkorrekturen bleibt die direkte Auf-/Abzählung erhalten. Der Materialaufstieg verwendet die freigegebene Nebelverwandlung der Rückseite. Antippen schließt die Animation sofort ab; reduzierte Bewegung zeigt sofort das Ergebnis.

Der gezeigte Stand wird vor Animationsbeginn gesichert. Tabwechsel und erneutes Öffnen spielen denselben Abschluss nicht nochmals ab und erzeugen keine Trainingszeit. Leseansichten verändern weder Kartenstand noch Daten. Alte Backups ohne neue Kartenfelder bleiben gültig. Nach Wiederherstellung gilt der Kartenstand des jeweiligen Profils.

### Automatische Portraitgröße

Ab Version 2026.11.10.2 passt der Import große Portraits automatisch an die interne Größenbegrenzung an. Zuerst wird WebP in hoher Qualität versucht. Gibt der Browser stattdessen PNG zurück, wird das Bild schrittweise auf passende Abmessungen verkleinert; Transparenz und Seitenverhältnis bleiben erhalten. Beide bereitgestellten Original-PNGs wurden im Cloud-Chrome-Test mit erzwungener PNG-Ausgabe erfolgreich importiert und gespeichert (900 × 822 Pixel). Das ist ein Test des PNG-Fallbacks, kein echter iPhone-Safari-Test.


### Fleiß und Trainingspause (2026.11.10.5)

Fleiß nutzt ab der einmalig gespeicherten Umstellung `diligence.since` die aktive Zeit aller drei Bereiche: pro Datum mit mindestens einem vollständigen Satz bzw. einer vollständig absolvierten Jongliereinheit 0,5 + aktive Millisekunden / 360000 Punkte, maximal 2,5. Countdown, Ruhezeit, Hintergrundzeit und geschlossene App zählen nicht. Bestehende qualifizierte Tage vor der Umstellung bleiben mit je einem Punkt erhalten. Bruchteile werden erst beim sichtbaren Rating abgerundet; die bisherigen Ratinganker 0/30, 5/40, 20/55, 50/70, 100/85, 180/95, 250/99 gelten jetzt für Punkte.

Nach 28 vollständigen, nicht pausierten Kalendertagen wird wöchentlich bewertet. Persönliche Wochen sind je sieben solcher Tage seit der Umstellung. Der Durchschnitt der letzten vier Wochen wird mit 80 % des Medians der positiven Wochenumfänge aus den letzten acht Wochen verglichen. Historische Ein-Punkt-Tage können den Vergleich anfangs stützen. Leere Wochen werden nicht als niedriger Standard verwendet; bei acht leeren Wochen bleibt der letzte positive Vergleich erhalten. Ein Unterschreiten erhöht den Rating-Abzug um eins je vollständiger Woche; ein ausreichender Umfang reduziert ihn um eins. Gesammelte Punkte bleiben erhalten und können diesen Abzug teilweise ausgleichen. Rating mindestens 30, höchstens 99; am Mindestwert sammeln sich keine unsichtbaren zusätzlichen Abzüge an. Auch weit zurückliegende Altbestände erhalten für völlige Inaktivität einen positiven Vergleich statt eines Nullstandards. Dauerhafte Inaktivität senkt damit auch eine zuvor erreichte 99; stabile kleinere positive Umfänge werden allmählich zum neuen Vergleich.

Einstellungen → Trainingspause und Fleiß: offene Pause oder Enddatum einschließlich wählen. Während der Pause sind Trainingsstarts und Fortsetzungen gesperrt, laufende Timer werden angehalten. Pausentage bewegen weder die Wochen noch die Vergleichsfenster. Beenden am selben Tag entfernt den noch nicht verstrichenen Pausentag; ältere Pausentage bleiben gespeichert. Ein Enddatum lässt die Pause am Folgetag automatisch auslaufen. Wochentage/Trainingsgruppen ändern die Fleißregeln nicht. `diligence` und ihre Pausen gehören zum geräteeigenen Backup; Leseansichten verändern sie nicht.

Prüfung: `node tests/diligence.cjs` simuliert Punkteanteile, Tageslimit, mehr Bereiche, Altbestände, 80-%-Grenze, moderates dauerhaftes Training, Spitzenwochen, Trainingsstopp bis zum Mindestwert, Wiederaufnahme, Pausen/Enddatum und ungültige Daten. Die separate Browserprüfung erfolgt mit synthetischen Daten und ohne Dropbox-Anmeldung.
