# Sproutvale auf Steam und auf dem Handy

Diese Anleitung erklärt, was schon vorbereitet ist und was du noch tun musst, sobald das Kleingewerbe da ist.
Alles im Spiel funktioniert auch ohne diese Schritte. Kaufen und Werbung sind nur ausgeblendet.

## Checkliste Steam-Release (der Reihe nach)

1. Kleingewerbe, Impressum und Datenschutzerklärung (Duo: IP-Adressen, siehe unten). Steamworks-Konto (100 $).
2. In Steamworks die App anlegen. App-ID in `desktop-app/steam.js` bei `STEAM_KONFIG.appId` eintragen.
3. `steamworks.js` ist schon installiert (feste Version 0.4.0 in `desktop-app/package.json`), nichts zu tun.
4. Erfolge aus `steam/erfolge.csv` anlegen (API-Namen genau übernehmen), alle 14 Sprachen eintragen.
5. Unterstützer-Paket als DLC anlegen, DLC-App-ID in `STEAM_KONFIG.dlc.unterstuetzer`.
6. Gems auf Steam entscheiden (siehe "Gems auf Steam" unten, braucht noch Arbeit oder eine andere Lösung).
7. Shopseite: Texte aus `steam/SHOPTEXTE.md`, Bilder aus `steam/bilder` (Screenshots 1920×1080, Kapseln in allen Steam-Größen, Erfolgsbilder; Entwürfe, gern noch nachbessern), Trailer aus `steam/trailer`. Fragebogen zu Inhalten: **simuliertes Glücksspiel** angeben.
8. Steam Cloud einschalten (siehe unten). Unterstützte Sprachen: alle 14.
9. Beta-Sachen herausnehmen, wenn es keine Beta mehr ist (BETAVALE-Code, "Beta" in der Versionsanzeige).
10. In `js/daten.js` prüfen: `DEBUG_ERLAUBT = false`. Die Version bleibt für Steam 1.0.0.
11. Einmal komplett durchspielen: Story-Start, Tutorial, Markt, Stellarium, Rechnung, Mondteich, Einstellungen.
12. `npm run steam`, den Ordner `desktop-app/dist-steam/Sproutvale` mit SteamPipe hochladen.
13. Über Steam installieren und testen: Erfolg auslösen, Overlay (Umschalt+Tab), DLC, Steam-Status, Cloud auf zweitem PC.
14. `desktop-app/geheim.txt` sicher aufbewahrt? (Ohne sie können Spieler ihre Käufe nicht mehr lesen.)

## Was schon im Spiel steckt

| Bereich | Stand |
|---|---|
| Steam-Erfolge | Das Spiel meldet jeden Erfolg und jeden Pokal an Steam. Beim Start trägt es auch alte Erfolge nach. |
| Liste der Erfolge | `steam/erfolge.csv`: alle Erfolge mit Namen in allen 14 Sprachen (Spalten heißen wie in Steamworks: german, english, schinese, ...) |
| Sprachen | Deutsch, Englisch, Spanisch, Französisch, Italienisch, Portugiesisch (Brasilien), Niederländisch, Polnisch, Türkisch, Russisch, Ukrainisch, Japanisch, Chinesisch (vereinfacht), Koreanisch. Beim ersten Start ist Englisch eingestellt, umstellen geht in den Einstellungen unter Sprache. |
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
- Für den automatischen itch.io-Upload (GitHub Actions): auf GitHub unter Settings, Secrets and variables, Actions ein Secret
  `SPROUTVALE_GEHEIM` anlegen und den Inhalt von `geheim.txt` hineinkopieren. Ohne das Secret bricht der Build mit einer Meldung ab.

## Steam einschalten

Texte für die Shopseite in allen 14 Sprachen stehen in `steam/SHOPTEXTE.md`.

1. Bei Steamworks anmelden (100 $ Gebühr pro Spiel) und die App anlegen. Du bekommst eine **App-ID** (eine Zahl).
2. `steamworks.js` ist schon installiert. Die Steam-Version startet sich über Steam neu, wenn jemand die exe direkt öffnet
   (nur wenn die App-ID eingetragen ist, in der Entwickler-Version nie).
3. Die App-ID in `desktop-app/steam.js` bei `STEAM_KONFIG.appId` eintragen. Nur zum Testen ohne Steam zusätzlich in
   `desktop-app/steam_appid.txt` (die kommt absichtlich nicht mit in die Steam-Version).
4. In Steamworks unter "Statistiken und Errungenschaften" die Erfolge anlegen. Die Namen und Beschreibungen stehen in
   `steam/erfolge.csv`. Der **API-Name** muss genau so heißen wie in der ersten Spalte (z.B. `GOLD_1`).
   Die Bilder für die Erfolge (256×256, erreicht und gesperrt) liegen in `steam/bilder/erfolge`.
5. Unterstützer-Paket: in Steamworks ein DLC anlegen und dessen App-ID in `desktop-app/steam.js` bei
   `STEAM_KONFIG.dlc.unterstuetzer` eintragen.
6. Steam-Status ("Rich Presence"): in Steamworks unter "Rich Presence" die fertige Datei `steam/rich-presence.vdf`
   hochladen (alle 14 Sprachen, der Text kommt schon übersetzt aus dem Spiel, z.B. "Tag 12 · 3 Rechnungen bezahlt").

### Spielstände in der Steam-Cloud

Die Desktop-App speichert in `%APPDATA%/Sproutvale/save` (dort liegt auch der Tresor `tresor.dat` und `tresor.bak`). In Steamworks unter "Steam Cloud" die **Auto-Cloud** einschalten:
Stamm `WinAppDataRoaming`, Unterordner `Sproutvale/save`, Muster `*`. Dann wandert der Spielstand automatisch zwischen PCs mit.

### Gems auf Steam

Steam kann echtes Geld nur über einen eigenen Server oder über den **Steam-Inventar-Dienst** annehmen.
Vorbereitet ist der Weg über den Inventar-Dienst (kein eigener Server nötig):

1. In Steamworks den Inventar-Dienst einschalten und drei Gegenstände anlegen: `gems_100`, `gems_500`, `gems_1100` mit Preis.
2. Die Gegenstands-Nummern in `desktop-app/steam.js` bei `STEAM_KONFIG.gemPakete` eintragen.
3. Danach öffnet der Kaufen-Knopf das Steam-Overlay mit dem Gegenstand.
   **Noch nicht gebaut:** die Gutschrift. `steamworks.js` (0.4.0) kann das Steam-Inventar nicht lesen. Dafür braucht es
   entweder eine eigene kleine Erweiterung für `ISteamInventory` oder einen kleinen Server mit der Steam-Web-API.
   Solange die Gegenstands-Nummern leer sind, bleiben die Kaufen-Knöpfe aus, es kann also nichts schiefgehen.
   Einfachere Alternative für ein Kaufspiel auf Steam: statt Gems die Skins als DLC-Pakete verkaufen (das geht schon,
   genau wie das Unterstützer-Paket) und den Gem-Shop auf Steam ausblenden.
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
- Schriften (Fredoka, Pixelify Sans, Jersey 15) laufen unter der SIL Open Font License: `css/schriften/LIZENZ-SCHRIFTEN.txt` muss mit ins Spiel (passiert beim Bauen automatisch).
- Die Instrumente der Musik (`js/klangproben.js`) stammen aus Versilian Studios Chamber Orchestra 2, Community Edition, Lizenz CC0.
  Damit gibt es keine Pflichten, die Nennung im Feedback-Reiter ist freiwillig.

## Trailer

Die fertige Datei liegt nur lokal in `steam/trailer/` (zu groß fürs Repo):

- `sproutvale-trailer.mp4`: etwa 53 s, 1920x1080, 30 fps, ohne Ton. Gedacht zum Darübersprechen.
- Schnitte liegen auf einem Raster von 120 BPM (ein Schlag = 0,5 s), damit später Musik dazu passt.
- Ablauf: Hook (Lategame-Ernte, Jackpot, Logo), Early (säen, wachsen, ernten, Feld kaufen), Mid (Kombo, Goldregen,
  Krähen, Herbst, Nacht, Stellarium), Late (Riesenernten, Magnet, Jackpots, Winter, Gewitter, Fieber, Kristallpokal), Logo mit "Wishlist".
