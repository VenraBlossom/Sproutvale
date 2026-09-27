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
        const schild = el("div", "debug-bot-schild", null, [el("span", null, "🤖 Bot spielt mit (" + sauber + ")")]);
        const weg = el("button", "knopf", "✕");
        weg.addEventListener("click", () => debug.botWeg());
        schild.appendChild(weg);
        document.body.appendChild(schild);
        zeigeToast("🤖 Der Bot tritt der Lobby " + sauber + " bei …");
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

// Fenster zu debug.help(): jeder Befehl mit Eingabefeldern (Zahl, Text, Auswahl, Haken) und einem Knopf zum Ausfuehren
const DEBUG_BEFEHLE = [
    { gruppe: "Währungen" },
    { name: "gold", text: "Gold dazu", felder: [{ typ: "zahl", wert: 1000000 }] },
    { name: "sternensamen", text: "Sternensamen dazu", felder: [{ typ: "zahl", wert: 100 }] },
    { name: "mondblueten", text: "Mondblüten dazu", felder: [{ typ: "zahl", wert: 100 }] },
    { name: "splitter", text: "Sternensplitter dazu", felder: [{ typ: "zahl", wert: 10 }] },
    { name: "gutscheine", text: "Gutscheine dazu", felder: [{ typ: "zahl", wert: 5 }] },
    { gruppe: "Run" },
    { name: "energie", text: "Energie setzen", felder: [{ typ: "zahl", wert: 100 }] },
    { name: "tag", text: "Tag setzen", felder: [{ typ: "zahl", wert: 10 }] },
    { name: "jahreszeit", text: "Jahreszeit", felder: [{ typ: "auswahl", optionen: [[0, "Frühling"], [1, "Sommer"], [2, "Herbst"], [3, "Winter"]] }] },
    { name: "tageszeit", text: "Tageszeit (leer = aus)", felder: [{ typ: "zahl", wert: "", leerNull: true, schritt: 0.1 }] },
    { name: "segen", text: "Segen-Auswahl zeigen" },
    { name: "werkzeug", text: "Werkzeug geben (Id, Stufe)", felder: [{ typ: "text", wert: "sanduhr" }, { typ: "zahl", wert: 1 }] },
    { name: "boss", text: "Boss-Regel (Id)", felder: [{ typ: "text", wert: "" }] },
    { name: "variante", text: "Pflanzen-Variante (leer = aus)", felder: [{ typ: "text", wert: "", leerNull: true }] },
    { name: "meister", text: "Meisterschaft (Pflanze, Ernten)", felder: [{ typ: "text", wert: "weizen" }, { typ: "zahl", wert: 1000 }] },
    { gruppe: "Ereignisse" },
    { name: "wetter", text: "Wetter (Id, leer = aus)", felder: [{ typ: "text", wert: "regen", leerNull: true }] },
    { name: "stern", text: "Sternschnuppe" },
    { name: "gluehwuermchen", text: "Glühwürmchen" },
    { name: "kraehe", text: "Krähe" },
    { name: "goldregen", text: "Goldregen" },
    { name: "haendler", text: "Wanderhändler" },
    { name: "pose", text: "Begleiter-Pose", felder: [{ typ: "text", wert: "schlafen" }] },
    { gruppe: "Freischalten" },
    { name: "mondphase", text: "Mondphasen frei bis", felder: [{ typ: "zahl", wert: 5 }] },
    { name: "kuschel", text: "Kuscheltier (Id, Anzahl)", felder: [{ typ: "text", wert: "" }, { typ: "zahl", wert: 1 }] },
    { name: "dlc", text: "Unterstützer-Paket", felder: [{ typ: "haken", wert: true }] },
    { name: "einzelDlc", text: "Alle legendären Einzel-Inhalte" },
    { name: "sandbox", text: "Endlos freischalten" },
    { name: "alles", text: "ALLES freischalten" },
    { name: "allesWeg", text: "Alle Skins sperren" },
    { name: "kosmetik", text: "Skin (Kategorie, Id)", felder: [{ typ: "text", wert: "samenladen" }, { typ: "text", wert: "" }] },
    { name: "liste", text: "Skins einer Kategorie (Konsole)", felder: [{ typ: "text", wert: "haustier" }] },
    { gruppe: "Duo" },
    { name: "bot", text: "Bot tritt Lobby bei (Code)", felder: [{ typ: "text", wert: "" }] },
    { name: "botWeg", text: "Bot entfernen" },
    { gruppe: "Gefahr" },
    { name: "resetMeta", text: "Gesamten Fortschritt löschen", gefahr: true }
];

function zeigeDebugFenster() {
    const liste = el("div", "debug-liste");
    DEBUG_BEFEHLE.forEach(b => {
        if (b.gruppe) {
            liste.appendChild(el("div", "debug-gruppe", b.gruppe));
            return;
        }
        const zeile = el("div", "debug-zeile");
        zeile.appendChild(el("span", "debug-name", b.text));
        const eingaben = (b.felder || []).map(f => {
            let feld;
            if (f.typ === "auswahl") {
                feld = el("select", "debug-feld");
                f.optionen.forEach(([wert, text]) => {
                    const o = el("option", null, text);
                    o.value = wert;
                    feld.appendChild(o);
                });
            } else {
                feld = el("input", "debug-feld" + (f.typ === "haken" ? " debug-haken" : ""));
                feld.type = f.typ === "zahl" ? "number" : f.typ === "haken" ? "checkbox" : "text";
                if (f.typ === "haken") feld.checked = f.wert;
                else feld.value = f.wert;
                if (f.schritt) feld.step = f.schritt;
            }
            // Tasten im Feld nicht als Spiel-Tastenkuerzel werten
            feld.addEventListener("keydown", event => event.stopPropagation());
            zeile.appendChild(feld);
            return () => {
                if (f.typ === "haken") return feld.checked;
                if (f.leerNull && feld.value === "") return null;
                if (f.typ === "zahl" || f.typ === "auswahl") return Number(feld.value);
                return feld.value;
            };
        });
        const los = el("button", "knopf " + (b.gefahr ? "knopf-rot" : "knopf-gruen"), "▶");
        los.addEventListener("click", () => {
            if (b.gefahr && !confirm(b.text + "?")) return;
            try {
                debug[b.name](...eingaben.map(lies => lies()));
                zeigeToast("🛠️ debug." + b.name + " ✔");
            } catch (fehler) {
                console.error(fehler);
                zeigeToast("🛠️ debug." + b.name + ": " + fehler.message);
            }
        });
        zeile.appendChild(los);
        liste.appendChild(zeile);
    });
    zeigePopup({ titel: "🛠️ Debug", farbe: "#44506b", breite: 640, klasse: "debug-fenster", inhalt: liste });
}

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

$("menue-version").textContent = SPIEL_VERSION;

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
