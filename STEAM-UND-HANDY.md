# Sproutvale auf Steam und auf dem Handy

Diese Anleitung erklärt, was schon vorbereitet ist und was du noch tun musst, sobald das Kleingewerbe da ist.
Alles im Spiel funktioniert auch ohne diese Schritte. Kaufen und Werbung sind nur ausgeblendet.

## Was schon im Spiel steckt

| Bereich | Stand |
|---|---|
| Steam-Erfolge | Das Spiel meldet jeden Erfolg und jeden Pokal an Steam. Beim Start trägt es auch alte Erfolge nach. |
| Liste der Erfolge | `werkzeuge/steam-erfolge.csv`: 150 Erfolge mit Namen in Deutsch, Englisch, Spanisch und Französisch |
| Steam-Status | Im Steam-Freundesfenster steht z.B. "Tag 12 · 3 Rechnungen bezahlt" |
| Unterstützer-Paket | Wird als Steam-DLC erkannt und beim Start automatisch freigeschaltet |
| Gems kaufen | Gem-Shop mit 3 Paketen (100 / 500 / 1.100 Gems für 0,99 / 4,99 / 9,99 €). Ohne Anbieter sind die Knöpfe aus. |
| Handy: Touch | Langes Antippen statt Rechtsklick, Hinweise per langem Antippen, Zoomen mit zwei Fingern im Stellarium |
| Handy: Bildschirm | Die Kopfleiste passt auch auf ein Handy im Querformat |
| Handy: Werbung | Nur freiwillig: Knopf auf der Tageskarte "Werbung ansehen: am nächsten Tag +25% Gold". Höchstens einmal pro Tag, nie im Duo. |

## Steam einschalten

1. Bei Steamworks anmelden (100 $ Gebühr pro Spiel) und die App anlegen. Du bekommst eine **App-ID** (eine Zahl).
2. Im Ordner `desktop-app` einmal ausführen: `npm install steamworks.js`
3. Die App-ID in die Datei `desktop-app/steam_appid.txt` schreiben (nur die Zahl).
4. In Steamworks unter "Statistiken und Errungenschaften" die Erfolge anlegen. Die Namen und Beschreibungen stehen in
   `werkzeuge/steam-erfolge.csv`. Der **API-Name** muss genau so heißen wie in der ersten Spalte (z.B. `GOLD_1`).
   Neu erzeugen geht mit: `desktop-app\node_modules\.bin\electron werkzeuge\steam-erfolge.js`
5. Unterstützer-Paket: in Steamworks ein DLC anlegen und dessen App-ID in `desktop-app/steam.js` bei
   `STEAM_KONFIG.dlc.unterstuetzer` eintragen.
6. Für den Steam-Status ("Rich Presence") in Steamworks den Text `#Status` mit `{#Status}` bzw. `%status%` anlegen.

### Gems auf Steam

Steam kann echtes Geld nur über einen eigenen Server oder über den **Steam-Inventar-Dienst** annehmen.
Vorbereitet ist der Weg über den Inventar-Dienst (kein eigener Server nötig):

1. In Steamworks den Inventar-Dienst einschalten und drei Gegenstände anlegen: `gems_100`, `gems_500`, `gems_1100` mit Preis.
2. Die Gegenstands-Nummern in `desktop-app/steam.js` bei `STEAM_KONFIG.gemPakete` eintragen.
3. Danach öffnet der Kaufen-Knopf das Steam-Overlay mit dem Gegenstand. Die Gutschrift kommt, wenn Steam den Kauf meldet.

## Handy-App (Android und iOS)

Die Handy-App packt das Spiel mit **Capacitor** in eine App. Alles liegt im Ordner `handy-app`.

1. Node.js installieren, dann im Ordner `handy-app`: `npm install`
2. Einmalig die Plattformen anlegen: `npx cap add android` (für iPhone: `npx cap add ios`, braucht einen Mac)
3. App bauen und öffnen: `npm run android` (öffnet Android Studio, dort auf Start drücken)

### Käufe auf dem Handy

1. Konto bei Google Play (einmalig 25 $) bzw. Apple (99 $ pro Jahr) anlegen.
2. Dort drei Produkte anlegen: `gems_100`, `gems_500`, `gems_1100`.
3. Kostenloses Konto bei RevenueCat anlegen, die Produkte verbinden und den Schlüssel in `js/handy.js` bei
   `revenueCatSchluessel` eintragen.

### Werbung auf dem Handy (nur freiwillig)

1. Konto bei Google AdMob anlegen und eine "Belohnungs-Werbung" (Rewarded) erstellen.
2. Die Anzeigen-ID in `js/handy.js` bei `admobBelohnung` eintragen.
3. Die App-ID von AdMob kommt in die Android-Einstellungen (`AndroidManifest.xml`), siehe Anleitung des Plugins
   `@capacitor-community/admob`.

Die Werbung erscheint nur, wenn der Spieler selbst auf den Knopf drückt. Es gibt keine Werbung zwischendurch.

## Was du rechtlich brauchst (kurz)

- Für Verkäufe: Gewerbe, Impressum, Datenschutzerklärung (bei Werbung zusätzlich die Einwilligung nach DSGVO,
  AdMob bringt dafür ein eigenes Fenster mit).
- Steam und die App-Stores kümmern sich um die Mehrwertsteuer im Ausland.
