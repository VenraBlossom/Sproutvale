# Sproutvale: Hinweise für Claude

Idle-Farmspiel in Vanilla JS, Desktop-App mit Electron (`desktop-app/`), Handy-App mit Capacitor (`handy-app/`).
Gearbeitet wird im Branch **Beta**.

## Wie ich mit dem Nutzer arbeite

- Antworten immer auf **Deutsch**, in einfacher Sprache, **keine Gedankenstriche**.
- Format: **Problem / Lösung**, eigene Zusätze ausdrücklich nennen.
- Selbstständig arbeiten, nicht bei jeder Kleinigkeit nachfragen.
- Nach jeder fertigen Aufgabe: committen und auf `origin Beta` pushen, danach kurz berichten, was gemacht wurde.
- **Nicht veröffentlichen** (keine neue Version, kein Tag, kein Release), außer der Nutzer sagt ausdrücklich "publish".
- Der Nutzer hat noch kein Kleingewerbe, darum gibt es noch keine offiziellen Verkäufe. Auf itch liegt Beta 0.4.2.

## Regeln im Code

- Die Datei `changes_ignore.txt` nie lesen und nie hochladen.
- Neue Texte immer über `t("...")` bzw. `tf("... {0}", wert)`, und zwar als **ganzer Satz mit Platzhaltern**, nie aus Stücken
  zusammengesetzt (`t("Noch ") + n + t(" Tage")` geht in Japanisch, Türkisch usw. nicht). Übersetzungen in **alle 14** Dateien
  `js/sprache-xx.js` eintragen (en, es, fr, it, pt, nl, pl, tr, ru, uk, ja, zh, ko). Fehlt eine, erscheint Englisch.
- Prüfen mit `node werkzeuge/pruefe-uebersetzung.js` (`--sprache=ja` nur eine Sprache, `--aufraeumen` löscht veraltete Einträge).
- Tresor testen (ohne Electron): `node werkzeuge/teste-tresor.js`. Neue Texte in alle Sprachen: `node werkzeuge/uebersetzung-eintragen.js texte.json`.
- `desktop-app/geheim.txt` (Schlüssel für den Tresor mit Käufen und Gems) nie hochladen, nie ändern, nie löschen.
- Debug-Menü nur zum Testen: `DEBUG_ERLAUBT = true` in `js/daten.js`, vor dem Commit wieder `false`.
- Sterne im Stellarium haben feste Positionen (`STERN_POSITIONEN`). Nach Änderungen `pruefeSternbild()` prüfen
  (keine Linie durch andere Sterne). Unendliche Sterne stehen am Ende ihres Asts.
- **Gold- und Sternensamen-Boni werden zusammengezählt, nicht malgenommen** (`goldMulti`, `sternWertMulti` in `js/script.js`).
  Das gilt auch für Mondlicht (+25% pro Stufe) und die Pokale (Holz +50%, Gold +100%, Platin +200%, Kristall +400%).
- Level geben **keine** Spielvorteile, nur Auren.
- Die Liste der **erspielbaren** Kosmetik nicht ändern.
- Spielstand als Datei sichern/laden **nicht** zurückholen (wurde bewusst entfernt).
- Pokale dürfen auf andere Rechnungen verschoben werden, aber nie auf einen Kredit (jede 3. Rechnung ist ein Kredit).

## Balancing (offene Hauptaufgabe)

Simulation starten (im Projektordner, vorher einmal `cd desktop-app && npm ci`):

```
RUNS=8 TAGE=70 KPS=4 desktop-app/node_modules/.bin/electron werkzeuge/sim-electron.js > _sim-log.txt
```

- Ausgabe: eine `TAG`-Zeile pro Tag (gold, naechste, energie, spielMin, gm, sm, ...) und eine `RUN`-Zeile pro Run.
- Varianten ohne Code-Änderung testen: `PATCH=_patch.js` (JS, das vorher im Spiel läuft), eigene Dateinamen mit `NAME=_sim-x`.
- Der Bot steht in `werkzeuge/balancing-bot.js`. Er kauft 3x Ertrag für jede neue Pflanze, sonst bleibt die nächste gesperrt.

**Ziele** für die Spielzeit inklusive Neustarts:

| Pokal | Rechnung | Ziel |
|---|---|---|
| Holz | 4. | 45 bis 55 Min |
| Gold | 7. | etwa 2,5 Std |
| Platin | 10. | etwa 5,5 Std |
| Kristall | 14. | 10 bis 15 Std |

Der Nutzer will lieber "etwas weniger Gold, etwas günstigere Rechnungen" als nur teurere Rechnungen.

**Neueste Messung (22.10.2026, 14 Runs geplant, nach 2 bis 3 Runs abgebrochen):**

- Ohne Änderung: Holz 28 Min (zu früh), Gold 2 Std 21 Min (passt), Platin 3 Std 35 Min (zu früh, Run 2 schafft 10 Rechnungen).
- 20% weniger Gold + spätere Rechnungen x23 (Patch `goldMulti` x0.8, `KONFIG.rechnungFaktor = 23`): Holz 51 Min (passt),
  Gold nach 1 Std 42 Min noch nicht erreicht. 25% weniger Gold + x22: Holz 49 Min. Nur die 4. Rechnung teurer: bringt nichts (29 Min).
- Zeiten ohne Änderung je Rechnung: 4. 28 Min, 5. 38 Min, 7. 2 Std 21 Min, 10. 3 Std 35 Min (Run 2 scheitert an der 11.).
- Fertig vorbereitet: `werkzeuge/varianten/pokale-spaeter.js` (Holz 5., Platin 11. Rechnung, ohne Gold-/Preisänderung).
  Start- und Auswertungsbefehl stehen in der Datei. Erst nach Erlaubnis des Nutzers laufen lassen (Electron).
- Idee für den nächsten Versuch: frühes Gold etwas weniger (Holz später), spätere Rechnungen leicht teurer oder Pokale später,
  damit Platin bei etwa 5,5 Std liegt. Läufe brauchen mehrere Stunden. Der Nutzer will nicht, dass ungefragt Electron auf seinem PC läuft.

**Ältere Messung** (nach Mondlicht und Pokalen zum Zusammenzählen, Läufe nicht fertig):

- Variante A, Pokale wie im Code: Holz nach etwa 28 Min, Gold nach etwa 2 Std. Platin und Kristall noch nicht erreicht.
- Variante B, Pokale später (Gold 8., Platin 13., Kristall 17. Rechnung): Gold nach etwa 3,5 Std.
  Jeder Run kommt nur noch 1 bis 2 Rechnungen weiter als der davor.
- Run 1 endet meist an der 5. Rechnung (1,87 Mio.).
- **Nächster Schritt:** Läufe bis Platin und Kristall fertig laufen lassen, dann die Pokal-Plätze bzw. Werte festlegen.

## Was zuletzt gemacht wurde (Oktober 2026, Vorbereitung Steam-Release)

- **14 Sprachen**: neu Italienisch, Portugiesisch (Brasilien), Niederländisch, Polnisch, Türkisch, Russisch, Ukrainisch,
  Japanisch, Chinesisch (vereinfacht), Koreanisch. Beim ersten Start wird die Systemsprache genommen.
  Schriften für Kyrillisch und Asiatisch kommen als Systemschrift-Ersatz (`html[lang=..]` in `css/style.css`).
  Rund 500 zusammengesetzte Texte wurden zu ganzen Sätzen mit `tf()` umgebaut (Erfolge, Tarot, Kuscheltiere, Tageskarte usw.).
- **Tresor für Käufe** (`desktop-app/tresor.js`, `js/tresor.js`): Gems, gekaufte Skins, Unterstützer-Paket und Codes liegen
  verschlüsselt in `save/tresor.dat` (+ `tresor.bak`), nicht im Spielstand. Steam-DLC wird bei jedem Start geprüft.
- Promocode **BETAVALE**: Beta-Tester-Begleiter, BETA-Shirt und Endlos. Alter Code und BETA-Knopf sind weg.
- Debug-Menü aus (`DEBUG_ERLAUBT`), Entwickler-Werkzeuge im Release aus.
- `npm run steam` (in `desktop-app`) baut die Steam-Version nach `dist-steam/Sproutvale` (Spiel als asar, kein Updater).
- Markt: Kaufmenge x1 / x10 / Max, Stellarium: mehrere Stufen auf einmal.
- Gem-Shop bleibt, bis die Steamworks-Sachen da sind. Details in `STEAM-UND-HANDY.md`.

## Für die nächsten Neuigkeiten (erst bei "publish" in `NEUIGKEITEN` in `js/daten.js` eintragen)

- 10 neue Sprachen, Systemsprache beim ersten Start.
- Markt: Kaufmenge x1 / x10 / Max, Stellarium: mehrere Stufen auf einmal.
- Käufe und Gems sicher im Tresor, Promocode BETAVALE.
- VIP-Karte: +5 Spiele pro Pause statt unbegrenzt.
- Fehler behoben: Segen Sammelwut wirkte nicht, falsche Texte.

## Offen

- Steamworks: App-ID, Erfolge (`werkzeuge/steam-erfolge.csv`), DLC, Gem-Pakete eintragen, dann Gem-Shop fertig machen.
- Beta-Sachen (BETAVALE, Beta-Hinweise) später vor dem richtigen Release herausnehmen.
- Balancing (siehe oben). Glücksspiel: VIP-Karte ist jetzt +5 Spiele pro Pause; Münzwurf bis 70% bleibt eine starke Gold-Quelle.
- Duo läuft über den öffentlichen PeerJS-Server ohne TURN (siehe `STEAM-UND-HANDY.md`), für Steam besser Steam Networking.
- Shop-Texte für Steam: `STEAM-SHOPTEXTE.md`.
- Übersetzungen von Muttersprachlern gegenlesen lassen (vor allem Japanisch, Chinesisch, Koreanisch, Türkisch).

## Ideen für danach

- Weitere Sprachen (z.B. Spanisch für Lateinamerika, Vietnamesisch, Thai): gleich aufbauen wie `js/sprache-it.js`, in `js/i18n.js` bei `SPRACHEN` eintragen.
- Handy-App bauen und auf einem echten Gerät testen.
- Nur die gewählte Sprachdatei laden statt aller 14 (2,8 MB, vor allem fürs Handy). Ändert den Spielstart, darum mit Test.
- Allgemein: Quality-of-Life verbessern und neue Inhalte, ohne die erspielbare Kosmetik zu ändern.
