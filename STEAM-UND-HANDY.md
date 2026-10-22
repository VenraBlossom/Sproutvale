# Sproutvale auf Steam und auf dem Handy

Diese Anleitung erklärt, was schon vorbereitet ist und was du noch tun musst, sobald das Kleingewerbe da ist.
Alles im Spiel funktioniert auch ohne diese Schritte. Kaufen und Werbung sind nur ausgeblendet.

## Was schon im Spiel steckt

| Bereich | Stand |
|---|---|
| Steam-Erfolge | Das Spiel meldet jeden Erfolg und jeden Pokal an Steam. Beim Start trägt es auch alte Erfolge nach. |
| Liste der Erfolge | `werkzeuge/steam-erfolge.csv`: alle Erfolge mit Namen in allen 14 Sprachen (Spalten heißen wie in Steamworks: german, english, schinese, ...) |
| Sprachen | Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch (Brasilien), Niederländisch, Polnisch, Türkisch, Russisch, Ukrainisch, Japanisch, Chinesisch (vereinfacht), Koreanisch. Beim ersten Start nimmt das Spiel die Sprache des Systems. |
| Käufe sicher | Gems, gekaufte Skins, Unterstützer-Paket und Codes liegen verschlüsselt im Tresor (`save/tresor.dat`), nicht im Spielstand. Das Spiel selbst kann sie nur lesen und ausgeben. Das Steam-DLC wird bei jedem Start neu geprüft. |
| Debug-Menü | Aus. Zum Testen in `js/daten.js` `DEBUG_ERLAUBT = true` setzen (nie so veröffentlichen). |
| Steam-Status | Im Steam-Freundesfenster steht z.B. "Tag 12 · 3 Rechnungen bezahlt" |
| Unterstützer-Paket | Wird als Steam-DLC erkannt und beim Start automatisch freigeschaltet |
| Gems kaufen | Gem-Shop mit 3 Paketen (100 / 500 / 1.100 Gems für 0,99 / 4,99 / 9,99 €). Ohne Anbieter sind die Knöpfe aus. |
| Handy: Touch | Langes Antippen statt Rechtsklick, Hinweise per langem Antippen, Zoomen mit zwei Fingern im Stellarium |
| Handy: Bildschirm | Die Kopfleiste passt auch auf ein Handy im Querformat |
| Handy: Werbung | Nur freiwillig: Knopf auf der Tageskarte "Werbung ansehen: am nächsten Tag +25% Gold". Höchstens einmal pro Tag, nie im Duo. |

## Steam-Version bauen

Im Ordner `desktop-app`: `npm run steam`. Das Ergebnis liegt in `desktop-app/dist-steam/Sproutvale` und wird mit SteamPipe hochgeladen.
Die Steam-Version hat keinen eigenen Updater (Updates macht Steam), keine Entwickler-Werkzeuge und das Spiel ist in eine Datei gepackt.

**Wichtig: `desktop-app/geheim.txt`** ist der Schlüssel für den Tresor (Käufe und Gems).
- Nie ins Repository hochladen (steht in `.gitignore`).
- Nie ändern und nicht löschen, sonst können Spieler ihre Käufe nicht mehr lesen.
- Unbedingt sicher aufbewahren (z.B. Passwort-Manager oder USB-Stick).

## Steam einschalten

Texte für die Shopseite in allen 14 Sprachen stehen in `STEAM-SHOPTEXTE.md`.

1. Bei Steamworks anmelden (100 $ Gebühr pro Spiel) und die App anlegen. Du bekommst eine **App-ID** (eine Zahl).
2. Im Ordner `desktop-app` einmal ausführen: `npm install steamworks.js`
3. Die App-ID in `desktop-app/steam.js` bei `STEAM_KONFIG.appId` eintragen. Nur zum Testen ohne Steam zusätzlich in
   `desktop-app/steam_appid.txt` (die kommt absichtlich nicht mit in die Steam-Version).
4. In Steamworks unter "Statistiken und Errungenschaften" die Erfolge anlegen. Die Namen und Beschreibungen stehen in
   `werkzeuge/steam-erfolge.csv`. Der **API-Name** muss genau so heißen wie in der ersten Spalte (z.B. `GOLD_1`).
   Neu erzeugen geht mit: `desktop-app\node_modules\.bin\electron werkzeuge\steam-erfolge.js`
5. Unterstützer-Paket: in Steamworks ein DLC anlegen und dessen App-ID in `desktop-app/steam.js` bei
   `STEAM_KONFIG.dlc.unterstuetzer` eintragen.
6. Für den Steam-Status ("Rich Presence") in Steamworks den Text `#Status` mit `{#Status}` bzw. `%status%` anlegen.

### Spielstände in der Steam-Cloud

Die Desktop-App speichert in `%APPDATA%/Sproutvale/save` (dort liegt auch der Tresor `tresor.dat` und `tresor.bak`). In Steamworks unter "Steam Cloud" die **Auto-Cloud** einschalten:
Stamm `WinAppDataRoaming`, Unterordner `Sproutvale/save`, Muster `*`. Dann wandert der Spielstand automatisch zwischen PCs mit.

### Gems auf Steam

Steam kann echtes Geld nur über einen eigenen Server oder über den **Steam-Inventar-Dienst** annehmen.
Vorbereitet ist der Weg über den Inventar-Dienst (kein eigener Server nötig):

1. In Steamworks den Inventar-Dienst einschalten und drei Gegenstände anlegen: `gems_100`, `gems_500`, `gems_1100` mit Preis.
2. Die Gegenstands-Nummern in `desktop-app/steam.js` bei `STEAM_KONFIG.gemPakete` eintragen.
3. Danach öffnet der Kaufen-Knopf das Steam-Overlay mit dem Gegenstand. Die Gutschrift kommt, wenn Steam den Kauf meldet.
4. Grenze des Tresors: Sein Schlüssel steckt in der App (das geht nicht anders). Wer sich auskennt, kann ihn herausholen und
   sich Gems in die Datei schreiben. Ganz sicher wird es erst, wenn der Gem-Stand bei jedem Start aus dem Steam-Inventar
   gelesen wird (dort kann niemand schummeln). Das beim Fertigmachen des Gem-Shops so bauen.

## Duo online (wichtig vor dem Verkauf)

Das Duo verbindet die Spieler direkt (WebRTC). Zum Finden nutzt es den **kostenlosen öffentlichen Server von PeerJS**
(`0.peerjs.com`) und die STUN-Server von Google (Einstellungen oben in `js/koop.js`, `KOOP_KONFIG`).

- Der öffentliche Server hat keine Garantie: Ist er überlastet oder weg, geht kein Duo.
- Es gibt keinen TURN-Server. Hinter manchen Routern (z.B. Mobilfunk, Firmennetz) klappt die direkte Verbindung nicht.
- Datenschutz: Beim Duo sehen sich die Spieler gegenseitig die IP-Adresse, und PeerJS bzw. Google bekommen sie auch.
  Das muss in die Datenschutzerklärung.

Empfehlung: Für Steam später die Verbindung über **Steam Networking** (Steam-Relay, mit steamworks.js) laufen lassen.
Dann gibt es keine fremden Server, keine IP-Weitergabe und Freunde können sich über die Steam-Freundesliste einladen.
Bis dahin: eigenen PeerJS-Server betreiben (kostenlos bei kleinem Bedarf) und nur `server` in `KOOP_KONFIG` ändern.

## Promocode

`BETAVALE` gibt den Beta-Tester-Begleiter, das BETA-Shirt und Endlos (keine weiteren Skins). Jeder Code geht nur einmal pro PC.
Neue Codes stehen verschlüsselt (als Prüfsumme) in `desktop-app/tresor.js` bei `CODES`. Wer schon auf itch die Beta gespielt
hat, behält dort Gekauftes und Beta-Sachen (wird beim ersten Start einmal in den Tresor übernommen).

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
4. Wichtig: Auf dem Handy liegen Gems und Gekauftes bisher nur mit einer Prüfsumme im Speicher (`js/tresor.js`).
   Das reicht nicht gegen Schummeln. Vor dem Handy-Release den Stand bei jedem Start aus RevenueCat holen
   (gekaufte Pakete und Gem-Käufe), so wie die Desktop-App das Unterstützer-Paket bei jedem Start von Steam prüft.

### Werbung auf dem Handy (nur freiwillig)

1. Konto bei Google AdMob anlegen und eine "Belohnungs-Werbung" (Rewarded) erstellen.
2. Die Anzeigen-ID in `js/handy.js` bei `admobBelohnung` eintragen.
3. Die App-ID von AdMob kommt in die Android-Einstellungen (`AndroidManifest.xml`), siehe Anleitung des Plugins
   `@capacitor-community/admob`.

Die Werbung erscheint nur, wenn der Spieler selbst auf den Knopf drückt. Es gibt keine Werbung zwischendurch.

## Was du rechtlich brauchst (kurz)

- Für Verkäufe: Gewerbe, Impressum, Datenschutzerklärung (Duo: IP-Adressen über PeerJS/Google, siehe oben; bei Werbung zusätzlich die Einwilligung nach DSGVO,
  AdMob bringt dafür ein eigenes Fenster mit).
- Steam und die App-Stores kümmern sich um die Mehrwertsteuer im Ausland.
