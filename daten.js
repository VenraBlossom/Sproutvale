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
    if (Math.abs(n) < 100000) return n.toLocaleString("de-DE");
    // deutsche Namen: Tsd., Mio., Mrd. (10^9), Bio. (10^12), Brd. (10^15), Trio. (10^18), Trd. (10^21)
    const namen = [[1e21, "Trd."], [1e18, "Trio."], [1e15, "Brd."], [1e12, "Bio."], [1e9, "Mrd."], [1e6, "Mio."], [1e3, "Tsd."]];
    for (const [grenze, name] of namen) {
        if (Math.abs(n) >= grenze && Math.abs(n) < grenze * 1000) {
            return (n / grenze).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " " + name;
        }
    }
    return n.toExponential(2).replace(".", ",").replace("e+", "e");
}

function prozentText(anteil) {
    return (anteil * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + "%";
}

function sekText(sek) {
    return sek.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " Sek.";
}

function multiText(wert) {
    return "x" + wert.toLocaleString("de-DE", { maximumFractionDigits: 2 });
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
const SPIEL_VERSION = "Alpha 0.3.0";

const KONFIG = {
    startKlicksProSamen: 40,
    minKlicksProSamen: 6,
    startEnergie: 150,
    energieProSek: 5,
    tageProRechnung: 5,
    rechnungBasis: 30,
    rechnungFaktor: 26,               // ab der 4. Rechnung wird jede x26 teurer
    rechnungFaktorenStart: [18, 13, 17], // die ersten Spruenge sind sanfter: 30, 540, 7.020, 119.340, 3,1 Mio. ...
    sternensamenProErnte: 5,          // jede Ernte laesst Sternensaat mit 5 Sternensamen fallen (Weizen) ...
    sternensamenPflanzenFaktor: 1.07, // ... und jede hoehere Pflanze gibt 7% mehr (Kuerbis ~7,5, Mondlilie ~13)
    sternensamenProKlick: 1,          // jeder Klick auf den Samenladen, der einen Samen wirft, gibt Sternensamen
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
    sternschnuppeMinSek: 25,
    sternschnuppeMaxSek: 45,
    sternschnuppeBuffSek: 10,
    gluehwuermchenAbTageszeit: 0.65,  // ab diesem Anteil des Tages (0 = Morgen, 1 = Nacht) kommen Gluehwuermchen
    gluehwuermchenMinSek: 3,
    gluehwuermchenMaxSek: 7,
    gluehwuermchenEnergie: 10,        // ein gefangenes Gluehwuermchen verlaengert den Abend
    bonusEnergieDeckel: 0.6,          // Extra-Energie (Blitzpflanzen, Kaffee, Gluehwuermchen) hoechstens 60% der Tagesenergie, sonst endet der Tag nie
    streichelnFuerGold: 3,            // jedes 3. Streicheln laesst eine Saat fallen (nur waehrend eines Tages)
    streichelSperreMs: 350,           // schneller gestreichelt zaehlt nicht (gegen Autoklicker)
    streichelAnteil: 0.0002,          // Wert einer Streichel-Saat = 0,02% der aktuellen Rechnung (mal Farbe)
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
    { id: "weizen", name: "Weizen", emoji: "🌾", sekProStufe: 2, verkaufswert: 2, unlockKosten: 0, bonusName: "Goldene Garbe", bonusText: "Jede Weizen-Ernte gibt 5 Sternensamen extra." },
    { id: "karotte", name: "Karotte", emoji: "🥕", sekProStufe: 2.5, verkaufswert: 5, unlockKosten: 120, bonusName: "Knackige Karotten", bonusText: "Karotten wachsen 50% schneller." },
    { id: "kartoffel", name: "Kartoffel", emoji: "🥔", sekProStufe: 3, verkaufswert: 12, unlockKosten: 210, bonusName: "Knollenfund", bonusText: "20% Chance, dass eine Kartoffel eine zweite Saat fallen lässt." },
    { id: "erdbeere", name: "Erdbeere", emoji: "🍓", sekProStufe: 3.5, verkaufswert: 30, unlockKosten: 370, bonusName: "Süße Beeren", bonusText: "Saaten von Erdbeeren sind mindestens ungewöhnlich." },
    { id: "tomate", name: "Tomate", emoji: "🍅", sekProStufe: 4, verkaufswert: 75, unlockKosten: 650, bonusName: "Rote Welle", bonusText: "Jede Tomaten-Ernte gibt +3 Kombo." },
    { id: "mais", name: "Mais", emoji: "🌽", sekProStufe: 4.5, verkaufswert: 190, unlockKosten: 1100, bonusName: "Popcorn", bonusText: "15% Chance, dass beim Ernten ein Maiskorn auf ein freies Feld springt und dort wächst." },
    { id: "kuerbis", name: "Kürbis", emoji: "🎃", sekProStufe: 5, verkaufswert: 480, unlockKosten: 2000, bonusName: "Riesenkürbis", bonusText: "10% Chance auf einen Riesenkürbis mit 5-fachem Wert." },
    { id: "sonnenblume", name: "Sonnenblume", emoji: "🌻", sekProStufe: 6, verkaufswert: 1200, unlockKosten: 3500, bonusName: "Sonnenkraft", bonusText: "Jede Sonnenblumen-Ernte gibt +2 Energie." },
    { id: "blaubeere", name: "Blaubeere", emoji: "🫐", sekProStufe: 6.5, verkaufswert: 3000, unlockKosten: 6000, bonusName: "Voller Strauch", bonusText: "Blaubeeren lassen 3 statt 2 Saaten fallen.",
        eigenschaft: "beeren", eigenschaftText: "Busch: lässt 2 Saaten mit je 60% Wert fallen (zwei Farbwürfe!)." },
    { id: "melone", name: "Melone", emoji: "🍉", sekProStufe: 7, verkaufswert: 7500, unlockKosten: 10500, bonusName: "Melonen-Sommer", bonusText: "50% statt 25% Chance auf eine Riesenmelone.",
        eigenschaft: "riesig", eigenschaftText: "25% Chance auf eine Riesenmelone mit doppeltem Wert." },
    { id: "reis", name: "Reis", emoji: "🍚", sekProStufe: 7.5, verkaufswert: 19000, unlockKosten: 18500, bonusName: "Reisterrassen", bonusText: "Reis zählt immer als bewässert.",
        eigenschaft: "wasser", eigenschaftText: "Wasserpflanze: wächst auf bewässerten Feldern 3-mal statt 2-mal so schnell." },
    { id: "kaffee", name: "Kaffee", emoji: "☕", sekProStufe: 8, verkaufswert: 47000, unlockKosten: 32000, bonusName: "Espresso", bonusText: "Jede Kaffee-Ernte gibt dem Samenladen 5 Gratis-Klicks.",
        eigenschaft: "wachmacher", eigenschaftText: "Wachmacher: jede Ernte gibt +1 Energie." },
    { id: "riesenpilz", name: "Riesenpilz", emoji: "🍄", sekProStufe: 8.5, verkaufswert: 118000, unlockKosten: 56000, bonusName: "Pilzsporen", bonusText: "20% Chance, dass ein Riesenpilz beim Ernten 2 neue Samen verteilt.",
        eigenschaft: "nacht", eigenschaftText: "Nachtgewächs: wächst am Abend und in der Nacht doppelt so schnell." },
    { id: "eisblume", name: "Eisblume", emoji: "❄️", sekProStufe: 9, verkaufswert: 295000, unlockKosten: 99000, bonusName: "Diamantfrost", bonusText: "Saaten von Eisblumen sind mindestens selten.",
        eigenschaft: "eis", eigenschaftText: "Kristallkälte: ihre Saaten sind mindestens ungewöhnlich." },
    { id: "mondlilie", name: "Mondlilie", emoji: "🌸", sekProStufe: 10, verkaufswert: 740000, unlockKosten: 170000, bonusName: "Vollmond", bonusText: "Mondlilien geben am Abend und in der Nacht doppeltes Gold.",
        eigenschaft: "mond", eigenschaftText: "Blüht im Mondlicht: wächst tagsüber halb so schnell, nachts 3-mal so schnell." }
];

// Sprites fuer Samen, kleine Pflanze, grosse Pflanze. Die fertige Stufe nutzt das Sprite der Pflanze.
const STUFEN_SPRITES = ["samen", "keimling", "jungpflanze"];

// Grundchancen stehen in raritaetsChancen() in script.js. Selten (blau) gibt es nur ueber den Ast "Ernte" im Stellarium.
// Mythisch (rosa) gibt es NUR bei den Kuscheltieren im Mondteich, nie als Saat.
// symbol = Form fuer den Farbenblind-Modus (steht auf der Muenze und im Text)
const RARITAETEN = [
    { name: "Gewöhnlich", multi: 1, farbe: "#e8e8e8", rand: "#8a8a8a", symbol: "●" },
    { name: "Ungewöhnlich", multi: 2.5, farbe: "#5fd15f", rand: "#2e9e2e", symbol: "▲" },
    { name: "Selten", multi: 5, farbe: "#6cc0f5", rand: "#2f7fcf", symbol: "◆" },
    { name: "Episch", multi: 12.5, farbe: "#b06ee8", rand: "#7c2fc2", symbol: "■" },
    { name: "Legendär", multi: 50, farbe: "#ffd93d", rand: "#d49a00", symbol: "★" }
];
const JACKPOT_INDEX = RARITAETEN.length - 1;

// ---------- SPEZIALPFLANZEN ----------
// Jeder Samen kann mit etwas Glueck eine Spezialpflanze werden (hoechstens eine Variante pro Samen).
// Moegliche Effekte: tempo, goldKugeln, goldMulti, raritaetsWuerfe, jackpot, ernteKlicks,
// energieBonus, sporen, funken, magnet, sterne, kombo. Neue Variante = neuer Eintrag (ihr Stern entsteht automatisch).

const VARIANTEN = [
    { id: "geist", titel: "Geisterpflanze", praefix: "Geister", badge: "👻",
        beschreibung: "Wächst doppelt so schnell und lässt eine zweite Saat fallen.",
        tempo: 2, goldKugeln: 2, tarotBonus: { karte: "mond", chance: 0.08 } },
    { id: "blitz", titel: "Blitzpflanze", praefix: "Blitz", badge: "⚡",
        beschreibung: "Bei der Ernte: +25 Energie für den laufenden Tag.",
        energieBonus: 25 },
    { id: "pilz", titel: "Sporenpflanze", praefix: "Sporen", badge: "🍄",
        beschreibung: "Bei der Ernte verteilt sie Sporen: 2 neue Samen auf freien Feldern.",
        sporen: 2 },
    { id: "magnet", titel: "Magnetpflanze", praefix: "Magnet", badge: "🧲",
        beschreibung: "Bei der Ernte werden alle Saaten und Sternensaaten auf dem Acker eingesammelt, auch ihre eigenen.",
        magnet: true },
    { id: "feuer", titel: "Glutpflanze", praefix: "Glut", badge: "🔥",
        beschreibung: "Bei der Ernte springen Funken über: Alle Nachbarfelder wachsen sofort ein Drittel weiter.",
        funken: true },
    { id: "honig", titel: "Honigpflanze", praefix: "Honig", badge: "🍯",
        beschreibung: "Bei der Ernte: +20 Kombo und die Kombo-Zeit wird aufgefüllt.",
        kombo: 20 },
    { id: "kristall", titel: "Kristallpflanze", praefix: "Kristall", badge: "💎",
        beschreibung: "Muss 3-mal angeklickt werden, lässt dafür 5 Saaten fallen.",
        ernteKlicks: 3, goldKugeln: 5 },
    { id: "frost", titel: "Frostpflanze", praefix: "Frost", badge: "🧊",
        beschreibung: "Wächst halb so schnell, ihr Gold ist aber 4-mal so viel wert.",
        tempo: 0.5, goldMulti: 4 },
    { id: "sternpflanze", titel: "Sternenpflanze", praefix: "Sternen", badge: "🌠",
        beschreibung: "Lässt 5 Sternensaaten fallen.",
        sterne: 5 },
    { id: "regenbogen", titel: "Regenbogenpflanze", praefix: "Regenbogen", badge: "🌈",
        beschreibung: "Die Rarität ihrer Saat wird 3-mal gewürfelt, die beste zählt.",
        raritaetsWuerfe: 3 },
    { id: "golden", titel: "Goldene Pflanze", praefix: "Gold", badge: "🌟",
        beschreibung: "Ihre Saat ist immer ein legendärer Jackpot.",
        jackpot: true, chanceProStufe: 0.01, basiskosten: 3500, faktor: 2.2, tarotBonus: { karte: "stern", chance: 0.005 } }
];
const VARIANTE_NACH_ID = Object.fromEntries(VARIANTEN.map(v => [v.id, v]));

// ---------- SHOP: PFLANZEN-UPGRADES (Gold, ein Reiter pro Pflanze) ----------
// Die Kosten wachsen mit dem Wert der Pflanze (wertvollere Pflanze = teurere Upgrades).
// "Ertrag" gibt es von Anfang an. Die anderen schaltet der Ast der Pflanze im Stellarium frei
// (knoten + Pflanzen-id, z.B. "pw_karotte").

const PFLANZEN_UPGRADES = [
    { id: "ertrag", name: "Ertrag", basiskosten: 3, faktor: 1.65, max: Infinity, knoten: null,
        beschreibung: "+25% Verkaufswert. Alle 10 Stufen verdoppelt sich der Wert zusätzlich!",
        info: pflanze => zahl(verkaufswert(pflanze)) + " Gold Grundwert (" + multiText(ertragMulti(pflanze)) + ")" },
    { id: "wachstum", name: "Wachstum", basiskosten: 5, faktor: 1.65, max: 15, knoten: "pw_",
        beschreibung: "-8% Wachstumszeit.",
        info: pflanze => sekText(basisStufenZeitSek(pflanze) * 3) + " bis zur Ernte" },
    { id: "pracht", name: "Prachtexemplar", basiskosten: 12, faktor: 1.8, max: 15, knoten: "pp_",
        beschreibung: "+4% Chance, dass die Farbe ihrer Saat 2-mal gewürfelt wird. Die bessere zählt.",
        info: pflanze => prozentText(prachtChance(pflanze)) + " Chance" },
    { id: "ueberfluss", name: "Überfluss", basiskosten: 20, faktor: 1.9, max: 10, knoten: "pu_",
        beschreibung: "+5% Chance auf eine zusätzliche Saat bei dieser Pflanze.",
        info: pflanze => prozentText(ueberflussChance(pflanze)) + " Chance" }
];
const PFLANZEN_UPGRADE_NACH_ID = Object.fromEntries(PFLANZEN_UPGRADES.map(u => [u.id, u]));

// ---------- SHOP: ALLGEMEINE UPGRADES (Gold) ----------
// Am Anfang gibt es auf dem Markt nur neue Felder und "Ertrag". Diese Upgrades erscheinen erst,
// wenn ihr Stern im Stellarium gekauft ist (knoten).

const SHOP_UPGRADES = [
    { id: "aussaat", knoten: "s_aussaat", icon: "🌰", name: "Schnellere Aussaat", basiskosten: 5, faktor: 1.9, max: 9,
        beschreibung: "-4 Klicks pro Samen.",
        info: () => klicksProSamen() + " Klicks pro Samen" },
    { id: "energie", knoten: "s_energie", icon: "⚡", name: "Längerer Tag", basiskosten: 25, faktor: 2.6, max: 10,
        beschreibung: "+25 Energie pro Tag.",
        info: () => energieMax() + " Energie pro Tag" },
    { id: "kasse", knoten: "s_kasse", icon: "🛎️", name: "Klingelnde Kasse", basiskosten: 30, faktor: 2.2, max: 10,
        beschreibung: "Jeder Klick auf den Samenladen gibt Gold: 0,2% des Werts deiner besten Pflanze pro Stufe.",
        info: () => zahl(klickGold()) + " Gold pro Klick" },
    { id: "sprinkler", knoten: "s_sprinkler", icon: "🚿", name: "Rasensprenger", basiskosten: 40, faktor: 2.5, max: 5,
        beschreibung: "+1 bewässertes Feld pro Tag (wächst doppelt so schnell).",
        info: () => anzahlBewaessert() + " bewässerte Felder pro Tag" },
    { id: "duengerabo", knoten: "s_duengerabo", icon: "🧪", name: "Dünger-Abo", basiskosten: 60, faktor: 2.5, max: 5,
        beschreibung: "+1 gedüngtes Feld pro Tag (doppeltes Gold).",
        info: () => anzahlGeduengt() + " gedüngte Felder pro Tag" },
    { id: "kuhglocke", knoten: "s_kuhglocke", icon: "🔔", name: "Kuhglocke", basiskosten: 50, faktor: 2.3, max: 6,
        beschreibung: "+0,05 Sek. Zeit für die Kombo.",
        info: () => sekText(komboFensterMs() / 1000) + " Kombo-Fenster" },
    { id: "laterne", knoten: "s_laterne", icon: "🏮", name: "Nachtlaterne", basiskosten: 40, faktor: 2.2, max: 5,
        beschreibung: "Glühwürmchen geben +2 Energie mehr.",
        info: () => gluehwuermchenEnergie() + " Energie pro Glühwürmchen" },
    { id: "marktschreier", knoten: "s_marktschreier", icon: "📣", name: "Marktschreier", basiskosten: 80, faktor: 1.55, max: Infinity,
        beschreibung: "+3% Gold aus allen Ernten. Unendlich oft kaufbar.",
        info: () => "+" + prozentText(0.03 * level("marktschreier")) + " Gold" },
    { id: "regentonne", knoten: "s_regentonne", icon: "🛢️", name: "Regentonne", basiskosten: 2000, faktor: 2.4, max: 5,
        beschreibung: "Bewässerte Felder wachsen noch 15% schneller.",
        info: () => "+" + 15 * level("regentonne") + "% Tempo auf bewässerten Feldern" },
    { id: "vogelhaus", knoten: "s_vogelhaus", icon: "🏠", name: "Vogelhäuschen", basiskosten: 1500, faktor: 2.2, max: 5,
        beschreibung: "Sternschnuppen kommen 12% öfter.",
        info: () => "+" + 12 * level("vogelhaus") + "% Sternschnuppen" },
    { id: "saatsortiment", knoten: "s_saatsortiment", icon: "🎒", name: "Saatgut-Sortiment", basiskosten: 5000, faktor: 2.6, max: 5,
        beschreibung: "Alle Spezialpflanzen erscheinen 10% öfter.",
        info: () => "+" + 10 * level("saatsortiment") + "% Spezialpflanzen" }
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
    { id: "mitte", name: "Mitte", icon: "🌾", pos: [0, -60] },
    { id: "pflanzen", name: "Pflanzen", icon: "🌱", pos: [0, -1400] },
    { id: "ernte", name: "Ernte", icon: "🍀", pos: [850, -150] },
    { id: "besondere", name: "Spezialpflanzen", icon: "✨", pos: [1450, 320] },
    { id: "hof", name: "Hof", icon: "🏡", pos: [0, 850] },
    { id: "helfer", name: "Helfer", icon: "🐿️", pos: [-640, 160] },
    { id: "glueck", name: "Glück", icon: "🎲", pos: [-1400, -110] }
];

function stern(id, ast, icon, pos, vor, name, basiskosten, faktor, max, beschreibung, info, extra = {}) {
    return { id, ast, icon, pos, vor, name, basiskosten, faktor, max, beschreibung, info, ...extra };
}

// Stern, der ein Markt-Upgrade freischaltet
function shopStern(id, ast, pos, vor, kosten) {
    const u = SHOP_UPGRADES.find(s => s.knoten === id);
    return { id, ast, icon: u.icon, pos, vor, name: u.name, basiskosten: kosten, faktor: 1, max: 1, art: "shop", markt: u,
        beschreibung: "Schaltet auf dem Markt frei: " + u.name + " (" + u.beschreibung + ")",
        info: () => (level(id) > 0 ? "Auf dem Markt freigeschaltet" : "Noch nicht auf dem Markt") };
}

// Stern, der ein Gluecksspiel freischaltet (einmal kaufen)
function spielStern(id, icon, pos, vor, name, kosten, beschreibung) {
    return { id, ast: "glueck", icon, pos, vor, name, basiskosten: kosten, faktor: 1, max: 1, beschreibung,
        info: () => (level(id) > 0 ? "Freigeschaltet: auf dem Markt unter Glücksspiel" : "Gesperrt") };
}

const SKILLS = [
    // ----- Ernte (rechts): Münz-Farben, jede erst, wenn die vorige komplett ausgebaut ist -----
    stern("gruen", "ernte", "🟢", [300, 0], "p_weizen", "Grüner Daumen", 30, 1.8, 5,
        "+3% Chance auf ungewöhnliche Saaten (grün, x2,5 Gold).",
        () => prozentText(raritaetsChancen()[1]) + " Chance auf Ungewöhnlich"),
    stern("blau", "ernte", "🔵", [520, 0], "gruen", "Blaues Wunder", 150, 1.9, 5,
        "+2% Chance auf seltene Saaten (blau, x5 Gold).",
        () => prozentText(raritaetsChancen()[2]) + " Chance auf Selten", { vorMax: true }),
    stern("lila", "ernte", "🟣", [740, 0], "blau", "Lila Laune", 600, 2, 5,
        "+1% Chance auf epische Saaten (lila, x12,5 Gold).",
        () => prozentText(raritaetsChancen()[3]) + " Chance auf Episch", { vorMax: true }),
    stern("gelb", "ernte", "🟡", [960, 0], "lila", "Goldrausch", 2500, 2.2, 4,
        "+0,5% Chance auf den legendären Jackpot (gelb, x50 Gold).",
        () => prozentText(raritaetsChancen()[4]) + " Chance auf Legendär", { vorMax: true }),
    stern("edelstein", "ernte", "💍", [1180, 0], "gelb", "Edelsteinschleifer", 5000, 2.3, 5,
        "Alle Farb-Multiplikatoren (außer Gewöhnlich) werden um 10% stärker.",
        () => multiText(1 + edelsteinBonus()) + " auf die Farben"),
    stern("sternengold", "ernte", "🔆", [1400, 0], "edelstein", "Sternengold", 8000, 1.4, Infinity,
        "+4% Gold aus allen Ernten. Unendlich oft kaufbar.",
        () => "+" + prozentText(0.04 * level("sternengold")) + " Gold"),
    stern("glueck", "ernte", "🍀", [520, -220], "gruen", "Glückskleeblatt", 60, 1.9, 10,
        "+5% Chance, dass eine Saat doppelt zählt.",
        () => prozentText(glueckChance()) + " Chance auf doppeltes Gold"),
    stern("sternensammler", "ernte", "🌟", [740, -220], "glueck", "Sternensammler", 150, 1.9, 15,
        "+5% Chance, dass eine Sternensaat doppelt zählt.",
        () => prozentText(sternDoppelChance()) + " Chance auf doppelte Sternensamen"),
    stern("sternenklick", "ernte", "💫", [960, -220], "sternensammler", "Sternenklick", 100, 2.2, 10,
        "+1 Sternensamen für jeden Klick auf den Samenladen.",
        () => sternensamenProKlick() + " Sternensamen pro Klick"),
    stern("schwereMuenzen", "ernte", "🪙", [740, -440], "sternensammler", "Schwere Saat", 300, 2, 5,
        "Gewöhnliche Saaten sind 20% mehr wert.",
        () => "+" + prozentText(0.2 * level("schwereMuenzen")) + " auf gewöhnliche Saaten"),
    stern("doppelernte", "ernte", "🌾", [960, -440], "schwereMuenzen", "Doppelernte", 1200, 2.2, 5,
        "+3% Chance, dass eine Ernte doppelt so viele Saaten fallen lässt.",
        () => prozentText(0.03 * level("doppelernte")) + " Chance"),
    stern("fuellhorn", "ernte", "🎁", [1180, -440], "doppelernte", "Füllhorn", 500, 3.5, 5,
        "+100% Gold aus allen Ernten.",
        () => "+" + prozentText(level("fuellhorn")) + " Gold"),
    stern("goldmarie", "ernte", "🌟", [1400, -440], "fuellhorn", "Goldmarie", 30000, 8, 3,
        "Alles Gold aus Ernten wird verdoppelt (jede Stufe noch einmal).",
        () => multiText(Math.pow(2, level("goldmarie"))) + " Gold", { abzeichen: "💰" }),
    stern("ernterausch", "ernte", "🔥", [1180, -220], "sternenklick", "Ernterausch", 1500, 1, 1,
        "Jede 30. Ernte an einem Tag startet einen Ernterausch: 6 Sekunden lang dreifaches Gold.",
        () => (level("ernterausch") > 0 ? "Aktiv" : "Nicht aktiv")),
    stern("sternenstaub", "ernte", "🌠", [740, -660], "schwereMuenzen", "Sternenstaub", 150, 1.8, 10,
        "+20% Sternensamen aus Ernten.",
        () => "+" + prozentText(0.2 * level("sternenstaub")) + " Sternensamen"),
    stern("sternenquelle", "ernte", "⛲", [960, -660], "sternenstaub", "Sternenquelle", 400, 2, 10,
        "Jede Ernte gibt 2 Sternensamen mehr.",
        () => "+" + 2 * level("sternenquelle") + " pro Ernte"),
    stern("sternenflut", "ernte", "🌌", [740, -880], "sternenstaub", "Sternenflut", 20000, 6, 3,
        "Stufe 2 von Sternenstaub: Sternensamen aus Ernten x2 (jede Stufe noch einmal).",
        () => multiText(Math.pow(2, level("sternenflut"))) + " Sternensamen", { vorMax: true, abzeichen: "Ⅱ" }),
    stern("glueck2", "ernte", "☘️", [630, -360], "glueck", "Vierblättriger Klee", 3000, 2.5, 5,
        "Stufe 2 vom Glückskleeblatt: +10% Chance, dass eine Saat doppelt zählt.",
        () => prozentText(glueckChance()) + " Chance auf doppeltes Gold", { vorMax: true, abzeichen: "Ⅱ" }),
    stern("midas", "ernte", "👑", [1400, -220], "ernterausch", "Midas' Berührung", 2500, 1, 1,
        "Jeder legendäre Jackpot lässt zusätzlich eine Sternensaat mit 50 Sternensamen fallen.",
        () => (level("midas") > 0 ? "Aktiv" : "Nicht aktiv")),

    // ----- Neue Sterne am Rand der Aeste -----
    stern("jackpotjaeger", "ernte", "🎰", [1620, -220], "midas", "Jackpot-Jäger", 25000, 4, 3,
        "Legendäre Jackpots sind pro Stufe noch einmal so viel wert (Stufe 1 = doppelt, Stufe 3 = vierfach).",
        () => "x" + (1 + level("jackpotjaeger")) + " Jackpot-Wert"),
    stern("goldschauer", "ernte", "🌦️", [1620, 0], "sternengold", "Goldschauer", 3000, 2.5, 3,
        "Der seltene Goldregen kommt pro Stufe 50% öfter.",
        () => "+" + 50 * level("goldschauer") + "% Goldregen"),
    stern("schnuppenfaenger", "helfer", "🌠", [-960, 660], "magnetfeld", "Sternschnuppen-Fänger", 800, 2, 5,
        "Der Bonus einer gefangenen Sternschnuppe (doppeltes Gold) hält pro Stufe 3 Sekunden länger.",
        () => "+" + 3 * level("schnuppenfaenger") + " Sek. Sternschnuppen-Bonus"),
    stern("kombovirtuose", "helfer", "🎼", [-740, -440], "s_kuhglocke", "Kombo-Virtuose", 3000, 3, 2,
        "Auf der höchsten Kombo-Stufe (ab 150) zählt jeder Klick pro Stufe einmal mehr (x5 wird x6, dann x7).",
        () => "Höchste Kombo: x" + (5 + level("kombovirtuose"))),

    // ----- Jahreszeiten (unten rechts): jede Jahreszeit bekommt einen eigenen Stern -----
    stern("jahresrad", "jahreszeit", "🎡", [800, 720], "s_kasse", "Jahresrad", 300, 2.2, 4,
        "Alle guten Effekte der Jahreszeiten werden um 25% pro Stufe stärker (z.B. Frühling +20% Wachstum wird zu +25%).",
        () => "+" + 25 * level("jahresrad") + "% Jahreszeit-Effekte"),
    stern("bluetenzauber", "jahreszeit", "🌸", [1020, 580], "jahresrad", "Blütenzauber", 400, 2, 3,
        "Im Frühling: +4% Chance auf grüne und +1% auf lila Saat pro Stufe.",
        () => "+" + 4 * level("bluetenzauber") + "% grüne Saat im Frühling"),
    stern("sonnenernte", "jahreszeit", "🌻", [1020, 860], "jahresrad", "Sonnenernte", 400, 2, 3,
        "Im Sommer: +20% Gold aus allen Ernten pro Stufe.",
        () => "+" + 20 * level("sonnenernte") + "% Gold im Sommer"),
    stern("erntedank", "jahreszeit", "🍁", [1240, 580], "bluetenzauber", "Erntedank", 600, 2, 3,
        "Im Herbst: jede Sternensaat ist 25% pro Stufe mehr wert.",
        () => "+" + 25 * level("erntedank") + "% Sternensaat im Herbst"),
    stern("frostschutz", "jahreszeit", "🧣", [1240, 860], "sonnenernte", "Frostschutz", 500, 2.5, 2,
        "Stufe 1: Im Winter wachsen Pflanzen nicht mehr langsamer. Stufe 2: im Winter sogar 10% schneller.",
        () => level("frostschutz") >= 2 ? "Winter: +10% Wachstum" : level("frostschutz") ? "Winter: normales Wachstum" : "Winter: -15% Wachstum"),
    stern("saisonfest", "jahreszeit", "🎊", [1460, 720], "erntedank", "Saisonfest", 2000, 1, 1,
        "Der erste Tag jeder Jahreszeit ist ein Festtag: x1,5 Gold aus allen Ernten.",
        () => (level("saisonfest") > 0 ? "Aktiv" : "Nicht aktiv")),
    stern("sternenkalender", "jahreszeit", "📅", [1460, 960], "frostschutz", "Sternenkalender", 1500, 1, 1,
        "Bei jedem Wechsel der Jahreszeit bekommst du Sternensamen geschenkt (mehr, je besser deine beste Pflanze ist).",
        () => (level("sternenkalender") > 0 ? "Aktiv" : "Nicht aktiv")),

    // ----- Helfer (links) -----
    stern("radius", "helfer", "🖐️", [-520, -220], "kombo", "Breiter Cursor", 150, 1.35, 30,
        "+10% Radius um deinen Cursor. Er sammelt Saaten ein und erntet beim Klicken alle fertigen " +
            "Pflanzen, die er berührt. Bis Stufe 30.",
        () => sammelRadius().toFixed(1).replace(".", ",") + " Pixel Radius"),
    stern("vogelscheuche", "helfer", "🧑‍🌾", [-300, 220], "kombo", "Vogelscheuche", 250, 1, 1,
        "Die Vogelscheuche im Hof verscheucht jeden Tag die erste Krähe von allein.",
        () => (level("vogelscheuche") > 0 ? "Aktiv: 1 Krähe pro Tag" : "Nicht aktiv"),
        { erledigt: () => (metaLevel("vogelscheuchenlehre") > 0 ? "Vogelscheuchen-Lehre (Mondteich)" : null) }),
    stern("kombo", "helfer", "🥁", [-300, 0], "p_weizen", "Kombo-Meister", 40, 2, 10,
        "+0,1 Sek. Zeit zwischen zwei Klicks, bevor die Kombo abbricht.",
        () => sekText(komboFensterMs() / 1000) + " Kombo-Fenster"),
    shopStern("s_kuhglocke", "helfer", [-740, -220], "kombo", 300),
    stern("eichhoernchen", "helfer", "🐿️", [-520, 220], "kombo", "Eichhörnchen-Helfer", 100, 1.85, 20,
        "Drückt automatisch den Samenladen (baut keine Kombo auf, gibt keine Sternensamen).",
        () => helferKlicksProSek() + " Klicks pro Sekunde"),
    stern("haustiertraining", "helfer", "🐾", [-740, 0], "kombo", "Begleiter-Training", 200, 2, 5,
        "Dein Begleiter hilft öfter und sammelt liegende Saaten für dich ein.",
        () => prozentText(haustierHilfeChance()) + " Chance alle " + KONFIG.haustierHilfeSek + " Sek."),
    stern("igel", "helfer", "🦔", [-740, 220], "eichhoernchen", "Igel-Sammler", 150, 1.85, 20,
        "Igel laufen zur gelandeten Saat und sammeln sie ein. Mehr Stufen: schnellere Igel, alle 5 Stufen ein Igel mehr.",
        () => igelAnzahl() + (igelAnzahl() === 1 ? " Igel" : " Igel") + ", Tempo " + igelTempo()),
    stern("saatspatz", "helfer", "🐦", [-520, 440], "eichhoernchen", "Saat-Spatz", 800, 2.2, 5,
        "Ein Spatz wirft regelmäßig einen Samen auf ein freies Feld.",
        () => (level("saatspatz") > 0 ? "Alle " + sekText(spatzIntervallSek()) : "Noch kein Spatz")),
    stern("gluehglas", "helfer", "🫙", [-740, 440], "saatspatz", "Glühwürmchenglas", 900, 2, 4,
        "Glühwürmchen kommen 25% öfter.",
        () => "+" + prozentText(0.25 * level("gluehglas")) + " Glühwürmchen"),
    stern("biene", "helfer", "🐝", [-960, 220], "igel", "Bienenstock", 1500, 2.1, 5,
        "Bienen besuchen deine Pflanzen: regelmäßig wächst eine Pflanze sofort ein Drittel weiter.",
        () => (level("biene") > 0 ? "Alle " + sekText(bienenIntervallSek()) : "Noch keine Bienen")),
    stern("magnetfeld", "helfer", "🧲", [-960, 440], "biene", "Magnetfeld", 2000, 2.4, 3,
        "Gelandete Saaten rollen langsam zu deinem Cursor.",
        () => magnetStaerke() + " Pixel pro Sekunde"),
    stern("eichhoernchen2", "helfer", "🐿️", [-740, 660], "eichhoernchen", "Eichhörnchen-Kolonie", 8000, 1.9, 10,
        "Stufe 2 der Eichhörnchen: +2 automatische Klicks pro Sekunde.",
        () => helferKlicksProSek() + " Klicks pro Sekunde", { vorMax: true, abzeichen: "Ⅱ" }),
    stern("erntehase", "helfer", "🐇", [-520, -440], "radius", "Erntehase", 600, 2.3, 5,
        "Ein Hase hoppelt über den Acker und erntet regelmäßig eine fertige Pflanze für dich.",
        () => (level("erntehase") > 0 ? "Alle " + sekText(erntehaseSek()) : "Noch kein Hase")),
    stern("sternhoernchen", "helfer", "🌰", [-340, 420], "eichhoernchen", "Sternenhörnchen", 900, 1, 1,
        "Eichhörnchen-Klicks geben jetzt auch Sternensamen (1 für je 2 Klicks).",
        () => (level("sternhoernchen") > 0 ? "Aktiv" : "Nicht aktiv")),
    stern("helferlohn", "helfer", "💪", [-560, 680], "sternhoernchen", "Fleißige Pfoten", 3000, 1, 1,
        "Jeder Klick eines Eichhörnchens zählt doppelt.",
        () => (level("helferlohn") > 0 ? "Aktiv" : "Nicht aktiv")),

    // ----- Glueck (links aussen, haengt am Helfer-Ast) -----
    spielStern("muenzwurf", "🪙", [-960, 0], "haustiertraining", "Münzwurf", 200,
        "Schaltet den Münzwurf auf dem Markt frei: Setz einen Teil deines Goldes. Kopf = doppelt, Zahl = weg."),
    spielStern("gacha", "🎰", [-1180, 0], "muenzwurf", "Gacha-Automat", 500,
        "Schaltet den Gacha-Automaten auf dem Markt frei: Gold einwerfen, zufällige Belohnung ziehen."),
    spielStern("rubbellos", "🎟️", [-1400, 0], "gacha", "Rubbellose", 1200,
        "Schaltet Rubbellose auf dem Markt frei: 9 Felder aufrubbeln, 3 gleiche Symbole gewinnen."),
    spielStern("huehnerrennen", "🐔", [-1620, 0], "rubbellos", "Hühnerrennen", 2500,
        "Schaltet das Hühnerrennen auf dem Markt frei: Wette auf ein Huhn, je größer der Außenseiter, desto höher der Gewinn."),
    spielStern("plinko", "🔻", [-1840, 0], "huehnerrennen", "Samen-Plinko", 4000,
        "Schaltet Samen-Plinko auf dem Markt frei: Ein Samen hüpft durch Nägel in ein Gewinnfach."),
    stern("glueckstraehne", "glueck", "🍀", [-960, -220], "muenzwurf", "Glückssträhne", 400, 2, 5,
        "+3% Glück bei allen Glücksspielen (mehr Gewinnchance).",
        () => "+" + prozentText(glueckBonus()) + " Glück"),
    stern("gluecksrabatt", "glueck", "🏷️", [-1180, -220], "gacha", "Stammtisch-Rabatt", 800, 2, 5,
        "Der Gacha-Automat ist 10% billiger.",
        () => "-" + prozentText(0.1 * level("gluecksrabatt")) + " Gacha-Preis"),
    stern("stammkunde", "glueck", "🎫", [-1400, -220], "rubbellos", "Stammkunde", 1500, 2.5, 3,
        "+1 Spiel pro Pause bei Münzwurf, Rubbellos, Hühnerrennen und Plinko.",
        () => "+" + level("stammkunde") + " Spiele pro Pause"),
    stern("haendlerfreund", "glueck", "🧳", [-1620, -220], "huehnerrennen", "Händlerfreund", 2000, 2.5, 2,
        "Der Wanderhändler kommt öfter vorbei.",
        () => prozentText(haendlerChance()) + " Chance nach jedem Tag"),

    // ----- Hof (unten): schaltet die meisten Markt-Upgrades frei -----
    shopStern("s_aussaat", "hof", [0, 300], "p_weizen", 20),
    shopStern("s_energie", "hof", [-220, 520], "s_aussaat", 60),
    stern("giessen", "hof", "💧", [0, 520], "s_aussaat", "Gießkanne", 50, 2, 8,
        "Jeden Tag wird ein zufälliges Feld bewässert 💧: Es wächst den ganzen Tag doppelt so schnell.",
        () => anzahlBewaessert() + " bewässerte Felder pro Tag"),
    stern("feldvermessung", "hof", "📐", [220, 520], "s_aussaat", "Feldvermessung", 200, 2, 8,
        "Neue Felder kosten 8% weniger.",
        () => "-" + prozentText(1 - Math.pow(0.92, level("feldvermessung"))) + " Feldpreis"),
    stern("sonnenuhr", "hof", "🕰️", [-440, 740], "s_energie", "Sonnenuhr", 150, 1.9, 10,
        "+10 Energie pro Tag.",
        () => energieMax() + " Energie pro Tag"),
    stern("fruehaufsteher", "hof", "🐓", [-220, 740], "s_energie", "Frühaufsteher", 80, 1.9, 8,
        "Jeder Tag beginnt mit bereits gepflanzten Samen.",
        () => level("fruehaufsteher") + " Samen zum Tagesstart"),
    stern("duengen", "hof", "🪱", [0, 740], "giessen", "Dünger", 100, 2, 8,
        "Jeden Tag wird ein zufälliges Feld gedüngt 🪱: Es gibt den ganzen Tag doppeltes Gold.",
        () => anzahlGeduengt() + " gedüngte Felder pro Tag"),
    shopStern("s_sprinkler", "hof", [220, 740], "giessen", 400),
    shopStern("s_kasse", "hof", [440, 740], "feldvermessung", 800),
    stern("morgentau", "hof", "🌅", [-440, 960], "sonnenuhr", "Morgentau", 600, 2, 4,
        "Im ersten Fünftel des Tages wachsen alle Pflanzen 25% schneller.",
        () => "+" + prozentText(0.25 * level("morgentau")) + " Wachstum am Morgen"),
    stern("doppelwurf", "hof", "🎯", [-220, 960], "fruehaufsteher", "Doppelwurf", 250, 2, 8,
        "+10% Chance, dass ein fertiger Samen einen zweiten Samen mitbringt.",
        () => prozentText(doppelwurfChance()) + " Chance"),
    shopStern("s_duengerabo", "hof", [0, 960], "duengen", 900),
    stern("zinsen", "hof", "🐷", [440, 960], "s_kasse", "Sparschwein", 700, 2.2, 5,
        "Bei Feierabend bekommst du 2% Zinsen auf dein Gold (höchstens die Hälfte der nächsten Rechnung).",
        () => prozentText(zinsSatz()) + " Zinsen pro Tag"),
    stern("wetterfrosch", "hof", "🐸", [-440, 1180], "morgentau", "Wetterfrosch", 1500, 2.2, 3,
        "Wetter kommt öfter, und gutes Wetter ist wahrscheinlicher.",
        () => prozentText(wetterChance()) + " Chance auf Wetter pro Tag"),
    stern("abendsonne", "hof", "🌇", [-220, 1180], "doppelwurf", "Abendsonne", 1800, 2, 4,
        "Ernten im letzten Drittel des Tages geben 15% mehr Gold.",
        () => "+" + prozentText(0.15 * level("abendsonne")) + " Gold am Abend"),
    shopStern("s_marktschreier", "hof", [0, 1180], "s_duengerabo", 5000),
    shopStern("s_regentonne", "hof", [220, 1400], "wurmhumus", 2500),
    shopStern("s_vogelhaus", "hof", [-220, 1620], "s_laterne", 1800),
    shopStern("s_saatsortiment", "hof", [0, 1620], "vorratskammer", 4000),
    stern("lagerhaus", "hof", "🏚️", [440, 1180], "zinsen", "Lagerhaus", 2500, 2.3, 4,
        "Zinsen dürfen 25% der nächsten Rechnung mehr betragen.",
        () => "Zinsen bis " + prozentText(zinsDeckelAnteil()) + " der Rechnung"),
    shopStern("s_laterne", "hof", [-220, 1400], "abendsonne", 1200),
    stern("nachtwache", "hof", "🦉", [-440, 1400], "wetterfrosch", "Nachtwache", 3000, 2.2, 3,
        "Glühwürmchen geben 50% mehr Energie.",
        () => gluehwuermchenEnergie() + " Energie pro Glühwürmchen"),
    stern("gewaechshaus", "hof", "🏡", [220, 960], "s_sprinkler", "Gewächshaus", 300, 2.5, 4,
        "Pflanzen auf bewässerten Feldern geben 50% mehr Gold.",
        () => "+" + prozentText(0.5 * level("gewaechshaus")) + " Gold auf bewässerten Feldern"),
    stern("wurmhumus", "hof", "🪱", [220, 1180], "gewaechshaus", "Wurmhumus", 1600, 1, 1,
        "Gedüngte Felder geben dreifaches statt doppeltes Gold.",
        () => (level("wurmhumus") > 0 ? "x3 Gold auf gedüngten Feldern" : "x2 Gold auf gedüngten Feldern")),
    stern("vorratskammer", "hof", "🥫", [0, 1400], "s_marktschreier", "Vorratskammer", 1200, 1, 1,
        "Saaten, die bei Feierabend noch liegen, werden automatisch eingesammelt statt zu verfallen.",
        () => (level("vorratskammer") > 0 ? "Aktiv" : "Nicht aktiv"),
        { erledigt: () => (istVerstaerkt("tod") ? "Der Tod (Tarotkarte, verbessert und ausgerüstet)" : null) }),
    stern("erntefest", "hof", "🎪", [440, 1400], "lagerhaus", "Erntefest", 900, 3, 3,
        "Am Rechnungstag (jeder 5. Tag) gibt es +100% Gold aus allen Ernten.",
        () => "+" + prozentText(level("erntefest")) + " Gold am Rechnungstag")
];

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
        beschreibung: "+" + prozentText(chanceProStufe) + " Chance pro Samen. " + variante.beschreibung,
        chanceProStufe,
        info: () => prozentText(variantenChance(variante)) + " Chance pro Samen"
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
        beschreibung: (index === 0 ? "Deine erste Pflanze und die Mitte des Stellariums." :
            p.name + " wächst danach auf deinen Feldern und bekommt einen eigenen Reiter auf dem Markt.") +
            (p.eigenschaftText ? " " + p.eigenschaftText : ""),
        info: () => "Grundwert " + zahl(p.verkaufswert) + " Gold, " + sekText(p.sekProStufe * 3) + " bis zur Ernte"
    });
    const shopAst = (praefix, upgradeId, pos, vor, faktor) => {
        const u = PFLANZEN_UPGRADE_NACH_ID[upgradeId];
        SKILLS.push({
            id: praefix + p.id, ast: "pflanzen", icon: p.emoji, abzeichen: praefix === "pw_" ? "⏱️" : praefix === "pp_" ? "🎨" : "➕",
            pos, vor, name: p.name + ": " + u.name, basiskosten: rundePreis(basis * faktor), faktor: 1, max: 1, art: "pflanzenShop",
            markt: u, marktReiter: p.name,
            beschreibung: "Schaltet auf dem Markt-Reiter " + p.name + " frei: " + u.name + " (" + u.beschreibung + ")",
            info: () => (level(praefix + p.id) > 0 ? "Auf dem Markt freigeschaltet" : "Noch nicht auf dem Markt")
        });
    };
    shopAst("pw_", "wachstum", versatz.pw, "p_" + p.id, 0.15);
    shopAst("pp_", "pracht", versatz.pp, "pw_" + p.id, 0.25);
    shopAst("pu_", "ueberfluss", versatz.pu, "p_" + p.id, 0.35);
    SKILLS.push({
        id: "pb_" + p.id, ast: "pflanzen", icon: p.emoji, abzeichen: "⭐", pos: versatz.pb, vor: "pu_" + p.id,
        name: p.bonusName, basiskosten: rundePreis(basis * 0.6), faktor: 1, max: 1,
        beschreibung: p.bonusText,
        info: () => (level("pb_" + p.id) > 0 ? "Aktiv" : "Nicht aktiv")
    });
    // Goldader: Sternensamen direkt in Gold verwandeln (+300% Wert pro Stufe fuer genau diese Pflanze)
    SKILLS.push({
        id: "pg_" + p.id, ast: "pflanzen", icon: p.emoji, abzeichen: "💰", pos: versatz.pg, vor: "pb_" + p.id,
        name: p.name + ": Goldader", basiskosten: rundePreis(basis * 2), faktor: 5, max: 3,
        beschreibung: "+300% Wert für " + p.name + " (jede Stufe noch einmal +300%).",
        info: () => "+" + 300 * level("pg_" + p.id) + "% Wert"
    });
});

const SKILL_NACH_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

// ----- Kurztexte fuer das Stellarium: ein Stichpunkt pro Stern und die Wirkung als Zahl je Stufe ("Jetzt -> Naechste") -----
const STERN_KURZ = {
    gruen: "Mehr grüne Saat (x2,5 Gold)", blau: "Mehr blaue Saat (x5 Gold)", lila: "Mehr lila Saat (x12,5 Gold)",
    gelb: "Mehr Jackpots (x50 Gold)", edelstein: "Farben geben mehr Gold", sternengold: "Mehr Gold · unendlich",
    glueck: "Saat zählt doppelt", sternensammler: "Sternensaat zählt doppelt", sternenklick: "Sternensamen pro Klick",
    schwereMuenzen: "Gewöhnliche Saat mehr wert", doppelernte: "Doppelt so viel Saat", fuellhorn: "Mehr Gold",
    goldmarie: "Gold verdoppeln", ernterausch: "Jede 30. Ernte: 6 Sek. x3 Gold", sternenstaub: "Mehr Sternensamen",
    sternenquelle: "Sternensamen pro Ernte", sternenflut: "Sternensamen verdoppeln", glueck2: "Saat zählt doppelt",
    midas: "Jackpot: +50 Sternensamen", radius: "Größerer Cursor", vogelscheuche: "Verscheucht die 1. Krähe",
    kombo: "Mehr Zeit für die Kombo", eichhoernchen: "Klicken den Samenladen", haustiertraining: "Begleiter sammelt öfter",
    igel: "Igel sammeln Saat ein", saatspatz: "Spatz pflanzt Samen", gluehglas: "Mehr Glühwürmchen",
    biene: "Bienen lassen Pflanzen wachsen", magnetfeld: "Saat rollt zum Cursor", eichhoernchen2: "Mehr Eichhörnchen-Klicks",
    erntehase: "Hase erntet für dich", sternhoernchen: "Eichhörnchen geben Sternensamen", helferlohn: "Eichhörnchen-Klicks x2",
    glueckstraehne: "Mehr Glück beim Spielen", gluecksrabatt: "Gacha billiger", stammkunde: "Mehr Spiele pro Pause",
    haendlerfreund: "Händler kommt öfter", giessen: "Felder bewässern (x2 Tempo)", feldvermessung: "Felder billiger",
    sonnenuhr: "Mehr Energie", fruehaufsteher: "Samen zum Tagesstart", duengen: "Felder düngen (x2 Gold)",
    morgentau: "Morgens schneller wachsen", doppelwurf: "Zweiter Samen", zinsen: "Zinsen bei Feierabend",
    wetterfrosch: "Mehr gutes Wetter", abendsonne: "Abends mehr Gold", lagerhaus: "Höhere Zinsen erlaubt",
    nachtwache: "Glühwürmchen: mehr Energie", gewaechshaus: "Bewässert: mehr Gold", wurmhumus: "Gedüngt: x3 statt x2 Gold",
    vorratskammer: "Liegende Saat wird eingesammelt", erntefest: "Rechnungstag: mehr Gold",
    muenzwurf: "Glücksspiel: Münzwurf", gacha: "Glücksspiel: Gacha-Automat", rubbellos: "Glücksspiel: Rubbellose",
    huehnerrennen: "Glücksspiel: Hühnerrennen", plinko: "Glücksspiel: Samen-Plinko",
    jahresrad: "Jahreszeiten stärker", bluetenzauber: "Frühling: bunte Saat", sonnenernte: "Sommer: mehr Gold",
    erntedank: "Herbst: mehr Sternensaat", frostschutz: "Winter ohne Malus", saisonfest: "1. Tag der Jahreszeit x1,5",
    sternenkalender: "Geschenk beim Jahreszeitwechsel", jackpotjaeger: "Jackpots mehr wert", goldschauer: "Öfter Goldregen",
    schnuppenfaenger: "Sternschnuppen-Bonus länger", kombovirtuose: "Höchste Kombo stärker"
};

// s = Stufe. Zeigt, was der Stern auf dieser Stufe insgesamt bringt.
const STERN_WIRKUNG = {
    gruen: s => "+" + 3 * s + "% grüne Saat", blau: s => "+" + 2 * s + "% blaue Saat", lila: s => "+" + s + "% lila Saat",
    gelb: s => "+" + prozentText(0.005 * s) + " Jackpots", edelstein: s => "+" + 10 * s + "% Farb-Bonus",
    sternengold: s => "+" + 4 * s + "% Gold", glueck: s => "+" + 5 * s + "% Doppel-Saat",
    sternensammler: s => "+" + 5 * s + "% Doppel-Sternensaat", sternenklick: s => "+" + s + " ✨ pro Klick",
    schwereMuenzen: s => "+" + 20 * s + "% Wert", doppelernte: s => "+" + 3 * s + "% Doppelernte",
    fuellhorn: s => "+" + 100 * s + "% Gold", goldmarie: s => "x" + Math.pow(2, s) + " Gold",
    sternenstaub: s => "+" + 20 * s + "% ✨", sternenquelle: s => "+" + 2 * s + " ✨ pro Ernte",
    sternenflut: s => "x" + Math.pow(2, s) + " ✨", glueck2: s => "+" + 10 * s + "% Doppel-Saat",
    radius: s => "+" + Math.round((Math.pow(KONFIG.sammelRadiusFaktor, s) - 1) * 100) + "% Cursor",
    kombo: s => "+" + (0.1 * s).toFixed(1).replace(".", ",") + " Sek. Kombo", eichhoernchen: s => s + " Klicks/Sek.",
    eichhoernchen2: s => "+" + 2 * s + " Klicks/Sek.", haustiertraining: s => "+" + 10 * s + "% Hilfe",
    igel: s => Math.min(4, 1 + Math.floor((s - 1) / 5)) + " Igel · Tempo " + (90 + 14 * s),
    saatspatz: s => "alle " + sekText(20 / s), gluehglas: s => "+" + 25 * s + "% Glühwürmchen",
    biene: s => "alle " + sekText(12 / s), magnetfeld: s => 40 * s + " Pixel/Sek.", erntehase: s => "alle " + sekText(12 / s),
    glueckstraehne: s => "+" + 3 * s + "% Glück", gluecksrabatt: s => "-" + 10 * s + "% Preis", stammkunde: s => "+" + s + " Spiele",
    haendlerfreund: s => "+" + 50 * s + "% Chance", giessen: s => s + " Felder 💧",
    feldvermessung: s => "-" + Math.round((1 - Math.pow(0.92, s)) * 100) + "% Feldpreis", sonnenuhr: s => "+" + 10 * s + " Energie",
    fruehaufsteher: s => s + " Samen", duengen: s => s + " Felder 🪱", morgentau: s => "+" + 25 * s + "% Wachstum",
    doppelwurf: s => "+" + 10 * s + "% Doppelwurf", zinsen: s => 2 * s + "% Zinsen", wetterfrosch: s => "+" + 30 * s + "% Wetter",
    abendsonne: s => "+" + 15 * s + "% Gold", lagerhaus: s => "+" + 25 * s + "% Deckel", nachtwache: s => "+" + 50 * s + "% Energie",
    gewaechshaus: s => "+" + 50 * s + "% Gold", erntefest: s => "+" + 100 * s + "% Gold",
    jahresrad: s => "+" + 25 * s + "% Jahreszeit-Effekte", bluetenzauber: s => "+" + 4 * s + "% grüne Saat",
    sonnenernte: s => "+" + 20 * s + "% Gold im Sommer", erntedank: s => "+" + 25 * s + "% Sternensaat im Herbst",
    frostschutz: s => (s >= 2 ? "+10% Wachstum im Winter" : "kein Winter-Malus"),
    jackpotjaeger: s => "x" + (1 + s) + " Jackpot", goldschauer: s => "+" + 50 * s + "% Goldregen",
    schnuppenfaenger: s => "+" + 3 * s + " Sek. Bonus", kombovirtuose: s => "Kombo bis x" + (5 + s)
};

SKILLS.forEach(def => {
    if (STERN_KURZ[def.id]) def.kurz = STERN_KURZ[def.id];
    if (STERN_WIRKUNG[def.id]) def.wirkung = STERN_WIRKUNG[def.id];
    if (def.art === "shop" && !def.kurz) def.kurz = "Markt: " + def.name;
    if (def.id.startsWith("p_")) def.kurz = "Neue Pflanze · Grundwert " + zahl(PFLANZEN_VORLAGEN.find(p => p.id === def.pflanze).verkaufswert) + " Gold";
    if (def.art === "pflanzenShop") def.kurz = "Markt: " + def.name.split(": ")[1];
    if (def.id.startsWith("pg_")) {
        def.kurz = "Mehr Wert für " + def.name.split(":")[0];
        def.wirkung = s => "+" + 300 * s + "% Wert";
    }
    if (def.variante) {
        def.kurz = "Spezialpflanze: " + def.variante.titel;
        def.wirkung = s => prozentText(def.chanceProStufe * s) + " Chance";
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
            { name: "Berta", quote: 2, farbe: "#ffffff" },
            { name: "Gackerella", quote: 3, farbe: "#f5d547" },
            { name: "Rudi", quote: 4, farbe: "#c9661c" },
            { name: "Flitzi", quote: 8, farbe: "#6b3f1d" }
        ] },
    // Plinko: 8 Reihen Naegel, der Samen faellt in eines von 9 Faechern (Erwartungswert ca. 0,94)
    plinko: { proPause: 3, einsaetze: [0.05, 0.1, 0.25], reihen: 8,
        faecher: [8, 3, 1.3, 0.6, 0.3, 0.6, 1.3, 3, 8] }
};

// ---------- GACHA-AUTOMAT (auf dem Markt, mit Gold) ----------
// Teuer, dafuer gilt jeder Preis fuer den ganzen Run (run.gachaBoni) oder sogar fuer immer (Kuschel-Gutschein).
// Kosten: GACHA_KONFIG.anteil der naechsten Rechnung (Sandbox: des naechsten Meilensteins), jeder Zug im Run x faktor.
// raritaet = Farbe des Preises (Index in RARITAETEN). bonus/wert = was in run.gachaBoni dazukommt.

const GACHA_KONFIG = { anteil: 0.75, faktor: 1.6, mindestPreis: 20 };

const GACHA_PREISE = [
    { name: "Gewürzmischung", symbol: "🧂", gewicht: 30, raritaet: 0, bonus: "gold", wert: 0.08,
        text: w => "+" + prozentText(w) + " Gold aus allen Ernten (ganzer Run)" },
    { name: "Große Samentüte", symbol: "🛍️", gewicht: 26, raritaet: 0, bonus: "klicks", wert: 1,
        text: w => "-" + w + " Klick pro Samen (ganzer Run)" },
    { name: "Wachstumselixier", symbol: "🧪", gewicht: 18, raritaet: 1, bonus: "wachstum", wert: 0.06,
        text: w => "Pflanzen wachsen " + prozentText(w) + " schneller (ganzer Run)" },
    { name: "Sternenstaub-Dose", symbol: "✨", gewicht: 15, raritaet: 1, bonus: "sterne", wert: 0.12,
        text: w => "+" + prozentText(w) + " Sternensamen aus Ernten (ganzer Run)" },
    { name: "Glücksklee", symbol: "☘️", gewicht: 8, raritaet: 2, bonus: "glueck", wert: 0.04,
        text: w => "+" + prozentText(w) + " Chance, dass eine Saat doppelt zählt (ganzer Run)" },
    { name: "Zufälliges Werkzeug", symbol: "🧰", gewicht: 4, raritaet: 3, werkzeug: true,
        text: () => "Ein zufälliges Werkzeug auf der aktuellen Stufe (bei vollen Plätzen: Gold zurück)" },
    { name: "Kuschel-Gutschein", symbol: "🎟️", gewicht: 3, raritaet: 3, gutschein: true,
        text: () => "Ein Gutschein für den Kuschel-Automaten im Mondteich (bleibt für immer)" },
    { name: "Goldene Gießkanne", symbol: "🏆", gewicht: 1, raritaet: 4, bonus: "felder", wert: 1,
        text: w => "+" + w + " bewässertes und +" + w + " gedüngtes Feld an jedem Tag (ganzer Run)" }
];

// ---------- SEGEN: nach jeder bezahlten Rechnung 1 von 3 waehlen, gilt fuer den ganzen Run ----------
// Mehrfach waehlbar, die Wirkung stapelt sich. Die Effekte stehen in script.js (segen("id") = Stufe).

const SEGEN = [
    { id: "sparfuchs", badge: "🐷", name: "Sparfuchs", text: "Alle weiteren Rechnungen in diesem Run kosten 8% weniger." },
    { id: "fruehstueck", badge: "☕", name: "Kräftiges Frühstück", text: "+25 Energie an jedem Tag." },
    { id: "erntesegen", badge: "🧺", name: "Erntesegen", text: "+8% Chance auf eine zusätzliche Saat pro Ernte." },
    { id: "goldhaende", badge: "🪙", name: "Goldene Hände", text: "+15% Gold aus allen Ernten." },
    { id: "keimkraft", badge: "🌱", name: "Keimkraft", text: "Jedes freie Feld hat zum Tagesstart 12% Chance, schon einen Samen zu haben." },
    { id: "kompost", badge: "🪱", name: "Kompost", text: "Jedes Feld hat jeden Tag 8% Chance, gedüngt zu sein (doppeltes Gold)." },
    { id: "regenwolke", badge: "🌧️", name: "Regenwolke", text: "Jedes Feld hat jeden Tag 8% Chance, bewässert zu sein (wächst doppelt so schnell)." },
    { id: "flink", badge: "👐", name: "Flinke Hände", text: "-4 Klicks pro Samen." },
    { id: "wissen", badge: "📚", name: "Wissensdurst", text: "+15% Chance, dass eine Sternensaat doppelt zählt." },
    { id: "glueckspilz", badge: "🍄", name: "Glückspilz", text: "+2% Chance auf epische Saaten." },
    { id: "wachstum", badge: "🌿", name: "Wachstumsschub", text: "Alle Pflanzen wachsen 10% schneller." },
    { id: "sternenstaub", badge: "🌠", name: "Sternenstaub", text: "Sternschnuppen kommen 30% öfter und geben 3 Sekunden länger doppeltes Gold." },
    { id: "rhythmus", badge: "🥁", name: "Rhythmusgefühl", text: "+0,1 Sek. Zeit für die Kombo." },
    { id: "nachteule", badge: "🦉", name: "Nachteule", text: "Glühwürmchen kommen doppelt so oft." },
    { id: "tierfreund", badge: "🐾", name: "Tierfreund", text: "Deinen Begleiter zu streicheln gibt doppelt so viel Gold." },
    { id: "wetterglueck", badge: "🌦️", name: "Wetterglück", text: "Wetter kommt doppelt so oft, schlechtes Wetter halb so oft." },
    { id: "glueckskind", badge: "🎲", name: "Glückskind", text: "+5% Glück bei allen Glücksspielen." },
    { id: "mondschein", badge: "🌙", name: "Mondscheinbauer", text: "Ernten am Abend und in der Nacht geben 20% mehr Gold." },
    { id: "saisonkind", badge: "🍂", name: "Kind der Jahreszeiten", text: "Die Effekte der Jahreszeiten sind doppelt so stark." },
    { id: "klingeling", badge: "🔔", name: "Klingeling", text: "Jeder Klick auf den Samenladen gibt 1 Sternensamen mehr." },
    { id: "riesenwuchs", badge: "🥕", name: "Riesenwuchs", text: "10% Chance, dass eine Ernte doppelt so viel wert ist." },
    { id: "morgenstund", badge: "🌅", name: "Morgenstund", text: "In der ersten Hälfte des Tages gibt es 20% mehr Gold." },
    { id: "sparsam", badge: "📐", name: "Sparsamer Bauer", text: "Neue Felder kosten 15% weniger." },
    { id: "kraehenkoenig", badge: "👑", name: "Krähenkönig", text: "Verscheuchte Krähen lassen 5-mal so viele Sternensamen fallen." },
    { id: "sternenhunger", badge: "🌌", name: "Sternenhunger", text: "Jede Sternensaat ist 25% mehr wert." },
    { id: "jackpotfieber", badge: "🎰", name: "Jackpotfieber", text: "+1% Chance auf legendäre Jackpots." },
    { id: "gluehfreund", badge: "🪲", name: "Glühwürmchen-Freund", text: "Glühwürmchen geben doppelt so viele Sternensamen." },
    { id: "gutesaat", badge: "🌾", name: "Gute Saat", text: "Gewöhnliche Saat ist 50% mehr wert." },
    { id: "komborausch", badge: "🎵", name: "Kombo-Rausch", text: "Jeder 4. Klick zählt für die Kombo doppelt." }
];
const SEGEN_NACH_ID = Object.fromEntries(SEGEN.map(s => [s.id, s]));

// ---------- PFLANZEN-MEISTERSCHAFT (dauerhaft) ----------
// Jede Pflanze sammelt ueber alle Runs Ernten. Bei diesen Zahlen steigt ihre Meisterschaft um 1 Stufe,
// jede Stufe gibt dauerhaft +8% Verkaufswert fuer genau diese Pflanze.

const MEISTER_SCHWELLEN = [50, 250, 1000, 3000, 8000, 20000, 50000];
const MEISTER_BONUS = 0.08;

// ---------- MONDPHASEN (Schwierigkeitsstufen) ----------
// Im Mondteich waehlbar. Jede Phase ist schwerer als die vorige (Regeln gelten zusammen),
// gibt dafuer mehr Mondblueten. Die naechste Phase wird frei, wenn man in der hoechsten freien Phase
// 6 Rechnungen in einem Run bezahlt.

const MONDPHASEN = [
    { symbol: "🌑", name: "Neumond", text: "Die normalen Regeln." },
    { symbol: "🌒", name: "Sichelmond", text: "Alle Rechnungen kosten 20% mehr." },
    { symbol: "🌓", name: "Halbmond", text: "Jede 2. Rechnung ist ein Kredit mit Auflage." },
    { symbol: "🌔", name: "Dreiviertelmond", text: "10% weniger Energie pro Tag." },
    { symbol: "🌕", name: "Vollmond", text: "Es kommen mehr Krähen, und Segen gibt es nur noch 3 zur Auswahl." },
    { symbol: "✨", name: "Sternenmond", text: "Jede Rechnung steigt um x3 mehr als sonst (z.B. x28 statt x25)." }
];
const MONDPHASE_BONUS = 0.3;          // +30% Mondblueten pro Phase
const MONDPHASE_FREI_AB_RECHNUNGEN = 6;

// ---------- JAHRESZEITEN ----------
// Jeder Run beginnt im Fruehling. Alle 5 Tage (ein Rechnungs-Abschnitt) wechselt die Jahreszeit, danach geht es von vorn los.
// wachstum/energie/gold/sterne = Faktoren, wetter = Gewichte fuer das Wetter (0 = kommt nie), partikel = Stimmung im Hof

const JAHRESZEITEN_KONFIG = { tageProJahreszeit: 5 };

const JAHRESZEITEN = [
    { id: "fruehling", name: "Frühling", symbol: "🌸", farbe: "#ff9ad5", text: "Pflanzen wachsen 20% schneller.",
        wachstum: 1.2, wetter: { regen: 2, regenbogen: 2, hitze: 0.3 }, partikel: "bluete" },
    { id: "sommer", name: "Sommer", symbol: "☀️", farbe: "#ffd93d", text: "20% mehr Energie pro Tag.",
        energie: 1.2, sandbox: { gold: 1.1, text: "10% mehr Gold aus allen Ernten." }, wetter: { hitze: 2.5, gewitter: 1.5, nebel: 0.3 }, partikel: "schmetterling" },
    { id: "herbst", name: "Herbst", symbol: "🍂", farbe: "#e8902a", text: "15% mehr Gold aus allen Ernten.",
        gold: 1.15, wetter: { nebel: 2, regen: 1.5, hitze: 0.3 }, partikel: "blatt" },
    { id: "winter", name: "Winter", symbol: "❄️", farbe: "#9fd8ff",
        text: "Pflanzen wachsen 15% langsamer, dafür ist jede Sternensaat 50% mehr wert.",
        wachstum: 0.85, sterne: 1.5, wetter: { hitze: 0, sternennacht: 3, gewitter: 0.3 }, partikel: "schnee" }
];

// ---------- WETTER (selten: an den meisten Tagen gibt es kein Wetter) ----------
// gut = angenehmes Wetter (Wetterfrosch/Wetterglueck machen es wahrscheinlicher)

const WETTER_KONFIG = {
    chance: 0.15,          // Grundchance fuer Wetter an einem Tag
    abTag: 2               // am ersten Tag nie Wetter
};

const WETTER = [
    { id: "regen", name: "Regentag", symbol: "🌧️", gut: true, gewicht: 30,
        text: "Alle Felder sind bewässert und wachsen doppelt so schnell." },
    { id: "gewitter", name: "Gewitter", symbol: "⛈️", gut: true, gewicht: 15,
        text: "Ab und zu schlägt ein Blitz ein und macht eine Pflanze sofort reif. Blitzpflanzen kommen 3-mal so oft." },
    { id: "hitze", name: "Hitzewelle", symbol: "🌡️", gut: false, gewicht: 20,
        text: "Pflanzen wachsen 30% schneller, aber der Tag hat 20% weniger Energie.",
        textSandbox: "Pflanzen wachsen 30% schneller." },
    { id: "nebel", name: "Nebel", symbol: "🌫️", gut: false, gewicht: 20,
        text: "Dein Cursor-Kreis ist 30% kleiner, dafür sind Saaten 20% mehr wert." },
    { id: "sternennacht", name: "Sternennacht", symbol: "🌠", gut: true, gewicht: 10,
        text: "Sternschnuppen kommen 3-mal so oft." },
    { id: "regenbogen", name: "Regenbogen", symbol: "🌈", gut: true, gewicht: 5,
        text: "Alle Saaten sind mindestens ungewöhnlich." }
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
    { id: "duerre", name: "Dürre", symbol: "🏜️", text: "Keine bewässerten Felder und kein Regen." },
    { id: "kraehenplage", name: "Krähenplage", symbol: "🐦", text: "Jeden Tag kommen 2 bis 4 Krähen." },
    { id: "kurzeTage", name: "Kurze Tage", symbol: "⌛", text: "20% weniger Energie pro Tag." },
    { id: "teureSaat", name: "Teure Saat", symbol: "🌰", text: "+25% Klicks pro Samen." },
    { id: "nervoes", name: "Nervöse Kombo", symbol: "💢", text: "Das Kombo-Fenster ist 30% kürzer." },
    { id: "geizig", name: "Geizige Kundschaft", symbol: "🧐", text: "Gewöhnliche Saaten sind nur halb so viel wert." },
    { id: "unwetter", name: "Unwetter", symbol: "🌪️", text: "Jeden Tag gibt es schlechtes Wetter (die Kristallkugel hilft trotzdem)." },
    { id: "dunkel", name: "Dunkle Nächte", symbol: "🌑", text: "Keine Sternschnuppen und keine Glühwürmchen." }
];
const BOSS_NACH_ID = Object.fromEntries(BOSS_REGELN.map(b => [b.id, b]));

// ---------- WANDERHAENDLER UND WERKZEUGE ----------
// Nach manchen Tagen kommt ein Wanderhaendler mit seltenen Angeboten.
// Werkzeuge sind starke Gegenstaende fuer den laufenden Run (begrenzte Plaetze, wie Joker in Balatro).
// preis = Anteil der naechsten Rechnung (in Gold). Verkaufen gibt 40% zurueck.

const HAENDLER_KONFIG = {
    chance: 0.25,
    abTag: 3,
    angebote: 4,                      // immer 4 Angebote, aber nur 1 Kauf pro Besuch
    verkaufsAnteil: 0.4
};

// Stufe: Werkzeuge werden staerker, je spaeter (= teurer) man sie kauft. Stufe = 1 + bezahlte Rechnungen beim Kauf
// (Sandbox: erreichte Meilensteine). Jede Stufe ueber 1 macht "wert" um WERKZEUG_STUFEN_BONUS staerker.
// text(w) bekommt den Wert fuer die jeweilige Stufe. ganz = Wert wird gerundet (z.B. Anzahl Felder).
const WERKZEUG_STUFEN_BONUS = 0.5;
const werkzeugZahl = w => zahl(Math.round(w * 10) / 10);

const WERKZEUGE = [
    { id: "sichel", name: "Goldene Sichel", symbol: "🪓", preis: 1.2, wert: 10, text: w => "Jede 10. Ernte bringt " + werkzeugZahl(w) + "-fach Gold." },
    { id: "giesskanne", name: "Silberne Gießkanne", symbol: "🪣", preis: 0.7, wert: 3, ganz: true, text: w => "+" + w + " bewässerte Felder pro Tag." },
    { id: "taschenuhr", name: "Alte Taschenuhr", symbol: "🕰️", preis: 0.8, wert: 30, ganz: true, text: w => "+" + w + " Energie pro Tag." },
    { id: "gluecksmuenze", name: "Glücksmünze", symbol: "🪙", preis: 0.9, wert: 0.1,
        text: w => "+" + prozentText(w) + " Glück bei Glücksspielen und +" + prozentText(w / 10) + " Chance auf legendäre Saaten." },
    { id: "saatbeutel", name: "Großer Saatbeutel", symbol: "🎒", preis: 0.7, wert: 6, ganz: true, text: w => "-" + w + " Klicks pro Samen." },
    { id: "flechtkorb", name: "Flechtkorb", symbol: "🧺", preis: 1.0, wert: 0.25, text: w => prozentText(w) + " Chance auf eine zusätzliche Saat pro Ernte." },
    { id: "laterne", name: "Laterne", symbol: "🏮", preis: 0.5, wert: 1,
        text: w => "Glühwürmchen kommen " + werkzeugZahl(1 + w) + "-mal so oft und geben " + werkzeugZahl(1 + w) + "-mal so viel Energie." },
    { id: "kompass", name: "Kompass", symbol: "🧭", preis: 0.6, wert: 0.1,
        text: w => "Der Wanderhändler kommt nach jedem Tag, und alles bei ihm ist " + prozentText(Math.min(0.5, w)) + " billiger." },
    { id: "feder", name: "Krähenfeder", symbol: "🪶", preis: 0.4, wert: 3,
        text: w => "Verscheuchte Krähen lassen Gold fallen (" + werkzeugZahl(w) + "x der Wert deiner besten Pflanze)." },
    { id: "sparstrumpf", name: "Sparstrumpf", symbol: "🧦", preis: 0.8, wert: 0.05,
        text: w => "+" + prozentText(w) + " Zinsen bei Feierabend (höchstens die Hälfte der nächsten Rechnung)." },
    { id: "kristallkugel", name: "Kristallkugel", symbol: "🔮", preis: 1.0, wert: 0.1, abStufe2: true,
        text: w => "Jeder Tag hat Wetter, und es ist immer gutes Wetter." + (w > 0 ? " Außerdem +" + prozentText(w) + " Gold." : "") },
    { id: "honigtopf", name: "Honigtopf", symbol: "🍯", preis: 0.7, wert: 1,
        text: w => "Die Kombo bricht erst nach " + werkzeugZahl(1 + w) + "-mal so langer Pause ab." },
    { id: "fernrohr", name: "Fernrohr", symbol: "🔭", preis: 0.6, wert: 5, ganz: true,
        text: w => "Sternschnuppen kommen doppelt so oft und geben " + w + " Sekunden länger doppeltes Gold." },
    { id: "wuenschelrute", name: "Wünschelrute", symbol: "🎋", preis: 1.1, wert: 5, ganz: true, text: w => "+" + w + " Sternensamen bei jeder Ernte." },
    { id: "hufeisen", name: "Magnet-Hufeisen", symbol: "🧲", preis: 0.9, wert: 1,
        text: w => "Gelandete Saaten werden alle " + werkzeugZahl(2 / w) + " Sekunden automatisch eingesammelt." },
    { id: "zaubererde", name: "Zaubererde", symbol: "🧪", preis: 0.9, wert: 3, ganz: true, text: w => "+" + w + " gedüngte Felder pro Tag." },
    { id: "strohhut", name: "Strohhut", symbol: "👒", preis: 0.7, wert: 0.1,
        text: w => "Hitzewelle und Nebel haben keine Nachteile, und du bekommst +" + prozentText(w) + " Gold." },
    { id: "sanduhr", name: "Sanduhr", symbol: "⏳", preis: 0.9, wert: 0.15, text: w => "Alle Pflanzen wachsen " + prozentText(w) + " schneller." },
    { id: "goldzahn", name: "Goldzahn", symbol: "🦷", preis: 0.8, wert: 1, text: w => "Legendäre Jackpots sind " + werkzeugZahl(1 + w) + "-mal so viel wert." },
    { id: "kleeblatt", name: "Vierblättriges Kleeblatt", symbol: "☘️", preis: 0.9, wert: 0.1,
        text: w => "+" + prozentText(w) + " Chance, dass eine Saat doppelt zählt." },
    { id: "wetterfahne", name: "Wetterfahne", symbol: "🚩", preis: 0.5, wert: 2, text: w => "Wetter kommt " + werkzeugZahl(1 + w) + "-mal so oft." },
    { id: "vogelnest", name: "Vogelnest", symbol: "🪺", preis: 0.7, wert: 0.2,
        text: w => "+" + prozentText(w) + " Chance, dass ein Samen einen zweiten mitbringt." },
    { id: "honigwabe", name: "Honigwabe", symbol: "🐝", preis: 0.6, wert: 2, ganz: true,
        text: w => "Jede Ernte gibt +" + w + " Kombo und füllt die Kombo-Zeit auf." }
];
const WERKZEUG_NACH_ID = Object.fromEntries(WERKZEUGE.map(w => [w.id, w]));

// Weitere Angebote des Haendlers (neben Werkzeugen). menge/preis werden in ereignisse.js berechnet.
const HAENDLER_WAREN = [
    { id: "sternenbeutel", name: "Sternensamen-Säckchen", symbol: "👝", preis: 0.35,
        text: "+ Sternensamen (100 + so viele, wie du heute gesammelt hast)." },
    { id: "goldsamen", name: "Goldener Samen", symbol: "🌟", preis: 0.5, text: "Dein erster Samen am nächsten Tag wird golden." },
    { id: "elixier", name: "Energie-Elixier", symbol: "🧃", preis: 0.25, text: "+60 Energie am nächsten Tag." },
    { id: "gutschein", name: "Kuschel-Gutschein", symbol: "🎟️", preis: 3, text: "Ein Gutschein für den Kuschel-Automaten im Mondteich (bleibt für immer)." }
];

// ---------- ERFOLGE (dauerhaft, je 1x freischaltbar) ----------
// Jede Kette zeigt immer nur das naechste offene Ziel. Jede Stufe = spaeter ein Steam-Achievement.
// Belohnung: JEDE Stufe gibt genau 1 Kuschel-Gutschein (egal welche Stufe).

const ERFOLG_BELOHNUNG_GUTSCHEINE = 1;

const ERFOLG_KETTEN = [
    { id: "gold", icon: "💰", text: z => "Verdiene insgesamt " + zahl(z) + " Gold",
        wert: () => meta.lebenszeit.gold,
        ziele: [1000, 1e5, 1e7, 1e9, 1e12, 1e15] },
    { id: "ernte", icon: "🌾", text: z => "Ernte insgesamt " + zahl(z) + " Pflanzen",
        wert: () => meta.lebenszeit.ernten,
        ziele: [50, 500, 5000, 50000] },
    { id: "rechnung", icon: "🧾", text: z => "Bezahle " + z + (z === 1 ? " Rechnung" : " Rechnungen") + " in einem Run",
        wert: () => Math.max(meta.besterRun ? meta.besterRun.rechnungen : 0, run.sandbox ? 0 : run.bezahlteRechnungen),
        ziele: [1, 3, 5, 8, 12, 16] },
    { id: "boss", icon: "🏦", text: z => "Zahle " + z + (z === 1 ? " Kredit" : " Kredite") + " ab",
        wert: () => meta.lebenszeit.bossRechnungen,
        ziele: [1, 5, 20] },
    { id: "kombo", icon: "🥁", text: z => "Erreiche eine " + z + "er-Kombo",
        wert: () => Math.max(meta.lebenszeit.maxKombo, run.gesamt.maxKombo),
        ziele: [40, 80, 150, 300] },
    { id: "jackpot", icon: "🌟", text: z => "Sammle " + z + (z === 1 ? " legendären Jackpot" : " legendäre Jackpots") + " ein",
        wert: () => meta.lebenszeit.jackpots,
        ziele: [1, 10, 100] },
    { id: "spezial", icon: "✨", text: z => "Ernte " + zahl(z) + (z === 1 ? " Spezialpflanze" : " Spezialpflanzen"),
        wert: () => meta.lebenszeit.spezial,
        ziele: [1, 25, 250] },
    { id: "felder", icon: "🟫", text: z => "Besitze " + z + " Felder in einem Run",
        wert: () => Math.max(meta.lebenszeit.maxFelder, run.felder.length),
        ziele: [8, 20, 35, 60] },
    { id: "pflanzen", icon: "🥕", text: z => "Schalte " + z + " Pflanzen in einem Run frei",
        wert: () => Math.max(meta.lebenszeit.maxPflanzen, run.pflanzen.filter(p => p.freigeschaltet).length),
        ziele: [2, 4, 6, 8, 11, 15] },
    { id: "tarot", icon: "🔮", text: z => "Besitze " + z + (z === 1 ? " Tarotkarte" : " Tarotkarten"),
        wert: () => meta.tarot.length,
        ziele: [1, 5, 11, 22] },
    { id: "kuschel", icon: "🧸", text: z => "Sammle " + z + (z === 1 ? " Kuscheltier" : " verschiedene Kuscheltiere"),
        wert: () => Object.keys(meta.kuscheltiere).length,
        ziele: [1, 7, 15, 30] },
    { id: "sterne", icon: "🌠", text: z => "Fange " + z + (z === 1 ? " Sternschnuppe" : " Sternschnuppen"),
        wert: () => meta.lebenszeit.sterne,
        ziele: [1, 10, 50] },
    { id: "gluehwuermchen", icon: "🪲", text: z => "Fange " + zahl(z) + " Glühwürmchen",
        wert: () => meta.lebenszeit.gluehwuermchen,
        ziele: [1, 25, 200] },
    { id: "kraehen", icon: "🐦", text: z => "Verscheuche " + zahl(z) + (z === 1 ? " Krähe" : " Krähen"),
        wert: () => meta.lebenszeit.kraehen,
        ziele: [1, 25, 100] },
    { id: "wetter", icon: "🌦️", text: z => "Erlebe " + z + (z === 1 ? " Wetter" : " verschiedene Wetter"),
        wert: () => Object.keys(meta.kodex.wetter).length,
        ziele: [1, 3, 6] },
    { id: "goldregen", icon: "🌧️", text: z => "Erlebe " + z + (z === 1 ? " Goldregen" : " Goldregen"),
        wert: () => meta.lebenszeit.goldregen,
        ziele: [1, 10] },
    { id: "gluecksspiel", icon: "🎲", text: z => "Gewinne " + zahl(z) + "-mal beim Glücksspiel",
        wert: () => meta.lebenszeit.gluecksspielSiege,
        ziele: [1, 25, 250] },
    { id: "werkzeuge", icon: "🧰", text: z => "Besitze " + z + (z === 1 ? " Werkzeug" : " Werkzeuge") + " gleichzeitig",
        wert: () => Math.max(meta.lebenszeit.maxWerkzeuge, run.werkzeuge.length),
        ziele: [1, 3, 5] },
    { id: "sternenfall", icon: "☄️", text: z => "Löse " + z + "-mal den Sternenfall aus",
        wert: () => meta.sternenfaelle,
        ziele: [1, 3, 10] },
    { id: "meister", icon: "🏅", text: z => "Bringe eine Pflanze auf Meisterschaft " + z,
        wert: () => Math.max(0, ...PFLANZEN_VORLAGEN.map(p => meisterStufe(p.id))),
        ziele: [1, 3, 5, 7] },
    { id: "mondphase", icon: "🌕", text: z => "Schalte die " + z + ". Mondphase frei",
        wert: () => meta.mondphaseFrei || 0,
        ziele: [1, 3, 5] },
    { id: "streicheln", icon: "🐾", text: z => "Streichle deinen Begleiter " + zahl(z) + "-mal",
        wert: () => meta.lebenszeit.streicheln,
        ziele: [1, 333, 3333, 33333] },
    { id: "kodex", icon: "📖", text: z => "Entdecke " + z + " Einträge im Kodex",
        wert: () => (typeof kodexEntdeckt === "function" ? kodexEntdeckt() : 0),
        ziele: [10, 25, 50, 80] },
    { id: "sternensamen", icon: "✨", text: z => "Sammle insgesamt " + zahl(z) + " Sternensamen",
        wert: () => meta.lebenszeit.sternensamen,
        ziele: [1000, 50000, 1000000] },
    { id: "tage", icon: "📅", text: z => "Spiele insgesamt " + zahl(z) + " Tage",
        wert: () => meta.lebenszeit.tage,
        ziele: [10, 100, 500] },
    { id: "stellarium", icon: "🌌", text: z => "Kaufe " + z + " Sterne in einem einzigen Run",
        wert: () => (run ? SKILLS.filter(d => level(d.id) > 0 && d.id !== "p_weizen").length : 0),
        ziele: [25, 60, 120] }
];

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
    { id: "rot", name: "Rote Katze", art: "katze", quelle: "frei",
        farben: { 1: "#ffc98a", 2: "#f0923a", 3: "#c0601a", 4: "#fff4e2", 5: "#2e1a09", 6: "#ff8fa3", 7: "#4a2410" } },
    { id: "schwarz", name: "Schwarze Katze", art: "katze", quelle: "erspielt",
        bedingungText: "Spiele 40 Tage", bedingung: () => meta.lebenszeit.tage >= 40,
        farben: { 1: "#4a4a5a", 2: "#2e2e38", 3: "#1c1c24", 4: "#55556a", 5: "#e8c020", 6: "#ff9aa8", 7: "#0b0b10" } },
    { id: "hund", name: "Hund Bello", art: "katze", stil: { hund: true, keineStreifen: true }, laut: "wuff", quelle: "erspielt",
        bedingungText: "Bezahle insgesamt 20 Rechnungen", bedingung: () => meta.lebenszeit.rechnungen >= 20,
        farben: { 1: "#fff0d8", 2: "#c98a4a", 3: "#6b3f1d", 4: "#fff8ee", 5: "#2e1a09", 6: "#ff8fa3", 7: "#3a2210" } },
    { id: "dackel", name: "Dackel Wurst", art: "katze", stil: { hund: true, dackel: true, keineStreifen: true }, laut: "wuff", stimme: 1.2,
        quelle: "erspielt", bedingungText: "Streichle deinen Begleiter 500-mal", bedingung: () => meta.lebenszeit.streicheln >= 500,
        farben: { 1: "#e8a86a", 2: "#a0562a", 3: "#5a2a10", 4: "#d99060", 5: "#1e1008", 6: "#ff8fa3", 7: "#2e1408" } },

    // ----- Episch (Unterstuetzer-Paket) -----
    { id: "waschbaer", name: "Waschbär Rocky", art: "katze", stil: { panda: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.1,
        farben: { 1: "#e6e6ea", 2: "#9a9aa6", 3: "#2e2e36", 4: "#f2f2f4", 5: "#f2f2f4", 6: "#ffb3c0", 7: "#1c1c22" } },
    { id: "kitsune", name: "Kitsune Yuki", art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer",
        stimme: 1.25, farben: { 1: "#ffffff", 2: "#f6f2f8", 3: "#d9302a", 4: "#ffffff", 5: "#d9302a", 6: "#ff8fa3", 7: "#6a2a3a" } },
    { id: "fennek", name: "Wüstenfuchs Fenni", art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer",
        stimme: 1.4, farben: { 1: "#fff0d0", 2: "#e8c890", 3: "#b8864a", 4: "#fff8e8", 5: "#2e1a09", 6: "#ffb3a0", 7: "#5a3a18" } },
    { id: "eisbaer", name: "Eisbärchen Polly", art: "katze", stil: { panda: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer",
        stimme: 0.85, farben: { 1: "#ffffff", 2: "#f4f8fc", 3: "#d6e2ee", 4: "#ffffff", 5: "#f4f8fc", 6: "#ffb3c0", 7: "#6b7a90" } },
    { id: "wolpertinger", name: "Wolpertinger Wolpi", art: "katze", stil: { hase: true, drache: true, keineStreifen: true },
        quelle: "dlc", paket: "unterstuetzer", stimme: 1.3,
        farben: { 1: "#e8c8a0", 2: "#a87a4a", 3: "#6b4a2a", 4: "#fff4e8", 5: "#2e1a09", 6: "#ffb3c0", 7: "#4a2a10" } },
    { id: "fuchs", name: "Fuchs", art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.2,
        farben: { 1: "#ffc28a", 2: "#e8742a", 3: "#4a2616", 4: "#fff8f0", 5: "#2e1a09", 6: "#ff9aa8", 7: "#3a1a08" } },
    { id: "schneefuchs", name: "Schneefuchs", art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.25,
        farben: { 1: "#ffffff", 2: "#f1f4fa", 3: "#9aa6bf", 4: "#ffffff", 5: "#23324a", 6: "#ffb3c0", 7: "#5f6b85" } },
    { id: "rotpanda", name: "Roter Panda", art: "katze", stil: { fuchs: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.3,
        farben: { 1: "#ffd8b0", 2: "#c8502a", 3: "#3a1a10", 4: "#fff4e8", 5: "#1e1008", 6: "#ff9aa8", 7: "#2a1008" } },
    { id: "wolf", name: "Wolf Luna", art: "katze", stil: { fuchs: true, keineStreifen: true }, laut: "wuff", stimme: 0.8, quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#d8dde6", 2: "#8a93a3", 3: "#3a404c", 4: "#eef0f4", 5: "#e8c020", 6: "#ff9aa8", 7: "#22262e" } },
    { id: "husky", name: "Husky Blizzard", art: "katze", stil: { hund: true, keineStreifen: true }, laut: "wuff", quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#ffffff", 2: "#9aa6b6", 3: "#4a5566", 4: "#ffffff", 5: "#5aa9e6", 6: "#ff8fa3", 7: "#2a3340" } },
    { id: "golden", name: "Golden Retriever", art: "katze", stil: { hund: true, keineStreifen: true }, laut: "wuff", stimme: 0.9, quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#ffe0a0", 2: "#e0a84a", 3: "#a8702a", 4: "#fff0d0", 5: "#2e1a09", 6: "#ff8fa3", 7: "#5a3a10" } },
    { id: "hase", name: "Hase Stups", art: "katze", stil: { hase: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.4,
        farben: { 1: "#ffffff", 2: "#d8cfc4", 3: "#a89a8a", 4: "#ffffff", 5: "#2e1a09", 6: "#ffb3c0", 7: "#5a4a3a" } },
    { id: "braunhase", name: "Feldhase Hoppel", art: "katze", stil: { hase: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 1.35,
        farben: { 1: "#e8c8a0", 2: "#a87a4a", 3: "#6b4a2a", 4: "#fff4e8", 5: "#2e1a09", 6: "#ffb3c0", 7: "#4a2a10" } },
    { id: "panda", name: "Panda Bao", art: "katze", stil: { panda: true, keineStreifen: true }, quelle: "dlc", paket: "unterstuetzer", stimme: 0.9,
        farben: { 1: "#ffffff", 2: "#f4f4f4", 3: "#1e1e24", 4: "#ffffff", 5: "#f4f4f4", 6: "#ffb3c0", 7: "#101014" } },
    { id: "pinguin", name: "Pinguin Pingu", art: "pinguin", quelle: "dlc", paket: "unterstuetzer", laut: "blubb",
        farben: { 1: "#ffffff", 2: "#2a2f3a", 3: "#1a1d24", 4: "#f8f8f8", 5: "#0e0e10", 6: "#f0a020", 7: "#0a0a0e" } },
    { id: "weihnachtskatze", name: "Weihnachtskatze", art: "katze", stil: { muetze: true }, quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#ffc98a", 2: "#f0923a", 3: "#c0601a", 4: "#fff4e2", 5: "#2e1a09", 6: "#ff8fa3", 7: "#4a2410" } },
    { id: "kuerbiskatze", name: "Kürbiskatze", art: "katze", stil: { kuerbishut: true }, quelle: "dlc", paket: "unterstuetzer",
        farben: { 1: "#4a4a5a", 2: "#2e2e38", 3: "#1c1c24", 4: "#55556a", 5: "#f08a24", 6: "#ff9aa8", 7: "#0b0b10" } },

    // ----- Legendaer (einzeln, mit Effekten) -----
    { id: "axolotl", name: "Axolotl Blubbi", art: "katze", stil: { axolotl: true, keineStreifen: true }, laut: "blubb",
        quelle: "dlc", paket: "einzeln", effekt: "blasen",
        idle: "blubb", aura: "#ff8fb1",
        farben: { 1: "#ffe0ec", 2: "#ffb3cf", 3: "#e0507a", 4: "#ffe6f0", 5: "#1e1016", 6: "#ff6fa0", 7: "#7a2a48" } },
    { id: "drache", name: "Drache Zisch", art: "katze", stil: { drache: true, keineStreifen: true }, stimme: 0.8,
        quelle: "dlc", paket: "einzeln", effekt: "flammen",
        idle: "feuer", aura: "#7ae07a",
        farben: { 1: "#b8f07a", 2: "#5fb03c", 3: "#2f6b24", 4: "#f5e0a0", 5: "#d49a00", 6: "#ff8fa3", 7: "#1a3a10" } },
    { id: "eisdrache", name: "Eisdrache Frost", art: "katze", stil: { drache: true, keineStreifen: true }, stimme: 0.75,
        quelle: "dlc", paket: "einzeln", effekt: "schnee",
        idle: "frost", aura: "#9fe8ff",
        farben: { 1: "#e8f6ff", 2: "#8fd0f0", 3: "#3a7ab0", 4: "#ffffff", 5: "#5aa9e6", 6: "#cfe0f5", 7: "#1a3a5a" } },
    { id: "engel", name: "Engelskatze", art: "katze", stil: { engel: true, keineStreifen: true }, stimme: 1.15,
        quelle: "dlc", paket: "einzeln", effekt: "funkeln",
        idle: "engel", aura: "#ffe89a", schwebt: true,
        farben: { 1: "#ffffff", 2: "#fdfaf2", 3: "#e6dcc4", 4: "#ffffff", 5: "#4a7fd0", 6: "#ffb3c0", 7: "#8a7a5a" } },
    { id: "hoellenhund", name: "Höllenhund Cerby", art: "katze", stil: { hund: true, teufel: true, keineStreifen: true }, laut: "wuff", stimme: 0.7,
        quelle: "dlc", paket: "einzeln", effekt: "flammen",
        idle: "feuer", aura: "#ff4a3a",
        farben: { 1: "#5a2a2a", 2: "#2e1414", 3: "#b8232a", 4: "#4a2020", 5: "#ffd23a", 6: "#ff6a3a", 7: "#100404" } },
    { id: "feuerfuchs", name: "Feuerfuchs Blaze", art: "katze", stil: { fuchs: true, keineStreifen: true }, stimme: 1.1,
        quelle: "dlc", paket: "einzeln", effekt: "flammen",
        idle: "phoenix", aura: "#ff8a2a",
        farben: { 1: "#ffe066", 2: "#ff8a2a", 3: "#d9302a", 4: "#fff0b0", 5: "#5a1008", 6: "#ffb3c0", 7: "#5a1008" } },
    { id: "sternenkatze", name: "Sternenkatze", art: "katze", stil: { keineStreifen: true }, stimme: 1.2,
        quelle: "dlc", paket: "einzeln", effekt: "sterne",
        idle: "sterne", aura: "#8fa2f0",
        farben: { 1: "#4a5fc0", 2: "#1d2a5a", 3: "#0e1436", 4: "#3a4a9a", 5: "#fff6a0", 6: "#c9b0f5", 7: "#05081a" } },
    { id: "geisterhund", name: "Geisterhund Boo", art: "katze", stil: { hund: true, keineStreifen: true }, laut: "wuff", stimme: 1.3,
        quelle: "dlc", paket: "einzeln", effekt: "funkeln", klasse: "haustier-geist",
        idle: "geist", aura: "#cfe0f5",
        farben: { 1: "#f4f8ff", 2: "#cfe0f5", 3: "#9fb8d8", 4: "#ffffff", 5: "#5aa9e6", 6: "#cfe0f5", 7: "#7a90b0" } },
    { id: "einhorn", name: "Einhorn Glitzer", art: "katze", stil: { hund: true, einhorn: true, keineStreifen: true }, stimme: 1.2,
        quelle: "dlc", paket: "einzeln", effekt: "funkeln",
        idle: "engel", aura: "#ff9ad5", schwebt: true,
        farben: { 1: "#ffffff", 2: "#fdf6ff", 3: "#e8d4f5", 4: "#ffffff", 5: "#7c4fb3", 6: "#ffb3d9", 7: "#8a6aa8" } },
    { id: "maedchen", name: "Katzenmädchen", art: "maedchen", stimme: 1.35, quelle: "dlc", paket: "einzeln", effekt: "herzen",
        idle: "tanz", aura: "#ff9ad5",
        farben: { 1: "#ffffff", 2: "#5a3222", 3: "#3a3a5a", 4: "#ffe2cf", 5: "#b0402a", 6: "#ff9aa8", 7: "#2a1610" } },
    { id: "manta", name: "Mantarochen", art: "manta", laut: "blubb", quelle: "dlc", paket: "einzeln", effekt: "blasen",
        idle: "manta", aura: "#5aa9e6", schwebt: true,
        farben: { 1: "#9fd8ff", 2: "#3b6a9e", 3: "#264a75", 4: "#eef6ff", 5: "#0f1a2a", 6: "#ff9aa8", 7: "#122238" } }
];

// Aktionen im Rechtsklick-Menue des Haustiers (funktionieren immer, auch zwischen den Tagen)
const HAUSTIER_AKTIONEN = [
    { id: "winken", name: "Winken", symbol: "👋" },
    { id: "kuscheln", name: "Kuscheln", symbol: "💕" },
    { id: "tanzen", name: "Tanzen", symbol: "💃" },
    { id: "rolle", name: "Rolle", symbol: "🔄" },
    { id: "sitz", name: "Sitz!", symbol: "🪑" },
    { id: "schlafen", name: "Schlafen legen", symbol: "💤" },
    { id: "fuettern", name: "Füttern", symbol: "🐟" },
    { id: "ball", name: "Ball werfen", symbol: "🎾" }
];

// ---------- HAUS: KOSMETIK (Klick aufs Haus im Hof) ----------
// Reine Optik, die die Entwicklung unterstuetzt. Alles laesst sich im Haus vorher anprobieren (Musik probehoeren).
// Seltenheit ergibt sich aus der Quelle:
//   Gewoehnlich (weiss)    = quelle "frei"
//   Ungewoehnlich (gruen)  = quelle "erspielt" (bedingung im Spiel erfuellen)
//   Episch (lila)          = quelle "dlc", paket "unterstuetzer" (Unterstuetzer-Paket inkl. Sandbox)
//   Legendaer (gelb)       = quelle "dlc", paket "einzeln" (aufwaendig/animiert, einzeln kaufbar fuer LEGENDAER_PREIS)

const DLC_PAKETE = {
    unterstuetzer: {
        name: "Unterstützer-Paket", preis: 7.99,
        inhalt: "Sandbox-Modus sofort und alle epischen Inhalte: Begleiter, Landschaften, Deko, Musik, Samenläden, Felder, " +
            "Münzen, Kuschel-Rahmen und Pflanzen-Looks"
    }
};
const LEGENDAER_PREIS = 0.99;

// Seltenheit eines Kosmetik-Eintrags (Index in KUSCHEL_RARITAETEN: 0 gewoehnlich, 1 ungewoehnlich, 3 episch, 4 legendaer)
function kosmetikSeltenheit(eintrag) {
    if (eintrag.quelle === "frei") return 0;
    if (eintrag.quelle === "erspielt") return 1;
    return eintrag.paket === "unterstuetzer" ? 3 : 4;
}

function euro(preis) {
    return preis.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// Text fuer den Preis eines DLC-Inhalts
function dlcPreisText(eintrag) {
    if (eintrag.paket === "unterstuetzer") return "Im " + DLC_PAKETE.unterstuetzer.name + " enthalten";
    return "Einzeln " + euro(eintrag.preis || LEGENDAER_PREIS);
}

const KOSMETIK_KATEGORIEN = [
    { id: "haustier", name: "Begleiter", symbol: "🐾" },
    { id: "landschaft", name: "Landschaft", symbol: "🏞️" },
    { id: "deko", name: "Deko", symbol: "🪴" },
    { id: "musik", name: "Musik", symbol: "🎵" },
    { id: "samenladen", name: "Samenladen", symbol: "🏪" },
    { id: "felder", name: "Felder", symbol: "🟫" },
    { id: "kugeln", name: "Münzen", symbol: "🪙" },
    { id: "rahmen", name: "Kuschel-Rahmen", symbol: "🖼️" },
    { id: "pflanzen", name: "Pflanzen", symbol: "🌱" }
];

// Hof-Themen: Farben fuer zeichneHof (sprites.js). funkeln = leuchtende Teilchen ueber der Wiese
const HOF_THEMEN = [
    { id: "standard", name: "Sommerhof", quelle: "frei" },
    { id: "herbst", name: "Herbsthof", quelle: "erspielt", bedingungText: "Erreiche Tag 30 in einem Run",
        bedingung: () => meta.lebenszeit.maxTag >= 30 },
    { id: "fruehling", name: "Kirschblütenhof", quelle: "dlc", paket: "unterstuetzer" },
    { id: "winter", name: "Winterhof", quelle: "dlc", paket: "unterstuetzer" },
    { id: "wueste", name: "Oase", quelle: "dlc", paket: "unterstuetzer" },
    { id: "tropen", name: "Tropeninsel", quelle: "dlc", paket: "unterstuetzer" },
    { id: "zauberwald", name: "Zauberwald", quelle: "dlc", paket: "einzeln", funkeln: ["#9fe8ff", "#ff9ad5", "#c9b0f5", "#fff6a0"],
        irrlichter: ["#9fe8ff", "#c9b0f5", "#b8f07a"] }
];

// Deko: bis zu 3 Objekte stehen auf festen Plaetzen im Hintergrund der Hofwiese (x in Prozent)
// farben = Farbvariante des Sprites, effekt = CSS-Look (bienen: Bienen summen herum), partikel = aufsteigende Teilchen,
// fluegel = Windmuehlen-Fluegel drehen sich als eigenes Bild vor dem Turm
const DEKO_SLOTS = [{ x: 31 }, { x: 47 }, { x: 69 }];
const DEKO_MAX = DEKO_SLOTS.length;

const DEKO_OBJEKTE = [
    { id: "vogelscheuche", name: "Vogelscheuche", sprite: "vogelscheuche", quelle: "frei" },
    { id: "blumenkuebel", name: "Blumenkübel", sprite: "blumenkuebel", quelle: "erspielt",
        bedingungText: "Ernte insgesamt 10.000 Pflanzen", bedingung: () => meta.lebenszeit.ernten >= 10000 },
    { id: "holzbank", name: "Holzbank", sprite: "holzbank", quelle: "erspielt",
        bedingungText: "Beende 10 Runs", bedingung: () => meta.lebenszeit.runs >= 10 },
    { id: "gartenzwerg", name: "Gartenzwerg", sprite: "gartenzwerg", quelle: "dlc", paket: "unterstuetzer" },
    { id: "vogelhaus", name: "Vogelhaus", sprite: "vogelhaus", quelle: "dlc", paket: "unterstuetzer" },
    { id: "blumenbogen", name: "Blumenbogen", sprite: "blumenbogen", quelle: "dlc", paket: "unterstuetzer" },
    { id: "kuerbisstapel", name: "Kürbisstapel", sprite: "kuerbisstapel", quelle: "dlc", paket: "unterstuetzer" },
    { id: "brunnen", name: "Brunnen", sprite: "brunnen", quelle: "dlc", paket: "unterstuetzer", effekt: "glitzern" },
    { id: "laterne", name: "Gartenlaterne", sprite: "gartenlaterne", quelle: "dlc", paket: "unterstuetzer", effekt: "leuchten" },
    { id: "bienenstock", name: "Bienenkorb", sprite: "bienenstock", quelle: "erspielt", effekt: "bienen",
        bedingungText: "Ernte insgesamt 50.000 Pflanzen", bedingung: () => meta.lebenszeit.ernten >= 50000 },
    { id: "vogeltraenke", name: "Vogeltränke", sprite: "vogeltraenke", quelle: "erspielt", effekt: "glitzern",
        bedingungText: "Verscheuche insgesamt 300 Krähen", bedingung: () => meta.lebenszeit.kraehen >= 300 },
    { id: "schneemann", name: "Schneemann", sprite: "schneemann", quelle: "dlc", paket: "unterstuetzer", effekt: "wackeln" },
    { id: "wetterhahn", name: "Wetterhahn", sprite: "wetterhahn", quelle: "dlc", paket: "unterstuetzer", effekt: "drehen" },
    { id: "kuerbislaterne", name: "Kürbislaterne", sprite: "kuerbislaterne", quelle: "dlc", paket: "unterstuetzer", effekt: "feuer" },
    { id: "pilzhaus", name: "Pilzhäuschen", sprite: "pilzhaus", quelle: "dlc", paket: "unterstuetzer", effekt: "leuchten" },
    { id: "windmuehle", name: "Windmühle", sprite: "muehle", quelle: "dlc", paket: "einzeln", fluegel: true },
    { id: "lagerfeuer", name: "Lagerfeuer", sprite: "lagerfeuer", quelle: "dlc", paket: "einzeln", effekt: "feuer",
        partikel: ["#ffd93d", "#ff8a2a", "#ffffff"] },
    { id: "feenbrunnen", name: "Feenbrunnen", sprite: "brunnen", quelle: "dlc", paket: "einzeln", effekt: "glitzern",
        farben: { T: "#8d6bd6", U: "#b48cff", Q: "#ff9ad5" }, partikel: ["#ff9ad5", "#c9b0f5", "#ffffff"] },
    { id: "leuchtpilze", name: "Leuchtpilz-Haus", sprite: "pilzhaus", quelle: "dlc", paket: "einzeln", effekt: "leuchten-blau",
        farben: { R: "#4a8aff", r: "#2a5ad0", w: "#bff0ff" }, partikel: ["#9fe8ff", "#4a8aff", "#ffffff"] }
];

// Musik: "auto" spielt je nach Tageszeit (nur Lieder, die du hast). Die Noten stehen in audio.js (LIEDER).
const MUSIK_TITEL = [
    { id: "auto", name: "Automatisch (nach Tageszeit)", quelle: "frei" },
    { id: "sproutvale", name: "Sproutvale", quelle: "frei" },
    { id: "morgentau", name: "Morgentau", quelle: "erspielt", bedingungText: "Spiele 30 Tage",
        bedingung: () => meta.lebenszeit.tage >= 30 },
    { id: "abendrot", name: "Abendrot", quelle: "dlc", paket: "unterstuetzer" },
    { id: "mondnacht", name: "Mondnacht", quelle: "dlc", paket: "unterstuetzer" },
    { id: "kirmes", name: "Kirmes", quelle: "dlc", paket: "unterstuetzer" },
    { id: "winterzauber", name: "Winterzauber", quelle: "dlc", paket: "unterstuetzer" },
    { id: "sternenwalzer", name: "Sternenwalzer", quelle: "dlc", paket: "unterstuetzer" }
];

// Samenladen: Farben der Markise und des Holzes. klasse = zusaetzlicher Look (style.css),
// funken = Funken beim Samen, wurf = Look der geworfenen Saaten, spur = Funken hinter der Saat.
// Legendaere Laeden sind eigene Gebaeude: bauweise = Aufbau in haus.js/style.css, bild = Symbol in der Mitte,
// ankunft = Farben der kleinen Explosion, wenn ein Wurf auf dem Feld landet, drehen = Wurf zeigt in Flugrichtung
const SAMENLADEN_SKINS = [
    { id: "standard", name: "Rot-Weiß", quelle: "frei", markise: ["#d9483f", "#fff1d6"], holz: ["#b87a3e", "#9e6530"] },
    { id: "blau", name: "Blau-Weiß", quelle: "erspielt", bedingungText: "Klicke 50.000-mal auf den Samenladen",
        bedingung: () => meta.lebenszeit.klicks >= 50000, markise: ["#3f7fd9", "#f2f7ff"], holz: ["#b87a3e", "#9e6530"] },
    { id: "markt", name: "Bauernmarkt", quelle: "dlc", paket: "unterstuetzer", markise: ["#4a9a3a", "#f2fff0"], holz: ["#b87a3e", "#9e6530"],
        funken: ["#a3dc6f", "#ffffff"] },
    { id: "meer", name: "Meeresbrise", quelle: "dlc", paket: "unterstuetzer", markise: ["#2ab0c0", "#f0ffff"], holz: ["#d8c8a0", "#b8a880"],
        funken: ["#9fe8ff", "#ffffff"] },
    { id: "gold", name: "Goldstand", quelle: "dlc", paket: "unterstuetzer", markise: ["#e0a800", "#fff3b0"], holz: ["#8a5a1a", "#6b4210"],
        klasse: "laden-gold", funken: ["#ffd93d", "#fff3b0", "#ffffff"] },
    { id: "kirschbluete", name: "Kirschblüte", quelle: "dlc", paket: "unterstuetzer", markise: ["#ff8fb8", "#fff0f6"], holz: ["#c98a8a", "#a86a6a"],
        klasse: "laden-blueten", funken: ["#ffc2da", "#ff8fb8", "#ffffff"] },
    { id: "mitternacht", name: "Mitternacht", quelle: "dlc", paket: "unterstuetzer", markise: ["#3a2a7a", "#c9b0f5"], holz: ["#4a3a5a", "#3a2a4a"],
        klasse: "laden-mitternacht", funken: ["#c9b0f5", "#8fa2f0", "#ffffff"] },
    { id: "lebkuchen", name: "Lebkuchenhaus", quelle: "dlc", paket: "unterstuetzer", markise: ["#fff6f0", "#8a4a22"], holz: ["#a8602a", "#8a4a1a"],
        klasse: "laden-lebkuchen", funken: ["#ffffff", "#ff8fa3", "#a3dc6f"], wurf: "wurf-bonbon" },
    { id: "feuerwerk", name: "Raketen-Startrampe", titel: "Startrampe", quelle: "dlc", paket: "einzeln", markise: ["#1d2560", "#e8434a"],
        holz: ["#2a2250", "#1d1840"], klasse: "laden-feuerwerk", bauweise: "feuerwerk", bild: "🚀", funken: ["#ffd93d", "#e8434a", "#5aa9e6", "#a3dc6f", "#ffffff"],
        wurf: "wurf-rakete", drehen: true, spur: ["#ffd93d", "#ff8a2a", "#ffffff"], ankunft: ["#ffd93d", "#e8434a", "#5aa9e6", "#ff8fb1", "#ffffff"] },
    { id: "zirkus", name: "Zirkusmanege", titel: "Manege", quelle: "dlc", paket: "einzeln", markise: ["#e8434a", "#fff6e8"],
        holz: ["#e8434a", "#c02a32"], klasse: "laden-zirkus", bauweise: "zirkus", bild: "🦭", funken: ["#e8434a", "#ffd93d", "#5aa9e6", "#a3dc6f", "#ffffff"],
        wurf: "wurf-bunt", ankunft: ["#e8434a", "#ffd93d", "#5aa9e6", "#a3dc6f", "#ff8fb1"] },
    { id: "sternenstand", name: "Sternwarte", titel: "Sternwarte", quelle: "dlc", paket: "einzeln", markise: ["#2a2f6e", "#ffe89a"],
        holz: ["#3a3f7a", "#2a2f62"], klasse: "laden-sterne", bauweise: "sternwarte", bild: "🪐", funken: ["#fff6a0", "#ffe89a", "#ffffff", "#8fa2f0"],
        wurf: "wurf-stern", drehen: true, spur: ["#fff6a0", "#ffffff"], ankunft: ["#fff6a0", "#ffffff", "#8fa2f0", "#c9b0f5"] },
    { id: "hexenhuette", name: "Hexenhütte", titel: "Hexenhütte", quelle: "dlc", paket: "einzeln", markise: ["#3a2250", "#8dff7a"],
        holz: ["#4a2a4a", "#3a1d3a"], klasse: "laden-hexe", bauweise: "hexe", bild: "🧪", funken: ["#8dff7a", "#c9b0f5", "#ffffff"],
        wurf: "wurf-blase", spur: ["#8dff7a", "#c9ffb0"], ankunft: ["#8dff7a", "#b48cff", "#c9ffb0", "#ffffff"] },
    { id: "leuchtturm", name: "Leuchtturm", titel: "Leuchtturm", quelle: "dlc", paket: "einzeln", markise: ["#e8434a", "#fff6e8"],
        holz: ["#6a7078", "#4a5058"], klasse: "laden-leuchtturm", bauweise: "leuchtturm", bild: "⚓", funken: ["#fff3b0", "#ffffff", "#9fe8ff"],
        wurf: "wurf-licht", spur: ["#fff3b0", "#ffffff"], ankunft: ["#fff3b0", "#ffffff", "#9fe8ff", "#5aa9e6"] }
];

// Felder: Farben der Erde (B hell, b Furche, c Kruemel). klasse = zusaetzlicher Look (style.css)
const FELD_SKINS = [
    { id: "standard", name: "Ackerboden", quelle: "frei", farben: {} },
    { id: "dunkel", name: "Dunkle Erde", quelle: "erspielt", bedingungText: "Ernte insgesamt 25.000 Pflanzen",
        bedingung: () => meta.lebenszeit.ernten >= 25000, farben: { B: "#5a3a22", b: "#3e2616", c: "#6e4a2c" } },
    { id: "hochbeet", name: "Hochbeet", quelle: "dlc", paket: "unterstuetzer", farben: { B: "#6b4a2a", b: "#4a3018", c: "#7a8a3a" }, rahmen: "#8a5a2c" },
    { id: "zen", name: "Zen-Sand", quelle: "dlc", paket: "unterstuetzer", farben: { B: "#e6d6a8", b: "#c9b47a", c: "#f3e8c4" } },
    { id: "sandbeet", name: "Sandbeet", quelle: "dlc", paket: "unterstuetzer", farben: { B: "#d8b878", b: "#b8985a", c: "#e8d098" } },
    { id: "moos", name: "Moosbeet", quelle: "dlc", paket: "unterstuetzer", farben: { B: "#4a6a3a", b: "#34502a", c: "#6a8a4a" } },
    { id: "blumenwiese", name: "Blumenbeet", quelle: "dlc", paket: "unterstuetzer", farben: { B: "#6a4a2a", b: "#4e3218", c: "#8a6a3a" },
        klasse: "felder-blumen" },
    { id: "kristall", name: "Kristallboden", quelle: "dlc", paket: "einzeln", farben: { B: "#3a4a8a", b: "#2a3570", c: "#6a7ad0" },
        klasse: "felder-kristall", teilchen: ["#bff0ff", "#ffffff", "#8fa2f0"] },
    { id: "lava", name: "Lavaboden", quelle: "dlc", paket: "einzeln", farben: { B: "#3a2a2a", b: "#2a1a1a", c: "#ff6a2a" },
        klasse: "felder-lava", teilchen: ["#ff6a2a", "#ffd060", "#ff4a1a"] },
    { id: "sternenboden", name: "Sternenboden", quelle: "dlc", paket: "einzeln", farben: { B: "#1d2560", b: "#141a42", c: "#fff6a0" },
        klasse: "felder-sterne", teilchen: ["#fff6a0", "#ffffff", "#8fa2f0"] },
    { id: "schnee", name: "Schneebeet", quelle: "erspielt", bedingungText: "Erlebe 20 Winter",
        bedingung: () => ((meta.kodex.jahreszeiten || {}).winter || 0) >= 20, farben: { B: "#e8f2fa", b: "#b8cde0", c: "#ffffff" } },
    { id: "pilzbeet", name: "Pilzbeet", quelle: "dlc", paket: "unterstuetzer", farben: { B: "#5a3e4a", b: "#3e2834", c: "#7a5a6a" },
        klasse: "felder-pilze" },
    { id: "regenbogen", name: "Regenbogenbeet", quelle: "dlc", paket: "einzeln", farben: { B: "#6a4a3a", b: "#4a3024", c: "#8a6a5a" },
        klasse: "felder-regenbogen", teilchen: ["#ff6a6a", "#ffd93d", "#a3dc6f", "#5aa9e6", "#b48cff"] }
];

// Muenzen: Farben der Goldmuenze. klasse = zusaetzlicher Look (style.css)
const KUGEL_SKINS = [
    { id: "standard", name: "Goldmünzen", quelle: "frei", farben: {} },
    { id: "bronze", name: "Bronzemünzen", quelle: "erspielt", bedingungText: "Sammle 50 legendäre Jackpots",
        bedingung: () => meta.lebenszeit.jackpots >= 50, farben: { Y: "#e0a070", y: "#a86a3a", k: "#4a2a10" } },
    { id: "silber", name: "Silbermünzen", quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#e9e9ef", y: "#a9a9b6", k: "#4a4a5a" } },
    { id: "bluete", name: "Blütenmünzen", quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#ffc2dc", y: "#e07aa8", k: "#7a2a48" } },
    { id: "smaragd", name: "Smaragdmünzen", quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#7ae0a0", y: "#2e9e5a", k: "#14502a" } },
    { id: "rubin", name: "Rubinmünzen", quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#ff8a8a", y: "#c83a3a", k: "#5a1010" } },
    { id: "mond", name: "Mondmünzen", quelle: "dlc", paket: "unterstuetzer", farben: { Y: "#dfe6ff", y: "#8fa2f0", k: "#2a3570" },
        klasse: "muenzen-mond" },
    { id: "regenbogen", name: "Regenbogenmünzen", quelle: "dlc", paket: "einzeln", farben: { Y: "#ff9a9a", y: "#e0507a", k: "#5a1a3a" },
        klasse: "muenzen-regenbogen", funken: ["#ff6a6a", "#ffd93d", "#a3dc6f", "#5aa9e6", "#b48cff"] },
    { id: "feuer", name: "Feuermünzen", quelle: "dlc", paket: "einzeln", farben: { Y: "#ffd060", y: "#ff6a2a", k: "#5a1a08" },
        klasse: "muenzen-feuer", funken: ["#ffd060", "#ff8a2a", "#ff4a1a"] },
    // Saat in anderen Formen (keine runde Muenze). Die Seltenheit zeigt der farbige Kern (Z), beim Kristall der ganze Stein.
    { id: "blatt", name: "Blattsaat", quelle: "erspielt", bedingungText: "Ernte insgesamt 5.000 Spezialpflanzen",
        bedingung: () => meta.lebenszeit.spezial >= 5000, form: "blatt", farben: { Y: "#8fdc5c", y: "#4f9e2c", k: "#1f4a12", w: "#e8ffd0" } },
    { id: "eichel", name: "Eichelsaat", quelle: "erspielt", bedingungText: "Streichle deinen Begleiter 2.000-mal",
        bedingung: () => meta.lebenszeit.streicheln >= 2000, form: "eichel", farben: { Y: "#d8a060", y: "#9a6430", k: "#3a2410", w: "#ffe8c8" } },
    { id: "herz", name: "Herzsaat", quelle: "dlc", paket: "unterstuetzer", form: "herz",
        farben: { Y: "#ff9ab8", y: "#d0507a", k: "#5a1a30", w: "#ffe6ee" } },
    { id: "kristall", name: "Kristallsaat", quelle: "dlc", paket: "einzeln", form: "kristall", klasse: "muenzen-kristall",
        farben: { k: "#1d2a4a", w: "#ffffff", Y: "#e8eef8", y: "#a8b4c8" },
        raritaetFarben: [{ Y: "#e8eef8", y: "#a8b4c8" }, { Y: "#9af09a", y: "#2e9e2e" }, { Y: "#9ad6ff", y: "#2f7fcf" },
            { Y: "#d6a8ff", y: "#7c2fc2" }, { Y: "#fff0a0", y: "#e0a800" }],
        funken: ["#ffffff", "#9ad6ff", "#d6a8ff"] }
];

// Rahmen der Kuscheltier-Karten im Mondteich
const RAHMEN_SKINS = [
    { id: "standard", name: "Schlicht", quelle: "frei", css: "" },
    { id: "holz", name: "Holzrahmen", quelle: "erspielt", bedingungText: "Sammle 15 verschiedene Kuscheltiere",
        bedingung: () => Object.keys(meta.kuscheltiere).length >= 15, css: "rahmen-holz" },
    { id: "gold", name: "Goldrahmen", quelle: "dlc", paket: "unterstuetzer", css: "rahmen-gold" },
    { id: "blumen", name: "Blumenrahmen", quelle: "dlc", paket: "unterstuetzer", css: "rahmen-blumen" },
    { id: "eis", name: "Eisrahmen", quelle: "dlc", paket: "unterstuetzer", css: "rahmen-eis" },
    { id: "sterne", name: "Sternenrahmen", quelle: "dlc", paket: "einzeln", css: "rahmen-sterne" },
    { id: "regenbogen", name: "Regenbogenrahmen", quelle: "dlc", paket: "einzeln", css: "rahmen-regenbogen" },
    { id: "feuer", name: "Flammenrahmen", quelle: "dlc", paket: "einzeln", css: "rahmen-feuer" }
];

// Pflanzen-Looks: tauschen die Blattfarben (G hell, g mittel, d dunkel) aller Pflanzen-Sprites aus.
// klasse = zusaetzlicher Look fuer alle Pflanzen auf den Feldern (style.css)
const PFLANZEN_SKINS = [
    { id: "standard", name: "Sommergrün", quelle: "frei", farben: {} },
    { id: "herbst", name: "Herbstlaub", quelle: "dlc", paket: "unterstuetzer", farben: { G: "#e0a040", g: "#b8662a", d: "#7a3a1a" } },
    { id: "winter", name: "Raureif", quelle: "dlc", paket: "unterstuetzer", farben: { G: "#dff0f8", g: "#a8c8dc", d: "#6a8aa6" } },
    { id: "bonbon", name: "Bonbonblätter", quelle: "dlc", paket: "unterstuetzer", farben: { G: "#ffb3d9", g: "#8fe0c0", d: "#5aa98a" } },
    { id: "mitternacht", name: "Mitternachtsblätter", quelle: "dlc", paket: "unterstuetzer", farben: { G: "#8a7ae0", g: "#5a4ab0", d: "#2a1d68" } },
    { id: "sternenpflanzen", name: "Sternenpflanzen", quelle: "dlc", paket: "einzeln", farben: { G: "#9fb0ff", g: "#5a6ad8", d: "#2a3590" },
        klasse: "pflanzen-sterne", teilchen: ["#fff6a0", "#9fb0ff", "#ffffff"] },
    { id: "kristall", name: "Kristallpflanzen", quelle: "dlc", paket: "einzeln", farben: { G: "#bff0ff", g: "#7ac8e8", d: "#3a88b8" },
        klasse: "pflanzen-kristall", teilchen: ["#bff0ff", "#ffffff", "#9fe8ff"] }
];

// Der Mondteich im Hof (x in Prozent). Klick darauf oeffnet den Mondteich-Shop.
const TEICH_X = 24;
// Das Bauernhaus im Hof (x in Prozent, Breite in Prozent). Klick darauf oeffnet das Haus-Inventar.
const HAUS_BEREICH = { x: 5, breite: 8 };

// ---------- MONDTEICH: DAUERHAFTE UPGRADES (kosten Mondblueten) ----------
// max: Infinity = unendlich oft kaufbar. Mondblueten gibt es nur noch am Ende eines Runs,
// darum sind die ersten Stufen guenstig und die starken Upgrades deutlich teurer.

const META_UPGRADES = [
    { id: "startgold", name: "Startkapital", basiskosten: 1, faktor: 1.5, max: 10,
        beschreibung: "+10 Gold zu Beginn jedes Runs.", info: lvl => "+" + 10 * lvl + " Gold" },
    { id: "startsp", name: "Bauernweisheit", basiskosten: 2, faktor: 1.5, max: 10,
        beschreibung: "+25 Sternensamen zu Beginn jedes Runs.", info: lvl => "+" + 25 * lvl + " Sternensamen" },
    { id: "startfelder", name: "Vorbereiteter Boden", basiskosten: 3, faktor: 2, max: 4,
        beschreibung: "+1 Feld zu Beginn jedes Runs.", info: lvl => "+" + lvl + " Felder" },
    { id: "ausdauer", name: "Ausdauer", basiskosten: 6, faktor: 2.4, max: 4,
        beschreibung: "+25 Energie pro Tag.", info: lvl => "+" + 25 * lvl + " Energie" },
    { id: "flinkeFinger", name: "Flinke Finger", basiskosten: 3, faktor: 1.8, max: 5,
        beschreibung: "-2 Klicks pro Samen.", info: lvl => "-" + 2 * lvl + " Klicks" },
    { id: "verhandlung", name: "Verhandlungsgeschick", basiskosten: 5, faktor: 2.1, max: 5,
        beschreibung: "Rechnungen kosten 4% weniger.", info: lvl => "-" + 4 * lvl + "% Rechnungen" },
    { id: "ertrag", name: "Fruchtbarer Hof", basiskosten: 4, faktor: 1.45, max: 10,
        beschreibung: "+15% Gold aus allen Ernten.", info: lvl => "+" + 15 * lvl + "% Gold" },
    { id: "saatvorrat", name: "Saatgut-Vorrat", basiskosten: 20, faktor: 2.5, max: 3,
        beschreibung: "Jeder Run startet mit einer weiteren freigeschalteten Pflanze.",
        info: lvl => lvl + " Pflanzen zusätzlich freigeschaltet" },
    { id: "fruehervogel", name: "Früher Vogel", basiskosten: 15, faktor: 1, max: 1,
        beschreibung: "Tag 1 hat 100 Energie mehr.", info: lvl => (lvl ? "Aktiv" : "Nicht aktiv") },
    { id: "haendlerglueck", name: "Händlerglück", basiskosten: 10, faktor: 2.2, max: 3,
        beschreibung: "Der Wanderhändler kommt 10% öfter.", info: lvl => "+" + 10 * lvl + "% Chance" },
    { id: "wettergott", name: "Wettergott", basiskosten: 10, faktor: 2.2, max: 3,
        beschreibung: "Gutes Wetter ist wahrscheinlicher.", info: lvl => "+" + 25 * lvl + "% Gewicht für gutes Wetter" },
    { id: "gluecksbringer", name: "Glücksbringer", basiskosten: 8, faktor: 1.9, max: 5,
        beschreibung: "+2% Glück bei allen Glücksspielen.", info: lvl => "+" + 2 * lvl + "% Glück" },
    { id: "kraehenschreck", name: "Krähenschreck", basiskosten: 6, faktor: 2, max: 3,
        beschreibung: "Krähen brauchen 1 Sekunde länger, bis sie eine Pflanze stehlen.",
        info: lvl => sekText(KRAEHEN_KONFIG.stehlZeitSek + lvl) + " Zeit zum Verscheuchen" },
    { id: "vogelscheuchenlehre", name: "Vogelscheuchen-Lehre", basiskosten: 25, faktor: 1, max: 1,
        beschreibung: "Die Vogelscheuche ist in jedem Run sofort aktiv (ihr Stern im Stellarium ist schon gekauft).",
        info: lvl => (lvl ? "Aktiv" : "Nicht aktiv") },
    { id: "segensreich", name: "Segensreich", basiskosten: 60, faktor: 1, max: 1,
        beschreibung: "Nach jeder Rechnung hast du 4 Segen zur Auswahl statt 3.", info: lvl => (lvl ? "4 Segen" : "3 Segen") },
    { id: "kuschelrabatt", name: "Kuschel-Rabatt", basiskosten: 120, faktor: 1, max: 1,
        beschreibung: "Kuschel-Züge werden nur noch nach jedem 2. Zug um 1 teurer.",
        info: lvl => (lvl ? "+1 alle 2 Züge" : "+1 pro Zug") },
    { id: "mondlicht", name: "Mondlicht", basiskosten: 8, faktor: 1.5, max: Infinity,
        beschreibung: "x1,1 Gold aus allen Ernten. Unendlich oft kaufbar, jede Stufe multipliziert sich.",
        info: lvl => multiText(Math.pow(1.1, lvl)) + " Gold" }
];

// ---------- MONDTEICH: TAROTKARTEN ----------
// Die erste Karte kostet KONFIG.tarotPreis Mondblueten, jede weitere x KONFIG.tarotPreisFaktor.
// Dauerhaft verbessern kostet immer KONFIG.tarotVerbessernPreis.
// Verbesserte Karten koennen vor Tag 1 ausgeruestet werden (max. 3): "wert" (und "nachteil") x KONFIG.tarotVerstaerkung.
// text(f) bekommt den Faktor f (1 = normal, 1.5 = verstaerkt) und beschreibt die aktuelle Staerke.
// extra = zusaetzlicher Effekt NUR wenn die Karte verbessert und ausgeruestet ist.

const TAROT = [
    { id: "narr", nummer: "0", symbol: "🃏", name: "Der Narr", wert: 75,
        text: f => "Jeder Run startet mit " + aufrunden(75 * f) + " zusätzlichen Sternensamen." },
    { id: "magier", nummer: "I", symbol: "🪄", name: "Der Magier", wert: 0.25,
        text: f => prozentText(0.25 * f) + " Chance, dass eine Sternensaat doppelt zählt." },
    { id: "hohepriesterin", nummer: "II", symbol: "📜", name: "Die Hohepriesterin", wert: 0.10,
        text: f => "+" + prozentText(0.10 * f) + " Chance auf ungewöhnliche Saaten." },
    { id: "herrscherin", nummer: "III", symbol: "👑", name: "Die Herrscherin", wert: 2,
        text: f => "Jeden Tag werden " + aufrunden(2 * f) + " zusätzliche Felder bewässert." },
    { id: "herrscher", nummer: "IV", symbol: "🏛️", name: "Der Herrscher", wert: 0.10,
        text: f => "Rechnungen kosten " + prozentText(0.10 * f) + " weniger." },
    { id: "hierophant", nummer: "V", symbol: "🔑", name: "Der Hierophant", wert: 50,
        text: f => "Jede bezahlte Rechnung gibt dir " + aufrunden(50 * f) + " Sternensamen." },
    { id: "liebenden", nummer: "VI", symbol: "💞", name: "Die Liebenden", wert: 0.15,
        text: f => "+" + prozentText(0.15 * f) + " Chance, dass ein Samen einen zweiten mitbringt." },
    { id: "wagen", nummer: "VII", symbol: "🐎", name: "Der Wagen", wert: 25,
        text: f => "+" + aufrunden(25 * f) + " Energie pro Tag." },
    { id: "kraft", nummer: "VIII", symbol: "🦁", name: "Die Kraft", wert: 6,
        text: f => "-" + aufrunden(6 * f) + " Klicks pro Samen." },
    { id: "eremit", nummer: "IX", symbol: "🏮", name: "Der Eremit", wert: 2,
        text: f => "Der Igel-Sammler startet jeden Run auf Stufe " + aufrunden(2 * f) + "." },
    { id: "schicksal", nummer: "X", symbol: "🎡", name: "Rad des Schicksals", wert: 0.005,
        text: f => "+" + prozentText(0.005 * f) + " Chance auf den legendären Jackpot." },
    { id: "gerechtigkeit", nummer: "XI", symbol: "⚖️", name: "Die Gerechtigkeit", wert: 1,
        text: f => aufrunden(f) + "-mal pro Run: Kannst du eine Rechnung nicht zahlen, bekommst du einen Tag Aufschub (+25%)." },
    { id: "gehaengte", nummer: "XII", symbol: "🙃", name: "Der Gehängte", wert: 1,
        text: () => "+1 Platz für Werkzeuge vom Wanderhändler.",
        extra: "Noch ein Werkzeug-Platz mehr (+2 insgesamt)." },
    { id: "tod", nummer: "XIII", symbol: "💀", name: "Der Tod", wert: 1,
        text: () => "Fertige Pflanzen werden bei Feierabend automatisch geerntet.",
        extra: "Liegengebliebene Saaten werden bei Feierabend auch eingesammelt, statt zu verfallen." },
    { id: "maessigkeit", nummer: "XIV", symbol: "🏺", name: "Die Mäßigkeit", wert: 0.5,
        text: f => "Reißt die Kombo ab, behältst du " + prozentText(0.5 * f) + " davon." },
    { id: "teufel", nummer: "XV", symbol: "😈", name: "Der Teufel", wert: 0.4, nachteil: 0.2,
        text: f => "Pakt: +" + prozentText(0.4 * f) + " Gold aus allen Ernten, aber Rechnungen kosten " + prozentText(0.2 * f) + " mehr." },
    { id: "turm", nummer: "XVI", symbol: "🗼", name: "Der Turm", wert: 1,
        text: f => "Jeder " + aufrunden(KONFIG.turmIntervall / f) + ". Samen schlägt wie ein Blitz ein und ist sofort erntereif." },
    { id: "stern", nummer: "XVII", symbol: "⭐", name: "Der Stern", wert: 1,
        text: f => "+" + prozentText(0.005 * f) + " Chance auf goldene Pflanzen." },
    { id: "mond", nummer: "XVIII", symbol: "🌙", name: "Der Mond", wert: 1,
        text: f => "+" + prozentText(0.08 * f) + " Chance auf Geisterpflanzen." },
    { id: "sonne", nummer: "XIX", symbol: "☀️", name: "Die Sonne", wert: 0.15,
        text: f => "Alle Pflanzen wachsen " + prozentText(0.15 * f) + " schneller." },
    { id: "gericht", nummer: "XX", symbol: "📯", name: "Das Gericht", wert: 0.4,
        text: f => "+" + prozentText(0.4 * f) + " Mondblüten am Ende jedes Runs." },
    { id: "welt", nummer: "XXI", symbol: "🌍", name: "Die Welt", wert: 0.15,
        text: f => "+" + prozentText(0.15 * f) + " Gold aus allen Ernten." }
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
    { id: "gewoehnlich", name: "Gewöhnlich", chance: 0.50, farbe: "#e8e8e8", rand: "#8a8a8a" },
    { id: "ungewoehnlich", name: "Ungewöhnlich", chance: 0.27, farbe: "#5fd15f", rand: "#2e9e2e" },
    { id: "selten", name: "Selten", chance: 0.14, farbe: "#6cc0f5", rand: "#2f7fcf" },
    { id: "episch", name: "Episch", chance: 0.055, farbe: "#b06ee8", rand: "#7c2fc2" },
    { id: "legendaer", name: "Legendär", chance: 0.030, farbe: "#ffd93d", rand: "#d49a00" },
    { id: "mythisch", name: "Mythisch", chance: 0.005, farbe: "#ff9ad5", rand: "#e0409a" }
];

// raritaet = Index in KUSCHEL_RARITAETEN. text(stufe) beschreibt den Bonus auf der aktuellen Stufe.
// Die Wirkung steht in script.js (kuschel("id") = Stufe, 0 = nicht im Besitz).
const KUSCHELTIERE = [
    // Gewoehnlich
    { id: "hase", symbol: "🐰", name: "Stoffhase Hoppel", raritaet: 0,
        text: s => "+" + 5 * s + " Gold zu Beginn jedes Runs." },
    { id: "teddy", symbol: "🧸", name: "Teddy Brummi", raritaet: 0,
        text: s => "+" + 10 * s + " Energie pro Tag." },
    { id: "frosch", symbol: "🐸", name: "Frosch Quaki", raritaet: 0,
        text: s => "-" + s + " Klicks pro Samen." },
    { id: "maus", symbol: "🐭", name: "Maus Krümel", raritaet: 0,
        text: s => "+" + 3 * s + "% Chance, dass eine Sternensaat doppelt zählt." },
    { id: "schaf", symbol: "🐑", name: "Schaf Wolke", raritaet: 0,
        text: s => "Sternschnuppen geben " + s + " Sekunden länger doppeltes Gold." },
    { id: "ente", symbol: "🦆", name: "Ente Quak", raritaet: 0,
        text: s => "+" + 2 * s + " Energie pro Glühwürmchen." },
    { id: "schnecke", symbol: "🐌", name: "Schnecke Schleimi", raritaet: 0,
        text: s => "+" + 0.03 * s * 1000 + " ms Zeit für die Kombo." },
    // Ungewoehnlich
    { id: "kuschelkatze", symbol: "🐱", name: "Kuschelkatze Mimi", raritaet: 1,
        text: s => "Streichel-Saat ist " + 25 * s + "% mehr wert." },
    { id: "igelchen", symbol: "🦔", name: "Igelchen Stachel", raritaet: 1,
        text: s => "+" + 4 * s + "% Radius um deinen Cursor." },
    { id: "kueken", symbol: "🐥", name: "Küken Piep", raritaet: 1,
        text: s => "+" + 2 * s + "% Chance auf ungewöhnliche Saaten." },
    { id: "hundplueschi", symbol: "🐶", name: "Hündchen Bello", raritaet: 1,
        text: s => "Dein Begleiter hilft " + 10 * s + "% öfter." },
    { id: "eichhoernchen", symbol: "🐿️", name: "Eichhörnchen Nussi", raritaet: 1,
        text: s => "+" + s * 0.5 + " automatische Klicks pro Sekunde auf den Samenladen." },
    { id: "kuh", symbol: "🐮", name: "Kuh Muh", raritaet: 1,
        text: s => "+" + 0.5 * s + "% Zinsen bei Feierabend." },
    // Selten
    { id: "fuechslein", symbol: "🦊", name: "Füchslein Rotschopf", raritaet: 2,
        text: s => "+" + 6 * s + "% Gold aus allen Ernten." },
    { id: "pinguin", symbol: "🐧", name: "Pinguin Frack", raritaet: 2,
        text: s => "Alle Pflanzen wachsen " + 4 * s + "% schneller." },
    { id: "hummel", symbol: "🐝", name: "Hummel Summsi", raritaet: 2,
        text: s => "+" + 3 * s + "% Chance, dass ein Samen einen zweiten mitbringt." },
    { id: "papagei", symbol: "🦜", name: "Papagei Plapper", raritaet: 2,
        text: s => "Der Wanderhändler kommt " + 5 * s + "% öfter." },
    { id: "koala", symbol: "🐨", name: "Koala Knuddel", raritaet: 2,
        text: s => "Krähen brauchen " + s + " Sekunden länger, bis sie stehlen." },
    { id: "schildkroete", symbol: "🐢", name: "Schildkröte Opa", raritaet: 2,
        text: s => "Gewöhnliche Saaten sind " + 10 * s + "% mehr wert." },
    // Episch
    { id: "drache", symbol: "🐉", name: "Drache Funki", raritaet: 3,
        text: s => "+" + s + "% Chance auf epische Saaten." },
    { id: "eule", symbol: "🦉", name: "Eule Professor Huhu", raritaet: 3,
        text: s => "+" + 50 * s + " Sternensamen zu Beginn jedes Runs." },
    { id: "panda", symbol: "🐼", name: "Panda Bambus", raritaet: 3,
        text: s => "+" + 4 * s + "% Glück bei allen Glücksspielen." },
    { id: "loewe", symbol: "🦁", name: "Löwe Brüll", raritaet: 3,
        text: s => "Jede neue Kombo startet bei " + 10 * s + " statt bei 0." },
    { id: "oktopus", symbol: "🐙", name: "Oktopus Tinte", raritaet: 3,
        text: s => "Alle Spezialpflanzen kommen " + 10 * s + "% öfter." },
    // Legendaer
    { id: "einhorn", symbol: "🦄", name: "Einhorn Glitzer", raritaet: 4,
        text: s => "+" + prozentText(0.003 * s) + " Chance auf legendäre Saaten." },
    { id: "wal", symbol: "🐋", name: "Wal Blubber", raritaet: 4,
        text: s => "Rechnungen kosten " + 3 * s + "% weniger." },
    { id: "phoenix", symbol: "🔥", name: "Phönix Glut", raritaet: 4,
        text: s => "+" + 5 * s + "% Gold aus allen Ernten und 4 Segen zur Auswahl." },
    { id: "greif", symbol: "🦅", name: "Greif Sturm", raritaet: 4,
        text: s => "Alles beim Wanderhändler ist " + 5 * s + "% billiger." },
    // Mythisch
    { id: "mondhase", symbol: "🌙", name: "Mondhase Luna", raritaet: 5,
        text: s => multiText(Math.pow(1.25, s)) + " Gold aus allen Ernten und +" + 10 * s + "% Mondblüten am Run-Ende." },
    { id: "manta", symbol: "🐟", name: "Mantarochen Flatter", raritaet: 5,
        text: s => multiText(1 + 0.2 * s) + " Sternensamen aus Ernten und +" + 5 * s + "% Glück bei allen Glücksspielen." }
];
const KUSCHEL_NACH_ID = Object.fromEntries(KUSCHELTIERE.map(k => [k.id, k]));

// ---------- STERNENFALL (zweite Prestige-Ebene) ----------
// Setzt Mondblueten und die dauerhaften Mondteich-Upgrades zurueck.
// Behaelt: Tarotkarten, Kuscheltiere, Gutscheine, Erfolge, Kosmetik, Sandbox.
// Dafuer: Sternensplitter fuer den Sternenfall-Shop UND jeder Sternenfall verdoppelt alle zukuenftigen Mondblueten (x2, x4, x8 ...).

const STERNENFALL_KONFIG = {
    mindestMondblueten: 1500,     // so viele Mondblueten muessen seit dem letzten Sternenfall verdient worden sein
    splitterTeiler: 150           // Sternensplitter = Wurzel(verdiente Mondblueten / 150)
};

const STERNENFALL_UPGRADES = [
    { id: "sternenregen", name: "Sternenregen", symbol: "🌠", basiskosten: 1, faktor: 1.6, max: Infinity,
        beschreibung: "+25% Gold aus allen Ernten. Unendlich oft kaufbar.", info: lvl => "+" + 25 * lvl + "% Gold" },
    { id: "sternensaat", name: "Sternensaat", symbol: "✨", basiskosten: 1, faktor: 1.7, max: Infinity,
        beschreibung: "+10% Sternensamen aus Ernten. Unendlich oft kaufbar.", info: lvl => "+" + 10 * lvl + "% Sternensamen" },
    { id: "mondmagnet", name: "Mondmagnet", symbol: "🌙", basiskosten: 2, faktor: 1.8, max: Infinity,
        beschreibung: "+10% Mondblüten am Ende jedes Runs. Unendlich oft kaufbar.", info: lvl => "+" + 10 * lvl + "% Mondblüten" },
    { id: "ewigerfruehling", name: "Ewiger Frühling", symbol: "🌸", basiskosten: 2, faktor: 1.9, max: 10,
        beschreibung: "Alle Pflanzen wachsen 5% schneller.", info: lvl => "+" + 5 * lvl + "% Wachstum" },
    { id: "glueckstern", name: "Glücksstern", symbol: "⭐", basiskosten: 2, faktor: 2, max: 5,
        beschreibung: "+3% Glück bei allen Glücksspielen.", info: lvl => "+" + 3 * lvl + "% Glück" },
    { id: "kometenschweif", name: "Kometenschweif", symbol: "☄️", basiskosten: 4, faktor: 2.5, max: 3,
        beschreibung: "Jeder Run startet mit einem zufälligen Werkzeug.", info: lvl => lvl + " Werkzeuge zum Start" },
    { id: "himmelsgabe", name: "Himmelsgabe", symbol: "🎁", basiskosten: 3, faktor: 3, max: 3,
        beschreibung: "Jeder Sternenfall schenkt dir 3 Kuschel-Gutscheine.", info: lvl => 3 * lvl + " Gutscheine pro Sternenfall" }
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
