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
- Neue Texte immer über `t("...")` bzw. `tf("... {0}", wert)`. Übersetzungen in `js/sprache-en.js`, `js/sprache-es.js`, `js/sprache-fr.js`
  eintragen. Fehlt Spanisch oder Französisch, erscheint Englisch.
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

**Letzte Messung** (nach Mondlicht und Pokalen zum Zusammenzählen, Läufe nicht fertig):

- Variante A, Pokale wie im Code: Holz nach etwa 28 Min, Gold nach etwa 2 Std. Platin und Kristall noch nicht erreicht.
- Variante B, Pokale später (Gold 8., Platin 13., Kristall 17. Rechnung): Gold nach etwa 3,5 Std.
  Jeder Run kommt nur noch 1 bis 2 Rechnungen weiter als der davor.
- Run 1 endet meist an der 5. Rechnung (1,87 Mio.).
- **Nächster Schritt:** Läufe bis Platin und Kristall fertig laufen lassen, dann die Pokal-Plätze bzw. Werte festlegen.

## Was zuletzt gemacht wurde (Oktober 2026)

- Spanisch und Französisch komplett übersetzt.
- Touch-Bedienung:
  - Langes Antippen wirkt wie ein Rechtsklick.
  - Zoomen mit zwei Fingern im Stellarium.
  - Einsammeln durch Wischen (`pointermove`). Das ist auf einem echten Gerät noch ungetestet.
  - Auf Touch-Geräten sagen die Texte "Finger" statt Maus.
- Kompakte Kopfleiste für kleine Bildschirme.
- "Weniger Partikel und Animationen" stoppt auch JS-Animationen, Figur und Begleiter bewegen sich weiter.
- Hinweise bei Haus und Scheune erscheinen nur über dem Gebäude selbst.
- Steam und Handy vorbereitet: Steam-Erfolge, Gem-Shop (`js/kasse.js`), Handy-Brücke (`js/handy.js`),
  freiwillige Werbung. Details stehen in `STEAM-UND-HANDY.md`.

## Ideen für danach

- Weitere Sprachen: Italienisch, Portugiesisch und andere. Gleich aufbauen wie `js/sprache-es.js`.
- Handy-App bauen und auf einem echten Gerät testen.
- Allgemein: Quality-of-Life verbessern und neue Inhalte, ohne die erspielbare Kosmetik zu ändern.
