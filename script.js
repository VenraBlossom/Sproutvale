"use strict";

// ============================================================
// SPROUTVALE: Spiellogik (Kern)
// Kern-Loop: Samenladen klicken -> Aussaat -> Wachstum -> Ernte -> Saaten einsammeln
// Run: Tage mit Energie (= Tageszeit), Einkaufen zwischen den Tagen, Rechnung alle 5 Tage, danach ein Segen.
// Weitere Systeme in eigenen Dateien: haus.js (Hof, Haustier, Kosmetik), glueck.js (Gluecksspiele),
// mondteich.js (Meta-Shop, Kuscheltiere, Sternenfall, Spielmodi), ereignisse.js (Wetter, Kraehen, Goldregen,
// Boss-Rechnungen, Wanderhaendler, Werkzeuge), kodex.js (Sammelbuch), ui.js (Popups, Tooltips, Tasten).
// Zahlen/Listen: daten.js, Grafiken: sprites.js, Klaenge: audio.js
// ============================================================

// ---------- HAKEN: andere Dateien haengen sich hier an Spielereignisse an ----------
// tagVorbereiten (vor der Energie-Berechnung), tagStart, tagTick(dtMs), tagEnde, pauseStart,
// rechnungBezahlt(nummer), runStart, runEnde

const SPIEL_HAKEN = {};

function registriereHaken(name, funktion) {
    (SPIEL_HAKEN[name] = SPIEL_HAKEN[name] || []).push(funktion);
}

function haken(name, ...werte) {
    (SPIEL_HAKEN[name] || []).forEach(funktion => funktion(...werte));
}

// ---------- ACKER-RASTER ----------
// Links und rechts je 6 Spalten Felder, dazwischen der Weg mit dem Samenladen.
// Alle Feldpositionen werden von innen (am Samenladen) nach aussen sortiert.

const HALBE_SPALTEN = KONFIG.rasterSpalten / 2;
const MITTE_ZEILE = (KONFIG.rasterZeilen - 1) / 2;
const LADEN_MITTE_X = HALBE_SPALTEN + KONFIG.ladenBreite / 2;

// Feld-Spalte -> Spalte im CSS-Raster (Spalte HALBE_SPALTEN + 1 ist der Weg)
function cssSpalte(spalte) {
    return spalte < HALBE_SPALTEN ? spalte + 1 : spalte + 2;
}

// Mitte eines Feldes in Feld-Einheiten, der Weg ist 1,5 Felder breit
function feldX(spalte) {
    return spalte < HALBE_SPALTEN ? spalte + 0.5 : spalte + KONFIG.ladenBreite + 0.5;
}

function berechneFeldPositionen() {
    const positionen = [];
    for (let zeile = 0; zeile < KONFIG.rasterZeilen; zeile++) {
        for (let spalte = 0; spalte < KONFIG.rasterSpalten; spalte++) {
            const dx = spalte < HALBE_SPALTEN ? HALBE_SPALTEN - 1 - spalte : spalte - HALBE_SPALTEN;
            const dy = Math.abs(zeile - MITTE_ZEILE);
            const x = feldX(spalte) - LADEN_MITTE_X;
            const y = zeile - MITTE_ZEILE;
            positionen.push({
                spalte,
                zeile,
                links: spalte < HALBE_SPALTEN,
                ring: Math.max(dx, dy),
                abstand: Math.hypot(x, y),
                winkel: (Math.atan2(y, x) + Math.PI) % (Math.PI * 2)
            });
        }
    }
    return positionen.sort((a, b) => a.ring - b.ring || a.abstand - b.abstand || a.winkel - b.winkel);
}

const FELD_POSITIONEN = berechneFeldPositionen();
const MAX_FELDER = FELD_POSITIONEN.length;

// ---------- META-FORTSCHRITT (ueberlebt Runs, wird im Browser gespeichert) ----------

// Standard und Sandbox haben getrennten Fortschritt (Mondblueten, Upgrades, Tarot, Kuscheltiere, Statistik,
// Meisterschaft ...). Geteilt sind nur die Felder in META_GETEILT (Kosmetik, DLC, Freischaltung der Sandbox ...).
// "meta" ist immer der Fortschritt des Modus, der gerade laeuft. Der andere wartet in metaRuhend bzw. im Speicher.
const META_SPEICHER_KEY = "sproutvale_meta";
const SANDBOX_META_KEY = "sproutvale_meta_sandbox";
const META_GETEILT = ["dlc", "freigeschaltet", "kosmetik", "sandbox", "tutorial", "letzterModus", "erfolge", "kaeufeUmzug"];
let speichernGesperrt = false;
let metaProfil = "standard";
let metaRuhend = null; // Fortschritt des Standard-Modus, waehrend die Sandbox laeuft

function leereLebenszeit() {
    return {
        gold: 0, ernten: 0, jackpots: 0, spezial: 0, sterne: 0, klicks: 0, streicheln: 0, tage: 0, rechnungen: 0,
        gluehwuermchen: 0, streichelGold: 0, sternensamen: 0, bossRechnungen: 0, kraehen: 0, goldregen: 0,
        gluecksspielSiege: 0, maxWerkzeuge: 0, runs: 0, maxTag: 0,
        hoechsterGewinn: 0, maxKombo: 0, maxFelder: 0, maxPflanzen: 0
    };
}

function leereKosmetik() {
    return {
        haustier: "rot", landschaft: "standard", deko: ["vogelscheuche"], musik: "auto",
        samenladen: "standard", felder: "standard", kugeln: "standard", rahmen: "standard", pflanzen: "standard"
    };
}

function leererKodex() {
    return { pflanzen: {}, varianten: {}, wetter: {}, werkzeuge: {}, boss: {}, jahreszeiten: {} };
}

function leererMetaStand() {
    return {
        mondblueten: 0, gutscheine: 0, upgrades: {}, tarot: [], tarotVerbessert: [], tarotSlots: [],
        kuscheltiere: {}, kuschelZuegeBezahlt: 0,
        erfolge: {}, lebenszeit: leereLebenszeit(), besterRun: null, kodex: leererKodex(),
        sternenfaelle: 0, sternensplitter: 0, sternenfallUpgrades: {}, mondbluetenSeitSternenfall: 0,
        sandbox: false, dlc: false, freigeschaltet: {}, kosmetik: leereKosmetik(),
        mondphase: 0, mondphaseFrei: 0
    };
}

function ladeMeta(schluessel = META_SPEICHER_KEY) {
    try {
        const daten = JSON.parse(localStorage.getItem(schluessel));
        if (daten) {
            const stand = {
                ...leererMetaStand(),
                ...daten,
                // alte Spielstaende: die dauerhafte Waehrung hiess vorher "Sternensamen" bzw. "Prestige"
                mondblueten: daten.mondblueten ?? daten.sternensamen ?? daten.prestige ?? 0,
                upgrades: { ...daten.upgrades },
                tarot: Array.isArray(daten.tarot) ? daten.tarot : [],
                tarotVerbessert: Array.isArray(daten.tarotVerbessert) ? daten.tarotVerbessert : [],
                erfolge: { ...daten.erfolge },
                kuscheltiere: { ...daten.kuscheltiere },
                lebenszeit: { ...leereLebenszeit(), ...daten.lebenszeit },
                kodex: { ...leererKodex(), ...daten.kodex },
                sternenfallUpgrades: { ...daten.sternenfallUpgrades },
                freigeschaltet: { ...daten.freigeschaltet },
                kosmetik: { ...leereKosmetik(), ...daten.kosmetik }
            };
            // Umzug alter Felder: freieSkins/deko/haustierSkin gibt es jetzt unter freigeschaltet/kosmetik
            (daten.freieSkins || []).forEach(id => { stand.freigeschaltet["haustier:" + id] = true; });
            (daten.deko || []).forEach(id => { stand.freigeschaltet["deko:" + id] = true; });
            if (daten.haustierSkin && !daten.kosmetik) stand.kosmetik.haustier = daten.haustierSkin;
            // Deko war frueher ein Objekt {id: an/aus}, jetzt eine Liste mit hoechstens 3 Objekten
            if (!Array.isArray(stand.kosmetik.deko)) {
                stand.kosmetik.deko = Object.keys(stand.kosmetik.deko || {}).filter(id => stand.kosmetik.deko[id]).slice(0, 3);
            }
            ["sternensamen", "prestige", "offeneSternensamen", "freieSkins", "deko", "haustierSkin", "kuschelZuege"]
                .forEach(alt => delete stand[alt]);
            // Nur verbesserte Karten duerfen ausgeruestet sein
            stand.tarotSlots = (Array.isArray(daten.tarotSlots) ? daten.tarotSlots : [])
                .filter(id => stand.tarotVerbessert.includes(id));
            return stand;
        }
    } catch (fehler) {
        console.warn("Meta-Spielstand konnte nicht geladen werden", fehler);
    }
    return leererMetaStand();
}

// Nur die Fortschritts-Felder (ohne die geteilten)
function fortschrittVon(stand) {
    const fortschritt = {};
    Object.keys(stand).forEach(schluessel => {
        if (!META_GETEILT.includes(schluessel)) fortschritt[schluessel] = stand[schluessel];
    });
    return fortschritt;
}

function geteiltVon(stand) {
    const geteilt = {};
    META_GETEILT.forEach(schluessel => {
        if (stand[schluessel] !== undefined) geteilt[schluessel] = stand[schluessel];
    });
    return geteilt;
}

function speichereMeta() {
    if (speichernGesperrt) return;
    try {
        speichereKaeufe(meta);
        if (metaProfil === "sandbox") {
            localStorage.setItem(SANDBOX_META_KEY, JSON.stringify(fortschrittVon(meta)));
            localStorage.setItem(META_SPEICHER_KEY, JSON.stringify({ ...metaRuhend, ...geteiltVon(meta) }));
        } else {
            localStorage.setItem(META_SPEICHER_KEY, JSON.stringify(meta));
        }
    } catch (fehler) {
        console.warn("Meta-Spielstand konnte nicht gespeichert werden", fehler);
    }
}

// Tauscht den Fortschritt aus, wenn zwischen Standard und Sandbox gewechselt wird
function wechsleMetaProfil(sandbox) {
    const ziel = sandbox ? "sandbox" : "standard";
    if (metaProfil === ziel) return;
    speichereMeta();
    const bisher = fortschrittVon(meta);
    const neu = ziel === "sandbox" ? fortschrittVon(ladeMeta(SANDBOX_META_KEY)) : metaRuhend;
    Object.keys(bisher).forEach(schluessel => delete meta[schluessel]);
    Object.assign(meta, neu);
    metaRuhend = ziel === "sandbox" ? bisher : null;
    metaProfil = ziel;
}

// Mondblueten eines Modus (auch wenn er gerade nicht laeuft), z.B. fuer das Hauptmenue
function profilMondblueten(sandbox) {
    if ((metaProfil === "sandbox") === sandbox) return meta.mondblueten;
    if (!sandbox) return metaRuhend ? metaRuhend.mondblueten : meta.mondblueten;
    return ladeMeta(SANDBOX_META_KEY).mondblueten;
}

// ---------- GEKAUFTE INHALTE (DLC) ----------
// Stehen in einer eigenen Datei (kaeufe.dat) mit Pruefsumme. Wer den Spielstand von Hand aendert ("dlc": true),
// bekommt dadurch nichts: beim Laden zaehlt nur, was in der Kauf-Datei steht und zur Pruefsumme passt.
// Spaeter wird das zusaetzlich mit Steam abgeglichen.
const KAEUFE_KEY = "sproutvale_kaeufe";

function kaufPruefsumme(text) {
    // cyrb53 mit festem Salz (kein echter Schutz, aber einfaches Umschreiben reicht nicht mehr)
    const salz = "sv-" + text.length + "-bl00m";
    let h1 = 0xdeadbeef ^ 0x5eed;
    let h2 = 0x41c6ce57 ^ 0x5eed;
    const eingabe = salz + text + salz;
    for (let i = 0; i < eingabe.length; i++) {
        const c = eingabe.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 2654435761);
        h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function dlcListen() {
    return { haustier: HAUSTIER_SKINS, landschaft: HOF_THEMEN, deko: DEKO_OBJEKTE, musik: MUSIK_TITEL, samenladen: SAMENLADEN_SKINS,
        felder: FELD_SKINS, kugeln: KUGEL_SKINS, rahmen: RAHMEN_SKINS, pflanzen: PFLANZEN_SKINS };
}

function istDlcSchluessel(schluessel) {
    const [kategorie, id] = schluessel.split(":");
    const liste = dlcListen()[kategorie];
    const eintrag = liste && liste.find(e => e.id === id);
    return Boolean(eintrag && eintrag.quelle === "dlc");
}

function ladeKaeufe() {
    try {
        const roh = JSON.parse(localStorage.getItem(KAEUFE_KEY));
        if (roh && typeof roh.daten === "string" && kaufPruefsumme(roh.daten) === roh.sig) {
            const daten = JSON.parse(roh.daten);
            return { dlc: Boolean(daten.dlc), einzeln: Array.isArray(daten.einzeln) ? daten.einzeln : [] };
        }
    } catch (fehler) {
        console.warn("Kauf-Datei ungueltig", fehler);
    }
    return { dlc: false, einzeln: [] };
}

function speichereKaeufe(stand) {
    const daten = JSON.stringify({ dlc: Boolean(stand.dlc), einzeln: Object.keys(stand.freigeschaltet).filter(istDlcSchluessel).sort() });
    if (localStorage.getItem(KAEUFE_KEY) && ladeKaeufeText() === daten) return;
    localStorage.setItem(KAEUFE_KEY, JSON.stringify({ daten, sig: kaufPruefsumme(daten) }));
}

function ladeKaeufeText() {
    try { return JSON.parse(localStorage.getItem(KAEUFE_KEY)).daten; } catch (fehler) { return null; }
}

// Nur was in der Kauf-Datei steht, gilt als gekauft
function uebernehmeKaeufe(stand) {
    const kaeufe = ladeKaeufe();
    // Umzug: gab es noch keine Kauf-Datei, werden die bisherigen Kaeufe einmal uebernommen
    if (localStorage.getItem(KAEUFE_KEY) === null && !stand.kaeufeUmzug) {
        stand.kaeufeUmzug = true;
        speichereKaeufe(stand);
        return stand;
    }
    stand.dlc = kaeufe.dlc;
    Object.keys(stand.freigeschaltet).filter(istDlcSchluessel).forEach(schluessel => {
        if (!kaeufe.einzeln.includes(schluessel)) delete stand.freigeschaltet[schluessel];
    });
    kaeufe.einzeln.forEach(schluessel => { stand.freigeschaltet[schluessel] = true; });
    return stand;
}

const meta = uebernehmeKaeufe(ladeMeta());

function metaLevel(id) {
    return meta.upgrades[id] || 0;
}

function sfLevel(id) {
    return meta.sternenfallUpgrades[id] || 0;
}

function hatTarot(id) {
    return meta.tarot.includes(id);
}

function istVerbessert(id) {
    return meta.tarotVerbessert.includes(id);
}

function istVerstaerkt(id) {
    return istVerbessert(id) && meta.tarotSlots.includes(id);
}

// 0 = Karte nicht im Besitz, 1 = normal, 1.5 = verbessert und ausgeruestet
function tarotFaktor(id) {
    if (!hatTarot(id)) return 0;
    return istVerstaerkt(id) ? KONFIG.tarotVerstaerkung : 1;
}

// Aktueller Wert einer Tarotkarte (0, wenn nicht im Besitz)
function tw(id, feld = "wert") {
    return TAROT_NACH_ID[id][feld] * tarotFaktor(id);
}

// Stufe eines Kuscheltiers (0 = nicht im Besitz). Duplikate: 1 Stueck = Stufe 1, 2 = 2, 4 = 3, 8 = 4, 16 = 5
function kuschel(id) {
    const anzahl = meta.kuscheltiere[id] || 0;
    if (anzahl <= 0) return 0;
    return Math.min(KUSCHEL_KONFIG.maxStufe, Math.floor(Math.log2(anzahl)) + 1);
}

// Jede gekaufte Karte macht die naechste teurer (egal welche)
function tarotKaufPreis() {
    return aufrunden(KONFIG.tarotPreis * Math.pow(KONFIG.tarotPreisFaktor, meta.tarot.length));
}

// ---------- RUN-ZUSTAND (wird bei jedem neuen Run komplett neu erzeugt) ----------

let run = null;
let naechsteRunId = 1;

function neueTagesStatistik() {
    return {
        ernten: 0, gold: 0, sternensamen: 0, hoechsterGewinn: 0, hoechsterGewinnRaritaet: 0, verfallen: 0,
        gluehwuermchen: 0, kraehen: 0, gestohlen: 0
    };
}

function leereTagesBoni() {
    return { energie: 0, samenregen: false, mindestGruen: false, goldeneSamen: 0, goldBuffSek: 0, extraDuenger: 0 };
}

function erstelleRunZustand(sandbox = false) {
    const levelStart = {};
    [...SHOP_UPGRADES, ...SKILLS].forEach(def => { levelStart[def.id] = 0; });
    levelStart.igel = aufrunden(tw("eremit"));
    levelStart.p_weizen = 1; // der Weizen ist die Mitte des Stellariums und von Anfang an da
    // Ist ein Nachteil schon dauerhaft geloest (Tarot, Mondteich), ist der passende Stern gleich voll
    SKILLS.filter(def => def.erledigt && def.erledigt()).forEach(def => { levelStart[def.id] = def.max; });
    if (sandbox) {
        SKILLS.filter(def => SANDBOX_AUS_STERNE.includes(def.id)).forEach(def => { levelStart[def.id] = def.max; });
    }

    return {
        id: naechsteRunId++,
        sandbox,
        mondphase: sandbox ? 0 : Math.min(meta.mondphase || 0, meta.mondphaseFrei || 0),
        phase: "vorTag", // "tag" = spielen, "vorTag" = Einkaufen zwischen Tagen, "runEnde"
        tag: 1,
        gold: 10 * metaLevel("startgold") + 5 * kuschel("hase"),
        skillpunkte: 25 * metaLevel("startsp") + aufrunden(tw("narr")) + 50 * kuschel("eule"),
        energie: 0,
        tagesMaxEnergie: 0,
        bonusEnergie: 0,
        klickZaehler: 0,
        zielFeld: null,
        samenUnterwegs: false,
        bezahlteRechnungen: 0,
        rechnungsRabatt: 0,
        gnadenRechnung: 0,
        gnadenGenutzt: 0,
        gachaZuege: 0,
        glueck: neuerGlueckZustand(),
        letzterGachaZug: null,
        samenGesamt: 0,
        ernteZaehler: 0,
        goldBuffMs: 0,
        magnetMs: 0,
        sternTimerMs: 0,
        gluehTimerMs: 0,
        bienenMs: 0,
        hufeisenMs: 0,
        streichelZaehler: 0,
        level: levelStart,
        segen: {},
        segenAusstehend: false,
        segenBoss: false,
        segenWarteschlange: 0,
        meilensteine: 0,          // Sandbox: erreichte Meilensteine (statt bezahlter Rechnungen)
        meilensteineGemeldet: 0,
        segenAnzahl: 3,
        segenAuswahl: null,
        werkzeuge: [],
        wetter: null,
        bossRegel: null,
        haendler: null,
        pflanzen: PFLANZEN_VORLAGEN.map((vorlage, index) => ({
            ...vorlage,
            index,
            freigeschaltet: index === 0,
            level: Object.fromEntries(PFLANZEN_UPGRADES.map(u => [u.id, 0]))
        })),
        felder: [],
        statistik: neueTagesStatistik(),
        gesamt: {
            ernten: 0, gold: 0, maxKombo: 0, jackpots: 0, spezial: 0, klicks: 0, sterne: 0, streicheln: 0,
            hoechsterGewinn: 0, gluehwuermchen: 0, streichelGold: 0, sternensamen: 0, kraehen: 0, goldregen: 0,
            gluecksspielSiege: 0
        },
        tagesBoni: leereTagesBoni(),
        naechsterTag: leereTagesBoni(),
        nachrichten: [],
        karte: { modus: "start", daten: {} }
    };
}

// UI-Zustand, der nicht zum Spielstand gehoert
const kombo = { zaehler: 0, letzterKlick: 0, letzteStufe: 1 };
const maus = { x: -9999, y: -9999 };
const lootKugeln = [];
let slotEls = [];
let aktiverShopReiter = "allgemein";
let aktiverStern = "p_weizen";
let aktiverPrestigeReiter = "upgrades";
let aktiverStatistikReiter = "aktuell";
let karteEingeklappt = false;
let helferAkku = 0;
let panelRenderMs = 0;
let erfolgPruefMs = 0;
let musikPruefMs = 0;
let debugVariante = null;
let debugTageszeit = null;
let tageszeit = 0; // 0 = Morgen, 1 = Nacht (angezeigter Wert, gleitet weich zum Zielwert)

// ---------- BERECHNUNGEN ----------

function level(id) {
    return run.level[id] || 0;
}

function segen(id) {
    return run.segen[id] || 0;
}

function hatWerkzeug(id) {
    return run.werkzeuge.includes(id);
}

// Werkzeug-Stufe: je spaeter gekauft, desto staerker (Stufe 1 = vor der ersten Rechnung)
function werkzeugStufeJetzt() {
    return 1 + (run.sandbox ? run.meilensteine : run.bezahlteRechnungen);
}

function werkzeugStufe(id) {
    return (run.werkzeugStufen && run.werkzeugStufen[id]) || 1;
}

// Wert eines Werkzeugs auf einer Stufe (ohne Besitz-Pruefung)
function werkzeugWertFuer(w, stufe) {
    const faktor = w.abStufe2 ? stufe - 1 : 1 + WERKZEUG_STUFEN_BONUS * (stufe - 1);
    const wert = w.wert * faktor;
    return w.ganz ? Math.round(wert) : wert;
}

// Wert eines Werkzeugs, das man besitzt (0, wenn nicht)
function werkzeugWert(id) {
    if (!hatWerkzeug(id)) return 0;
    return werkzeugWertFuer(WERKZEUG_NACH_ID[id], werkzeugStufe(id));
}

function werkzeugText(id, stufe = werkzeugStufe(id)) {
    const w = WERKZEUG_NACH_ID[id];
    return w.text(werkzeugWertFuer(w, stufe));
}

function wetterIst(id) {
    return run.phase === "tag" && run.wetter === id;
}

function bossIst(id) {
    return run.bossRegel === id;
}

function istNacht() {
    return tageszeit > 0.62 && tageszeit < 1.22;
}

// Glueck bei Gluecksspielen: 0.1 = 10% bessere Chancen
function glueckBonus() {
    return 0.03 * level("glueckstraehne") + 0.02 * metaLevel("gluecksbringer") +
        0.05 * segen("glueckskind") + werkzeugWert("gluecksmuenze") + 0.04 * kuschel("panda") +
        0.05 * kuschel("manta") + 0.03 * sfLevel("glueckstern");
}

function klicksProSamen() {
    const abzug = 4 * level("aussaat") + 2 * metaLevel("flinkeFinger") + aufrunden(tw("kraft")) + 4 * segen("flink") +
        kuschel("frosch") + werkzeugWert("saatbeutel") + gachaBonus("klicks");
    const klicks = Math.max(KONFIG.minKlicksProSamen, KONFIG.startKlicksProSamen - abzug);
    return bossIst("teureSaat") ? Math.ceil(klicks * 1.25) : klicks;
}

// Energie ohne Wetter (Wetter wird beim Tagesstart eingerechnet)
function energieMax() {
    let energie = KONFIG.startEnergie + 25 * level("energie") + 10 * level("sonnenuhr") + 25 * metaLevel("ausdauer") +
        aufrunden(tw("wagen")) + 25 * segen("fruehstueck") + 10 * kuschel("teddy") + werkzeugWert("taschenuhr");
    if (run.tag === 1 && metaLevel("fruehervogel") > 0) energie += 100;
    if (bossIst("kurzeTage")) energie *= 0.8;
    energie *= jahreszeit().energie || 1;
    if (run.mondphase >= 3) energie *= 0.9;
    return Math.round(energie);
}

// [Gewoehnlich, Ungewoehnlich, Selten, Episch, Legendaer]
function raritaetsChancen() {
    const gruen = 0.20 + 0.03 * level("gruen") + tw("hohepriesterin") + 0.02 * kuschel("kueken");
    const blau = 0.02 * level("blau");
    const lila = 0.04 + 0.01 * level("lila") + 0.02 * segen("glueckspilz") + 0.01 * kuschel("drache");
    const gelb = 0.01 + 0.005 * level("gelb") + tw("schicksal") + 0.003 * kuschel("einhorn") + werkzeugWert("gluecksmuenze") / 10;
    return [Math.max(0, 1 - gruen - blau - lila - gelb), gruen, blau, lila, gelb];
}

function glueckChance() { return 0.05 * level("glueck") + 0.1 * level("glueck2") + werkzeugWert("kleeblatt") + gachaBonus("glueck"); }
function helferKlicksProSek() { return level("eichhoernchen") + 2 * level("eichhoernchen2") + 0.5 * kuschel("eichhoernchen"); }
function edelsteinBonus() { return 0.1 * level("edelstein"); }
function sternensamenProKlick() { return KONFIG.sternensamenProKlick + level("sternenklick") + segen("klingeling"); }
function spatzIntervallSek() { return level("saatspatz") > 0 ? 20 / level("saatspatz") : Infinity; }
function bienenIntervallSek() { return level("biene") > 0 ? 12 / level("biene") : Infinity; }
function magnetStaerke() { return 40 * level("magnetfeld"); }
function ueberflussChance(pflanze) { return 0.05 * pflanze.level.ueberfluss; }

function sammelRadius() {
    let radius = KONFIG.basisSammelRadius * Math.pow(KONFIG.sammelRadiusFaktor, Math.min(level("radius"), 30)) *
        (1 + 0.04 * kuschel("igelchen"));
    if (wetterIst("nebel") && !hatWerkzeug("strohhut")) radius *= 0.7;
    return radius;
}

function komboFensterMs() {
    let ms = KONFIG.basisKomboFensterMs + 100 * level("kombo") + 100 * segen("rhythmus") + 50 * level("kuhglocke") +
        30 * kuschel("schnecke");
    ms *= 1 + werkzeugWert("honigtopf");
    if (bossIst("nervoes")) ms *= 0.7;
    return Math.round(ms);
}

function anzahlBewaessert() {
    return level("giessen") + aufrunden(tw("herrscherin")) + level("sprinkler") + werkzeugWert("giesskanne") + gachaBonus("felder");
}

function anzahlGeduengt() {
    return level("duengen") + level("duengerabo") + werkzeugWert("zaubererde") + gachaBonus("felder");
}

function doppelwurfChance() {
    return 0.10 * level("doppelwurf") + tw("liebenden") + 0.03 * kuschel("hummel") + werkzeugWert("vogelnest");
}
function zinsDeckelAnteil() { return KONFIG.zinsDeckel + 0.25 * level("lagerhaus"); }
function zinsSatz() { return 0.02 * level("zinsen") + 0.005 * kuschel("kuh") + werkzeugWert("sparstrumpf"); }
function extraKugelChance() { return 0.08 * segen("erntesegen") + werkzeugWert("flechtkorb"); }

function gluehwuermchenEnergie() {
    const basis = (KONFIG.gluehwuermchenEnergie + 2 * level("laterne") + 2 * kuschel("ente")) * (1 + 0.5 * level("nachtwache"));
    return Math.round(basis * (1 + werkzeugWert("laterne")));
}

// Gold pro Klick auf den Samenladen ("Klingelnde Kasse")
function klickGold() {
    if (level("kasse") <= 0) return 0;
    return Math.max(1, Math.round(verkaufswert(bestePflanze()) * 0.002 * level("kasse") * goldMulti()));
}

function goldMulti() {
    const summe = 1 + 0.15 * metaLevel("ertrag") + tw("welt") + tw("teufel") + 0.15 * segen("goldhaende") +
        0.06 * kuschel("fuechslein") + 0.03 * level("marktschreier") + 0.04 * level("sternengold") +
        0.05 * kuschel("phoenix") + werkzeugWert("strohhut") + werkzeugWert("kristallkugel") +
        0.25 * sfLevel("sternenregen") + level("fuellhorn") + gachaBonus("gold");
    return summe * Math.pow(2, level("goldmarie")) * Math.pow(1.1, metaLevel("mondlicht")) * Math.pow(1.25, kuschel("mondhase")) *
        (jahreszeit().gold || 1);
}

// Wert-Faktor fuer Sternensamen (Mantarochen, Sternensaat)
function sternWertMulti() {
    return (1 + 0.2 * kuschel("manta")) * (1 + 0.1 * sfLevel("sternensaat")) * (1 + gachaBonus("sterne")) *
        (1 + 0.2 * level("sternenstaub")) * Math.pow(2, level("sternenflut")) * (jahreszeit().sterne || 1);
}

// Chance, dass eine Sternensamen doppelt zaehlt
function sternDoppelChance() {
    return tw("magier") + 0.15 * segen("wissen") + 0.05 * level("sternensammler") + 0.03 * kuschel("maus");
}

function variantenChance(variante) {
    const skill = SKILLS.find(s => s.variante === variante);
    const tarot = variante.tarotBonus ? variante.tarotBonus.chance * tarotFaktor(variante.tarotBonus.karte) : 0;
    if (run.sandbox && variante.energieBonus) return 0; // Blitzpflanzen geben nur Energie
    let chance = (skill.chanceProStufe * level(skill.id) + tarot) * (1 + 0.1 * kuschel("oktopus"));
    if (variante.id === "blitz" && wetterIst("gewitter")) chance *= 3;
    return chance;
}

function feldKosten() {
    // 2. Feld = 1 Gold, danach jedes Feld x1,9 (Feldvermessung macht es billiger)
    return aufrunden(Math.pow(KONFIG.feldKostenFaktor, run.felder.length - 1) * Math.pow(0.92, level("feldvermessung")) *
        Math.pow(0.85, segen("sparsam")));
}

function rechnungsBetrag(nummer) {
    const rabatt = 0.04 * metaLevel("verhandlung") + tw("herrscher") + run.rechnungsRabatt + 0.08 * segen("sparfuchs") +
        0.03 * kuschel("wal");
    const phase = run ? run.mondphase || 0 : 0;
    const faktor = Math.max(0.1, 1 - rabatt) * (1 + tw("teufel", "nachteil")) * (phase >= 1 ? 1.2 : 1);
    const extra = phase >= 5 ? 3 : 0;
    let betrag = KONFIG.rechnungBasis;
    for (let i = 0; i < nummer; i++) betrag *= (KONFIG.rechnungFaktorenStart[i] || KONFIG.rechnungFaktor) + extra;
    return aufrunden(betrag * faktor);
}

function naechsterRechnungsTag() {
    return Math.ceil(run.tag / KONFIG.tageProRechnung) * KONFIG.tageProRechnung;
}

function naechsteRechnung() {
    const rechnung = run.gnadenRechnung
        ? { betrag: run.gnadenRechnung, tag: run.tag }
        : { betrag: rechnungsBetrag(run.bezahlteRechnungen), tag: naechsterRechnungsTag() };
    rechnung.tageBis = rechnung.tag - run.tag + 1;
    rechnung.boss = istBossRechnung(run.bezahlteRechnungen);
    return rechnung;
}

// Jede 3. Rechnung (Nr. 3, 6, 9 ...) ist eine Boss-Rechnung
function istBossRechnung(index) {
    const alle = run && run.mondphase >= 2 ? 2 : BOSS_KONFIG.alle;
    return (index + 1) % alle === 0;
}

function tageText(anzahl) {
    return anzahl === 1 ? "1 Tag" : anzahl + " Tagen";
}

// ---------- SANDBOX: MEILENSTEINE ----------
// In der Sandbox gibt es keine Rechnungen. Stattdessen zaehlt, wie viel Gold du insgesamt verdient hast:
// Jede Schwelle, an der im normalen Run eine Rechnung faellig waere, ist ein Meilenstein (Summe aller Rechnungen bis dahin).
// Meilensteine geben einen Segen und beim Sandbox-Prestige Mondblueten (weniger als ein normaler Run).

function meilensteinSchwelle(nummer) {
    let summe = 0;
    for (let i = 0; i < nummer; i++) {
        let betrag = KONFIG.rechnungBasis;
        for (let j = 0; j < i; j++) betrag *= KONFIG.rechnungFaktorenStart[j] || KONFIG.rechnungFaktor;
        summe += betrag;
    }
    return summe;
}

function erreichteMeilensteine() {
    let anzahl = 0;
    while (run.gesamt.gold >= meilensteinSchwelle(anzahl + 1)) anzahl++;
    return anzahl;
}

function sandboxMondblueten() {
    return aufrunden(mondbluetenFuerRechnungen(run.meilensteine) * SANDBOX_KONFIG.mondbluetenAnteil);
}

// Mondblueten, die man bekommt, wenn der Run (oder die Sandbox) jetzt endet
function mondbluetenJetzt() {
    return run.sandbox ? sandboxMondblueten() : mondbluetenFuerRechnungen(run.bezahlteRechnungen);
}

// Mondblueten fuer bezahlte Rechnungen: Nr. zum Quadrat (1, 4, 9, 16 ...), jeder Sternenfall verdoppelt alles
function mondbluetenFuerRechnungen(anzahl, mondphase = run ? run.mondphase || 0 : 0) {
    let summe = 0;
    for (let i = 1; i <= anzahl; i++) summe += i * i;
    const bonus = (1 + tw("gericht") + 0.10 * kuschel("mondhase") + 0.10 * sfLevel("mondmagnet")) *
        (1 + MONDPHASE_BONUS * mondphase);
    return aufrunden(summe * bonus * Math.pow(2, meta.sternenfaelle));
}

// +25% pro Stufe, alle 10 Stufen zusaetzlich x2
function ertragMulti(pflanze) {
    const stufe = pflanze.level.ertrag;
    return (1 + 0.25 * stufe) * Math.pow(2, Math.floor(stufe / 10));
}

// Meisterschaft einer Pflanze (0 bis 7) aus allen Ernten ueber alle Runs
function meisterStufe(pflanzenId) {
    const ernten = meta.kodex.pflanzen[pflanzenId] || 0;
    return MEISTER_SCHWELLEN.filter(schwelle => ernten >= schwelle).length;
}

function verkaufswert(pflanze) {
    return aufrunden(pflanze.verkaufswert * ertragMulti(pflanze) * (1 + MEISTER_BONUS * meisterStufe(pflanze.id)) *
        (1 + 3 * level("pg_" + pflanze.id)));
}

// Erntehase (Stellarium): erntet regelmaessig eine fertige Pflanze
function erntehaseSek() {
    return level("erntehase") > 0 ? 12 / level("erntehase") : Infinity;
}

function prachtChance(pflanze) {
    return 0.04 * pflanze.level.pracht;
}

// ---------- JAHRESZEITEN ----------
// Tag 1 bis 5 Fruehling, 6 bis 10 Sommer, 11 bis 15 Herbst, 16 bis 20 Winter, dann wieder Fruehling

function jahreszeitIndex(tag = run.tag) {
    return Math.floor((tag - 1) / JAHRESZEITEN_KONFIG.tageProJahreszeit) % JAHRESZEITEN.length;
}

// Eine Jahreszeit so, wie sie im aktuellen Modus wirkt (Sandbox: ohne Energie)
function jahreszeitFuer(index) {
    const z = JAHRESZEITEN[index];
    if (!run || !run.sandbox || !z.sandbox) return z;
    return { ...z, energie: undefined, ...z.sandbox };
}

function jahreszeit(tag) {
    const z = jahreszeitFuer(jahreszeitIndex(tag));
    if (!run || segen("saisonkind") <= 0) return z;
    // Segen "Kind der Jahreszeiten": jeder Effekt doppelt so stark (0,85 wird 0,7, 1,2 wird 1,4)
    const doppelt = wert => (wert === undefined ? undefined : 1 + (wert - 1) * 2);
    return { ...z, wachstum: doppelt(z.wachstum), energie: doppelt(z.energie), gold: doppelt(z.gold), sterne: doppelt(z.sterne) };
}

// Wie viele Tage die aktuelle Jahreszeit noch dauert (der laufende Tag zaehlt mit)
function jahreszeitRestTage() {
    const t = JAHRESZEITEN_KONFIG.tageProJahreszeit;
    return t - ((run.tag - 1) % t);
}

function wachstumsTempo() {
    return (jahreszeit().wachstum || 1) * wachstumsTempoOhneJahreszeit() * (1 + werkzeugWert("sanduhr"));
}

function wachstumsTempoOhneJahreszeit() {
    return 1 + tw("sonne") + 0.10 * segen("wachstum") + 0.04 * kuschel("pinguin") + 0.05 * sfLevel("ewigerfruehling") +
        gachaBonus("wachstum");
}

function basisStufenZeitSek(pflanze) {
    const mitUpgrade = pflanze.sekProStufe * Math.pow(0.92, pflanze.level.wachstum);
    return mitUpgrade / wachstumsTempo();
}

// Hat die Pflanze ihren eigenen Bonus-Stern (pb_...) im Stellarium?
function pflanzenBonus(pflanze, id) {
    return pflanze.id === id && level("pb_" + id) > 0;
}

// Tageszeit des laufenden Tages (0 = Morgen, 1 = Feierabend bzw. Nacht).
// In der Sandbox geht es danach weiter bis NACHT_ENDE (Nacht und Morgengrauen), dann beginnt der naechste Tag.
function tagesAnteil() {
    if (run.phase !== "tag") return 0;
    if (run.sandbox) return sandboxTageszeit();
    return 1 - run.energie / run.tagesMaxEnergie;
}

// Wie viel vom Tag schon vorbei ist (0 bis 1), z.B. fuer den Zeiger der Jahreszeiten-Uhr
function tagesFortschritt() {
    if (run.phase !== "tag") return 0;
    return run.sandbox ? klemme((run.tagMs || 0) / SANDBOX_TAG_MS, 0, 1) : tagesAnteil();
}

// Sandbox: keine Energie. Ein Tag ist ein voller Kreislauf: Morgen, Mittag, Abend, Nacht, Morgengrauen (3 Minuten).
const SANDBOX_TAG_MS = 180000;
const NACHT_ENDE = 1.3; // Tageszeit 1,3 sieht genauso aus wie 0 (Morgen)

function sandboxTageszeit() {
    return klemme((run.tagMs || 0) / SANDBOX_TAG_MS, 0, 1) * NACHT_ENDE;
}

// Sterne, die nur Energie geben: in der Sandbox automatisch voll (dort gibt es keine Energie)
// Sandbox: alles, was nur mit Energie oder Rechnungen zu tun hat, gibt es dort nicht.
// Sterne davon sind automatisch voll (damit der Weg dahinter frei ist), wirken aber nicht.
const SANDBOX_AUS_STERNE = ["s_energie", "sonnenuhr", "s_laterne", "nachtwache", "gluehglas", "zinsen", "lagerhaus", "erntefest",
    "v_blitz", "pb_sonnenblume"];
const SANDBOX_AUS_SHOP = ["energie", "laterne"];
const SANDBOX_AUS_SEGEN = ["sparfuchs", "fruehstueck", "nachteule"];
const SANDBOX_AUS_WERKZEUGE = ["sparstrumpf", "taschenuhr", "laterne"];
const SANDBOX_AUS_WAREN = ["elixier"];
const SANDBOX_AUS_META = ["verhandlung", "ausdauer", "fruehervogel"];
const SANDBOX_AUS_TAROT = ["wagen", "herrscher", "gerechtigkeit"];
const SANDBOX_AUS_KUSCHEL = ["teddy", "ente", "wal", "kuh"];

// Besonderheit einer Pflanze als Text (Kaffee gibt Energie: in der Sandbox ohne Wirkung, darum dort kein Text)
function eigenschaftText(pflanze) {
    if (run && run.sandbox && pflanze.eigenschaft === "wachmacher") return "";
    return pflanze.eigenschaftText || "";
}

// Text eines Wetters (in der Sandbox ohne den Teil mit der Energie)
function wetterText(wetter) {
    return run && run.sandbox && wetter.textSandbox ? wetter.textSandbox : wetter.text;
}

function istSandboxAus(id) {
    return run.sandbox && (SANDBOX_AUS_STERNE.includes(id) || SANDBOX_AUS_SHOP.includes(id));
}

function stufenZeitSek(feld) {
    let tempo = feld.variante && feld.variante.tempo || 1;
    const bewaessert = feld.bewaessert || (pflanzenBonus(feld.pflanze, "reis") && !bossIst("duerre"));
    if (bewaessert) tempo *= feld.pflanze.eigenschaft === "wasser" ? 3 : 2;
    if (pflanzenBonus(feld.pflanze, "karotte")) tempo *= 1.5;
    if (tagesAnteil() < 0.2) tempo *= 1 + 0.25 * level("morgentau");
    if (feld.pflanze.eigenschaft === "nacht" && istNacht()) tempo *= 2;
    if (feld.pflanze.eigenschaft === "mond") tempo *= istNacht() ? 3 : 0.5;
    if (wetterIst("hitze")) tempo *= 1.3;
    return basisStufenZeitSek(feld.pflanze) / tempo;
}

function komboMultiplikator() {
    let multi = 1;
    KONFIG.komboStufen.forEach(stufe => {
        if (kombo.zaehler >= stufe.ab) multi = stufe.multi;
    });
    return multi;
}

function wuerfleRaritaetIndex() {
    const chancen = raritaetsChancen();
    const wurf = Math.random();
    let summe = 0;
    for (let i = 0; i < chancen.length; i++) {
        summe += chancen[i];
        if (wurf < summe) return i;
    }
    return 0;
}

// Multiplikator einer Münz-Farbe (mit Edelsteinschleifer, Geizige Kundschaft, Schildkroete)
function raritaetsMulti(index) {
    if (index === 0) return (bossIst("geizig") ? 0.5 : 1) * (1 + 0.1 * kuschel("schildkroete") + 0.2 * level("schwereMuenzen"));
    return RARITAETEN[index].multi * (1 + edelsteinBonus());
}

function wuerfleVariante() {
    // von hinten nach vorne: seltene Varianten (Gold) werden zuerst geprueft
    for (let i = VARIANTEN.length - 1; i >= 0; i--) {
        if (Math.random() < variantenChance(VARIANTEN[i])) return VARIANTEN[i];
    }
    return null;
}

function bestePflanze() {
    const freie = run.pflanzen.filter(p => p.freigeschaltet);
    return freie.reduce((beste, p) => (verkaufswert(p) > verkaufswert(beste) ? p : beste), freie[0]);
}

// In der Sandbox kann man jederzeit einkaufen (es gibt dort keine Pausen zwischen den Tagen)
function darfEinkaufen() {
    if (run.sandbox) return run.phase !== "runEnde" && !run.segenAuswahl;
    return run.phase === "vorTag" && !run.segenAuswahl;
}

function darfMondteich() {
    return run.phase === "runEnde" || (run.phase === "vorTag" && run.tag === 1 && !run.sandbox);
}

function guthaben(waehrung) {
    return waehrung === "gold" ? run.gold : run.skillpunkte;
}

function bezahle(waehrung, betrag) {
    if (waehrung === "gold") run.gold -= betrag;
    else run.skillpunkte -= betrag;
}

function waehrungsName(waehrung) {
    return waehrung === "gold" ? "Gold" : "Sternensamen";
}

function preisText(betrag, waehrung) {
    return zahl(betrag) + " " + waehrungsName(waehrung);
}

// ---------- ELEMENTE ----------

const $ = id => document.getElementById(id);

const topBar = $("top-bar");
const himmelEl = $("himmel");
const himmelSterne = $("himmel-sterne");
const sonneEl = $("sonne");
const mondEl = $("mond");
const wolkenEl = $("wolken");
const landschaftEl = $("landschaft");
const fensterLichter = $("fenster-lichter");
const nachtSchleier = $("nacht-schleier");
const hofEbene = $("hof-ebene");
const fieldGrid = $("field-grid");
const marktstand = $("marktstand");
const wegEl = $("weg");
const moneyDisplay = $("money-display");
const skillpointDisplay = $("skillpoint-display");
const kalenderDisplay = $("kalender-display");
const rechnungDisplay = $("rechnung-display");
const buffAnzeige = $("buff-anzeige");
const energieFuellung = $("energie-fuellung");
const energieText = $("energie-text");
const neuanfangKnopf = $("neuanfang-knopf");

const plantButton = $("plant-button");
const plantButtonLabel = $("plant-button-label");
const plantButtonCounter = $("plant-button-counter");
const plantButtonFortschritt = $("plant-button-fortschritt");

const komboAnzeige = $("kombo-anzeige");
const komboText = $("kombo-text");
const komboFuellung = $("kombo-fuellung");

const kartenHalter = $("karten-halter");
const kartePfeil = $("karte-pfeil");
const tagesKarte = $("tages-karte");
const tagesKarteTitel = $("tages-karte-titel");
const tagesKarteInhalt = $("tages-karte-inhalt");
const karteShop = $("karte-shop");
const karteSkilltree = $("karte-skilltree");
const kartePrestige = $("karte-prestige");
const karteHaendler = $("karte-haendler");
const karteWeiter = $("karte-weiter");
const karteAufgeben = $("karte-aufgeben");

const shopPanel = $("shop-panel");
const shopContent = $("shop-content");
const shopReiter = $("shop-reiter");
const erfolgeContent = $("erfolge-content");
const statistikSeite = $("statistik-seite");
const statistikContent = $("statistik-content");
const statistikReiter = $("statistik-reiter");

const skilltreeFenster = $("skilltree-fenster");
const sternbildTitel = $("sternbild-titel");
const sternbildSp = $("sternbild-sp");
const himmelPunkte = $("himmel-punkte");
const sternbildLinien = $("sternbild-linien");
const sternbildKnotenEl = $("sternbild-knoten");
const sternbildDetails = $("sternbild-details");

const prestigeShop = $("prestige-shop");
const prestigeGuthaben = $("prestige-guthaben");
const prestigeInfo = $("prestige-info");
const prestigeReiter = $("prestige-reiter");
const prestigeInhalt = $("prestige-inhalt");
const prestigeWeiter = $("prestige-weiter");

const segenFenster = $("segen-fenster");
const segenKarten = $("segen-karten");

const hauptmenue = $("hauptmenue");
const menueSpielen = $("menue-spielen");
const einstellungenFenster = $("einstellungen-fenster");
const einstellungenHauptmenue = $("einstellungen-hauptmenue");
const einstellungenSchliessen = $("einstellungen-schliessen");
const reglerMusik = $("regler-musik");
const reglerSfx = $("regler-sfx");
const resetZeile = $("reset-zeile");
const spielstandLoeschen = $("spielstand-loeschen");

const fxLayer = $("fx-layer");
const sammelRing = $("sammel-ring");
const toastBox = $("toasts");

// ---------- SPRITES IN DIE SEITE UEBERNEHMEN ----------
// Alle Pixel-Bilder werden in ganzen Vielfachen ihrer Pixel angezeigt, damit gleiche Dinge gleich grosse Pixel haben:
// Icons x2, grosse Icons x3, Hof x5 (HOF_PIXEL)

const HOF_PIXEL = 5;

function setzeSpriteBild(img, name, skala) {
    const leinwand = spriteLeinwand(name);
    img.src = spriteUrl(name);
    img.style.width = leinwand.width * skala + "px";
    img.style.height = leinwand.height * skala + "px";
}

function spriteIcon(name, gross) {
    const img = document.createElement("img");
    img.classList.add("icon");
    img.alt = "";
    setzeSpriteBild(img, name, gross ? 3 : 2);
    return img;
}

document.documentElement.style.setProperty("--halb", HALBE_SPALTEN);
document.documentElement.style.setProperty("--zeilen", KONFIG.rasterZeilen);
document.documentElement.style.setProperty("--laden", KONFIG.ladenBreite);
document.documentElement.style.setProperty("--hof-px", HOF_PIXEL + "px");
marktstand.style.gridColumn = HALBE_SPALTEN + 1;
marktstand.style.gridRow = "1 / -1";
wegEl.style.gridColumn = HALBE_SPALTEN + 1;
wegEl.style.gridRow = "1 / -1";
$("plant-button-bild").src = spriteUrl("saatsack");
document.querySelectorAll("img[data-sprite]").forEach(img => {
    const skala = img.classList.contains("himmelskoerper") ? HOF_PIXEL : img.classList.contains("icon-gross") ? 3 : 2;
    setzeSpriteBild(img, img.dataset.sprite, skala);
});

// Muenz-Sprite passend zu Raritaet, Muenz-Skin (Haus) und Farbenblind-Modus
const EDELSTEIN_FARBEN = [null, "#3fbf3f", "#2f8fe0", "#9a4fe0"];

function muenzeSprite(raritaet) {
    const skin = gewaehlteKosmetik("kugeln");
    const fb = einstellungen.farbenblind;
    const name = "muenze_" + raritaet + "_" + skin.id + (fb ? "_fb" : "");
    if (raritaet === JACKPOT_INDEX) return spriteVariante(name, "muenze_stern", { ...skin.farben });
    const farben = { ...skin.farben, Z: raritaet === 0 ? (skin.farben.y || "#d9a82a") : EDELSTEIN_FARBEN[raritaet] };
    return spriteVariante(name, fb ? "muenze_form_" + raritaet : "muenze", farben);
}

// ---------- HIMMEL, TAGESZEIT UND HOF-LANDSCHAFT ----------
// Die Tageszeit folgt der Energie: volle Energie = Morgen, leere Energie = Nacht.

const HIMMEL_FARBEN = [
    [0.00, "#7ab6e8", "#f6d2a8"],
    [0.15, "#5fb0ea", "#cfeefb"],
    [0.60, "#5fb0ea", "#cfeefb"],
    [0.78, "#6a78c8", "#f5a36a"],
    [0.90, "#202a60", "#5a4a8a"],
    [1.00, "#0e1436", "#26306a"],
    // nur in der Sandbox: tiefe Nacht und Morgengrauen, 1,3 = wieder Morgen
    [1.15, "#0e1436", "#26306a"],
    [1.23, "#3a4a9a", "#e89aa8"],
    [1.30, "#7ab6e8", "#f6d2a8"]
];

function mischeFarbe(a, b, t) {
    const ka = parseInt(a.slice(1), 16);
    const kb = parseInt(b.slice(1), 16);
    const kanal = verschiebung => {
        const va = (ka >> verschiebung) & 255;
        const vb = (kb >> verschiebung) & 255;
        return Math.round(va + (vb - va) * t);
    };
    return "rgb(" + kanal(16) + "," + kanal(8) + "," + kanal(0) + ")";
}

function himmelsFarben(p) {
    for (let i = 1; i < HIMMEL_FARBEN.length; i++) {
        const [bis, oben, unten] = HIMMEL_FARBEN[i];
        const [von, obenVor, untenVor] = HIMMEL_FARBEN[i - 1];
        if (p <= bis) {
            const t = (p - von) / (bis - von);
            return [mischeFarbe(obenVor, oben, t), mischeFarbe(untenVor, unten, t)];
        }
    }
    return [HIMMEL_FARBEN[HIMMEL_FARBEN.length - 1][1], HIMMEL_FARBEN[HIMMEL_FARBEN.length - 1][2]];
}

function zielTageszeit() {
    if (debugTageszeit !== null) return debugTageszeit;
    if (run.phase === "tag") return klemme(tagesAnteil(), 0, run.sandbox ? NACHT_ENDE : 1);
    if (run.phase === "vorTag" && run.tag === 1) return 0.05;
    return 1;
}

let letzteHimmelZeit = -1;

function aktualisiereHimmel(dtMs) {
    const ziel = zielTageszeit();
    // Sandbox: nach dem Morgengrauen (1,3) springt die Tageszeit auf 0, beides sieht gleich aus
    if (run.sandbox && ziel < tageszeit - 0.6) tageszeit = ziel;
    else tageszeit += (ziel - tageszeit) * Math.min(1, (dtMs / 1000) * 2.5);
    if (Math.abs(tageszeit - letzteHimmelZeit) < 0.002) return;
    letzteHimmelZeit = tageszeit;
    const p = tageszeit;

    const [oben, unten] = himmelsFarben(p);
    // Bei Regen, Gewitter und Nebel ist der Himmel grauer
    const trueb = run.phase === "tag" && ["regen", "gewitter", "nebel"].includes(run.wetter);
    himmelEl.style.background = "linear-gradient(" + oben + ", " + unten + ")";
    himmelEl.style.filter = trueb ? "saturate(0.35) brightness(0.8)" : "";

    const hoehe = topBar.clientHeight;
    const horizont = hoehe * 0.55;
    const gipfel = 62;

    // Sonne: geht links auf, wandert im Bogen und geht rechts unter
    const tSonne = klemme(p / 0.82, 0, 1);
    sonneEl.style.left = 6 + tSonne * 88 + "%";
    sonneEl.style.top = horizont - Math.sin(tSonne * Math.PI) * (horizont - gipfel) + "px";
    sonneEl.style.opacity = p < 0.84 && !trueb ? 1 : 0;
    // Sandbox-Morgengrauen: die Sonne steigt links langsam wieder auf
    const morgengrauen = klemme((p - 1.15) / 0.15, 0, 1);
    if (morgengrauen > 0) {
        sonneEl.style.left = "6%";
        sonneEl.style.top = horizont + (1 - morgengrauen) * 40 + "px";
        sonneEl.style.opacity = trueb ? 0 : morgengrauen;
    }

    // Mond: geht am Abend links auf, in der Sandbox-Nacht wandert er weiter nach rechts und geht unter
    const tMond = klemme((p - 0.7) / 0.3, 0, 1);
    mondEl.style.left = 10 + tMond * 26 + "%";
    mondEl.style.top = horizont - Math.sin(tMond * Math.PI * 0.5) * (horizont - gipfel - 10) + "px";
    mondEl.style.opacity = tMond > 0 ? 1 : 0;
    if (p > 1) {
        const t2 = klemme((p - 1) / 0.3, 0, 1);
        mondEl.style.left = 36 + t2 * 54 + "%";
        mondEl.style.top = horizont - Math.cos(t2 * Math.PI * 0.5) * (horizont - gipfel - 10) + "px";
        mondEl.style.opacity = 1 - klemme((t2 - 0.75) / 0.25, 0, 1);
    }

    const nachtHin = klemme((p - 0.62) / 0.33, 0, 1);
    const nachtWeg = 1 - morgengrauen;
    const nacht = Math.min(nachtHin, nachtWeg);
    himmelSterne.style.opacity = Math.min(klemme((p - 0.75) / 0.2, 0, 1), klemme(1 - (p - 1.15) / 0.1, 0, 1));
    fensterLichter.style.opacity = Math.min(klemme((p - 0.6) / 0.25, 0, 1), nachtWeg);
    nachtSchleier.style.opacity = nacht * 0.45;
    wolkenEl.style.filter = "brightness(" + (1 - nacht * 0.55) * (trueb ? 0.75 : 1) + ")";
}

function erstelleHimmel() {
    for (let i = 0; i < 46; i++) {
        const stern = document.createElement("span");
        stern.classList.add("himmel-stern");
        stern.style.left = Math.random() * 100 + "%";
        stern.style.top = 60 + Math.random() * 90 + "px";
        stern.style.animationDelay = -Math.random() * 3 + "s";
        if (Math.random() < 0.25) stern.classList.add("gross");
        himmelSterne.appendChild(stern);
    }
    for (let i = 0; i < 6; i++) {
        const wolke = document.createElement("img");
        wolke.classList.add("wolke");
        wolke.alt = "";
        setzeSpriteBild(wolke, "wolke", HOF_PIXEL);
        wolke.style.top = 58 + Math.random() * 60 + "px";
        const dauer = 90 + Math.random() * 80;
        wolke.style.animationDuration = dauer + "s";
        wolke.style.animationDelay = -Math.random() * dauer + "s";
        wolkenEl.appendChild(wolke);
    }
}

// Hof (Kopfbereich im Spiel, 5x vergroesserte Pixel) und Tal (Hauptmenue, 4x)
let hofSzene = null;

function zeichneLandschaften() {
    const kopf = topBar.getBoundingClientRect();
    hofSzene = zeichneHof(kopf.width / HOF_PIXEL, kopf.height / HOF_PIXEL, gewaehlteKosmetik("landschaft").id);
    landschaftEl.style.backgroundImage = "url(" + hofSzene.url + ")";
    fensterLichter.innerHTML = "";
    hofSzene.lichter.forEach(licht => {
        const el = document.createElement("div");
        el.classList.add("fenster-licht");
        el.style.left = (licht.x / hofSzene.breite) * 100 + "%";
        el.style.top = (licht.y / hofSzene.hoehe) * 100 + "%";
        el.style.width = (licht.b / hofSzene.breite) * 100 + "%";
        el.style.height = (licht.h / hofSzene.hoehe) * 100 + "%";
        fensterLichter.appendChild(el);
    });
    hauptmenue.style.backgroundImage = "url(" + zeichneTal(window.innerWidth / 4, window.innerHeight / 4) + ")";
    letzteHimmelZeit = -1;
    haken("landschaftGezeichnet", hofSzene);
}

let landschaftTimer = null;
window.addEventListener("resize", () => {
    clearTimeout(landschaftTimer);
    landschaftTimer = setTimeout(zeichneLandschaften, 200);
});

// ---------- FELDER ----------

function erstelleSlots() {
    fieldGrid.querySelectorAll(".slot").forEach(el => el.remove());
    slotEls = FELD_POSITIONEN.map((pos, index) => {
        const el = document.createElement("div");
        el.className = "slot";
        el.style.gridColumn = cssSpalte(pos.spalte);
        el.style.gridRow = pos.zeile + 1;
        el.dataset.index = index;
        fieldGrid.appendChild(el);
        return el;
    });
}

function erstelleFeld() {
    const index = run.felder.length;
    const feldDiv = slotEls[index];
    feldDiv.className = "slot feld feld-leer";
    feldDiv.innerHTML = "";
    delete feldDiv.dataset.tipp;

    const varianteEl = document.createElement("div");
    varianteEl.classList.add("feld-variante");
    const markerEl = document.createElement("div");
    markerEl.classList.add("feld-marker");
    const spriteEl = document.createElement("img");
    spriteEl.classList.add("feld-sprite");
    spriteEl.alt = "";
    spriteEl.draggable = false;
    spriteEl.hidden = true;
    const nameEl = document.createElement("div");
    nameEl.classList.add("feld-name");
    const balkenAussen = document.createElement("div");
    balkenAussen.classList.add("fortschritt-aussen");
    const balkenInnen = document.createElement("div");
    balkenInnen.classList.add("fortschritt-innen");
    balkenAussen.appendChild(balkenInnen);

    feldDiv.append(varianteEl, markerEl, spriteEl, nameEl, balkenAussen);

    run.felder.push({
        index, pflanze: null, variante: null, stufe: 0, fortschrittMs: 0, fertig: false, leer: true,
        reserviert: false, ernteKlicksRest: 0, bewaessert: false, geduengt: false,
        el: { feldDiv, varianteEl, markerEl, spriteEl, nameEl, balkenInnen }
    });
}

// Ein Listener fuer den ganzen Acker. Tagsueber erntet der Cursor-Kreis alle fertigen Pflanzen,
// die er beruehrt (je groesser der Kreis, desto mehr). Zwischen den Tagen: naechstes Feld kaufen.
fieldGrid.addEventListener("pointerdown", event => {
    if (event.button !== 0 || spielPausiert()) return;
    if (event.target.closest("#marktstand")) return;
    const slot = event.target.closest(".slot");
    const kaufKachel = slot && Number(slot.dataset.index) === run.felder.length;
    if (run.phase === "tag" && !(run.sandbox && kaufKachel)) {
        ernteMitCursor(event.clientX, event.clientY);
        return;
    }
    if (kaufKachel) kaufeFeld();
});

function abstandZuRechteck(x, y, rect) {
    const dx = Math.max(rect.left - x, 0, x - rect.right);
    const dy = Math.max(rect.top - y, 0, y - rect.bottom);
    return Math.hypot(dx, dy);
}

function ernteMitCursor(x, y) {
    const radius = sammelRadius();
    const treffer = run.felder
        .filter(feld => feld.fertig)
        .map(feld => ({ feld, abstand: abstandZuRechteck(x, y, feld.el.feldDiv.getBoundingClientRect()) }))
        .filter(t => t.abstand <= radius)
        .sort((a, b) => a.abstand - b.abstand);

    let geerntet = 0;
    treffer.forEach(t => {
        if (klickFeld(t.feld)) geerntet += 1;
    });
    if (geerntet >= 2) {
        const farbe = geerntet >= 9 ? "#d9452c" : geerntet >= 4 ? "#e08a00" : "#2e9e2e";
        zeigeSchwebeText(x, y - 24, geerntet + "x Ernte!", farbe, geerntet >= 3);
        if (geerntet >= 4) partikel(x, y, ["#ffd93d", "#ffffff", "#a3dc6f"], Math.min(40, 10 + geerntet * 2), 90);
        if (geerntet >= 3) grosseErnteWelle(x, y, geerntet);
    }
}

function feldMitte(feld) {
    const rect = feld.el.feldDiv.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect };
}

// gibt true zurueck, wenn die Pflanze geerntet wurde
function klickFeld(feld) {
    if (!feld.fertig || run.phase !== "tag" || feld.kraehe) return false;

    if (feld.ernteKlicksRest > 1) {
        feld.ernteKlicksRest -= 1;
        feld.el.nameEl.textContent = "Noch " + feld.ernteKlicksRest + "x";
        const { x, y } = feldMitte(feld);
        partikel(x, y, ["#9fe8ff", "#ffffff", "#5aa9e6"], 6, 45);
        Klang.klick(40);
        feld.el.feldDiv.classList.remove("wackeln");
        void feld.el.feldDiv.offsetWidth; // Animation neu starten
        feld.el.feldDiv.classList.add("wackeln");
        return false;
    }
    ernteFeld(feld, false);
    return true;
}

function kaufeFeld() {
    const kosten = feldKosten();
    if (!darfEinkaufen() || run.gold < kosten || run.felder.length >= MAX_FELDER) return;
    run.gold -= kosten;
    erstelleFeld();
    Klang.kaufen();
    const { x, y } = feldMitte(run.felder[run.felder.length - 1]);
    partikel(x, y, ["#8a5a2b", "#c89b6a", "#6cc24a"], 10, 50);
    aktualisiereAlles();
}

function aktualisiereKaufKachel() {
    const el = slotEls[run.felder.length];
    if (!el) return;

    if (!el.classList.contains("kauf-kachel")) {
        el.classList.add("feld", "kauf-kachel");
        el.innerHTML = '<div class="kauf-schild"><div class="kauf-plus">+</div><div class="kauf-preis"></div></div>';
    }
    const kosten = feldKosten();
    el.querySelector(".kauf-preis").textContent = zahl(kosten) + " Gold";
    el.classList.toggle("gesperrt", !darfEinkaufen() || run.gold < kosten);
    el.classList.toggle("leistbar", darfEinkaufen() && run.gold >= kosten);
    setzeTipp(el, darfEinkaufen() ? "Neues Feld kaufen" : "Felder kaufst du zwischen den Tagen");
}

function setzeVariantenKlasse(feld, variante) {
    VARIANTEN.forEach(v => feld.el.feldDiv.classList.remove("v-" + v.id));
    if (variante) feld.el.feldDiv.classList.add("v-" + variante.id);
}

// Sprite-Name mit dem gewaehlten Pflanzen-Look (Haus > Pflanzen)
function pflanzenSkinSprite(name) {
    const skin = gewaehlteKosmetik("pflanzen");
    if (!skin.farben || Object.keys(skin.farben).length === 0) return name;
    // Ist der Name selbst schon eine Farbvariante (z.B. unreif), werden beide Farbwechsel kombiniert
    const abwandlung = SPRITE_ABWANDLUNGEN[name];
    if (abwandlung) return spriteVariante(name + "_" + skin.id, abwandlung.basis, { ...abwandlung.farben, ...skin.farben });
    return spriteVariante(name + "_" + skin.id, name, skin.farben);
}

function zeigeFeldSprite(feld) {
    const sprite = feld.el.spriteEl;
    if (feld.leer) {
        sprite.hidden = true;
        return;
    }
    // Stufe 0 Samen, 1 Keimling, 2 die Pflanze selbst in unreif (kleiner, Fruechte noch gruen), 3 reif
    const name = feld.stufe === 2 ? unreifSprite(feld.pflanze.id) : feld.stufe < 3 ? STUFEN_SPRITES[feld.stufe] : feld.pflanze.id;
    sprite.src = spriteUrl(pflanzenSkinSprite(name));
    sprite.classList.toggle("unreif", feld.stufe === 2);
    sprite.hidden = false;
    sprite.classList.remove("wachsen");
    void sprite.offsetWidth;
    sprite.classList.add("wachsen");
}

function leereFeld(feld) {
    Object.assign(feld, {
        pflanze: null, variante: null, stufe: 0, fortschrittMs: 0, fertig: false, leer: true, reserviert: false,
        ernteKlicksRest: 0, kraehe: null
    });
    feld.el.feldDiv.classList.remove("feld-fertig", "feld-ziel");
    feld.el.feldDiv.classList.add("feld-leer");
    setzeVariantenKlasse(feld, null);
    setzeTipp(feld.el.feldDiv, null);
    feld.el.varianteEl.textContent = "";
    feld.el.nameEl.textContent = "";
    feld.el.balkenInnen.style.width = "0%";
    zeigeFeldSprite(feld);
}

function aktualisiereFeldMarker(feld) {
    // Kein Symbol mehr: Wasser und Duenger sieht man am Feld selbst (Ebene feld-marker, style.css)
    feld.el.feldDiv.classList.toggle("feld-bewaessert", feld.bewaessert);
    feld.el.feldDiv.classList.toggle("feld-geduengt", feld.geduengt);
}

// Hinweistext eines bepflanzten Feldes (Tooltip)
function feldTipp(feld) {
    const p = feld.pflanze;
    let text = p.emoji + " " + p.name + " · " + zahl(verkaufswert(p)) + " Gold Grundwert";
    if (feld.variante) text += "\n" + feld.variante.badge + " " + feld.variante.titel + ": " + feld.variante.beschreibung;
    if (eigenschaftText(p)) text += "\n" + eigenschaftText(p);
    if (feld.bewaessert) text += "\n💧 Bewässert: wächst schneller";
    if (feld.geduengt) text += "\n🪱 Gedüngt: doppeltes Gold";
    return text;
}

function pflanzeSamen(feld) {
    const pflanze = zufall(run.pflanzen.filter(p => p.freigeschaltet));

    let variante = wuerfleVariante();
    if (run.tagesBoni.goldeneSamen > 0) {
        variante = VARIANTE_NACH_ID.golden;
        run.tagesBoni.goldeneSamen -= 1;
    }
    if (debugVariante) variante = VARIANTE_NACH_ID[debugVariante];

    Object.assign(feld, {
        pflanze, variante, stufe: 0, fortschrittMs: 0, fertig: false, leer: false, reserviert: false,
        ernteKlicksRest: variante && variante.ernteKlicks || 0, kraehe: null
    });
    feld.el.feldDiv.classList.remove("feld-leer", "feld-ziel");
    setzeVariantenKlasse(feld, variante);
    setzeTipp(feld.el.feldDiv, feldTipp(feld));
    feld.el.nameEl.textContent = pflanze.name;
    feld.el.balkenInnen.style.width = "0%";
    zeigeFeldSprite(feld);

    run.samenGesamt += 1;
    haken("samen", feld);
    if (hatTarot("turm") && run.samenGesamt % aufrunden(KONFIG.turmIntervall / tarotFaktor("turm")) === 0) {
        feld.stufe = 2;
        wachseEineStufe(feld);
        const { x, rect } = feldMitte(feld);
        zeigeSchwebeText(x, rect.top, "🗼 Blitz!", "#7c2fc2", false);
    }
}

function pflanzeAufZufaelligeFelder(anzahl) {
    const freie = mische(run.felder.filter(f => f.leer && !f.reserviert));
    freie.slice(0, anzahl).forEach(pflanzeSamen);
}

// Wachstum: 3 Stufen (Samen, Keimling, Jungpflanze), danach fertig.
// Der Balken laeuft einmal durch alle Stufen, das Sprite wechselt trotzdem bei jeder Stufe.
function wachseEineStufe(feld) {
    if (feld.leer || feld.fertig) return;
    feld.stufe += 1;
    if (feld.stufe >= 3) {
        feld.stufe = 3;
        feld.fertig = true;
        feld.fortschrittMs = 0;
        feld.el.feldDiv.classList.add("feld-fertig");
        feld.el.balkenInnen.style.width = "100%";
        if (feld.ernteKlicksRest > 0) feld.el.nameEl.textContent = "Noch " + feld.ernteKlicksRest + "x";
    }
    zeigeFeldSprite(feld);
}

function setzeWachstumsBalken(feld, stufenMs) {
    const anteil = (feld.stufe + Math.min(1, feld.fortschrittMs / stufenMs)) / 3;
    feld.el.balkenInnen.style.width = anteil * 100 + "%";
}

function aktualisiereWachstum(dtMs) {
    run.felder.forEach(feld => {
        if (feld.leer || feld.fertig || feld.kraehe) return;
        const stufenMs = stufenZeitSek(feld) * 1000;
        feld.fortschrittMs += dtMs;
        while (!feld.fertig && feld.fortschrittMs >= stufenMs) {
            feld.fortschrittMs -= stufenMs;
            wachseEineStufe(feld);
        }
        if (!feld.fertig) setzeWachstumsBalken(feld, stufenMs);
    });
}

// Nachbarn auf derselben Seite des Weges
function nachbarFelder(feld) {
    const pos = FELD_POSITIONEN[feld.index];
    return run.felder.filter(anderes => {
        const p = FELD_POSITIONEN[anderes.index];
        return anderes !== feld && p.links === pos.links &&
            Math.max(Math.abs(p.spalte - pos.spalte), Math.abs(p.zeile - pos.zeile)) === 1;
    });
}

// ---------- ERNTE ----------

function berechneErnte(feld) {
    const variante = feld.variante || {};
    const pflanze = feld.pflanze;
    const beute = [];
    let anzahlGold = variante.goldKugeln || 1;
    let wertAnteil = 1;
    if (pflanze.eigenschaft === "beeren") {
        anzahlGold *= pflanzenBonus(pflanze, "blaubeere") ? 3 : 2;
        wertAnteil = 0.6;
    }
    const knollen = pflanzenBonus(pflanze, "kartoffel") ? 0.2 : 0;
    if (Math.random() < extraKugelChance() + ueberflussChance(pflanze) + knollen) anzahlGold += 1;
    if (Math.random() < 0.03 * level("doppelernte")) anzahlGold *= 2;
    const pracht = prachtChance(pflanze);
    // Riesenmelone (x2) und Riesenkuerbis (x5, eigener Bonus-Stern)
    let riesig = 0;
    if (pflanze.eigenschaft === "riesig" && Math.random() < (pflanzenBonus(pflanze, "melone") ? 0.5 : 0.25)) riesig = 2;
    if (pflanzenBonus(pflanze, "kuerbis") && Math.random() < 0.1) riesig = 5;

    // Goldene Sichel: jede 10. Ernte bringt 10-fach Gold
    run.ernteZaehler += 1;
    const sichel = hatWerkzeug("sichel") && run.ernteZaehler % 10 === 0 ? werkzeugWert("sichel") : 0;
    const mondschein = istNacht() ? 1 + 0.2 * segen("mondschein") : 1;
    const nebel = wetterIst("nebel") ? 1.2 : 1;
    const abend = tagesAnteil() > 2 / 3 ? 1 + 0.15 * level("abendsonne") : 1;
    const morgen = tagesAnteil() < 0.5 ? 1 + 0.2 * segen("morgenstund") : 1;
    const riesenwuchs = Math.random() < 0.1 * segen("riesenwuchs") ? 2 : 1;
    const erntefest = !run.sandbox && run.tag % KONFIG.tageProRechnung === 0 ? 1 + level("erntefest") : 1;
    const vollmond = pflanzenBonus(pflanze, "mondlilie") && istNacht() ? 2 : 1;
    let mindestRaritaet = run.tagesBoni.mindestGruen || wetterIst("regenbogen") || pflanze.eigenschaft === "eis" ||
        pflanzenBonus(pflanze, "erdbeere") ? 1 : 0;
    if (pflanzenBonus(pflanze, "eisblume")) mindestRaritaet = 2;

    for (let i = 0; i < anzahlGold; i++) {
        let raritaetIndex = 0;
        if (variante.jackpot) {
            raritaetIndex = JACKPOT_INDEX;
        } else {
            const wuerfe = (variante.raritaetsWuerfe || 1) + (Math.random() < pracht ? 1 : 0);
            for (let wurf = 0; wurf < wuerfe; wurf++) {
                raritaetIndex = Math.max(raritaetIndex, wuerfleRaritaetIndex());
            }
        }
        raritaetIndex = Math.max(raritaetIndex, mindestRaritaet);

        const multi = raritaetsMulti(raritaetIndex) * goldMulti() * (feld.geduengt ? (level("wurmhumus") > 0 ? 3 : 2) : 1) *
            (feld.bewaessert ? 1 + 0.5 * level("gewaechshaus") : 1) * erntefest * (run.rauschMs > 0 ? 3 : 1) *
            (variante.goldMulti || 1) * (run.goldBuffMs > 0 ? 2 : 1) * mondschein * nebel *
            (riesig || 1) * (sichel || 1) * wertAnteil * abend * vollmond * morgen * riesenwuchs *
            (raritaetIndex === JACKPOT_INDEX ? 1 + werkzeugWert("goldzahn") : 1);
        let wert = aufrunden(verkaufswert(pflanze) * multi);
        if (Math.random() < glueckChance()) wert *= 2;
        beute.push({ wert, raritaetIndex });
    }
    return { beute, riesig, sichel };
}

// Sternensamen-Wert einer Saat (mit Doppel-Chance und Boni, Nachkommastellen zufaellig gerundet)
function wuerfleSternWert(basis) {
    let wert = basis * sternWertMulti();
    if (Math.random() < sternDoppelChance()) wert *= 2;
    const ganz = Math.floor(wert);
    return ganz + (Math.random() < wert - ganz ? 1 : 0);
}

// direkt = true: ohne Saaten sofort gutschreiben (Tarotkarte "Der Tod"), goldFaktor fuer deren Verstaerkung
function ernteFeld(feld, direkt, goldFaktor = 1) {
    const { x, y } = feldMitte(feld);
    const variante = feld.variante;
    const pflanze = feld.pflanze;

    run.statistik.ernten += 1;
    run.gesamt.ernten += 1;
    meta.lebenszeit.ernten += 1;
    const stufeVorher = meisterStufe(pflanze.id);
    meta.kodex.pflanzen[pflanze.id] = (meta.kodex.pflanzen[pflanze.id] || 0) + 1;
    if (meisterStufe(pflanze.id) > stufeVorher) {
        const stufe = meisterStufe(pflanze.id);
        zeigeBanner(pflanze.emoji, pflanze.name + ": Meisterschaft " + stufe + "!",
            "Für immer +" + Math.round(MEISTER_BONUS * 100 * stufe) + "% Wert für " + pflanze.name, "#d49a00", 3500);
        Klang.jackpot();
    }
    if (variante) {
        run.gesamt.spezial += 1;
        meta.lebenszeit.spezial += 1;
        meta.kodex.varianten[variante.id] = (meta.kodex.varianten[variante.id] || 0) + 1;
    }

    const { beute, riesig, sichel } = berechneErnte(feld);
    haken("ernte", feld);
    beute.forEach(teil => {
        if (direkt) gutschreibenGold(aufrunden(teil.wert * goldFaktor), teil.raritaetIndex);
        else spawnLootKugel(x, y, teil.wert, teil.raritaetIndex);
        // Midas' Beruehrung: Jackpots bringen zusaetzlich Sternensamen
        if (teil.raritaetIndex === JACKPOT_INDEX && level("midas") > 0) {
            const sterne = wuerfleSternWert(50);
            if (direkt) gibSternensamen(sterne);
            else spawnLootKugel(x, y, sterne, null, "stern");
        }
    });
    // Ernterausch: jede 30. Ernte eines Tages startet 6 Sekunden dreifaches Gold
    if (level("ernterausch") > 0 && run.phase === "tag" && run.statistik.ernten % 30 === 0) {
        run.rauschMs = 6000;
        if (!direkt) {
            zeigeSchwebeText(x, y - 50, "🔥 Ernterausch!", "#d9531e", true);
            partikel(x, y, ["#ff7a1a", "#ffd93d", "#ffffff"], 20, 100);
        }
    }
    if (!direkt && riesig) zeigeSchwebeText(x, y - 40, riesig === 5 ? "🎃 Riesenkürbis!" : "🍉 Riesenmelone!", "#2e9e2e", true);
    if (!direkt && sichel) zeigeSchwebeText(x, y - 40, "🪓 x" + zahl(Math.round(sichel * 10) / 10) + "!", "#e08a00", true);

    // Jede Ernte laesst Sternensamen fallen (Punkte fuer das Stellarium)
    const sternKugeln = (variante && variante.sterne) || 1;
    for (let i = 0; i < sternKugeln; i++) {
        const extra = werkzeugWert("wuenschelrute") + (i === 0 ? 2 * level("sternenquelle") : 0) + (i === 0 && pflanzenBonus(pflanze, "weizen") ? 10 : 0);
        const basis = KONFIG.sternensamenProErnte * Math.pow(KONFIG.sternensamenPflanzenFaktor, pflanze.index);
        const sterne = wuerfleSternWert(basis + extra);
        if (sterne <= 0) continue;
        if (direkt) gibSternensamen(sterne);
        else spawnLootKugel(x, y, sterne, null, "stern");
    }

    if (!direkt) {
        Klang.ernte(pflanze.index);
        partikel(x, y, ["#6cc24a", "#3f8a32", "#a3dc6f", "#8f6139"], 12, 55);
    }
    // Kaffee gibt nur noch 1 Energie (im spaeten Spiel gab es sonst zu viel Energie)
    const energie = pflanze.eigenschaft === "wachmacher" ? 1 : pflanzenBonus(pflanze, "sonnenblume") ? 2 : 0;
    // Espresso: Gratis-Klicks auf den Samenladen
    if (pflanzenBonus(pflanze, "kaffee") && run.phase === "tag" && !run.samenUnterwegs) {
        run.klickZaehler = Math.min(klicksProSamen() - 1, run.klickZaehler + 5);
        aktualisiereKnopfAnzeige();
    }
    if (energie > 0 && run.phase === "tag" && !run.sandbox) {
        const plus = gibEnergie(energie);
        if (plus > 0 && !direkt) zeigeSchwebeText(x + 20, y - 20, "+" + Math.round(plus) + " ⚡", "#c9a400", false);
    }
    leereFeld(feld);
    if (run.phase === "tag") wendePflanzenBonusAn(pflanze, x, y);
    if (variante && run.phase === "tag") wendeErnteEffekteAn(feld, variante, x, y);
}

// Eigene Boni der Pflanzen (Bonus-Sterne im Stellarium), die nach der Ernte wirken
function wendePflanzenBonusAn(pflanze, x, y) {
    if (hatWerkzeug("honigwabe")) {
        kombo.zaehler += werkzeugWert("honigwabe");
        kombo.letzterKlick = performance.now();
        run.gesamt.maxKombo = Math.max(run.gesamt.maxKombo, kombo.zaehler);
        pruefeKomboStufe();
    }
    if (pflanzenBonus(pflanze, "tomate")) {
        kombo.zaehler += 3;
        kombo.letzterKlick = performance.now();
        run.gesamt.maxKombo = Math.max(run.gesamt.maxKombo, kombo.zaehler);
        pruefeKomboStufe();
    }
    if (pflanzenBonus(pflanze, "mais") && Math.random() < 0.15) {
        pflanzeAufZufaelligeFelder(1);
        zeigeSchwebeText(x, y - 30, "🍿 Popcorn!", "#d49a00", false);
    }
    if (pflanzenBonus(pflanze, "riesenpilz") && Math.random() < 0.2) {
        pflanzeAufZufaelligeFelder(2);
        partikel(x, y, ["#b48cff", "#e0d0ff"], 10, 70);
    }
}

function wendeErnteEffekteAn(feld, variante, x, y) {
    if (variante.energieBonus) {
        const plus = gibEnergie(variante.energieBonus);
        zeigeSchwebeText(x, y - 30, plus > 0 ? "+" + Math.round(plus) + " ⚡" : "⚡ voll", "#e0a800", false);
    }
    if (variante.sporen) {
        pflanzeAufZufaelligeFelder(variante.sporen);
        partikel(x, y, ["#b48cff", "#e0d0ff"], 10, 70);
    }
    if (variante.funken) {
        nachbarFelder(feld).filter(n => !n.leer && !n.fertig).forEach(wachseEineStufe);
        partikel(x, y, ["#ff7a1a", "#ffd93d", "#ff4a1a"], 16, 90);
        zeigeSchwebeText(x, y - 30, "🔥 Funken!", "#d9531e", false);
    }
    if (variante.magnet) {
        run.magnetMs = 1500; // auch die eigenen Saaten werden beim Landen eingesammelt
        lootKugeln.filter(l => l.gelandet).forEach(sammleEin);
    }
    if (variante.kombo) {
        kombo.zaehler += variante.kombo;
        kombo.letzterKlick = performance.now();
        run.gesamt.maxKombo = Math.max(run.gesamt.maxKombo, kombo.zaehler);
        pruefeKomboStufe();
        zeigeSchwebeText(x, y - 30, "🍯 +" + variante.kombo + " Kombo", "#d49a00", false);
    }
}

function gutschreibenGold(wert, raritaetIndex) {
    const s = run.statistik;
    run.gold += wert;
    s.gold += wert;
    run.gesamt.gold += wert;
    meta.lebenszeit.gold += wert;
    if (raritaetIndex === JACKPOT_INDEX) {
        run.gesamt.jackpots += 1;
        meta.lebenszeit.jackpots += 1;
    }
    if (wert > s.hoechsterGewinn) {
        s.hoechsterGewinn = wert;
        s.hoechsterGewinnRaritaet = raritaetIndex;
    }
    run.gesamt.hoechsterGewinn = Math.max(run.gesamt.hoechsterGewinn, wert);
    meta.lebenszeit.hoechsterGewinn = Math.max(meta.lebenszeit.hoechsterGewinn, wert);
}

function gibSternensamen(menge) {
    run.skillpunkte += menge;
    run.gesamt.sternensamen += menge;
    run.statistik.sternensamen += menge;
    meta.lebenszeit.sternensamen += menge;
}

// ---------- SAMENLADEN + KOMBO ----------
// Es wird immer nur EIN Feld gleichzeitig bepflanzt: Alle Wuerfe fliegen zum aktuellen Zielfeld.
// Erst wenn dessen Saat gelandet ist, geht der Fortschritt fuer das naechste Feld weiter.

function waehleZielFeld() {
    if (run.zielFeld) return run.zielFeld;
    const freie = run.felder.filter(f => f.leer && !f.reserviert);
    if (freie.length === 0) return null;

    const feld = zufall(freie);
    feld.reserviert = true;
    feld.el.feldDiv.classList.add("feld-ziel");
    run.zielFeld = feld;
    return feld;
}

let kassenTextZaehler = 0;
let sternTextZaehler = 0;

function klickSamenladen(vonHelfer, klickX, klickY) {
    if (run.phase !== "tag") return;

    // Sind alle Felder belegt, passiert nichts: auch die Kombo laeuft nicht weiter
    const allesBelegt = !run.zielFeld && !run.samenUnterwegs && !run.felder.some(f => f.leer && !f.reserviert);
    if (allesBelegt) return;

    if (!vonHelfer) {
        // Loewe (Kuscheltier): jede neue Kombo startet hoeher
        if (kombo.zaehler === 0 && kuschel("loewe") > 0) kombo.zaehler = 10 * kuschel("loewe");
        kombo.zaehler += 1;
        kombo.letzterKlick = performance.now();
        run.gesamt.maxKombo = Math.max(run.gesamt.maxKombo, kombo.zaehler);
        run.gesamt.klicks += 1;
        meta.lebenszeit.klicks += 1;
        pruefeKomboStufe();
        Klang.klick(kombo.zaehler);
        drueckeKnopf(klickX, klickY);

        // Klingelnde Kasse: Gold pro Klick
        const kasse = klickGold();
        if (kasse > 0) {
            gutschreibenGold(kasse, 0);
            kassenTextZaehler += 1;
            if (kassenTextZaehler % 5 === 0) zeigeSchwebeText(klickX + 30, klickY - 30, "+" + zahl(kasse * 5), "#d49a00", false);
            zaehleHoch(moneyDisplay.querySelector("span"), run.gold);
        }
    }
    if (run.samenUnterwegs) return;

    const zielFeld = waehleZielFeld();
    if (!zielFeld) return;

    // Jeder eigene Klick, der Fortschritt wirft, gibt Sternensamen (Helfer-Klicks nicht)
    if (!vonHelfer) {
        const sterne = sternensamenProKlick();
        gibSternensamen(sterne);
        sternTextZaehler += sterne;
        if (run.gesamt.klicks % 5 === 0) {
            zeigeSchwebeText(klickX - 30, klickY - 30, "+" + zahl(sternTextZaehler) + " ✨", "#4a5fc0", false);
            sternTextZaehler = 0;
        }
        zaehleHoch(skillpointDisplay.querySelector("span"), run.skillpunkte);
    }

    // Sternenhoernchen: auch Eichhoernchen-Klicks bringen Sternensamen (1 fuer je 2 Klicks)
    if (vonHelfer && level("sternhoernchen") > 0) {
        run.hoernchenAkku = (run.hoernchenAkku || 0) + 0.5;
        if (run.hoernchenAkku >= 1) {
            run.hoernchenAkku -= 1;
            gibSternensamen(1);
        }
    }
    run.klickZaehler += vonHelfer ? (level("helferlohn") > 0 ? 2 : 1) : komboMultiplikator();
    const wirdSamen = run.klickZaehler >= klicksProSamen();
    if (wirdSamen) {
        run.klickZaehler = klicksProSamen();
        run.samenUnterwegs = true;
        run.samenSeit = performance.now();
    }
    aktualisiereKnopfAnzeige();

    const knopfRect = plantButton.getBoundingClientRect();
    const { x: zielX, y: zielY } = feldMitte(zielFeld);
    const runId = run.id;

    spawnWurfKugel(knopfRect.left + knopfRect.width / 2, knopfRect.top + knopfRect.height * 0.45, zielX, zielY, wirdSamen, () => {
        // Kein Tag-Vergleich: in der Sandbox kann waehrend des Flugs ein neuer Tag beginnen (sonst hing der Laden fest)
        if (!wirdSamen || run.id !== runId || run.phase !== "tag") return;
        run.samenUnterwegs = false;
        run.zielFeld = null;
        run.klickZaehler = 0;
        zielFeld.reserviert = false;
        zielFeld.el.feldDiv.classList.remove("feld-ziel");
        if (zielFeld.leer) pflanzeSamen(zielFeld);
        Klang.samen();
        partikel(zielX, zielY, ["#8f6139", "#5b3a22", "#c89b6a"], 10, 45);
        if (Math.random() < doppelwurfChance()) wirfZweitenSamen();
        aktualisiereKnopfAnzeige();
    });
}

// Doppelwurf: ein zweiter Samen fliegt vom Samenladen auf ein anderes, noch freies Feld
function wirfZweitenSamen() {
    const frei = run.felder.filter(f => f.leer && !f.reserviert);
    if (frei.length === 0) return;
    const feld = zufall(frei);
    feld.reserviert = true;
    const knopf = plantButton.getBoundingClientRect();
    const { x, y } = feldMitte(feld);
    const runId = run.id;
    spawnWurfKugel(knopf.left + knopf.width / 2, knopf.top + knopf.height * 0.45, x, y, true, () => {
        feld.reserviert = false;
        if (run.id !== runId || run.phase !== "tag") return;
        if (feld.leer) pflanzeSamen(feld);
        zeigeSchwebeText(x, y - 24, "🎯 Doppelwurf!", "#2e9e2e", false);
    });
}

function drueckeKnopf(x, y) {
    plantButton.animate(
        [{ transform: "scale(0.94)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }],
        { duration: 160, easing: "ease-out" }
    );
    plantButtonCounter.animate([{ transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 150 });
    ladenKlick(); // legendaere Gebaeude reagieren auf jeden Klick
    klickRing();
    if (x !== undefined) partikel(x, y, ["#ffe066", "#a3dc6f", "#ffffff"], 4, 35);
}

const KOMBO_FARBEN = ["", "#2e9e2e", "#2e9e2e", "#7c2fc2", "#e08a00", "#d9452c"];

function pruefeKomboStufe() {
    const multi = komboMultiplikator();
    if (multi > kombo.letzteStufe) {
        const rect = plantButton.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        zeigeSchwebeText(x, rect.top - 10, "KOMBO x" + multi + "!", KOMBO_FARBEN[multi] || "#d9452c", true);
        partikel(x, rect.top + rect.height / 2, ["#ffd93d", "#ffffff", "#ff8fb1"], 16 + multi * 4, 110);
        Klang.erfolg();
    }
    kombo.letzteStufe = multi;
}

function aktualisiereKnopfAnzeige() {
    const benoetigt = klicksProSamen();
    const anteil = Math.min(100, (run.klickZaehler / benoetigt) * 100) + "%";
    plantButtonCounter.textContent = Math.min(run.klickZaehler, benoetigt) + " / " + benoetigt;
    plantButtonFortschritt.style.width = anteil;
    plantButtonFortschritt.style.setProperty("--fortschritt", anteil); // legendaere Gebaeude: Balken innerhalb der Mauern
    if (run.zielFeld) run.zielFeld.el.balkenInnen.style.width = anteil;
}

// Sicherheitsnetz: kommt ein fertiger Samen nie an (z.B. Tab im Hintergrund), wird er nach 2 Sekunden direkt gepflanzt
function pruefeHaengendenSamen() {
    if (!run.samenUnterwegs || run.phase !== "tag" || performance.now() - (run.samenSeit || 0) < 2000) return;
    const feld = run.zielFeld;
    run.samenUnterwegs = false;
    run.zielFeld = null;
    run.klickZaehler = 0;
    if (feld) {
        feld.reserviert = false;
        feld.el.feldDiv.classList.remove("feld-ziel");
        if (feld.leer) pflanzeSamen(feld);
    }
    aktualisiereKnopfAnzeige();
}

function aktualisiereMarktstand() {
    pruefeHaengendenSamen();
    let zustand = "offen";
    // Legendaere Gebaeude heissen anders (Startrampe, Manege, Sternwarte)
    let label = gewaehlteKosmetik("samenladen").titel || "Samenladen";
    if (run.phase !== "tag") {
        zustand = "geschlossen";
        label = "Geschlossen";
    } else if (!run.zielFeld && !run.felder.some(f => f.leer && !f.reserviert)) {
        zustand = "blockiert";
        label = "Alles belegt";
    }

    if (plantButton.dataset.zustand !== zustand) {
        plantButton.dataset.zustand = zustand;
        plantButtonLabel.textContent = label;
    }
}

function aktualisiereKombo(jetzt) {
    const fenster = komboFensterMs();
    const rest = fenster - (jetzt - kombo.letzterKlick);
    if (kombo.zaehler > 0 && rest <= 0) {
        const behalten = tw("maessigkeit");
        if (behalten > 0 && kombo.zaehler > 1) {
            kombo.zaehler = Math.floor(kombo.zaehler * behalten);
            kombo.letzterKlick = jetzt;
        } else {
            kombo.zaehler = 0;
        }
        kombo.letzteStufe = komboMultiplikator();
    }

    if (kombo.zaehler < 2 || run.phase !== "tag") {
        komboAnzeige.classList.add("versteckt");
        return;
    }

    const multi = komboMultiplikator();
    komboAnzeige.classList.remove("versteckt");
    komboAnzeige.dataset.stufe = multi;
    komboText.textContent = "Kombo " + kombo.zaehler + "  ·  x" + multi;
    komboFuellung.style.width = Math.max(0, rest / fenster) * 100 + "%";
}

// ---------- HELFER UND TIMER ----------

function aktualisiereHelfer(dtMs) {
    helferAkku += helferKlicksProSek() * dtMs / 1000;
    while (helferAkku >= 1) {
        helferAkku -= 1;
        klickSamenladen(true);
        eichhoernchenKlickt();
    }

    // Igel, Bienen, Saat-Spatz und Erntehase sind echte Figuren (helfer.js): sie arbeiten, wenn sie ankommen
    aktualisiereHelferFiguren(dtMs);

    // Magnetfeld: gelandete Saaten rollen zum Cursor
    const staerke = magnetStaerke();
    if (staerke > 0 && maus.x > -1000) {
        lootKugeln.forEach(loot => {
            if (!loot.gelandet || loot.weg) return;
            const dx = maus.x - loot.x;
            const dy = maus.y - loot.y;
            const d = Math.hypot(dx, dy);
            if (d < 1) return;
            const schritt = Math.min(d, staerke * dtMs / 1000);
            loot.x += (dx / d) * schritt;
            loot.y += (dy / d) * schritt;
            loot.el.style.left = loot.x + "px";
            loot.el.style.top = loot.y + "px";
            if (inSammelReichweite(loot)) sammleEin(loot);
        });
    }

    // Magnet-Hufeisen (Werkzeug): alle 2 Sekunden wird alles eingesammelt
    if (hatWerkzeug("hufeisen")) {
        run.hufeisenMs += dtMs;
        if (run.hufeisenMs >= 2000 / werkzeugWert("hufeisen")) {
            run.hufeisenMs = 0;
            lootKugeln.filter(l => l.gelandet).forEach(sammleEin);
        }
    }
}

function sternschnuppeTempo() {
    return (1 + 0.3 * segen("sternenstaub")) * (hatWerkzeug("fernrohr") ? 2 : 1) * (wetterIst("sternennacht") ? 3 : 1);
}

function neuerSternTimerMs() {
    const min = KONFIG.sternschnuppeMinSek;
    const sek = min + Math.random() * (KONFIG.sternschnuppeMaxSek - min);
    return (sek * 1000) / sternschnuppeTempo();
}

function neuerGluehTimerMs() {
    const min = KONFIG.gluehwuermchenMinSek;
    const sek = min + Math.random() * (KONFIG.gluehwuermchenMaxSek - min);
    return (sek * 1000) / ((1 + segen("nachteule") + 0.25 * level("gluehglas")) * (1 + werkzeugWert("laterne")));
}

function aktualisiereTimer(dtMs) {
    run.goldBuffMs = Math.max(0, run.goldBuffMs - dtMs);
    run.magnetMs = Math.max(0, run.magnetMs - dtMs);
    run.rauschMs = Math.max(0, (run.rauschMs || 0) - dtMs);
    if (run.sandbox) altereKugeln(dtMs);

    run.sternTimerMs -= dtMs;
    if (run.sternTimerMs <= 0 && !bossIst("dunkel")) {
        run.sternTimerMs = neuerSternTimerMs();
        spawnSternschnuppe();
    }

    // Am Abend kommen Gluehwuermchen (in der Sandbox geben sie nur Sternensamen)
    if (!bossIst("dunkel") && tagesAnteil() >= KONFIG.gluehwuermchenAbTageszeit) {
        run.gluehTimerMs -= dtMs;
        if (run.gluehTimerMs <= 0) {
            run.gluehTimerMs = neuerGluehTimerMs();
            spawnGluehwuermchen();
        }
    }

    if (run.sandbox) pruefeMeilensteine();
    const buffs = [];
    if (run.goldBuffMs > 0) buffs.push("🌠 x2 Gold " + Math.ceil(run.goldBuffMs / 1000) + "s");
    if (run.rauschMs > 0) buffs.push("🔥 x3 Gold " + Math.ceil(run.rauschMs / 1000) + "s");
    buffAnzeige.classList.toggle("versteckt", buffs.length === 0);
    if (buffs.length > 0) buffAnzeige.textContent = buffs.join("  ");
    haken("tagTick", dtMs);
}

// ---------- EFFEKTE: PARTIKEL, WACKELN, SCHWEBETEXTE ----------

function partikel(x, y, farben, anzahl, staerke) {
    if (x === undefined) return;
    for (let i = 0; i < anzahl; i++) {
        const el = document.createElement("div");
        el.classList.add("partikel");
        const groesse = 3 + Math.floor(Math.random() * 4);
        el.style.width = groesse + "px";
        el.style.height = groesse + "px";
        el.style.left = x + "px";
        el.style.top = y + "px";
        el.style.backgroundColor = zufall(farben);
        fxLayer.appendChild(el);

        const winkel = Math.random() * Math.PI * 2;
        const weite = staerke * (0.4 + Math.random() * 0.6);
        const dx = Math.cos(winkel) * weite;
        const dy = Math.sin(winkel) * weite - staerke * 0.3;
        el.animate(
            [{ transform: "translate(0, 0)", opacity: 1 }, { transform: `translate(${dx}px, ${dy + staerke * 0.5}px)`, opacity: 0 }],
            { duration: 450 + Math.random() * 300, easing: "cubic-bezier(.2,.7,.4,1)" }
        ).onfinish = () => el.remove();
    }
}

function wackleBildschirm(staerke) {
    if (!wackelnErlaubt()) return;
    const schritte = [];
    for (let i = 0; i < 6; i++) {
        schritte.push({ transform: `translate(${(Math.random() - 0.5) * staerke}px, ${(Math.random() - 0.5) * staerke}px)` });
    }
    schritte.push({ transform: "translate(0, 0)" });
    fieldGrid.animate(schritte, { duration: 350 });
}

function zeigeSchwebeText(x, y, text, farbe, gross) {
    const el = document.createElement("div");
    el.classList.add("schwebe-text");
    if (gross) el.classList.add("schwebe-gross");
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.color = farbe;
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function zeigeToast(text) {
    const el = document.createElement("div");
    el.classList.add("toast");
    el.textContent = text;
    toastBox.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// ---------- KUGELN: WURF ----------

function spawnWurfKugel(startX, startY, zielX, zielY, istSamen, onAnkunft) {
    const kugel = document.createElement("div");
    kugel.classList.add("wurf-kugel");
    if (istSamen) kugel.classList.add("wurf-samen");
    // Der Samenladen-Skin bestimmt den Look der Saaten (z.B. kleine Raketen beim Feuerwerksladen)
    const laden = gewaehlteKosmetik("samenladen");
    if (laden.wurf) kugel.classList.add(laden.wurf);
    if (laden.wurf === "wurf-bunt") kugel.style.backgroundColor = zufall(laden.funken);
    let spurZaehler = 0;
    fxLayer.appendChild(kugel);

    const dauerMs = istSamen ? 450 : 350;
    const bogen = istSamen ? 80 : 30;
    const startZeit = performance.now();

    function animiere(jetzt) {
        const t = Math.min(1, (jetzt - startZeit) / dauerMs);
        kugel.style.left = startX + (zielX - startX) * t + "px";
        kugel.style.top = startY + (zielY - startY) * t - Math.sin(t * Math.PI) * bogen + "px";
        // Raketen und Sterne zeigen in Flugrichtung
        if (laden.drehen) {
            const vx = zielX - startX;
            const vy = zielY - startY - Math.cos(t * Math.PI) * Math.PI * bogen;
            kugel.style.transform = "rotate(" + (Math.atan2(vy, vx) + Math.PI / 2) + "rad)";
        }
        if (laden.spur && ++spurZaehler % 3 === 0) {
            partikel(parseFloat(kugel.style.left), parseFloat(kugel.style.top), laden.spur, 1, 8);
        }

        if (t < 1) {
            requestAnimationFrame(animiere);
        } else {
            kugel.remove();
            if (laden.ankunft) wurfAnkunft(zielX, zielY, laden, istSamen);
            onAnkunft();
        }
    }
    animiere(startZeit);
}

// ---------- KUGELN: LOOT (Gold-Muenzen und Sternensamen) ----------
// typ "gold" (mit Raritaet) oder "stern" (Sternensamen fuer das Stellarium)
// extra: { streicheln: true } = Muenze vom Haustier, { anzeige: "<3" } = eigener Text beim Einsammeln

function spawnLootKugel(startX, startY, wert, raritaetIndex, typ = "gold", extra = {}) {
    const el = document.createElement("img");
    el.classList.add("loot-kugel");
    if (typ === "stern") {
        el.classList.add("loot-stern");
        setzeSpriteBild(el, "sternensamen", 3);
    } else {
        el.classList.add("raritaet-" + raritaetIndex);
        if (raritaetIndex === JACKPOT_INDEX) el.classList.add("loot-jackpot");
        setzeSpriteBild(el, muenzeSprite(raritaetIndex), raritaetIndex === JACKPOT_INDEX ? 4 : 3);
    }
    el.alt = "";
    el.draggable = false;
    fxLayer.appendChild(el);

    const loot = { el, typ, wert, raritaetIndex, x: startX, y: startY, gelandet: false, weg: false, ...extra };
    lootKugeln.push(loot);
    if (typ === "gold" && raritaetIndex === JACKPOT_INDEX && !extra.anzeige) haustierFreutSich();

    const winkel = Math.random() * Math.PI * 2;
    const abstand = 45 + Math.random() * 40;
    const obergrenze = topBar.getBoundingClientRect().bottom + 20;
    const landeX = klemme(startX + Math.cos(winkel) * abstand, 20, window.innerWidth - 20);
    const landeY = klemme(startY + Math.sin(winkel) * abstand, obergrenze, window.innerHeight - 20);

    const dauerMs = 500 + Math.random() * 400;
    const sprungHoehe = 60 + Math.random() * 30;
    const startZeit = performance.now();

    function animiere(jetzt) {
        if (loot.weg) return;
        const t = Math.min(1, (jetzt - startZeit) / dauerMs);
        loot.x = startX + (landeX - startX) * t;
        loot.y = startY + (landeY - startY) * t - Math.sin(t * Math.PI) * sprungHoehe;
        el.style.left = loot.x + "px";
        el.style.top = loot.y + "px";

        if (t < 1) {
            requestAnimationFrame(animiere);
        } else {
            loot.gelandet = true;
            el.classList.add("loot-gelandet");
            if (typ === "gold" && raritaetIndex >= 2) partikel(loot.x, loot.y, [RARITAETEN[raritaetIndex].farbe, "#ffffff"], 6, 30);
            if (typ === "gold" && raritaetIndex >= 3) lichtsaeule(loot.x, loot.y, RARITAETEN[raritaetIndex].farbe);
            // Legendaere Muenz-Looks spruehen beim Landen Funken
            const muenzLook = gewaehlteKosmetik("kugeln");
            if (typ === "gold" && muenzLook.funken) partikel(loot.x, loot.y, muenzLook.funken, 5, 28);
            if (run.magnetMs > 0 || inSammelReichweite(loot)) sammleEin(loot);
        }
    }
    animiere(startZeit);
    return loot;
}

// Eingesammelt wird, sobald sich der Cursor-Kreis und die Saat beruehren
function inSammelReichweite(loot) {
    return Math.hypot(loot.x - maus.x, loot.y - maus.y) <= sammelRadius() + KONFIG.kugelRadius;
}

function entferneLoot(loot) {
    loot.weg = true;
    const index = lootKugeln.indexOf(loot);
    if (index >= 0) lootKugeln.splice(index, 1);
}

function sammleEin(loot) {
    if (loot.weg) return;
    entferneLoot(loot);
    haken("eingesammelt", loot);

    if (loot.typ === "stern") {
        gibSternensamen(loot.wert);
        aktualisiereTopBar();
        zeigeSchwebeText(loot.x, loot.y, "+" + zahl(loot.wert), "#4a5fc0", false);
        Klang.xp();
        partikel(loot.x, loot.y, ["#8fa2f0", "#fff6d8"], 5, 30);
        fliegeZuAnzeige(loot, skillpointDisplay);
        return;
    }

    gutschreibenGold(loot.wert, loot.raritaetIndex);
    aktualisiereTopBar();
    aktualisiereKaufKachel();
    goldTicker(loot.wert);
    sammelKette(loot.x, loot.y);

    const istJackpot = loot.raritaetIndex === JACKPOT_INDEX;
    const raritaet = RARITAETEN[loot.raritaetIndex];
    if (loot.streicheln) {
        run.gesamt.streichelGold += loot.wert;
        meta.lebenszeit.streichelGold += loot.wert;
    }
    const symbol = einstellungen.farbenblind && loot.raritaetIndex > 0 ? raritaet.symbol + " " : "";
    const text = loot.anzeige || symbol + (istJackpot ? "JACKPOT! " : "") + "+" + zahl(loot.wert);
    zeigeSchwebeText(loot.x, loot.y, text, loot.anzeige ? "#e0507a" : raritaet.rand, loot.raritaetIndex >= 3);

    Klang.muenze(loot.raritaetIndex);
    partikel(loot.x, loot.y, [raritaet.farbe, "#fff6c2"], istJackpot ? 24 : 5, istJackpot ? 120 : 30);
    if (istJackpot) {
        jackpotFeier(loot.x, loot.y);
        Klang.jackpot();
        wackleBildschirm(12);
        bildschirmBlitz("#fff3b0", 0.35, 300);
    }

    fliegeZuAnzeige(loot, moneyDisplay);
}

// Die Saat fliegt zur passenden Anzeige oben
function fliegeZuAnzeige(loot, anzeige) {
    const ziel = anzeige.getBoundingClientRect();
    loot.el.classList.add("loot-fliegt");
    loot.el.style.left = ziel.left + 16 + "px";
    loot.el.style.top = ziel.top + ziel.height / 2 + "px";
    setTimeout(() => loot.el.remove(), 450);
    anzeige.animate([{ transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: 200, delay: 350 });
}

// Sandbox (kein Feierabend): liegende Saaten werden in 60 Sekunden langsam grau und verschwinden dann
const KUGEL_LEBENSDAUER_MS = 60000;

function altereKugeln(dtMs) {
    [...lootKugeln].forEach(loot => {
        if (!loot.gelandet || loot.weg) return;
        loot.alterMs = (loot.alterMs || 0) + dtMs;
        const t = loot.alterMs / KUGEL_LEBENSDAUER_MS;
        if (t >= 1) {
            lassVerfallen(loot);
            return;
        }
        if (t > 0.1) {
            const grau = (t - 0.1) / 0.9;
            loot.el.style.filter = "grayscale(" + grau.toFixed(2) + ") brightness(" + (1 - 0.35 * grau).toFixed(2) + ")";
            loot.el.style.opacity = (1 - 0.45 * grau).toFixed(2);
        }
    });
}

function lassVerfallen(loot) {
    entferneLoot(loot);
    run.statistik.verfallen += 1;
    loot.el.classList.add("loot-verfallen");
    setTimeout(() => loot.el.remove(), 600);
}

// ---------- STERNSCHNUPPE (Mini-Event waehrend des Tages) ----------
// Leuchtender Kopf mit Schweif, der in Flugrichtung zeigt und Funken hinter sich laesst.

function sternschnuppeSek() {
    return KONFIG.sternschnuppeBuffSek + 3 * segen("sternenstaub") + kuschel("schaf") + werkzeugWert("fernrohr");
}

function spawnSternschnuppe() {
    const el = document.createElement("div");
    el.classList.add("sternschnuppe");
    el.innerHTML = '<div class="schweif"></div><div class="kopf"></div>';
    fxLayer.appendChild(el);

    const vonLinks = Math.random() < 0.5;
    const obergrenze = topBar.getBoundingClientRect().bottom;
    const startX = vonLinks ? -60 : window.innerWidth + 60;
    const zielX = vonLinks ? window.innerWidth + 200 : -200;
    const startY = obergrenze + 20 + Math.random() * window.innerHeight * 0.25;
    const zielY = startY + 160 + Math.random() * 180;
    el.style.setProperty("--winkel", Math.atan2(zielY - startY, zielX - startX) + "rad");

    const dauerMs = 5000;
    const startZeit = performance.now();
    let x = startX;
    let y = startY;
    let naechsterFunke = 0;

    el.addEventListener("pointerdown", () => {
        if (!el.isConnected || run.phase !== "tag") return;
        el.remove();
        const sek = sternschnuppeSek();
        run.goldBuffMs += sek * 1000;
        run.gesamt.sterne += 1;
        meta.lebenszeit.sterne += 1;
        // Auch alle Muenzen, die schon auf dem Acker liegen, sind jetzt doppelt so viel wert
        const liegend = lootKugeln.filter(loot => loot.typ === "gold" && !loot.weg && !loot.streicheln);
        liegend.forEach(loot => {
            loot.wert *= 2;
            loot.el.classList.remove("loot-verdoppelt");
            void loot.el.offsetWidth;
            loot.el.classList.add("loot-verdoppelt");
            if (loot.gelandet) partikel(loot.x, loot.y, ["#ffe89a", "#ffffff"], 4, 25);
        });
        zeigeSchwebeText(x, y, "x2 Gold!", "#e0a800", true);
        partikel(x, y, ["#ffe89a", "#ffffff", "#ffd93d"], 24, 110);
        zeigeBanner("🌠", "Sternschnuppe gefangen!", sek + " Sekunden doppeltes Gold" +
            (liegend.length > 0 ? ", dazu " + liegend.length + (liegend.length === 1 ? " liegende Saat" : " liegende Saaten") + " x2" : ""),
            "#e0a800", 2600);
        Klang.stern();
    });

    function animiere(jetzt) {
        if (!el.isConnected) return;
        const t = Math.min(1, (jetzt - startZeit) / dauerMs);
        x = startX + (zielX - startX) * t;
        y = startY + (zielY - startY) * t;
        el.style.left = x + "px";
        el.style.top = y + "px";
        if (jetzt > naechsterFunke) {
            naechsterFunke = jetzt + 70;
            partikel(x, y, ["#fff6c2", "#ffe89a", "#ffffff"], 1, 14);
        }
        if (t < 1) requestAnimationFrame(animiere);
        else el.remove();
    }
    animiere(startZeit);
}

// ---------- GLUEHWUERMCHEN (am Abend, anklicken = der Abend wird etwas laenger) ----------

function spawnGluehwuermchen() {
    const el = document.createElement("div");
    el.classList.add("gluehwuermchen");
    el.innerHTML = '<div class="licht"></div>';
    fxLayer.appendChild(el);

    const kopf = topBar.getBoundingClientRect();
    const startX = window.innerWidth * (0.08 + Math.random() * 0.84);
    const startY = kopf.bottom * 0.55 + Math.random() * (window.innerHeight - kopf.bottom * 0.55) * 0.6;
    const phaseX = Math.random() * 6;
    const phaseY = Math.random() * 6;
    const drift = (Math.random() - 0.5) * 30;
    const dauerMs = 7000;
    const startZeit = performance.now();
    let x = startX;
    let y = startY;

    el.addEventListener("pointerdown", () => {
        if (!el.isConnected || run.phase !== "tag") return;
        el.remove();
        // Energie (ausser in der Sandbox) und immer auch Sternensamen, damit sie bei voller Energie nicht nutzlos sind
        const plus = run.sandbox ? 0 : gibEnergie(gluehwuermchenEnergie());
        const sterne = wuerfleSternWert(KONFIG.gluehwuermchenSterne);
        gibSternensamen(sterne);
        aktualisiereTopBar();
        run.statistik.gluehwuermchen += 1;
        run.gesamt.gluehwuermchen += 1;
        meta.lebenszeit.gluehwuermchen += 1;
        zeigeSchwebeText(x, y - 16, (plus > 0 ? "+" + Math.round(plus) + " ⚡  " : "") + "+" + zahl(sterne) + " ✨", "#c9a400", false);
        partikel(x, y, ["#fff6a0", "#d8ff7a", "#ffffff"], 14, 60);
        Klang.gluehwuermchen();
        aktualisiereEnergieAnzeige();
    });

    function animiere(jetzt) {
        if (!el.isConnected) return;
        if (spielPausiert()) {
            requestAnimationFrame(animiere);
            return;
        }
        const t = (jetzt - startZeit) / 1000;
        x = startX + Math.sin(t * 1.1 + phaseX) * 60 + drift * t;
        y = startY + Math.cos(t * 1.6 + phaseY) * 28 - t * 6;
        el.style.left = x + "px";
        el.style.top = y + "px";
        if (jetzt - startZeit < dauerMs) requestAnimationFrame(animiere);
        else el.remove();
    }
    animiere(startZeit);
}

// ---------- MAUS: SAMMELRADIUS ----------

document.addEventListener("mousemove", event => {
    maus.x = event.clientX;
    maus.y = event.clientY;
    sammelRing.style.left = maus.x + "px";
    sammelRing.style.top = maus.y + "px";

    // auch zwischen den Tagen, damit man Muenzen einsammeln kann
    if (run.phase === "runEnde") return;
    lootKugeln
        .filter(loot => loot.gelandet && inSammelReichweite(loot))
        .forEach(sammleEin);
});

// Der Cursor-Kreis faengt auch Sternschnuppen, Gluehwuermchen und Kraehen (groesserer Cursor = leichter zu treffen)
document.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !run || run.phase !== "tag" || spielPausiert()) return;
    const radius = sammelRadius();
    fxLayer.querySelectorAll(".sternschnuppe, .gluehwuermchen, .kraehe.gelandet").forEach(ziel => {
        if (ziel.contains(event.target)) return; // ein direkter Treffer laeuft ueber den eigenen Klick
        if (abstandZuRechteck(event.clientX, event.clientY, ziel.getBoundingClientRect()) <= radius) {
            ziel.dispatchEvent(new PointerEvent("pointerdown", { button: 0 }));
        }
    });
});

document.documentElement.addEventListener("mouseleave", () => {
    maus.x = -9999;
    maus.y = -9999;
});

function aktualisiereSammelRing() {
    sammelRing.classList.toggle("versteckt", run.phase !== "tag");
    const durchmesser = sammelRadius() * 2;
    sammelRing.style.width = durchmesser + "px";
    sammelRing.style.height = durchmesser + "px";
}

// ---------- ERFOLGE (dauerhaft, jede Stufe gibt 1 Kuschel-Gutschein) ----------

function erfolgStufeId(kette, index) {
    return kette.id + "_" + index;
}

// Name fuer Steam (spaeter): z.B. "GOLD_1", "RECHNUNG_3"
function steamErfolgId(kette, index) {
    return (kette.id + "_" + (index + 1)).toUpperCase();
}

function meldeAnDesktop(art, wert) {
    const desktop = window.sproutvaleDesktop;
    if (!desktop || !desktop.steam) return;
    if (art === "erfolg") desktop.steam.erfolg(wert);
    else desktop.steam.status(wert);
}

function pruefeErfolge() {
    if (run.sandbox) return; // in der Sandbox gibt es keine Erfolge
    let neu = false;
    ERFOLG_KETTEN.forEach(kette => {
        const wert = Number(kette.wert()) || 0; // fehlende Werte aus alten Spielstaenden zaehlen als 0
        kette.ziele.forEach((ziel, index) => {
            const id = erfolgStufeId(kette, index);
            if (meta.erfolge[id] || wert < ziel) return;
            meta.erfolge[id] = true;
            neu = true;
            meta.gutscheine += ERFOLG_BELOHNUNG_GUTSCHEINE;
            zeigeBanner(kette.icon, "Erfolg: " + kette.text(ziel), "+1 Kuschel-Gutschein 🎟️", "#7c4fb3", 3600);
            meldeAnDesktop("erfolg", steamErfolgId(kette, index));
            Klang.erfolg();
        });
    });
    if (neu) {
        speichereMeta();
        aktualisiereAlles();
        if (!prestigeShop.classList.contains("versteckt")) renderPrestigeShop();
    }
}

function anzahlErfolge() {
    const gesamt = ERFOLG_KETTEN.reduce((summe, k) => summe + k.ziele.length, 0);
    const geschafft = ERFOLG_KETTEN.reduce((summe, k) => summe + k.ziele.filter((_, i) => meta.erfolge[erfolgStufeId(k, i)]).length, 0);
    return { geschafft, gesamt };
}

function renderErfolge() {
    // Die Erfolge stehen in den Einstellungen (Reiter "Erfolge")
    if (einstellungenFenster.classList.contains("versteckt") || aktiverEinstellungsReiter !== "erfolge") return;
    const { geschafft, gesamt } = anzahlErfolge();

    erfolgeContent.innerHTML = "";
    erfolgeContent.appendChild(erstelleHinweis(
        "🏆 " + geschafft + " von " + gesamt + " Stufen geschafft. Erfolge gelten für immer. Jede geschaffte Stufe gibt dir 1 Kuschel-Gutschein für den Kuschel-Automaten im Mondteich." +
        (run && run.sandbox ? " In der Sandbox gibt es keine Erfolge." : "")));

    ERFOLG_KETTEN.forEach(kette => {
        const offenIndex = kette.ziele.findIndex((_, i) => !meta.erfolge[erfolgStufeId(kette, i)]);
        const item = el("div", "erfolg");
        const text = el("span", "erfolg-text");
        const stufeText = el("span", "erfolg-stufe");
        item.appendChild(el("div", "erfolg-kopf", null, [pixelIcon(kette.icon, 32), text, stufeText]));

        if (offenIndex === -1) {
            item.classList.add("geschafft");
            text.textContent = kette.text(kette.ziele[kette.ziele.length - 1]);
            stufeText.textContent = "✅ Alle " + kette.ziele.length + " Stufen";
        } else {
            const ziel = kette.ziele[offenIndex];
            const wert = Math.min(Number(kette.wert()) || 0, ziel);
            text.textContent = kette.text(ziel);
            stufeText.textContent = "Stufe " + (offenIndex + 1) + "/" + kette.ziele.length;

            const balken = el("div", "erfolg-balken");
            const fuellung = el("div");
            fuellung.style.width = (wert / ziel) * 100 + "%";
            balken.appendChild(fuellung);
            const fuss = el("div", "erfolg-fuss", null, [
                el("span", null, zahl(wert) + " / " + zahl(ziel)),
                el("span", null, "+1 🎟️")
            ]);
            item.append(balken, fuss);
        }
        erfolgeContent.appendChild(item);
    });
}

// ---------- STATISTIK ----------
// [Schluessel, Name, Name im Reiter "Gesamt" (falls anders)]

const STATISTIK_ZEILEN = [
    ["tage", "📅 Tage", "📅 Gespielte Tage"],
    ["runs", null, "🔁 Beendete Runs"],
    ["rechnungen", "🧾 Bezahlte Rechnungen"],
    ["bossRechnungen", null, "🏦 Kredite abbezahlt"],
    ["gold", "💰 Gold verdient"],
    ["sternensamen", "✨ Sternensamen erhalten"],
    ["ernten", "🌾 Ernten"],
    ["spezial", "✨ Spezialpflanzen geerntet"],
    ["jackpots", "🌟 Legendäre Jackpots eingesammelt"],
    ["hoechsterGewinn", "💎 Höchster Einzelgewinn"],
    ["maxKombo", "🥁 Höchste Kombo"],
    ["klicks", "👆 Klicks auf den Samenladen"],
    ["sterne", "🌠 Sternschnuppen gefangen"],
    ["gluehwuermchen", "🪲 Glühwürmchen gefangen"],
    ["kraehen", "🐦 Krähen verscheucht"],
    ["goldregen", "🌧️ Goldregen erlebt"],
    ["gluecksspielSiege", "🎲 Glücksspiel-Gewinne"],
    ["streicheln", "🐾 Streicheleinheiten"],
    ["streichelGold", "💰 Gold vom Streicheln"]
];

function runSchnappschuss() {
    return {
        tage: run.tag,
        rechnungen: run.sandbox ? run.meilensteine : run.bezahlteRechnungen,
        gold: run.gesamt.gold,
        sternensamen: run.gesamt.sternensamen,
        ernten: run.gesamt.ernten,
        spezial: run.gesamt.spezial,
        jackpots: run.gesamt.jackpots,
        hoechsterGewinn: run.gesamt.hoechsterGewinn,
        maxKombo: run.gesamt.maxKombo,
        felder: run.felder.length,
        klicks: run.gesamt.klicks,
        sterne: run.gesamt.sterne,
        gluehwuermchen: run.gesamt.gluehwuermchen,
        kraehen: run.gesamt.kraehen,
        goldregen: run.gesamt.goldregen,
        gluecksspielSiege: run.gesamt.gluecksspielSiege,
        streicheln: run.gesamt.streicheln,
        streichelGold: run.gesamt.streichelGold,
        segen: { ...run.segen }
    };
}

function gesamtSchnappschuss() {
    const l = meta.lebenszeit;
    return {
        ...l,
        maxKombo: Math.max(l.maxKombo, run.gesamt.maxKombo),
        felder: Math.max(l.maxFelder, run.felder.length)
    };
}

function istBessererRun(neu, alt) {
    if (!alt) return true;
    return neu.rechnungen > alt.rechnungen || (neu.rechnungen === alt.rechnungen && neu.gold > alt.gold);
}

function renderStatistik() {
    // Die Statistik steht in den Einstellungen (Reiter "Statistik")
    if (einstellungenFenster.classList.contains("versteckt") || aktiverEinstellungsReiter !== "statistik") return;
    // Die Sandbox hat eigene Zahlen (getrennt vom Standard-Modus) und keinen "besten Run"
    const reiter = run.sandbox
        ? [{ id: "aktuell", text: "Diese Sandbox" }, { id: "gesamt", text: "Sandbox gesamt" }]
        : [{ id: "aktuell", text: "Aktueller Run" }, { id: "bester", text: "Bester Run" }, { id: "gesamt", text: "Gesamt" }];
    if (!reiter.some(r => r.id === aktiverStatistikReiter)) aktiverStatistikReiter = "aktuell";
    renderReiter(statistikReiter, reiter, aktiverStatistikReiter, id => {
        aktiverStatistikReiter = id;
        renderStatistik();
    });

    statistikContent.innerHTML = "";
    const istGesamt = aktiverStatistikReiter === "gesamt";
    const daten = istGesamt ? gesamtSchnappschuss()
        : aktiverStatistikReiter === "aktuell" ? runSchnappschuss() : meta.besterRun;
    if (!daten) {
        statistikContent.appendChild(erstelleHinweis("Noch kein Run abgeschlossen."));
        return;
    }

    const tabelle = el("div", "statistik-tabelle");
    if (run.sandbox) statistikContent.appendChild(erstelleHinweis("🏖️ Nur Zahlen aus der Sandbox. Erfolge gibt es hier keine."));
    STATISTIK_ZEILEN.forEach(([schluessel, name, nameGesamt]) => {
        let titel = istGesamt ? nameGesamt || name : name;
        if (run.sandbox && schluessel === "rechnungen") titel = istGesamt ? null : "🏁 Meilensteine";
        if (run.sandbox && schluessel === "runs") titel = "🌙 Neuanfänge";
        if (run.sandbox && schluessel === "bossRechnungen") titel = null;
        if (!titel) return;
        tabelle.appendChild(el("div", "statistik-zeile", null, [el("span", null, titel), el("b", null, zahl(daten[schluessel] || 0))]));
    });
    statistikContent.appendChild(tabelle);

}

// ---------- SEGEN-KNOPF in der Kopfleiste: alle Segen dieses Runs ----------

const segenKnopf = $("segen-button");
segenKnopf.prepend(pixelIcon("🙏", 28, "icon"));

function segenText() {
    const liste = Object.entries(run.segen).filter(([, stufe]) => stufe > 0);
    if (liste.length === 0) return "## 🙏 Deine Segen\nNoch keine. Segen bekommst du nach jeder bezahlten Rechnung" +
        (run.sandbox ? " (Sandbox: für jeden Meilenstein)." : ".");
    return "## 🙏 Deine Segen\n" + liste.map(([id, stufe]) => {
        const s = SEGEN_NACH_ID[id];
        return s ? s.badge + " " + s.name + (stufe > 1 ? " x" + stufe : "") + ": " + s.text : "";
    }).join("\n");
}

registriereHaken("anzeige", () => {
    const anzahl = Object.values(run.segen).reduce((summe, stufe) => summe + stufe, 0);
    segenKnopf.querySelector("span").textContent = anzahl;
    setzeTipp(segenKnopf, segenText());
});

segenKnopf.addEventListener("click", () => {
    const liste = Object.entries(run.segen).filter(([, stufe]) => stufe > 0);
    const inhalt = el("div", "segen-liste");
    if (liste.length === 0) inhalt.appendChild(el("p", null, "Noch keine Segen in diesem Run. Du bekommst einen nach jeder bezahlten Rechnung."));
    liste.forEach(([id, stufe]) => {
        const s = SEGEN_NACH_ID[id];
        if (!s) return;
        inhalt.appendChild(el("div", "segen-listen-eintrag", null, [
            pixelIcon(s.badge, 48),
            el("div", null, null, [el("b", null, s.name + (stufe > 1 ? " x" + stufe : "")), el("div", null, s.text)])
        ]));
    });
    zeigePopup({ titel: "🙏 Deine Segen in diesem Run", inhalt, breite: 620 });
});

// ---------- SEGEN (nach jeder bezahlten Rechnung, Pflicht-Auswahl) ----------

function segenAuswahlAnzahl() {
    if (run.mondphase >= 4 && !run.segenBoss) return 3;
    return (metaLevel("segensreich") > 0 || kuschel("phoenix") > 0 || run.segenBoss) ? 4 : 3;
}

// Kurze Sperre nach dem Oeffnen: Wer gerade noch schnell auf den Samenladen klickt, waehlt sonst aus Versehen einen Segen
const SEGEN_SPERRE_MS = 1100;
let segenSperreBis = 0;

// auswahl: gespeicherte Auswahl (nach dem Laden eines Spielstands), sonst wird neu gewuerfelt
function zeigeSegenAuswahl(auswahl) {
    const moeglich = SEGEN.filter(s => !run.sandbox || !SANDBOX_AUS_SEGEN.includes(s.id));
    run.segenAuswahl = auswahl || mische(moeglich).slice(0, segenAuswahlAnzahl()).map(s => s.id);
    segenFenster.classList.remove("versteckt");
    segenSperreBis = performance.now() + SEGEN_SPERRE_MS;
    segenKarten.classList.add("gesperrt");
    setTimeout(() => segenKarten.classList.remove("gesperrt"), SEGEN_SPERRE_MS);
    segenFenster.querySelector("h2").textContent = run.segenBoss ? "🏦 Kredit abbezahlt!"
        : run.sandbox ? "🏁 Meilenstein erreicht!" : "🧾 Rechnung bezahlt!";
    segenKarten.innerHTML = "";

    run.segenAuswahl.forEach((id, i) => {
        const s = SEGEN_NACH_ID[id];
        const karte = document.createElement("button");
        karte.classList.add("segen-karte");
        karte.style.animationDelay = i * 0.08 + "s";
        const stufe = segen(id);
        karte.append(
            pixelIcon(s.badge, 64, "segen-bild"),
            el("div", "segen-name", s.name),
            el("div", "segen-text", s.text),
            el("div", "segen-stufe", stufe > 0 ? "Du hast ihn schon " + stufe + "x, stapelt sich" : "Neu")
        );
        karte.addEventListener("click", () => waehleSegen(id, karte));
        segenKarten.appendChild(karte);
    });
    Klang.segen();
}

function waehleSegen(id, karte) {
    if (!run.segenAuswahl || performance.now() < segenSperreBis) return;
    run.segen[id] = segen(id) + 1;
    run.segenAuswahl = null;
    run.segenAusstehend = false;
    run.segenBoss = false;
    const rect = karte.getBoundingClientRect();
    partikel(rect.left + rect.width / 2, rect.top + rect.height / 2, ["#ffe89a", "#ffffff", "#a3dc6f"], 24, 120);
    Klang.kaufen();
    segenFenster.classList.add("versteckt");
    if (run.segenWarteschlange > 0) {
        run.segenWarteschlange -= 1;
        run.segenAusstehend = true;
        zeigeSegenAuswahl();
    }
    aktualisiereAlles();
}

// ---------- TAGE, ENERGIE, RECHNUNGEN ----------

// Extra-Energie waehrend des Tages, mit Deckel (sonst koennte ein Tag nie enden). Gibt die wirklich erhaltene Menge zurueck.
function gibEnergie(menge) {
    const deckel = run.tagesMaxEnergie * KONFIG.bonusEnergieDeckel;
    const plus = Math.max(0, Math.min(menge, deckel - run.bonusEnergie));
    run.bonusEnergie += plus;
    run.energie = Math.min(run.tagesMaxEnergie, run.energie + plus);
    return plus;
}

function aktualisiereEnergie(dtMs) {
    run.tagMs = (run.tagMs || 0) + dtMs;
    if (run.sandbox) {
        run.energie = run.tagesMaxEnergie; // Sandbox: keine Energie, der Tag geht einfach weiter
        if (run.tagMs >= SANDBOX_TAG_MS) naechsterSandboxTag();
        return;
    }
    run.energie = Math.max(0, run.energie - KONFIG.energieProSek * dtMs / 1000);
    aktualisiereEnergieAnzeige();
    if (run.energie <= 0) beendeTag();
}

function verteileFeldEffekte() {
    const duerre = bossIst("duerre");
    run.felder.forEach(feld => {
        feld.bewaessert = !duerre && (wetterIst("regen") || Math.random() < 0.08 * segen("regenwolke"));
        feld.geduengt = Math.random() < 0.08 * segen("kompost");
    });
    if (!duerre) mische(run.felder).slice(0, anzahlBewaessert()).forEach(feld => { feld.bewaessert = true; });
    mische(run.felder).slice(0, anzahlGeduengt() + run.tagesBoni.extraDuenger).forEach(feld => { feld.geduengt = true; });
    run.felder.forEach(aktualisiereFeldMarker);
}

// fortsetzen = true: eine gespeicherte Sandbox laeuft weiter (ohne Start-Klang)
function starteTag(fortsetzen = false) {
    if (run.phase !== "vorTag" || (run.segenAuswahl && !run.sandbox)) return;

    run.phase = "tag";
    run.tagesBoni = run.naechsterTag;
    run.naechsterTag = leereTagesBoni();
    haken("tagVorbereiten"); // Wetter wird ausgewuerfelt
    let energie = energieMax() + run.tagesBoni.energie;
    if (wetterIst("hitze") && !hatWerkzeug("strohhut")) energie *= 0.8;
    run.tagesMaxEnergie = Math.round(energie);
    run.energie = run.tagesMaxEnergie;
    run.bonusEnergie = 0;
    run.tagMs = 0;
    run.goldBuffMs = run.tagesBoni.goldBuffSek * 1000;
    run.sternTimerMs = neuerSternTimerMs();
    run.gluehTimerMs = 1500;
    run.bienenMs = 0;
    run.statistik = neueTagesStatistik();
    run.streichelHeute = 0;
    run.nachrichten = [];
    run.klickZaehler = 0;
    run.zielFeld = null;
    run.samenUnterwegs = false;
    run.haendler = null;
    helferAkku = 0;
    kombo.zaehler = 0;
    kombo.letzteStufe = 1;

    verteileFeldEffekte();
    pflanzeAufZufaelligeFelder(run.tagesBoni.samenregen ? run.felder.length : level("fruehaufsteher"));
    const keimChance = 0.12 * segen("keimkraft");
    if (keimChance > 0) {
        run.felder.filter(f => f.leer && Math.random() < keimChance).forEach(pflanzeSamen);
    }

    schliessePanels();
    kartenHalter.classList.add("versteckt");
    if (!fortsetzen) Klang.tagStart();
    haken("tagStart");
    meldeAnDesktop("status", (run.sandbox ? "Sandbox · " : "") + "Tag " + run.tag + " · " + run.bezahlteRechnungen + " Rechnungen bezahlt");
    aktualisiereAlles();
}

// Sandbox: sobald genug Gold verdient ist, gibt es sofort einen Segen (das Spiel pausiert waehrend der Auswahl)
function pruefeMeilensteine() {
    const neu = erreichteMeilensteine() - run.meilensteine;
    if (neu <= 0) return;
    for (let i = 0; i < neu; i++) {
        run.meilensteine += 1;
        const hierophant = aufrunden(tw("hierophant"));
        if (hierophant > 0) gibSternensamen(hierophant);
    }
    run.meilensteineGemeldet = run.meilensteine;
    zeigeBanner("🏁", "Meilenstein " + run.meilensteine + " erreicht!", zahl(meilensteinSchwelle(run.meilensteine)) +
        " Gold verdient. Wähle einen Segen!", "#2e9e2e", 3200);
    Klang.rechnung();
    // Ein Segen pro Meilenstein, mehrere nacheinander
    if (run.segenAuswahl) {
        run.segenWarteschlange += neu;
        return;
    }
    run.segenAusstehend = true;
    run.segenWarteschlange += neu - 1;
    zeigeSegenAuswahl();
    aktualisiereAlles();
}

// Sandbox: nach Nacht und Morgengrauen beginnt nahtlos der naechste Tag (ohne Feierabend, die Pflanzen bleiben stehen)
function naechsterSandboxTag() {
    run.tagMs -= SANDBOX_TAG_MS;
    meta.lebenszeit.tage += 1;
    haken("tagEnde");

    run.tag += 1;
    run.glueck = neuerGlueckZustand();
    run.tagesBoni = run.naechsterTag;
    run.naechsterTag = leereTagesBoni();
    run.statistik = neueTagesStatistik();
    run.streichelHeute = 0;
    run.bonusEnergie = 0;
    run.haendler = null;
    aktualisiereLebenszeitMaxima();
    haken("pauseStart"); // der Wanderhaendler kann kommen
    haken("tagVorbereiten"); // neues Wetter
    verteileFeldEffekte();
    haken("tagStart");
    zeigeBanner("☀️", "Tag " + run.tag, "Ein neuer Tag beginnt", "#e0a800", 2600);
    Klang.tagStart();
    speichereRun();
    speichereMeta();
    aktualisiereAlles();
}

// 6 Rechnungen in der hoechsten freien Mondphase schalten die naechste frei
function pruefeMondphaseFrei() {
    const frei = meta.mondphaseFrei || 0;
    if (run.sandbox || run.mondphase !== frei || frei >= MONDPHASEN.length - 1) return;
    if (run.bezahlteRechnungen < MONDPHASE_FREI_AB_RECHNUNGEN) return;
    meta.mondphaseFrei = frei + 1;
    const neu = MONDPHASEN[frei + 1];
    run.nachrichten.push(neu.symbol + " Neue Mondphase freigeschaltet: " + neu.name + " (im Mondteich wählbar, +" +
        Math.round(MONDPHASE_BONUS * 100 * (frei + 1)) + "% Mondblüten)");
    zeigeBanner(neu.symbol, "Neue Mondphase: " + neu.name, "Wählbar im Mondteich, mehr Mondblüten", "#7c4fb3", 4500);
    speichereMeta();
}

function bezahleRechnungen() {
    // gibt false zurueck, wenn der Run vorbei ist. In der Sandbox gibt es statt Rechnungen Meilensteine.
    if (run.sandbox) {
        pruefeMeilensteine();
        return true;
    }
    const faellig = run.gnadenRechnung || (run.tag % KONFIG.tageProRechnung === 0 ? rechnungsBetrag(run.bezahlteRechnungen) : 0);
    if (faellig === 0) return true;

    if (run.gold >= faellig) {
        const warBoss = istBossRechnung(run.bezahlteRechnungen);
        run.gold -= faellig;
        run.bezahlteRechnungen += 1;
        meta.lebenszeit.rechnungen += 1;
        run.gnadenRechnung = 0;
        run.rechnungsRabatt = 0;
        run.segenAusstehend = true;
        run.nachrichten.push("🧾 Rechnung über " + zahl(faellig) + " Gold bezahlt!");
        const hierophant = aufrunden(tw("hierophant"));
        if (hierophant > 0) {
            gibSternensamen(hierophant);
            run.nachrichten.push("🔑 Der Hierophant: +" + hierophant + " Sternensamen");
        }
        if (warBoss) {
            meta.lebenszeit.bossRechnungen += 1;
            const bonus = BOSS_KONFIG.bonusSternensamenProRechnung * run.bezahlteRechnungen;
            gibSternensamen(bonus);
            run.segenBoss = true;
            run.nachrichten.push("🏦 Kredit abbezahlt! +" + zahl(bonus) + " Sternensamen und ein zusätzlicher Segen zur Auswahl");
        }
        Klang.rechnung();
        pruefeMondphaseFrei();
        haken("rechnungBezahlt", run.bezahlteRechnungen, warBoss);
        return true;
    }

    if (!run.gnadenRechnung && run.gnadenGenutzt < aufrunden(tw("gerechtigkeit"))) {
        run.gnadenGenutzt += 1;
        run.gnadenRechnung = aufrunden(faellig * 1.25);
        run.nachrichten.push("⚖️ Gnadenfrist! Zahle " + zahl(run.gnadenRechnung) + " Gold nach dem nächsten Tag.");
        return true;
    }

    beendeRun(faellig, false);
    return false;
}

function aktualisiereLebenszeitMaxima() {
    const l = meta.lebenszeit;
    l.maxKombo = Math.max(l.maxKombo, run.gesamt.maxKombo);
    l.maxFelder = Math.max(l.maxFelder, run.felder.length);
    l.maxPflanzen = Math.max(l.maxPflanzen, run.pflanzen.filter(p => p.freigeschaltet).length);
    l.maxTag = Math.max(l.maxTag || 0, run.tag);
    l.maxWerkzeuge = Math.max(l.maxWerkzeuge || 0, run.werkzeuge.length);
}

function beendeTag() {
    run.phase = "vorTag";
    run.glueck = neuerGlueckZustand();
    fxLayer.querySelectorAll(".sternschnuppe, .gluehwuermchen").forEach(e => e.remove());
    run.goldBuffMs = 0;
    run.magnetMs = 0;
    run.zielFeld = null;
    run.samenUnterwegs = false;
    buffAnzeige.classList.add("versteckt");
    meta.lebenszeit.tage += 1;
    haken("tagEnde");

    if (hatTarot("tod")) {
        run.felder.filter(f => f.fertig && !f.kraehe).forEach(f => ernteFeld(f, true, 1));
    }

    // Feierabend: liegengebliebene Saaten verfallen (ausser mit "Der Gehaengte")
    [...lootKugeln].forEach(loot => {
        if (istVerstaerkt("tod") || level("vorratskammer") > 0) sammleEin(loot);
        else lassVerfallen(loot);
    });

    run.felder.forEach(feld => {
        leereFeld(feld);
        feld.bewaessert = false;
        feld.geduengt = false;
        aktualisiereFeldMarker(feld);
    });
    run.klickZaehler = 0;
    kombo.zaehler = 0;

    // Zinsen, hoechstens die Haelfte der naechsten Rechnung (sonst wird Sparen zu stark)
    const zinsDeckel = (run.sandbox ? rechnungsBetrag(run.meilensteine) : naechsteRechnung().betrag) * zinsDeckelAnteil();
    const zinsen = Math.min(aufrunden(run.gold * zinsSatz()), aufrunden(zinsDeckel));
    if (zinsen > 0) {
        run.gold += zinsen;
        run.nachrichten.push("🐷 Zinsen: +" + zahl(zinsen) + " Gold");
    }

    aktualisiereLebenszeitMaxima();
    Klang.feierabend();
    if (!bezahleRechnungen()) return;

    run.tag += 1;
    haken("pauseStart"); // z.B. kommt der Wanderhaendler
    speichereMeta();
    zeigeTagesKarte("feierabend");
    if (run.segenAusstehend) zeigeSegenAuswahl();
    aktualisiereAlles();
}

function beendeRun(offenerBetrag, freiwillig) {
    run.phase = "runEnde";
    haken("runEnde");
    fxLayer.querySelectorAll(".sternschnuppe, .gluehwuermchen").forEach(e => e.remove());
    run.segenAuswahl = null;
    segenFenster.classList.add("versteckt");

    const mondblueten = mondbluetenJetzt();
    meta.mondblueten += mondblueten;
    meta.mondbluetenSeitSternenfall += mondblueten;
    meta.lebenszeit.runs += 1;
    aktualisiereLebenszeitMaxima();
    const tage = freiwillig ? run.tag - 1 : run.tag;
    const schnappschuss = { ...runSchnappschuss(), tage };
    const neuerRekord = !run.sandbox && istBessererRun(schnappschuss, meta.besterRun);
    if (neuerRekord) meta.besterRun = schnappschuss;
    speichereMeta();

    schliessePanels();
    zeigeTagesKarte("runEnde", { offenerBetrag, mondblueten, neuerRekord, freiwillig, tage });
    meldeAnDesktop("status", "Im Mondteich");
    aktualisiereAlles();
}

function starteNeuenRun(sandbox = false) {
    raeumeLootAuf();

    wechsleMetaProfil(sandbox);
    run = erstelleRunZustand(sandbox);
    meta.letzterModus = sandbox ? "sandbox" : "standard";
    aktiverShopReiter = "allgemein";
    kombo.zaehler = 0;

    // Saatgut-Vorrat und der verbesserte Gehaengte schalten Pflanzen zum Start frei
    const startPflanzen = metaLevel("saatvorrat");
    run.pflanzen.slice(1, 1 + startPflanzen).forEach(p => {
        p.freigeschaltet = true;
        run.level["p_" + p.id] = 1;
    });

    erstelleSlots();
    const startFelder = 1 + metaLevel("startfelder");
    for (let i = 0; i < startFelder; i++) erstelleFeld();

    prestigeShop.classList.add("versteckt");
    segenFenster.classList.add("versteckt");
    haken("runStart");
    // Die Sandbox hat keine Pausen zwischen den Tagen: sie laeuft sofort los
    if (sandbox) starteTag();
    else zeigeTagesKarte("start");
    aktualisiereAlles();
}

// ---------- TAGES-KARTE ----------

function beschreibeNaechstenTag() {
    const boni = run.naechsterTag;
    const teile = [];
    if (boni.energie > 0) teile.push("+" + boni.energie + " Energie");
    if (boni.samenregen) teile.push("Samenregen");
    if (boni.mindestGruen) teile.push("alle Saaten mindestens ungewöhnlich");
    if (boni.goldeneSamen > 0) teile.push(boni.goldeneSamen + "x goldene Saat");
    if (boni.goldBuffSek > 0) teile.push(boni.goldBuffSek + " Sek. doppeltes Gold");
    if (boni.extraDuenger > 0) teile.push(boni.extraDuenger + " zusätzliche gedüngte Felder");
    return teile.join(", ");
}

function zeigeTagesKarte(modus, daten = {}) {
    run.karte = { modus, daten };
    karteEingeklappt = false;
    // Der Zettel faehrt aus dem Kopfbereich herunter
    kartenHalter.classList.remove("versteckt");
    kartenHalter.classList.add("eingeklappt");
    void kartenHalter.offsetWidth;
    renderTagesKarte();
}

function renderTagesKarte() {
    const { modus, daten } = run.karte;
    tagesKarte.dataset.modus = modus;
    kartenHalter.classList.toggle("eingeklappt", karteEingeklappt);
    kartePfeil.textContent = karteEingeklappt ? "📋 " + tagesKarteTitel.textContent + "  ▼" : "▲ Hochschieben";
    setzeTipp(kartePfeil, karteEingeklappt ? "Tageskarte herunterziehen" : "Tageskarte hochschieben, um den Hof zu sehen");

    const s = run.statistik;
    let html = "";

    if (modus === "start") {
        tagesKarteTitel.textContent = run.sandbox ? "Sandbox · Tag 1" : "Tag 1";
        if (run.sandbox) {
            html += `<p class="karte-meta">Sandbox: keine Rechnungen, keine Energie, unendliche Entwicklung. Statt Rechnungen gibt es ` +
                `Meilensteine für verdientes Gold: Jeder bringt einen Segen. Mit dem Sandbox-Prestige fängst du neu an und bekommst ` +
                `Mondblüten für deine Meilensteine. Erfolge gibt es hier keine.</p>`;
        } else if (run.mondphase > 0) {
            const phase = MONDPHASEN[run.mondphase];
            html += `<p class="karte-meta">${phase.symbol} Mondphase ${phase.name}: +${Math.round(MONDPHASE_BONUS * 100 * run.mondphase)}% ` +
                `Mondblüten. Regeln: ${MONDPHASEN.slice(1, run.mondphase + 1).map(p => p.text).join(" ")}</p>`;
        } else if (meta.mondblueten > 0 || meta.tarot.length > 0) {
            html += `<p class="karte-meta">Mondblüten: ${zahl(meta.mondblueten)}  ·  ` +
                `Tarotkarten: ${meta.tarot.length}/${TAROT.length} (${meta.tarotSlots.length} ausgerüstet)</p>`;
        }
    } else if (modus === "feierabend") {
        tagesKarteTitel.textContent = "Feierabend! Tag " + (run.tag - 1) + " geschafft";
        const gewinnFarbe = RARITAETEN[s.hoechsterGewinnRaritaet].rand;
        html += `<div class="karte-statistik">
            <div><span>Ernten</span><b>${zahl(s.ernten)}</b></div>
            <div><span>Gold</span><b>+${zahl(s.gold)}</b></div>
            <div><span>Sternensamen</span><b>+${zahl(s.sternensamen)}</b></div>
            <div><span>Höchster Gewinn</span><b style="color:${gewinnFarbe}">${zahl(s.hoechsterGewinn)} Gold</b></div>
        </div>`;
        if (s.verfallen > 0) {
            html += `<p class="karte-verfallen">💨 ${s.verfallen} Saat${s.verfallen === 1 ? "" : "en"} verfallen</p>`;
        }
        if (s.gestohlen > 0) {
            html += `<p class="karte-verfallen">🐦 Krähen haben ${s.gestohlen} Pflanze${s.gestohlen === 1 ? "" : "n"} gestohlen</p>`;
        }
        run.nachrichten.forEach(text => { html += `<p class="karte-nachricht">${text}</p>`; });
    } else {
        tagesKarteTitel.textContent = run.sandbox ? "🌙 Neuanfang" : daten.neuerRekord ? "Run vorbei, neuer Rekord!" : "Run vorbei";
        if (run.sandbox) {
            html += `<p>Du fängst nach ${daten.tage === 1 ? "1 Tag" : daten.tage + " Tagen"} neu an und hast ${zahl(run.gesamt.gold)} Gold verdient.</p>`;
        } else if (daten.freiwillig) {
            html += `<p>Du hast ${run.sandbox ? "die Sandbox" : "den Run"} nach ${daten.tage === 1 ? "1 Tag" : daten.tage + " Tagen"} beendet.</p>`;
        } else {
            html += `<p>Die Rechnung über <b>${zahl(daten.offenerBetrag)} Gold</b> konnte nicht bezahlt werden. Du hattest ${zahl(run.gold)} Gold.</p>`;
        }
        html += `<div class="karte-statistik">
            <div><span>Tage</span><b>${daten.tage}</b></div>
            <div><span>${run.sandbox ? "Meilensteine" : "Bezahlte Rechnungen"}</span><b>${run.sandbox ? run.meilensteine : run.bezahlteRechnungen}</b></div>
            <div><span>Mondblüten erhalten</span><b>+${zahl(daten.mondblueten)}</b></div>
            <div><span>Mondblüten gesamt</span><b>${zahl(meta.mondblueten)}</b></div>
        </div>`;
    }

    if (modus !== "runEnde") {
        const naechsterTagText = beschreibeNaechstenTag();
        if (naechsterTagText) html += `<p class="karte-bonus">🎁 Nächster Tag: ${naechsterTagText}</p>`;
        html += karteZusatzHtml();

        if (run.sandbox) {
            html += `<p class="karte-rechnung">🏁 Nächster Meilenstein (${run.meilensteine + 1}): <b>${zahl(run.gesamt.gold)} / ` +
                `${zahl(meilensteinSchwelle(run.meilensteine + 1))} Gold</b> verdient. Sandbox-Prestige jetzt: ` +
                `+${zahl(sandboxMondblueten())} Mondblüten.</p>`;
        } else {
            const rechnung = naechsteRechnung();
            const warnung = rechnung.tageBis <= 2 && run.gold < rechnung.betrag;
            html += `<p class="karte-rechnung${warnung ? " warnung" : ""}${rechnung.boss ? " boss" : ""}">` +
                `${rechnung.boss ? "🏦 Kredit abbezahlen" : "🧾 Rechnung"}: <b>${zahl(rechnung.betrag)} Gold</b> ` +
                `in ${tageText(rechnung.tageBis)}. Du hast ${zahl(run.gold)} Gold.</p>`;
        }
    }

    tagesKarteInhalt.innerHTML = html;

    const istRunEnde = modus === "runEnde";
    karteShop.classList.toggle("versteckt", istRunEnde);
    karteSkilltree.classList.toggle("versteckt", istRunEnde);
    const hatMeta = meta.mondblueten > 0 || meta.tarot.length > 0 || Object.keys(meta.upgrades).length > 0 || meta.gutscheine > 0;
    kartePrestige.classList.toggle("versteckt", modus !== "start" || !hatMeta);
    karteHaendler.classList.toggle("versteckt", !run.haendler || istRunEnde);
    karteWeiter.textContent = istRunEnde ? "Zum Mondteich" : "Tag " + run.tag + " starten";
    karteWeiter.disabled = Boolean(run.segenAuswahl);

    // Frueher aufhoeren geht nach jedem Tag (die Mondblueten fuer bezahlte Rechnungen gibt es trotzdem)
    const aufgebenMoeglich = modus === "feierabend";
    karteAufgeben.parentElement.classList.toggle("versteckt", !aufgebenMoeglich);
    karteAufgeben.disabled = Boolean(run.segenAuswahl);
    karteAufgeben.textContent = "🏳️ Run beenden";
}

// Zusaetzliche Zeilen auf der Tageskarte (Boss-Regel, Werkzeuge ...), von ereignisse.js gefuellt
function karteZusatzHtml() {
    const teile = [];
    haken("karteZusatz", teile);
    return teile.join("");
}

// ---------- ANZEIGEN ----------

// Hover ueber dem Kalender: alles, was im Moment wirkt (Tageszeit, Wetter, Boss-Regel, Mondphase, Segen, Werkzeuge)
function aktivTipp() {
    const z = jahreszeit();
    const zeilen = ["## " + (run.sandbox ? "Sandbox · " : "") + "Tag " + run.tag + " · " + z.symbol + " " + z.name];
    if (!run.sandbox && run.phase !== "runEnde") {
        const r = naechsteRechnung();
        const fehlt = Math.max(0, r.betrag - run.gold);
        if (r.tageBis <= 1) {
            zeilen.push("> ⚠️ " + (run.phase === "tag" ? "Heute" : "Nach dem nächsten Tag") + " ist Zahltag: " + zahl(r.betrag) + " Gold" +
                (fehlt > 0 ? " (es fehlen noch " + zahl(fehlt) + ")" : " (hast du schon)"));
        } else {
            zeilen.push("🧾 " + (r.boss ? "Kredit" : "Rechnung") + ": " + zahl(r.betrag) + " Gold am Ende von Tag " + r.tag +
                " (noch " + r.tageBis + (r.tageBis === 1 ? " Tag)" : " Tage)"));
        }
    }
    if (run.phase === "tag") {
        const anteil = tagesAnteil();
        const zeit = anteil < 0.2 || anteil > 1.2 ? "🌅 Morgen" : anteil < 0.66 ? "☀️ Tag" : anteil < 0.85 ? "🌇 Abend" : "🌙 Nacht";
        zeilen.push(zeit + (run.sandbox ? " (" + Math.round(tagesFortschritt() * 100) + "% des Tages vorbei)" : ""));
    }
    zeilen.push("", "## Gerade aktiv", z.symbol + " " + z.name + ": " + jahreszeitEffekte(z));
    if (run.phase === "tag" && run.wetter) zeilen.push(WETTER_NACH_ID[run.wetter].symbol + " " + WETTER_NACH_ID[run.wetter].name + ": " +
        wetterText(WETTER_NACH_ID[run.wetter]));
    if (run.bossRegel) zeilen.push("🏦 Kredit-Auflage " + BOSS_NACH_ID[run.bossRegel].name + ": " + BOSS_NACH_ID[run.bossRegel].text);
    if (run.mondphase > 0) zeilen.push(MONDPHASEN[run.mondphase].symbol + " Mondphase " + MONDPHASEN[run.mondphase].name + ": +" +
        Math.round(MONDPHASE_BONUS * 100 * run.mondphase) + "% Mondblüten");
    if (run.goldBuffMs > 0) zeilen.push("🌠 Sternschnuppe: doppeltes Gold für " + Math.ceil(run.goldBuffMs / 1000) + " Sek.");
    const segenListe = Object.entries(run.segen).filter(([, stufe]) => stufe > 0);
    if (segenListe.length > 0) {
        zeilen.push("", "## Segen");
        segenListe.forEach(([id, stufe]) => {
            const s = SEGEN_NACH_ID[id];
            if (s) zeilen.push(s.badge + " " + s.name + (stufe > 1 ? " x" + stufe : "") + ": " + s.text);
        });
    }
    if (run.werkzeuge.length > 0) {
        zeilen.push("", "## Werkzeuge");
        run.werkzeuge.forEach(id => {
            const w = WERKZEUG_NACH_ID[id];
            if (w) zeilen.push(w.symbol + " " + w.name + ": " + werkzeugText(id));
        });
    }
    if (zeilen.length <= 4 && segenListe.length === 0) zeilen.push("", "Noch keine Segen oder Werkzeuge.");
    return zeilen.join("\n");
}

function aktualisiereTopBar() {
    zaehleHoch(moneyDisplay.querySelector("span"), run.gold);
    zaehleHoch(skillpointDisplay.querySelector("span"), run.skillpunkte);
    kalenderDisplay.querySelector("span").textContent = (run.sandbox ? "Sandbox · " : "") + "Tag " + run.tag;
    setzeTipp(kalenderDisplay, aktivTipp());
    kalenderDisplay.classList.toggle("zahltag-warnung", !run.sandbox && run.phase !== "runEnde" && naechsteRechnung().tageBis <= 1);
    if (run.sandbox) {
        rechnungDisplay.querySelector("span").textContent = "🏁 " + zahl(run.gesamt.gold) + " / " +
            zahl(meilensteinSchwelle(run.meilensteineGemeldet + 1)) + " Gold";
        setzeTipp(rechnungDisplay, "Nächster Meilenstein: so viel Gold musst du in dieser Sandbox insgesamt verdienen. " +
            "Jeder Meilenstein bringt einen Segen und beim Sandbox-Prestige Mondblüten.");
        rechnungDisplay.classList.remove("boss");
    } else {
        const rechnung = naechsteRechnung();
        rechnungDisplay.querySelector("span").textContent =
            (run.gnadenRechnung ? "⚖️ " : rechnung.boss ? "🏦 Kredit: " : "") + zahl(rechnung.betrag) + " Gold in " + tageText(rechnung.tageBis);
        rechnungDisplay.classList.toggle("boss", rechnung.boss);
        setzeTipp(rechnungDisplay, "Nächste Rechnung. Jede 3. ist ein Kredit, den du abbezahlen musst: Bis dahin gilt eine " +
            "Kredit-Auflage, dafür gibt es Sternensamen und einen zusätzlichen Segen zur Auswahl.");
    }
    aktualisiereEnergieAnzeige();
}

function aktualisiereEnergieAnzeige() {
    // Sandbox: keine Energie. An ihrer Stelle steht der Knopf fuer den Neuanfang (Sandbox-Prestige).
    const energieBox = energieFuellung.parentElement.parentElement;
    energieBox.classList.toggle("sandbox-box", run.sandbox);
    neuanfangKnopf.classList.toggle("versteckt", !run.sandbox || run.phase === "runEnde");
    if (run.sandbox) {
        neuanfangKnopf.textContent = "🌙 Neuanfang · +" + zahl(mondbluetenJetzt());
        setzeTipp(energieBox, null);
        setzeTipp(neuanfangKnopf, "Sandbox-Prestige: Fang von vorn an und bekomm Mondblüten für deine " + run.meilensteine +
            " Meilensteine (die Hälfte von dem, was so viele Rechnungen bringen würden).");
        return;
    }
    setzeTipp(energieBox, "Energie = Tageszeit. Ist sie leer, ist Feierabend.");
    const max = run.phase === "tag" ? run.tagesMaxEnergie : energieMax() + run.naechsterTag.energie;
    const wert = run.phase === "tag" ? run.energie : max;
    energieFuellung.style.width = Math.min(100, (wert / max) * 100) + "%";
    energieFuellung.classList.toggle("energie-knapp", run.phase === "tag" && wert <= 50);
    energieText.textContent = Math.ceil(wert);
}

// Kleine Hinweis-Punkte an Knoepfen, wenn man sich etwas leisten kann
function aktualisiereHinweisPunkte() {
    const shopKnopf = $("shop-button");
    const sternKnopf = $("skilltree-button");
    let shopLeistbar = false;
    let sternLeistbar = false;
    if (darfEinkaufen()) {
        shopLeistbar = run.gold >= feldKosten() && run.felder.length < MAX_FELDER ||
            SHOP_UPGRADES.some(def => shopUpgradeFrei(def) && level(def.id) < def.max &&
                run.gold >= kostenMitFaktor(def.basiskosten, def.faktor, level(def.id)));
        sternLeistbar = SKILLS.some(knotenLeistbar);
    }
    shopKnopf.classList.toggle("hat-neues", shopLeistbar);
    sternKnopf.classList.toggle("hat-neues", sternLeistbar);
}

function aktualisiereAlles() {
    aktualisiereTopBar();
    aktualisiereKnopfAnzeige();
    aktualisiereMarktstand();
    aktualisiereKaufKachel();
    aktualisiereSammelRing();
    aktualisiereHinweisPunkte();
    haken("anzeige");
    if (!kartenHalter.classList.contains("versteckt")) renderTagesKarte();
    if (!shopPanel.classList.contains("hidden")) renderShop();
    if (!skilltreeFenster.classList.contains("versteckt")) renderSkilltree();
    renderErfolge();
    renderStatistik();
}

// ---------- PANELS: GEMEINSAME BAUSTEINE ----------

function erstelleKarte({ titel, beschreibung, info, knopfText, aktiv, onKauf, icon }) {
    const item = el("div", "upgrade-item");
    const name = el("div", "upgrade-name");
    if (icon) name.appendChild(pixelIcon(icon, 32));
    name.appendChild(el("span", null, titel));
    item.appendChild(name);
    if (beschreibung) item.appendChild(el("div", "upgrade-beschreibung", beschreibung));
    if (info) item.appendChild(el("div", "upgrade-info", info));

    if (knopfText) {
        const button = el("button", "knopf upgrade-buy-button", knopfText);
        button.disabled = !aktiv;
        button.addEventListener("click", onKauf);
        item.appendChild(button);
    }
    return item;
}

function erstelleHinweis(text) {
    return el("div", "panel-hinweis", text);
}

function renderReiter(container, liste, aktiveId, onWahl) {
    container.innerHTML = "";
    liste.forEach(reiter => {
        const knopf = el("button", "knopf reiter-knopf", reiter.text);
        knopf.classList.toggle("aktiv", reiter.id === aktiveId);
        knopf.addEventListener("click", () => onWahl(reiter.id));
        container.appendChild(knopf);
    });
}

function stufenText(stufe, max) {
    return max === Infinity ? "Stufe " + stufe : "Stufe " + stufe + "/" + max;
}

function upgradeKarte(def, waehrung) {
    const lvl = level(def.id);
    const kosten = kostenMitFaktor(def.basiskosten, def.faktor, lvl);
    const istMax = lvl >= def.max;

    return erstelleKarte({
        titel: def.name + " (" + stufenText(lvl, def.max) + ")",
        beschreibung: def.beschreibung,
        info: "Aktuell: " + def.info(),
        knopfText: istMax ? "Maximal" : preisText(kosten, waehrung),
        aktiv: !istMax && darfEinkaufen() && guthaben(waehrung) >= kosten,
        onKauf: () => kaufeUpgrade(def, waehrung)
    });
}

function kaufeUpgrade(def, waehrung) {
    const kosten = kostenMitFaktor(def.basiskosten, def.faktor, level(def.id));
    if (!darfEinkaufen() || level(def.id) >= def.max || guthaben(waehrung) < kosten) return;
    if (def.vor && !istVorgaengerErfuellt(def.vor, def.vorMax)) return;
    bezahle(waehrung, kosten);
    run.level[def.id] = level(def.id) + 1;
    Klang.kaufen();
    schalteSternFrei(def);
    aktualisiereAlles();
    if (waehrung === "skillpunkte") sternGekauft(def);
}

// ---------- SHOP (Gold) ----------

function pflanzenUpgradeKosten(pflanze, upgrade) {
    return kostenMitFaktor(upgrade.basiskosten * pflanze.verkaufswert, upgrade.faktor, pflanze.level[upgrade.id]);
}

function kaufePflanzenUpgrade(pflanze, upgrade) {
    const kosten = pflanzenUpgradeKosten(pflanze, upgrade);
    if (!darfEinkaufen() || !pflanzenUpgradeFrei(pflanze, upgrade) || pflanze.level[upgrade.id] >= upgrade.max || run.gold < kosten) return;
    run.gold -= kosten;
    pflanze.level[upgrade.id] += 1;
    Klang.kaufen();
    if (upgrade.id === "ertrag" && pflanze.level.ertrag % 10 === 0) {
        zeigeBanner(pflanze.emoji, pflanze.name + ": Ertrag Stufe " + pflanze.level.ertrag, "Wert verdoppelt!", "#e0a800", 2600);
        Klang.jackpot();
    }
    aktualisiereAlles();
}

// Eine Stand-Karte auf dem Markt: Symbol, Name, Stufe, Wirkung, "Du hast jetzt", Stufenpunkte, Kaufknopf
function marktKarte({ icon, name, lvl = 0, max = 1, beschreibung, jetzt, kosten, onKauf, zusatz }) {
    const istMax = lvl >= max;
    const leistbar = !istMax && darfEinkaufen() && run.gold >= kosten;
    const bild = pixelIcon(icon, 48);
    const karte = el("div", "markt-karte" + (istMax ? " maximal" : "") + (leistbar ? " leistbar" : ""), null, [
        el("div", "markt-karte-kopf", null, [
            el("div", "markt-bildrahmen", null, [bild]),
            el("div", "markt-karte-titel", null, [
                el("div", "markt-karte-name", name),
                el("div", "markt-karte-stufe", max === Infinity ? "Stufe " + lvl : max === 1 ? (lvl ? "Gekauft" : "Einmalig") : "Stufe " + lvl + " / " + max)
            ])
        ]),
        el("div", "markt-karte-text", beschreibung),
        zusatz ? el("div", "markt-karte-zusatz", zusatz) : null,
        jetzt ? el("div", "markt-karte-jetzt", null, [el("span", null, "Du hast jetzt: "), el("b", null, jetzt)]) : null,
        max > 1 && max <= 15 ? stufenPunkte(lvl, max) : null
    ]);
    const knopf = el("button", "knopf markt-kaufen", istMax ? "✔ Maximal" : "💰 " + zahl(kosten) + " Gold");
    knopf.disabled = !leistbar;
    knopf.addEventListener("click", onKauf);
    karte.appendChild(knopf);
    return karte;
}

function marktGesperrt(titel, text) {
    return el("div", "markt-karte gesperrt", null, [
        el("div", "markt-gesperrt-bild", "🔒"),
        el("div", "markt-karte-name", titel),
        el("div", "markt-karte-text", text)
    ]);
}

const PFLANZEN_UPGRADE_ICONS = { ertrag: "💰", wachstum: "⏱️", pracht: "🎨", ueberfluss: "➕" };

function renderShop() {
    // Waehrend eine Muenze fliegt oder die Huehner rennen, wird der Glueck-Reiter nicht neu aufgebaut
    if (glueckAnimation && aktiverShopReiter === "glueck" && !shopPanel.classList.contains("hidden")) return;
    const liste = [{ id: "allgemein", text: "⚙️ Allgemein" }];
    run.pflanzen.filter(p => p.freigeschaltet).forEach(p => liste.push({ id: p.id, text: p.emoji + " " + p.name }));
    if (hatGluecksspiel()) liste.push({ id: "glueck", text: "🎲 Glücksspiel" });
    if (!liste.some(r => r.id === aktiverShopReiter)) aktiverShopReiter = "allgemein";

    renderReiter(shopReiter, liste, aktiverShopReiter, id => {
        aktiverShopReiter = id;
        renderShop();
    });

    shopContent.innerHTML = "";
    const goldAnzeige = $("markt-gold");
    goldAnzeige.innerHTML = "";
    goldAnzeige.append(spriteIcon("muenze"), " " + zahl(run.gold) + " Gold");
    if (!darfEinkaufen()) shopContent.appendChild(erstelleHinweis("🌙 Einkaufen geht nur zwischen den Tagen."));
    const raster = el("div", "markt-raster");

    if (aktiverShopReiter === "allgemein") {
        raster.appendChild(marktKarte({
            icon: "🌱", name: "Neues Feld", lvl: run.felder.length, max: MAX_FELDER,
            beschreibung: "Erweitert deinen Acker um ein Feld. Geht auch über das + Schild auf dem Acker.",
            jetzt: run.felder.length + " von " + MAX_FELDER + " Feldern",
            kosten: feldKosten(), onKauf: kaufeFeld
        }));
        SHOP_UPGRADES.filter(shopUpgradeFrei).forEach(def => raster.appendChild(marktKarte({
            icon: def.icon, name: def.name, lvl: level(def.id), max: def.max,
            beschreibung: (/Stufe/.test(def.beschreibung) || def.max === 1 ? "" : "Jede Stufe: ") + def.beschreibung,
            jetzt: level(def.id) > 0 ? def.info() : null,
            kosten: kostenMitFaktor(def.basiskosten, def.faktor, level(def.id)),
            onKauf: () => kaufeUpgrade(def, "gold")
        })));
        const gesperrt = SHOP_UPGRADES.filter(def => !shopUpgradeFrei(def) && !istSandboxAus(def.id)).length;
        if (gesperrt > 0) {
            raster.appendChild(marktGesperrt(gesperrt + " weitere Stände", "Schaltest du im Stellarium frei (Äste Hof und Helfer)."));
        }
        shopContent.appendChild(raster);
        return;
    }

    if (aktiverShopReiter === "glueck") {
        renderGluecksspiele();
        return;
    }

    const pflanze = run.pflanzen.find(p => p.id === aktiverShopReiter);
    // Kopf: die Pflanze mit ihren Werten
    const meister = meisterStufe(pflanze.id);
    const kopfBild = spriteIcon(pflanze.id, true);
    kopfBild.classList.add("markt-pflanze-bild");
    shopContent.appendChild(el("div", "markt-pflanze-kopf", null, [
        kopfBild,
        el("div", null, null, [
            el("div", "markt-pflanze-name", pflanze.name),
            el("div", "markt-pflanze-werte", "💰 " + zahl(verkaufswert(pflanze)) + " Gold Grundwert · ⏱️ " +
                sekText(basisStufenZeitSek(pflanze) * 3) + " bis zur Ernte"),
            eigenschaftText(pflanze) ? el("div", "markt-pflanze-eigenschaft", eigenschaftText(pflanze)) : null,
            meister > 0 ? el("div", "markt-pflanze-eigenschaft", "🏅 Meisterschaft " + meister + ": für immer +" +
                Math.round(MEISTER_BONUS * 100 * meister) + "% Wert") : null
        ])
    ]));

    PFLANZEN_UPGRADES.forEach(upgrade => {
        if (!pflanzenUpgradeFrei(pflanze, upgrade)) return;
        const lvl = pflanze.level[upgrade.id];
        raster.appendChild(marktKarte({
            icon: PFLANZEN_UPGRADE_ICONS[upgrade.id] || pflanze.emoji, name: upgrade.name, lvl, max: upgrade.max,
            beschreibung: "Jede Stufe: " + upgrade.beschreibung,
            zusatz: upgrade.id === "ertrag" ? "⭐ Stufe " + (Math.floor(lvl / 10) + 1) * 10 + " verdoppelt den Wert" : null,
            jetzt: upgrade.info(pflanze),
            kosten: pflanzenUpgradeKosten(pflanze, upgrade),
            onKauf: () => kaufePflanzenUpgrade(pflanze, upgrade)
        }));
    });
    const fehlend = PFLANZEN_UPGRADES.filter(u => !pflanzenUpgradeFrei(pflanze, u));
    if (fehlend.length > 0) {
        raster.appendChild(marktGesperrt(fehlend.map(u => u.name).join(", "), "Schaltest du im Stellarium am Ast von " + pflanze.name + " frei."));
    }
    shopContent.appendChild(raster);
}

// ---------- STERNENBAUM (kostet Sternensamen) ----------
// Ein grosser Baum (Daten in daten.js, SKILLS). Mit gedrueckter Maus verschieben, mit dem Mausrad zoomen.
// Jeder Stern ist gesperrt, bis sein Vorgaenger ("vor") mindestens 1x gekauft wurde.
// Bei vorMax (Münz-Farben) muss der Vorgaenger komplett ausgebaut sein.
// Sichtbar sind gekaufte und kaufbare Sterne, einen Schritt dahinter nur ein Schatten, alles weitere ist noch verborgen.

const SVG_NS = "http://www.w3.org/2000/svg";
const baumWelt = $("baum-welt");
const baumHimmel = $("sternbild-himmel");
const baumAnsicht = { x: 0, y: -60, zoom: 0.85 }; // x/y = Punkt des Baums in der Mitte der Ansicht
const BAUM_ZOOM = { min: 0.3, max: 1.6 };
let baumZug = null;

function istKnotenGekauft(id) {
    return level(id) > 0;
}

function istKnotenMax(id) {
    return level(id) >= SKILL_NACH_ID[id].max;
}

function istVorgaengerErfuellt(vor, vorMax) {
    return vorMax ? istKnotenMax(vor) : istKnotenGekauft(vor);
}

function istKnotenOffen(def) {
    return !def.vor || istVorgaengerErfuellt(def.vor, def.vorMax);
}

function knotenKosten(def) {
    return kostenMitFaktor(def.basiskosten, def.faktor, level(def.id));
}

function knotenSicht(def) {
    if (istKnotenGekauft(def.id) || istKnotenOffen(def)) return "sichtbar";
    const vor = SKILL_NACH_ID[def.vor];
    return vor && istKnotenOffen(vor) ? "schatten" : "versteckt";
}

function knotenLeistbar(def) {
    return istKnotenOffen(def) && level(def.id) < def.max && darfEinkaufen() && run.skillpunkte >= knotenKosten(def);
}

// Ist das Markt-Upgrade schon im Stellarium freigeschaltet?
function shopUpgradeFrei(def) {
    if (istSandboxAus(def.id)) return false;
    return !def.knoten || level(def.knoten) > 0;
}

function pflanzenUpgradeFrei(pflanze, upgrade) {
    return !upgrade.knoten || level(upgrade.knoten + pflanze.id) > 0;
}

function schalteSternFrei(def) {
    if (def.art === "pflanze") {
        const pflanze = run.pflanzen.find(p => p.id === def.pflanze);
        pflanze.freigeschaltet = true;
        zeigeBanner(pflanze.emoji, pflanze.name + " freigeschaltet!", "Wächst ab jetzt auf deinen Feldern", "#2e9e2e", 2400);
        neuePflanzeFeier(pflanze);
        Klang.segen();
    } else if (def.art === "shop" || def.art === "pflanzenShop") {
        zeigeBanner(def.icon, "Neu auf dem Markt: " + def.name, null, "#b8862b", 2200);
    }
}

function erstelleSternenhimmel() {
    for (let i = 0; i < 140; i++) {
        const punkt = document.createElement("span");
        punkt.classList.add("himmel-punkt");
        const groesse = 1 + Math.random() * 2;
        punkt.style.left = Math.random() * 100 + "%";
        punkt.style.top = Math.random() * 100 + "%";
        punkt.style.width = groesse + "px";
        punkt.style.height = groesse + "px";
        punkt.style.animationDelay = -Math.random() * 4 + "s";
        himmelPunkte.appendChild(punkt);
    }
}

function setzeBaumAnsicht(gleiten) {
    const breite = baumHimmel.clientWidth;
    const hoehe = baumHimmel.clientHeight;
    baumWelt.classList.toggle("gleitet", Boolean(gleiten));
    baumWelt.style.transform = "translate(" + (breite / 2 - baumAnsicht.x * baumAnsicht.zoom) + "px, " +
        (hoehe / 2 - baumAnsicht.y * baumAnsicht.zoom) + "px) scale(" + baumAnsicht.zoom + ")";
    // Der Sternenhimmel im Hintergrund zieht leicht mit (Tiefe)
    himmelPunkte.style.transform = "translate(" + (-baumAnsicht.x * 0.05) % 60 + "px, " + (-baumAnsicht.y * 0.05) % 60 + "px)";
}

function springeZu(x, y, zoom) {
    baumAnsicht.x = x;
    baumAnsicht.y = y;
    if (zoom) baumAnsicht.zoom = zoom;
    setzeBaumAnsicht(true);
}

function zoomeBaum(faktor, cx, cy) {
    const rect = baumHimmel.getBoundingClientRect();
    const px = cx === undefined ? rect.width / 2 : cx - rect.left;
    const py = cy === undefined ? rect.height / 2 : cy - rect.top;
    // Der Punkt unter der Maus bleibt beim Zoomen an seiner Stelle
    const weltX = baumAnsicht.x + (px - rect.width / 2) / baumAnsicht.zoom;
    const weltY = baumAnsicht.y + (py - rect.height / 2) / baumAnsicht.zoom;
    baumAnsicht.zoom = klemme(baumAnsicht.zoom * faktor, BAUM_ZOOM.min, BAUM_ZOOM.max);
    baumAnsicht.x = weltX - (px - rect.width / 2) / baumAnsicht.zoom;
    baumAnsicht.y = weltY - (py - rect.height / 2) / baumAnsicht.zoom;
    setzeBaumAnsicht(false);
}

baumHimmel.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    baumZug = { x: event.clientX, y: event.clientY, gezogen: false };
    baumHimmel.setPointerCapture(event.pointerId);
});
let baumBildGeplant = false;

baumHimmel.addEventListener("pointermove", event => {
    if (!baumZug) return;
    const dx = event.clientX - baumZug.x;
    const dy = event.clientY - baumZug.y;
    if (!baumZug.gezogen && Math.hypot(dx, dy) < 5) return;
    baumZug.gezogen = true;
    baumHimmel.classList.add("zieht");
    baumAnsicht.x -= dx / baumAnsicht.zoom;
    baumAnsicht.y -= dy / baumAnsicht.zoom;
    baumZug.x = event.clientX;
    baumZug.y = event.clientY;
    // Viele Mausbewegungen pro Bild: nur einmal pro Bild verschieben (sonst ruckelt es)
    if (baumBildGeplant) return;
    baumBildGeplant = true;
    requestAnimationFrame(() => {
        baumBildGeplant = false;
        setzeBaumAnsicht(false);
    });
});
baumHimmel.addEventListener("pointerup", event => {
    if (!baumZug) return;
    const warGezogen = baumZug.gezogen;
    baumZug = null;
    baumHimmel.classList.remove("zieht");
    // Ein kurzer Klick (ohne Ziehen) waehlt den Stern darunter aus
    if (!warGezogen) {
        const stern = document.elementsFromPoint(event.clientX, event.clientY).find(e => e.classList && e.classList.contains("stern"));
        if (stern) {
            aktiverStern = stern.dataset.id;
            Klang.klick(10);
            renderSkilltree();
        }
    }
});
$("baum-mitte").addEventListener("click", () => springeZu(BAUM_ZIELE[0].pos[0], BAUM_ZIELE[0].pos[1], 0.85));

// "?" im Stellarium: die Erklaerungen, die sonst immer im Weg standen
$("baum-hilfe").addEventListener("click", () => {
    const punkte = [
        "✨ Sternensamen bekommst du bei jeder Ernte (5 pro Ernte) und für jeden Klick auf den Samenladen, der einen Samen wirft (" +
            sternensamenProKlick() + " pro Klick).",
        "🖱️ Ziehen verschiebt den Baum, das Mausrad zoomt. „⭐ Kaufbar“ springt zu Sternen, die du dir leisten kannst.",
        "Ⅱ Sterne mit Ⅱ kommen erst, wenn der Stern davor ganz ausgebaut ist: viel teurer, viel stärker.",
        "🟢 Grüne Sterne sind schon erledigt, weil eine Tarotkarte oder der Mondteich dasselbe dauerhaft macht.",
        "💡 Kaufen geht nur zwischen den Tagen (in der Sandbox jederzeit)."
    ];
    zeigePopup({ titel: "✨ So funktioniert das Stellarium", breite: 560, inhalt: el("div", "hilfe-liste", null, punkte.map(p => el("p", null, p))) });
});

// Springt der Reihe nach zu allen Sternen, die man sich gerade leisten kann
let naechsterKaufbarIndex = 0;
const baumNaechster = $("baum-naechster");
baumNaechster.addEventListener("click", () => {
    const kaufbar = SKILLS.filter(knotenLeistbar);
    if (kaufbar.length === 0) return;
    naechsterKaufbarIndex = (naechsterKaufbarIndex + 1) % kaufbar.length;
    const def = kaufbar[naechsterKaufbarIndex];
    aktiverStern = def.id;
    springeZu(def.pos[0], def.pos[1]);
    renderSkilltree();
});
baumHimmel.addEventListener("wheel", event => {
    event.preventDefault();
    zoomeBaum(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX, event.clientY);
}, { passive: false });

function renderSkilltree() {
    sternbildTitel.textContent = "✨ Stellarium";
    const anzahlKaufbar = SKILLS.filter(knotenLeistbar).length;
    baumNaechster.textContent = "⭐ Kaufbar: " + anzahlKaufbar;
    baumNaechster.disabled = anzahlKaufbar === 0;
    sternbildSp.innerHTML = "";
    sternbildSp.append(spriteIcon("sternensamen"), " " + zahl(run.skillpunkte) + " Sternensamen");

    if (!SKILL_NACH_ID[aktiverStern]) aktiverStern = "p_weizen";

    sternbildLinien.innerHTML = "";
    sternbildKnotenEl.innerHTML = "";
    SKILLS.forEach(def => {
        const sicht = knotenSicht(def);
        if (sicht === "versteckt" || istSandboxAus(def.id)) return;
        // In der Sandbox fehlen manche Sterne: die Linie geht dann zum naechsten sichtbaren Vorgaenger
        let vor = SKILL_NACH_ID[def.vor];
        while (vor && istSandboxAus(vor.id)) vor = SKILL_NACH_ID[vor.vor];
        if (vor && knotenSicht(vor) !== "versteckt") {
            const linie = document.createElementNS(SVG_NS, "line");
            linie.setAttribute("x1", vor.pos[0]);
            linie.setAttribute("y1", vor.pos[1]);
            linie.setAttribute("x2", def.pos[0]);
            linie.setAttribute("y2", def.pos[1]);
            linie.classList.add(istKnotenGekauft(def.id) ? "linie-voll" : istKnotenOffen(def) ? "linie-offen" : "linie-gesperrt");
            sternbildLinien.appendChild(linie);
        }

        const lvl = level(def.id);
        const schatten = sicht === "schatten";
        const verborgen = schatten || (def.geheim && !istKnotenOffen(def));
        const stern = document.createElement("div");
        stern.dataset.id = def.id;
        stern.classList.add("stern", "ast-" + def.ast);
        stern.classList.toggle("schatten", schatten);
        stern.classList.toggle("gesperrt", !istKnotenOffen(def));
        stern.classList.toggle("gekauft", lvl > 0);
        stern.classList.toggle("maximal", lvl >= def.max);
        stern.classList.toggle("unendlich", def.max === Infinity);
        stern.classList.toggle("leistbar", !schatten && knotenLeistbar(def));
        stern.classList.toggle("ausgewaehlt", def.id === aktiverStern);
        stern.classList.toggle("wurzel", def.id === "p_weizen");
        stern.classList.toggle("pflanzen-stern", def.art === "pflanze");
        stern.classList.toggle("erledigt", Boolean(def.erledigt && def.erledigt()));
        stern.classList.toggle("stufe-zwei", Boolean(def.vorMax && def.abzeichen === "Ⅱ"));
        stern.style.left = def.pos[0] + "px";
        stern.style.top = def.pos[1] + "px";

        stern.appendChild(pixelIcon(verborgen ? "❓" : def.icon, 32, "stern-icon"));
        if (!verborgen) {
            stern.appendChild(el("span", "stern-name", def.name));
            if (def.abzeichen) stern.appendChild(pixelIcon(def.abzeichen, 16, "stern-abzeichen"));
            if (def.max > 1 && lvl > 0) {
                stern.appendChild(el("span", "stern-stufe", def.max === Infinity ? String(lvl) : lvl + "/" + def.max));
            }
        }
        sternbildKnotenEl.appendChild(stern);
    });

    setzeBaumAnsicht(false);
    renderSternDetails(SKILL_NACH_ID[aktiverStern]);
}

const AST_NAMEN = {
    pflanzen: "🌱 Pflanzen", ernte: "🍀 Ernte", hof: "🏡 Hof", helfer: "🐿️ Helfer", glueck: "🎲 Glück", besondere: "✨ Spezialpflanzen"
};

// Stufen als kleine Punkte (bis 10 Stufen), sonst als Zahl
function stufenPunkte(lvl, max) {
    if (max === Infinity) return el("div", "stern-stufen-text", "Stufe " + lvl + " · unendlich");
    if (max === 1) return el("div", "stern-stufen-text", lvl > 0 ? "✔ Freigeschaltet" : "Noch nicht gekauft");
    if (max > 10) return el("div", "stern-stufen-text", "Stufe " + lvl + " / " + max);
    const leiste = el("div", "stern-punkte");
    for (let i = 0; i < max; i++) leiste.appendChild(el("span", i < lvl ? "voll" : null));
    return leiste;
}

// Kurze Karte rechts: Symbol, Name, ein Satz, Stufen-Punkte, "Jetzt", Preis
// Erklaert in 1 bis 3 kurzen Saetzen, was beim Kauf passiert
function sternErklaerung(def) {
    const box = el("div", "stern-karte-text");
    if (def.markt) {
        // Stern schaltet etwas auf dem Markt frei: Name und Wirkung des Upgrades zeigen
        box.appendChild(el("div", "stern-markt", null, [
            el("div", "stern-markt-titel", "🛒 Neu auf dem Markt" + (def.marktReiter ? " (Reiter " + def.marktReiter + ")" : "")),
            el("b", null, (def.markt.icon ? def.markt.icon + " " : "") + def.markt.name),
            el("div", null, (/Stufe/.test(def.markt.beschreibung) ? "" : "Jede Stufe: ") + def.markt.beschreibung),
            el("div", "stern-markt-hinweis", "Dort kaufst du es danach mit Gold, " +
                (def.markt.max === Infinity ? "beliebig oft." : "bis Stufe " + def.markt.max + "."))
        ]));
        return box;
    }
    if (def.art === "pflanze" && def.id !== "p_weizen") {
        box.appendChild(el("div", "stern-markt", null, [
            el("div", "stern-markt-titel", "🌱 Neue Pflanze"),
            el("div", null, def.beschreibung),
            el("div", "stern-markt-hinweis", def.info())
        ]));
        return box;
    }
    box.textContent = def.beschreibung;
    return box;
}

function renderSternDetails(def) {
    sternbildDetails.innerHTML = "";
    const lvl = level(def.id);
    const offen = istKnotenOffen(def);
    const verborgen = knotenSicht(def) === "schatten" || (def.geheim && !offen);
    const istMax = lvl >= def.max;
    const kosten = knotenKosten(def);
    const erledigt = def.erledigt && def.erledigt();

    const karte = el("div", "stern-karte" + (istMax ? " maximal" : ""));
    karte.append(
        el("div", "stern-karte-kopf", null, [
            pixelIcon(verborgen ? "❓" : def.icon, 64),
            el("div", null, null, [
                el("div", "stern-karte-name", verborgen ? "Unbekannter Stern" : def.name),
                el("div", "stern-karte-ast", AST_NAMEN[def.ast] || "")
            ])
        ]),
        verborgen ? el("div", "stern-karte-text", "Noch verborgen") : sternErklaerung(def)
    );
    if (!verborgen) {
        // Was der Stern dir gerade bringt (ohne Pfeile, nur der Stand)
        if (def.wirkung && lvl > 0) {
            karte.appendChild(el("div", "stern-karte-rechnung", null, [
                el("span", "stern-jetzt", "Du hast jetzt: "), el("b", null, def.wirkung(lvl)),
                istMax && def.max > 1 ? el("span", "stern-max", " (max)") : null
            ]));
        }
        if (def.max > 1) karte.appendChild(stufenPunkte(lvl, def.max));
    }
    let knopfText = istMax ? (def.max > 1 ? "Maximal" : "Freigeschaltet") : "✨ " + zahl(kosten);
    if (!offen) knopfText = "🔒 Gesperrt";
    const knopf = el("button", "knopf knopf-gruen stern-karte-kaufen", knopfText);
    knopf.disabled = !(offen && !istMax && darfEinkaufen() && run.skillpunkte >= kosten);
    knopf.addEventListener("click", () => kaufeUpgrade(def, "skillpunkte"));
    karte.appendChild(knopf);
    sternbildDetails.appendChild(karte);
    // Lange Namen ("Edelsteinschleifer") etwas kleiner schreiben, statt sie abzuschneiden oder im Wort zu trennen
    const nameEl = karte.querySelector(".stern-karte-name");
    let groesse = 1.2;
    while (nameEl.scrollWidth > nameEl.clientWidth + 1 && groesse > 0.75) {
        groesse -= 0.05;
        nameEl.style.fontSize = groesse.toFixed(2) + "em";
    }

    if (erledigt) sternbildDetails.appendChild(erstelleHinweis("✔ Schon erledigt durch " + erledigt + "."));
    if (!offen) {
        const vor = SKILL_NACH_ID[def.vor];
        const vorName = knotenSicht(vor) === "schatten" ? "einen unbekannten Stern" : vor.name;
        sternbildDetails.appendChild(erstelleHinweis(def.vorMax ? "🔒 Erst ganz ausbauen: " + vorName : "🔒 Erst kaufen: " + vorName));
    } else if (!darfEinkaufen() && !istMax) {
        sternbildDetails.appendChild(erstelleHinweis("Kaufen geht nur zwischen den Tagen."));
    }
}

// ---------- HAUPTMENUE UND EINSTELLUNGEN ----------

function spielPausiert() {
    return !hauptmenue.classList.contains("versteckt") || !einstellungenFenster.classList.contains("versteckt") ||
        (run && run.phase === "tag" && !segenFenster.classList.contains("versteckt"));
}

function zeigeHauptmenue() {
    einstellungenFenster.classList.add("versteckt");
    hauptmenue.classList.remove("versteckt");
    zeigeMenueSeite("start");
    $("menue-beenden").classList.toggle("versteckt", !window.sproutvaleDesktop);
    speichereRun();
}

function zeigeMenueSeite(seite) {
    $("menue-start").classList.toggle("versteckt", seite !== "start");
    $("menue-modi").classList.toggle("versteckt", seite !== "modi");
    if (seite === "modi") renderModusKarten();
}

function menueSeiteModiOffen() {
    return !hauptmenue.classList.contains("versteckt") && !$("menue-modi").classList.contains("versteckt");
}

// Kurzer Stand eines Modus fuer die Karte im Hauptmenue (laufender Run oder gespeicherter Spielstand)
function modusStand(sandbox) {
    const live = run && run.sandbox === sandbox && run.phase !== "runEnde";
    const daten = live ? null : leseRunSpeicher(sandbox);
    const r = live ? run : daten && daten.run;
    if (!r) return null;
    return {
        r,
        felder: live ? run.felder.length : daten.anzahlFelder || 1,
        pflanzen: (r.pflanzen || []).filter(p => p.freigeschaltet).length,
        segen: Object.values(r.segen || {}).reduce((summe, stufe) => summe + stufe, 0),
        neu: r.tag === 1 && r.phase !== "tag" && !sandbox && (r.gesamt ? r.gesamt.klicks === 0 : true)
    };
}

function modusInfoText(sandbox, stand) {
    if (!stand) return sandbox ? "Noch keine Sandbox gespeichert. Sie beginnt bei Tag 1." : "Noch kein Run gespeichert. Er beginnt bei Tag 1.";
    const r = stand.r;
    const z = JAHRESZEITEN[jahreszeitIndex(r.tag)];
    const zeilen = [
        "📅 Tag " + r.tag + " · " + z.symbol + " " + z.name,
        sandbox ? "🏁 " + (r.meilensteine || 0) + " Meilensteine erreicht" : "🧾 " + r.bezahlteRechnungen + " Rechnungen bezahlt",
        "🪙 " + zahl(r.gold) + " Gold · ✨ " + zahl(r.skillpunkte) + " Sternensamen",
        "🌱 " + stand.pflanzen + (stand.pflanzen === 1 ? " Pflanze" : " Pflanzen") + " · 🟫 " + stand.felder + " Felder",
        "🙏 " + stand.segen + " Segen · 🧰 " + (r.werkzeuge || []).length + " Werkzeuge",
        "💰 Insgesamt " + zahl(r.gesamt ? r.gesamt.gold : 0) + " Gold verdient"
    ];
    if (!sandbox && r.mondphase > 0) zeilen.push(MONDPHASEN[r.mondphase].symbol + " Mondphase " + MONDPHASEN[r.mondphase].name);
    const mondblueten = sandbox
        ? aufrunden(mondbluetenFuerRechnungen(r.meilensteine || 0, 0) * SANDBOX_KONFIG.mondbluetenAnteil)
        : mondbluetenFuerRechnungen(r.bezahlteRechnungen, r.mondphase || 0);
    zeilen.push("🌸 " + (sandbox ? "Neuanfang" : "Run beenden") + " jetzt: +" + zahl(mondblueten) + " Mondblüten");
    return zeilen.join("\n");
}

function renderModusKarten() {
    const guthaben = $("menue-guthaben");
    guthaben.innerHTML = "";
    guthaben.append(
        el("span", null, null, [spriteIcon("pokal"), el("span", null, anzahlErfolge().geschafft + " / " + anzahlErfolge().gesamt + " Erfolge")]),
        el("span", null, "📅 " + zahl(meta.lebenszeit.tage) + " Tage gespielt")
    );

    const reihe = $("modus-reihe");
    reihe.innerHTML = "";
    [
        { sandbox: false, symbol: "🌾", name: "Standard", text: "Alle 5 Tage kommt eine Rechnung. Bezahlst du sie, " +
            "bekommst du einen Segen. Am Ende gibt es Mondblüten für dauerhafte Upgrades." },
        { sandbox: true, symbol: "🏖️", name: "Sandbox", text: "Keine Rechnungen, keine Energie. Tag und Nacht laufen einfach weiter " +
            "und du kannst jederzeit einkaufen. Meilensteine geben Segen." }
    ].forEach(modus => {
        const frei = !modus.sandbox || hatSandbox();
        const stand = frei ? modusStand(modus.sandbox) : null;
        const aktiv = run && run.sandbox === modus.sandbox && run.phase !== "runEnde";
        const karte = el("button", "modus-karte" + (frei ? "" : " gesperrt") + (aktiv ? " zuletzt" : ""));
        karte.dataset.modus = modus.sandbox ? "sandbox" : "standard";
        const info = el("span", "modus-info", "i");
        setzeTipp(info, modusInfoText(modus.sandbox, stand));
        let statusText;
        if (!frei) statusText = "🔒 Im Mondteich für " + zahl(SANDBOX_KONFIG.preis) + " Mondblüten oder mit dem Unterstützer-Paket";
        else if (!stand || stand.neu) statusText = "Neuer Anfang";
        else statusText = "Tag " + stand.r.tag + " · " + (modus.sandbox ? (stand.r.meilensteine || 0) + " Meilensteine"
            : stand.r.bezahlteRechnungen + (stand.r.bezahlteRechnungen === 1 ? " Rechnung" : " Rechnungen"));
        const mondblueten = frei ? profilMondblueten(modus.sandbox) : 0;
        karte.append(...[
            frei ? info : null,
            el("div", "modus-bild", null, [pixelIcon(frei ? modus.symbol : "🔒", 96)]),
            el("div", "modus-name", modus.name),
            el("div", "modus-text", modus.text),
            el("div", "modus-status", statusText),
            frei ? el("div", "modus-mondblueten", null, [spriteIcon("mondbluete"), el("span", null, zahl(mondblueten) + " Mondblüten")]) : null,
            el("div", "modus-los", !frei ? "Gesperrt" : !stand || stand.neu ? "▶ Starten" : "▶ Weiterspielen")
        ].filter(Boolean));
        karte.addEventListener("click", event => {
            if (event.target === info) return;
            spieleModus(modus.sandbox);
        });

        const reset = el("button", "knopf modus-reset", "🗑️ Spielstand löschen");
        reset.disabled = !frei || !stand || stand.neu;
        reset.addEventListener("click", () => frageModusReset(modus.sandbox));
        reihe.appendChild(el("div", "modus-spalte", null, [karte, reset]));
    });
}

function spieleModus(sandbox) {
    if (sandbox && !hatSandbox()) {
        Klang.fehler();
        zeigeToast("🔒 Die Sandbox kaufst du im Mondteich (Reiter Spielmodi) für " + zahl(SANDBOX_KONFIG.preis) + " Mondblüten.");
        return;
    }
    wechsleZuModus(sandbox);
    Klang.start();
    hauptmenue.classList.add("versteckt");
    aktualisiereAlles();
}

function frageModusReset(sandbox) {
    const name = sandbox ? "deine Sandbox" : "deinen Run";
    zeigePopup({
        titel: sandbox ? "🏖️ Sandbox zurücksetzen?" : "🌾 Run zurücksetzen?",
        inhalt: "Willst du " + name + " wirklich löschen und bei Tag 1 neu anfangen? Mondblüten gibt es dafür keine " +
            "(dafür " + (sandbox ? "den Neuanfang in der Sandbox" : "\"Run jetzt beenden\" auf der Tageskarte") + " nutzen). " +
            (sandbox ? "Dabei wird auch der ganze Sandbox-Fortschritt gelöscht (Mondblüten, Upgrades, Tarot und Kuscheltiere der Sandbox). " +
                "Der Standard-Modus, Erfolge und Kosmetik bleiben."
                : "Mondblüten, Upgrades, Kuscheltiere, Erfolge und Kosmetik bleiben."),
        breite: 560,
        knoepfe: [
            { text: "Abbrechen" },
            { text: "Zurücksetzen", klasse: "knopf-rot", aktion: () => {
                setzeModusZurueck(sandbox);
                Klang.reset();
                renderModusKarten();
                zeigeToast(sandbox ? "🏖️ Sandbox zurückgesetzt" : "🌾 Run zurückgesetzt");
            } }
        ]
    });
}

// Wolken und Teilchen im Hauptmenue
(function schmueckeHauptmenue() {
    const wolken = $("menue-wolken");
    for (let i = 0; i < 7; i++) {
        const wolke = document.createElement("img");
        wolke.alt = "";
        wolke.classList.add("menue-wolke");
        setzeSpriteBild(wolke, "wolke", 4 + Math.floor(Math.random() * 3));
        wolke.style.top = 3 + Math.random() * 30 + "%";
        const dauer = 70 + Math.random() * 70;
        wolke.style.animationDuration = dauer + "s";
        wolke.style.animationDelay = -Math.random() * dauer + "s";
        wolken.appendChild(wolke);
    }
    const teilchen = $("menue-teilchen");
    const farben = ["#ffc2da", "#ff94be", "#ffffff", "#fff6a0", "#a3dc6f"];
    setInterval(() => {
        if (hauptmenue.classList.contains("versteckt") || document.hidden || teilchen.children.length > 26) return;
        const blatt = el("div", "menue-blatt");
        blatt.style.left = Math.random() * 100 + "%";
        blatt.style.background = zufall(farben);
        blatt.style.animationDuration = 7 + Math.random() * 6 + "s";
        blatt.style.setProperty("--drift", (Math.random() - 0.3) * 260 + "px");
        teilchen.appendChild(blatt);
        setTimeout(() => blatt.remove(), 13500);
    }, 420);
})();

let aktiverEinstellungsReiter = "audio";

function oeffneEinstellungen(ausMenue) {
    // Im Hauptmenue waeren "Hauptmenue" und "Zurueck" dasselbe, dort gibt es nur "Zurueck".
    // Den kompletten Spielstand loeschen kann man nur aus dem Hauptmenue.
    einstellungenHauptmenue.classList.toggle("versteckt", ausMenue);
    resetZeile.classList.toggle("versteckt", !ausMenue);
    einstellungenSchliessen.textContent = ausMenue ? "Zurück" : "Zurück zum Spiel";
    einstellungenFenster.classList.remove("versteckt");
    renderEinstellungen();
}

function renderEinstellungen() {
    // Ohne laufenden Spielstand (Hauptmenue beim Start) gibt es noch keine Statistik
    const reiter = [
        { id: "erfolge", text: "🏆 Erfolge" },
        { id: "kodex", text: "📖 Kodex" },
        run ? { id: "statistik", text: "📊 Statistik" } : null,
        { id: "audio", text: "🎵 Klang" },
        { id: "anzeige", text: "👁️ Anzeige" },
        { id: "steuerung", text: "⌨️ Tasten" },
        { id: "spielstand", text: "💾 Spielstand" },
        { id: "feedback", text: "💌 Feedback" }
    ].filter(Boolean);
    if (!reiter.some(r => r.id === aktiverEinstellungsReiter)) aktiverEinstellungsReiter = "audio";
    renderReiter($("einstellungen-reiter"), reiter, aktiverEinstellungsReiter, id => {
        aktiverEinstellungsReiter = id;
        Klang.klick(8);
        renderEinstellungen();
    });
    document.querySelectorAll("#einstellungen-reiter .reiter-knopf").forEach((knopf, i) => {
        knopf.dataset.reiter = reiter[i].id;
        // kleine Trennung zwischen "Fortschritt" und "Einstellungen"
        if (reiter[i].id === "audio") knopf.classList.add("reiter-abstand");
    });
    document.querySelectorAll(".einstellungs-seite").forEach(seite => {
        seite.classList.toggle("versteckt", seite.dataset.seite !== aktiverEinstellungsReiter);
    });
    // breite Seiten fuer Erfolge, Kodex und Statistik
    document.querySelector(".einstellungen-rahmen").classList.toggle("breit",
        ["erfolge", "kodex", "statistik"].includes(aktiverEinstellungsReiter));
    zeigeLautstaerken();
    if (run) renderStatistik();
    renderErfolge();
    if (aktiverEinstellungsReiter === "kodex") renderKodex($("kodex-seite"));
    if (aktiverEinstellungsReiter === "erfolge" || aktiverEinstellungsReiter === "kodex") merkeGesehen(aktiverEinstellungsReiter);
    aktualisiereNeuPunkt();
    // Schalter fuer Anzeige-Optionen
    document.querySelectorAll("[data-option]").forEach(schalter => {
        schalter.checked = einstellungen[schalter.dataset.option] !== false && einstellungen[schalter.dataset.option] !== undefined
            ? Boolean(einstellungen[schalter.dataset.option]) : false;
    });
    const liste = $("tasten-liste");
    liste.innerHTML = "";
    Object.values(tastenAktionen).forEach(eintrag => {
        liste.appendChild(el("div", "tasten-zeile", null, [el("kbd", null, eintrag.anzeige || eintrag.taste.toUpperCase()), el("span", null, eintrag.beschreibung)]));
    });
}

document.querySelectorAll("[data-option]").forEach(schalter => {
    schalter.addEventListener("change", () => {
        einstellungen[schalter.dataset.option] = schalter.checked;
        speichereEinstellungen();
        if (schalter.dataset.option === "tipps" && !schalter.checked) versteckeTipp();
        if (schalter.dataset.option === "farbenblind") document.body.classList.toggle("farbenblind", schalter.checked);
    });
});

// Kompletter Neustart: Meta-Fortschritt, Erfolge, Statistik und beide Spielstaende (Run und Sandbox) werden geloescht.
// Unterstuetzer-Inhalte (DLC), die gewaehlte Kosmetik und die Einstellungen (Klang, Anzeige ...) bleiben erhalten.
// Erst ein rotes Warnfenster, dann wird wirklich geloescht
function frageAllesLoeschen() {
    Klang.fehler();
    zeigePopup({
        titel: "⚠️ Wirklich ALLES löschen?",
        farbe: "#b8232a",
        breite: 520,
        inhalt: el("div", "warn-inhalt", null, [
            el("p", null, "Beide Spielstände, Mondblüten, Kuscheltiere, Erfolge und Statistik sind danach weg."),
            el("p", "warn-belohnung", "Das kann nicht rückgängig gemacht werden.")
        ]),
        knoepfe: [
            { text: "Abbrechen", klasse: "knopf-gruen" },
            { text: "🗑️ Ja, alles löschen", klasse: "knopf-rot", aktion: loescheSpielstand }
        ]
    });
}

function loescheSpielstand() {
    speichernGesperrt = true;
    Klang.reset();
    const neuerStand = {
        ...leererMetaStand(),
        dlc: meta.dlc,
        freigeschaltet: { ...meta.freigeschaltet },
        kosmetik: { ...meta.kosmetik },
        kaeufeUmzug: true
    };
    try {
        localStorage.setItem(META_SPEICHER_KEY, JSON.stringify(neuerStand));
        localStorage.removeItem(RUN_SPEICHER_KEY);
        localStorage.removeItem(SANDBOX_SPEICHER_KEY);
        localStorage.removeItem(SANDBOX_META_KEY);
    } catch (fehler) {
        console.warn("Spielstand konnte nicht geloescht werden", fehler);
    }
    setTimeout(() => location.reload(), 500);
}

menueSpielen.addEventListener("click", () => {
    Klang.klick(20);
    zeigeMenueSeite("modi");
});
$("menue-zurueck").addEventListener("click", () => {
    Klang.klick(10);
    zeigeMenueSeite("start");
});
$("menue-einstellungen").addEventListener("click", () => oeffneEinstellungen(true));
$("menue-beenden").addEventListener("click", () => {
    if (!window.sproutvaleDesktop) return;
    zeigePopup({
        titel: "Sproutvale beenden?",
        inhalt: "Dein Fortschritt ist gespeichert. Ein laufender Tag beginnt beim nächsten Start noch einmal von vorn.",
        breite: 520,
        knoepfe: [
            { text: "Weiterspielen" },
            { text: "Beenden", klasse: "knopf-rot", aktion: () => {
                speichereRun();
                speichereMeta();
                window.sproutvaleDesktop.beenden();
            } }
        ]
    });
});

// Vollbild: in der Desktop-App ueber Electron (auch F11), im Browser ueber die Fullscreen-API
function wechsleVollbild() {
    if (window.sproutvaleDesktop) {
        window.sproutvaleDesktop.vollbild();
    } else if (document.fullscreenElement) {
        document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => zeigeToast("Vollbild ist hier nicht möglich."));
    }
}
$("vollbild-knopf").addEventListener("click", wechsleVollbild);
$("einstellungen-button").addEventListener("click", () => oeffneEinstellungen(false));
einstellungenSchliessen.addEventListener("click", () => einstellungenFenster.classList.add("versteckt"));
einstellungenHauptmenue.addEventListener("click", zeigeHauptmenue);
spielstandLoeschen.addEventListener("click", frageAllesLoeschen);

// Desktop-App: Spielstand-Ordner "save" anzeigen und oeffnen
if (window.sproutvaleDesktop && window.sproutvaleDesktop.speicher) {
    $("speicher-zeile").classList.remove("versteckt");
    const hinweis = $("speicher-hinweis");
    hinweis.classList.remove("versteckt");
    hinweis.textContent = "Dein Spielstand liegt in: " + window.sproutvaleDesktop.speicher.pfad() +
        ". Neue Version? Kopiere den Ordner \"save\" einfach neben die neue Sproutvale.exe.";
    $("speicher-oeffnen").addEventListener("click", () => window.sproutvaleDesktop.speicher.oeffnen());
    $("import-zeile").classList.remove("versteckt");
    $("spielstand-importieren").addEventListener("click", frageImport);
}

// Import: Ordner oeffnen, Dateien hineinkopieren, dann neu laden (die Dateien haben beim Start Vorrang)
function frageImport() {
    window.sproutvaleDesktop.speicher.oeffnen();
    zeigePopup({
        titel: "📥 Spielstand importieren",
        breite: 560,
        inhalt: el("div", "warn-inhalt", null, [
            el("p", null, "1. Der Spielstand-Ordner hat sich gerade geöffnet."),
            el("p", null, "2. Kopiere deine gesicherten Dateien hinein (fortschritt.json, run.json, sandbox.json, kaeufe.dat ...) und überschreibe die alten."),
            el("p", null, "3. Klicke danach auf \"Jetzt laden\". Dein aktueller Stand wird dabei nicht mehr gespeichert.")
        ]),
        knoepfe: [
            { text: "Abbrechen", klasse: "knopf" },
            { text: "📂 Ordner öffnen", klasse: "knopf", bleibtOffen: true, aktion: () => window.sproutvaleDesktop.speicher.oeffnen() },
            { text: "✅ Jetzt laden", klasse: "knopf-gruen", aktion: () => {
                speichernGesperrt = true;
                location.reload();
            } }
        ]
    });
}

// Lautstaerke: Regler oder Klick aufs Symbol (stumm / wieder die vorige Lautstaerke)
const musikStumm = $("musik-stumm");
const sfxStumm = $("sfx-stumm");

function zeigeLautstaerken() {
    reglerMusik.value = Math.round(einstellungen.musik * 100);
    reglerSfx.value = Math.round(einstellungen.sfx * 100);
    musikStumm.textContent = einstellungen.musik > 0 ? "🎵" : "🔇";
    sfxStumm.textContent = einstellungen.sfx > 0 ? "🔊" : "🔇";
    musikStumm.classList.toggle("aus", einstellungen.musik <= 0);
    sfxStumm.classList.toggle("aus", einstellungen.sfx <= 0);
}

function setzeLautstaerke(art, wert) {
    einstellungen[art] = wert;
    Klang.setzeLautstaerken();
    speichereEinstellungen();
    zeigeLautstaerken();
}

function wechsleStumm(art) {
    const vorherKey = art + "Vorher";
    if (einstellungen[art] > 0) {
        einstellungen[vorherKey] = einstellungen[art];
        setzeLautstaerke(art, 0);
    } else {
        setzeLautstaerke(art, einstellungen[vorherKey] || (art === "musik" ? 0.4 : 0.6));
        if (art === "sfx") Klang.muenze(2);
    }
}

reglerMusik.addEventListener("input", () => setzeLautstaerke("musik", reglerMusik.value / 100));
reglerSfx.addEventListener("input", () => setzeLautstaerke("sfx", reglerSfx.value / 100));
musikStumm.addEventListener("click", () => wechsleStumm("musik"));
sfxStumm.addEventListener("click", () => wechsleStumm("sfx"));
reglerSfx.addEventListener("change", () => Klang.muenze(2));

// ---------- MUSIK: welches Lied gerade laeuft ----------
// "auto": Morgentau am Morgen, Sproutvale am Tag, Abendrot am Abend und Mondnacht in der Nacht
// (Abend- und Nachtlied nur, wenn im Haus freigeschaltet). Mondteich und Gluecksspiel haben eigene Lieder.

function gewuenschtesLied() {
    if (!prestigeShop.classList.contains("versteckt")) return "mondteich";
    if (!shopPanel.classList.contains("hidden") && aktiverShopReiter === "glueck") return "gluecksspiel";
    // Beim Probehoeren im Haus laeuft das angeprobierte Lied
    const gewaehlt = gewaehlteKosmetik("musik").id;
    if (gewaehlt !== "auto" && LIEDER[gewaehlt]) return gewaehlt;
    const frei = id => istKosmetikFrei(MUSIK_TITEL.find(t => t.id === id), "musik");
    if (tageszeit < 0.18 || tageszeit > 1.2) return frei("morgentau") ? "morgentau" : "sproutvale";
    if (tageszeit < 0.72) return "sproutvale";
    if (tageszeit < 0.9) return frei("abendrot") ? "abendrot" : "sproutvale";
    return frei("mondnacht") ? "mondnacht" : frei("abendrot") ? "abendrot" : "sproutvale";
}

function aktualisiereMusik() {
    Klang.waehleLied(gewuenschtesLied());
    // Bei hoher Kombo wird die Musik etwas schneller
    const multi = run.phase === "tag" ? komboMultiplikator() : 1;
    Klang.setzeTempoFaktor(1 + 0.04 * (multi - 1));
}

// ---------- PANELS OEFFNEN/SCHLIESSEN ----------

function oeffnePanel(panel) {
    schliessePanels();
    panel.classList.remove("hidden");
    aktualisiereAlles();
    haken("panelOffen", panel.id);
}

function oeffneSkilltree() {
    schliessePanels();
    skilltreeFenster.classList.remove("versteckt");
    renderSkilltree();
    haken("panelOffen", "skilltree");
}

function schliessePanels() {
    shopPanel.classList.add("hidden");
    skilltreeFenster.classList.add("versteckt");
}

$("shop-button").addEventListener("click", () => oeffnePanel(shopPanel));
$("skilltree-button").addEventListener("click", oeffneSkilltree);
// Erfolge, Kodex und Statistik: Einstellungen direkt auf dem passenden Reiter oeffnen (E, K, I).
// Ist genau dieser Reiter schon offen, schliesst die Taste das Fenster wieder.
function oeffneEinstellungsReiter(id) {
    if (!einstellungenFenster.classList.contains("versteckt") && aktiverEinstellungsReiter === id) {
        einstellungenFenster.classList.add("versteckt");
        return;
    }
    aktiverEinstellungsReiter = id;
    oeffneEinstellungen(!hauptmenue.classList.contains("versteckt"));
}

function oeffneStatistik() {
    oeffneEinstellungsReiter("statistik");
}

// ---------- ROTES AUSRUFEZEICHEN: neue Erfolge oder neue Kodex-Eintraege ----------
// Gemerkt wird, wie viele man schon gesehen hat (in den Einstellungen, damit es einen Reset uebersteht).

function kodexEntdeckt() {
    return KODEX_REITER.reduce((summe, r) => summe + kodexEintraege(r.id).filter(e => e.anzahl > 0).length, 0);
}

function neuStand() {
    const gesehen = einstellungen.gesehen || (einstellungen.gesehen = {});
    const jetzt = { erfolge: anzahlErfolge().geschafft, ["kodex:" + metaProfil]: kodexEntdeckt() };
    const neu = {};
    Object.entries(jetzt).forEach(([schluessel, wert]) => {
        // Beim ersten Mal (oder nach einem Reset) nichts anzeigen, nur merken
        if (gesehen[schluessel] === undefined || gesehen[schluessel] > wert) gesehen[schluessel] = wert;
        neu[schluessel.split(":")[0]] = wert > gesehen[schluessel];
    });
    return { neu, jetzt };
}

function merkeGesehen(reiter) {
    const { jetzt } = neuStand();
    const schluessel = reiter === "kodex" ? "kodex:" + metaProfil : reiter;
    if (jetzt[schluessel] === undefined || einstellungen.gesehen[schluessel] === jetzt[schluessel]) return;
    einstellungen.gesehen[schluessel] = jetzt[schluessel];
    speichereEinstellungen();
}

function aktualisiereNeuPunkt() {
    const { neu } = neuStand();
    $("einstellungen-button").querySelector(".neu-punkt").classList.toggle("versteckt", !neu.erfolge && !neu.kodex);
    document.querySelectorAll("#einstellungen-reiter .reiter-knopf").forEach(knopf => {
        const id = knopf.dataset.reiter;
        knopf.classList.toggle("hat-punkt", Boolean(neu[id]));
    });
}
setInterval(aktualisiereNeuPunkt, 1000);
document.querySelectorAll(".panel-schliessen").forEach(knopf => knopf.addEventListener("click", schliessePanels));
karteShop.addEventListener("click", () => oeffnePanel(shopPanel));
karteSkilltree.addEventListener("click", oeffneSkilltree);
kartePrestige.addEventListener("click", () => oeffnePrestigeShop());
kartePfeil.addEventListener("click", () => {
    karteEingeklappt = !karteEingeklappt;
    Klang.klick(karteEingeklappt ? 6 : 14);
    renderTagesKarte();
});
karteWeiter.addEventListener("click", () => {
    if (run.phase === "runEnde") oeffnePrestigeShop();
    else starteTag();
});
// Run beenden: rotes Warnfenster, damit man sich nicht verklickt
karteAufgeben.addEventListener("click", () => {
    if (run.phase !== "vorTag" || run.segenAuswahl) return;
    zeigePopup({
        titel: "⚠️ Run wirklich beenden?",
        farbe: "#b8232a",
        breite: 500,
        inhalt: el("div", "warn-inhalt", null, [
            el("p", null, "Dein Run endet sofort. Das kannst du nicht rückgängig machen."),
            el("p", "warn-belohnung", "Du bekommst +" + zahl(mondbluetenJetzt()) + " Mondblüten für " + run.bezahlteRechnungen +
                (run.bezahlteRechnungen === 1 ? " bezahlte Rechnung." : " bezahlte Rechnungen."))
        ]),
        knoepfe: [
            { text: "Weiterspielen", klasse: "knopf-gruen" },
            { text: "🏳️ Run beenden", klasse: "knopf-rot", aktion: () => beendeRun(0, true) }
        ]
    });
});
// Neuer Run (bzw. frisch vorbereiteter Tag 1) uebernimmt alle Upgrades, Tarotkarten und ausgeruesteten Karten
prestigeWeiter.addEventListener("click", () => starteNeuenRun(run.sandbox)); // gleicher Modus wie zuletzt

// Sandbox-Prestige: kleines Fenster, dann beginnt die Sandbox von vorn (ueber den Mondteich)
function frageNeuanfang() {
    if (!run.sandbox || run.phase === "runEnde" || spielPausiert()) return;
    const mondblueten = mondbluetenJetzt();
    zeigePopup({
        titel: "🌙 Neuanfang?",
        inhalt: el("div", "neuanfang-inhalt", null, [
            el("p", null, "Möchtest du einen Neuanfang wagen?"),
            el("div", "neuanfang-belohnung", null, [spriteIcon("mondbluete", true), el("b", null, "+" + zahl(mondblueten) + " Mondblüten")]),
            el("p", "neuanfang-klein", run.meilensteine === 0
                ? "Du hast noch keinen Meilenstein erreicht und bekommst darum noch nichts."
                : "Für " + run.meilensteine + (run.meilensteine === 1 ? " Meilenstein" : " Meilensteine") +
                  ". Deine Sandbox beginnt danach wieder bei Tag 1, vorher kannst du im Mondteich einkaufen.")
        ]),
        breite: 480,
        knoepfe: [
            { text: "Weiterspielen" },
            { text: "Neuanfang wagen", klasse: "knopf-lila", aktion: () => beendeRun(0, true) }
        ]
    });
}
neuanfangKnopf.addEventListener("click", frageNeuanfang);

// pointerdown statt click: reagiert schon beim Runterdruecken, fuehlt sich beim schnellen Klicken direkter an
plantButton.addEventListener("pointerdown", event => {
    if (event.button === 0) klickSamenladen(false, event.clientX, event.clientY);
});

// ---------- RUN-SPIELSTAND ----------
// Der laufende Run wird zwischen den Tagen gespeichert (nach jedem Einkauf, Segen, Gluecksspiel ...).
// Wird das Spiel mitten an einem Tag geschlossen, geht es beim naechsten Start vor diesem Tag weiter.
// Am Ende eines Runs wird der Run-Spielstand geloescht (die Mondblueten stecken dann schon im Meta-Spielstand).

// Normaler Run und Sandbox haben je einen eigenen Spielstand. Die Sandbox wird auch mitten am Tag gespeichert
// (inklusive der Pflanzen auf den Feldern), weil es dort keine Pausen zwischen den Tagen gibt.

const RUN_SPEICHER_KEY = "sproutvale_run";
const SANDBOX_SPEICHER_KEY = "sproutvale_sandbox";
const RUN_SPEICHER_VERSION = 1;
let runSpeicherTimer = null;
let letzteSandboxSicherung = 0;

function runSpeicherKey(sandbox) {
    return sandbox ? SANDBOX_SPEICHER_KEY : RUN_SPEICHER_KEY;
}

// Was auf einem Feld waechst (nur fuer die Sandbox)
function feldStand(feld) {
    if (feld.leer) return null;
    return {
        pflanze: feld.pflanze.id, variante: feld.variante ? feld.variante.id : null, stufe: feld.stufe,
        fortschrittMs: feld.fortschrittMs, fertig: feld.fertig, ernteKlicksRest: feld.ernteKlicksRest
    };
}

function stelleFeldWiederHer(feld, stand) {
    const pflanze = stand && run.pflanzen.find(p => p.id === stand.pflanze && p.freigeschaltet);
    if (!pflanze) return;
    const variante = stand.variante ? VARIANTE_NACH_ID[stand.variante] : null;
    Object.assign(feld, {
        pflanze, variante, stufe: stand.stufe, fortschrittMs: stand.fortschrittMs, fertig: stand.fertig, leer: false,
        reserviert: false, ernteKlicksRest: stand.ernteKlicksRest || 0, kraehe: null
    });
    feld.el.feldDiv.classList.remove("feld-leer", "feld-ziel");
    feld.el.feldDiv.classList.toggle("feld-fertig", feld.fertig);
    setzeVariantenKlasse(feld, variante);
    setzeTipp(feld.el.feldDiv, feldTipp(feld));
    feld.el.nameEl.textContent = feld.fertig && feld.ernteKlicksRest > 0 ? "Noch " + feld.ernteKlicksRest + "x" : pflanze.name;
    feld.el.balkenInnen.style.width = feld.fertig ? "100%" : (feld.stufe / 3) * 100 + "%";
    zeigeFeldSprite(feld);
}

function speichereRun() {
    if (speichernGesperrt || !run || run.phase === "runEnde") return;
    // Normale Runs nur zwischen den Tagen (mitten am Tag geht es beim Laden vor diesem Tag weiter)
    if (!run.sandbox && run.phase !== "vorTag") return;
    const { felder, zielFeld, pflanzen, ...rest } = run;
    const daten = {
        version: RUN_SPEICHER_VERSION,
        anzahlFelder: felder.length,
        felder: run.sandbox ? felder.map(feldStand) : null,
        gespeichertAm: Date.now(),
        run: { ...rest, pflanzen: pflanzen.map(p => ({ id: p.id, freigeschaltet: p.freigeschaltet, level: p.level })) }
    };
    try {
        localStorage.setItem(runSpeicherKey(run.sandbox), JSON.stringify(daten));
        if (run.sandbox) letzteSandboxSicherung = performance.now();
    } catch (fehler) {
        console.warn("Run konnte nicht gespeichert werden", fehler);
    }
}

function loescheRunSpeicher(sandbox = run && run.sandbox) {
    try {
        localStorage.removeItem(runSpeicherKey(Boolean(sandbox)));
    } catch (fehler) {
        console.warn("Run-Spielstand konnte nicht geloescht werden", fehler);
    }
}

function leseRunSpeicher(sandbox) {
    try {
        const daten = JSON.parse(localStorage.getItem(runSpeicherKey(sandbox)));
        if (daten && daten.version === RUN_SPEICHER_VERSION && daten.run) return daten;
    } catch (fehler) {
        console.warn("Run-Spielstand ist kaputt und wird ignoriert", fehler);
    }
    return null;
}

// Gibt true zurueck, wenn ein gespeicherter Run (bzw. die gespeicherte Sandbox) geladen wurde
function ladeRun(sandbox = false) {
    const daten = leseRunSpeicher(sandbox);
    if (!daten) return false;

    const { pflanzen, ...rest } = daten.run;
    wechsleMetaProfil(sandbox);
    const neu = erstelleRunZustand(sandbox);
    Object.assign(neu, rest, { sandbox });
    neu.level = { ...erstelleRunZustand(sandbox).level, ...rest.level };
    (pflanzen || []).forEach(gespeichert => {
        const pflanze = neu.pflanzen.find(p => p.id === gespeichert.id);
        if (!pflanze) return;
        pflanze.freigeschaltet = gespeichert.freigeschaltet;
        pflanze.level = { ...pflanze.level, ...gespeichert.level };
    });
    Object.assign(neu, { phase: "vorTag", felder: [], zielFeld: null, samenUnterwegs: false, klickZaehler: 0, wetter: null });
    delete neu.lebenszeitSicherung; // aus alten Spielstaenden
    // Werkzeuge, die es nicht mehr gibt (z.B. Gartenhandschuhe), fallen aus alten Spielstaenden heraus
    neu.werkzeuge = (neu.werkzeuge || []).filter(id => WERKZEUG_NACH_ID[id]);
    if (neu.haendler && neu.haendler.angebote) {
        neu.haendler.angebote = neu.haendler.angebote.filter(a => a.art !== "werkzeug" || WERKZEUG_NACH_ID[a.id]);
    }

    raeumeLootAuf();
    run = neu;
    naechsteRunId = run.id + 1;
    meta.letzterModus = sandbox ? "sandbox" : "standard";

    erstelleSlots();
    for (let i = 0; i < Math.max(1, daten.anzahlFelder || 1); i++) erstelleFeld();
    prestigeShop.classList.add("versteckt");
    segenFenster.classList.add("versteckt");
    if (sandbox) {
        // Die Sandbox laeuft sofort weiter, an derselben Tageszeit und mit denselben Pflanzen
        const tagMs = run.tagMs || 0;
        starteTag(true);
        run.tagMs = tagMs;
        (daten.felder || []).forEach((stand, index) => {
            if (stand && run.felder[index]) stelleFeldWiederHer(run.felder[index], stand);
        });
    } else {
        zeigeTagesKarte(run.karte.modus, run.karte.daten);
    }
    if (run.segenAuswahl) zeigeSegenAuswahl(run.segenAuswahl);
    haken("runGeladen");
    aktualisiereAlles();
    return true;
}

function raeumeLootAuf() {
    lootKugeln.forEach(loot => {
        loot.weg = true;
        loot.el.remove();
    });
    lootKugeln.length = 0;
    fxLayer.querySelectorAll(".sternschnuppe, .gluehwuermchen, .kraehe").forEach(e => e.remove());
}

// Speichert den laufenden Modus und raeumt ihn weg (vor dem Wechsel zwischen Run und Sandbox)
function legeRunBeiseite() {
    if (!run) return;
    speichereRun();
    if (run.phase === "tag") haken("tagEnde");
    raeumeLootAuf();
    schliessePanels();
    prestigeShop.classList.add("versteckt");
    segenFenster.classList.add("versteckt");
    speichereMeta();
}

// Wechselt zwischen normalem Run und Sandbox. Jeder Modus macht dort weiter, wo man aufgehoert hat.
function wechsleZuModus(sandbox) {
    if (run && run.sandbox === sandbox) return;
    legeRunBeiseite();
    if (!ladeRun(sandbox)) starteNeuenRun(sandbox);
    speichereMeta();
}

// Spielstand eines Modus loeschen (Hauptmenue > Spielen). Meta-Fortschritt bleibt.
// Standard: nur der laufende Run. Sandbox: Run und der ganze Sandbox-Fortschritt (eigene Mondblueten, Kuscheltiere ...).
function setzeModusZurueck(sandbox) {
    const aktiv = run && run.sandbox === sandbox;
    if (aktiv) {
        speichernGesperrt = true;
        legeRunBeiseite();
        speichernGesperrt = false;
    }
    loescheRunSpeicher(sandbox);
    if (sandbox) {
        if (metaProfil === "sandbox") {
            Object.keys(fortschrittVon(meta)).forEach(schluessel => delete meta[schluessel]);
            Object.assign(meta, fortschrittVon(leererMetaStand()));
        }
        try {
            localStorage.removeItem(SANDBOX_META_KEY);
        } catch (fehler) {
            console.warn("Sandbox-Fortschritt konnte nicht geloescht werden", fehler);
        }
    }
    if (aktiv) starteNeuenRun(sandbox);
    speichereMeta();
}

// Nach jeder Aenderung zwischen den Tagen kurz warten und dann speichern. Die Sandbox hoechstens alle 5 Sekunden.
registriereHaken("anzeige", () => {
    if (!run || run.phase === "runEnde") return;
    if (!run.sandbox && run.phase !== "vorTag") return;
    if (run.sandbox && performance.now() - letzteSandboxSicherung < 5000) return;
    clearTimeout(runSpeicherTimer);
    runSpeicherTimer = setTimeout(speichereRun, 300);
});
registriereHaken("runEnde", () => loescheRunSpeicher(run.sandbox));
// Die Sandbox zusaetzlich alle 20 Sekunden sichern (falls das Spiel abstuerzt)
setInterval(() => {
    if (run && run.sandbox && run.phase === "tag" && !spielPausiert()) speichereRun();
}, 20000);
window.addEventListener("beforeunload", () => {
    speichereRun();
    speichereMeta();
});

// ---------- HAUPTSCHLEIFE ----------
// requestAnimationFrame pausiert automatisch, wenn der Tab nicht sichtbar ist (kein Offline-Fortschritt).
// Im Hauptmenue und in den Einstellungen ist das Spiel ebenfalls pausiert.

let letzteZeit = performance.now();

function hauptSchleife(jetzt) {
    const dtMs = Math.min(250, jetzt - letzteZeit);
    letzteZeit = jetzt;

    if (!spielPausiert()) {
        if (run.phase === "tag") {
            aktualisiereWachstum(dtMs);
            aktualisiereHelfer(dtMs);
            aktualisiereTimer(dtMs);
            aktualisiereEnergie(dtMs);
        }
        aktualisiereMarktstand();
        aktualisiereKombo(jetzt);
        aktualisiereHaustier(dtMs, jetzt);
        aktualisiereHimmel(dtMs);

        erfolgPruefMs += dtMs;
        if (erfolgPruefMs >= 250) {
            erfolgPruefMs = 0;
            pruefeErfolge();
        }

        panelRenderMs += dtMs;
        if (panelRenderMs >= 500) {
            panelRenderMs = 0;
            renderErfolge();
            renderStatistik();
        }
    } else {
        kombo.letzterKlick += dtMs; // Kombo bricht in der Pause nicht ab
    }

    musikPruefMs += dtMs;
    if (musikPruefMs >= 500) {
        musikPruefMs = 0;
        aktualisiereMusik();
    }

    requestAnimationFrame(hauptSchleife);
}

// ---------- FEEDBACK (Einstellungen, auch im Spiel) ----------
// Ohne eigenen Server kann das Spiel keine E-Mail selbst verschicken. "Senden" oeffnet darum das E-Mail-Programm
// mit fertigem Betreff "#12345 - Feedback - Sproutvale". Die Ticketnummer ist zufaellig (5 Ziffern).
const FEEDBACK_MAIL = "venra.business@gmx.de";
const FEEDBACK_ARTEN = [
    { id: "fehler", text: "🐞 Fehler" },
    { id: "idee", text: "💡 Idee" },
    { id: "lob", text: "💖 Lob" },
    { id: "sonstiges", text: "💬 Sonstiges" }
];
let feedbackArt = "fehler";

function renderFeedbackArten() {
    renderReiter($("feedback-arten"), FEEDBACK_ARTEN, feedbackArt, id => {
        feedbackArt = id;
        renderFeedbackArten();
    });
}
renderFeedbackArten();

function feedbackNachricht() {
    const ticket = String(Math.floor(10000 + Math.random() * 90000));
    const art = FEEDBACK_ARTEN.find(a => a.id === feedbackArt).text.replace(/^\S+ /, "");
    const kontakt = $("feedback-mail").value.trim();
    const betreff = "#" + ticket + " - Feedback - Sproutvale";
    const text = "Art: " + art + "\n" +
        "Version: " + SPIEL_VERSION + (window.sproutvaleDesktop ? " (Desktop)" : " (Browser)") + "\n" +
        (run ? "Modus: " + (run.sandbox ? "Sandbox" : "Standard") + ", Tag " + run.tag + ", Rechnungen " + run.bezahlteRechnungen + "\n" : "") +
        (kontakt ? "Kontakt: " + kontakt + "\n" : "") + "\n" + $("feedback-text").value.trim();
    return { ticket, betreff, text };
}

$("feedback-senden").addEventListener("click", () => {
    if ($("feedback-text").value.trim().length < 3) {
        Klang.fehler();
        zeigeToast("Schreib bitte erst ein paar Worte.");
        return;
    }
    const n = feedbackNachricht();
    window.open("mailto:" + FEEDBACK_MAIL + "?subject=" + encodeURIComponent(n.betreff) + "&body=" + encodeURIComponent(n.text));
    $("feedback-info").textContent = "Ticket #" + n.ticket + ": Dein E-Mail-Programm sollte sich jetzt öffnen. Klappt das nicht, " +
        "nutze „Text kopieren“ und schick den Text an " + FEEDBACK_MAIL + ".";
    Klang.banner();
});

$("feedback-kopieren").addEventListener("click", () => {
    const n = feedbackNachricht();
    const alles = "An: " + FEEDBACK_MAIL + "\nBetreff: " + n.betreff + "\n\n" + n.text;
    navigator.clipboard.writeText(alles).then(
        () => { $("feedback-info").textContent = "Kopiert! Füge den Text in eine E-Mail an " + FEEDBACK_MAIL + " ein (Ticket #" + n.ticket + ")."; },
        () => { $("feedback-info").textContent = "Kopieren ging nicht. Bitte schick deinen Text an " + FEEDBACK_MAIL + "."; }
    );
});
