"use strict";

// ============================================================
// SPROUTVALE: Tastenkuerzel, Test-Befehle und Spielstart (wird als letzte Datei geladen)
// Gehoert zu script.js (gemeinsame Funktionen und Zustand stehen dort).
// ============================================================

// ---------- TASTENKUERZEL ----------
// Gibt eine Aktion false zurueck, bekommt der Browser die Taste normal (z.B. Leertaste in Knoepfen).

function imSpiel() {
    return hauptmenue.classList.contains("versteckt") && einstellungenFenster.classList.contains("versteckt") &&
        !popupOffen();
}

function wechslePanel(panel) {
    if (!imSpiel()) return false;
    if (panel.classList.contains("hidden")) oeffnePanel(panel);
    else schliessePanels();
}

registriereTaste("s", t("Markt öffnen/schließen"), () => wechslePanel(shopPanel));
registriereTaste("b", t("Stellarium öffnen/schließen"), () => {
    if (!imSpiel()) return false;
    if (skilltreeFenster.classList.contains("versteckt")) oeffneSkilltree();
    else schliessePanels();
});
registriereTaste("e", t("Erfolge"), () => {
    if (!imSpiel() && einstellungenFenster.classList.contains("versteckt")) return false;
    oeffneEinstellungsReiter("erfolge");
});
registriereTaste("i", t("Statistik"), () => {
    if (!imSpiel() && einstellungenFenster.classList.contains("versteckt")) return false;
    if (!run) return false;
    oeffneStatistik();
});
registriereTaste("k", t("Kodex"), () => {
    if (!imSpiel() && einstellungenFenster.classList.contains("versteckt")) return false;
    oeffneKodex();
});
registriereTaste("h", t("Haus (Kosmetik)"), () => {
    if (!imSpiel()) return false;
    oeffneHaus();
});
registriereTaste("m", t("Mondteich (vor Tag 1 und nach einem Run)"), () => {
    if (!imSpiel()) return false;
    versucheMondteich();
});
registriereTaste("space", t("Tag starten"), () => {
    if (!imSpiel() || run.phase !== "vorTag" || kartenHalter.classList.contains("versteckt")) return false;
    if (!prestigeShop.classList.contains("versteckt")) return false;
    starteTag();
}, t("Leertaste"));
registriereTaste("f11", t("Vollbild an/aus"), () => {
    if (window.sproutvaleDesktop) return false; // die Desktop-App kuemmert sich selbst um F11
    wechsleVollbild();
}, "F11");
registriereTaste("escape", t("Fenster schließen / Einstellungen"), () => {
    if (!einstellungenFenster.classList.contains("versteckt")) {
        einstellungenFenster.classList.add("versteckt");
        return;
    }
    if (menueSeiteModiOffen()) {
        zeigeMenueSeite("start");
        return;
    }
    if (!hauptmenue.classList.contains("versteckt")) return false;
    const offenesPanel = !shopPanel.classList.contains("hidden") ||
        !skilltreeFenster.classList.contains("versteckt");
    if (offenesPanel) schliessePanels();
    else oeffneEinstellungen(false);
}, "Esc");

// ---------- TEST-BEFEHLE (Browser-Konsole, F12) ----------

window.debug = {
    gold(menge) { run.gold += menge; aktualisiereAlles(); },
    sternensamen(menge) { run.skillpunkte += menge; aktualisiereAlles(); },
    mondblueten(menge) { meta.mondblueten += menge; meta.mondbluetenSeitSternenfall += menge; speichereMeta(); if (!prestigeShop.classList.contains("versteckt")) renderPrestigeShop(); },
    gutscheine(menge) { meta.gutscheine += menge; speichereMeta(); if (!prestigeShop.classList.contains("versteckt")) renderPrestigeShop(); },
    splitter(menge) { meta.sternensplitter += menge; speichereMeta(); },
    energie(wert) { run.energie = wert; },
    tag(nummer) { run.tag = nummer; aktualisiereAlles(); },
    stern() { spawnSternschnuppe(); },
    gluehwuermchen() { spawnGluehwuermchen(); },
    segen() { zeigeSegenAuswahl(); },
    // Tageszeit erzwingen (0 = Morgen, 1 = Nacht), debug.tageszeit(null) zum Ausschalten
    tageszeit(wert) { debugTageszeit = wert; },
    // Haustier-Zustand testen: debug.pose("schlafen")
    pose(zustand) { wechsleHaustierZustand(zustand, 8000); },
    // z.B. debug.variante("kristall"), alle neuen Pflanzen werden diese Variante. debug.variante(null) zum Ausschalten
    variante(id) { debugVariante = id; },
    // Unterstuetzer-Paket (7,99 €, alle epischen Inhalte + Sandbox) an/aus: debug.dlc(true)
    dlc(an = true) { meta.dlc = an; speichereMeta(); wendeKosmetikAn(); },
    // Alle legendaeren Einzel-Inhalte freischalten: debug.einzelDlc()
    einzelDlc() {
        Object.entries(KOSMETIK_LISTEN).forEach(([kategorie, liste]) => liste.filter(e => e.paket === "einzeln")
            .forEach(e => { meta.freigeschaltet[kategorie + ":" + e.id] = true; }));
        speichereMeta();
        wendeKosmetikAn();
    },
    // ALLES freischalten: Unterstuetzer-Paket, alle legendaeren und alle erspielbaren Skins, Sandbox
    alles() {
        meta.dlc = true;
        meta.sandbox = true;
        Object.entries(KOSMETIK_LISTEN).forEach(([kategorie, liste]) => liste.forEach(e => {
            if (e.quelle !== "frei") meta.freigeschaltet[kategorie + ":" + e.id] = true;
        }));
        speichereMeta();
        wendeKosmetikAn();
        zeigeToast("🎁 Alle Skins, DLCs und Endlos sind freigeschaltet.");
    },
    // Alle Skins wieder sperren (zum Testen des Anprobierens)
    allesWeg() {
        meta.dlc = false;
        Object.keys(meta.freigeschaltet).forEach(schluessel => { delete meta.freigeschaltet[schluessel]; });
        meta.kosmetik = leereKosmetik();
        speichereMeta();
        wendeKosmetikAn();
    },
    // Einen Skin freischalten und direkt auswaehlen: debug.kosmetik("samenladen", "feuerwerk")
    kosmetik(kategorie, id) {
        meta.freigeschaltet[kategorie + ":" + id] = true;
        if (kategorie === "deko") {
            if (!meta.kosmetik.deko.includes(id)) meta.kosmetik.deko.push(id);
            meta.kosmetik.deko = meta.kosmetik.deko.slice(-DEKO_MAX);
        } else {
            meta.kosmetik[kategorie] = id;
        }
        speichereMeta();
        wendeKosmetikAn();
    },
    // Kurzformen fuer Haustier und Deko: debug.skin("manta"), debug.deko("lagerfeuer")
    skin(id) { debug.kosmetik("haustier", id); },
    deko(id) { debug.kosmetik("deko", id); },
    // Alle Namen einer Kategorie anzeigen: debug.liste("haustier")
    liste(kategorie) {
        console.table((KOSMETIK_LISTEN[kategorie] || []).map(e => ({ id: e.id, name: e.name, seltenheit: KUSCHEL_RARITAETEN[kosmetikSeltenheit(e)].name })));
    },
    // Mondphasen bis n freischalten: debug.mondphase(5)
    mondphase(n) { meta.mondphaseFrei = Math.min(n, MONDPHASEN.length - 1); speichereMeta(); },
    // Meisterschaft testen: debug.meister("weizen", 1000) setzt die Ernten dieser Pflanze
    meister(pflanze, ernten) { meta.kodex.pflanzen[pflanze] = ernten; speichereMeta(); aktualisiereAlles(); },
    // Jahreszeit testen: debug.jahreszeit(2) springt in den Herbst (0 Fruehling, 1 Sommer, 2 Herbst, 3 Winter)
    jahreszeit(index) { run.tag = index * JAHRESZEITEN_KONFIG.tageProJahreszeit + 1; aktualisiereAlles(); },
    // Waehrung auf einen Wert setzen (statt dazugeben): debug.setze("gold", 500)
    setze(art, wert) {
        const jetzt = { gold: () => run.gold, sternensamen: () => run.skillpunkte, mondblueten: () => meta.mondblueten,
            splitter: () => meta.sternensplitter, gutscheine: () => meta.gutscheine }[art];
        if (!jetzt) return;
        debug[art](wert - jetzt());
    },
    // Fenster mit allen Befehlen, Werte direkt eintragen: debug.help()
    help() { zeigeDebugFenster(); },
    // Ein Bot tritt deiner Lobby bei und spielt mit: debug.bot("ABC123") (Code aus dem Duo-Fenster)
    bot(code) {
        debug.botWeg();
        const sauber = String(code || koop.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (sauber.length !== KOOP_KONFIG.codeLaenge) {
            console.warn("debug.bot: Lobby-Code fehlt (6 Zeichen). Erst im Duo-Fenster eine Lobby erstellen.");
            return;
        }
        const rahmen = el("iframe", "debug-bot-rahmen");
        rahmen.src = location.pathname + "?bot=" + sauber;
        document.body.appendChild(rahmen);
        const schild = el("div", "debug-bot-schild", null, [el("span", "debug-bot-status", "🤖 Bot startet …")]);
        const weg = el("button", "knopf", "✕");
        weg.addEventListener("click", () => debug.botWeg());
        schild.appendChild(weg);
        document.body.appendChild(schild);
        zeigeToast("🤖 Der Bot tritt deiner Lobby bei …");
    },
    botWeg() {
        document.querySelectorAll(".debug-bot-rahmen, .debug-bot-schild").forEach(e => e.remove());
    },
    // Waehrend eines Tages: debug.wetter("gewitter"), debug.kraehe(), debug.goldregen()
    wetter(id) { run.wetter = id; if (id) meta.kodex.wetter[id] = (meta.kodex.wetter[id] || 0) + 1; zeigeWetter(); },
    kraehe() { kraeheKommt(); },
    goldregen() { tagesPlan.goldregen = tagesPlan.ms; },
    haendler() { haendlerKommt(); aktualisiereAlles(); },
    // debug.werkzeug("sanduhr", 5) gibt ein Werkzeug auf Stufe 5
    werkzeug(id, stufe) { gibWerkzeug(id, 10, stufe); aktualisiereAlles(); },
    boss(id) { run.bossRegel = id; aktualisiereAlles(); },
    kuschel(id, anzahl = 1) { meta.kuscheltiere[id] = (meta.kuscheltiere[id] || 0) + anzahl; speichereMeta(); },
    sandbox() { meta.sandbox = true; speichereMeta(); },
    resetMeta() { Object.assign(meta, leererMetaStand()); speichereMeta(); loescheRunSpeicher(); }
};

// Fenster zu debug.help() (auch mit F12): jeder Befehl mit Eingaben und einem Knopf zum Ausfuehren.
// Feldtypen: zahl (min/max, die Grenzen stehen grau im Feld), wahl (oeffnet ein "Inventar" mit allen Moeglichkeiten
// als Kacheln; optionen kann von den anderen Feldern abhaengen), haken, text
const WERKZEUG_DEBUG_MAX = 20; // Werkzeuge haben kein festes Maximum (Stufe = 1 + bezahlte Rechnungen), 20 reicht fuer jeden Run
const DEBUG_AUS = { wert: null, name: "Aus", symbol: "🚫" };
const DEBUG_POSEN = ["stehen", "laufen", "sitzen", "liegen", "schlafen"];

function debugKosmetikOptionen(kategorie) {
    return (KOSMETIK_LISTEN[kategorie] || []).map(e => ({ wert: e.id, name: e.name, symbol: e.symbol || e.emoji || e.badge }));
}

const DEBUG_BEFEHLE = [
    { gruppe: "Währungen (+ = dazu, = = auf den Wert setzen)" },
    { name: "gold", text: "Gold", setzen: true, felder: [{ typ: "zahl", wert: 1000000, min: 0 }] },
    { name: "sternensamen", text: "Sternensamen", setzen: true, felder: [{ typ: "zahl", wert: 100, min: 0 }] },
    { name: "mondblueten", text: "Mondblüten", setzen: true, felder: [{ typ: "zahl", wert: 100, min: 0 }] },
    { name: "splitter", text: "Sternensplitter", setzen: true, felder: [{ typ: "zahl", wert: 10, min: 0 }] },
    { name: "gutscheine", text: "Gutscheine", setzen: true, felder: [{ typ: "zahl", wert: 5, min: 0 }] },
    { gruppe: "Run" },
    { name: "energie", text: "Energie setzen", felder: [{ typ: "zahl", wert: 100, min: 0 }] },
    { name: "tag", text: "Tag setzen", felder: [{ typ: "zahl", wert: 10, min: 1 }] },
    { name: "jahreszeit", text: "Jahreszeit", felder: [{ typ: "wahl", optionen: () => JAHRESZEITEN.map((z, i) => ({ wert: i, name: z.name, symbol: z.symbol })) }] },
    { name: "tageszeit", text: "Tageszeit (0 Morgen, 1 Nacht, leer = aus)", felder: [{ typ: "zahl", wert: "", leerNull: true, min: 0, max: 1, schritt: 0.1 }] },
    { name: "segen", text: "Segen-Auswahl zeigen" },
    { name: "werkzeug", text: "Werkzeug geben (Stufe)", felder: [
        { typ: "wahl", optionen: () => WERKZEUGE.map(w => ({ wert: w.id, name: w.name, symbol: w.symbol })) },
        { typ: "zahl", wert: 1, min: 1, max: WERKZEUG_DEBUG_MAX }] },
    { name: "boss", text: "Boss-Regel", felder: [{ typ: "wahl", optionen: () => [DEBUG_AUS, ...BOSS_REGELN.map(r => ({ wert: r.id, name: r.name, symbol: r.symbol }))] }] },
    { name: "variante", text: "Pflanzen-Variante", felder: [{ typ: "wahl", optionen: () => [DEBUG_AUS, ...VARIANTEN.map(v => ({ wert: v.id, name: v.titel, symbol: v.badge }))] }] },
    { name: "meister", text: "Meisterschaft (Pflanze, Ernten)", felder: [
        { typ: "wahl", optionen: () => PFLANZEN_VORLAGEN.map(p => ({ wert: p.id, name: p.name, symbol: p.emoji })) },
        { typ: "zahl", wert: 1000, min: 0 }] },
    { gruppe: "Ereignisse" },
    { name: "wetter", text: "Wetter", felder: [{ typ: "wahl", optionen: () => [DEBUG_AUS, ...WETTER.map(w => ({ wert: w.id, name: w.name, symbol: w.symbol }))] }] },
    { name: "stern", text: "Sternschnuppe" },
    { name: "gluehwuermchen", text: "Glühwürmchen" },
    { name: "kraehe", text: "Krähe" },
    { name: "goldregen", text: "Goldregen" },
    { name: "haendler", text: "Wanderhändler" },
    { name: "pose", text: "Begleiter-Pose", felder: [{ typ: "wahl", optionen: () => DEBUG_POSEN.map(p => ({ wert: p, name: p })) }] },
    { gruppe: "Freischalten" },
    { name: "mondphase", text: "Mondphasen frei bis", felder: [{ typ: "wahl", optionen: () => MONDPHASEN.map((m, i) => ({ wert: i, name: m.name, symbol: m.symbol })) }] },
    { name: "kuschel", text: "Kuscheltier (Anzahl, 16 = Stufe 5)", felder: [
        { typ: "wahl", optionen: () => KUSCHELTIERE.map(k => ({ wert: k.id, name: k.name, symbol: k.symbol })) },
        { typ: "zahl", wert: 1, min: 1, max: Math.pow(2, KUSCHEL_KONFIG.maxStufe - 1) }] },
    { name: "dlc", text: "Unterstützer-Paket", felder: [{ typ: "haken", wert: true }] },
    { name: "einzelDlc", text: "Alle legendären Einzel-Inhalte" },
    { name: "sandbox", text: "Endlos freischalten" },
    { name: "alles", text: "ALLES freischalten" },
    { name: "allesWeg", text: "Alle Skins sperren" },
    { name: "kosmetik", text: "Skin (Kategorie, Skin)", felder: [
        { typ: "wahl", optionen: () => Object.keys(KOSMETIK_LISTEN).map(k => ({ wert: k, name: k })) },
        { typ: "wahl", optionen: werte => debugKosmetikOptionen(werte[0]) }] },
    { name: "liste", text: "Skins einer Kategorie (Konsole)", felder: [{ typ: "wahl", optionen: () => Object.keys(KOSMETIK_LISTEN).map(k => ({ wert: k, name: k })) }] },
    { gruppe: "Duo" },
    { name: "bot", text: "Bot tritt Lobby bei (leer = deine Lobby)", felder: [{ typ: "text", wert: "", platzhalter: "ABC123" }] },
    { name: "botWeg", text: "Bot entfernen" },
    { gruppe: "Gefahr" },
    { name: "resetMeta", text: "Gesamten Fortschritt löschen", gefahr: true }
];

// "Inventar": alle Moeglichkeiten als Kacheln, Klick waehlt aus
function zeigeDebugInventar(titel, optionen, gewaehlt, fertig) {
    const raster = el("div", "debug-inventar");
    const kacheln = optionen.map(o => {
        const kachel = el("button", "debug-kachel" + (o.wert === gewaehlt ? " aktiv" : ""), null, [
            o.symbol ? pixelIcon(o.symbol, 32) : el("span", "debug-kachel-leer", "•"),
            el("span", null, o.name)
        ]);
        raster.appendChild(kachel);
        return [kachel, o];
    });
    const schliesse = zeigePopup({ titel: "🎒 " + titel, farbe: "#44506b", breite: 720, klasse: "debug-fenster", inhalt: raster });
    kacheln.forEach(([kachel, o]) => kachel.addEventListener("click", () => {
        fertig(o);
        schliesse();
    }));
}

let debugFensterSchliessen = null;

function zeigeDebugFenster() {
    if (debugFensterSchliessen) {
        debugFensterSchliessen();
        return;
    }
    const liste = el("div", "debug-liste");
    DEBUG_BEFEHLE.forEach(b => {
        if (b.gruppe) {
            liste.appendChild(el("div", "debug-gruppe", b.gruppe));
            return;
        }
        const zeile = el("div", "debug-zeile");
        zeile.appendChild(el("span", "debug-name", b.text));
        const werte = [];
        const zuruecksetzen = [];
        const eingaben = (b.felder || []).map((f, index) => {
            if (f.typ === "wahl") {
                const erste = () => f.optionen(werte)[0] || DEBUG_AUS;
                let gewaehlt = erste();
                werte[index] = gewaehlt.wert;
                const knopf = el("button", "knopf debug-wahl");
                const zeige = () => {
                    knopf.innerHTML = "";
                    if (gewaehlt.symbol) knopf.appendChild(pixelIcon(gewaehlt.symbol, 20));
                    knopf.appendChild(el("span", null, gewaehlt.name + " ▾"));
                };
                zeige();
                // Haengt ein spaeteres Feld von diesem ab (Skin nach Kategorie), faengt es wieder vorne an
                zuruecksetzen[index] = () => {
                    gewaehlt = erste();
                    werte[index] = gewaehlt.wert;
                    zeige();
                };
                knopf.addEventListener("click", () => zeigeDebugInventar(b.text, f.optionen(werte), gewaehlt.wert, o => {
                    gewaehlt = o;
                    werte[index] = o.wert;
                    zeige();
                    zuruecksetzen.forEach((neu, i) => { if (i > index && neu) neu(); });
                }));
                zeile.appendChild(knopf);
                return () => werte[index];
            }
            const feld = el("input", "debug-feld" + (f.typ === "haken" ? " debug-haken" : ""));
            feld.type = f.typ === "zahl" ? "number" : f.typ === "haken" ? "checkbox" : "text";
            if (f.typ === "haken") feld.checked = f.wert;
            else feld.value = f.wert;
            if (f.schritt) feld.step = f.schritt;
            if (f.min !== undefined) feld.min = f.min;
            if (f.max !== undefined) feld.max = f.max;
            if (f.typ === "zahl" && f.max !== undefined) feld.placeholder = f.min + "-" + f.max;
            if (f.platzhalter) feld.placeholder = f.platzhalter;
            // Tasten im Feld nicht als Spiel-Tastenkuerzel werten
            feld.addEventListener("keydown", event => { if (event.key !== "F12") event.stopPropagation(); });
            zeile.appendChild(feld);
            return () => {
                if (f.typ === "haken") return feld.checked;
                if (f.leerNull && feld.value === "") return null;
                if (f.typ !== "zahl") return feld.value;
                // Zahlen bleiben in den Grenzen, die es im Spiel gibt
                let zahlWert = Number(feld.value) || 0;
                if (f.min !== undefined) zahlWert = Math.max(f.min, zahlWert);
                if (f.max !== undefined) zahlWert = Math.min(f.max, zahlWert);
                feld.value = zahlWert;
                return zahlWert;
            };
        });
        const ausfuehren = (aktion, name) => {
            if (b.gefahr && !confirm(b.text + "?")) return;
            try {
                aktion(...eingaben.map(lies => lies()));
                zeigeToast("🛠️ debug." + name + " ✔");
            } catch (fehler) {
                console.error(fehler);
                zeigeToast("🛠️ debug." + name + ": " + fehler.message);
            }
        };
        const los = el("button", "knopf " + (b.gefahr ? "knopf-rot" : "knopf-gruen"), b.setzen ? "+" : "▶");
        setzeTipp(los, b.setzen ? "Dazugeben" : "Ausführen");
        los.addEventListener("click", () => ausfuehren(debug[b.name], b.name));
        zeile.appendChild(los);
        if (b.setzen) {
            const setzen = el("button", "knopf", "=");
            setzeTipp(setzen, "Auf diesen Wert setzen");
            setzen.addEventListener("click", () => ausfuehren(wert => debug.setze(b.name, wert), "setze"));
            zeile.appendChild(setzen);
        }
        liste.appendChild(zeile);
    });
    debugFensterSchliessen = zeigePopup({ titel: "🛠️ Debug (F12)", farbe: "#44506b", breite: 680, klasse: "debug-fenster", inhalt: liste,
        onSchliessen: () => { debugFensterSchliessen = null; } });
}

// F12 oeffnet und schliesst das Debug-Fenster (statt der Konsole)
window.addEventListener("keydown", event => {
    if (event.key !== "F12") return;
    event.preventDefault();
    event.stopPropagation();
    zeigeDebugFenster();
}, true);

// Stand des Test-Bots (bot.js) im Schild unten links anzeigen
window.addEventListener("message", event => {
    if (!event.data || typeof event.data.sproutvaleBot !== "string") return;
    const status = document.querySelector(".debug-bot-status");
    if (status) status.textContent = event.data.sproutvaleBot;
});

// ---------- START ----------

erstelleSternenhimmel();
erstelleHimmel();
// Den zuletzt gespielten Modus fortsetzen (Standard oder Sandbox), sonst einen neuen Run beginnen
const startInSandbox = meta.letzterModus === "sandbox" && hatSandbox();
if (!ladeRun(startInSandbox) && !(startInSandbox && ladeRun(false))) starteNeuenRun(false);
erstelleTeich();
erstelleHaustier();
wendeKosmetikAn();
aktualisiereAlles();
zeigeHauptmenue();
requestAnimationFrame(hauptSchleife);

// Patch Notes: Klick auf die Versionsnummer, und nach einem Update einmal von selbst (nicht beim allerersten Start).
// Alle Versionen untereinander (neueste oben), das Fenster scrollt.
function zeigeNeuigkeiten() {
    const inhalt = el("div", "patchnotes");
    NEUIGKEITEN.forEach((eintrag, i) => {
        inhalt.appendChild(el("div", "patchnotes-version" + (i === 0 ? " neueste" : ""), eintrag.version));
        inhalt.appendChild(el("ul", "neuigkeiten-liste", null, eintrag.punkte.map(punkt => el("li", null, punkt))));
    });
    zeigePopup({
        titel: t("📜 Patch Notes"),
        farbe: "#2e9e2e",
        breite: 640,
        klasse: "patchnotes-fenster",
        inhalt,
        knoepfe: [{ text: t("Weiter spielen"), klasse: "knopf-gruen" }]
    });
}
$("menue-version").textContent = SPIEL_VERSION + " · " + t("Patch Notes");
$("menue-version").addEventListener("click", zeigeNeuigkeiten);
if (meta.neuigkeitenGesehen !== SPIEL_VERSION) {
    const schonGespielt = (meta.lebenszeit && meta.lebenszeit.tage > 0) || meta.mondblueten > 0;
    meta.neuigkeitenGesehen = SPIEL_VERSION;
    speichereMeta();
    if (schonGespielt && NEUIGKEITEN[0].version === SPIEL_VERSION) setTimeout(zeigeNeuigkeiten, 600);
}

// Auto-Patcher (Desktop-App): ein neues Update ist geladen, jetzt neu laden?
if (window.sproutvaleDesktop && window.sproutvaleDesktop.update) {
    let gefragt = false;
    window.sproutvaleDesktop.update.wennBereit(version => {
        if (gefragt) return;
        gefragt = true;
        Klang.geschenk();
        zeigePopup({
            titel: t("✨ Update bereit"),
            farbe: "#2e9e2e",
            breite: 480,
            inhalt: tf("Sproutvale {0} ist geladen. Jetzt neu starten? Dein Spielstand bleibt erhalten.", version),
            knoepfe: [
                { text: t("Später") },
                { text: t("🔄 Jetzt aktualisieren"), klasse: "knopf-gruen", aktion: () => {
                    speichereRun();
                    speichereMeta();
                    window.sproutvaleDesktop.update.anwenden();
                } }
            ]
        });
    });
}

// Duo-Knopf in der oberen Leiste
$("koop-knopf").querySelector("img").src = spriteUrl("sym_duo");
$("koop-knopf").addEventListener("click", zeigeKoopFenster);

// Profil (oben rechts im Hauptmenue)
$("profil-knopf").addEventListener("click", oeffneProfil);
$("profil-schliessen").addEventListener("click", schliesseProfil);
aktualisiereProfilKnopf();

// Sprache waehlen: speichern und neu laden (alle Texte werden beim Start uebersetzt)
// Grosse Karten mit Flagge (per CSS gezeichnet, Windows zeigt keine Flaggen-Emojis); die aktive Sprache hat einen Haken
(function spracheWahl() {
    const wahl = $("sprache-wahl");
    SPRACHEN.forEach(s => {
        const aktiv = s.id === SPRACHE;
        const karte = el("button", "knopf sprach-karte" + (aktiv ? " aktiv" : ""), null, [
            el("span", "sprach-flagge flagge-" + s.id),
            el("span", "sprach-name", s.name),
            el("span", "sprach-haken", aktiv ? "✔" : "")
        ]);
        karte.addEventListener("click", () => {
            if (s.id === SPRACHE) return;
            einstellungen.sprache = s.id;
            speichereEinstellungen();
            speichereRun();
            speichereMeta();
            location.reload();
        });
        wahl.appendChild(karte);
    });
})();
