"use strict";

// ============================================================
// DATEN: alle Zahlen, Listen und Texte fuers Balancing an einem Ort.
// Spiellogik: script.js (+ haus.js, glueck.js, mondteich.js, ereignisse.js, kodex.js), Grafiken: sprites.js,
// Klaenge: audio.js. Funktionen wie level() oder kuschel() stehen in script.js und werden hier nur in
// "() => ..." benutzt, also erst wenn das Spiel laeuft.
//
// Waehrungen:
//   Gold             -> Markt (nur in diesem Run)
//   Sternensamen     -> Stellarium (nur in diesem Run, intern "skillpunkte"), bei jeder Ernte und jedem Klick auf den Samenladen
//   Mondblueten      -> Mondteich (dauerhaft), gibt es am Ende eines Runs fuer bezahlte Rechnungen
//   Kuschel-Gutscheine -> 1 Gratis-Zug am Kuschel-Automaten, 1 Stueck pro geschaffter Erfolg-Stufe
//   Sternensplitter  -> Sternenfall-Shop (zweite Prestige-Ebene, ganz dauerhaft)
// ============================================================

// ---------- HILFSFUNKTIONEN ----------

function aufrunden(wert) {
    // kleiner Abzug gleicht Kommazahl-Ungenauigkeiten aus (0.1 * 3 = 0.30000000000000004 wuerde sonst 31% ergeben)
    // "|| 0" macht aus einer "minus Null" eine normale 0 (sonst wird "+-0" angezeigt)
    return Math.ceil(wert - 1e-9) || 0;
}

// Grosse Zahlen lesbar machen: 12.345 / 123,4 Tsd. / 5,67 Mio. / ...
function zahl(wert) {
    const n = Math.round(wert) || 0;
    if (Math.abs(n) < 100000) return n.toLocaleString(SPRACH_LOCALE);
    // deutsche Namen: Tsd., Mio., Mrd. (10^9), Bio. (10^12), Brd. (10^15), Trio. (10^18), Trd. (10^21)
    const namen = [[1e21, t("Trd.")], [1e18, t("Trio.")], [1e15, t("Brd.")], [1e12, t("Bio.")], [1e9, t("Mrd.")], [1e6, t("Mio.")], [1e3, t("Tsd.")]];
    for (const [grenze, name] of namen) {
        if (Math.abs(n) >= grenze && Math.abs(n) < grenze * 1000) {
            return (n / grenze).toLocaleString(SPRACH_LOCALE, { maximumFractionDigits: 2 }) + " " + name;
        }
    }
    const exp = n.toExponential(2).replace("e+", "e");
    return SPRACHE === "de" ? exp.replace(".", ",") : exp;
}

function prozentText(anteil) {
    return (anteil * 100).toLocaleString(SPRACH_LOCALE, { maximumFractionDigits: 1 }) + "%";
}

function sekText(sek) {
    return sek.toLocaleString(SPRACH_LOCALE, { maximumFractionDigits: 1 }) + t(" Sek.");
}

function multiText(wert) {
    return "x" + wert.toLocaleString(SPRACH_LOCALE, { maximumFractionDigits: 2 });
}

function kostenMitFaktor(basiskosten, faktor, stufe) {
    return aufrunden(basiskosten * Math.pow(faktor, stufe));
}

function zufall(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
}

// Zufall nach Gewichten: liste = [{ gewicht, ... }]
function gewichteterZufall(liste, gewichtVon = e => e.gewicht) {
    const summe = liste.reduce((s, e) => s + gewichtVon(e), 0);
    let wurf = Math.random() * summe;
    for (const eintrag of liste) {
        wurf -= gewichtVon(eintrag);
        if (wurf < 0) return eintrag;
    }
    return liste[liste.length - 1];
}

function mische(liste) {
    const kopie = [...liste];
    for (let i = kopie.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
    }
    return kopie;
}

function klemme(wert, min, max) {
    return Math.max(min, Math.min(max, wert));
}

// ---------- KONFIGURATION ----------

// Versionsnummer (unten rechts im Hauptmenue). Bei jedem Update erhoehen, gleich wie das Tag auf GitHub/itch.io.
const SPIEL_VERSION = "Beta 0.1.0";

// Patch Notes (Klick auf die Versionsnummer im Hauptmenue, nach einem Update einmal von selbst). Neueste Version zuerst.
const NEUIGKEITEN = [
    { version: "Beta 0.1.0", punkte: [
        t("Patch Notes sind jetzt eine Dorfzeitung (Sproutvale Tagblatt) mit Zeitungs-Knopf unten links im Hauptmenü."),
        t("Hof-Stile: Ab dem 2. Run wählst du zu Beginn 1 von 3 Stilen, die den Run verändern."),
        t("Pakte: riskante Segen mit Vor- und Nachteil (rote Karten)."),
        t("Herausforderungen im Mondteich (ab 3 Runs): Runs mit Einschränkung und dauerhaftem Bonus."),
        t("Werkzeug-Evolutionen: Werkzeug + passender Segen = doppelt so stark."),
        t("Erntefieber, Briefe aus dem Dorf, Dorfzeitung am Feierabend und Feiertage nach echtem Datum."),
        t("Neue Kosmetik-Kategorie Haus: 14 Bauernhaus-Skins."),
        t("Viel neue Kosmetik: Saat-Skins, Samenläden, Landschaften, Begleiter, Hüte, Kleidung und Accessoires."),
        t("Beta-Tester bekommen den mythischen Begleiter „Beta Tester“ (bleibt auch nach dem Release)."),
        t("Level geben keine Spielvorteile mehr, nur Auren (alle 10 Level stärker). Regenbogen-Aura läuft jetzt richtig durch."),
        t("Neue Preise: legendäre Skins 50 Kristalle, Unterstützer-Paket 4,99 €. Nur Kosmetik, kein Pay-to-Win."),
        t("Alle Emojis im Spiel sind jetzt Pixel-Art. Lobby-Codes haben nur noch 5 Zeichen."),
        t("Fehlerbehebungen: Krähen konnten nicht landen, Leuchtpilz-Haus war nicht wählbar, Aura ging beim Laden verloren.")
    ] },
    { version: "Beta 0.0.1", punkte: [
        t("Neues Intro: eine Arcade-Halle, der Automat zeigt „Venray Studios presents“."),
        t("Level statt Bauernrang: Erfahrung gibt es für fast alles (Ernten, Tage, Rechnungen, Gold, Sternensamen, Mondblüten, Sternensplitter, Kuscheltiere, Erfolge). Level 100 ist ein Langzeit-Ziel, danach geht es endlos weiter."),
        t("Erfahrungsleiste am Profil und im Profil-Fenster. Das Level steht auch in der Duo-Lobby."),
        t("Auren statt Titel: alle 5 Level eine neue Aura um Figur und Namen (im Profil wählbar), alle 10 Level wird sie stärker."),
        t("Kleidung, Kopf und Accessoire haben jetzt Haupt- und Zweitfarbe, auch legendäre Teile. Doppelte Farb-Teile wurden entfernt (du bekommst das Grundteil in deiner Farbe)."),
        t("Rote Schleife größer, Pflaster sichtbar, Zauberhut entfernt, Gesicht im Debug-Menü."),
        t("Mondteich am Run-Anfang nur noch über den Teich im Hintergrund."),
        t("Neu in den Einstellungen: CRT-Filter.")
    ] },
    { version: "Alpha 1.0.1", punkte: [
        t("Story-Spielstand löschen (Hauptmenü) setzt jetzt den ganzen Story-Fortschritt zurück. Kosmetik, Käufe, Profil, Bauernrang, Einstellungen und Endlos bleiben.")
    ] },
    { version: "Alpha 1.0.0", punkte: [
        t("Mondteich: 4 neue Upgrades, die du nach und nach entdeckst (Erbstück, Sternenkarte, Segenstart, Saatbank)."),
        t("Neue epische Begleiter: Winterhase, Kürbishund, Teufelchen, Kuhkatze, Schleifenhase und Panda-Welpe."),
        t("Charakter-Editor: neue Kategorie Gesicht (Sommersprossen, Bart, Sternenwangen …), eigene Farben für Kleidung und Augen, Titel unter dem Namen (werden durch Fortschritt freigeschaltet)."),
        t("Neuer Spielanfang: erst nur Klicken, Warten und der Markt (neu: Erntekorb, +1 Gold pro Ernte). Das Stellarium schaltest du im Markt für 1.000 Gold frei."),
        t("Bunte Saaten muss man jetzt im Stellarium freischalten (Stufe 1 jeder Farbe). Weizen ist anfangs 1 Gold wert, die ersten Rechnungen sind 30, 150 und 1.500 Gold."),
        t("Mondteich: Fruchtbarer Hof, Ausdauer, Verhandlungsgeschick, Startkapital, Bauernweisheit und Reiche Ernte werden mit jeder Stufe stärker als vorher."),
        t("Neue Mechanik Fruchtbarer Boden: jedes Feld wird durch Ernten besser (bis Stufe 5, +10% Gold pro Stufe), dazu der Stern Bodenkunde."),
        t("Mehr Erfolge: höhere Stufen in fast allen Ketten und neue Ketten für Bauernrang, Segen und früh bezahlte Rechnungen."),
        t("3 neue Pflanzen für das späte Spiel: Kristallrose, Sonnenfrucht und Weltenbaum, jede mit eigener Art und eigenem Bonus."),
        t("Langzeit-Ziele: Bauernrang (jede Ernte gibt Erfahrung, jeder Rang +1% Gold für immer), Mondphasen bis Sternenmond VI, Meisterschaft bis Stufe 12."),
        t("Sternenfall: 5 neue Upgrades (Sternenrucksack, Kosmische Felder, Sternenwurzel, Ewige Kombo, Sternenmeister)."),
        t("Stellarium: neue Sterne Saatkette, Goldene Stunde, Morgen-Schwung, Feldkunde und Sternenmeer."),
        t("4 neue Kredit-Auflagen, 3 neue Wetter (Wind, Pollenflug, Frost) und 6 neue Segen."),
        t("Mondteich: Startkapital, Bauernweisheit und Ausdauer wachsen jetzt mit dem Run (Prozent statt fester Werte)."),
        t("Mondteich: neu Reiche Ernte (Saat zählt doppelt) und Meisterhände (Ernten zählen mehrfach für die Meisterschaft)."),
        t("Stellarium: neuer Ast Grundwerte (Gold, Sternensamen, Energie, Wachstum und unendliche Harmonie)."),
        t("Stellarium: jede Pflanze hat 2 neue Sterne, Sternenfrucht (mehr Sternensaat) und Frühreife (Samen starten als Keimling)."),
        t("Balancing: Legendäre Saat bringt bis zur 2. Rechnung x25 statt x50 Gold. Runs hängen weniger vom frühen Glück ab."),
        t("Endlos: nach einem Neuanfang bleibt der Spielstand im Mondteich gespeichert."),
        t("Mondphasen auch in Endlos im Mondteich wählbar (sie gelten für Story), das Mond-Symbol oben ist immer da."),
        t("Der Begleiter Schleifenkatze heißt jetzt Kitty.")
    ] },
    { version: "Alpha 0.9.2", punkte: [
        t("Patch Notes: alle Versionen seit Alpha 0.2.0 zum Nachlesen (Klick auf die Versionsnummer im Hauptmenü).")
    ] },
    { version: "Alpha 0.9.1", punkte: [
        t("Duo läuft viel flüssiger: Figuren werden schneller gezeichnet."),
        t("Duo: Der Lobby-Code ist versteckt (Anzeigen per Klick), Beitritt mit Namen, der Host kann Mitspieler rauswerfen."),
        t("Duo: Felder kosten doppelt so viel wie solo."),
        t("Duo: Rechnungen früher bezahlen geht jetzt auch zu zweit."),
        t("Mehr Mondblüten für bezahlte Rechnungen: schon der erste Run bringt ein spürbares Upgrade."),
        t("Neue Figur-Teile: Cargohose, Zerrissene Jeans, Sandalen, Cowboystiefel (episch), Lavahose und Blitzschuhe (legendär)."),
        t("Spielstand als Datei sichern (Einstellungen, Spielstand)."),
        t("Neue Einstellung: Im Hintergrund stumm."),
        t("Patch Notes: Klick auf die Versionsnummer im Hauptmenü."),
        t("Figuren laufen rechts, Begleiter links auf dem Hof."),
        t("Viele fehlende englische Texte ergänzt, Regengeräusch im Menü behoben.")
    ] },
    { version: "Alpha 0.9.0", punkte: [
        t("Rechnungen früher bezahlen: pro Tag früher wird der nächste Segen 10% stärker, und der Run wird kürzer."),
        t("Mondteich und Sternenfall deutlich stärker: Mondblüten x3 pro Sternenfall, mehr Sternensplitter, die Sense steht ganz vorne."),
        t("Mondteich nach dem Run einklappbar: Markt und Stellarium ansehen, bevor du neu startest."),
        t("Die Mondphase oben ist anklickbar und führt zur Auswahl."),
        t("Deine Figur hat eine kleine Aura, der Heiligenschein ist ein richtiger Ring, Arme beim Jubeln seitlich am Kopf."),
        t("Das Wetter-Banner kommt nicht mehr beim Laden eines Spielstands.")
    ] },
    { version: "Alpha 0.8.1", punkte: [
        t("Der Samenladen läuft heiß: ab 10 Klicks pro Sekunde zählt jeder weitere Klick zu drei Vierteln (mit Glühen und Dampf). Die Sense ist ausgenommen.")
    ] },
    { version: "Alpha 0.8.0", punkte: [
        t("Profil mit eigener Figur: Charakter-Editor mit vielen Teilen, Accessoires, Flügeln und legendären Animationen."),
        t("Deine Figur läuft über den Hof, mit Idle-Animationen, Herzen und Emotes (Rechtsklick)."),
        t("Duo: Wiedereinstieg in Story und Endlos, Figur und Begleiter des Mitspielers laufen mit."),
        t("Eigene Pixel-Symbole statt Emojis, neue Deko und neue Begleiter."),
        t("Auto-Patcher in der Desktop-App: Updates werden beim Start geladen."),
        t("Balancing der Wirtschaft: neue Pflanzen lohnen sich mehr, Weizen dominiert nicht mehr.")
    ] },
    { version: "Alpha 0.7.2", punkte: [
        t("Roulette und Blackjack im eigenen Glücksspiel-Bereich des Markts."),
        t("Die Sense: Maus auf dem Samenladen gedrückt halten klickt von allein."),
        t("Die Mondphase wird oben angezeigt, der Mondteich hat einen Nacht-Look."),
        t("Duo stabiler: Wiederverbinden, Erkennen von Abbrüchen, Geduld bei wackligem WLAN.")
    ] },
    { version: "Alpha 0.7.1", punkte: [
        t("Duo: Wiedereinstieg direkt ins laufende Endlos-Spiel auf der eigenen Seite.")
    ] },
    { version: "Alpha 0.7.0", punkte: [
        t("Online-Duo: spiel mit einem Freund per Lobby-Code, jeder auf seiner Seite des Hofs."),
        t("Story und Endlos, Endlos mit 3 eigenen Speicherständen."),
        t("Am Zahltag entscheidest du: Rechnung bezahlen oder Run beenden."),
        t("Infoknöpfe oben mit festhaltbaren Infokarten, legendäre Landschaft Kosmische Nacht.")
    ] },
    { version: "Alpha 0.6.1", punkte: [
        t("Erfolge zum Abholen, getrennt für Story und Endlos."),
        t("Slotmaschine statt Gacha, Münzwurf mit Kopf und Zahl."),
        t("Werkzeuge zeigen ihre Wirkung in Prozent, neue Kuscheltiere, Deko, Münzen und Rahmen."),
        t("Klick auf wachsende Pflanzen lässt sie schneller wachsen.")
    ] },
    { version: "Alpha 0.5.2", punkte: [
        t("Samenläden als eigene Pixel-Gebäude, neue Saat- und Pflanzen-Skins, neue Deko und Landschaften."),
        t("Legendäre Pflanzen-Looks mit eigenen Ernte-Effekten.")
    ] },
    { version: "Alpha 0.5.1", punkte: [
        t("Neues Hauptmenü im Pixel-Stil mit Holzschild-Knöpfen.")
    ] },
    { version: "Alpha 0.4.0", punkte: [
        t("Sproutvale gibt es auf Englisch."),
        t("Neuer Himmels-Ast im Stellarium, neue Markt-Stände, Kodex-Segen und neue Skins.")
    ] },
    { version: "Alpha 0.3.0", punkte: [
        t("Neue Segen, Erfolge und Feld-Skins, Jahreszeiten-Ast und Kodex-Belohnungen.")
    ] },
    { version: "Alpha 0.2.1", punkte: [
        t("Fehler behoben: Das Markt-Fenster war immer sichtbar.")
    ] },
    { version: "Alpha 0.2.0", punkte: [
        t("Erste veröffentlichte Version: neuer Markt, neue Schrift, Feedback über Discord, Vollbild.")
    ] }
];

const KONFIG = {
    klickGrenzeProSek: 10,            // ab so vielen Klicks pro Sekunde laeuft der Samenladen heiss: jeder weitere Klick zaehlt weniger
    klickUeberGrenze: 0.75,           // (Autoklicker bleiben staerker, aber man muss keinen benutzen; die Sense ist ausgenommen)
    startKlicksProSamen: 15,          // weniger Klicks pro Samen: langsame Klicker fuellen ihre Felder auch, schnelles Klicken bringt weniger Vorsprung
    minKlicksProSamen: 6,             // nur im Lategame erreichbar, wenn man wirklich alles hat
    klickWachstum: 0.04,              // ein Klick auf eine wachsende Pflanze: +4% ihrer ganzen Wachstumszeit (keine Boni darauf)
    startEnergie: 180,
    energieProSek: 5,
    tageProRechnung: 5,
    rechnungBasis: 30,
    rechnungFaktor: 26,               // ab der 4. Rechnung wird jede x26 teurer
    rechnungFaktorenStart: [5, 40, 25], // 30, 150, dann nach dem Stellarium steiler: 6.000, 150.000, 3,9 Mio. ...
    sternensamenProErnte: 6,          // jede Ernte laesst Sternensaat mit 5 Sternensamen fallen (Weizen) ...
    sternensamenPflanzenFaktor: 1.14, // ... und jede hoehere Pflanze gibt 14% mehr (Kuerbis ~15, Mondlilie ~37): neue Pflanzen lohnen sich
    sternensamenProKlick: 1,          // jeder Klick auf den Samenladen, der einen Samen wirft, gibt Sternensamen (Bruchteile aus Upgrades werden gesammelt)
    basisSammelRadius: 8,             // Radius um den Mauszeiger in Pixeln
    sammelRadiusFaktor: 1.10,         // jede Stufe "Breiter Cursor" = +10%
    kugelRadius: 16,
    rasterSpalten: 12,                // 6 Spalten links, 6 rechts, dazwischen der Weg mit dem Samenladen
    rasterZeilen: 5,
    ladenBreite: 1.5,                 // Samenladen = 1,5 Felder breit und hoch
    basisKomboFensterMs: 600,
    komboStufen: [
        { ab: 0, multi: 1 },
        { ab: 15, multi: 2 },
        { ab: 40, multi: 3 },
        { ab: 80, multi: 4 },
        { ab: 150, multi: 5 }
    ],
    feldKostenFaktor: 1.9,            // jedes weitere Feld kostet x1,9
    sternschnuppeMinSek: 70,          // etwa eine Sternschnuppe pro Tag
    sternschnuppeMaxSek: 130,
    sternschnuppeBuffSek: 10,
    gluehwuermchenAbTageszeit: 0.65,  // ab diesem Anteil des Tages (0 = Morgen, 1 = Nacht) kommen Gluehwuermchen
    gluehwuermchenMinSek: 3,
    gluehwuermchenMaxSek: 7,
    gluehwuermchenEnergie: 10,        // ein gefangenes Gluehwuermchen verlaengert den Abend
    bonusEnergieDeckel: 0.6,          // Extra-Energie (Blitzpflanzen, Kaffee, Gluehwuermchen) hoechstens 60% der Tagesenergie, sonst endet der Tag nie
    streichelnFuerGold: 3,            // jedes 3. Streicheln laesst eine Saat fallen (nur waehrend eines Tages)
    streichelSperreMs: 350,           // schneller gestreichelt zaehlt nicht (gegen Autoklicker)
    streichelAnteile: [0.001, 0.002, 0.003, 0.004, 0.005], // Wert einer Streichel-Saat je Farbe: 0,1% bis 0,5% der Rechnung
    streichelMindestGold: [1, 2, 3, 4, 5],                 // ... aber mindestens so viel Gold
    streichelMaxProTag: 40,           // hoechstens so viele Streichel-Saaten pro Tag: nur Streicheln reicht nie fuer eine Rechnung
    streichelHerzAb: 33333,           // Easteregg: ab dem 33.333. Streicheln (fuer immer) steht dort "<3" und es gibt 3-fache Saat
    streichelHerzFaktor: 3,
    gluehwuermchenSterne: 10,         // ein Gluehwuermchen gibt auch Sternensamen (so viel wie 2 Ernten)
    haustierHilfeSek: 14,             // so oft schaut das Haustier, ob es helfen kann
    haustierHilfeChance: 0.3,         // Grundchance, dass es dann eine liegende Muenze einsammelt
    turmIntervall: 8,
    tarotSlots: 3,
    tarotVerstaerkung: 1.5,
    tarotPreis: 10,                   // erste Karte, danach jede weitere x1,2
    tarotPreisFaktor: 1.2,
    tarotVerbessernPreis: 100,
    werkzeugPlaetze: 1,               // Grundzahl, die Tarotkarte "Der Gehaengte" gibt +1 (verbessert +2)
    zinsDeckel: 0.5                   // Zinsen hoechstens 50% der naechsten Rechnung (sonst zu leicht)
};

// ---------- PFLANZEN ----------
// Reihenfolge = Freischalt-Reihenfolge. Neue Pflanze = neue Zeile + Sprite mit gleicher id in sprites.js
// (ihr Ast im Stellarium entsteht automatisch, bonusName/bonusText = eigener Bonus-Stern).
// Jede Stufe ist ungefaehr 2,5-mal so viel wert: spaeter im Run werden die Zahlen richtig gross.
// unlockKosten in Sternensamen. "eigenschaft" = kleine Besonderheit dieser Pflanze (Wirkung in script.js).

const PFLANZEN_VORLAGEN = [
    { id: "weizen", name: t("Weizen"), emoji: "🌾", sekProStufe: 1.6, verkaufswert: 1, unlockKosten: 0, bonusName: t("Goldene Garbe"), bonusText: t("Jede Weizen-Ernte gibt 5 Sternensamen extra.") },
    { id: "karotte", name: t("Karotte"), emoji: "🥕", sekProStufe: 2.5, verkaufswert: 5, unlockKosten: 120, bonusName: t("Knackige Karotten"), bonusText: t("Karotten wachsen 50% schneller.") },
    { id: "kartoffel", name: t("Kartoffel"), emoji: "🥔", sekProStufe: 3, verkaufswert: 12, unlockKosten: 210, bonusName: t("Knollenfund"), bonusText: t("20% Chance, dass eine Kartoffel eine zweite Saat fallen lässt.") },
    { id: "erdbeere", name: t("Erdbeere"), emoji: "🍓", sekProStufe: 3.5, verkaufswert: 30, unlockKosten: 370, bonusName: t("Süße Beeren"), bonusText: t("Saaten von Erdbeeren sind mindestens ungewöhnlich.") },
    { id: "tomate", name: t("Tomate"), emoji: "🍅", sekProStufe: 4, verkaufswert: 75, unlockKosten: 650, bonusName: t("Rote Welle"), bonusText: t("Jede Tomaten-Ernte gibt +3 Kombo.") },
    { id: "mais", name: t("Mais"), emoji: "🌽", sekProStufe: 4.5, verkaufswert: 190, unlockKosten: 1100, bonusName: t("Popcorn"), bonusText: t("15% Chance, dass beim Ernten ein Maiskorn auf ein freies Feld springt und dort wächst.") },
    { id: "kuerbis", name: t("Kürbis"), emoji: "🎃", sekProStufe: 5, verkaufswert: 480, unlockKosten: 2000, bonusName: t("Riesenkürbis"), bonusText: t("10% Chance auf einen Riesenkürbis mit 5-fachem Wert.") },
    { id: "sonnenblume", name: t("Sonnenblume"), emoji: "🌻", sekProStufe: 6, verkaufswert: 1200, unlockKosten: 3500, bonusName: t("Sonnenkraft"), bonusText: t("Jede Sonnenblumen-Ernte gibt +2 Energie.") },
    { id: "blaubeere", name: t("Blaubeere"), emoji: "🫐", sekProStufe: 6.5, verkaufswert: 3000, unlockKosten: 6000, bonusName: t("Voller Strauch"), bonusText: t("Blaubeeren lassen 3 statt 2 Saaten fallen."),
        eigenschaft: "beeren", eigenschaftText: t("Busch: lässt 2 Saaten mit je 60% Wert fallen (zwei Farbwürfe!).") },
    { id: "melone", name: t("Melone"), emoji: "🍉", sekProStufe: 7, verkaufswert: 7500, unlockKosten: 10500, bonusName: t("Melonen-Sommer"), bonusText: t("50% statt 25% Chance auf eine Riesenmelone."),
        eigenschaft: "riesig", eigenschaftText: t("25% Chance auf eine Riesenmelone mit doppeltem Wert.") },
    { id: "reis", name: t("Reis"), emoji: "🍚", sekProStufe: 7.5, verkaufswert: 19000, unlockKosten: 18500, bonusName: t("Reisterrassen"), bonusText: t("Reis zählt immer als bewässert."),
        eigenschaft: "wasser", eigenschaftText: t("Wasserpflanze: wächst auf bewässerten Feldern 3-mal statt 2-mal so schnell.") },
    { id: "kaffee", name: t("Kaffee"), emoji: "☕", sekProStufe: 8, verkaufswert: 47000, unlockKosten: 32000, bonusName: t("Espresso"), bonusText: t("Jede Kaffee-Ernte gibt dem Samenladen 5 Gratis-Klicks."),
        eigenschaft: "wachmacher", eigenschaftText: t("Wachmacher: jede Ernte gibt +1 Energie.") },
    { id: "riesenpilz", name: t("Riesenpilz"), emoji: "🍄", sekProStufe: 8.5, verkaufswert: 118000, unlockKosten: 56000, bonusName: t("Pilzsporen"), bonusText: t("20% Chance, dass ein Riesenpilz beim Ernten 2 neue Samen verteilt."),
        eigenschaft: "nacht", eigenschaftText: t("Nachtgewächs: wächst am Abend und in der Nacht doppelt so schnell.") },
    { id: "eisblume", name: t("Eisblume"), emoji: "❄️", sekProStufe: 9, verkaufswert: 295000, unlockKosten: 99000, bonusName: t("Diamantfrost"), bonusText: t("Saaten von Eisblumen sind mindestens selten."),
        eigenschaft: "eis", eigenschaftText: t("Kristallkälte: ihre Saaten sind mindestens ungewöhnlich.") },
    { id: "mondlilie", name: t("Mondlilie"), emoji: "🌸", sekProStufe: 10, verkaufswert: 740000, unlockKosten: 170000, bonusName: t("Vollmond"), bonusText: t("Mondlilien geben am Abend und in der Nacht doppeltes Gold."),
        eigenschaft: "mond", eigenschaftText: t("Blüht im Mondlicht: wächst tagsüber halb so schnell, nachts 3-mal so schnell.") },
    // Spaetes Spiel: drei neue Pflanzen mit eigener Art
    { id: "kristallrose", name: t("Kristallrose"), emoji: "🌹", sekProStufe: 11, verkaufswert: 1850000, unlockKosten: 290000,
        bonusName: t("Kristallglanz"), bonusText: t("Kristallrosen lassen dreifache Sternensaat fallen."),
        eigenschaft: "kristall", eigenschaftText: t("Funkelnde Blüten: die Hälfte ihrer Saaten ist mindestens selten.") },
    { id: "sonnenfrucht", name: t("Sonnenfrucht"), emoji: "🍊", sekProStufe: 12, verkaufswert: 4600000, unlockKosten: 490000,
        bonusName: t("Sonnenwärme"), bonusText: t("Jede Sonnenfrucht-Ernte gibt +3 Energie."),
        eigenschaft: "sonne", eigenschaftText: t("Liebt die Sonne: wächst tagsüber 50% schneller, nachts halb so schnell.") },
    { id: "weltenbaum", name: t("Weltenbaum"), emoji: "🌳", sekProStufe: 14, verkaufswert: 11500000, unlockKosten: 830000,
        bonusName: t("Uralte Wurzeln"), bonusText: t("Weltenbäume lassen 2 zusätzliche Saaten fallen."),
        eigenschaft: "wurzeln", eigenschaftText: t("Uralt und mächtig: zählt für die Artenvielfalt doppelt.") }
];

// Sprites fuer Samen, kleine Pflanze, grosse Pflanze. Die fertige Stufe nutzt das Sprite der Pflanze.
const STUFEN_SPRITES = ["samen", "keimling", "jungpflanze"];

// Grundchancen stehen in raritaetsChancen() in script.js. Selten (blau) gibt es nur ueber den Ast "Ernte" im Stellarium.
// Mythisch (rosa) gibt es NUR bei den Kuscheltieren im Mondteich, nie als Saat.
// symbol = Form fuer den Farbenblind-Modus (steht auf der Muenze und im Text)
const RARITAETEN = [
    { name: t("Gewöhnlich"), multi: 1, farbe: "#e8e8e8", rand: "#8a8a8a", symbol: "●" },
    { name: t("Ungewöhnlich"), multi: 2.5, farbe: "#5fd15f", rand: "#2e9e2e", symbol: "▲" },
    { name: t("Selten"), multi: 5, farbe: "#6cc0f5", rand: "#2f7fcf", symbol: "◆" },
    { name: t("Episch"), multi: 12.5, farbe: "#b06ee8", rand: "#7c2fc2", symbol: "■" },
    { name: t("Legendär"), multi: 50, farbe: "#ffd93d", rand: "#d49a00", symbol: "★" }
];
const JACKPOT_INDEX = RARITAETEN.length - 1;

// ---------- SPEZIALPFLANZEN ----------
// Jeder Samen kann mit etwas Glueck eine Spezialpflanze werden (hoechstens eine Variante pro Samen).
// Moegliche Effekte: tempo, goldKugeln, goldMulti, raritaetsWuerfe, jackpot, ernteKlicks,
// energieBonus, sporen, funken, magnet, sterne, kombo. Neue Variante = neuer Eintrag (ihr Stern entsteht automatisch).

const VARIANTEN = [
    { id: "geist", titel: t("Geisterpflanze"), praefix: t("Geister"), badge: "👻",
        beschreibung: t("Wächst doppelt so schnell und lässt eine zweite Saat fallen."),
        tempo: 2, goldKugeln: 2, tarotBonus: { karte: "mond", chance: 0.08 } },
    { id: "blitz", titel: t("Blitzpflanze"), praefix: t("Blitz"), badge: "⚡",
        beschreibung: t("Bei der Ernte: +25 Energie für den laufenden Tag."),
        energieBonus: 25 },
    { id: "pilz", titel: t("Sporenpflanze"), praefix: t("Sporen"), badge: "🍄",
        beschreibung: t("Bei der Ernte verteilt sie Sporen: 2 neue Samen auf freien Feldern."),
        sporen: 2 },
    { id: "magnet", titel: t("Magnetpflanze"), praefix: t("Magnet"), badge: "🧲",
        beschreibung: t("Bei der Ernte werden alle Saaten und Sternensaaten auf dem Acker eingesammelt, auch ihre eigenen."),
        magnet: true },
    { id: "feuer", titel: t("Glutpflanze"), praefix: t("Glut"), badge: "🔥",
        beschreibung: t("Bei der Ernte springen Funken über: Alle Nachbarfelder wachsen sofort ein Drittel weiter."),
        funken: true },
    { id: "honig", titel: t("Honigpflanze"), praefix: t("Honig"), badge: "🍯",
        beschreibung: t("Bei der Ernte: +20 Kombo und die Kombo-Zeit wird aufgefüllt."),
        kombo: 20 },
    { id: "kristall", titel: t("Kristallpflanze"), praefix: t("Kristall"), badge: "💎",
        beschreibung: t("Muss 3-mal angeklickt werden, lässt dafür 5 Saaten fallen."),
        ernteKlicks: 3, goldKugeln: 5 },
    { id: "frost", titel: t("Frostpflanze"), praefix: t("Frost"), badge: "🧊",
        beschreibung: t("Wächst halb so schnell, ihr Gold ist aber 4-mal so viel wert."),
        tempo: 0.5, goldMulti: 4 },
    { id: "sternpflanze", titel: t("Sternenpflanze"), praefix: t("Sternen"), badge: "🌠",
        beschreibung: t("Lässt 5 Sternensaaten fallen."),
        sterne: 5 },
    { id: "regenbogen", titel: t("Regenbogenpflanze"), praefix: t("Regenbogen"), badge: "🌈",
        beschreibung: t("Die Rarität ihrer Saat wird 3-mal gewürfelt, die beste zählt."),
        raritaetsWuerfe: 3 },
    { id: "golden", titel: t("Goldene Pflanze"), praefix: t("Gold"), badge: "🌟",
        beschreibung: t("Ihre Saat ist immer eine legendäre Saat."),
        jackpot: true, chanceProStufe: 0.01, basiskosten: 3500, faktor: 2.2, tarotBonus: { karte: "stern", chance: 0.005 } }
];
const VARIANTE_NACH_ID = Object.fromEntries(VARIANTEN.map(v => [v.id, v]));

// ---------- SHOP: PFLANZEN-UPGRADES (Gold, ein Reiter pro Pflanze) ----------
// Die Kosten wachsen mit dem Wert der Pflanze (wertvollere Pflanze = teurere Upgrades).
// "Ertrag" gibt es von Anfang an. Die anderen schaltet der Ast der Pflanze im Stellarium frei
// (knoten + Pflanzen-id, z.B. "pw_karotte").

const PFLANZEN_UPGRADES = [
    { id: "ertrag", name: t("Ertrag"), basiskosten: 3, faktor: 1.65, max: Infinity, knoten: null,
        beschreibung: t("+25% Verkaufswert. Alle 10 Stufen verdoppelt sich der Wert zusätzlich!"),
        info: pflanze => zahl(verkaufswert(pflanze)) + t(" Gold Grundwert (") + multiText(ertragMulti(pflanze)) + ")" },
    { id: "wachstum", name: t("Wachstum"), basiskosten: 5, faktor: 1.45, max: 20, knoten: "pw_",
        beschreibung: t("-3% Wachstumszeit."),
        info: pflanze => sekText(basisStufenZeitSek(pflanze) * 3) + t(" bis zur Ernte") },
    { id: "pracht", name: t("Prachtexemplar"), basiskosten: 12, faktor: 1.8, max: 15, knoten: "pp_",
        beschreibung: t("+4% Chance, dass die Farbe ihrer Saat 2-mal gewürfelt wird. Die bessere zählt."),
        info: pflanze => prozentText(prachtChance(pflanze)) + t(" Chance") },
    { id: "ueberfluss", name: t("Überfluss"), basiskosten: 20, faktor: 1.9, max: 10, knoten: "pu_",
        beschreibung: t("+5% Chance auf eine zusätzliche Saat bei dieser Pflanze."),
        info: pflanze => prozentText(ueberflussChance(pflanze)) + t(" Chance") }
];
const PFLANZEN_UPGRADE_NACH_ID = Object.fromEntries(PFLANZEN_UPGRADES.map(u => [u.id, u]));

// ---------- SHOP: ALLGEMEINE UPGRADES (Gold) ----------
// Am Anfang gibt es auf dem Markt nur neue Felder und "Ertrag". Diese Upgrades erscheinen erst,
// wenn ihr Stern im Stellarium gekauft ist (knoten).

const SHOP_UPGRADES = [
    // Einmalig und dauerhaft: am Anfang gibt es nur Klicken, Warten und den Markt. Das Stellarium kommt danach.
    // Von Anfang an: mehr Gold fuer jede Ernte (frueh stark, spaeter bei teuren Pflanzen kaum noch spuerbar)
    { id: "erntekorb", knoten: null, icon: "🧺", name: t("Erntekorb"), basiskosten: 8, faktor: 1.7, max: 10,
        beschreibung: t("+1 Gold für jede Ernte."),
        info: () => "+" + level("erntekorb") + t(" Gold pro Ernte") },
    { id: "stellarium", knoten: null, icon: "✨", name: t("Stellarium"), basiskosten: 700, faktor: 1, max: 1,
        beschreibung: t("Schaltet für immer das Stellarium frei: Dort gibst du Sternensaat aus, für neue Pflanzen, bunte Saaten, Helfer und vieles mehr."),
        info: () => t("Freigeschaltet") },
    { id: "aussaat", knoten: "s_aussaat", icon: "🌰", name: t("Schnellere Aussaat"), basiskosten: 8, faktor: 1.9, max: 22,
        beschreibung: t("-1 Klick pro Samen."),
        erledigt: () => (klicksAmMinimum() ? t("die geringste Klickzahl pro Samen (mehr geht nicht)") : null),
        info: () => klicksProSamen() + t(" Klicks pro Samen") },
    { id: "energie", knoten: "s_energie", icon: "⚡", name: t("Längerer Tag"), basiskosten: 25, faktor: 2.6, max: 10,
        beschreibung: t("+25 Energie pro Tag."),
        info: () => energieMax() + t(" Energie pro Tag") },
    { id: "kasse", knoten: "s_kasse", icon: "🛎️", name: t("Klingelnde Kasse"), basiskosten: 30, faktor: 2.2, max: 10,
        beschreibung: t("Jeder Klick auf den Samenladen gibt Gold: 0,2% des Werts deiner besten Pflanze pro Stufe."),
        info: () => zahl(klickGold()) + t(" Gold pro Klick") },
    { id: "sprinkler", knoten: "s_sprinkler", icon: "🚿", name: t("Rasensprenger"), basiskosten: 40, faktor: 2.5, max: 5,
        beschreibung: t("+1 bewässertes Feld pro Tag (wächst doppelt so schnell)."),
        info: () => anzahlBewaessert() + t(" bewässerte Felder pro Tag") },
    { id: "duengerabo", knoten: "s_duengerabo", icon: "🧪", name: t("Dünger-Abo"), basiskosten: 60, faktor: 2.5, max: 5,
        beschreibung: t("+1 gedüngtes Feld pro Tag (doppeltes Gold)."),
        info: () => anzahlGeduengt() + t(" gedüngte Felder pro Tag") },
    { id: "kuhglocke", knoten: "s_kuhglocke", icon: "🔔", name: t("Kuhglocke"), basiskosten: 50, faktor: 2.3, max: 6,
        beschreibung: t("+0,05 Sek. Zeit für die Kombo."),
        info: () => sekText(komboFensterMs() / 1000) + t(" Kombo-Fenster") },
    { id: "laterne", knoten: "s_laterne", icon: "🏮", name: t("Nachtlaterne"), basiskosten: 40, faktor: 2.2, max: 5,
        beschreibung: t("Glühwürmchen geben +2 Energie mehr."),
        info: () => gluehwuermchenEnergie() + t(" Energie pro Glühwürmchen") },
    { id: "marktschreier", knoten: "s_marktschreier", icon: "📣", name: t("Marktschreier"), basiskosten: 80, faktor: 1.55, max: Infinity,
        beschreibung: t("+3% Gold aus allen Ernten. Unendlich oft kaufbar."),
        info: () => "+" + prozentText(0.03 * level("marktschreier")) + t(" Gold") },
    { id: "regentonne", knoten: "s_regentonne", icon: "🛢️", name: t("Regentonne"), basiskosten: 2000, faktor: 2.4, max: 5,
        beschreibung: t("Bewässerte Felder wachsen noch 15% schneller."),
        info: () => "+" + 15 * level("regentonne") + t("% Tempo auf bewässerten Feldern") },
    { id: "vogelhaus", knoten: "s_vogelhaus", icon: "🏠", name: t("Vogelhäuschen"), basiskosten: 1500, faktor: 2.2, max: 5,
        beschreibung: t("Sternschnuppen kommen 12% öfter."),
        info: () => "+" + 12 * level("vogelhaus") + t("% Sternschnuppen") },
    { id: "saatband", knoten: "s_saatband", icon: "🎀", name: t("Saatband"), basiskosten: 1200, faktor: 2.2, max: 5,
        beschreibung: t("+5% Chance, dass ein Samen einen zweiten mitbringt."),
        info: () => "+" + 5 * level("saatband") + t("% Doppelwurf") },
    { id: "sternenkiste", knoten: "s_sternenkiste", icon: "🧺", name: t("Sternenkiste"), basiskosten: 3000, faktor: 1.6, max: Infinity,
        beschreibung: t("+4% Sternensamen aus Ernten. Unendlich oft kaufbar: So wird Gold zu Sternensamen."),
        info: () => "+" + 4 * level("sternenkiste") + t("% Sternensamen") },
    { id: "obstkorb", knoten: "s_obstkorb", icon: "🍎", name: t("Obstkorb"), basiskosten: 6000, faktor: 2.3, max: 5,
        beschreibung: t("+3% Chance auf eine zusätzliche Saat pro Ernte."),
        info: () => "+" + 3 * level("obstkorb") + t("% Chance") },
    { id: "saatsortiment", knoten: "s_saatsortiment", icon: "🎒", name: t("Saatgut-Sortiment"), basiskosten: 5000, faktor: 2.6, max: 5,
        beschreibung: t("Alle Spezialpflanzen erscheinen 10% öfter."),
        info: () => "+" + 10 * level("saatsortiment") + t("% Spezialpflanzen") }
];

// ---------- STERNENBAUM (kostet Sternensamen) ----------
// Ein grosser Baum, den man mit der Maus verschieben und mit dem Mausrad zoomen kann.
// In der Mitte steht der Weizen (von Anfang an da). Von dort gehen 4 Aeste ab:
//   oben: Pflanzen (jede Pflanze mit eigenem kleinen Ast), rechts: Ernte (+ Spezialpflanzen),
//   unten: Hof (schaltet die Markt-Upgrades frei), links: Helfer (+ Glueck).
// pos = [x, y] in Pixeln, [0, 0] = Mitte. vor = Stern, der vorher mindestens 1x gekauft sein muss.
// vorMax: true = der Vorgaenger muss komplett ausgebaut sein ("Stufe 2"-Sterne: viel teurer, viel besser).
// erledigt: gibt einen Namen zurueck, wenn ein dauerhafter Fortschritt (Tarot, Mondteich) denselben Nachteil schon loest.
//           Der Stern ist dann in jedem Run von Anfang an voll.
// art: "pflanze" (schaltet eine Pflanze frei), "shop" (schaltet ein Markt-Upgrade frei), sonst ein normaler Stern.

// Sprungziele im Baum (z.B. fuer den Knopf "Zur Mitte")
const BAUM_ZIELE = [
    { id: "mitte", name: t("Mitte"), icon: "🌾", pos: [0, -60] },
    { id: "pflanzen", name: t("Pflanzen"), icon: "🌱", pos: [0, -1400] },
    { id: "ernte", name: t("Ernte"), icon: "🍀", pos: [850, -150] },
    { id: "besondere", name: t("Spezialpflanzen"), icon: "✨", pos: [1450, 320] },
    { id: "hof", name: t("Hof"), icon: "🏡", pos: [0, 850] },
    { id: "helfer", name: t("Helfer"), icon: "🐿️", pos: [-640, 160] },
    { id: "glueck", name: t("Glück"), icon: "🎲", pos: [-1400, -110] }
];

// Alle normalen Sterne kosten STERN_PREIS_FAKTOR mal so viel wie eingetragen (Balancing an einer Stelle)
const STERN_PREIS_FAKTOR = 1.8;
function stern(id, ast, icon, pos, vor, name, basiskosten, faktor, max, beschreibung, info, extra = {}) {
    return { id, ast, icon, pos, vor, name, basiskosten: rundePreis(basiskosten * STERN_PREIS_FAKTOR), faktor, max, beschreibung, info, ...extra };
}

// Stern, der ein Markt-Upgrade freischaltet
function shopStern(id, ast, pos, vor, kosten) {
    const u = SHOP_UPGRADES.find(s => s.knoten === id);
    return { id, ast, icon: u.icon, pos, vor, name: u.name, basiskosten: kosten, faktor: 1, max: 1, art: "shop", markt: u,
        beschreibung: t("Schaltet auf dem Markt frei: ") + u.name + " (" + u.beschreibung + ")",
        info: () => (level(id) > 0 ? t("Auf dem Markt freigeschaltet") : t("Noch nicht auf dem Markt")) };
}

// Stern, der ein Gluecksspiel freischaltet (einmal kaufen)
function spielStern(id, icon, pos, vor, name, kosten, beschreibung) {
    return { id, ast: "glueck", icon, pos, vor, name, basiskosten: kosten, faktor: 1, max: 1, beschreibung,
        info: () => (level(id) > 0 ? t("Freigeschaltet: auf dem Markt unter Glücksspiel") : t("Gesperrt")) };
}

const SKILLS = [
    // ----- Ernte (rechts): Münz-Farben, jede erst, wenn die vorige komplett ausgebaut ist -----
    stern("gruen", "ernte", "🟢", [300, 0], "p_weizen", t("Grüner Daumen"), 30, 1.8, 6,
        t("Stufe 1 schaltet ungewöhnliche Saaten frei (grün, x2,5 Gold, 15% Chance). Jede weitere Stufe: +3% Chance."),
        () => prozentText(raritaetsChancen()[1]) + t(" Chance auf Ungewöhnlich")),
    stern("blau", "ernte", "🔵", [520, 0], "gruen", t("Blaues Wunder"), 150, 1.9, 5,
        t("Stufe 1 schaltet seltene Saaten frei (blau, x5 Gold). Jede Stufe: +2% Chance."),
        () => prozentText(raritaetsChancen()[2]) + t(" Chance auf Selten"), { vorMax: true }),
    stern("lila", "ernte", "🟣", [740, 0], "blau", t("Lila Laune"), 600, 2, 5,
        t("Stufe 1 schaltet epische Saaten frei (lila, x12,5 Gold, 3% Chance). Jede weitere Stufe: +1% Chance."),
        () => prozentText(raritaetsChancen()[3]) + t(" Chance auf Episch"), { vorMax: true }),
    stern("gelb", "ernte", "🟡", [960, 0], "lila", t("Goldrausch"), 2500, 2.2, 4,
        t("Stufe 1 schaltet legendäre Saat frei (gelb, x50 Gold, vor der 2. Rechnung x25, 1% Chance). Jede weitere Stufe: +0,5% Chance."),
        () => prozentText(raritaetsChancen()[4]) + t(" Chance auf legendäre Saat"), { vorMax: true }),
    stern("edelstein", "ernte", "💍", [1180, 0], "gelb", t("Edelsteinschleifer"), 5000, 2.3, 5,
        t("Alle Farb-Multiplikatoren (außer Gewöhnlich) werden um 10% stärker."),
        () => multiText(1 + edelsteinBonus()) + t(" auf die Farben")),
    stern("sternengold", "ernte", "🔆", [1400, 0], "edelstein", t("Sternengold"), 8000, 1.4, Infinity,
        t("+4% Gold aus allen Ernten. Unendlich oft kaufbar."),
        () => "+" + prozentText(0.04 * level("sternengold")) + t(" Gold")),
    stern("glueck", "ernte", "🍀", [520, -220], "gruen", t("Glückskleeblatt"), 60, 1.9, 10,
        t("+5% Chance, dass eine Saat doppelt zählt."),
        () => prozentText(glueckChance()) + t(" Chance auf doppeltes Gold")),
    stern("sternensammler", "ernte", "🌟", [740, -220], "glueck", t("Sternensammler"), 150, 1.9, 15,
        t("+5% Chance, dass eine Sternensaat doppelt zählt."),
        () => prozentText(sternDoppelChance()) + t(" Chance auf doppelte Sternensamen")),
    stern("sternenklick", "ernte", "💫", [960, -220], "sternensammler", t("Sternenklick"), 100, 2.2, 10,
        t("+0,25 Sternensamen für jeden Klick auf den Samenladen (4 Klicks = 1 Sternensamen)."),
        () => sternensamenProKlick() + t(" Sternensamen pro Klick")),
    stern("schwereMuenzen", "ernte", "🪙", [740, -440], "sternensammler", t("Schwere Saat"), 300, 2, 5,
        t("Gewöhnliche Saaten sind 20% mehr wert."),
        () => "+" + prozentText(0.2 * level("schwereMuenzen")) + t(" auf gewöhnliche Saaten")),
    stern("doppelernte", "ernte", "🌾", [960, -440], "schwereMuenzen", t("Doppelernte"), 1200, 2.2, 5,
        t("+3% Chance, dass eine Ernte doppelt so viele Saaten fallen lässt."),
        () => prozentText(0.03 * level("doppelernte")) + t(" Chance")),
    stern("fuellhorn", "ernte", "🎁", [1180, -440], "doppelernte", t("Füllhorn"), 500, 3.5, 5,
        t("+100% Gold aus allen Ernten."),
        () => "+" + prozentText(level("fuellhorn")) + t(" Gold")),
    stern("goldmarie", "ernte", "🌟", [1400, -440], "fuellhorn", t("Goldmarie"), 30000, 8, 3,
        t("Alles Gold aus Ernten wird verdoppelt (jede Stufe noch einmal)."),
        () => multiText(Math.pow(2, level("goldmarie"))) + t(" Gold"), { abzeichen: "💰" }),
    stern("ernterausch", "ernte", "🔥", [1180, -220], "sternenklick", t("Ernterausch"), 1500, 1, 1,
        t("Jede 30. Ernte an einem Tag startet einen Ernterausch: 6 Sekunden lang dreifaches Gold."),
        () => (level("ernterausch") > 0 ? t("Aktiv") : t("Nicht aktiv"))),
    stern("sternenstaub", "ernte", "🌠", [740, -660], "schwereMuenzen", t("Sternenstaub"), 150, 1.8, 10,
        t("+20% Sternensamen aus Ernten."),
        () => "+" + prozentText(0.2 * level("sternenstaub")) + t(" Sternensamen")),
    stern("sternenquelle", "ernte", "⛲", [960, -660], "sternenstaub", t("Sternenquelle"), 400, 2, 10,
        t("Jede Ernte gibt 2 Sternensamen mehr."),
        () => "+" + 2 * level("sternenquelle") + t(" pro Ernte")),
    stern("sternenflut", "ernte", "🌌", [740, -880], "sternenstaub", t("Sternenflut"), 20000, 6, 3,
        t("Stufe 2 von Sternenstaub: Sternensamen aus Ernten x2 (jede Stufe noch einmal)."),
        () => multiText(Math.pow(2, level("sternenflut"))) + t(" Sternensamen"), { vorMax: true, abzeichen: "Ⅱ" }),
    stern("glueck2", "ernte", "☘️", [630, -360], "glueck", t("Vierblättriger Klee"), 3000, 2.5, 5,
        t("Stufe 2 vom Glückskleeblatt: +10% Chance, dass eine Saat doppelt zählt."),
        () => prozentText(glueckChance()) + t(" Chance auf doppeltes Gold"), { vorMax: true, abzeichen: "Ⅱ" }),
    stern("midas", "ernte", "👑", [1400, -220], "ernterausch", t("Midas' Berührung"), 2500, 1, 1,
        t("Jede legendäre Saat lässt zusätzlich eine Sternensaat mit 50 Sternensamen fallen."),
        () => (level("midas") > 0 ? t("Aktiv") : t("Nicht aktiv"))),

    // ----- Neue Sterne am Rand der Aeste -----
    stern("jackpotjaeger", "ernte", "🎰", [1620, -220], "midas", t("Goldgräber"), 25000, 4, 3,
        t("Legendäre Saaten sind pro Stufe noch einmal so viel wert (Stufe 1 = doppelt, Stufe 3 = vierfach)."),
        () => "x" + (1 + level("jackpotjaeger")) + t(" Wert der legendären Saat")),
    stern("goldschauer", "ernte", "🌦️", [1620, 0], "sternengold", t("Goldschauer"), 3000, 2.5, 3,
        t("Der seltene Goldregen kommt pro Stufe 50% öfter."),
        () => "+" + 50 * level("goldschauer") + t("% Goldregen")),
    stern("schnuppenfaenger", "helfer", "🌠", [-960, 660], "magnetfeld", t("Sternschnuppen-Fänger"), 800, 2, 5,
        t("Der Bonus einer gefangenen Sternschnuppe (doppeltes Gold) hält pro Stufe 3 Sekunden länger."),
        () => "+" + 3 * level("schnuppenfaenger") + t(" Sek. Sternschnuppen-Bonus")),
    stern("kombovirtuose", "helfer", "🎼", [-740, -440], "s_kuhglocke", t("Kombo-Virtuose"), 3000, 3, 2,
        t("Auf der höchsten Kombo-Stufe (ab 150) zählt jeder Klick pro Stufe einmal mehr (x5 wird x6, dann x7)."),
        () => t("Höchste Kombo: x") + (5 + level("kombovirtuose"))),

    // ----- Himmel (oben rechts): Sterne rund um Sternensamen -----
    stern("sternbild", "ernte", "✴️", [960, -880], "sternenquelle", t("Sternbild"), 2000, 1, 1,
        t("Für je 10 gekaufte Sterne im Stellarium gibt es +1% Gold aus allen Ernten."),
        () => "+" + Math.floor(gekaufteSterne() / 10) + t("% Gold")),
    stern("kometenregen", "ernte", "☄️", [1180, -880], "sternbild", t("Kometenregen"), 3000, 2.2, 3,
        t("Jede gefangene Sternschnuppe schenkt dir Sternensamen (mehr, je besser deine beste Pflanze ist)."),
        () => (level("kometenregen") > 0 ? "+" + zahl(kometenSterne()) + t(" Sternensamen pro Sternschnuppe") : t("Nicht aktiv"))),
    stern("polarstern", "ernte", "⭐", [1180, -1100], "kometenregen", t("Polarstern"), 6000, 1, 1,
        t("Die erste Ernte jedes Tages lässt ein großes Sternensamen-Geschenk fallen."),
        () => (level("polarstern") > 0 ? "+" + zahl(polarsternSterne()) + t(" Sternensamen am Morgen") : t("Nicht aktiv"))),
    stern("mondsichel", "ernte", "🌙", [960, -1100], "sternbild", t("Mondsichel"), 2500, 2, 3,
        t("Ernten am Abend und in der Nacht geben 25% mehr Sternensaat pro Stufe."),
        () => "+" + 25 * level("mondsichel") + t("% Sternensaat nachts")),
    stern("milchstrasse", "ernte", "🌌", [1400, -880], "kometenregen", t("Milchstraße"), 8000, 2.5, 5,
        t("+5% Chance pro Stufe, dass eine Ernte eine zweite Sternensaat fallen lässt."),
        () => "+" + 5 * level("milchstrasse") + t("% zweite Sternensaat")),
    shopStern("s_sternenkiste", "ernte", [1400, -1100], "milchstrasse", 6000),
    stern("bienenkoenigin", "helfer", "👑", [-1180, 440], "biene", t("Bienenkönigin"), 4000, 2.5, 3,
        t("Stufe 2 der Bienen: Sie kommen pro Stufe 50% öfter."),
        () => "+" + 50 * level("bienenkoenigin") + t("% Bienen"), { vorMax: true, abzeichen: "Ⅱ" }),
    stern("spielerglueck", "glueck", "🎲", [-1840, -220], "plinko", t("Spielerglück"), 3000, 2.2, 5,
        t("+4% Glück bei allen Glücksspielen pro Stufe."),
        () => "+" + 4 * level("spielerglueck") + t("% Glück")),

    // ----- Jahreszeiten (unten rechts): jede Jahreszeit bekommt einen eigenen Stern -----
    stern("jahresrad", "jahreszeit", "🎡", [800, 720], "s_kasse", t("Jahresrad"), 300, 2.2, 4,
        t("Alle guten Effekte der Jahreszeiten werden um 25% pro Stufe stärker (z.B. Frühling +20% Wachstum wird zu +25%)."),
        () => "+" + 25 * level("jahresrad") + t("% Jahreszeit-Effekte")),
    stern("bluetenzauber", "jahreszeit", "🌸", [1020, 580], "jahresrad", t("Blütenzauber"), 400, 2, 3,
        t("Im Frühling: +4% Chance auf grüne und +1% auf lila Saat pro Stufe."),
        () => "+" + 4 * level("bluetenzauber") + t("% grüne Saat im Frühling")),
    stern("sonnenernte", "jahreszeit", "🌻", [1020, 860], "jahresrad", t("Sonnenernte"), 400, 2, 3,
        t("Im Sommer: +20% Gold aus allen Ernten pro Stufe."),
        () => "+" + 20 * level("sonnenernte") + t("% Gold im Sommer")),
    stern("erntedank", "jahreszeit", "🍁", [1240, 580], "bluetenzauber", t("Erntedank"), 600, 2, 3,
        t("Im Herbst: jede Sternensaat ist 25% pro Stufe mehr wert."),
        () => "+" + 25 * level("erntedank") + t("% Sternensaat im Herbst")),
    stern("frostschutz", "jahreszeit", "🧣", [1240, 860], "sonnenernte", t("Frostschutz"), 500, 2.5, 2,
        t("Stufe 1: Im Winter wachsen Pflanzen nicht mehr langsamer. Stufe 2: im Winter sogar 10% schneller."),
        () => level("frostschutz") >= 2 ? t("Winter: +10% Wachstum") : level("frostschutz") ? t("Winter: normales Wachstum") : t("Winter: -15% Wachstum")),
    stern("saisonfest", "jahreszeit", "🎊", [1460, 720], "erntedank", t("Saisonfest"), 2000, 1, 1,
        t("Der erste Tag jeder Jahreszeit ist ein Festtag: x1,5 Gold aus allen Ernten."),
        () => (level("saisonfest") > 0 ? t("Aktiv") : t("Nicht aktiv"))),
    stern("sternenkalender", "jahreszeit", "📅", [1460, 960], "frostschutz", t("Sternenkalender"), 1500, 1, 1,
        t("Bei jedem Wechsel der Jahreszeit bekommst du Sternensamen geschenkt (mehr, je besser deine beste Pflanze ist)."),
        () => (level("sternenkalender") > 0 ? t("Aktiv") : t("Nicht aktiv"))),

    // ----- Helfer (links) -----
    stern("radius", "helfer", "🖐️", [-520, -220], "kombo", t("Breiter Cursor"), 150, 1.35, 30,
        t("+10% Radius um deinen Cursor. Er sammelt Saaten ein und erntet beim Klicken alle fertigen ") +
            t("Pflanzen, die er berührt. Bis Stufe 30."),
        () => sammelRadius().toFixed(1).replace(".", ",") + t(" Pixel Radius")),
    stern("vogelscheuche", "helfer", "🧑‍🌾", [-300, 220], "kombo", t("Vogelscheuche"), 250, 1, 1,
        t("Die Vogelscheuche im Hof verscheucht jeden Tag die erste Krähe von allein."),
        () => (level("vogelscheuche") > 0 ? t("Aktiv: 1 Krähe pro Tag") : t("Nicht aktiv")),
        { erledigt: () => (metaLevel("vogelscheuchenlehre") > 0 ? t("Vogelscheuchen-Lehre (Mondteich)") : null) }),
    stern("kombo", "helfer", "🥁", [-300, 0], "p_weizen", t("Kombo-Meister"), 40, 2, 10,
        t("+0,1 Sek. Zeit zwischen zwei Klicks, bevor die Kombo abbricht."),
        () => sekText(komboFensterMs() / 1000) + t(" Kombo-Fenster")),
    shopStern("s_kuhglocke", "helfer", [-740, -220], "kombo", 300),
    stern("eichhoernchen", "helfer", "🐿️", [-520, 220], "kombo", t("Eichhörnchen-Helfer"), 100, 1.85, 20,
        t("Drückt automatisch den Samenladen (baut keine Kombo auf, gibt keine Sternensamen)."),
        () => helferKlicksProSek() + t(" Klicks pro Sekunde")),
    stern("haustiertraining", "helfer", "🐾", [-740, 0], "kombo", t("Begleiter-Training"), 200, 2, 5,
        t("Dein Begleiter hilft öfter und sammelt liegende Saaten für dich ein."),
        () => prozentText(haustierHilfeChance()) + t(" Chance alle ") + KONFIG.haustierHilfeSek + t(" Sek.")),
    stern("igel", "helfer", "🦔", [-740, 220], "eichhoernchen", t("Igel-Sammler"), 150, 1.85, 20,
        t("Igel laufen zur gelandeten Saat und sammeln sie ein. Mehr Stufen: schnellere Igel, alle 5 Stufen ein Igel mehr."),
        () => igelAnzahl() + (igelAnzahl() === 1 ? t(" Igel") : t(" Igel")) + t(", Tempo ") + igelTempo()),
    stern("saatspatz", "helfer", "🐦", [-520, 440], "eichhoernchen", t("Saat-Spatz"), 800, 2.2, 5,
        t("Ein Spatz wirft regelmäßig einen Samen auf ein freies Feld."),
        () => (level("saatspatz") > 0 ? t("Alle ") + sekText(spatzIntervallSek()) : t("Noch kein Spatz"))),
    stern("gluehglas", "helfer", "🫙", [-740, 440], "saatspatz", t("Glühwürmchenglas"), 900, 2, 4,
        t("Glühwürmchen kommen 25% öfter."),
        () => "+" + prozentText(0.25 * level("gluehglas")) + t(" Glühwürmchen")),
    stern("biene", "helfer", "🐝", [-960, 220], "igel", t("Bienenstock"), 1500, 2.1, 5,
        t("Bienen besuchen deine Pflanzen: regelmäßig wächst eine Pflanze sofort ein Drittel weiter."),
        () => (level("biene") > 0 ? t("Alle ") + sekText(bienenIntervallSek()) : t("Noch keine Bienen"))),
    stern("magnetfeld", "helfer", "🧲", [-960, 440], "biene", t("Magnetfeld"), 2000, 2.4, 3,
        t("Gelandete Saaten rollen langsam zu deinem Cursor."),
        () => magnetStaerke() + t(" Pixel pro Sekunde")),
    stern("eichhoernchen2", "helfer", "🐿️", [-740, 660], "eichhoernchen", t("Eichhörnchen-Kolonie"), 8000, 1.9, 10,
        t("Stufe 2 der Eichhörnchen: +2 automatische Klicks pro Sekunde."),
        () => helferKlicksProSek() + t(" Klicks pro Sekunde"), { vorMax: true, abzeichen: "Ⅱ" }),
    stern("erntehase", "helfer", "🐇", [-520, -440], "radius", t("Erntehase"), 600, 2.3, 5,
        t("Ein Hase hoppelt über den Acker und erntet regelmäßig eine fertige Pflanze für dich."),
        () => (level("erntehase") > 0 ? t("Alle ") + sekText(erntehaseSek()) : t("Noch kein Hase"))),
    stern("sternhoernchen", "helfer", "🌰", [-340, 420], "eichhoernchen", t("Sternenhörnchen"), 900, 1, 1,
        t("Eichhörnchen-Klicks geben jetzt auch Sternensamen (1 für je 2 Klicks)."),
        () => (level("sternhoernchen") > 0 ? t("Aktiv") : t("Nicht aktiv"))),
    stern("helferlohn", "helfer", "💪", [-560, 680], "sternhoernchen", t("Fleißige Pfoten"), 3000, 1, 1,
        t("Jeder Klick eines Eichhörnchens zählt doppelt."),
        () => (level("helferlohn") > 0 ? t("Aktiv") : t("Nicht aktiv"))),

    // ----- Glueck (links aussen, haengt am Helfer-Ast) -----
    spielStern("muenzwurf", "🪙", [-960, 0], "haustiertraining", t("Münzwurf"), 200,
        t("Schaltet den Münzwurf auf dem Markt frei: Setz einen Teil deines Goldes. Kopf = doppelt, Zahl = weg.")),
    spielStern("gacha", "🎰", [-1180, 0], "muenzwurf", t("Slotmaschine"), 500,
        t("Schaltet die Slotmaschine auf dem Markt frei: Setz einen Teil deines Goldes, 3 gleiche Symbole gewinnen.")),
    spielStern("rubbellos", "🎟️", [-1400, 0], "gacha", t("Rubbellose"), 1200,
        t("Schaltet Rubbellose auf dem Markt frei: 9 Felder aufrubbeln, 3 gleiche Symbole gewinnen.")),
    spielStern("huehnerrennen", "🐔", [-1620, 0], "rubbellos", t("Hühnerrennen"), 2500,
        t("Schaltet das Hühnerrennen auf dem Markt frei: Wette auf ein Huhn, je größer der Außenseiter, desto höher der Gewinn.")),
    spielStern("plinko", "🔻", [-1840, 0], "huehnerrennen", t("Samen-Plinko"), 4000,
        t("Schaltet Samen-Plinko auf dem Markt frei: Ein Samen hüpft durch Nägel in ein Gewinnfach.")),
    spielStern("roulette", "🎡", [-2060, 0], "plinko", t("Roulette"), 6000,
        t("Schaltet Roulette auf dem Markt frei: Setz auf Rot, Schwarz, Gerade, Ungerade oder die grüne 0.")),
    spielStern("blackjack", "🃏", [-2280, 0], "roulette", t("Blackjack"), 9000,
        t("Schaltet Blackjack auf dem Markt frei: Spiel gegen den Dealer, wer näher an 21 kommt.")),
    stern("glueckstraehne", "glueck", "🍀", [-960, -220], "muenzwurf", t("Glückssträhne"), 400, 2, 5,
        t("+3% Glück bei allen Glücksspielen (mehr Gewinnchance)."),
        () => "+" + prozentText(glueckBonus()) + t(" Glück")),
    stern("gluecksrabatt", "glueck", "🏷️", [-1180, -220], "gacha", t("Goldene Walzen"), 800, 2, 5,
        t("Gewinne an der Slotmaschine sind 10% höher."),
        () => "+" + prozentText(0.1 * level("gluecksrabatt")) + t(" Slot-Gewinne")),
    stern("stammkunde", "glueck", "🎫", [-1400, -220], "rubbellos", t("Stammkunde"), 1500, 2.5, 3,
        t("+1 Spiel pro Pause bei allen Glücksspielen."),
        () => "+" + level("stammkunde") + t(" Spiele pro Pause")),
    stern("haendlerfreund", "glueck", "🧳", [-1620, -220], "huehnerrennen", t("Händlerfreund"), 2000, 2.5, 2,
        t("Der Wanderhändler kommt öfter vorbei."),
        () => prozentText(haendlerChance()) + t(" Chance nach jedem Tag")),

    // ----- Hof (unten): schaltet die meisten Markt-Upgrades frei -----
    shopStern("s_aussaat", "hof", [0, 300], "p_weizen", 20),
    shopStern("s_energie", "hof", [-220, 520], "s_aussaat", 60),
    stern("giessen", "hof", "💧", [0, 520], "s_aussaat", t("Gießkanne"), 50, 2, 8,
        t("Jeden Tag wird ein zufälliges Feld bewässert 💧: Es wächst den ganzen Tag doppelt so schnell."),
        () => anzahlBewaessert() + t(" bewässerte Felder pro Tag")),
    stern("feldvermessung", "hof", "📐", [220, 520], "s_aussaat", t("Feldvermessung"), 200, 2, 8,
        t("Neue Felder kosten 8% weniger."),
        () => "-" + prozentText(1 - Math.pow(0.92, level("feldvermessung"))) + t(" Feldpreis")),
    stern("sonnenuhr", "hof", "🕰️", [-440, 740], "s_energie", t("Sonnenuhr"), 150, 1.9, 10,
        t("+10 Energie pro Tag."),
        () => energieMax() + t(" Energie pro Tag")),
    stern("fruehaufsteher", "hof", "🐓", [-220, 740], "s_energie", t("Frühaufsteher"), 80, 1.9, 8,
        t("Jeder Tag beginnt mit bereits gepflanzten Samen."),
        () => level("fruehaufsteher") + t(" Samen zum Tagesstart")),
    stern("duengen", "hof", "🪱", [0, 740], "giessen", t("Dünger"), 100, 2, 8,
        t("Jeden Tag wird ein zufälliges Feld gedüngt 🪱: Es gibt den ganzen Tag doppeltes Gold."),
        () => anzahlGeduengt() + t(" gedüngte Felder pro Tag")),
    shopStern("s_sprinkler", "hof", [220, 740], "giessen", 400),
    shopStern("s_kasse", "hof", [440, 740], "feldvermessung", 800),
    stern("morgentau", "hof", "🌅", [-440, 960], "sonnenuhr", t("Morgentau"), 600, 2, 4,
        t("Im ersten Fünftel des Tages wachsen alle Pflanzen 25% schneller."),
        () => "+" + prozentText(0.25 * level("morgentau")) + t(" Wachstum am Morgen")),
    stern("doppelwurf", "hof", "🎯", [-220, 960], "fruehaufsteher", t("Doppelwurf"), 250, 2, 8,
        t("+10% Chance, dass ein fertiger Samen einen zweiten Samen mitbringt."),
        () => prozentText(doppelwurfChance()) + t(" Chance")),
    shopStern("s_duengerabo", "hof", [0, 960], "duengen", 900),
    stern("zinsen", "hof", "🐷", [440, 960], "s_kasse", t("Sparschwein"), 700, 2.2, 5,
        t("Bei Feierabend bekommst du 2% Zinsen auf dein Gold (höchstens die Hälfte der nächsten Rechnung)."),
        () => prozentText(zinsSatz()) + t(" Zinsen pro Tag")),
    stern("wetterfrosch", "hof", "🐸", [-440, 1180], "morgentau", t("Wetterfrosch"), 1500, 2.2, 3,
        t("Wetter kommt öfter, und gutes Wetter ist wahrscheinlicher."),
        () => prozentText(wetterChance()) + t(" Chance auf Wetter pro Tag")),
    stern("abendsonne", "hof", "🌇", [-220, 1180], "doppelwurf", t("Abendsonne"), 1800, 2, 4,
        t("Ernten im letzten Drittel des Tages geben 15% mehr Gold."),
        () => "+" + prozentText(0.15 * level("abendsonne")) + t(" Gold am Abend")),
    shopStern("s_marktschreier", "hof", [0, 1180], "s_duengerabo", 5000),
    shopStern("s_regentonne", "hof", [220, 1400], "wurmhumus", 2500),
    shopStern("s_vogelhaus", "hof", [-220, 1620], "s_laterne", 1800),
    shopStern("s_saatsortiment", "hof", [0, 1400], "s_marktschreier", 4000),
    shopStern("s_saatband", "hof", [-440, 1620], "nachtwache", 1500),
    shopStern("s_obstkorb", "hof", [220, 1620], "s_regentonne", 5000),
    stern("lagerhaus", "hof", "🏚️", [440, 1180], "zinsen", t("Lagerhaus"), 2500, 2.3, 4,
        t("Zinsen dürfen 25% der nächsten Rechnung mehr betragen."),
        () => t("Zinsen bis ") + prozentText(zinsDeckelAnteil()) + t(" der Rechnung")),
    shopStern("s_laterne", "hof", [-220, 1400], "abendsonne", 1200),
    stern("nachtwache", "hof", "🦉", [-440, 1400], "wetterfrosch", t("Nachtwache"), 3000, 2.2, 3,
        t("Glühwürmchen geben 50% mehr Energie."),
        () => gluehwuermchenEnergie() + t(" Energie pro Glühwürmchen")),
    stern("gewaechshaus", "hof", "🏡", [220, 960], "s_sprinkler", t("Gewächshaus"), 300, 2.5, 4,
        t("Pflanzen auf bewässerten Feldern geben 50% mehr Gold."),
        () => "+" + prozentText(0.5 * level("gewaechshaus")) + t(" Gold auf bewässerten Feldern")),
    stern("wurmhumus", "hof", "🪱", [220, 1180], "gewaechshaus", t("Wurmhumus"), 1600, 1, 1,
        t("Gedüngte Felder geben dreifaches statt doppeltes Gold."),
        () => (level("wurmhumus") > 0 ? t("x3 Gold auf gedüngten Feldern") : t("x2 Gold auf gedüngten Feldern"))),
    stern("erntefest", "hof", "🎪", [440, 1400], "lagerhaus", t("Erntefest"), 900, 3, 3,
        t("Am Rechnungstag (jeder 5. Tag) gibt es +100% Gold aus allen Ernten."),
        () => "+" + prozentText(level("erntefest")) + t(" Gold am Rechnungstag")),

    // ----- Mechanik-Sterne: neue Spielweisen statt nur Prozente (Platz wird automatisch frei gesucht) -----
    stern("saatkette", "ernte", "🔗", [1180, -660], "doppelernte", t("Saatkette"), 2000, 2.2, 5,
        t("+8% Chance pro Stufe, dass ein abgeerntetes Feld sofort einen neuen Samen bekommt."),
        () => prozentText(0.08 * level("saatkette")) + t(" Chance auf Neupflanzung"), { autoPos: true }),
    stern("goldenestunde", "hof", "🌅", [-220, 1400], "abendsonne", t("Goldene Stunde"), 2500, 2.5, 3,
        t("In den letzten 10% des Tages geben Ernten +50% Gold pro Stufe."),
        () => "+" + 50 * level("goldenestunde") + t("% Gold kurz vor Feierabend"), { autoPos: true }),
    stern("morgenkombo", "helfer", "🌄", [-300, -220], "kombo", t("Morgen-Schwung"), 500, 2, 5,
        t("Jeder Tag beginnt mit 15 Kombo pro Stufe (Stufe 5: gleich x3)."),
        () => 15 * level("morgenkombo") + t(" Kombo zum Tagesstart"), { autoPos: true }),

    stern("bodenkunde", "hof", "🟫", [0, 1620], "duengen", t("Bodenkunde"), 800, 2.5, 3,
        t("Fruchtbarer Boden: Felder brauchen pro Stufe 5 Ernten weniger, um besser zu werden (30, dann 25, 20, 15)."),
        () => bodenErntenProStufe() + t(" Ernten pro Boden-Stufe"), { autoPos: true }),
    stern("feldkunde", "hof", "📚", [440, 1620], "erntefest", t("Feldkunde"), 6000, 1.5, Infinity,
        t("Alle Pflanzen wachsen 2% schneller. Unendlich oft kaufbar."),
        () => "+" + 2 * level("feldkunde") + t("% Wachstum"), { autoPos: true }),
    stern("sternenmeer", "ernte", "🌊", [1620, -880], "milchstrasse", t("Sternenmeer"), 9000, 1.5, Infinity,
        t("+3% Sternensamen aus allen Ernten. Unendlich oft kaufbar."),
        () => "+" + 3 * level("sternenmeer") + t("% Sternensamen"), { autoPos: true }),

    // ----- Grundwerte (unten links, am Hof): stärken alles, was du hast -----
    stern("g_gold", "hof", "🪙", [-700, 960], "sonnenuhr", t("Grundwert: Gold"), 400, 2, 10,
        t("+5% Gold aus allen Ernten."), () => "+" + prozentText(grundwert("g_gold")) + t(" Gold")),
    stern("g_sterne", "hof", "✨", [-920, 960], "g_gold", t("Grundwert: Sternensamen"), 400, 2, 10,
        t("+5% Sternensamen aus allen Ernten."), () => "+" + prozentText(grundwert("g_sterne")) + t(" Sternensamen")),
    stern("g_energie", "hof", "⚡", [-700, 1180], "g_gold", t("Grundwert: Energie"), 300, 2, 10,
        t("+5% Energie pro Tag."), () => "+" + prozentText(grundwert("g_energie")) + t(" Energie")),
    stern("g_wachstum", "hof", "🌱", [-920, 1180], "g_energie", t("Grundwert: Wachstum"), 500, 2, 10,
        t("Alle Pflanzen wachsen 5% schneller."), () => "+" + prozentText(grundwert("g_wachstum")) + t(" Wachstum")),
    stern("g_harmonie", "hof", "☯️", [-1140, 1070], "g_sterne", t("Harmonie"), 5000, 1.6, Infinity,
        t("+3% auf alle vier Grundwerte (Gold, Sternensamen, Energie, Wachstum). Unendlich oft kaufbar."),
        () => "+" + 3 * level("g_harmonie") + t("% auf alle Grundwerte"))
];

// Grundwert = eigener Stern (+5% pro Stufe) + Harmonie (+3% pro Stufe)
function grundwert(id) {
    return 0.05 * level(id) + 0.03 * level("g_harmonie");
}

// ----- Spezialpflanzen: eine Kette rechts unten, jede braucht die vorige (verborgen, bis sie erreichbar ist) -----
VARIANTEN.forEach((variante, index) => {
    const chanceProStufe = variante.chanceProStufe || 0.05;
    SKILLS.push({
        id: "v_" + variante.id,
        ast: "besondere",
        icon: variante.badge,
        pos: [420 + 200 * index, 260 + (index % 2) * 160],
        vor: index > 0 ? "v_" + VARIANTEN[index - 1].id : "gruen",
        geheim: true,
        variante,
        name: variante.titel,
        basiskosten: variante.basiskosten || 80 + 110 * index,
        faktor: variante.faktor || 1.9,
        max: 4,
        beschreibung: "+" + prozentText(chanceProStufe) + t(" Chance pro Samen. ") + variante.beschreibung,
        chanceProStufe,
        info: () => prozentText(variantenChance(variante)) + t(" Chance pro Samen")
    });
});

// ----- Pflanzen (oben): der Weizen ist die Mitte des Baums, darueber waechst eine Ranke mit allen Pflanzen.
// Jede Pflanze hat einen kleinen eigenen Ast: Wachstum, Pracht und Ueberfluss auf dem Markt freischalten und ein eigener Bonus.
// Kosten der Aeste haengen am Freischaltpreis der Pflanze: Der ganze Ast einer Pflanze kostet etwa so viel
// wie die naechste Pflanze. So lohnt es sich, erst den Weizen auszubauen, bevor man zur Karotte geht, usw.

// Auf 2 gueltige Stellen runden (1.234 -> 1.200), damit die Preise schoen aussehen
function rundePreis(wert) {
    if (wert < 10) return Math.max(1, Math.round(wert));
    const stellen = Math.pow(10, Math.floor(Math.log10(wert)) - 1);
    return Math.round(wert / stellen) * stellen;
}

function pflanzenAstPos(index) {
    if (index === 0) return [0, 0];
    return [Math.round(Math.sin(index * 1.3) * 80), -520 - (index - 1) * 380];
}

PFLANZEN_VORLAGEN.forEach((p, index) => {
    const [x, y] = pflanzenAstPos(index);
    const vorige = PFLANZEN_VORLAGEN[index - 1];
    const basis = index === 0 ? 40 : p.unlockKosten;
    // Der Weizen hat seinen Ast schraeg ueber der Mitte, damit er den anderen Aesten nicht im Weg ist
    const versatz = index === 0
        ? { pw: [-170, -250], pp: [-320, -310], pu: [170, -250], pb: [320, -310], pg: [480, -380] }
        : { pw: [x - 190, y + 60], pp: [x - 340, y - 10], pu: [x + 190, y + 60], pb: [x + 340, y - 10], pg: [x + 500, y - 80] };
    SKILLS.push({
        id: "p_" + p.id, ast: "pflanzen", art: "pflanze", pflanze: p.id, icon: p.emoji, pos: [x, y],
        vor: vorige ? "p_" + vorige.id : null, name: p.name, basiskosten: p.unlockKosten, faktor: 1, max: 1,
        beschreibung: (index === 0 ? t("Deine erste Pflanze und die Mitte des Stellariums.") :
            p.name + t(" wächst danach auf deinen Feldern und bekommt einen eigenen Reiter auf dem Markt. ") +
            t("Artenvielfalt: jede weitere Pflanze gibt allen Pflanzen +12% Gold.")) +
            (p.eigenschaftText ? " " + p.eigenschaftText : ""),
        info: () => t("Grundwert ") + zahl(p.verkaufswert) + t(" Gold, ") + sekText(p.sekProStufe * 3) + t(" bis zur Ernte")
    });
    const shopAst = (praefix, upgradeId, pos, vor, faktor) => {
        const u = PFLANZEN_UPGRADE_NACH_ID[upgradeId];
        SKILLS.push({
            id: praefix + p.id, ast: "pflanzen", icon: p.emoji, abzeichen: praefix === "pw_" ? "⏱️" : praefix === "pp_" ? "🎨" : "➕",
            pos, vor, name: p.name + ": " + u.name, basiskosten: rundePreis(basis * faktor), faktor: 1, max: 1, art: "pflanzenShop",
            markt: u, marktReiter: p.name,
            beschreibung: t("Schaltet auf dem Markt-Reiter ") + p.name + t(" frei: ") + u.name + " (" + u.beschreibung + ")",
            info: () => (level(praefix + p.id) > 0 ? t("Auf dem Markt freigeschaltet") : t("Noch nicht auf dem Markt"))
        });
    };
    shopAst("pw_", "wachstum", versatz.pw, "p_" + p.id, 0.15);
    shopAst("pp_", "pracht", versatz.pp, "pw_" + p.id, 0.25);
    shopAst("pu_", "ueberfluss", versatz.pu, "p_" + p.id, 0.35);
    SKILLS.push({
        id: "pb_" + p.id, ast: "pflanzen", icon: p.emoji, abzeichen: "⭐", pos: versatz.pb, vor: "pu_" + p.id,
        name: p.bonusName, basiskosten: rundePreis(basis * 0.6), faktor: 1, max: 1,
        beschreibung: p.bonusText,
        info: () => (level("pb_" + p.id) > 0 ? t("Aktiv") : t("Nicht aktiv"))
    });
    // Goldader: Sternensamen direkt in Gold verwandeln (+300% Wert pro Stufe fuer genau diese Pflanze)
    SKILLS.push({
        id: "pg_" + p.id, ast: "pflanzen", icon: p.emoji, abzeichen: "💰", pos: versatz.pg, vor: "pb_" + p.id,
        name: p.name + t(": Goldader"), basiskosten: rundePreis(basis * 3), faktor: 4, max: 3,
        beschreibung: t("+100% Wert für ") + p.name + t(" (jede Stufe noch einmal +100%)."),
        info: () => "+" + 100 * level("pg_" + p.id) + t("% Wert")
    });
    // Sternenfrucht: mehr Sternensaat von genau dieser Pflanze
    SKILLS.push({
        id: "pk_" + p.id, ast: "pflanzen", icon: p.emoji, abzeichen: "✨", pos: [x - 500, y - 90], vor: "pp_" + p.id, autoPos: true,
        name: p.name + t(": Sternenfrucht"), basiskosten: rundePreis(basis * 0.8), faktor: 3, max: 3,
        beschreibung: t("+50% Sternensaat von ") + p.name + t(" (jede Stufe noch einmal +50%)."),
        info: () => "+" + 50 * level("pk_" + p.id) + t("% Sternensaat")
    });
    // Fruehreife: neue Samen dieser Pflanze starten eine Wachstumsstufe weiter
    SKILLS.push({
        id: "pr_" + p.id, ast: "pflanzen", icon: p.emoji, abzeichen: "🌿", pos: [x - 650, y - 190], vor: "pk_" + p.id, autoPos: true,
        name: p.name + t(": Frühreife"), basiskosten: rundePreis(basis * 1.5), faktor: 1, max: 1,
        beschreibung: t("Neue Samen von ") + p.name + t(" sind sofort Keimlinge: Sie starten eine Wachstumsstufe weiter."),
        info: () => (level("pr_" + p.id) > 0 ? t("Aktiv") : t("Nicht aktiv"))
    });
});

// Neue Sterne mit autoPos: in der Naehe ihres Wunschplatzes einen freien Platz suchen (kein Stern darf einen anderen verdecken)
(function platziereNeueSterne() {
    const ABSTAND = 130;
    const LINIE = 45; // so weit muss ein Stern von fremden Linien weg sein
    const nachId = Object.fromEntries(SKILLS.map(s => [s.id, s]));
    const abstandZurLinie = (p, a, b) => {
        const vx = b[0] - a[0], vy = b[1] - a[1];
        const l = vx * vx + vy * vy || 1;
        const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l));
        return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy);
    };
    const linien = () => SKILLS.filter(s => s.vor && s.pos && nachId[s.vor] && nachId[s.vor].pos).map(s => [nachId[s.vor], s]);
    const frei = (pos, selbst) => {
        if (!SKILLS.every(s => s === selbst || !s.pos || Math.hypot(s.pos[0] - pos[0], s.pos[1] - pos[1]) >= ABSTAND)) return false;
        // nicht auf einer fremden Linie liegen
        if (linien().some(([a, b]) => a !== selbst && b !== selbst && abstandZurLinie(pos, a.pos, b.pos) < LINIE)) return false;
        // die eigene Linie darf durch keinen anderen Stern laufen
        const vor = nachId[selbst.vor];
        return !vor || !vor.pos || SKILLS.every(s => s === selbst || s === vor || !s.pos || abstandZurLinie(s.pos, vor.pos, pos) >= LINIE);
    };
    SKILLS.filter(s => s.autoPos).forEach(s => {
        if (frei(s.pos, s)) return;
        const [wx, wy] = s.pos;
        for (let r = 40; r <= 600; r += 40) {
            for (let w = 0; w < 16; w++) {
                const kandidat = [Math.round(wx + r * Math.cos(w * Math.PI / 8)), Math.round(wy + r * Math.sin(w * Math.PI / 8))];
                if (frei(kandidat, s)) {
                    s.pos = kandidat;
                    return;
                }
            }
        }
    });
})();

// Preise anheben: ein erster Run soll nicht fast das ganze Stellarium freischalten (Ausgleich ueber Mondblueten)
SKILLS.forEach(def => {
    if (def.id === "p_weizen") return;
    def.basiskosten = rundePreis(def.basiskosten * (def.art === "pflanze" ? 1.3 : 1.8));
});

const SKILL_NACH_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

// ----- Kurztexte fuer das Stellarium: ein Stichpunkt pro Stern und die Wirkung als Zahl je Stufe ("Jetzt -> Naechste") -----
const STERN_KURZ = {
    gruen: t("Mehr grüne Saat (x2,5 Gold)"), blau: t("Mehr blaue Saat (x5 Gold)"), lila: t("Mehr lila Saat (x12,5 Gold)"),
    gelb: t("Mehr legendäre Saat (x50 Gold, vor der 2. Rechnung x25)"), edelstein: t("Farben geben mehr Gold"), sternengold: t("Mehr Gold · unendlich"),
    glueck: t("Saat zählt doppelt"), sternensammler: t("Sternensaat zählt doppelt"), sternenklick: t("Sternensamen pro Klick"),
    schwereMuenzen: t("Gewöhnliche Saat mehr wert"), doppelernte: t("Doppelt so viel Saat"), fuellhorn: t("Mehr Gold"),
    goldmarie: t("Gold verdoppeln"), ernterausch: t("Jede 30. Ernte: 6 Sek. x3 Gold"), sternenstaub: t("Mehr Sternensamen"),
    sternenquelle: t("Sternensamen pro Ernte"), sternenflut: t("Sternensamen verdoppeln"), glueck2: t("Saat zählt doppelt"),
    midas: t("Legendäre Saat: +50 Sternensamen"), radius: t("Größerer Cursor"), vogelscheuche: t("Verscheucht die 1. Krähe"),
    kombo: t("Mehr Zeit für die Kombo"), eichhoernchen: t("Klicken den Samenladen"), haustiertraining: t("Begleiter sammelt öfter"),
    igel: t("Igel sammeln Saat ein"), saatspatz: t("Spatz pflanzt Samen"), gluehglas: t("Mehr Glühwürmchen"),
    biene: t("Bienen lassen Pflanzen wachsen"), magnetfeld: t("Saat rollt zum Cursor"), eichhoernchen2: t("Mehr Eichhörnchen-Klicks"),
    erntehase: t("Hase erntet für dich"), sternhoernchen: t("Eichhörnchen geben Sternensamen"), helferlohn: t("Eichhörnchen-Klicks x2"),
    glueckstraehne: t("Mehr Glück beim Spielen"), gluecksrabatt: t("Höhere Slot-Gewinne"), stammkunde: t("Mehr Spiele pro Pause"),
    haendlerfreund: t("Händler kommt öfter"), giessen: t("Felder bewässern (x2 Tempo)"), feldvermessung: t("Felder billiger"),
    sonnenuhr: t("Mehr Energie"), fruehaufsteher: t("Samen zum Tagesstart"), duengen: t("Felder düngen (x2 Gold)"),
    morgentau: t("Morgens schneller wachsen"), doppelwurf: t("Zweiter Samen"), zinsen: t("Zinsen bei Feierabend"),
    wetterfrosch: t("Mehr gutes Wetter"), abendsonne: t("Abends mehr Gold"), lagerhaus: t("Höhere Zinsen erlaubt"),
    nachtwache: t("Glühwürmchen: mehr Energie"), gewaechshaus: t("Bewässert: mehr Gold"), wurmhumus: t("Gedüngt: x3 statt x2 Gold"),
    erntefest: t("Rechnungstag: mehr Gold"),
    muenzwurf: t("Glücksspiel: Münzwurf"), gacha: t("Glücksspiel: Slotmaschine"), rubbellos: t("Glücksspiel: Rubbellose"),
    huehnerrennen: t("Glücksspiel: Hühnerrennen"), plinko: t("Glücksspiel: Samen-Plinko"),
    jahresrad: t("Jahreszeiten stärker"), bluetenzauber: t("Frühling: bunte Saat"), sonnenernte: t("Sommer: mehr Gold"),
    erntedank: t("Herbst: mehr Sternensaat"), frostschutz: t("Winter ohne Malus"), saisonfest: t("1. Tag der Jahreszeit x1,5"),
    sternenkalender: t("Geschenk beim Jahreszeitwechsel"), jackpotjaeger: t("Legendäre Saat mehr wert"), goldschauer: t("Öfter Goldregen"),
    schnuppenfaenger: t("Sternschnuppen-Bonus länger"), kombovirtuose: t("Höchste Kombo stärker"),
    sternbild: t("+1% Gold je 10 Sterne"), kometenregen: t("Sternschnuppen geben Sternensamen"), polarstern: t("Morgen-Geschenk"),
    mondsichel: t("Nachts mehr Sternensaat"), milchstrasse: t("Zweite Sternensaat"), bienenkoenigin: t("Bienen öfter"),
    spielerglueck: t("Mehr Glück beim Spielen"),
    g_gold: t("Grundwert Gold"), g_sterne: t("Grundwert Sternensamen"), g_energie: t("Grundwert Energie"),
    g_wachstum: t("Grundwert Wachstum"), g_harmonie: t("Alle Grundwerte · unendlich"),
    saatkette: t("Feld sofort neu bepflanzt"), goldenestunde: t("Kurz vor Feierabend mehr Gold"), morgenkombo: t("Tag startet mit Kombo"),
    feldkunde: t("Schneller wachsen · unendlich"), sternenmeer: t("Mehr Sternensamen · unendlich"),
    bodenkunde: t("Boden wird schneller fruchtbar")
};

// s = Stufe. Zeigt, was der Stern auf dieser Stufe insgesamt bringt.
const STERN_WIRKUNG = {
    gruen: s => (s > 0 ? 12 + 3 * s : 0) + t("% grüne Saat"), blau: s => 2 * s + t("% blaue Saat"), lila: s => (s > 0 ? 2 + s : 0) + t("% lila Saat"),
    gelb: s => prozentText(s > 0 ? 0.005 + 0.005 * s : 0) + t(" legendäre Saat"), edelstein: s => "+" + 10 * s + t("% Farb-Bonus"),
    sternengold: s => "+" + 4 * s + t("% Gold"), glueck: s => "+" + 5 * s + t("% Doppel-Saat"),
    sternensammler: s => "+" + 5 * s + t("% Doppel-Sternensaat"), sternenklick: s => "+" + zahl(s * 0.25) + t(" ✨ pro Klick"),
    schwereMuenzen: s => "+" + 20 * s + t("% Wert"), doppelernte: s => "+" + 3 * s + t("% Doppelernte"),
    fuellhorn: s => "+" + 100 * s + t("% Gold"), goldmarie: s => "x" + Math.pow(2, s) + t(" Gold"),
    sternenstaub: s => "+" + 20 * s + "% ✨", sternenquelle: s => "+" + 2 * s + t(" ✨ pro Ernte"),
    sternenflut: s => "x" + Math.pow(2, s) + " ✨", glueck2: s => "+" + 10 * s + t("% Doppel-Saat"),
    radius: s => "+" + Math.round((Math.pow(KONFIG.sammelRadiusFaktor, s) - 1) * 100) + t("% Cursor"),
    kombo: s => "+" + (0.1 * s).toFixed(1).replace(".", ",") + t(" Sek. Kombo"), eichhoernchen: s => s + t(" Klicks/Sek."),
    eichhoernchen2: s => "+" + 2 * s + t(" Klicks/Sek."), haustiertraining: s => "+" + 10 * s + t("% Hilfe"),
    igel: s => Math.min(4, 1 + Math.floor((s - 1) / 5)) + t(" Igel · Tempo ") + (90 + 14 * s),
    saatspatz: s => t("alle ") + sekText(20 / s), gluehglas: s => "+" + 25 * s + t("% Glühwürmchen"),
    biene: s => t("alle ") + sekText(12 / s), magnetfeld: s => 40 * s + t(" Pixel/Sek."), erntehase: s => t("alle ") + sekText(12 / s),
    glueckstraehne: s => "+" + 3 * s + t("% Glück"), gluecksrabatt: s => "+" + 10 * s + t("% Slot-Gewinne"), stammkunde: s => "+" + s + t(" Spiele"),
    haendlerfreund: s => "+" + 50 * s + t("% Chance"), giessen: s => s + t(" Felder 💧"),
    feldvermessung: s => "-" + Math.round((1 - Math.pow(0.92, s)) * 100) + t("% Feldpreis"), sonnenuhr: s => "+" + 10 * s + t(" Energie"),
    fruehaufsteher: s => s + t(" Samen"), duengen: s => s + t(" Felder 🪱"), morgentau: s => "+" + 25 * s + t("% Wachstum"),
    doppelwurf: s => "+" + 10 * s + t("% Doppelwurf"), zinsen: s => 2 * s + t("% Zinsen"), wetterfrosch: s => "+" + 30 * s + t("% Wetter"),
    abendsonne: s => "+" + 15 * s + t("% Gold"), lagerhaus: s => "+" + 25 * s + t("% Deckel"), nachtwache: s => "+" + 50 * s + t("% Energie"),
    gewaechshaus: s => "+" + 50 * s + t("% Gold"), erntefest: s => "+" + 100 * s + t("% Gold"),
    jahresrad: s => "+" + 25 * s + t("% Jahreszeit-Effekte"), bluetenzauber: s => "+" + 4 * s + t("% grüne Saat"),
    sonnenernte: s => "+" + 20 * s + t("% Gold im Sommer"), erntedank: s => "+" + 25 * s + t("% Sternensaat im Herbst"),
    frostschutz: s => (s >= 2 ? t("+10% Wachstum im Winter") : t("kein Winter-Malus")),
    jackpotjaeger: s => "x" + (1 + s) + t(" legendäre Saat"), goldschauer: s => "+" + 50 * s + t("% Goldregen"),
    schnuppenfaenger: s => "+" + 3 * s + t(" Sek. Bonus"), kombovirtuose: s => t("Kombo bis x") + (5 + s),
    g_gold: s => "+" + 5 * s + t("% Gold"), g_sterne: s => "+" + 5 * s + t("% Sternensamen"), g_energie: s => "+" + 5 * s + t("% Energie"),
    g_wachstum: s => "+" + 5 * s + t("% Wachstum"), g_harmonie: s => "+" + 3 * s + t("% auf alles"),
    saatkette: s => "+" + 8 * s + t("% Neupflanzung"), goldenestunde: s => "+" + 50 * s + t("% Gold"), morgenkombo: s => 15 * s + t(" Kombo"),
    feldkunde: s => "+" + 2 * s + t("% Wachstum"), sternenmeer: s => "+" + 3 * s + t("% Sternensamen"),
    bodenkunde: s => (30 - 5 * s) + t(" Ernten pro Stufe")
};

SKILLS.forEach(def => {
    if (STERN_KURZ[def.id]) def.kurz = STERN_KURZ[def.id];
    if (STERN_WIRKUNG[def.id]) def.wirkung = STERN_WIRKUNG[def.id];
    if (def.art === "shop" && !def.kurz) def.kurz = t("Markt: ") + def.name;
    if (def.id.startsWith("p_")) def.kurz = t("Neue Pflanze · Grundwert ") + zahl(PFLANZEN_VORLAGEN.find(p => p.id === def.pflanze).verkaufswert) + t(" Gold");
    if (def.art === "pflanzenShop") def.kurz = t("Markt: ") + def.name.split(": ")[1];
    if (def.id.startsWith("pk_")) {
        def.kurz = t("Mehr Sternensaat von ") + def.name.split(":")[0];
        def.wirkung = s => "+" + 50 * s + t("% Sternensaat");
    }
    if (def.id.startsWith("pr_")) def.kurz = t("Samen starten als Keimling");
    if (def.id.startsWith("pg_")) {
        def.kurz = t("Mehr Wert für ") + def.name.split(":")[0];
        def.wirkung = s => "+" + 300 * s + t("% Wert");
    }
    if (def.variante) {
        def.kurz = t("Spezialpflanze: ") + def.variante.titel;
        def.wirkung = s => prozentText(def.chanceProStufe * s) + t(" Chance");
    }
});

// ---------- GLUECKSSPIELE (auf dem Markt, zwischen den Tagen, mit Gold) ----------
// proPause = wie oft man zwischen zwei Tagen spielen darf (+ Stern "Stammkunde").
// einsaetze = Anteile deines aktuellen Goldes, die du setzen kannst.
// Alle Spiele zahlen im Schnitt etwas weniger aus, als man einsetzt (Glueck macht sie besser).

const GLUECKSSPIEL = {
    muenzwurf: { proPause: 3, einsaetze: [0.1, 0.25, 0.5, 1], gewinnChance: 0.5, maxChance: 0.7 },
    // Rubbellos: Einsatz in Prozent deines Goldes. Gewinn = drei gleiche Symbole (Einsatz x multi).
    // chance = Wahrscheinlichkeit fuer genau diesen Gewinn, sonst Niete. Erwartungswert ca. 0,85.
    rubbellos: { proPause: 3, einsaetze: [0.05, 0.1, 0.25],
        symbole: [
            { symbol: "🌾", multi: 1, chance: 0.18 },
            { symbol: "🥕", multi: 2, chance: 0.10 },
            { symbol: "🍓", multi: 3, chance: 0.05 },
            { symbol: "🎃", multi: 5, chance: 0.025 },
            { symbol: "🌻", multi: 10, chance: 0.01 },
            { symbol: "🌟", multi: 50, chance: 0.002 }
        ] },
    // Huehnerrennen: Siegchance ist umgekehrt zur Quote (Erwartungswert ca. 0,83)
    huehnerrennen: { proPause: 1, einsaetze: [0.1, 0.2, 0.4],
        huehner: [
            { name: t("Weißes Huhn"), quote: 2, farbe: "#ffffff" },
            { name: t("Gelbes Huhn"), quote: 3, farbe: "#f5d547" },
            { name: t("Rotes Huhn"), quote: 4, farbe: "#c9661c" },
            { name: t("Braunes Huhn"), quote: 8, farbe: "#6b3f1d" }
        ] },
    // Slotmaschine: 3 Walzen, nur 3 gleiche Symbole gewinnen (Einsatz x multi). chance = Wahrscheinlichkeit fuer genau
    // diesen Gewinn, sonst Niete (oft mit 2 gleichen Symbolen, Beinahe-Gewinn). Erwartungswert ca. 0,87, Gewinn in ca. 23% der Drehs.
    slot: { proPause: 3, einsaetze: [0.05, 0.1, 0.25],
        symbole: [
            { symbol: "🌾", multi: 2, chance: 0.12 },
            { symbol: "🥕", multi: 3, chance: 0.06 },
            { symbol: "🍓", multi: 5, chance: 0.03 },
            { symbol: "🎃", multi: 10, chance: 0.012 },
            { symbol: "🌻", multi: 25, chance: 0.004 },
            { symbol: "🌟", multi: 100, chance: 0.0008 }
        ] },
    // Plinko: 8 Reihen Naegel, der Samen faellt in eines von 9 Faechern (Erwartungswert ca. 0,94)
    plinko: { proPause: 3, einsaetze: [0.05, 0.1, 0.25], reihen: 8,
        faecher: [8, 3, 1.3, 0.6, 0.3, 0.6, 1.3, 3, 8] },
    // Roulette: 37 Faecher, Rot/Schwarz/Gerade/Ungerade x2, die 0 x36
    roulette: { proPause: 3, einsaetze: [0.05, 0.1, 0.25, 0.5] },
    // Blackjack gegen den Dealer: Gewinn x2, Blackjack x2,5
    blackjack: { proPause: 3, einsaetze: [0.05, 0.1, 0.25] }
};

// ---------- SEGEN: nach jeder bezahlten Rechnung 1 von 3 waehlen, gilt fuer den ganzen Run ----------
// Mehrfach waehlbar, die Wirkung stapelt sich (max = hoechstens so oft). Die Effekte stehen in script.js (segen("id") = Stufe).

const SEGEN = [
    { id: "sparfuchs", badge: "🐷", name: t("Sparfuchs"), text: t("Alle weiteren Rechnungen in diesem Run kosten 8% weniger.") },
    { id: "fruehstueck", badge: "☕", name: t("Kräftiges Frühstück"), text: t("+25 Energie an jedem Tag.") },
    { id: "erntesegen", badge: "🧺", name: t("Erntesegen"), text: t("+8% Chance auf eine zusätzliche Saat pro Ernte.") },
    { id: "goldhaende", badge: "🪙", name: t("Goldene Hände"), text: t("+15% Gold aus allen Ernten.") },
    { id: "keimkraft", badge: "🌱", name: t("Keimkraft"), text: t("Jedes freie Feld hat zum Tagesstart 12% Chance, schon einen Samen zu haben.") },
    { id: "kompost", badge: "🪱", name: t("Kompost"), text: t("Jedes Feld hat jeden Tag 8% Chance, gedüngt zu sein (doppeltes Gold).") },
    { id: "regenwolke", badge: "🌧️", name: t("Regenwolke"), text: t("Jedes Feld hat jeden Tag 8% Chance, bewässert zu sein (wächst doppelt so schnell).") },
    { id: "flink", badge: "👐", name: t("Flinke Hände"), max: 3, text: t("-2 Klicks pro Samen (höchstens 3-mal wählbar).") },
    { id: "saatsegen", badge: "🔗", name: t("Saatsegen"), text: t("+10% Chance, dass ein abgeerntetes Feld sofort einen neuen Samen bekommt.") },
    { id: "keimsegen", badge: "🌿", name: t("Keimsegen"), text: t("+10% Chance, dass ein neuer Samen gleich als Keimling startet.") },
    { id: "feldarbeit", badge: "⛏️", name: t("Feldarbeit"), text: t("Neue Felder kosten 20% weniger.") },
    { id: "kraftpaket", badge: "💪", name: t("Kraftpaket"), text: t("+10% Energie an jedem Tag.") },
    { id: "sammelwut", badge: "🧲", name: t("Sammelwut"), text: t("Dein Cursor-Kreis ist 20% größer.") },
    { id: "meisterlich", badge: "🏅", name: t("Meisterlich"), text: t("Jede Ernte zählt für die Pflanzen-Meisterschaft einmal mehr.") },
    { id: "wissen", badge: "📚", name: t("Wissensdurst"), text: t("+15% Chance, dass eine Sternensaat doppelt zählt.") },
    { id: "glueckspilz", badge: "🍄", name: t("Glückspilz"), text: t("+2% Chance auf epische Saaten.") },
    { id: "wachstum", badge: "🌿", name: t("Wachstumsschub"), text: t("Alle Pflanzen wachsen 10% schneller.") },
    { id: "sternenstaub", badge: "🌠", name: t("Sternschnuppenregen"), text: t("Sternschnuppen kommen 30% öfter und geben 3 Sekunden länger doppeltes Gold.") },
    { id: "rhythmus", badge: "🥁", name: t("Rhythmusgefühl"), text: t("+0,1 Sek. Zeit für die Kombo.") },
    { id: "nachteule", badge: "🦉", name: t("Nachteule"), text: t("Glühwürmchen kommen doppelt so oft.") },
    { id: "tierfreund", badge: "🐾", name: t("Tierfreund"), text: t("Deinen Begleiter zu streicheln gibt doppelt so viel Gold.") },
    { id: "wetterglueck", badge: "🌦️", name: t("Wetterglück"), text: t("Wetter kommt doppelt so oft, schlechtes Wetter halb so oft.") },
    { id: "glueckskind", badge: "🎲", name: t("Glückskind"), text: t("+5% Glück bei allen Glücksspielen.") },
    { id: "mondschein", badge: "🌙", name: t("Mondscheinbauer"), text: t("Ernten am Abend und in der Nacht geben 20% mehr Gold.") },
    { id: "saisonkind", badge: "🍂", name: t("Kind der Jahreszeiten"), text: t("Die Effekte der Jahreszeiten sind doppelt so stark.") },
    { id: "klingeling", badge: "🔔", name: t("Klingeling"), text: t("Jeder Klick auf den Samenladen gibt 0,5 Sternensamen mehr.") },
    { id: "riesenwuchs", badge: "🥕", name: t("Riesenwuchs"), text: t("10% Chance, dass eine Ernte doppelt so viel wert ist.") },
    { id: "morgenstund", badge: "🌅", name: t("Morgenstund"), text: t("In der ersten Hälfte des Tages gibt es 20% mehr Gold.") },
    { id: "sparsam", badge: "📐", name: t("Sparsamer Bauer"), text: t("Neue Felder kosten 15% weniger.") },
    { id: "kraehenkoenig", badge: "👑", name: t("Krähenkönig"), text: t("Verscheuchte Krähen lassen 5-mal so viele Sternensamen fallen.") },
    { id: "sternenhunger", badge: "🌌", name: t("Sternenhunger"), text: t("Jede Sternensaat ist 25% mehr wert.") },
    { id: "jackpotfieber", badge: "🎰", name: t("Goldfieber"), text: t("+1% Chance auf legendäre Saat.") },
    { id: "gluehfreund", badge: "🪲", name: t("Glühwürmchen-Freund"), text: t("Glühwürmchen geben doppelt so viele Sternensamen.") },
    { id: "gutesaat", badge: "🌾", name: t("Gute Saat"), text: t("Gewöhnliche Saat ist 50% mehr wert.") },
    { id: "komborausch", badge: "🎵", name: t("Kombo-Rausch"), text: t("Jeder 4. Klick zählt für die Kombo doppelt.") },
    // Pakte: stark, aber mit einem Nachteil (erscheinen manchmal als rote Karte in der Auswahl)
    { id: "goldrausch", badge: "🔥", name: t("Goldrausch"), pakt: true, max: 2, text: t("+50% Gold aus allen Ernten, aber -15% Energie an jedem Tag.") },
    { id: "nachtschicht", badge: "🌘", name: t("Nachtschicht"), pakt: true, max: 2, text: t("+25% Energie an jedem Tag, aber alle Pflanzen wachsen 15% langsamer.") },
    { id: "sternentausch", badge: "💫", name: t("Sternentausch"), pakt: true, max: 2, text: t("Sternensaat ist 60% mehr wert, aber du bekommst 15% weniger Gold.") },
    { id: "eile", badge: "⏩", name: t("Eile"), pakt: true, max: 2, text: t("Alle Pflanzen wachsen 30% schneller, aber jede Ernte gibt 10% weniger Gold.") },
    { id: "hochrisiko", badge: "🎲", name: t("Hohes Risiko"), pakt: true, max: 2, text: t("+3% Chance auf legendäre Saat, aber alle weiteren Rechnungen kosten 10% mehr.") },
    { id: "vorschuss", badge: "💰", name: t("Vorschuss"), pakt: true, max: 2, text: t("Du bekommst sofort die Hälfte der nächsten Rechnung als Gold. Alle weiteren Rechnungen kosten 12% mehr.") },
    { id: "kargheit", badge: "🪨", name: t("Kargheit"), pakt: true, max: 2, text: t("-3 Klicks pro Samen, aber -10% Energie an jedem Tag.") }
];
const SEGEN_NACH_ID = Object.fromEntries(SEGEN.map(s => [s.id, s]));

// ---------- PFLANZEN-MEISTERSCHAFT (dauerhaft) ----------
// Jede Pflanze sammelt ueber alle Runs Ernten. Bei diesen Zahlen steigt ihre Meisterschaft um 1 Stufe,
// jede Stufe gibt dauerhaft +8% Verkaufswert fuer genau diese Pflanze.

const MEISTER_SCHWELLEN = [50, 250, 1000, 3000, 8000, 20000, 50000, 120000, 300000, 700000, 1500000, 3000000];
const MEISTER_BONUS = 0.08;

// ---------- MONDPHASEN (Schwierigkeitsstufen) ----------
// Im Mondteich waehlbar. Jede Phase ist schwerer als die vorige (Regeln gelten zusammen),
// gibt dafuer mehr Mondblueten. Die naechste Phase wird frei, wenn man in der hoechsten freien Phase
// 6 Rechnungen in einem Run bezahlt.

const MONDPHASEN = [
    { symbol: "🌑", name: t("Neumond"), text: t("Die normalen Regeln.") },
    { symbol: "🌒", name: t("Sichelmond"), text: t("Alle Rechnungen kosten 20% mehr.") },
    { symbol: "🌓", name: t("Halbmond"), text: t("Jede 2. Rechnung ist ein Kredit mit Auflage.") },
    { symbol: "🌔", name: t("Dreiviertelmond"), text: t("10% weniger Energie pro Tag.") },
    { symbol: "🌕", name: t("Vollmond"), text: t("Es kommen mehr Krähen, und Segen gibt es nur noch 3 zur Auswahl.") },
    { symbol: "✨", name: t("Sternenmond"), text: t("Jede Rechnung steigt um x3 mehr als sonst (z.B. x28 statt x25).") },
    { symbol: "🌟", name: t("Sternenmond II"), text: t("Jede Rechnung steigt um weitere x3.") },
    { symbol: "💫", name: t("Sternenmond III"), text: t("Jede Rechnung steigt um weitere x3.") },
    { symbol: "🌠", name: t("Sternenmond IV"), text: t("Jede Rechnung steigt um weitere x3.") },
    { symbol: "☄️", name: t("Sternenmond V"), text: t("Jede Rechnung steigt um weitere x3.") },
    { symbol: "🌌", name: t("Sternenmond VI"), text: t("Jede Rechnung steigt um weitere x3.") }
];
const MONDPHASE_BONUS = 0.3;          // +30% Mondblueten pro Phase
const MONDPHASE_FREI_AB_RECHNUNGEN = 6;

// ---------- JAHRESZEITEN ----------
// Jeder Run beginnt im Fruehling. Alle 5 Tage (ein Rechnungs-Abschnitt) wechselt die Jahreszeit, danach geht es von vorn los.
// wachstum/energie/gold/sterne = Faktoren, wetter = Gewichte fuer das Wetter (0 = kommt nie), partikel = Stimmung im Hof

const JAHRESZEITEN_KONFIG = { tageProJahreszeit: 5 };

const JAHRESZEITEN = [
    { id: "fruehling", name: t("Frühling"), symbol: "🌸", farbe: "#ff9ad5", text: t("Pflanzen wachsen 20% schneller."),
        wachstum: 1.2, wetter: { regen: 2, regenbogen: 2, hitze: 0.3, frost: 0, pollenflug: 2.5 }, partikel: "bluete" },
    { id: "sommer", name: t("Sommer"), symbol: "☀️", farbe: "#ffd93d", text: t("20% mehr Energie pro Tag."),
        energie: 1.2, sandbox: { gold: 1.1, text: t("10% mehr Gold aus allen Ernten.") }, wetter: { hitze: 2.5, gewitter: 1.5, nebel: 0.3, frost: 0 }, partikel: "schmetterling" },
    { id: "herbst", name: t("Herbst"), symbol: "🍂", farbe: "#e8902a", text: t("15% mehr Gold aus allen Ernten."),
        gold: 1.15, wetter: { nebel: 2, regen: 1.5, hitze: 0.3, wind: 2, pollenflug: 0.3 }, partikel: "blatt" },
    { id: "winter", name: t("Winter"), symbol: "❄️", farbe: "#9fd8ff",
        text: t("Pflanzen wachsen 15% langsamer, dafür ist jede Sternensaat 50% mehr wert."),
        wachstum: 0.85, sterne: 1.5, wetter: { hitze: 0, sternennacht: 3, gewitter: 0.3, frost: 2.5, pollenflug: 0 }, partikel: "schnee" }
];

// ---------- WETTER (selten: an den meisten Tagen gibt es kein Wetter) ----------
// gut = angenehmes Wetter (Wetterfrosch/Wetterglueck machen es wahrscheinlicher)

const WETTER_KONFIG = {
    chance: 0.15,          // Grundchance fuer Wetter an einem Tag
    abTag: 2               // am ersten Tag nie Wetter
};

const WETTER = [
    { id: "regen", name: t("Regentag"), symbol: "🌧️", gut: true, gewicht: 30,
        text: t("Alle Felder sind bewässert und wachsen doppelt so schnell.") },
    { id: "gewitter", name: t("Gewitter"), symbol: "⛈️", gut: true, gewicht: 15,
        text: t("Ab und zu schlägt ein Blitz ein und macht eine Pflanze sofort reif. Blitzpflanzen kommen 3-mal so oft.") },
    { id: "hitze", name: t("Hitzewelle"), symbol: "🌡️", gut: false, gewicht: 20,
        text: t("Pflanzen wachsen 30% schneller, aber der Tag hat 20% weniger Energie."),
        textSandbox: t("Pflanzen wachsen 30% schneller.") },
    { id: "nebel", name: t("Nebel"), symbol: "🌫️", gut: false, gewicht: 20,
        text: t("Dein Cursor-Kreis ist 30% kleiner, dafür sind Saaten 20% mehr wert.") },
    { id: "sternennacht", name: t("Sternennacht"), symbol: "🌠", gut: true, gewicht: 10,
        text: t("Sternschnuppen kommen 3-mal so oft.") },
    { id: "regenbogen", name: t("Regenbogen"), symbol: "🌈", gut: true, gewicht: 5,
        text: t("Alle Saaten sind mindestens ungewöhnlich.") },
    { id: "wind", name: t("Windiger Tag"), symbol: "🌬️", gut: true, gewicht: 15,
        text: t("Der Wind hält die Krähen fern: heute kommt keine einzige.") },
    { id: "pollenflug", name: t("Pollenflug"), symbol: "🌼", gut: true, gewicht: 10,
        text: t("Spezialpflanzen erscheinen 50% öfter.") },
    { id: "frost", name: t("Frost"), symbol: "🥶", gut: false, gewicht: 15,
        text: t("Alle Pflanzen wachsen 25% langsamer.") }
];
const WETTER_NACH_ID = Object.fromEntries(WETTER.map(w => [w.id, w]));

// ---------- KRAEHEN ----------
// Pro Tag kommen meistens 0 oder 1 Kraehen (hoechstens 3). Eine Kraehe landet auf einer Pflanze
// und stiehlt sie nach ein paar Sekunden, wenn du sie nicht anklickst.

const KRAEHEN_KONFIG = {
    anzahlChancen: [0.55, 0.32, 0.10, 0.03],  // 0, 1, 2 oder 3 Kraehen an einem Tag
    stehlZeitSek: 4,
    belohnungSternensamen: 10,                 // fuer jede verscheuchte Kraehe
    federGold: 3                               // Werkzeug "Kraehenfeder": x Wert der besten Pflanze
};

// ---------- GOLDREGEN (seltenes Ereignis waehrend eines Tages) ----------

const GOLDREGEN_KONFIG = {
    chance: 0.05,          // pro Tag
    muenzen: 14,
    dauerSek: 5,
    wertAnteil: 1          // jede Muenze = 1x Wert deiner besten Pflanze (nicht zu stark)
};

// ---------- KREDITE (intern "Boss-Rechnungen") ----------
// Jede 3. Rechnung ist ein Kredit, den man abbezahlt: In den 5 Tagen davor gilt eine Kredit-Auflage (Zusatzregel).
// Wer sie bezahlt, bekommt einen besonderen Segen (4 zur Auswahl) und Bonus-Sternensamen.

const BOSS_KONFIG = {
    alle: 3,
    bonusSternensamenProRechnung: 150  // x Nummer der Rechnung
};

const BOSS_REGELN = [
    { id: "duerre", name: t("Dürre"), symbol: "🏜️", text: t("Keine bewässerten Felder und kein Regen.") },
    { id: "kraehenplage", name: t("Krähenplage"), symbol: "🐦", text: t("Jeden Tag kommen 2 bis 4 Krähen.") },
    { id: "kurzeTage", name: t("Kurze Tage"), symbol: "⌛", text: t("20% weniger Energie pro Tag.") },
    { id: "teureSaat", name: t("Teure Saat"), symbol: "🌰", text: t("+25% Klicks pro Samen.") },
    { id: "nervoes", name: t("Nervöse Kombo"), symbol: "💢", text: t("Das Kombo-Fenster ist 30% kürzer.") },
    { id: "geizig", name: t("Geizige Kundschaft"), symbol: "🧐", text: t("Gewöhnliche Saaten sind nur halb so viel wert.") },
    { id: "unwetter", name: t("Unwetter"), symbol: "🌪️", text: t("Jeden Tag gibt es schlechtes Wetter (die Kristallkugel hilft trotzdem).") },
    { id: "dunkel", name: t("Dunkle Nächte"), symbol: "🌑", text: t("Keine Sternschnuppen und keine Glühwürmchen.") },
    { id: "schaedlinge", name: t("Schädlinge"), symbol: "🐛", text: t("Alle Pflanzen wachsen 15% langsamer.") },
    { id: "steuer", name: t("Steuerprüfung"), symbol: "📜", text: t("Bei Feierabend gehen 10% des Tagesgewinns an das Finanzamt.") },
    { id: "stille", name: t("Stille"), symbol: "🤫", text: t("Die Kombo geht höchstens bis x3.") },
    { id: "muede", name: t("Müde Hände"), symbol: "😩", text: t("+5 Klicks pro Samen.") }
];
const BOSS_NACH_ID = Object.fromEntries(BOSS_REGELN.map(b => [b.id, b]));

// ---------- WANDERHAENDLER UND WERKZEUGE ----------
// Nach manchen Tagen kommt ein Wanderhaendler mit seltenen Angeboten.
// Werkzeuge sind starke Gegenstaende fuer den laufenden Run (begrenzte Plaetze, wie Joker in Balatro).
// preis = Anteil der naechsten Rechnung (in Gold). Verkaufen gibt 40% zurueck.

const HAENDLER_KONFIG = {
    chance: 0.15,
    abTag: 3,
    angebote: 4,                      // immer 4 Angebote, aber nur 1 Kauf pro Besuch
    verkaufsAnteil: 0.4
};

// Stufe: Werkzeuge werden staerker, je spaeter (= teurer) man sie kauft. Stufe = 1 + bezahlte Rechnungen beim Kauf
// (Sandbox: erreichte Meilensteine). Jede Stufe ueber 1 macht "wert" um WERKZEUG_STUFEN_BONUS staerker.
// text(w) bekommt den Wert fuer die jeweilige Stufe. ganz = Wert wird gerundet (z.B. Anzahl Felder).
const WERKZEUG_STUFEN_BONUS = 0.25;
const werkzeugZahl = w => zahl(Math.round(w * 10) / 10);

// Jedes Werkzeug wirkt mit einem Prozentwert (wert = Anteil, 0.03 = 3%). kurz(w) = Effekt in einer Zeile fuer den Kodex.
const werkzeugProzent = w => prozentText(w);

const WERKZEUGE = [
    { id: "sichel", name: t("Goldene Sichel"), symbol: "🪓", preis: 1.2, wert: 3,
        text: w => t("Jede 10. Ernte bringt +") + werkzeugProzent(w) + t(" Gold."), kurz: w => "+" + werkzeugProzent(w) + t(" Gold (jede 10. Ernte)") },
    { id: "giesskanne", name: t("Silberne Gießkanne"), symbol: "🪣", preis: 0.7, wert: 0.15,
        text: w => "+" + werkzeugProzent(w) + t(" Chance pro Feld, jeden Tag bewässert zu sein."), kurz: w => "+" + werkzeugProzent(w) + t(" Bewässerung") },
    { id: "taschenuhr", name: t("Alte Taschenuhr"), symbol: "🕰️", preis: 0.8, wert: 0.1,
        text: w => "+" + werkzeugProzent(w) + t(" Energie pro Tag."), kurz: w => "+" + werkzeugProzent(w) + t(" Energie") },
    { id: "gluecksmuenze", name: t("Glücksmünze"), symbol: "🪙", preis: 0.9, wert: 0.06,
        text: w => "+" + werkzeugProzent(w) + t(" Glück bei Glücksspielen und +") + prozentText(w / 10) + t(" Chance auf legendäre Saat."),
        kurz: w => "+" + werkzeugProzent(w) + t(" Glück") },
    { id: "saatbeutel", name: t("Großer Saatbeutel"), symbol: "🎒", preis: 0.7, wert: 0.1,
        text: w => "-" + werkzeugProzent(w) + t(" Klicks pro Samen."), kurz: w => "-" + werkzeugProzent(w) + t(" Klicks pro Samen") },
    { id: "flechtkorb", name: t("Flechtkorb"), symbol: "🧺", preis: 1.0, wert: 0.12,
        text: w => "+" + werkzeugProzent(w) + t(" Chance auf eine zusätzliche Saat pro Ernte."), kurz: w => "+" + werkzeugProzent(w) + t(" Extra-Saat") },
    { id: "laterne", name: t("Laterne"), symbol: "🏮", preis: 0.5, wert: 0.5,
        text: w => t("Glühwürmchen kommen +") + werkzeugProzent(w) + t(" öfter und geben +") + werkzeugProzent(w) + t(" Energie."),
        kurz: w => "+" + werkzeugProzent(w) + t(" Glühwürmchen") },
    { id: "kompass", name: t("Kompass"), symbol: "🧭", preis: 0.6, wert: 0.1,
        text: w => t("Der Wanderhändler kommt nach jedem Tag, und alles bei ihm ist ") + prozentText(Math.min(0.5, w)) + t(" billiger."),
        kurz: w => "-" + prozentText(Math.min(0.5, w)) + t(" Händlerpreise") },
    { id: "feder", name: t("Krähenfeder"), symbol: "🪶", preis: 0.4, wert: 2,
        text: w => t("Verscheuchte Krähen lassen Gold fallen: ") + werkzeugProzent(w) + t(" vom Wert deiner besten Pflanze."),
        kurz: w => "+" + werkzeugProzent(w) + t(" Krähen-Gold") },
    { id: "sparstrumpf", name: t("Sparstrumpf"), symbol: "🧦", preis: 0.8, wert: 0.03,
        text: w => "+" + werkzeugProzent(w) + t(" Zinsen bei Feierabend (höchstens die Hälfte der nächsten Rechnung)."),
        kurz: w => "+" + werkzeugProzent(w) + t(" Zinsen") },
    { id: "kristallkugel", name: t("Kristallkugel"), symbol: "🔮", preis: 1.0, wert: 0.05,
        text: w => "+" + werkzeugProzent(w) + t(" Gold, und jeder Tag hat gutes Wetter."), kurz: w => "+" + werkzeugProzent(w) + t(" Gold") },
    { id: "honigtopf", name: t("Honigtopf"), symbol: "🍯", preis: 0.7, wert: 0.5,
        text: w => "+" + werkzeugProzent(w) + t(" Zeit, bevor die Kombo abbricht."), kurz: w => "+" + werkzeugProzent(w) + t(" Kombo-Zeit") },
    { id: "fernrohr", name: t("Fernrohr"), symbol: "🔭", preis: 0.6, wert: 1,
        text: w => t("Sternschnuppen kommen +") + werkzeugProzent(w) + t(" öfter."), kurz: w => "+" + werkzeugProzent(w) + t(" Sternschnuppen") },
    { id: "wuenschelrute", name: t("Wünschelrute"), symbol: "🎋", preis: 1.1, wert: 0.25,
        text: w => "+" + werkzeugProzent(w) + t(" Sternensamen."), kurz: w => "+" + werkzeugProzent(w) + t(" Sternensamen") },
    { id: "hufeisen", name: t("Magnet-Hufeisen"), symbol: "🧲", preis: 0.9, wert: 0.5,
        text: w => t("Gelandete Saaten werden automatisch eingesammelt, alle ") + werkzeugZahl(2 / w) + t(" Sekunden (+") +
            werkzeugProzent(w) + t(" Einsammel-Tempo)."), kurz: w => "+" + werkzeugProzent(w) + t(" Einsammel-Tempo") },
    { id: "zaubererde", name: t("Zaubererde"), symbol: "🧪", preis: 0.9, wert: 0.15,
        text: w => "+" + werkzeugProzent(w) + t(" Chance pro Feld, jeden Tag gedüngt zu sein (doppeltes Gold)."), kurz: w => "+" + werkzeugProzent(w) + t(" Dünger") },
    { id: "strohhut", name: t("Strohhut"), symbol: "👒", preis: 0.7, wert: 0.05,
        text: w => "+" + werkzeugProzent(w) + t(" Gold, und Hitzewelle und Nebel haben keine Nachteile."), kurz: w => "+" + werkzeugProzent(w) + t(" Gold") },
    { id: "sanduhr", name: t("Sanduhr"), symbol: "⏳", preis: 0.9, wert: 0.08,
        text: w => t("Alle Pflanzen wachsen +") + werkzeugProzent(w) + t(" schneller."), kurz: w => "+" + werkzeugProzent(w) + t(" Wachstum") },
    { id: "goldzahn", name: t("Goldzahn"), symbol: "🦷", preis: 0.8, wert: 0.5,
        text: w => t("Legendäre Saaten sind +") + werkzeugProzent(w) + t(" mehr wert."), kurz: w => "+" + werkzeugProzent(w) + t(" legendäre Saat") },
    { id: "kleeblatt", name: t("Vierblättriges Kleeblatt"), symbol: "☘️", preis: 0.9, wert: 0.06,
        text: w => "+" + werkzeugProzent(w) + t(" Chance, dass eine Saat doppelt zählt."), kurz: w => "+" + werkzeugProzent(w) + t(" doppelte Saat") },
    { id: "wetterfahne", name: t("Wetterfahne"), symbol: "🚩", preis: 0.5, wert: 1,
        text: w => t("Wetter kommt +") + werkzeugProzent(w) + t(" öfter."), kurz: w => "+" + werkzeugProzent(w) + t(" Wetter") },
    { id: "vogelnest", name: t("Vogelnest"), symbol: "🪺", preis: 0.7, wert: 0.1,
        text: w => "+" + werkzeugProzent(w) + t(" Chance, dass ein Samen einen zweiten mitbringt."), kurz: w => "+" + werkzeugProzent(w) + t(" zweiter Samen") },
    { id: "honigwabe", name: t("Honigwabe"), symbol: "🐝", preis: 0.6, wert: 0.2,
        text: w => t("Jede Ernte füllt die Kombo-Zeit auf, und Kombo-Stufen zählen +") + werkzeugProzent(w) + t(" mehr Klicks."),
        kurz: w => "+" + werkzeugProzent(w) + t(" Kombo-Bonus") }
];
const WERKZEUG_NACH_ID = Object.fromEntries(WERKZEUGE.map(w => [w.id, w]));

// ---------- WERKZEUG-EVOLUTIONEN (wie in Vampire Survivors) ----------
// Werkzeug + passender Segen im selben Run: das Werkzeug entwickelt sich und wirkt doppelt so stark.
const WERKZEUG_EVOLUTIONEN = [
    { werkzeug: "giesskanne", segen: "regenwolke", name: t("Regenmacher") },
    { werkzeug: "taschenuhr", segen: "fruehstueck", name: t("Goldene Taschenuhr") },
    { werkzeug: "gluecksmuenze", segen: "glueckskind", name: t("Glückstaler") },
    { werkzeug: "saatbeutel", segen: "flink", name: t("Bodenloser Saatsack") },
    { werkzeug: "flechtkorb", segen: "erntesegen", name: t("Füllhorn-Korb") },
    { werkzeug: "kristallkugel", segen: "wissen", name: t("Orakelkugel") },
    { werkzeug: "zaubererde", segen: "kompost", name: t("Wundererde") },
    { werkzeug: "sanduhr", segen: "wachstum", name: t("Zeitkristall") },
    { werkzeug: "kleeblatt", segen: "glueckspilz", name: t("Fünfblättriges Kleeblatt") },
    { werkzeug: "hufeisen", segen: "sammelwut", name: t("Supermagnet") },
    { werkzeug: "strohhut", segen: "goldhaende", name: t("Goldener Strohhut") },
    { werkzeug: "wuenschelrute", segen: "sternenhunger", name: t("Sternenrute") },
    { werkzeug: "fernrohr", segen: "sternenstaub", name: t("Sternwarten-Fernrohr") },
    { werkzeug: "laterne", segen: "nachteule", name: t("Glühlaterne") },
    { werkzeug: "honigwabe", segen: "tierfreund", name: t("Königinnen-Wabe") }
];
const EVOLUTION_FAKTOR = 2;

// Weitere Angebote des Haendlers (neben Werkzeugen). menge/preis werden in ereignisse.js berechnet.
const HAENDLER_WAREN = [
    { id: "sternenbeutel", name: t("Sternensamen-Säckchen"), symbol: "👝", preis: 0.35,
        text: t("+ Sternensamen (100 + so viele, wie du heute gesammelt hast).") },
    { id: "goldsamen", name: t("Goldener Samen"), symbol: "🌟", preis: 0.5, text: t("Dein erster Samen am nächsten Tag wird golden.") },
    { id: "elixier", name: t("Energie-Elixier"), symbol: "🧃", preis: 0.25, text: t("+60 Energie am nächsten Tag.") },
    { id: "gutschein", name: t("Kuschel-Gutschein"), symbol: "🎟️", preis: 3, text: t("Ein Gutschein für den Kuschel-Automaten im Mondteich (bleibt für immer).") },
    { id: "duengersack", name: t("Düngersack"), symbol: "🧪", preis: 0.3, text: t("Am nächsten Tag sind 4 Felder mehr gedüngt (doppeltes Gold).") },
    { id: "sonnenflasche", name: t("Sonnenschein in der Flasche"), symbol: "☀️", preis: 0.4, text: t("Der nächste Tag beginnt mit 30 Sekunden doppeltem Gold.") },
    { id: "saatregen", name: t("Saatregen"), symbol: "🌧️", preis: 0.35, text: t("Am nächsten Tag haben alle Felder schon zum Start einen Samen.") },
    { id: "gluecksklee", name: t("Glücksklee"), symbol: "🍀", preis: 0.3, text: t("Am nächsten Tag ist jede Saat mindestens ungewöhnlich.") }
];

// ---------- HERAUSFORDERUNGEN (Mondteich > Spielmodi, ab 3 Runs) ----------
// Ein Story-Run mit einer Einschraenkung. Wer dabei genug Rechnungen bezahlt, bekommt fuer immer einen Bonus.
const HERAUSFORDERUNGEN = [
    { id: "nurweizen", symbol: "🌾", ziel: 3, name: t("Nur Weizen"), regel: t("Du kannst keine neuen Pflanzen freischalten."), belohnung: t("Für immer: Weizen ist 50% mehr wert.") },
    { id: "ohnesegen", symbol: "🚫", ziel: 4, name: t("Ohne Segen"), regel: t("Nach Rechnungen gibt es keine Segen."), belohnung: t("Für immer: 1 Segen mehr zur Auswahl.") },
    { id: "kurzetage", symbol: "⏳", ziel: 3, name: t("Kurze Tage"), regel: t("-40% Energie an jedem Tag."), belohnung: t("Für immer: +10% Energie.") },
    { id: "teurefelder", symbol: "🧱", ziel: 3, name: t("Harter Boden"), regel: t("Neue Felder kosten dreimal so viel."), belohnung: t("Für immer: Felder kosten 10% weniger.") },
    { id: "blind", symbol: "🙈", ziel: 3, name: t("Sternenlos"), regel: t("Das Stellarium bleibt den ganzen Run zu."), belohnung: t("Für immer: Sterne im Stellarium kosten 10% weniger.") },
    { id: "pech", symbol: "🐈‍⬛", ziel: 3, name: t("Pechsträhne"), regel: t("Jede Saat ist gewöhnlich."), belohnung: t("Für immer: +2% Chance auf epische Saat.") }
];
const HERAUSFORDERUNG_AB_RUNS = 3;

// ---------- HOF-STILE (ab dem 2. Run waehlt man zu Beginn jedes Story-Runs 1 von 3) ----------
const HOF_STILE = [
    { id: "weizenbauer", symbol: "🌾", name: t("Weizenbauer"), text: t("Weizen ist 80% mehr wert, alle anderen Pflanzen 10% weniger.") },
    { id: "haendler", symbol: "🧳", name: t("Händlerfreund"), text: t("Der Wanderhändler kommt doppelt so oft und ist 25% billiger.") },
    { id: "sterndeuter", symbol: "🔭", name: t("Sterndeuter"), text: t("Sternensaat ist 50% mehr wert, aber du bekommst 10% weniger Gold.") },
    { id: "gaertner", symbol: "🌱", name: t("Gärtner"), text: t("Alle Pflanzen wachsen 15% schneller.") },
    { id: "gluecksritter", symbol: "🍀", name: t("Glücksritter"), text: t("+3% Chance auf epische und +1% auf legendäre Saat.") },
    { id: "sparfuchs", symbol: "🐷", name: t("Sparfuchs"), text: t("Alle Rechnungen kosten 10% weniger.") },
    { id: "fruehaufsteher", symbol: "🌅", name: t("Frühaufsteher"), text: t("+20% Energie an jedem Tag.") },
    { id: "tierfreund", symbol: "🐾", name: t("Tierflüsterer"), text: t("Streicheln gibt dreimal so viel Gold.") }
];

// ---------- DORFZEITUNG (eine Schlagzeile am Feierabend, nur zum Schmunzeln) ----------
const DORFZEITUNG = [
    () => (typeof aktuellesFest === "function" && aktuellesFest() ? aktuellesFest().zeitung : null),
    () => t("Bürgermeister verwechselt Kürbis mit Hut. Trägt ihn trotzdem weiter."),
    () => t("Krähen gründen Gewerkschaft. Fordern mehr Weizen und weniger Vogelscheuchen."),
    () => t("Wanderhändler schwört: Seine Taschenuhr ist „fast neu“."),
    () => t("Studie: 9 von 10 Karotten bevorzugen lockere Erde."),
    () => t("Mondteich leuchtet wieder. Anwohner vermuten „irgendwas mit Magie“."),
    () => t("Sonnenblume wächst höher als Scheune. Scheune nimmt es persönlich."),
    () => t("Dorfbäckerei führt Weizen-Weizen-Brot ein. Kunden sind verwirrt, aber satt."),
    () => t("Sternschnuppe landet im Brunnen. Wunsch: „Mehr Sternschnuppen“."),
    () => t("Kuscheltier-Automat angeblich „nicht manipuliert“, sagt der Kuscheltier-Automat."),
    () => t("Rechnungsbote geht in Urlaub. Rechnungen kommen trotzdem pünktlich."),
    () => t("Igel rollt drei Kilometer bergab. Nennt es „Sport“."),
    () => t("Neuer Rekord: Bauer klickt so schnell, dass der Samenladen um eine Pause bittet."),
    () => t("Eichhörnchen beim Horten von Sternensamen erwischt. Zeigt keine Reue."),
    () => t("Wetterfrosch sagt Wetter voraus. Liegt zu 50% richtig."),
    () => t("Tarotkarte „Der Narr“ zieht sich selbst. Alle sind beeindruckt."),
    () => t("Bienen streiken nicht. Sie summen nur lauter."),
    (m, r) => r.statistik.ernten < 100 ? null : tf("Rekordbauer erntet heute {0} Pflanzen. Nachbarn werden nervös.", zahl(r.statistik.ernten)),
    (m, r) => r.felder.length < 8 ? null : tf("Hof zählt jetzt {0} Felder. Maulwürfe beantragen Mitsprache.", r.felder.length),
    (m, r) => (m.lebenszeit.streicheln || 0) < 100 ? null : tf("Begleiter wurde schon {0}-mal gestreichelt. Fordert trotzdem mehr.", zahl(m.lebenszeit.streicheln || 0))
];

// ---------- FEIERTAGE (nach echtem Datum, nur Deko und Zeitungs-Schlagzeilen) ----------
// von/bis = [Monat, Tag]. hof = Zusatz fuer die Hof-Landschaft (siehe HOF_FARBEN in sprites.js)
const FESTE = [
    { id: "halloween", symbol: "🎃", name: t("Halloween"), von: [10, 24], bis: [11, 2], hof: { kuerbisse: true },
        zeitung: t("Kürbisse tauchen über Nacht überall auf. Niemand weiß, wer sie geschnitzt hat.") },
    { id: "winterfest", symbol: "🎄", name: t("Winterfest"), von: [12, 15], bis: [12, 30], hof: { schneeDaecher: true },
        zeitung: t("Winterfest! Die Dächer tragen Schnee, der Begleiter trägt einen Schal (angeblich).") },
    { id: "neujahr", symbol: "🎆", name: t("Neujahr"), von: [12, 31], bis: [1, 6], hof: { schneeDaecher: true },
        zeitung: t("Frohes neues Jahr! Der Bürgermeister verspricht mehr Weizen und weniger Rechnungen. Wie jedes Jahr.") },
    { id: "valentin", symbol: "💝", name: t("Valentinstag"), von: [2, 12], bis: [2, 16], hof: {},
        zeitung: t("Valentinstag: Zwei Karotten im Beet nebenan wurden Hand in Hand gesichtet.") },
    { id: "ostern", symbol: "🥚", name: t("Frühlingsfest"), von: [4, 1], bis: [4, 21], hof: {},
        zeitung: t("Frühlingsfest! Ein Hase versteckt bunte Eier. Die Hühner sind beleidigt.") }
];
function aktuellesFest(datum = new Date()) {
    const wert = (m, d) => m * 100 + d;
    const heute = wert(datum.getMonth() + 1, datum.getDate());
    return FESTE.find(f => {
        const von = wert(...f.von), bis = wert(...f.bis);
        return von <= bis ? heute >= von && heute <= bis : heute >= von || heute <= bis;
    }) || null;
}

// ---------- BRIEFKASTEN (wie die Briefe in Animal Crossing) ----------
// Ab und zu schreibt jemand aus dem Dorf am Feierabend einen Brief mit einem kleinen Geschenk. Keine Namen, nur wer es ist.
const BRIEF_CHANCE = 0.1;
const BRIEFE = [
    { absender: t("Die Bäckerin"), text: t("Danke für den Weizen! Das Brot ist so gut geworden, dass ich dir etwas vom Gewinn abgebe."), geschenk: "gold" },
    { absender: t("Der Bürgermeister"), text: t("Ihr Hof ist das Schönste im ganzen Tal. Nehmen Sie das als kleine Anerkennung der Gemeinde."), geschenk: "gold" },
    { absender: t("Die Sternguckerin"), text: t("Letzte Nacht fiel etwas Glitzerndes auf meinen Balkon. Ich glaube, es gehört dir."), geschenk: "sterne" },
    { absender: t("Der Imker"), text: t("Meine Bienen fliegen am liebsten zu deinen Blumen. Hier, ein Glas Honig für mehr Schwung!"), geschenk: "energie" },
    { absender: t("Die Gärtnerin"), text: t("Ich hatte noch Dünger übrig. Streu ihn morgen auf deine Felder!"), geschenk: "duenger" },
    { absender: t("Der Postbote"), text: t("Ich habe mich verlaufen und dabei diese Sternensaat gefunden. Behalt sie ruhig."), geschenk: "sterne" },
    { absender: t("Die Nachbarskinder"), text: t("Wir haben mit deinem Begleiter gespielt! Hier sind unsere Ersparnisse, damit er Leckerlis bekommt."), geschenk: "gold" },
    { absender: t("Der Müller"), text: t("Dein Korn mahlt sich wie Butter. Morgen früh bringe ich dir einen Kaffee vorbei."), geschenk: "energie" }
];

// ---------- ERNTEFIEBER (seltenes Ereignis: kurz wachsen alle Pflanzen rasend schnell) ----------
const ERNTEFIEBER_KONFIG = { chance: 0.07, abTag: 3, dauerMs: 12000, tempo: 6 };

// ---------- ERFOLGE (dauerhaft, je 1x freischaltbar) ----------
// Jede Kette zeigt immer nur das naechste offene Ziel. Jede Stufe = spaeter ein Steam-Achievement.
// Belohnung: JEDE Stufe gibt genau 1 Kuschel-Gutschein, den man bei den Erfolgen selbst abholt.
// Standard und Sandbox haben getrennte Erfolge (eigener Fortschritt, eigene Gutscheine).
// nurStandard / nurSandbox = Kette gibt es nur in diesem Modus.
// wert(m, r): m = Meta-Stand des Modus, r = laufender Run dieses Modus (oder null)

const ERFOLG_BELOHNUNG_GUTSCHEINE = 1;

const ERFOLG_KETTEN = [
    { id: "gold", icon: "💰", text: z => t("Verdiene insgesamt ") + zahl(z) + t(" Gold"),
        wert: m => m.lebenszeit.gold,
        ziele: [1000, 1e5, 1e7, 1e9, 1e12, 1e15, 1e18, 1e21] },
    { id: "ernte", icon: "🌾", text: z => t("Ernte insgesamt ") + zahl(z) + t(" Pflanzen"),
        wert: m => m.lebenszeit.ernten,
        ziele: [50, 500, 5000, 50000, 500000, 5000000] },
    { id: "rechnung", icon: "🧾", nurStandard: true, text: z => t("Bezahle ") + z + (z === 1 ? t(" Rechnung") : t(" Rechnungen")) + t(" in einem Run"),
        wert: (m, r) => Math.max(m.besterRun ? m.besterRun.rechnungen : 0, r && !r.sandbox ? r.bezahlteRechnungen : 0),
        ziele: [1, 3, 5, 8, 12, 16, 20, 25] },
    { id: "meilenstein", icon: "🏁", nurSandbox: true, text: z => t("Erreiche ") + z + (z === 1 ? t(" Meilenstein") : t(" Meilensteine")) + t(" in Endlos"),
        wert: (m, r) => Math.max(m.lebenszeit.maxMeilensteine || 0, r && r.sandbox ? r.meilensteine : 0),
        ziele: [1, 3, 6, 10, 15, 20, 30] },
    { id: "boss", icon: "🏦", nurStandard: true, text: z => t("Zahle ") + z + (z === 1 ? t(" Kredit") : t(" Kredite")) + t(" ab"),
        wert: m => m.lebenszeit.bossRechnungen,
        ziele: [1, 5, 20, 50, 100] },
    { id: "kombo", icon: "🥁", text: z => t("Erreiche eine ") + z + t("er-Kombo"),
        wert: (m, r) => Math.max(m.lebenszeit.maxKombo, r ? r.gesamt.maxKombo : 0),
        ziele: [40, 80, 150, 300, 500] },
    { id: "jackpot", icon: "🌟", text: z => t("Sammle ") + z + (z === 1 ? t(" legendäre Saat") : t(" legendäre Saaten")) + t(" ein"),
        wert: m => m.lebenszeit.jackpots,
        ziele: [1, 10, 100, 1000] },
    { id: "spezial", icon: "✨", text: z => t("Ernte ") + zahl(z) + (z === 1 ? t(" Spezialpflanze") : t(" Spezialpflanzen")),
        wert: m => m.lebenszeit.spezial,
        ziele: [1, 25, 250, 2500] },
    { id: "felder", icon: "🟫", text: z => t("Besitze ") + z + t(" Felder in einem Run"),
        wert: (m, r) => Math.max(m.lebenszeit.maxFelder, r ? r.felder.length : 0),
        ziele: [8, 20, 35, 60] },
    { id: "pflanzen", icon: "🥕", text: z => t("Schalte ") + z + t(" Pflanzen in einem Run frei"),
        wert: (m, r) => Math.max(m.lebenszeit.maxPflanzen, r ? r.pflanzen.filter(p => p.freigeschaltet).length : 0),
        ziele: [2, 4, 6, 8, 11, 15, 18] },
    { id: "tarot", icon: "🔮", text: z => t("Besitze ") + z + (z === 1 ? t(" Tarotkarte") : t(" Tarotkarten")),
        wert: m => m.tarot.length,
        ziele: [1, 5, 11, 22] },
    { id: "kuschel", icon: "🧸", text: z => t("Sammle ") + z + (z === 1 ? t(" Kuscheltier") : t(" verschiedene Kuscheltiere")),
        wert: m => Object.keys(m.kuscheltiere).length,
        ziele: [1, 7, 15, 30] },
    { id: "sterne", icon: "🌠", text: z => t("Fange ") + z + (z === 1 ? t(" Sternschnuppe") : t(" Sternschnuppen")),
        wert: m => m.lebenszeit.sterne,
        ziele: [1, 10, 50, 250] },
    { id: "gluehwuermchen", icon: "🪲", text: z => t("Fange ") + zahl(z) + t(" Glühwürmchen"),
        wert: m => m.lebenszeit.gluehwuermchen,
        ziele: [1, 25, 200, 1000] },
    { id: "kraehen", icon: "🐦", text: z => t("Verscheuche ") + zahl(z) + (z === 1 ? t(" Krähe") : t(" Krähen")),
        wert: m => m.lebenszeit.kraehen,
        ziele: [1, 25, 100, 500] },
    { id: "wetter", icon: "🌦️", text: z => t("Erlebe ") + z + (z === 1 ? t(" Wetter") : t(" verschiedene Wetter")),
        wert: m => Object.keys(m.kodex.wetter).length,
        ziele: [1, 3, 6, 9] },
    { id: "goldregen", icon: "🌧️", text: z => t("Erlebe ") + z + (z === 1 ? t(" Goldregen") : t(" Goldregen")),
        wert: m => m.lebenszeit.goldregen,
        ziele: [1, 10, 50] },
    { id: "gluecksspiel", icon: "🎲", text: z => t("Gewinne ") + zahl(z) + t("-mal beim Glücksspiel"),
        wert: m => m.lebenszeit.gluecksspielSiege,
        ziele: [1, 25, 250, 1000] },
    { id: "werkzeuge", icon: "🧰", text: z => t("Besitze ") + z + (z === 1 ? t(" Werkzeug") : t(" Werkzeuge")) + t(" gleichzeitig"),
        wert: (m, r) => Math.max(m.lebenszeit.maxWerkzeuge, r ? r.werkzeuge.length : 0),
        ziele: [1, 3, 5] },
    { id: "sternenfall", icon: "☄️", nurStandard: true, text: z => t("Löse ") + z + t("-mal den Sternenfall aus"),
        wert: m => m.sternenfaelle,
        ziele: [1, 3, 10, 25] },
    { id: "meister", icon: "🏅", text: z => t("Bringe eine Pflanze auf Meisterschaft ") + z,
        wert: m => Math.max(0, ...PFLANZEN_VORLAGEN.map(p => MEISTER_SCHWELLEN.filter(s => (m.kodex.pflanzen[p.id] || 0) >= s).length)),
        ziele: [1, 3, 5, 7, 10, 12] },
    { id: "mondphase", icon: "🌕", nurStandard: true, text: z => t("Schalte die ") + z + t(". Mondphase frei"),
        wert: m => m.mondphaseFrei || 0,
        ziele: [1, 3, 5, 8, 10] },
    { id: "streicheln", icon: "🐾", text: z => t("Streichle deinen Begleiter ") + zahl(z) + "-mal",
        wert: m => m.lebenszeit.streicheln,
        ziele: [1, 333, 3333, 33333] },
    { id: "kodex", icon: "📖", text: z => t("Entdecke ") + z + t(" Einträge im Kodex"),
        wert: m => (m === meta && typeof kodexEntdeckt === "function" ? kodexEntdeckt() : m.kodexEntdecktZahl || 0),
        ziele: [10, 25, 50, 80] },
    { id: "sternensamen", icon: "✨", text: z => t("Sammle insgesamt ") + zahl(z) + t(" Sternensamen"),
        wert: m => m.lebenszeit.sternensamen,
        ziele: [1000, 50000, 1000000, 100000000] },
    { id: "tage", icon: "📅", text: z => t("Spiele insgesamt ") + zahl(z) + t(" Tage"),
        wert: m => m.lebenszeit.tage,
        ziele: [10, 100, 500, 2000] },
    { id: "stellarium", icon: "🌌", text: z => t("Kaufe ") + z + t(" Sterne in einem einzigen Run"),
        wert: (m, r) => (r ? SKILLS.filter(d => (r.level[d.id] || 0) > 0 && d.id !== "p_weizen").length : 0),
        ziele: [25, 60, 120, 200] },
    { id: "segensammler", icon: "🙏", text: z => t("Wähle ") + z + t(" verschiedene Segen"),
        wert: m => Object.keys(m.kodex.segen || {}).length,
        ziele: [10, 25, 35] },
    { id: "briefe", icon: "📬", text: z => t("Bekomme ") + z + (z === 1 ? t(" Brief") : t(" Briefe")) + t(" aus dem Dorf"),
        wert: m => m.lebenszeit.briefe || 0,
        ziele: [1, 10, 30] },
    { id: "evolutionen", icon: "🧬", text: z => t("Entwickle ") + z + (z === 1 ? t(" Werkzeug") : t(" verschiedene Werkzeuge")),
        wert: m => Object.keys((m.kodex && m.kodex.evolutionen) || {}).length,
        ziele: [1, 5, 15] },
    { id: "herausforderer", icon: "🏆", nurStandard: true, text: z => t("Schaffe ") + z + (z === 1 ? t(" Herausforderung") : t(" Herausforderungen")),
        wert: m => Object.keys(m.herausforderungen || {}).length,
        ziele: [1, 3, 6] },
    { id: "fieber", icon: "🔥", text: z => t("Erlebe ") + z + t("-mal das Erntefieber"),
        wert: m => m.lebenszeit.fieber || 0,
        ziele: [1, 10, 50] },
    { id: "stile", icon: "🏡", nurStandard: true, text: z => t("Spiele ") + z + t(" verschiedene Hof-Stile"),
        wert: m => Object.keys((m.kodex && m.kodex.stile) || {}).length,
        ziele: [3, 8] },
    { id: "paktierer", icon: "⚠️", nurStandard: true, text: z => t("Schließe ") + z + (z === 1 ? t(" Pakt") : t(" Pakte")),
        wert: m => SEGEN.filter(s => s.pakt).reduce((summe, s) => summe + ((m.kodex.segen || {})[s.id] || 0), 0),
        ziele: [1, 10, 30] },
    { id: "fruehzahler", icon: "🧾", nurStandard: true, text: z => t("Bezahle ") + z + (z === 1 ? t(" Rechnung") : t(" Rechnungen")) + t(" vor dem Zahltag"),
        wert: m => m.lebenszeit.fruehBezahlt || 0,
        ziele: [1, 10, 50] }
];

// Ketten, die es im jeweiligen Modus gibt
function erfolgKettenFuer(sandbox) {
    return ERFOLG_KETTEN.filter(k => (sandbox ? !k.nurStandard : !k.nurSandbox));
}

// ---------- HOF: BEGLEITER (intern "haustier") ----------
// art = welche Figur gezeichnet wird ("katze", "maedchen", "manta", "pinguin", siehe sprites.js).
// stil = Extras fuer die Tier-Figur: fuchs, hund, dackel, hase, panda, axolotl, drache, engel, teufel, einhorn (Horn + Maehne),
//        muetze (Weihnachtsmuetze), kuerbishut, keineStreifen. Kombinationen ergeben neue Wesen (hase + drache = Wolpertinger).
// farben = Ziffern 1 bis 7: 1 hell, 2 Fell/Haare, 3 dunkel/Kleid, 4 Bauch/Haut, 5 Augen, 6 rosa, 7 Umriss.
// stimme = Tonhoehe beim Miauen (1 = normal), laut = "miau", "wuff" oder "blubb".
// quelle: "frei" (von Anfang an), "erspielt" (bedingung erfuellen), "dlc" (spaeter im Steam-Shop, siehe DLC_PAKETE)
// effekt = kleine Extras beim Laufen (blasen, herzen, funkeln, flammen, sterne, schnee), klasse = CSS-Look der Figur
// Legendaere Tiere: idle = eigene Animation ab und zu (haus.js, HAUSTIER_IDLE), aura = leuchtender Rand, schwebt = schwebt sanft

const HAUSTIER_SKINS = [
    // ----- Gewoehnlich / Ungewoehnlich (im Spiel) -----
    { id: "rot", name: t("Rote Katze"), art: "katze", quelle: "frei",
        farben: { 1: "#ffc98a", 2: "#f0923a", 3: "#c0601a", 4: "#fff4e2", 5: "#2e1a09", 6: "#ff8fa3", 7: "#4a2410" } },
    { id: "schwarz", name: t("Schwarze Katze"), art: "katze", quelle: "erspielt",
        bedingungText: t("Spiele 40 Tage"), bedingung: () => meta.lebenszeit.tage >= 40,
        farben: { 1: "#4a4a5a", 2: "#2e2e38", 3: "#1c1c24", 4: "#55556a", 5: "#e8c020", 6: "#ff9aa8", 7: "#0b0b10" } },
    { id: "hund", name: t("Hund"), art: "katze", stil: { hund: true, keineStreifen: true }, laut: "wuff", quelle: "erspielt",
        bedingungText: t("Bezahle insgesamt 20 Rechnungen"), bedingung: () => meta.lebenszeit.rechnungen >= 20,
        farben: { 1: "#fff0d8", 2: "#c98a4a", 3: "#6b3f1d", 4: "#fff8ee", 5: "#2e1a09", 6: "#ff8fa3", 7: "#3a2210" } },
    { id: "dackel", name: t("Dackel"), art: "katze", stil: { hund: true, dackel: true, keineStreifen: true }, laut: "wuff", stimme: 1.2,
        quelle: "erspielt", bedingungText: t("Streichle deinen Begleiter 500-mal"), bedingung: () => meta.lebenszeit.streicheln >= 500,
        farben: { 1: "#e8a86a", 2: "#a0562a", 3: "#5a2a10", 4: "#d99060", 5: "#1e1008", 6: "#ff8fa3", 7: "#2e1408" } },

    // ----- Episch (Unterstuetzer-Paket) -----
    { id: "waschbaer", name: t("Waschbär"), art: "katze", stil: { panda: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.1,
        farben: { 1: "#e6e6ea", 2: "#9a9aa6", 3: "#2e2e36", 4: "#f2f2f4", 5: "#f2f2f4", 6: "#ffb3c0", 7: "#1c1c22" } },
    { id: "kitsune", name: t("Kitsune"), art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer",
        stimme: 1.25, farben: { 1: "#ffffff", 2: "#f6f2f8", 3: "#d9302a", 4: "#ffffff", 5: "#d9302a", 6: "#ff8fa3", 7: "#6a2a3a" } },
    { id: "fennek", name: t("Wüstenfuchs"), art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer",
        stimme: 1.4, farben: { 1: "#fff0d0", 2: "#e8c890", 3: "#b8864a", 4: "#fff8e8", 5: "#2e1a09", 6: "#ffb3a0", 7: "#5a3a18" } },
    { id: "eisbaer", name: t("Eisbärchen"), art: "katze", stil: { panda: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer",
        stimme: 0.85, farben: { 1: "#ffffff", 2: "#f4f8fc", 3: "#d6e2ee", 4: "#ffffff", 5: "#f4f8fc", 6: "#ffb3c0", 7: "#6b7a90" } },
    { id: "wolpertinger", name: t("Wolpertinger"), art: "katze", stil: { hase: true, drache: true, keineStreifen: true },
        quelle: "dlc", paket: "unterstuetzer", stimme: 1.3,
        farben: { 1: "#e8c8a0", 2: "#a87a4a", 3: "#6b4a2a", 4: "#fff4e8", 5: "#2e1a09", 6: "#ffb3c0", 7: "#4a2a10" } },
    { id: "fuchs", name: t("Fuchs"), art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.2,
        farben: { 1: "#ffc28a", 2: "#e8742a", 3: "#4a2616", 4: "#fff8f0", 5: "#2e1a09", 6: "#ff9aa8", 7: "#3a1a08" } },
    { id: "schneefuchs", name: t("Schneefuchs"), art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.25,
        farben: { 1: "#ffffff", 2: "#f1f4fa", 3: "#9aa6bf", 4: "#ffffff", 5: "#23324a", 6: "#ffb3c0", 7: "#5f6b85" } },
    { id: "rotpanda", name: t("Roter Panda"), art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.3,
        farben: { 1: "#ffd8b0", 2: "#c8502a", 3: "#3a1a10", 4: "#fff4e8", 5: "#1e1008", 6: "#ff9aa8", 7: "#2a1008" } },
    { id: "wolf", name: t("Wolf"), art: "katze", stil: { fuchs: true, keineStreifen: true }, laut: "wuff", stimme: 0.8, quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#d8dde6", 2: "#8a93a3", 3: "#3a404c", 4: "#eef0f4", 5: "#e8c020", 6: "#ff9aa8", 7: "#22262e" } },
    { id: "husky", name: t("Husky"), art: "katze", stil: { hund: true, keineStreifen: true }, laut: "wuff", quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#ffffff", 2: "#9aa6b6", 3: "#4a5566", 4: "#ffffff", 5: "#5aa9e6", 6: "#ff8fa3", 7: "#2a3340" } },
    { id: "golden", name: t("Golden Retriever"), art: "katze", stil: { hund: true, keineStreifen: true }, laut: "wuff", stimme: 0.9, quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#ffe0a0", 2: "#e0a84a", 3: "#a8702a", 4: "#fff0d0", 5: "#2e1a09", 6: "#ff8fa3", 7: "#5a3a10" } },
    { id: "hase", name: t("Hase"), art: "katze", stil: { hase: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.4,
        farben: { 1: "#ffffff", 2: "#d8cfc4", 3: "#a89a8a", 4: "#ffffff", 5: "#2e1a09", 6: "#ffb3c0", 7: "#5a4a3a" } },
    { id: "braunhase", name: t("Feldhase"), art: "katze", stil: { hase: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.35,
        farben: { 1: "#e8c8a0", 2: "#a87a4a", 3: "#6b4a2a", 4: "#fff4e8", 5: "#2e1a09", 6: "#ffb3c0", 7: "#4a2a10" } },
    { id: "panda", name: t("Panda"), art: "katze", stil: { panda: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 0.9,
        farben: { 1: "#ffffff", 2: "#f4f4f4", 3: "#1e1e24", 4: "#ffffff", 5: "#f4f4f4", 6: "#ffb3c0", 7: "#101014" } },
    { id: "dalmatiner", name: t("Dalmatiner"), art: "katze", stil: { hund: true, flecken: true, keineStreifen: true }, laut: "wuff", quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#ffffff", 2: "#f8f8f8", 3: "#1e1e24", 4: "#ffffff", 5: "#2e1a09", 6: "#ff8fa3", 7: "#2a2a30" } },
    { id: "tanuki", name: t("Tanuki"), art: "katze", stil: { fuchs: true, panda: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.1,
        farben: { 1: "#e8c8a0", 2: "#8a6a4a", 3: "#2e2418", 4: "#f4e4cc", 5: "#f4e4cc", 6: "#ffb3a0", 7: "#2a1a0a" } },
    { id: "pinguin", name: t("Pinguin"), art: "pinguin", quelle: "dlc", paket: "unterstuetzer", laut: "blubb",
        farben: { 1: "#ffffff", 2: "#2a2f3a", 3: "#1a1d24", 4: "#f8f8f8", 5: "#0e0e10", 6: "#f0a020", 7: "#0a0a0e" } },
    { id: "weihnachtskatze", name: t("Weihnachtskatze"), art: "katze", stil: { muetze: true }, quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#ffc98a", 2: "#f0923a", 3: "#c0601a", 4: "#fff4e2", 5: "#2e1a09", 6: "#ff8fa3", 7: "#4a2410" } },
    { id: "kuerbiskatze", name: t("Kürbiskatze"), art: "katze", stil: { kuerbishut: true }, quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#4a4a5a", 2: "#2e2e38", 3: "#1c1c24", 4: "#55556a", 5: "#f08a24", 6: "#ff9aa8", 7: "#0b0b10" } },
    // Neue epische Begleiter: jeder mit eigener Kombination aus Form und Zubehoer
    { id: "winterhase", name: t("Winterhase"), art: "katze", stil: { hase: true, muetze: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.35,
        farben: { 1: "#ffffff", 2: "#eef2f8", 3: "#b8c4d6", 4: "#ffffff", 5: "#2a3450", 6: "#ffb3c0", 7: "#7a869a" } },
    { id: "kuerbishund", name: t("Kürbishund"), art: "katze", stil: { hund: true, kuerbishut: true, keineStreifen: true }, laut: "wuff", quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#fff0d8", 2: "#b0763a", 3: "#5a3418", 4: "#fff8ee", 5: "#2e1a09", 6: "#ff8fa3", 7: "#3a2210" } },
    { id: "teufelsfuchs", name: t("Teufelchen"), art: "katze", stil: { fuchs: true, teufel: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.15,
        farben: { 1: "#ff9a8a", 2: "#c8302a", 3: "#3a0e10", 4: "#ffd8d0", 5: "#ffd23a", 6: "#ff8fa3", 7: "#2a0608" } },
    { id: "kuhkatze", name: t("Kuhkatze"), art: "katze", stil: { flecken: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 0.95,
        farben: { 1: "#ffffff", 2: "#f8f8f8", 3: "#1c1c24", 4: "#ffffff", 5: "#2e1a09", 6: "#ffb3c0", 7: "#1c1c24" } },
    { id: "schleifenhase", name: t("Schleifenhase"), art: "katze", stil: { hase: true, schleife: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.45,
        farben: { 1: "#ffe0ec", 2: "#f5c0d4", 3: "#c87a9a", 4: "#fff4f8", 5: "#4a1a2a", 6: "#ff8fb1", 7: "#8a4a62" } },
    { id: "pandawelpe", name: t("Panda-Welpe"), art: "katze", stil: { hund: true, panda: true, keineStreifen: true }, laut: "wuff", quelle: "dlc", paket: "unterstuetzer", stimme: 1.2,
        farben: { 1: "#ffffff", 2: "#f2f2f2", 3: "#1c1c22", 4: "#ffffff", 5: "#f2f2f2", 6: "#ffb3c0", 7: "#1c1c22" } },
    // Blockmenschen in den Skins von BastiGHG und Papaplatte (mit Erlaubnis), Kloetzchen-Figuren mit eigenen Animationen
    { id: "basti", name: "787", art: "blockmensch", stil: { anzug: true }, laut: "block", quelle: "dlc", paket: "unterstuetzer",
        idle: "block", effekt: "bloecke",
        farben: { 1: "#16161c", 2: "#1d4f8f", 3: "#22222a", 4: "#c3c3c3", 5: "#99d9ea", 6: "#2c2c36", 7: "#050508", 8: "#1c1c24",
            h: "#c3c3c3", k: "#efefef" } },
    { id: "papap", name: "Papa P", art: "blockmensch", stil: { kapuze: true }, laut: "block", stimme: 0.8, quelle: "dlc", paket: "unterstuetzer",
        idle: "papa", effekt: "flammen",
        farben: { 1: "#fff700", 2: "#332a28", 3: "#ff6a0a", 4: "#0a0808", 5: "#ff2a1a", 6: "#403633", 7: "#140e0c", 8: "#292126",
            h: "#ffd23a", k: "#c8a83e" } },

    // ----- neu: passend zu den Haus-Skins -----
    { id: "lebkuchenkatze", name: t("Lebkuchenkatze"), art: "katze", stil: { keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.15,
        farben: { 1: "#d08a4a", 2: "#a8602a", 3: "#fff6f0", 4: "#e8a868", 5: "#3a1a08", 6: "#ff8fa3", 7: "#4a2410" } },
    { id: "bonbonhase", name: t("Bonbonhase"), art: "katze", stil: { hase: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.45,
        farben: { 1: "#ffd6ea", 2: "#9ae0ff", 3: "#ff6a9a", 4: "#fff4fa", 5: "#3a1a2a", 6: "#ff8fb1", 7: "#8a4a6a" } },
    { id: "strandhund", name: t("Strandhund"), art: "katze", stil: { hund: true, keineStreifen: true }, laut: "wuff", quelle: "dlc", paket: "unterstuetzer", stimme: 1.1,
        farben: { 1: "#f4e4c0", 2: "#d8b878", 3: "#2ab0c0", 4: "#fffaf0", 5: "#2e1a09", 6: "#ff9aa8", 7: "#6a4a20" } },
    { id: "kirschfuchs", name: t("Kirschblütenfuchs"), art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.25,
        farben: { 1: "#ffd6ea", 2: "#ff9ac0", 3: "#c84a7a", 4: "#fff4f8", 5: "#3a1a2a", 6: "#ff8fb1", 7: "#8a2a5a" } },
    { id: "mitternachtskatze", name: t("Mitternachtskatze"), art: "katze", stil: { keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.1,
        farben: { 1: "#4a3a7a", 2: "#2a1d5a", 3: "#ffe89a", 4: "#5a4a8a", 5: "#ffe89a", 6: "#c9b0f5", 7: "#140e2a" } },
    { id: "hexenkatze", name: t("Hexenkatze"), art: "katze", stil: { keineStreifen: true }, stimme: 1.05, quelle: "dlc", paket: "einzeln", effekt: "blasen", aura: "#8dff7a", klasse: "haustier-geist", 
        farben: { 1: "#3a3a4a", 2: "#1d1d28", 3: "#8dff7a", 4: "#4a4a5a", 5: "#8dff7a", 6: "#c9b0f5", 7: "#08080c" } },
    { id: "mondwolf", name: t("Mondwolf"), art: "katze", stil: { fuchs: true, keineStreifen: true }, laut: "wuff", stimme: 0.85, quelle: "dlc", paket: "einzeln", effekt: "funkeln", aura: "#9fe0ff", schwebt: true, 
        farben: { 1: "#e8f0ff", 2: "#9fb4e0", 3: "#2a3a7a", 4: "#ffffff", 5: "#9fe0ff", 6: "#c9d6ff", 7: "#1d2a5a" } },
    { id: "goldhase", name: t("Goldhase"), art: "katze", stil: { hase: true, keineStreifen: true }, stimme: 1.5, quelle: "dlc", paket: "einzeln", effekt: "funkeln", aura: "#ffd93d", 
        farben: { 1: "#ffe066", 2: "#e0a800", 3: "#8a5a08", 4: "#fff6c0", 5: "#5a3a08", 6: "#ffb3c0", 7: "#6a4a08" } },

    // ----- Mythisch: nur fuer Beta-Tester (sichtbar nur, wenn man ihn hat) -----
    { id: "betatester", name: "Beta Tester", art: "engel", quelle: "beta", seltenheit: 5, laut: "block", stimme: 1.3,
        aura: "#fff3a0", schwebt: true, klasse: "haustier-engel", effekt: "funkeln",
        farben: { 7: "#2a2a44", A: "#eef2fa", a: "#b8c0d6", Q: "#7a84a0", G: "#ffd23a", g: "#c8901a", H: "#ffe28a", h: "#d8a84a",
            S: "#ffdcc6", X: "#f0b09a", E: "#3a7ae0", W: "#ffffff", V: "#c8d4ec", v: "#98a8c8", B: "#eef6ff", b: "#a8bcdc",
            C: "#fff8ee", c: "#e0d2bc", R: "#ffe066", r: "#e0a800", L: "#fff8c0", w: "#ffffff" } },

    // ----- Legendaer (einzeln, mit Effekten) -----
    { id: "axolotl", name: t("Axolotl"), art: "katze", stil: { axolotl: true, keineStreifen: true }, laut: "blubb",
        quelle: "dlc", paket: "einzeln", effekt: "blasen",
        idle: "blubb", aura: "#ff8fb1",
        farben: { 1: "#ffe0ec", 2: "#ffb3cf", 3: "#e0507a", 4: "#ffe6f0", 5: "#1e1016", 6: "#ff6fa0", 7: "#7a2a48" } },
    { id: "drache", name: t("Drache"), art: "katze", stil: { drache: true, keineStreifen: true }, stimme: 0.8,
        quelle: "dlc", paket: "einzeln", effekt: "flammen",
        idle: "feuer", aura: "#7ae07a",
        farben: { 1: "#b8f07a", 2: "#5fb03c", 3: "#2f6b24", 4: "#f5e0a0", 5: "#d49a00", 6: "#ff8fa3", 7: "#1a3a10" } },
    { id: "eisdrache", name: t("Eisdrache"), art: "katze", stil: { drache: true, keineStreifen: true }, stimme: 0.75,
        quelle: "dlc", paket: "einzeln", effekt: "schnee",
        idle: "frost", aura: "#9fe8ff",
        farben: { 1: "#e8f6ff", 2: "#8fd0f0", 3: "#3a7ab0", 4: "#ffffff", 5: "#5aa9e6", 6: "#cfe0f5", 7: "#1a3a5a" } },
    { id: "engel", name: t("Engelskatze"), art: "katze", stil: { engel: true, keineStreifen: true }, stimme: 1.15,
        quelle: "dlc", paket: "einzeln", effekt: "funkeln",
        idle: "engel", aura: "#ffe89a", schwebt: true,
        farben: { 1: "#ffffff", 2: "#fdfaf2", 3: "#e6dcc4", 4: "#ffffff", 5: "#4a7fd0", 6: "#ffb3c0", 7: "#8a7a5a" } },
    { id: "hoellenhund", name: t("Höllenhund"), art: "katze", stil: { hund: true, teufel: true, flammen: true, keineStreifen: true }, laut: "wuff", stimme: 0.7,
        quelle: "dlc", paket: "einzeln", effekt: "flammen",
        idle: "feuer", aura: "#ff4a3a",
        farben: { 1: "#5a2a2a", 2: "#2e1414", 3: "#b8232a", 4: "#4a2020", 5: "#ffd23a", 6: "#ff6a3a", 7: "#100404" } },
    { id: "feuerfuchs", name: t("Feuerfuchs"), art: "katze", stil: { fuchs: true, flammen: true, keineStreifen: true }, stimme: 1.1,
        quelle: "dlc", paket: "einzeln", effekt: "flammen",
        idle: "phoenix", aura: "#ff8a2a",
        farben: { 1: "#ffe066", 2: "#ff8a2a", 3: "#d9302a", 4: "#fff0b0", 5: "#5a1008", 6: "#ffb3c0", 7: "#5a1008" } },
    { id: "sternenkatze", name: t("Sternenkatze"), art: "katze", stil: { keineStreifen: true, sterne: true }, stimme: 1.2,
        quelle: "dlc", paket: "einzeln", effekt: "sterne",
        idle: "sterne", aura: "#8fa2f0",
        farben: { 1: "#4a5fc0", 2: "#1d2a5a", 3: "#0e1436", 4: "#3a4a9a", 5: "#fff6a0", 6: "#c9b0f5", 7: "#05081a" } },
    { id: "geisterhund", name: t("Geisterhund"), art: "katze", stil: { hund: true, keineStreifen: true }, laut: "wuff", stimme: 1.3,
        quelle: "dlc", paket: "einzeln", effekt: "funkeln", klasse: "haustier-geist",
        idle: "geist", aura: "#cfe0f5",
        farben: { 1: "#f4f8ff", 2: "#cfe0f5", 3: "#9fb8d8", 4: "#ffffff", 5: "#5aa9e6", 6: "#cfe0f5", 7: "#7a90b0" } },
    { id: "einhorn", name: t("Einhorn"), art: "katze", stil: { hund: true, einhorn: true, keineStreifen: true }, stimme: 1.2,
        quelle: "dlc", paket: "einzeln", effekt: "funkeln",
        idle: "engel", aura: "#ff9ad5", schwebt: true,
        farben: { 1: "#ffffff", 2: "#fdf6ff", 3: "#e8d4f5", 4: "#ffffff", 5: "#7c4fb3", 6: "#ffb3d9", 7: "#8a6aa8" } },
    { id: "maedchen", name: t("Katzenmädchen"), art: "maedchen", stimme: 1.35, quelle: "dlc", paket: "einzeln", effekt: "herzen",
        idle: "tanz", aura: "#ff9ad5",
        farben: { 1: "#ffffff", 2: "#5a3222", 3: "#3a3a5a", 4: "#ffe2cf", 5: "#b0402a", 6: "#ff9aa8", 7: "#2a1610" } },
    { id: "kitty", name: t("Kitty"), art: "katze", stil: { schleife: true, keineStreifen: true }, stimme: 1.3,
        quelle: "dlc", paket: "einzeln", effekt: "herzen",
        idle: "schleife", aura: "#ff4a6a",
        farben: { 1: "#ffffff", 2: "#fbfbff", 3: "#dcdce8", 4: "#ffffff", 5: "#1e1016", 6: "#ffb3c0", 7: "#8a8aa0" } },
    { id: "mondhase", name: t("Mondhase"), art: "katze", stil: { hase: true, sterne: true, keineStreifen: true }, stimme: 1.4,
        quelle: "dlc", paket: "einzeln", effekt: "sterne", idle: "sterne", aura: "#c9b0f5", schwebt: true,
        farben: { 1: "#e8e0ff", 2: "#b8a8f0", 3: "#7a68c8", 4: "#f4f0ff", 5: "#2a1a5a", 6: "#ffb3d9", 7: "#3a2a6a" } },
    { id: "manta", name: t("Mantarochen"), art: "manta", laut: "blubb", quelle: "dlc", paket: "einzeln", effekt: "blasen",
        idle: "manta", aura: "#5aa9e6", schwebt: true,
        farben: { 1: "#9fd8ff", 2: "#3b6a9e", 3: "#264a75", 4: "#eef6ff", 5: "#0f1a2a", 6: "#ff9aa8", 7: "#122238" } }
];

// Aktionen im Rechtsklick-Menue des Haustiers (funktionieren immer, auch zwischen den Tagen)
const HAUSTIER_AKTIONEN = [
    { id: "winken", name: t("Winken"), symbol: "👋" },
    { id: "kuscheln", name: t("Kuscheln"), symbol: "💕" },
    { id: "tanzen", name: t("Tanzen"), symbol: "💃" },
    { id: "rolle", name: t("Rolle"), symbol: "🔄" },
    { id: "sitz", name: t("Sitz!"), symbol: "🪑" },
    { id: "schlafen", name: t("Schlafen legen"), symbol: "💤" },
    { id: "fuettern", name: t("Füttern"), symbol: "🐟" },
    { id: "ball", name: t("Ball werfen"), symbol: "🎾" }
];

// ---------- HAUS: KOSMETIK (Klick aufs Haus im Hof) ----------
// Reine Optik, die die Entwicklung unterstuetzt. Alles laesst sich im Haus vorher anprobieren (Musik probehoeren).
// Seltenheit ergibt sich aus der Quelle:
//   Gewoehnlich (weiss)    = quelle "frei"
//   Ungewoehnlich (gruen)  = quelle "erspielt" (bedingung im Spiel erfuellen)
//   Episch (lila)          = quelle "dlc", paket "unterstuetzer" (Unterstuetzer-Paket inkl. Sandbox)
//   Legendaer (gelb)       = quelle "dlc", paket "einzeln" (aufwaendig/animiert, einzeln fuer LEGENDAER_KRISTALLE Kristalle)
// Spaeter auf Steam: Spiel 4,99 €, Unterstuetzer-Paket 4,99 €, Kristalle 100 pro 1 € (nur Kosmetik, kein Pay-to-Win).

const DLC_PAKETE = {
    unterstuetzer: {
        name: t("Unterstützer-Paket"), preis: 4.99,
        inhalt: t("Endlos sofort und alle epischen Inhalte: Begleiter, Landschaften, Deko, Musik, Samenläden, Felder, ") +
            t("Münzen, Kuschel-Rahmen und Pflanzen-Looks")
    }
};
const LEGENDAER_KRISTALLE = 50;
const KRISTALLE_PRO_EURO = 100;

function kristallText(menge) {
    return "💎 " + tf("{0} Kristalle", zahl(menge));
}

// Seltenheit eines Kosmetik-Eintrags (Index in KUSCHEL_RARITAETEN: 0 gewoehnlich, 1 ungewoehnlich, 3 episch, 4 legendaer)
function kosmetikSeltenheit(eintrag) {
    if (eintrag.seltenheit !== undefined) return eintrag.seltenheit;
    if (eintrag.quelle === "frei") return 0;
    if (eintrag.quelle === "erspielt") return 1;
    return eintrag.paket === "unterstuetzer" ? 3 : 4;
}

function euro(preis) {
    return preis.toLocaleString(SPRACH_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// Text fuer den Preis eines DLC-Inhalts
function dlcPreisText(eintrag) {
    if (eintrag.paket === "unterstuetzer") return t("Im ") + DLC_PAKETE.unterstuetzer.name + t(" enthalten");
    return kristallText(eintrag.kristalle || LEGENDAER_KRISTALLE);
}

const KOSMETIK_KATEGORIEN = [
    { id: "haustier", name: t("Begleiter"), symbol: "🐾" },
    { id: "landschaft", name: t("Landschaft"), symbol: "🏞️" },
    { id: "deko", name: t("Deko"), symbol: "🪴" },
    { id: "musik", name: t("Musik"), symbol: "🎵" },
    { id: "samenladen", name: t("Samenladen"), symbol: "🏪" },
    { id: "haus", name: t("Haus"), symbol: "🏠" },
    { id: "felder", name: t("Felder"), symbol: "sprite:sym_beet" },
    { id: "kugeln", name: t("Münzen"), symbol: "🪙" },
    { id: "rahmen", name: t("Kuschel-Rahmen"), symbol: "🖼️" },
    { id: "pflanzen", name: t("Pflanzen"), symbol: "🌱" }
];

// Hof-Themen: Farben fuer zeichneHof (sprites.js). funkeln = leuchtende Teilchen ueber der Wiese
const HOF_THEMEN = [
    { id: "standard", name: t("Sproutvale"), quelle: "frei" },
    { id: "tropen", name: t("Tropeninsel"), quelle: "erspielt", bedingungText: t("Erreiche Tag 30 in einem Run"),
        bedingung: () => meta.lebenszeit.maxTag >= 30 },
    { id: "sommer", name: t("Sommerhof"), quelle: "dlc", paket: "unterstuetzer", falter: ["#ffffff", "#ffd84a", "#ff9a3a"] },
    { id: "herbst", name: t("Herbsthof"), quelle: "dlc", paket: "unterstuetzer" },
    { id: "fruehling", name: t("Frühlingshof"), quelle: "dlc", paket: "unterstuetzer" },
    { id: "winter", name: t("Winterhof"), quelle: "dlc", paket: "unterstuetzer" },
    { id: "wueste", name: t("Oase"), quelle: "dlc", paket: "unterstuetzer" },
    { id: "zucker", name: t("Zuckerland"), quelle: "dlc", paket: "unterstuetzer", falter: ["#ff9ad5", "#9ae0ff", "#fff6a0"] },
    { id: "lavendel", name: t("Lavendelfeld"), quelle: "dlc", paket: "unterstuetzer", falter: ["#b48cff", "#ffffff", "#fff6a0"] },
    { id: "zauberwald", name: t("Zauberwald"), quelle: "dlc", paket: "einzeln", funkeln: ["#9fe8ff", "#ff9ad5", "#c9b0f5", "#fff6a0"],
        irrlichter: ["#9fe8ff", "#c9b0f5", "#b8f07a"], falter: ["#9fe8ff", "#ff9ad5", "#c9b0f5", "#fff6a0"] },
    // ewigeNacht = kosmischer Sternenhimmel, statt der Sonne zieht ein grosser Stern ueber den Himmel (der Mond kommt wie immer nachts)
    { id: "kosmos", name: t("Kosmische Nacht"), quelle: "dlc", paket: "einzeln", ewigeNacht: true, sternschnuppen: true,
        funkeln: ["#fff6a0", "#9fe8ff", "#c9b0f5", "#ffffff"] },
    // feuerwerk = Farben der Raketen, die ueber dem Hof in den Himmel steigen und zerplatzen
    { id: "feuerwerk", name: t("Feuerwerksfest"), quelle: "dlc", paket: "einzeln", funkeln: ["#ffd84a", "#ff8a4a"],
        feuerwerk: ["#ff4a4a", "#ffd84a", "#ff8a2a", "#ff6ad0", "#7ad8ff", "#9aff6a"] }
];

// Deko: bis zu 3 Objekte stehen auf festen Plaetzen im Hintergrund der Hofwiese (x in Prozent)
// farben = Farbvariante des Sprites, effekt = CSS-Look (bienen: Bienen summen herum), partikel = aufsteigende Teilchen,
// fluegel = Windmuehlen-Fluegel drehen sich als eigenes Bild vor dem Turm,
// ablauf = Bildfolge (ein Zeichen pro Schritt, das Sprite heisst <sprite ohne _0>_<Zeichen>), so bewegt sich nur der animierte Teil
const DEKO_SLOTS = [{ x: 31 }, { x: 47 }, { x: 69 }];
const DEKO_MAX = DEKO_SLOTS.length;

const DEKO_OBJEKTE = [
    { id: "vogelscheuche", name: t("Vogelscheuche"), sprite: "vogelscheuche", quelle: "frei" },
    { id: "blumenkuebel", name: t("Blumenkübel"), sprite: "blumenkuebel", quelle: "dlc", paket: "unterstuetzer" },
    { id: "holzbank", name: t("Holzbank"), sprite: "holzbank", quelle: "erspielt",
        bedingungText: t("Beende 10 Runs"), bedingung: () => meta.lebenszeit.runs >= 10 },
    { id: "gartenzwerg", name: t("Gartenzwerg"), sprite: "gartenzwerg", quelle: "dlc", paket: "unterstuetzer" },
    { id: "vogelhaus", name: t("Vogelhaus"), sprite: "vogelhaus", quelle: "dlc", paket: "unterstuetzer" },
    { id: "blumenbogen", name: t("Blumenbogen"), sprite: "blumenbogen", quelle: "dlc", paket: "unterstuetzer" },
    { id: "kuerbisstapel", name: t("Kürbisstapel"), sprite: "kuerbisstapel", quelle: "dlc", paket: "unterstuetzer" },
    { id: "brunnen", name: t("Brunnen"), sprite: "brunnen", quelle: "dlc", paket: "unterstuetzer", effekt: "glitzern" },
    { id: "laterne", name: t("Gartenlaterne"), sprite: "gartenlaterne", quelle: "erspielt", effekt: "leuchten",
        bedingungText: t("Fange insgesamt 100 Glühwürmchen"), bedingung: () => meta.lebenszeit.gluehwuermchen >= 100 },
    { id: "bienenstock", name: t("Bienenkorb"), sprite: "bienenstock", quelle: "dlc", paket: "unterstuetzer", effekt: "bienen" },
    { id: "vogeltraenke", name: t("Vogeltränke"), sprite: "vogeltraenke", quelle: "dlc", paket: "unterstuetzer", effekt: "glitzern" },
    { id: "schneemann", name: t("Schneemann"), sprite: "schneemann", quelle: "dlc", paket: "unterstuetzer", effekt: "wackeln" },
    { id: "wetterhahn", name: t("Krähe"), sprite: "kraehe_0", quelle: "dlc", paket: "unterstuetzer",
        ablauf: "000000000000333333000000001100000000440404000000000022022000000000003300" },
    { id: "heuwagen", name: t("Heuwagen"), sprite: "heuwagen", quelle: "dlc", paket: "unterstuetzer" },
    { id: "briefkasten", name: t("Briefkasten"), sprite: "briefkasten", quelle: "dlc", paket: "unterstuetzer" },
    { id: "steinlaterne", name: t("Steinlaterne"), sprite: "steinlaterne", quelle: "dlc", paket: "unterstuetzer", effekt: "leuchten" },
    { id: "schubkarre", name: t("Blumen-Schubkarre"), sprite: "schubkarre", quelle: "dlc", paket: "unterstuetzer" },
    { id: "schaukel", name: t("Gartenschaukel"), sprite: "schaukel", quelle: "dlc", paket: "unterstuetzer", effekt: "wackeln" },
    { id: "teetisch", name: t("Teetisch"), sprite: "teetisch", quelle: "dlc", paket: "unterstuetzer" },
    { id: "leuchtpilze", name: t("Leuchtpilzring"), sprite: "leuchtpilze", quelle: "dlc", paket: "einzeln", effekt: "leuchten" },
    { id: "wegweiser", name: t("Wegweiser"), sprite: "wegweiser", quelle: "erspielt",
        bedingungText: t("Erreiche Tag 50 in einem Run"), bedingung: () => meta.lebenszeit.maxTag >= 50 },
    { id: "sonnenschirm", name: t("Sonnenschirm"), sprite: "sonnenschirm", quelle: "dlc", paket: "unterstuetzer", effekt: "wackeln" },
    { id: "kuerbislaterne", name: t("Kürbislaterne"), sprite: "kuerbislaterne", quelle: "dlc", paket: "unterstuetzer", effekt: "feuer" },
    { id: "pilzhaus", name: t("Pilzhäuschen"), sprite: "pilzhaus", quelle: "dlc", paket: "unterstuetzer", effekt: "leuchten" },
    { id: "windmuehle", name: t("Windmühle"), sprite: "muehle", quelle: "dlc", paket: "einzeln", fluegel: true },
    { id: "lagerfeuer", name: t("Lagerfeuer"), sprite: "lagerfeuer", quelle: "dlc", paket: "unterstuetzer", effekt: "feuer",
        partikel: ["#ffd93d", "#ff8a2a", "#ffffff"] },
    { id: "feenbrunnen", name: t("Feenbrunnen"), sprite: "brunnen", quelle: "dlc", paket: "unterstuetzer", effekt: "glitzern",
        farben: { T: "#8d6bd6", U: "#b48cff", Q: "#ff9ad5" }, partikel: ["#ff9ad5", "#c9b0f5", "#ffffff"] },
    { id: "leuchtpilzhaus", name: t("Leuchtpilz-Haus"), sprite: "pilzhaus", quelle: "dlc", paket: "unterstuetzer", effekt: "leuchten-blau",
        farben: { R: "#4a8aff", r: "#2a5ad0", w: "#bff0ff" }, partikel: ["#9fe8ff", "#4a8aff", "#ffffff"] },
    { id: "koiteich", name: t("Koi-Teich"), sprite: "koiteich_0", quelle: "dlc", paket: "einzeln", effekt: "glitzern",
        ablauf: "01234567" },
    { id: "gluecksdrache", name: t("Glücksdrache"), sprite: "gluecksdrache_0", quelle: "dlc", paket: "einzeln",
        ablauf: "0000000000100000000233332000000000100000000000233320000", partikel: ["#ffd84a", "#ff8a2a", "#ff4a4a"] },
    { id: "windspiel", name: t("Windspiel"), sprite: "windspiel_0", quelle: "dlc", paket: "einzeln",
        ablauf: "0123012301230000000000", partikel: ["#bff0ff", "#ffffff", "#fff6a0"] },
    { id: "sternteleskop", name: t("Sternenteleskop"), sprite: "sternteleskop_0", quelle: "dlc", paket: "einzeln",
        ablauf: "0011223300112233", partikel: ["#fff6a0", "#ffffff", "#8fa2f0"] }
];

// Musik: "auto" spielt je nach Tageszeit (nur Lieder, die du hast). Die Noten stehen in audio.js (LIEDER).
const MUSIK_TITEL = [
    { id: "auto", name: t("Automatisch (nach Tageszeit)"), quelle: "frei" },
    { id: "sproutvale", name: t("Sproutvale"), quelle: "frei" },
    { id: "morgentau", name: t("Morgentau"), quelle: "erspielt", bedingungText: t("Spiele 30 Tage"),
        bedingung: () => meta.lebenszeit.tage >= 30 },
    { id: "abendrot", name: t("Abendrot"), quelle: "dlc", paket: "unterstuetzer" },
    { id: "mondnacht", name: t("Mondnacht"), quelle: "dlc", paket: "unterstuetzer" },
    { id: "kirmes", name: t("Kirmes"), quelle: "dlc", paket: "unterstuetzer" },
    { id: "winterzauber", name: t("Winterzauber"), quelle: "dlc", paket: "unterstuetzer" },
    { id: "sternenwalzer", name: t("Sternenwalzer"), quelle: "dlc", paket: "unterstuetzer" }
];

// Samenladen: Farben der Markise und des Holzes. klasse = zusaetzlicher Look (style.css),
// funken = Funken beim Samen, wurf = Look der geworfenen Saaten, spur = Funken hinter der Saat.
// Legendaere Laeden sind eigene Gebaeude: bauweise = Aufbau in haus.js/style.css, bild = Symbol in der Mitte,
// ankunft = Farben der kleinen Explosion, wenn ein Wurf auf dem Feld landet, drehen = Wurf zeigt in Flugrichtung
const SAMENLADEN_SKINS = [
    { id: "standard", name: t("Rot-Weiß"), quelle: "frei", markise: ["#d9483f", "#fff1d6"], holz: ["#b87a3e", "#9e6530"] },
    { id: "blau", name: t("Blau-Weiß"), quelle: "erspielt", bedingungText: t("Klicke 50.000-mal auf den Samenladen"),
        bedingung: () => meta.lebenszeit.klicks >= 50000, markise: ["#3f7fd9", "#f2f7ff"], holz: ["#b87a3e", "#9e6530"] },
    { id: "markt", name: t("Bauernmarkt"), quelle: "dlc", paket: "unterstuetzer", markise: ["#4a9a3a", "#f2fff0"], holz: ["#b87a3e", "#9e6530"],
        bauweise: "kisten", funken: ["#a3dc6f", "#ffffff"] },
    { id: "beerenbusch", name: t("Beerenbusch"), quelle: "dlc", paket: "unterstuetzer", markise: ["#4f9a34", "#e8434a"], holz: ["#4f9a34", "#2f6b24"],
        bauweise: "beerenbusch", funken: ["#e8434a", "#3b5bdb", "#a3dc6f"] },
    { id: "meer", name: t("Meeresbrise"), quelle: "dlc", paket: "unterstuetzer", markise: ["#2ab0c0", "#f0ffff"], holz: ["#d8c8a0", "#b8a880"],
        bauweise: "strandbude", funken: ["#9fe8ff", "#ffffff"] },
    { id: "gold", name: t("Goldstand"), quelle: "dlc", paket: "unterstuetzer", markise: ["#e0a800", "#fff3b0"], holz: ["#8a5a1a", "#6b4210"],
        bauweise: "truhe", funken: ["#ffd93d", "#fff3b0", "#ffffff"] },
    { id: "kirschbluete", name: t("Kirschblüte"), quelle: "dlc", paket: "unterstuetzer", markise: ["#ff8fb8", "#fff0f6"], holz: ["#c98a8a", "#a86a6a"],
        bauweise: "kirschbaum", funken: ["#ffc2da", "#ff8fb8", "#ffffff"] },
    { id: "wiese", name: t("Wiesenstand"), quelle: "erspielt", bedingungText: t("Ernte insgesamt 100.000 Pflanzen"),
        bedingung: () => meta.lebenszeit.ernten >= 100000, markise: ["#7cbf4d", "#fff6a0"], holz: ["#9a7a4a", "#7a5a30"],
        funken: ["#a3dc6f", "#fff6a0", "#ffffff"] },
    { id: "honig", name: t("Honigstand"), quelle: "dlc", paket: "unterstuetzer", markise: ["#f5c542", "#fff5d6"], holz: ["#c98a3a", "#a86a2a"],
        bauweise: "bienenkorb", funken: ["#ffd93d", "#f5a623", "#fff5d6"] },
    { id: "eisdiele", name: t("Eisdiele"), quelle: "dlc", paket: "unterstuetzer", markise: ["#9fe0ff", "#ffd6ea"], holz: ["#f3e6d0", "#d8c8b0"],
        bauweise: "eiswagen", funken: ["#ffb3d9", "#9fe0ff", "#fff6a0"] },
    { id: "mitternacht", name: t("Mitternacht"), quelle: "dlc", paket: "unterstuetzer", markise: ["#3a2a7a", "#c9b0f5"], holz: ["#4a3a5a", "#3a2a4a"],
        bauweise: "nachtzelt", funken: ["#c9b0f5", "#8fa2f0", "#ffffff"] },
    { id: "lebkuchen", name: t("Lebkuchenhaus"), quelle: "dlc", paket: "unterstuetzer", markise: ["#fff6f0", "#8a4a22"], holz: ["#a8602a", "#8a4a1a"],
        bauweise: "lebkuchenhaus", funken: ["#ffffff", "#ff8fa3", "#a3dc6f"], wurf: "wurf-bonbon" },
    { id: "mondteich", name: t("Kleiner Mondteich"), titel: t("Mondteich"), quelle: "dlc", paket: "einzeln", markise: ["#2a4a9a", "#9fe0ff"],
        holz: ["#4a5058", "#2a2e34"], bauweise: "mondteich", funken: ["#9fe0ff", "#ffffff", "#8fa2f0"],
        wurf: "wurf-blase-blau", spur: ["#9fe0ff", "#ffffff"], ankunft: ["#9fe0ff", "#ffffff", "#5aa9e6"] },
    { id: "feuerwerk", name: t("Raketen-Startrampe"), titel: t("Startrampe"), quelle: "dlc", paket: "einzeln", markise: ["#1d2560", "#e8434a"],
        holz: ["#2a2250", "#1d1840"], klasse: "laden-feuerwerk", bauweise: "feuerwerk", bild: "🚀", funken: ["#ffd93d", "#e8434a", "#5aa9e6", "#a3dc6f", "#ffffff"],
        wurf: "wurf-rakete", drehen: true, spurDicht: true, spur: ["#ffd93d", "#ff8a2a", "#ffffff"], ankunft: ["#ffd93d", "#e8434a", "#5aa9e6", "#ff8fb1", "#ffffff"] },
    { id: "zirkus", name: t("Zirkusmanege"), titel: t("Manege"), quelle: "dlc", paket: "einzeln", markise: ["#e8434a", "#fff6e8"],
        holz: ["#e8434a", "#c02a32"], klasse: "laden-zirkus", bauweise: "zirkus", bild: "🦭", funken: ["#e8434a", "#ffd93d", "#5aa9e6", "#a3dc6f", "#ffffff"],
        wurf: "wurf-bunt", ankunft: ["#e8434a", "#ffd93d", "#5aa9e6", "#a3dc6f", "#ff8fb1"] },
    { id: "sternenstand", name: t("Sternwarte"), titel: t("Sternwarte"), quelle: "dlc", paket: "einzeln", markise: ["#2a2f6e", "#ffe89a"],
        holz: ["#3a3f7a", "#2a2f62"], klasse: "laden-sterne", bauweise: "sternwarte", bild: "🪐", funken: ["#fff6a0", "#ffe89a", "#ffffff", "#8fa2f0"],
        wurf: "wurf-stern", drehen: true, spurDicht: true, spur: ["#fff6a0", "#ffffff"], ankunft: ["#fff6a0", "#ffffff", "#8fa2f0", "#c9b0f5"] },
    { id: "hexenhuette", name: t("Hexenhütte"), titel: t("Hexenhütte"), quelle: "dlc", paket: "einzeln", markise: ["#3a2250", "#8dff7a"],
        holz: ["#4a2a4a", "#3a1d3a"], klasse: "laden-hexe", bauweise: "hexe", bild: "🧪", funken: ["#8dff7a", "#c9b0f5", "#ffffff"],
        wurf: "wurf-blase", spur: ["#8dff7a", "#c9ffb0"], ankunft: ["#8dff7a", "#b48cff", "#c9ffb0", "#ffffff"] },
    { id: "leuchtturm", name: t("Leuchtturm"), titel: t("Leuchtturm"), quelle: "dlc", paket: "einzeln", markise: ["#e8434a", "#fff6e8"],
        holz: ["#6a7078", "#4a5058"], klasse: "laden-leuchtturm", bauweise: "leuchtturm", bild: "⚓", funken: ["#fff3b0", "#ffffff", "#9fe8ff"],
        wurf: "wurf-licht", spur: ["#fff3b0", "#ffffff"], ankunft: ["#fff3b0", "#ffffff", "#9fe8ff", "#5aa9e6"] },
    { id: "gemuesewagen", name: t("Gemüsewagen"), quelle: "dlc", paket: "unterstuetzer", markise: ["#e8843a", "#fff1d6"], holz: ["#b87a3e", "#9e6530"],
        bauweise: "gemuesewagen", funken: ["#f08a24", "#6cc24a", "#e8434a"] },
    { id: "teehaus", name: t("Teehaus"), quelle: "dlc", paket: "unterstuetzer", markise: ["#3a4a6a", "#f4ecd8"], holz: ["#c8a878", "#a88858"],
        bauweise: "teehaus", funken: ["#ff8fb8", "#ffffff", "#a3dc6f"] },
    { id: "riesenrad", name: t("Riesenrad"), titel: t("Riesenrad"), quelle: "dlc", paket: "einzeln", markise: ["#e8434a", "#fff6e8"],
        holz: ["#5a5a6a", "#3a3a4a"], bauweise: "riesenrad", bild: "🎡", funken: ["#e8434a", "#ffd84a", "#5aa9e6", "#7ed957", "#ff8fb8"],
        wurf: "wurf-bunt", ankunft: ["#e8434a", "#ffd84a", "#5aa9e6", "#7ed957", "#ff8fb8"] },
    { id: "ufo", name: t("Ufo-Landeplatz"), titel: t("Ufo"), quelle: "dlc", paket: "einzeln", markise: ["#5a6a7a", "#9fe0ff"],
        holz: ["#6a7078", "#4a5058"], bauweise: "ufo", bild: "🛸", funken: ["#8dff7a", "#9fe0ff", "#ffffff"],
        wurf: "wurf-licht", spur: ["#8dff7a", "#ffffff"], ankunft: ["#8dff7a", "#9fe0ff", "#ffffff", "#5affc8"] }
];

// Bauernhaus oben links (Kosmetik "Haus"): farben = neue Farben fuer die Buchstaben im Bauernhaus-Sprite
// (T Dachkante, U Dach, L/l Dachmuster, W Wand, V Sockel, D Tuer, F Fensterglas), extra = kleine Pixel-Details,
// fenster = Fenster leuchten immer (Farbe), funken = Funken ums Haus, rauch = Farbe vom Schornstein-Rauch
const HAUS_SKINS = [
    { id: "standard", name: t("Bauernhaus"), quelle: "frei", farben: {} },
    { id: "blaudach", name: t("Blaues Dach"), quelle: "erspielt", bedingungText: t("Bezahle insgesamt 15 Rechnungen"), bedingung: () => meta.lebenszeit.rechnungen >= 15, farben: { T: "#2a4a7a", U: "#3f6aa8", L: "#35609a", l: "#2a4a7a" } },
    { id: "steinhaus", name: t("Steinhaus"), quelle: "dlc", paket: "unterstuetzer", farben: { W: "#a8aeb6", V: "#7a8088", T: "#3a3f4a", U: "#555c6a", L: "#4a505c", l: "#3a3f4a" }, extra: "efeu" },
    { id: "blockhaus", name: t("Blockhütte"), quelle: "dlc", paket: "unterstuetzer", farben: { W: "#9a6634", V: "#6b4220", T: "#2a4a20", U: "#4a7a3a", L: "#3f6a30", l: "#2a4a20" }, extra: "balken" },
    { id: "kirschbluete", name: t("Kirschblütenhaus"), quelle: "dlc", paket: "unterstuetzer", farben: { W: "#fff0f4", V: "#e0c0cc", T: "#c84a7a", U: "#ff9ac0", L: "#ff7aa8", l: "#c84a7a" }, extra: "blueten" },
    { id: "lebkuchen", name: t("Lebkuchenhaus"), quelle: "dlc", paket: "unterstuetzer", farben: { W: "#b8703a", V: "#8a4a1a", T: "#e0d0c8", U: "#fff6f0", L: "#ff8fa3", l: "#e0d0c8", D: "#6b2a10" }, extra: "zuckerguss" },
    { id: "strandhaus", name: t("Strandhaus"), quelle: "dlc", paket: "unterstuetzer", farben: { W: "#f0f8ff", V: "#c8d8e8", T: "#146a7a", U: "#2ab0c0", L: "#1a8a9a", l: "#146a7a", D: "#2ab0c0" }, extra: "rettungsring" },
    { id: "bonbonhaus", name: t("Bonbonhaus"), quelle: "dlc", paket: "unterstuetzer", farben: { W: "#ffd6ea", V: "#f0aad0", T: "#3a8ac8", U: "#9ae0ff", L: "#6ac0f0", l: "#3a8ac8", D: "#ff6a9a" }, extra: "streusel" },
    { id: "mitternacht", name: t("Mitternachtshaus"), quelle: "dlc", paket: "unterstuetzer", farben: { W: "#3a2a5a", V: "#2a1d44", T: "#2a1a5a", U: "#5a3aa0", L: "#4a2f8a", l: "#2a1a5a", F: "#ffe89a" }, extra: "sterne" },
    { id: "winterhaus", name: t("Winterhütte"), quelle: "dlc", paket: "unterstuetzer", farben: { W: "#e8d0a8", V: "#b8a080", F: "#ffe0a0" }, extra: "schnee" },
    { id: "hexenhaus", name: t("Hexenhaus"), quelle: "dlc", paket: "einzeln", farben: { W: "#4a3a4a", V: "#3a2a3a", T: "#1d1030", U: "#3a2250", L: "#2a1a40", l: "#1d1030", F: "#8dff7a", D: "#2a1a1a" }, extra: "moos", fenster: "rgba(141, 255, 122, 0.9)", funken: ["#8dff7a", "#c9b0f5", "#c9ffb0"], rauch: "#8dff7a" },
    { id: "mondhaus", name: t("Mondhaus"), quelle: "dlc", paket: "einzeln", farben: { W: "#d8e4ff", V: "#a8b8e0", T: "#1d2a6a", U: "#2a4a9a", L: "#3a5ab0", l: "#1d2a6a", F: "#9fe0ff" }, extra: "mond", fenster: "rgba(159, 224, 255, 0.95)", funken: ["#9fe0ff", "#ffffff", "#8fa2f0"], rauch: "#c9d6ff" },
    { id: "sternwarte", name: t("Sternenhaus"), quelle: "dlc", paket: "einzeln", farben: { W: "#2a2f6e", V: "#1d2250", T: "#141840", U: "#3a3f7a", L: "#fff6a0", l: "#141840", F: "#fff6a0", D: "#1d2250" }, extra: "sterne", fenster: "rgba(255, 246, 160, 0.95)", funken: ["#fff6a0", "#ffe89a", "#ffffff"] },
    { id: "goldhaus", name: t("Goldenes Haus"), quelle: "dlc", paket: "einzeln", farben: { W: "#ffd84a", V: "#c89a10", T: "#8a5a08", U: "#e0a800", L: "#ffcf4a", l: "#8a5a08", D: "#8a5a08", F: "#fff6c0" }, extra: "glanz", fenster: "rgba(255, 240, 160, 0.95)", funken: ["#ffd93d", "#fff3b0", "#ffffff"] }
];

// Felder: Farben der Erde (B hell, b Furche, c Kruemel). klasse = zusaetzlicher Look (style.css)
const FELD_SKINS = [
    { id: "standard", name: t("Ackerboden"), quelle: "frei", farben: {} },
    { id: "hochbeet", name: t("Hochbeet"), quelle: "erspielt", bedingungText: t("Ernte insgesamt 25.000 Pflanzen"),
        bedingung: () => meta.lebenszeit.ernten >= 25000, farben: { B: "#6b4a2a", b: "#4a3018", c: "#7a8a3a" }, rahmen: "#8a5a2c" },
    { id: "zen", name: t("Zen-Sand"), quelle: "dlc", paket: "unterstuetzer", farben: { B: "#e6d6a8", b: "#c9b47a", c: "#f3e8c4" } },
    { id: "sandbeet", name: t("Sandbeet"), quelle: "dlc", paket: "unterstuetzer", farben: { B: "#d8b878", b: "#b8985a", c: "#e8d098" } },
    { id: "moos", name: t("Moosbeet"), quelle: "dlc", paket: "unterstuetzer", farben: { B: "#4a6a3a", b: "#34502a", c: "#6a8a4a" } },
    { id: "blumenwiese", name: t("Blumenbeet"), quelle: "dlc", paket: "unterstuetzer", farben: { B: "#6a4a2a", b: "#4e3218", c: "#8a6a3a" },
        klasse: "felder-blumen" },
    { id: "kristall", name: t("Kristallboden"), quelle: "dlc", paket: "einzeln", farben: { B: "#3a4a8a", b: "#2a3570", c: "#6a7ad0" },
        klasse: "felder-kristall", teilchen: ["#bff0ff", "#ffffff", "#8fa2f0"] },
    { id: "lava", name: t("Lavaboden"), quelle: "dlc", paket: "einzeln", farben: { B: "#3a2a2a", b: "#2a1a1a", c: "#ff6a2a" },
        klasse: "felder-lava", teilchen: ["#ff6a2a", "#ffd060", "#ff4a1a"] },
    { id: "sternenboden", name: t("Sternenboden"), quelle: "dlc", paket: "einzeln", farben: { B: "#1d2560", b: "#141a42", c: "#fff6a0" },
        klasse: "felder-sterne", teilchen: ["#fff6a0", "#ffffff", "#8fa2f0"] },
    { id: "schnee", name: t("Schneebeet"), quelle: "dlc", paket: "unterstuetzer", farben: { B: "#e8f2fa", b: "#b8cde0", c: "#ffffff" } },
    { id: "pilzbeet", name: t("Pilzbeet"), quelle: "dlc", paket: "unterstuetzer", farben: { B: "#5a3e4a", b: "#3e2834", c: "#7a5a6a" },
        klasse: "felder-pilze" },
    { id: "regenbogen", name: t("Regenbogenbeet"), quelle: "dlc", paket: "einzeln", farben: { B: "#6a4a3a", b: "#4a3024", c: "#8a6a5a" },
        klasse: "felder-regenbogen", teilchen: ["#ff6a6a", "#ffd93d", "#a3dc6f", "#5aa9e6", "#b48cff"] }
];

// Muenzen: Farben der Goldmuenze. klasse = zusaetzlicher Look (style.css)
const KUGEL_SKINS = [
    { id: "standard", name: t("Goldmünzen"), quelle: "frei", farben: {} },
    { id: "bronze", name: t("Bronzemünzen"), quelle: "erspielt", bedingungText: t("Sammle 50 legendäre Saaten"),
        bedingung: () => meta.lebenszeit.jackpots >= 50, farben: { Y: "#e0a070", y: "#a86a3a", k: "#4a2a10" } },
    { id: "silber", name: t("Silbermünzen"), quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#e9e9ef", y: "#a9a9b6", k: "#4a4a5a" } },
    { id: "bluete", name: t("Blütenmünzen"), quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#ffc2dc", y: "#e07aa8", k: "#7a2a48" } },
    { id: "smaragd", name: t("Smaragdmünzen"), quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#7ae0a0", y: "#2e9e5a", k: "#14502a" } },
    { id: "rubin", name: t("Rubinmünzen"), quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#ff8a8a", y: "#c83a3a", k: "#5a1010" } },
    { id: "mond", name: t("Mondmünzen"), quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#dfe6ff", y: "#8fa2f0", k: "#2a3570" },
        klasse: "muenzen-mond" },
    { id: "regenbogen", name: t("Regenbogenmünzen"), quelle: "dlc", paket: "einzeln", farben: { Y: "#ff9a9a", y: "#e0507a", k: "#5a1a3a" },
        klasse: "muenzen-regenbogen", funken: ["#ff6a6a", "#ffd93d", "#a3dc6f", "#5aa9e6", "#b48cff"] },
    { id: "feuer", name: t("Feuermünzen"), quelle: "dlc", paket: "einzeln", farben: { Y: "#ffd060", y: "#ff6a2a", k: "#5a1a08" },
        klasse: "muenzen-feuer", funken: ["#ffd060", "#ff8a2a", "#ff4a1a"] },
    // Saat in anderen Formen (keine runde Muenze). Die Seltenheit zeigt der farbige Kern (Z), beim Kristall der ganze Stein.
    { id: "blatt", name: t("Blattsaat"), quelle: "dlc", paket: "unterstuetzer", form: "blatt", farben: { Y: "#8fdc5c", y: "#4f9e2c", k: "#1f4a12", w: "#e8ffd0" } },
    { id: "eichel", name: t("Eichelsaat"), quelle: "dlc", paket: "unterstuetzer", form: "eichel", farben: { Y: "#d8a060", y: "#9a6430", k: "#3a2410", w: "#ffe8c8" } },
    { id: "herz", name: t("Herzsaat"), quelle: "dlc", paket: "unterstuetzer", form: "herz",
        farben: { Y: "#ff9ab8", y: "#d0507a", k: "#5a1a30", w: "#ffe6ee" } },
    { id: "kristall", name: t("Kristallsaat"), quelle: "dlc", paket: "einzeln", form: "kristall", klasse: "muenzen-kristall",
        farben: { k: "#1d2a4a", w: "#ffffff", Y: "#e8eef8", y: "#a8b4c8" },
        raritaetFarben: [{ Y: "#e8eef8", y: "#a8b4c8" }, { Y: "#9af09a", y: "#2e9e2e" }, { Y: "#9ad6ff", y: "#2f7fcf" },
            { Y: "#d6a8ff", y: "#7c2fc2" }, { Y: "#fff0a0", y: "#e0a800" }],
        funken: ["#ffffff", "#9ad6ff", "#d6a8ff"] },
    { id: "klee", name: t("Kleesaat"), quelle: "dlc", paket: "unterstuetzer", form: "klee",
        farben: { Y: "#7ad05a", y: "#3f8a32", k: "#1a4a12", w: "#d8ffc0" } },
    { id: "pilz", name: t("Pilzsaat"), quelle: "dlc", paket: "unterstuetzer", form: "pilz",
        farben: { Y: "#e8434a", y: "#a8232a", k: "#4a1010", w: "#ffffff" } },
    { id: "muschel", name: t("Muschelsaat"), quelle: "dlc", paket: "unterstuetzer", form: "muschel",
        farben: { Y: "#ffd6c0", y: "#e0907a", k: "#6a3020", w: "#fff4ee" } },
    { id: "laterne", name: t("Laternensaat"), quelle: "dlc", paket: "einzeln", form: "laterne", klasse: "muenzen-laterne",
        farben: { Y: "#ff5a4a", y: "#b8232a", k: "#4a0a0a", w: "#ffb0a0", E: "#ffd84a" }, funken: ["#ffd84a", "#ff5a4a", "#ff9a3a"] },
    { id: "schneeflocke", name: t("Schneeflockensaat"), quelle: "dlc", paket: "unterstuetzer", form: "schneeflocke",
        farben: { Y: "#e8f6ff", y: "#8fc0e0", k: "#2a4a6a", w: "#ffffff" } },
    { id: "bonbon", name: t("Bonbonsaat"), quelle: "dlc", paket: "unterstuetzer", form: "bonbon",
        farben: { Y: "#ff9ad5", y: "#d0508a", k: "#5a1a3a", w: "#ffe6f4" } },
    { id: "mondsichel", name: t("Mondsichelsaat"), quelle: "dlc", paket: "einzeln", form: "mondsichel", klasse: "muenzen-mondsichel",
        farben: { Y: "#fff6c0", y: "#d8c070", k: "#2a2a5a", w: "#ffffff" }, funken: ["#fff6c0", "#ffffff", "#8fa2f0"] },
    { id: "blitz", name: t("Blitzsaat"), quelle: "dlc", paket: "einzeln", form: "blitz", klasse: "muenzen-blitz",
        farben: { Y: "#fff05a", y: "#e0a800", k: "#3a2a00", w: "#ffffff" }, funken: ["#fff05a", "#ffffff", "#9fe8ff"] },
    { id: "planet", name: t("Planetensaat"), quelle: "dlc", paket: "einzeln", form: "planet", klasse: "muenzen-planet",
        farben: { Y: "#9a8aff", y: "#5a4ad0", k: "#1a1450", w: "#e0dcff", E: "#ffd6a0", e: "#c08a5a" },
        funken: ["#ffffff", "#9ad6ff", "#ffd6a0"] },
    { id: "komet", name: t("Kometensaat"), quelle: "dlc", paket: "einzeln", form: "komet", klasse: "muenzen-komet",
        farben: { Y: "#bfe8ff", y: "#5aa9e6", k: "#14305a", w: "#ffffff", E: "#9fe0ff", e: "#5a8ae8" }, funken: ["#ffffff", "#9fe0ff", "#5a8ae8"] },
    { id: "diamant", name: t("Diamantsaat"), quelle: "dlc", paket: "einzeln", form: "diamant", klasse: "muenzen-diamant",
        farben: { Y: "#eaf8ff", y: "#9ad0e8", k: "#1d3a4a", w: "#ffffff" }, funken: ["#ffffff", "#bff0ff", "#ffd6f0"] },
    { id: "drachenei", name: t("Dracheneisaat"), quelle: "dlc", paket: "einzeln", form: "drachenei", klasse: "muenzen-drachenei",
        farben: { Y: "#7ad05a", y: "#3f8a32", k: "#14360e", w: "#d8ffc0", E: "#ffcf4a" }, funken: ["#ffcf4a", "#ff8a2a", "#ff4a1a"] },
    { id: "erdbeere", name: t("Erdbeersaat"), quelle: "dlc", paket: "unterstuetzer", form: "erdbeere",
        farben: { Y: "#ff5a6a", y: "#c02a3a", k: "#4a0a14", w: "#ffe0a0", E: "#5fb03c", e: "#2e7a2a" } },
    { id: "wuerfel", name: t("Würfelsaat"), quelle: "dlc", paket: "unterstuetzer", form: "wuerfel",
        farben: { Y: "#fff8ee", y: "#d8ccb8", k: "#3a3024", w: "#ffffff" } },
    { id: "tropfen", name: t("Tautropfensaat"), quelle: "dlc", paket: "unterstuetzer", form: "tropfen",
        farben: { Y: "#9ad6ff", y: "#4a9ad0", k: "#143a5a", w: "#ffffff" } }
];

// Rahmen der Kuscheltier-Karten im Mondteich
const RAHMEN_SKINS = [
    { id: "standard", name: t("Schlicht"), quelle: "frei", css: "" },
    { id: "holz", name: t("Holzrahmen"), quelle: "erspielt", bedingungText: t("Sammle 15 verschiedene Kuscheltiere"),
        bedingung: () => Object.keys(meta.kuscheltiere).length >= 15, css: "rahmen-holz" },
    { id: "gold", name: t("Goldrahmen"), quelle: "dlc", paket: "unterstuetzer", css: "rahmen-gold" },
    { id: "blumen", name: t("Blumenrahmen"), quelle: "dlc", paket: "unterstuetzer", css: "rahmen-blumen" },
    { id: "eis", name: t("Eisrahmen"), quelle: "dlc", paket: "unterstuetzer", css: "rahmen-eis" },
    { id: "sterne", name: t("Sternenrahmen"), quelle: "dlc", paket: "einzeln", css: "rahmen-sterne" },
    { id: "regenbogen", name: t("Regenbogenrahmen"), quelle: "dlc", paket: "einzeln", css: "rahmen-regenbogen" },
    { id: "feuer", name: t("Flammenrahmen"), quelle: "dlc", paket: "einzeln", css: "rahmen-feuer" },
    { id: "blaetter", name: t("Blätterrahmen"), quelle: "dlc", paket: "unterstuetzer", css: "rahmen-blaetter" },
    { id: "herz", name: t("Herzrahmen"), quelle: "dlc", paket: "unterstuetzer", css: "rahmen-herz" },
    { id: "kosmos", name: t("Kosmosrahmen"), quelle: "dlc", paket: "einzeln", css: "rahmen-kosmos" },
    { id: "wolken", name: t("Wolkenrahmen"), quelle: "dlc", paket: "unterstuetzer", css: "rahmen-wolken" },
    { id: "honig", name: t("Honigrahmen"), quelle: "dlc", paket: "unterstuetzer", css: "rahmen-honig" },
    { id: "glitzer", name: t("Glitzerrahmen"), quelle: "dlc", paket: "einzeln", css: "rahmen-glitzer" },
    { id: "aurora", name: t("Polarlicht-Rahmen"), quelle: "dlc", paket: "einzeln", css: "rahmen-aurora" }
];

// Pflanzen-Looks: tauschen die Blattfarben (G hell, g mittel, d dunkel) aller Pflanzen-Sprites aus.
// klasse = zusaetzlicher Look fuer alle Pflanzen auf den Feldern (style.css)
const PFLANZEN_SKINS = [
    { id: "standard", name: t("Sommergrün"), quelle: "frei", farben: {} },
    { id: "herbst", name: t("Herbstlaub"), quelle: "dlc", paket: "unterstuetzer", farben: { G: "#e0a040", g: "#b8662a", d: "#7a3a1a" } },
    { id: "winter", name: t("Raureif"), quelle: "dlc", paket: "unterstuetzer", farben: { G: "#dff0f8", g: "#a8c8dc", d: "#6a8aa6" } },
    { id: "bonbon", name: t("Bonbonblätter"), quelle: "dlc", paket: "unterstuetzer", farben: { G: "#ffb3d9", g: "#8fe0c0", d: "#5aa98a" } },
    { id: "mitternacht", name: t("Mitternachtsblätter"), quelle: "dlc", paket: "unterstuetzer", farben: { G: "#8a7ae0", g: "#5a4ab0", d: "#2a1d68" } },
    { id: "sternenpflanzen", name: t("Sternenpflanzen"), quelle: "dlc", paket: "einzeln", farben: { G: "#9fb0ff", g: "#5a6ad8", d: "#2a3590" },
        klasse: "pflanzen-sterne", teilchen: ["#fff6a0", "#9fb0ff", "#ffffff"], effekt: "sterne" },
    { id: "kristall", name: t("Kristallpflanzen"), quelle: "dlc", paket: "einzeln", farben: { G: "#bff0ff", g: "#7ac8e8", d: "#3a88b8" },
        klasse: "pflanzen-kristall", teilchen: ["#bff0ff", "#ffffff", "#9fe8ff"], effekt: "kristall" },
    { id: "kirschbluete", name: t("Kirschblütenblätter"), quelle: "dlc", paket: "unterstuetzer", farben: { G: "#ffc2dc", g: "#8fcf5c", d: "#4f8a32" } },
    { id: "goldblatt", name: t("Goldblätter"), quelle: "dlc", paket: "unterstuetzer", farben: { G: "#ffe08a", g: "#d9a82a", d: "#8a6010" } },
    { id: "glut", name: t("Glutblätter"), quelle: "dlc", paket: "einzeln", farben: { G: "#ffb060", g: "#e8432a", d: "#5a1a08" },
        klasse: "pflanzen-glut", teilchen: ["#ffb060", "#ff6a2a", "#ffd060"], effekt: "glut" }
];

// Der Mondteich im Hof (x in Prozent). Klick darauf oeffnet den Mondteich-Shop.
const TEICH_X = 24;
// Das Bauernhaus im Hof (x in Prozent, Breite in Prozent). Klick darauf oeffnet das Haus-Inventar.
const HAUS_BEREICH = { x: 5, breite: 8 };

// ---------- MONDTEICH: DAUERHAFTE UPGRADES (kosten Mondblueten) ----------
// max: Infinity = unendlich oft kaufbar. Mondblueten gibt es nur noch am Ende eines Runs,
// darum sind die ersten Stufen guenstig und die starken Upgrades deutlich teurer.

// Mondteich-Werte, die mit jeder Stufe schneller wachsen (Gesamtwert pro Stufe): anfangs klein, spaeter richtig stark
const META_STUFEN = {
    ertrag: [0, 0.05, 0.10, 0.20, 0.35, 0.50, 0.70, 0.95, 1.25, 1.60, 2.00],
    ausdauer: [0, 0.03, 0.07, 0.12, 0.20, 0.30],
    verhandlung: [0, 0.01, 0.03, 0.06, 0.10, 0.15],
    startgold: [0, 0.005, 0.01, 0.02, 0.035, 0.05, 0.07, 0.10, 0.13, 0.16, 0.20],
    startsp: [0, 0.01, 0.02, 0.04, 0.07, 0.10, 0.14, 0.19, 0.25, 0.32, 0.40],
    reicheernte: [0, 0.01, 0.02, 0.04, 0.06, 0.09, 0.12, 0.16, 0.20, 0.25, 0.30]
};
function metaWert(id, lvl = metaLevel(id)) {
    const liste = META_STUFEN[id];
    return liste[Math.min(lvl, liste.length - 1)];
}

const META_UPGRADES = [
    { id: "startgold", name: t("Startkapital"), basiskosten: 1, faktor: 1.5, max: 10,
        beschreibung: t("+25 Gold zu Beginn jedes Runs. Dazu nach jeder bezahlten Rechnung ein Teil der nächsten Rechnung als Geschenk (jede Stufe mehr als die davor)."),
        info: lvl => "+" + 25 * lvl + t(" Gold, +") + prozentText(metaWert("startgold", lvl)) + t(" der nächsten Rechnung") },
    { id: "startsp", name: t("Bauernweisheit"), basiskosten: 2, faktor: 1.5, max: 10,
        beschreibung: t("+100 Sternensamen zu Beginn jedes Runs und mehr Sternensamen aus allen Ernten (jede Stufe mehr als die davor)."),
        info: lvl => "+" + 100 * lvl + t(" Sternensamen, +") + prozentText(metaWert("startsp", lvl)) + t(" Sternensamen") },
    { id: "startfelder", name: t("Vorbereiteter Boden"), basiskosten: 3, faktor: 2, max: 4,
        beschreibung: t("+1 Feld zu Beginn jedes Runs. Das nächste Feld kostet trotzdem nur 1 Gold."), info: lvl => "+" + lvl + t(" Felder") },
    { id: "ausdauer", name: t("Ausdauer"), basiskosten: 6, faktor: 2.4, max: 5,
        beschreibung: t("Mehr Energie pro Tag. Jede Stufe bringt mehr als die davor."), info: lvl => "+" + prozentText(metaWert("ausdauer", lvl)) + t(" Energie") },
    { id: "verhandlung", name: t("Verhandlungsgeschick"), basiskosten: 5, faktor: 2.1, max: 5,
        beschreibung: t("Rechnungen werden billiger. Jede Stufe bringt mehr als die davor."), info: lvl => "-" + prozentText(metaWert("verhandlung", lvl)) + t(" Rechnungen") },
    { id: "ertrag", name: t("Fruchtbarer Hof"), basiskosten: 6, faktor: 1.45, max: 10,
        beschreibung: t("Mehr Gold aus allen Ernten. Jede Stufe bringt mehr als die davor."), info: lvl => "+" + prozentText(metaWert("ertrag", lvl)) + t(" Gold") },
    { id: "saatvorrat", name: t("Saatgut-Vorrat"), basiskosten: 20, faktor: 2.5, max: 3,
        beschreibung: t("Jeder Run startet mit einer weiteren freigeschalteten Pflanze."),
        info: lvl => lvl + t(" Pflanzen zusätzlich freigeschaltet") },
    { id: "fruehervogel", name: t("Früher Vogel"), basiskosten: 15, faktor: 1, max: 1,
        beschreibung: t("Tag 1 hat 100 Energie mehr."), info: lvl => (lvl ? t("Aktiv") : t("Nicht aktiv")) },
    { id: "haendlerglueck", name: t("Händlerglück"), basiskosten: 10, faktor: 2.2, max: 3,
        beschreibung: t("Der Wanderhändler kommt 10% öfter."), info: lvl => "+" + 10 * lvl + t("% Chance") },
    { id: "wettergott", name: t("Wettergott"), basiskosten: 10, faktor: 2.2, max: 3,
        beschreibung: t("Gutes Wetter ist wahrscheinlicher."), info: lvl => "+" + 25 * lvl + t("% Gewicht für gutes Wetter") },
    { id: "gluecksbringer", name: t("Glücksbringer"), basiskosten: 8, faktor: 1.9, max: 5,
        beschreibung: t("+2% Glück bei allen Glücksspielen."), info: lvl => "+" + 2 * lvl + t("% Glück") },
    { id: "kraehenschreck", name: t("Krähenschreck"), basiskosten: 6, faktor: 2, max: 3,
        beschreibung: t("Krähen brauchen 1 Sekunde länger, bis sie eine Pflanze stehlen."),
        info: lvl => sekText(KRAEHEN_KONFIG.stehlZeitSek + lvl) + t(" Zeit zum Verscheuchen") },
    { id: "vogelscheuchenlehre", name: t("Vogelscheuchen-Lehre"), basiskosten: 25, faktor: 1, max: 1,
        beschreibung: t("Die Vogelscheuche ist in jedem Run sofort aktiv (ihr Stern im Stellarium ist schon gekauft)."),
        info: lvl => (lvl ? t("Aktiv") : t("Nicht aktiv")) },
    { id: "kuschelrabatt", name: t("Kuschel-Rabatt"), basiskosten: 120, faktor: 1, max: 1,
        beschreibung: t("Kuschel-Züge werden nur noch nach jedem 2. Zug um 1 teurer."),
        info: lvl => (lvl ? t("+1 alle 2 Züge") : t("+1 pro Zug")) },
    { id: "reicheernte", name: t("Reiche Ernte"), basiskosten: 12, faktor: 1.8, max: 10,
        beschreibung: t("Chance, dass eine Saat oder Sternensaat doppelt zählt. Jede Stufe bringt mehr als die davor."), info: lvl => "+" + prozentText(metaWert("reicheernte", lvl)) + t(" Chance") },
    { id: "meisterhaende", name: t("Meisterhände"), basiskosten: 10, faktor: 2, max: 9,
        beschreibung: t("Jede Ernte zählt für die Pflanzen-Meisterschaft einmal mehr (Stufe 9: jede Ernte zählt 10-mal)."),
        info: lvl => t("Jede Ernte zählt ") + (1 + lvl) + t("-mal") },
    // Tauchen erst mit der Zeit auf (sichtbar), damit es nach jedem Run etwas Neues zu entdecken gibt
    { id: "erbstueck", name: t("Erbstück"), basiskosten: 6, faktor: 1.9, max: 5,
        beschreibung: t("Der Weizen startet jeden Run mit 2 Ertrag-Stufen mehr."), info: lvl => "+" + 2 * lvl + t(" Ertrag-Stufen für Weizen") },
    { id: "sternenkarte", name: t("Sternenkarte"), basiskosten: 20, faktor: 1.7, max: 10,
        sichtbar: () => stellariumFrei(), sichtbarText: t("Erscheint, sobald das Stellarium frei ist."),
        beschreibung: t("Alle Sterne im Stellarium kosten 3% weniger."), info: lvl => "-" + 3 * lvl + t("% Sternpreise") },
    { id: "segenstart", name: t("Segenstart"), basiskosten: 40, faktor: 1, max: 1,
        sichtbar: m => (m.lebenszeit.runs || 0) >= 3, sichtbarText: t("Erscheint nach 3 Runs."),
        beschreibung: t("Jeder Run beginnt mit einer Segen-Auswahl."), info: lvl => (lvl ? t("Aktiv") : t("Nicht aktiv")) },
    { id: "saatbank", name: t("Saatbank"), basiskosten: 30, faktor: 2, max: 5,
        sichtbar: m => (m.lebenszeit.runs || 0) >= 5, sichtbarText: t("Erscheint nach 5 Runs."),
        beschreibung: t("Am Ende eines Runs wandern 5% deiner übrigen Sternensamen in den nächsten Run."), info: lvl => 5 * lvl + t("% der Sternensamen") },
    { id: "mondlicht", name: t("Mondlicht"), basiskosten: 8, faktor: 1.4, max: Infinity,
        beschreibung: t("x1,15 Gold aus allen Ernten. Unendlich oft kaufbar, jede Stufe multipliziert sich."),
        info: lvl => multiText(Math.pow(1.15, lvl)) + t(" Gold") }
];

// ---------- MONDTEICH: TAROTKARTEN ----------
// Die erste Karte kostet KONFIG.tarotPreis Mondblueten, jede weitere x KONFIG.tarotPreisFaktor.
// Dauerhaft verbessern kostet immer KONFIG.tarotVerbessernPreis.
// Verbesserte Karten koennen vor Tag 1 ausgeruestet werden (max. 3): "wert" (und "nachteil") x KONFIG.tarotVerstaerkung.
// text(f) bekommt den Faktor f (1 = normal, 1.5 = verstaerkt) und beschreibt die aktuelle Staerke.
// extra = zusaetzlicher Effekt NUR wenn die Karte verbessert und ausgeruestet ist.

const TAROT = [
    { id: "narr", nummer: "0", symbol: "🃏", name: t("Der Narr"), wert: 75,
        text: f => t("Jeder Run startet mit ") + aufrunden(75 * f) + t(" zusätzlichen Sternensamen.") },
    { id: "magier", nummer: "I", symbol: "🪄", name: t("Der Magier"), wert: 0.25,
        text: f => prozentText(0.25 * f) + t(" Chance, dass eine Sternensaat doppelt zählt.") },
    { id: "hohepriesterin", nummer: "II", symbol: "📜", name: t("Die Hohepriesterin"), wert: 0.10,
        text: f => "+" + prozentText(0.10 * f) + t(" Chance auf ungewöhnliche Saaten.") },
    { id: "herrscherin", nummer: "III", symbol: "👑", name: t("Die Herrscherin"), wert: 2,
        text: f => t("Jeden Tag werden ") + aufrunden(2 * f) + t(" zusätzliche Felder bewässert.") },
    { id: "herrscher", nummer: "IV", symbol: "🏛️", name: t("Der Herrscher"), wert: 0.10,
        text: f => t("Rechnungen kosten ") + prozentText(0.10 * f) + t(" weniger.") },
    { id: "hierophant", nummer: "V", symbol: "🔑", name: t("Der Hierophant"), wert: 50,
        text: f => t("Jede bezahlte Rechnung gibt dir ") + aufrunden(50 * f) + t(" Sternensamen.") },
    { id: "liebenden", nummer: "VI", symbol: "💞", name: t("Die Liebenden"), wert: 0.15,
        text: f => "+" + prozentText(0.15 * f) + t(" Chance, dass ein Samen einen zweiten mitbringt.") },
    { id: "wagen", nummer: "VII", symbol: "🐎", name: t("Der Wagen"), wert: 25,
        text: f => "+" + aufrunden(25 * f) + t(" Energie pro Tag.") },
    { id: "kraft", nummer: "VIII", symbol: "🦁", name: t("Die Kraft"), wert: 1,
        text: f => "-" + aufrunden(f) + (aufrunden(f) === 1 ? t(" Klick pro Samen.") : t(" Klicks pro Samen.")) },
    { id: "eremit", nummer: "IX", symbol: "🏮", name: t("Der Eremit"), wert: 2,
        text: f => t("Der Igel-Sammler startet jeden Run auf Stufe ") + aufrunden(2 * f) + "." },
    { id: "schicksal", nummer: "X", symbol: "🎡", name: t("Rad des Schicksals"), wert: 0.005,
        text: f => "+" + prozentText(0.005 * f) + t(" Chance auf legendäre Saat.") },
    { id: "gerechtigkeit", nummer: "XI", symbol: "⚖️", name: t("Die Gerechtigkeit"), wert: 1,
        text: f => aufrunden(f) + t("-mal pro Run: Kannst du eine Rechnung nicht zahlen, bekommst du einen Tag Aufschub (+25%).") },
    { id: "gehaengte", nummer: "XII", symbol: "🙃", name: t("Der Gehängte"), wert: 1,
        text: () => t("+1 Platz für Werkzeuge vom Wanderhändler."),
        extra: t("Noch ein Werkzeug-Platz mehr (+2 insgesamt).") },
    { id: "tod", nummer: "XIII", symbol: "💀", name: t("Der Tod"), wert: 1,
        text: () => t("Liegengebliebene Saaten werden bei Feierabend eingesammelt, statt zu verfallen."),
        extra: t("Fertige Pflanzen werden bei Feierabend zusätzlich automatisch geerntet und eingesammelt.") },
    { id: "maessigkeit", nummer: "XIV", symbol: "🏺", name: t("Die Mäßigkeit"), wert: 0.5,
        text: f => t("Reißt die Kombo ab, behältst du ") + prozentText(0.5 * f) + t(" davon.") },
    { id: "teufel", nummer: "XV", symbol: "😈", name: t("Der Teufel"), wert: 0.4, nachteil: 0.2,
        text: f => t("Pakt: +") + prozentText(0.4 * f) + t(" Gold aus allen Ernten, aber Rechnungen kosten ") + prozentText(0.2 * f) + t(" mehr.") },
    { id: "turm", nummer: "XVI", symbol: "🗼", name: t("Der Turm"), wert: 1,
        text: f => t("Jeder ") + aufrunden(KONFIG.turmIntervall / f) + t(". Samen schlägt wie ein Blitz ein und ist sofort erntereif.") },
    { id: "stern", nummer: "XVII", symbol: "⭐", name: t("Der Stern"), wert: 1,
        text: f => "+" + prozentText(0.005 * f) + t(" Chance auf goldene Pflanzen.") },
    { id: "mond", nummer: "XVIII", symbol: "🌙", name: t("Der Mond"), wert: 1,
        text: f => "+" + prozentText(0.08 * f) + t(" Chance auf Geisterpflanzen.") },
    { id: "sonne", nummer: "XIX", symbol: "☀️", name: t("Die Sonne"), wert: 0.15,
        text: f => t("Alle Pflanzen wachsen ") + prozentText(0.15 * f) + t(" schneller.") },
    { id: "gericht", nummer: "XX", symbol: "📯", name: t("Das Gericht"), wert: 0.4,
        text: f => "+" + prozentText(0.4 * f) + t(" Mondblüten am Ende jedes Runs.") },
    { id: "welt", nummer: "XXI", symbol: "🌍", name: t("Die Welt"), wert: 0.15,
        text: f => "+" + prozentText(0.15 * f) + t(" Gold aus allen Ernten.") }
];
const TAROT_NACH_ID = Object.fromEntries(TAROT.map(t => [t.id, t]));

// ---------- MONDTEICH: KUSCHEL-AUTOMAT (Gacha, bleibt fuer immer) ----------
// Jeder Zug gibt ein Kuscheltier. Ziehen geht mit einem Kuschel-Gutschein (aus Erfolgen, kostenlos)
// oder mit Mondblueten: der erste Zug kostet "preis", jeder weitere mit Mondblueten x "preisFaktor".
// Duplikate verbessern das Kuscheltier automatisch: Stufe 1 = 1 Stueck, 2 = 2, 3 = 4, 4 = 8, 5 = 16 Stueck.
// "Mythisch" (rosa) gibt es nur hier, es ist der super seltene Hauptgewinn.

const KUSCHEL_KONFIG = {
    preis: 1,                 // erster Zug 1 Mondbluete, jeder bezahlte Zug +1 (mit "Kuschel-Rabatt" nur jeder 2.)
    maxStufe: 5
};

const KUSCHEL_RARITAETEN = [
    { id: "gewoehnlich", name: t("Gewöhnlich"), chance: 0.50, farbe: "#e8e8e8", rand: "#8a8a8a" },
    { id: "ungewoehnlich", name: t("Ungewöhnlich"), chance: 0.27, farbe: "#5fd15f", rand: "#2e9e2e" },
    { id: "selten", name: t("Selten"), chance: 0.14, farbe: "#6cc0f5", rand: "#2f7fcf" },
    { id: "episch", name: t("Episch"), chance: 0.055, farbe: "#b06ee8", rand: "#7c2fc2" },
    { id: "legendaer", name: t("Legendär"), chance: 0.030, farbe: "#ffd93d", rand: "#d49a00" },
    { id: "mythisch", name: t("Mythisch"), chance: 0.005, farbe: "#ff9ad5", rand: "#e0409a" }
];

// raritaet = Index in KUSCHEL_RARITAETEN. text(stufe) beschreibt den Bonus auf der aktuellen Stufe.
// Die Wirkung steht in script.js (kuschel("id") = Stufe, 0 = nicht im Besitz).
const KUSCHELTIERE = [
    // Gewoehnlich
    { id: "hase", symbol: "🐰", name: t("Stoffhase"), raritaet: 0,
        text: s => "+" + 5 * s + t(" Gold zu Beginn jedes Runs.") },
    { id: "teddy", symbol: "🧸", name: t("Teddy"), raritaet: 0,
        text: s => "+" + 10 * s + t(" Energie pro Tag.") },
    { id: "frosch", symbol: "🐸", name: t("Frosch"), raritaet: 0,
        text: s => t("Bewässerte Felder wachsen ") + 10 * s + t("% schneller.") },
    { id: "maus", symbol: "🐭", name: t("Maus"), raritaet: 0,
        text: s => "+" + 3 * s + t("% Chance, dass eine Sternensaat doppelt zählt.") },
    { id: "schaf", symbol: "🐑", name: t("Schaf"), raritaet: 0,
        text: s => t("Sternschnuppen geben ") + s + t(" Sekunden länger doppeltes Gold.") },
    { id: "ente", symbol: "🦆", name: t("Ente"), raritaet: 0,
        text: s => "+" + 2 * s + t(" Energie pro Glühwürmchen.") },
    { id: "schnecke", symbol: "🐌", name: t("Schnecke"), raritaet: 0,
        text: s => "+" + 0.03 * s * 1000 + t(" ms Zeit für die Kombo.") },
    { id: "marienkaefer", symbol: "🐞", name: t("Marienkäfer"), raritaet: 0,
        text: s => "+" + s + t("% Chance auf eine zusätzliche Saat pro Ernte.") },
    { id: "schwein", symbol: "🐷", name: t("Schweinchen"), raritaet: 0,
        text: s => t("Neue Felder kosten ") + 3 * s + t("% weniger.") },
    // Ungewoehnlich
    { id: "otter", symbol: "🦦", name: t("Otter"), raritaet: 1,
        text: s => t("Glühwürmchen geben ") + 10 * s + t("% mehr Sternensamen.") },
    { id: "biber", symbol: "🦫", name: t("Biber"), raritaet: 1,
        text: s => t("Verscheuchte Krähen lassen ") + 5 * s + t(" Sternensamen mehr fallen.") },
    { id: "kuschelkatze", symbol: "🐱", name: t("Kuschelkatze"), raritaet: 1,
        text: s => t("Streichel-Saat ist ") + 25 * s + t("% mehr wert.") },
    { id: "igelchen", symbol: "🦔", name: t("Igelchen"), raritaet: 1,
        text: s => "+" + 4 * s + t("% Radius um deinen Cursor.") },
    { id: "kueken", symbol: "🐥", name: t("Küken"), raritaet: 1,
        text: s => "+" + 2 * s + t("% Chance auf ungewöhnliche Saaten.") },
    { id: "hundplueschi", symbol: "🐶", name: t("Hündchen"), raritaet: 1,
        text: s => t("Dein Begleiter hilft ") + 10 * s + t("% öfter.") },
    { id: "eichhoernchen", symbol: "🐿️", name: t("Eichhörnchen"), raritaet: 1,
        text: s => "+" + s * 0.5 + t(" automatische Klicks pro Sekunde auf den Samenladen.") },
    { id: "kuh", symbol: "🐮", name: t("Kuh"), raritaet: 1,
        text: s => "+" + 0.5 * s + t("% Zinsen bei Feierabend.") },
    // Selten
    { id: "fuechslein", symbol: "🦊", name: t("Füchslein"), raritaet: 2,
        text: s => "+" + 6 * s + t("% Gold aus allen Ernten.") },
    { id: "pinguin", symbol: "🐧", name: t("Pinguin"), raritaet: 2,
        text: s => t("Alle Pflanzen wachsen ") + 4 * s + t("% schneller.") },
    { id: "hummel", symbol: "🐝", name: t("Hummel"), raritaet: 2,
        text: s => "+" + 3 * s + t("% Chance, dass ein Samen einen zweiten mitbringt.") },
    { id: "papagei", symbol: "🦜", name: t("Papagei"), raritaet: 2,
        text: s => t("Der Wanderhändler kommt ") + 5 * s + t("% öfter.") },
    { id: "koala", symbol: "🐨", name: t("Koala"), raritaet: 2,
        text: s => t("Krähen brauchen ") + s + t(" Sekunden länger, bis sie stehlen.") },
    { id: "schildkroete", symbol: "🐢", name: t("Schildkröte"), raritaet: 2,
        text: s => t("Gewöhnliche Saaten sind ") + 10 * s + t("% mehr wert.") },
    { id: "faultier", symbol: "🦥", name: t("Faultier"), raritaet: 2,
        text: s => "+" + 3 * s + t("% Energie pro Tag.") },
    { id: "flamingo", symbol: "🦩", name: t("Flamingo"), raritaet: 2,
        text: s => "+" + 5 * s + t("% Gold aus Ernten am Abend und in der Nacht.") },
    // Episch
    { id: "delfin", symbol: "🐬", name: t("Delfin"), raritaet: 3,
        text: s => "+" + s + (s === 1 ? t(" bewässertes Feld pro Tag.") : t(" bewässerte Felder pro Tag.")) },
    { id: "drache", symbol: "🐉", name: t("Drache"), raritaet: 3,
        text: s => "+" + s + t("% Chance auf epische Saaten.") },
    { id: "eule", symbol: "🦉", name: t("Eule"), raritaet: 3,
        text: s => "+" + 50 * s + t(" Sternensamen zu Beginn jedes Runs.") },
    { id: "panda", symbol: "🐼", name: t("Panda"), raritaet: 3,
        text: s => "+" + 4 * s + t("% Glück bei allen Glücksspielen.") },
    { id: "loewe", symbol: "🦁", name: t("Löwe"), raritaet: 3,
        text: s => t("Jede neue Kombo startet bei ") + 10 * s + t(" statt bei 0.") },
    { id: "oktopus", symbol: "🐙", name: t("Oktopus"), raritaet: 3,
        text: s => t("Alle Spezialpflanzen kommen ") + 10 * s + t("% öfter.") },
    // Legendaer
    { id: "einhorn", symbol: "🦄", name: t("Einhorn"), raritaet: 4,
        text: s => "+" + prozentText(0.003 * s) + t(" Chance auf legendäre Saaten.") },
    { id: "wal", symbol: "🐋", name: t("Wal"), raritaet: 4,
        text: s => t("Rechnungen kosten ") + 3 * s + t("% weniger.") },
    { id: "phoenix", symbol: "🔥", name: t("Phönix"), raritaet: 4,
        text: s => "+" + 5 * s + t("% Gold aus allen Ernten und 4 Segen zur Auswahl.") },
    { id: "greif", symbol: "🦅", name: t("Greif"), raritaet: 4,
        text: s => t("Alles beim Wanderhändler ist ") + 15 * s + t("% billiger.") },
    { id: "pfau", symbol: "🦚", name: t("Pfau"), raritaet: 4,
        text: s => t("Legendäre Saaten sind ") + 20 * s + t("% mehr wert.") },
    // Mythisch
    { id: "mondhase", symbol: "🌙", name: t("Mondhase"), raritaet: 5,
        text: s => multiText(Math.pow(1.25, s)) + t(" Gold aus allen Ernten und +") + 10 * s + t("% Mondblüten am Run-Ende.") },
    { id: "manta", symbol: "🐟", name: t("Mantarochen"), raritaet: 5,
        text: s => multiText(1 + 0.2 * s) + t(" Sternensamen aus Ernten und +") + 5 * s + t("% Glück bei allen Glücksspielen.") }
];
const KUSCHEL_NACH_ID = Object.fromEntries(KUSCHELTIERE.map(k => [k.id, k]));

// ---------- STERNENFALL (zweite Prestige-Ebene) ----------
// Setzt Mondblueten und die dauerhaften Mondteich-Upgrades zurueck.
// Behaelt: Tarotkarten, Kuscheltiere, Gutscheine, Erfolge, Kosmetik, Sandbox.
// Dafuer: Sternensplitter fuer den Sternenfall-Shop UND jeder Sternenfall verdreifacht alle zukuenftigen Mondblueten (x3, x9, x27 ...).

const STERNENFALL_KONFIG = {
    mindestMondblueten: 1500,     // so viele Mondblueten muessen seit dem letzten Sternenfall verdient worden sein
    splitterTeiler: 40,           // Sternensplitter = Wurzel(verdiente Mondblueten / 40)
    mondbluetenFaktor: 3          // jeder Sternenfall: alle zukuenftigen Mondblueten x3
};

function sternenfallFaktor() {
    return Math.pow(STERNENFALL_KONFIG.mondbluetenFaktor, meta.sternenfaelle);
}

const STERNENFALL_UPGRADES = [
    { id: "dauerklick", name: t("Sense"), symbol: "sprite:sense", basiskosten: 1, faktor: 1, max: 1,
        beschreibung: t("Halte die Maus auf dem Samenladen gedrückt: Er klickt von allein, 15-mal pro Sekunde."),
        info: lvl => (lvl > 0 ? t("Aktiv") : t("Nicht aktiv")) },
    { id: "sternenregen", name: t("Sternenregen"), symbol: "🌠", basiskosten: 1, faktor: 1.6, max: Infinity,
        beschreibung: t("+100% Gold aus allen Ernten. Unendlich oft kaufbar."), info: lvl => "+" + 100 * lvl + t("% Gold") },
    { id: "sternensaat", name: t("Sternensaat"), symbol: "✨", basiskosten: 1, faktor: 1.7, max: Infinity,
        beschreibung: t("+25% Sternensamen aus Ernten. Unendlich oft kaufbar."), info: lvl => "+" + 25 * lvl + t("% Sternensamen") },
    { id: "mondmagnet", name: t("Mondmagnet"), symbol: "🌙", basiskosten: 2, faktor: 1.8, max: Infinity,
        beschreibung: t("+30% Mondblüten am Ende jedes Runs. Unendlich oft kaufbar."), info: lvl => "+" + 30 * lvl + t("% Mondblüten") },
    { id: "ewigerfruehling", name: t("Ewiger Frühling"), symbol: "🌸", basiskosten: 2, faktor: 1.9, max: 10,
        beschreibung: t("Alle Pflanzen wachsen 12% schneller."), info: lvl => "+" + 12 * lvl + t("% Wachstum") },
    { id: "glueckstern", name: t("Glücksstern"), symbol: "⭐", basiskosten: 2, faktor: 2, max: 5,
        beschreibung: t("+4% Glück bei allen Glücksspielen."), info: lvl => "+" + 4 * lvl + t("% Glück") },
    { id: "kometenschweif", name: t("Kometenschweif"), symbol: "☄️", basiskosten: 4, faktor: 2.5, max: 3,
        beschreibung: t("Jeder Run startet mit einem zufälligen Werkzeug."), info: lvl => lvl + t(" Werkzeuge zum Start") },
    { id: "himmelsgabe", name: t("Himmelsgabe"), symbol: "🎁", basiskosten: 3, faktor: 3, max: 3,
        beschreibung: t("Jeder Sternenfall schenkt dir 5 Kuschel-Gutscheine."), info: lvl => 5 * lvl + t(" Gutscheine pro Sternenfall") },
    { id: "sternenrucksack", name: t("Sternenrucksack"), symbol: "🎒", basiskosten: 2, faktor: 1.6, max: 10,
        beschreibung: t("Jeder Run startet mit 250 Sternensamen mehr."), info: lvl => "+" + 250 * lvl + t(" Sternensamen") },
    { id: "kosmischefelder", name: t("Kosmische Felder"), symbol: "🟫", basiskosten: 3, faktor: 2.5, max: 3,
        beschreibung: t("Jeder Run startet mit einem Feld mehr (zusätzlich zum Mondteich)."), info: lvl => "+" + lvl + t(" Felder") },
    { id: "sternenwurzel", name: t("Sternenwurzel"), symbol: "🌱", basiskosten: 2, faktor: 1.9, max: 5,
        beschreibung: t("Jeder Tag beginnt mit 2 gepflanzten Samen mehr."), info: lvl => "+" + 2 * lvl + t(" Samen zum Tagesstart") },
    { id: "ewigekombo", name: t("Ewige Kombo"), symbol: "🥁", basiskosten: 2, faktor: 1.8, max: 5,
        beschreibung: t("Die Kombo hält 10% länger."), info: lvl => "+" + 10 * lvl + t("% Kombo-Zeit") },
    { id: "sternenmeister", name: t("Sternenmeister"), symbol: "🏅", basiskosten: 4, faktor: 2.2, max: 5,
        beschreibung: t("Jede Meisterschafts-Stufe einer Pflanze gibt +2% mehr Wert (sonst +8%)."), info: lvl => "+" + (8 + 2 * lvl) + t("% pro Meisterschafts-Stufe") }
];

// ---------- SPIELMODI ----------
// Sandbox: keine Rechnungen, keine Energie, unendliche Entwicklung, keine Erfolge.
// Statt Rechnungen gibt es Meilensteine fuer verdientes Gold (je 1 Segen). Mit dem Sandbox-Prestige faengt man neu an
// und bekommt Mondblueten fuer die Meilensteine, aber nur einen Teil davon (sonst waere die Sandbox besser als ein Run).
// Kaufbar im Mondteich (spaeter mit dem Unterstuetzer-Paket frueher freigeschaltet).

const SANDBOX_KONFIG = {
    preis: 500,
    mondbluetenAnteil: 0.5    // Meilenstein n zaehlt wie bezahlte Rechnung n, davon gibt es die Haelfte
};

// ---------- PROFIL: EIGENE FIGUR (Charakter-Editor im Hauptmenue) ----------
// Die Figur laeuft wie der Begleiter ueber den Hof (etwas groesser, etwas weiter hinten). Sie droppt nichts und hat
// keine Spiel-Effekte, nur Aussehen. Gewoehnlich = frei, episch = Unterstuetzer-Paket, legendaer = einzeln (50 Kristalle).
// fx (nur Aussehen): rgb (Farben laufen durch), geist (durchsichtig, schwebt), glow (leuchtet, fxFarbe),
//     funkeln (kleine Sterne), flamme (flackert und gluet), schweben (wippt sanft auf und ab)
// Farb-Buchstaben: Haut 4/s/r/m, Augen 5, Haare 2/h, Oberteil 6/8/k, Hose 3/9, Schuhe 1/l, Hut a/b/c

const FIGUR_KATEGORIEN = [
    { id: "haut", name: t("Haut"), symbol: "✋" },
    { id: "augen", name: t("Augen"), symbol: "👀" },
    { id: "frisur", name: t("Frisur"), symbol: "💇" },
    { id: "haarfarbe", name: t("Haarfarbe"), symbol: "🎨" },
    { id: "oberteil", name: t("Oberteil"), symbol: "👕" },
    { id: "hose", name: t("Hose"), symbol: "👖" },
    { id: "schuhe", name: t("Schuhe"), symbol: "👟" },
    { id: "kopf", name: t("Kopf"), symbol: "👒" },
    { id: "accessoire", name: t("Accessoire"), symbol: "🎀" },
    { id: "gesicht", name: t("Gesicht"), symbol: "🙂" }
];

// Eigene Farben fuer Kleidung und Augen (gilt nicht fuer legendaere Teile, die haben ihre eigenen Farben)
const FIGUR_FARBBAR = ["oberteil", "hose", "schuhe", "kopf", "accessoire", "augen"];
// Diese Kategorien haben zusaetzlich eine Zweitfarbe (z.B. die Streifen beim Ringelshirt, das Band am Hut)
const FIGUR_ZWEITFARBE = ["oberteil", "hose", "schuhe", "kopf", "accessoire"];
// Entfernte reine Farb-Varianten: wer sie trug, bekommt das Grundteil in dieser Farbe
const FIGUR_UMZUG = {
    oberteil: { shirt_rot: ["shirt_weiss", "#d9483f"], shirt_gruen: ["shirt_weiss", "#5fb03c"], shirt_schwarz: ["shirt_weiss", "#2e2e36"],
        shirt_blau: ["shirt_weiss", "#3a6ad0"], shirt_gelb: ["shirt_weiss", "#f0d040"], shirt_rosa: ["shirt_weiss", "#ff9ac0"],
        shirt_lila: ["shirt_weiss", "#9a6ad0"], shirt_grau: ["shirt_weiss", "#a0a0aa"], pulli_gruen: ["pulli", "#5a9a4a"] },
    hose: { braun: ["jeans", "#7a5a3a"], schwarz: ["jeans", "#2c2c34"], gruen: ["jeans", "#4a7a3a"], beige: ["jeans", "#d8c090"],
        grau: ["jeans", "#6a6a78"], rock_blau: ["rock", "#3a6ad0"] },
    schuhe: { schwarz: ["braun", "#1e1e24"], rot: ["braun", "#c8302a"], blau: ["weiss", "#3a6ad0"] },
    kopf: { muetze_gruen: ["muetze", "#4a8a3a"], kappe_rot: ["kappe", "#c8302a"] },
    accessoire: { schal_blau: ["schal", "#3a6ad0"], brille_rot: ["brille", "#c8302a"], sonnenbrille: ["brille", "#1e1e24"] },
    augen: { blau: ["braun", "#2a5ac0"], gruen: ["braun", "#2a8a3a"], grau: ["braun", "#5a5a6a"], haselnuss: ["braun", "#7a5a2a"],
        bernstein: ["braun", "#c8801a"] }
};
const FIGUR_PALETTE = ["#e8434a", "#f08a24", "#f5d547", "#8fcf5c", "#3f8a32", "#5aa9e6", "#2f6fb8", "#1b3f73",
    "#a877e0", "#6b3fa0", "#ff8fb1", "#8f6139", "#5c5c66", "#1c1b24", "#f4f4f4", "#d9b56a"];

// Auren um Namen und Figur: alle 5 Level eine neue (Level 1 grau). Hohe Auren leuchten staerker oder wechseln die Farbe.
const FIGUR_AUREN = [
    { level: 1, id: "grau", name: t("Grau"), farbe: "#9a9aa8" },
    { level: 5, id: "gruen", name: t("Wiesengrün"), farbe: "#7ed957" },
    { level: 10, id: "gelb", name: t("Sonnengelb"), farbe: "#ffd84a" },
    { level: 15, id: "himmel", name: t("Himmelblau"), farbe: "#6cc4ff" },
    { level: 20, id: "rosa", name: t("Blütenrosa"), farbe: "#ff9ac8" },
    { level: 25, id: "orange", name: t("Kürbisorange"), farbe: "#ff9a3a" },
    { level: 30, id: "lila", name: t("Lavendel"), farbe: "#b58cff" },
    { level: 35, id: "minze", name: t("Minze"), farbe: "#6fffc8" },
    { level: 40, id: "rot", name: t("Mohnrot"), farbe: "#ff5a5a" },
    { level: 45, id: "silber", name: t("Mondsilber"), farbe: "#e8f0ff" },
    { level: 50, id: "gold", name: t("Gold"), farbe: "#ffcc33", stark: true },
    { level: 55, id: "smaragd", name: t("Smaragd"), farbe: "#2fe07a", stark: true },
    { level: 60, id: "saphir", name: t("Saphir"), farbe: "#3a7bff", stark: true },
    { level: 65, id: "rubin", name: t("Rubin"), farbe: "#ff2e5a", stark: true },
    { level: 70, id: "amethyst", name: t("Amethyst"), farbe: "#a64dff", stark: true },
    { level: 75, id: "sonne", name: t("Sonnenfeuer"), farbe: "#ff8a1a", stark: true, puls: true },
    { level: 80, id: "mond", name: t("Mondschein"), farbe: "#cfe4ff", stark: true, puls: true },
    { level: 85, id: "polar", name: t("Polarlicht"), farbe: "#5affc8", stark: true, puls: true },
    { level: 90, id: "sternen", name: t("Sternenstaub"), farbe: "#fff6a0", stark: true, puls: true },
    { level: 95, id: "kosmos", name: t("Kosmos"), farbe: "#ff6ad5", stark: true, puls: true },
    { level: 100, id: "regenbogen", name: t("Regenbogen"), farbe: "#ff4a4a", stark: true, regenbogen: true }
];

const EPISCH = { quelle: "dlc", paket: "unterstuetzer" };
const LEGENDAER = { quelle: "dlc", paket: "einzeln" };

const FIGUR_TEILE = {
    haut: [
        { id: "hell", name: t("Hell"), quelle: "frei", farben: { 4: "#ffe2cc", s: "#f0c0a2", r: "#ff9aa0", m: "#9a4a3a" } },
        { id: "porzellan", name: t("Porzellan"), quelle: "frei", farben: { 4: "#fff0e6", s: "#f0d4c4", r: "#ffb0b8", m: "#a05a4a" } },
        { id: "oliv", name: t("Oliv"), quelle: "frei", farben: { 4: "#c8a070", s: "#a8844e", r: "#d8806a", m: "#6a3a22" } },
        { id: "pfirsich", name: t("Pfirsich"), quelle: "frei", farben: { 4: "#f5c8a0", s: "#e0a880", r: "#f08a8a", m: "#8a3a2a" } },
        { id: "mittel", name: t("Mittel"), quelle: "frei", farben: { 4: "#d9a078", s: "#c0845c", r: "#e07a6a", m: "#7a3222" } },
        { id: "gebraeunt", name: t("Gebräunt"), quelle: "frei", farben: { 4: "#b87850", s: "#9a603c", r: "#c8604a", m: "#5a2418" } },
        { id: "braun", name: t("Braun"), quelle: "frei", farben: { 4: "#8a5a3a", s: "#6e4428", r: "#a84a3a", m: "#3e1a10" } },
        { id: "dunkel", name: t("Dunkel"), quelle: "frei", farben: { 4: "#5e3c28", s: "#4a2c1c", r: "#7a3a2a", m: "#2a120a" } },
        { id: "blau", name: t("Blau"), ...EPISCH, farben: { 4: "#8ab8f0", s: "#6a98d8", r: "#c89af0", m: "#2a3a7a" } },
        { id: "gruen", name: t("Grün"), ...EPISCH, farben: { 4: "#9ad68a", s: "#7ab86a", r: "#e8a0a0", m: "#2a5a2a" } },
        { id: "lila", name: t("Lila"), ...EPISCH, farben: { 4: "#c0a0e8", s: "#a080d0", r: "#ff9ad0", m: "#4a2a7a" } },
        { id: "stein", name: t("Stein"), ...EPISCH, farben: { 4: "#a8a8b4", s: "#8a8a98", r: "#c8a0a0", m: "#3a3a48" } },
        { id: "geist", name: t("Geist"), ...LEGENDAER, fx: "geist", farben: { 4: "#eef4ff", s: "#c8d8f0", r: "#b8c8ff", m: "#6a7ab0" } },
        { id: "rgb", name: t("RGB"), ...LEGENDAER, fx: "rgb", farben: { 4: "#ff8a8a", s: "#e06a6a", r: "#ffd0d0", m: "#6a1a1a" } },
        { id: "kristall", name: t("Kristall"), ...LEGENDAER, form: "kristall", anim: true, fx: "funkeln", fxFarbe: "#bff0ff",
            farben: { 4: "#c8f4ff", s: "#8ad8f0", r: "#f0c8ff", m: "#3a7a9a", v: "#ffffff" } },
        { id: "sternenhaut", name: t("Sternenhaut"), ...LEGENDAER, form: "sternenhaut", anim: true, fx: "glow", fxFarbe: "#8fa2f0",
            farben: { 4: "#3a4a9a", s: "#26306e", r: "#8a6af0", m: "#c9b0f5", v: "#fff6a0" } }
    ],
    augen: [
        { id: "braun", name: t("Augen"), quelle: "frei", farben: { 5: "#4a2a12" } },
        { id: "rot", name: t("Rot"), ...EPISCH, farben: { 5: "#c8201a" } },
        { id: "gold", name: t("Gold"), ...EPISCH, farben: { 5: "#d49a10" } },
        { id: "lila", name: t("Lila"), ...EPISCH, farben: { 5: "#7a2ad0" } },
        { id: "katze", name: t("Katzenaugen"), ...EPISCH, form: "katze", farben: { 5: "#8ad02a" } },
        { id: "leuchtend", name: t("Leuchtend"), ...LEGENDAER, form: "leuchten", anim: true, fx: "glow", fxFarbe: "#5af0ff", farben: { 5: "#3ae0ff", v: "#e8ffff" } },
        { id: "herz", name: t("Herzaugen"), ...LEGENDAER, form: "herz", anim: true, fx: "glow", fxFarbe: "#ff5a9a", farben: { 5: "#ff2a7a" } },
        { id: "sternaugen", name: t("Sternaugen"), ...LEGENDAER, form: "stern", anim: true, fx: "glow", fxFarbe: "#fff6a0", farben: { 5: "#3a4ab0", v: "#fff6a0" } }
    ],
    frisur: [
        { id: "kurz", name: t("Kurz"), quelle: "frei", form: "kurz" },
        { id: "scheitel", name: t("Seitenscheitel"), quelle: "frei", form: "scheitel" },
        { id: "stoppel", name: t("Stoppelhaar"), quelle: "frei", form: "stoppel" },
        { id: "wuschel", name: t("Wuschelkopf"), quelle: "frei", form: "wuschel" },
        { id: "lang", name: t("Lang"), quelle: "frei", form: "lang" },
        { id: "zopf", name: t("Pferdeschwanz"), quelle: "frei", form: "zopf" },
        { id: "locken", name: t("Locken"), quelle: "frei", form: "locken" },
        { id: "dutt", name: t("Dutt"), quelle: "frei", form: "dutt" },
        { id: "glatze", name: t("Glatze"), quelle: "frei", form: "glatze" },
        { id: "iro", name: t("Irokese"), ...EPISCH, form: "iro" },
        { id: "zoepfe", name: t("Zöpfe"), ...EPISCH, form: "zoepfe" },
        { id: "stachel", name: t("Stachelhaar"), ...EPISCH, form: "stachel" },
        { id: "tolle", name: t("Tolle"), ...EPISCH, form: "tolle" },
        { id: "undercut", name: t("Undercut"), ...EPISCH, form: "undercut" },
        { id: "afro", name: t("Afro"), ...EPISCH, form: "afro" },
        { id: "bob", name: t("Bob"), ...EPISCH, form: "bob" },
        { id: "seitenzopf", name: t("Seitenzopf"), ...EPISCH, form: "seitenzopf" },
        { id: "doppeldutt", name: t("Doppeldutt"), ...EPISCH, form: "doppeldutt" },
        { id: "flamme", name: t("Flammenhaar"), ...LEGENDAER, form: "flamme", anim: true, fx: "flamme", fxFarbe: "#ff8a2a" },
        { id: "wolke", name: t("Wolkenhaar"), ...LEGENDAER, form: "wolke", anim: true, fx: "schweben" },
        { id: "sternenhaar", name: t("Sternenhaar"), ...LEGENDAER, form: "sterne", anim: true, fx: "funkeln", fxFarbe: "#fff6a0" },
        { id: "meer", name: t("Meereswellen"), ...LEGENDAER, form: "meer", anim: true, fx: "glow", fxFarbe: "#5ad8f0" }
    ],
    haarfarbe: [
        { id: "braun", name: t("Braun"), quelle: "frei", farben: { 2: "#6b3f1d", h: "#9a6634" } },
        { id: "dunkelbraun", name: t("Dunkelbraun"), quelle: "frei", farben: { 2: "#3a2414", h: "#5e3c22" } },
        { id: "schwarz", name: t("Schwarz"), quelle: "frei", farben: { 2: "#1e1e26", h: "#3e3e4a" } },
        { id: "blond", name: t("Blond"), quelle: "frei", farben: { 2: "#e0b848", h: "#fff0a0" } },
        { id: "rot", name: t("Rot"), quelle: "frei", farben: { 2: "#c0482a", h: "#e87a4a" } },
        { id: "grau", name: t("Grau"), quelle: "frei", farben: { 2: "#9a9aa6", h: "#cacad4" } },
        { id: "weiss", name: t("Weiß"), quelle: "frei", farben: { 2: "#e8e8ee", h: "#ffffff" } },
        { id: "kastanie", name: t("Kastanie"), quelle: "frei", farben: { 2: "#8a3a1a", h: "#b85a2a" } },
        { id: "kupfer", name: t("Kupfer"), quelle: "frei", farben: { 2: "#d0702a", h: "#f0a050" } },
        { id: "platin", name: t("Platinblond"), quelle: "frei", farben: { 2: "#f0e4b0", h: "#fffbe0" } },
        { id: "rosa", name: t("Rosa"), ...EPISCH, farben: { 2: "#ff8fb8", h: "#ffc8dc" } },
        { id: "tuerkis", name: t("Türkis"), ...EPISCH, farben: { 2: "#2ab8b0", h: "#8ae8e0" } },
        { id: "lila", name: t("Lila"), ...EPISCH, farben: { 2: "#7a4ac0", h: "#b08ae8" } },
        { id: "blau", name: t("Blau"), ...EPISCH, farben: { 2: "#2a5ac8", h: "#6a9af0" } },
        { id: "gruen", name: t("Grün"), ...EPISCH, farben: { 2: "#3a8a2a", h: "#7cc85a" } },
        { id: "regenbogen", name: t("Regenbogen"), ...LEGENDAER, fx: "rgb", farben: { 2: "#ff4a4a", h: "#ffd23a" } },
        { id: "glut", name: t("Glut"), ...LEGENDAER, fx: "flamme", fxFarbe: "#ff6a0a", farben: { 2: "#ff5a0a", h: "#ffd23a" } },
        { id: "galaxie", name: t("Galaxie"), ...LEGENDAER, fx: "funkeln", fxFarbe: "#c9b0f5", farben: { 2: "#2a1a5a", h: "#8a6af0" } }
    ],
    oberteil: [
        { id: "latz", name: t("Latzhose"), quelle: "frei", form: "latz", farben: { 6: "#4a7ad0", 8: "#3a5ea8", k: "#f4ead4" } },
        { id: "shirt_weiss", name: t("T-Shirt"), quelle: "frei", farben: { 6: "#f4f4f4", 8: "#cfcfd8", k: "#cfcfd8" } },
        { id: "pulli", name: t("Pulli"), quelle: "frei", form: "pulli", farben: { 6: "#f0c83a", 8: "#c89a1a", k: "#c89a1a" } },
        { id: "karo", name: t("Karohemd"), quelle: "frei", form: "karo", farben: { 6: "#c8302a", 8: "#8a1a18", k: "#f4e4d0" } },
        { id: "hoodie", name: t("Hoodie"), ...EPISCH, form: "hoodie", farben: { 6: "#7a3ab0", 8: "#55287e", k: "#9a5ad0" } },
        { id: "kimono", name: t("Kimono"), ...EPISCH, form: "kimono", farben: { 6: "#e8566a", 8: "#b83a4c", k: "#f4d060" } },
        { id: "matrose", name: t("Matrosenhemd"), ...EPISCH, form: "matrose", farben: { 6: "#f6f6fa", 8: "#d0d0dc", k: "#2a3a7a", p: "#d9302a" } },
        { id: "weste", name: t("Weste"), ...EPISCH, form: "weste", farben: { 6: "#6b3f1d", 8: "#4a2a12", k: "#f4f0e8" } },
        { id: "jacke", name: t("Jacke"), ...EPISCH, form: "jacke", farben: { 6: "#4a6a9a", 8: "#344e78", k: "#f4f4f4", p: "#d4a02a" } },
        { id: "ringel", name: t("Ringelshirt"), ...EPISCH, form: "ringel", farben: { 6: "#f4f4f4", 8: "#d0d0dc", k: "#2a4a9a" } },
        { id: "regenmantel", name: t("Regenmantel"), ...EPISCH, form: "regenmantel", farben: { 6: "#f5d547", 8: "#c8a820", k: "#3a3a44" } },
        { id: "imker", name: t("Imkeranzug"), ...EPISCH, form: "imker", farben: { 6: "#f4f0e0", 8: "#d0c8b0", k: "#1c1b24", p: "#f5c542" } },
        { id: "flicken", name: t("Flickenhemd"), ...EPISCH, form: "flicken", farben: { 6: "#8aa0c0", 8: "#6a80a0", k: "#e8434a", p: "#7ed957" } },
        { id: "blaetterweste", name: t("Laubweste"), ...LEGENDAER, form: "blaetter", anim: true, fx: "funkeln", fxFarbe: "#ffb04a",
            farben: { 6: "#c8702a", 8: "#9a4a1a", k: "#ffb04a", p: "#e8d24a" } },
        { id: "umhang", name: t("Sternenumhang"), ...LEGENDAER, form: "umhang", anim: true, fx: "funkeln", fxFarbe: "#fff6a0",
            farben: { 6: "#2a3a8a", 8: "#1a2460", k: "#fff6a0" } },
        { id: "bluetenkleid", name: t("Blütenkleid"), ...LEGENDAER, form: "kleid", anim: true, fx: "funkeln", fxFarbe: "#ffb3d0",
            farben: { 6: "#8fd07a", 8: "#5fb03c", k: "#ff8fb8", p: "#ffd23a" } },
        { id: "astronaut", name: t("Raumanzug"), ...LEGENDAER, form: "astronaut", anim: true, fx: "glow", fxFarbe: "#8fe0ff",
            farben: { 6: "#f4f6fa", 8: "#b8c4d8", k: "#3ae0ff", p: "#ff4a4a" } },
        { id: "regenbogenpulli", name: t("Regenbogenpulli"), ...LEGENDAER, form: "regenbogen", anim: true, fx: "glow", fxFarbe: "#ffe066",
            farben: { 6: "#ff5a5a", 8: "#c83a3a", k: "#ffffff", A: "#ff5a5a", B: "#ff9a3a", C: "#ffe04a", D: "#5ad05a", E: "#4a9af0", F: "#a05ae0" } }
    ],
    hose: [
        { id: "jeans", name: t("Jeans"), quelle: "frei", farben: { 3: "#3a5a9a", 9: "#2a4478" } },
        { id: "rock", name: t("Rock"), quelle: "frei", form: "rock", farben: { 3: "#c83a3a", 9: "#9a2a2a" } },
        { id: "shorts", name: t("Shorts"), ...EPISCH, form: "shorts", farben: { 3: "#c8a060", 9: "#a07a40" } },
        { id: "latzrot", name: t("Rote Latzhose"), ...EPISCH, farben: { 3: "#c8302a", 9: "#8a1a18" } },
        { id: "karohose", name: t("Karohose"), ...EPISCH, form: "karo", farben: { 3: "#6a8a4a", 9: "#4a6a30", u: "#c8e0a0" } },
        { id: "cargohose", name: t("Cargohose"), ...EPISCH, form: "cargo", farben: { 3: "#6a7048", 9: "#4a5030", u: "#8a9060" } },
        { id: "risse", name: t("Zerrissene Jeans"), ...EPISCH, form: "risse", farben: { 3: "#4a6aa8", 9: "#344e80", u: "#f4f4f4" } },
        { id: "lavahose", name: t("Lavahose"), ...LEGENDAER, form: "lava", anim: true, fx: "glow", fxFarbe: "#ff7a1a",
            farben: { 3: "#3a2420", 9: "#241410", u: "#ff7a1a", j: "#ffd23a" } },
        { id: "sternenhose", name: t("Sternenhose"), ...LEGENDAER, form: "sterne", anim: true, fx: "funkeln", fxFarbe: "#fff6a0",
            farben: { 3: "#1d2a6a", 9: "#121a48" } }
    ],
    schuhe: [
        { id: "braun", name: t("Schuhe"), quelle: "frei", farben: { 1: "#5a3a1a", l: "#7a5a3a" } },
        { id: "weiss", name: t("Turnschuhe"), quelle: "frei", farben: { 1: "#f4f4f4", l: "#d0d0d8" } },
        { id: "gummistiefel", name: t("Gummistiefel"), ...EPISCH, form: "stiefel", farben: { 1: "#f0c83a", l: "#c89a1a" } },
        { id: "rotestiefel", name: t("Rote Stiefel"), ...EPISCH, form: "stiefel", farben: { 1: "#c8302a", l: "#8a1a18" } },
        { id: "clogs", name: t("Holzschuhe"), ...EPISCH, form: "clogs", farben: { 1: "#d8a860", l: "#f0cc88" } },
        { id: "sandalen", name: t("Sandalen"), ...EPISCH, form: "sandalen", farben: { 1: "#8a5a2a", l: "#b07a40" } },
        { id: "cowboy", name: t("Cowboystiefel"), ...EPISCH, form: "cowboy", farben: { 1: "#7a4a22", l: "#a06a38", n: "#e8c040" } },
        { id: "blitzschuhe", name: t("Blitzschuhe"), ...LEGENDAER, form: "blitz", anim: true, fx: "glow", fxFarbe: "#ffe24a",
            farben: { 1: "#2a4ad0", l: "#ffe24a" } },
        { id: "wolken", name: t("Wolkenschuhe"), ...LEGENDAER, form: "wolke", anim: true, fx: "schweben", farben: { 1: "#ffffff", l: "#d8e4f4" } },
        { id: "raketen", name: t("Raketenschuhe"), ...LEGENDAER, form: "rakete", anim: true, fx: "glow", fxFarbe: "#ff8a2a", farben: { 1: "#d0d4dc", l: "#ff4a3a" } }
    ],
    // Gesicht: Kleinigkeiten, mit denen man sich selbst beschreiben kann (G/H = eigene Farben)
    gesicht: [
        { id: "keins", name: t("Nichts"), quelle: "frei", form: "keins" },
        { id: "sommersprossen", name: t("Sommersprossen"), quelle: "frei", form: "sommersprossen", farben: { G: "#b0643a" } },
        { id: "wangen", name: t("Rote Wangen"), quelle: "frei", form: "wangen", farben: { G: "#ff7a8a" } },
        { id: "muttermal", name: t("Muttermal"), quelle: "frei", form: "muttermal", farben: { G: "#5a2a1a" } },
        { id: "grinsen", name: t("Breites Grinsen"), quelle: "frei", form: "grinsen", farben: { G: "#9a4a3a", H: "#ffffff" } },
        { id: "schnurrbart", name: t("Schnurrbart"), ...EPISCH, form: "schnurrbart" },
        { id: "vollbart", name: t("Vollbart"), ...EPISCH, form: "vollbart" },
        { id: "pflaster", name: t("Pflaster"), ...EPISCH, form: "pflaster", farben: { G: "#fff4e0", H: "#b07a4a" } },
        { id: "kriegsbemalung", name: t("Farbstreifen"), ...EPISCH, form: "streifen", farben: { G: "#2f6fb8", H: "#e8434a" } },
        { id: "sternenwangen", name: t("Sternenwangen"), ...LEGENDAER, form: "sternenwangen", anim: true, fx: "funkeln", fxFarbe: "#fff6a0",
            farben: { G: "#ffd23a", H: "#fff6c0" } }
    ],
    kopf: [
        { id: "keiner", name: t("Nichts"), quelle: "frei", form: "keiner" },
        { id: "strohhut", name: t("Strohhut"), quelle: "frei", form: "strohhut", farben: { a: "#e8c860", b: "#c8a040", c: "#c8302a" } },
        { id: "muetze", name: t("Mütze"), quelle: "frei", form: "muetze", farben: { a: "#c8302a", b: "#9a2420", c: "#ffffff" } },
        { id: "kappe", name: t("Kappe"), quelle: "frei", form: "kappe", farben: { a: "#3a6ad0", b: "#2a4a9a", c: "#ffffff" } },
        { id: "schleife", name: t("Rote Schleife"), quelle: "frei", form: "schleife", farben: { a: "#e8243a", b: "#a81a2a", c: "#ff8a9a" } },
        { id: "stirnband", name: t("Stirnband"), quelle: "frei", form: "stirnband", farben: { a: "#3a8ad0", b: "#2a6aa8", c: "#ffffff" } },
        { id: "blumenkranz", name: t("Blumenkranz"), ...EPISCH, form: "kranz", farben: { a: "#5fb03c", b: "#ff8fb8", c: "#ffd23a" } },
        { id: "hexenhut", name: t("Hexenhut"), ...EPISCH, form: "hexe", farben: { a: "#3a2a5a", b: "#241a3a", c: "#a86ae0" } },
        { id: "katzenohren", name: t("Katzenohren"), ...EPISCH, form: "ohren", farben: { a: "#3a2a2a", b: "#ff9ab8", c: "#3a2a2a" } },
        { id: "kopfhoerer", name: t("Kopfhörer"), ...EPISCH, form: "kopfhoerer", farben: { a: "#2a2a30", b: "#ff5a8a", c: "#ff5a8a" } },
        { id: "cowboy", name: t("Cowboyhut"), ...EPISCH, form: "cowboy", farben: { a: "#9a6634", b: "#6b4422", c: "#d4a02a" } },
        { id: "barett", name: t("Barett"), ...EPISCH, form: "barett", farben: { a: "#c8302a", b: "#8a1a18", c: "#2a1a12" } },
        { id: "bandana", name: t("Bandana"), ...EPISCH, form: "bandana", farben: { a: "#d9483f", b: "#a8322a", c: "#ffffff" } },
        { id: "wikinger", name: t("Wikingerhelm"), ...EPISCH, form: "wikinger", farben: { a: "#9aa0a8", b: "#7a5230", c: "#f4ecd8" } },
        { id: "partyhut", name: t("Partyhut"), ...EPISCH, form: "partyhut", farben: { a: "#5aa9e6", b: "#ffd84a", c: "#ff5a8a" } },
        { id: "hasenohren", name: t("Hasenohren"), ...EPISCH, form: "hasenohren", anim: true, farben: { a: "#f4f4f4", b: "#ffb0c8", c: "#e0e0e8" } },
        { id: "einhorn", name: t("Einhorn-Horn"), ...LEGENDAER, form: "einhorn", anim: true, fx: "funkeln", fxFarbe: "#ff9ad5",
            farben: { a: "#fff6c0", b: "#ffc6ea", c: "#ffffff" } },
        { id: "krone", name: t("Krone"), ...LEGENDAER, form: "krone", anim: true, fx: "funkeln", fxFarbe: "#ffe066",
            farben: { a: "#ffd23a", b: "#c89a10", c: "#e8434a" } },
        { id: "heiligenschein", name: t("Heiligenschein"), ...LEGENDAER, form: "schein", anim: true, fx: "glow", fxFarbe: "#fff6a0",
            farben: { a: "#fff6a0", b: "#ffe066", c: "#ffffff" } },
        { id: "pilzhut", name: t("Pilzhut"), ...LEGENDAER, form: "pilz", anim: true, farben: { a: "#e8434a", b: "#b82a30", c: "#ffffff" } },
        { id: "regenwolke", name: t("Regenwolke"), ...LEGENDAER, form: "regenwolke", anim: true, fx: "schweben",
            farben: { a: "#f4f6fa", b: "#b8c4d8", c: "#5ab8f0" } }
    ],
    // Farben: x Rahmen/Hauptfarbe, y Glas/Zweitfarbe, z Glanz/Akzent
    accessoire: [
        { id: "keins", name: t("Nichts"), quelle: "frei", form: "keins" },
        { id: "brille", name: t("Brille"), quelle: "frei", form: "brille", farben: { x: "#3a2a1a", y: "#cfe8ff", z: "#ffffff" } },
        { id: "schal", name: t("Schal"), quelle: "frei", form: "schal", farben: { x: "#c8302a", y: "#9a2420", z: "#f4e4d0" } },
        { id: "rucksack", name: t("Rucksack"), quelle: "frei", form: "rucksack", farben: { x: "#7a9a3a", y: "#5a7a2a", z: "#c89a3a" } },
        { id: "kette", name: t("Perlenkette"), quelle: "frei", form: "kette", farben: { x: "#fff4e8", y: "#e8d8c8", z: "#ffffff" } },
        { id: "fliege", name: t("Fliege"), ...EPISCH, form: "fliege", farben: { x: "#c8302a", y: "#8a1a18", z: "#ff6a5a" } },
        { id: "herzbrille", name: t("Herzbrille"), ...EPISCH, form: "herzbrille", farben: { x: "#ff4a8a", y: "#ff9ac0", z: "#ffffff" } },
        { id: "monokel", name: t("Monokel"), ...EPISCH, form: "monokel", farben: { x: "#d4a02a", y: "#e8f4ff", z: "#fff6c0" } },
        { id: "blumenkette", name: t("Blumenkette"), ...EPISCH, form: "lei", farben: { x: "#ff8fb8", y: "#ffd23a", z: "#5fb03c" } },
        { id: "ohrringe", name: t("Ohrringe"), ...EPISCH, form: "ohrringe", farben: { x: "#ffd23a", y: "#d49a00", z: "#ffffff" } },
        { id: "tasche", name: t("Umhängetasche"), ...EPISCH, form: "tasche", farben: { x: "#9a6634", y: "#6b4422", z: "#d4a02a" } },
        { id: "gitarre", name: t("Gitarre"), ...EPISCH, form: "gitarre", farben: { x: "#c87a3a", y: "#6b3f1d", z: "#f4e4c0" } },
        { id: "giesskanne", name: t("Gießkanne"), ...EPISCH, form: "giesskanne", anim: true, farben: { x: "#5aa9e6", y: "#2f6fb8", z: "#9fe0ff" } },
        { id: "vogel", name: t("Schultervogel"), ...EPISCH, form: "vogel", anim: true, farben: { x: "#e0602a", y: "#f5c542", z: "#1c1b24" } },
        { id: "libellenfluegel", name: t("Libellenflügel"), ...LEGENDAER, form: "libelle", anim: true, fx: "funkeln", fxFarbe: "#c8f0e8", farben: { x: "#c8f0e8", y: "#a8e0d8", z: "#5aa89a" } },
        { id: "gluehwuermchen", name: t("Glühwürmchen"), ...LEGENDAER, form: "gluehwuermchen", anim: true, fx: "glow", fxFarbe: "#fff06a",
            farben: { x: "#fff06a", y: "#c8e04a", z: "#ffffff" } },
        { id: "feenfluegel", name: t("Feenflügel"), ...LEGENDAER, form: "fluegel", anim: true, fx: "funkeln", fxFarbe: "#bff0ff",
            farben: { x: "#bff0ff", y: "#ffffff", z: "#ffc2e8" } },
        { id: "engelsfluegel", name: t("Engelsflügel"), ...LEGENDAER, form: "engel", anim: true, fx: "glow", fxFarbe: "#fff6c8",
            farben: { x: "#ffffff", y: "#d8e0f0", z: "#fff6c8" } },
        { id: "schmetterlingsfluegel", name: t("Schmetterlingsflügel"), ...LEGENDAER, form: "schmetterling", anim: true, fx: "funkeln", fxFarbe: "#ffb3e0",
            farben: { x: "#ff8ac8", y: "#8a6af0", z: "#ffe066" } },
        { id: "fledermausfluegel", name: t("Fledermausflügel"), ...LEGENDAER, form: "fledermaus", anim: true, fx: "glow", fxFarbe: "#b04ae0",
            farben: { x: "#3a1a4a", y: "#5a2a6a", z: "#b04ae0" } },
        { id: "drachenfluegel", name: t("Drachenflügel"), ...LEGENDAER, form: "drache", anim: true, fx: "flamme", fxFarbe: "#ff6a2a",
            farben: { x: "#8a1a1a", y: "#c83a2a", z: "#ffd23a" } }

    ]
};

const FIGUR_STANDARD = { haut: "hell", augen: "braun", frisur: "kurz", haarfarbe: "braun", oberteil: "latz", hose: "jeans", schuhe: "braun", kopf: "strohhut",
    accessoire: "keins", gesicht: "keins" };

// Emotes mit Rechtsklick auf die eigene Figur
const FIGUR_EMOTES = [
    { id: "winken", symbol: "👋", name: t("Winken"), pose: "winken" },
    { id: "jubeln", symbol: "🎉", name: t("Jubeln"), pose: "jubeln" },
    { id: "tanzen", symbol: "💃", name: t("Tanzen"), pose: "tanzen" },
    { id: "hacken", symbol: "⛏️", name: t("Hacken"), pose: "hacken" },
    { id: "herz", symbol: "❤️", name: t("Herz"), pose: "stehen" },
    { id: "lachen", symbol: "😂", name: t("Lachen"), pose: "jubeln" },
    { id: "daumen", symbol: "👍", name: t("Daumen hoch"), pose: "winken" },
    { id: "schlafen", symbol: "💤", name: t("Nickerchen"), pose: "schlafen" }
];
