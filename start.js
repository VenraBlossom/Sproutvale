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
        zeigeToast("🎁 Alle Skins, DLCs und die Sandbox sind freigeschaltet.");
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
    // Diese Liste in der Konsole: debug.hilfe()
    hilfe() {
        console.log(Object.keys(debug).map(name => "debug." + name).join(", "));
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

// Sprache waehlen: speichern und neu laden (alle Texte werden beim Start uebersetzt)
(function spracheWahl() {
    const wahl = $("sprache-wahl");
    SPRACHEN.forEach(s => {
        const option = document.createElement("option");
        option.value = s.id;
        option.textContent = s.name;
        wahl.appendChild(option);
    });
    wahl.value = SPRACHE;
    wahl.addEventListener("change", () => {
        einstellungen.sprache = wahl.value;
        speichereEinstellungen();
        speichereRun();
        speichereMeta();
        location.reload();
    });
})();
