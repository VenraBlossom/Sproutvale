"use strict";



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
    if (window.sproutvaleDesktop) return false;
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


function debugFreischalten(kategorie, eintrag) {
    if (eintrag.quelle === "dlc") Tresor.entwickler("gekauft", kategorie + ":" + eintrag.id);
    else meta.freigeschaltet[kategorie + ":" + eintrag.id] = true;
}

const debug = {
    gold(menge) { run.gold += menge; aktualisiereAlles(); },
    sternensamen(menge) { run.skillpunkte += menge; aktualisiereAlles(); },
    mondblueten(menge) { meta.mondblueten += menge; meta.mondbluetenSeitSternenfall += menge; speichereMeta(); if (!prestigeShop.classList.contains("versteckt")) renderPrestigeShop(); },
    gutscheine(menge) { meta.gutscheine += menge; speichereMeta(); if (!prestigeShop.classList.contains("versteckt")) renderPrestigeShop(); },
    splitter(menge) { meta.sternensplitter += menge; speichereMeta(); },
    energie(wert) { run.energie = wert; },
    tag(nummer) { run.tag = nummer; aktualisiereAlles(); },
    stern() { spawnSternschnuppe(); },
    alleSterne(unendlich = 10) {
        SKILLS.forEach(st => { run.level[st.id] = Number.isFinite(st.max) ? st.max : unendlich; });
        const bisher = Math.max(0, ...run.pflanzen.filter(p => p.freigeschaltet).map(p => p.level.ertrag));
        SKILLS.filter(st => st.art === "pflanze").forEach(st => {
            const pflanze = run.pflanzen.find(p => p.id === st.pflanze);
            if (!pflanze) return;
            pflanze.level.ertrag = Math.max(pflanze.level.ertrag, bisher);
            pflanze.freigeschaltet = true;
        });
        aktualisiereAlles();
        if (typeof renderSkilltree === "function") renderSkilltree();
        zeigeToast("🌟 Alle Sterne auf der höchsten Stufe.");
    },
    alleMarkt(unendlich = 10) {
        SHOP_UPGRADES.forEach(u => { run.level[u.id] = Number.isFinite(u.max) ? u.max : unendlich; });
        meta.stellariumFrei = true;
        for (let i = 0; i < 200 && run.felder.length < maxEigeneFelder(); i++) {
            const slot = naechsterSlot(eigeneSeite());
            if (slot < 0) break;
            erstelleFeld(slot);
        }
        run.pflanzen.filter(p => p.freigeschaltet).forEach(pflanze => PFLANZEN_UPGRADES.forEach(u => {
            if (!pflanzenUpgradeFrei(pflanze, u)) return;
            const ziel = Number.isFinite(u.max) ? u.max : Math.max(pflanze.level[u.id] || 0, unendlich);
            if (u.id === "ertrag") pflanze.level.ertragEigen = Math.max(pflanze.level.ertragEigen || 0, ziel);
            pflanze.level[u.id] = ziel;
        }));
        speichereMeta();
        aktualisiereAlles();
        zeigeToast("🛒 Alle Markt-Upgrades, Felder und Pflanzen-Upgrades auf der höchsten Stufe.");
    },
    gluehwuermchen() { spawnGluehwuermchen(); },
    segen() { zeigeSegenAuswahl(); },
    tageszeit(wert) { debugTageszeit = wert; },
    pose(zustand) { wechsleHaustierZustand(zustand, 8000); },
    variante(id) { debugVariante = id; },
    dlc(an = true) { Tresor.entwickler("dlc", an); wendeKosmetikAn(); },
    kristalle(menge = 500) { Tresor.entwickler("gems", kristallStand() + menge); aktualisiereKristallAnzeigen(); },
    beta(an = true) { Tresor.entwickler("beta", an); Tresor.entwickler("endlos", an); wendeKosmetikAn(); },
    einzelDlc() {
        Object.entries(KOSMETIK_LISTEN).forEach(([kategorie, liste]) => liste.filter(e => e.paket === "einzeln")
            .forEach(e => debugFreischalten(kategorie, e)));
        speichereMeta();
        wendeKosmetikAn();
    },
    alles() {
        Tresor.entwickler("dlc", true);
        meta.sandbox = true;
        Object.entries(KOSMETIK_LISTEN).forEach(([kategorie, liste]) => liste.forEach(e => {
            if (e.quelle !== "frei") debugFreischalten(kategorie, e);
        }));
        speichereMeta();
        wendeKosmetikAn();
        zeigeToast("🎁 Alle Skins, DLCs und Endlos sind freigeschaltet.");
    },
    allesWeg() {
        Tresor.entwickler("dlc", false);
        Object.keys(meta.freigeschaltet).forEach(schluessel => { delete meta.freigeschaltet[schluessel]; });
        meta.kosmetik = leereKosmetik();
        speichereMeta();
        wendeKosmetikAn();
    },
    kosmetik(kategorie, id) {
        const eintrag = (KOSMETIK_LISTEN[kategorie] || []).find(e => e.id === id);
        if (eintrag) debugFreischalten(kategorie, eintrag);
        if (kategorie === "deko") {
            if (!meta.kosmetik.deko.includes(id)) meta.kosmetik.deko.push(id);
            meta.kosmetik.deko = meta.kosmetik.deko.slice(-DEKO_MAX);
        } else {
            meta.kosmetik[kategorie] = id;
        }
        speichereMeta();
        wendeKosmetikAn();
    },
    skin(id) { debug.kosmetik("haustier", id); },
    deko(id) { debug.kosmetik("deko", id); },
    liste(kategorie) {
        console.table((KOSMETIK_LISTEN[kategorie] || []).map(e => ({ id: e.id, name: e.name, seltenheit: KUSCHEL_RARITAETEN[kosmetikSeltenheit(e)].name })));
    },
    mondphase(n) { meta.mondphaseFrei = Math.min(n, MONDPHASEN.length - 1); speichereMeta(); },
    meister(pflanze, ernten) { meta.kodex.pflanzen[pflanze] = ernten; speichereMeta(); aktualisiereAlles(); },
    jahreszeit(index) { run.tag = index * JAHRESZEITEN_KONFIG.tageProJahreszeit + 1; aktualisiereAlles(); },
    setze(art, wert) {
        const jetzt = { gold: () => run.gold, sternensamen: () => run.skillpunkte, mondblueten: () => meta.mondblueten,
            splitter: () => meta.sternensplitter, gutscheine: () => meta.gutscheine, kristalle: () => kristallStand() }[art];
        if (!jetzt) return;
        debug[art](wert - jetzt());
    },
    level(n) { meta.bauernXp = rangSchwelle(Math.max(1, Math.floor(n))); speichereMeta(); aktualisiereProfilKnopf(); },
    xp(menge) { gibBauernXp(menge); speichereMeta(); },
    help() { console.log("Debug-Fenster: Einstellungen > Klang, dann Strg+F12."); },
    bot(code) {
        debug.botWeg();
        const sauber = String(code || koop.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (sauber.length !== KOOP_KONFIG.codeLaenge) {
            throw new Error(t("Erst im Duo-Fenster eine Lobby erstellen."));
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
    wetter(id) { run.wetter = id; if (id) meta.kodex.wetter[id] = (meta.kodex.wetter[id] || 0) + 1; zeigeWetter(); },
    kraehe() { kraeheKommt(); },
    goldregen() { tagesPlan.goldregen = tagesPlan.ms; },
    haendler() { haendlerKommt(); aktualisiereAlles(); },
    werkzeug(id, stufe) { gibWerkzeug(id, 10, stufe); aktualisiereAlles(); },
    boss(id) { run.bossRegel = id; aktualisiereAlles(); },
    kuschel(id, anzahl = 1) { meta.kuscheltiere[id] = (meta.kuscheltiere[id] || 0) + anzahl; speichereMeta(); },
    sandbox() { meta.sandbox = true; speichereMeta(); },
    resetMeta() { Object.assign(meta, leererMetaStand()); speichereMeta(); loescheRunSpeicher(); }
};
if (DEBUG_ERLAUBT) window.debug = debug;

const WERKZEUG_DEBUG_MAX = 20;
const DEBUG_AUS = { wert: null, name: "Aus", symbol: "🚫" };
const DEBUG_POSEN = ["stehen", "laufen", "sitzen", "liegen", "schlafen"];

function debugKosmetikOptionen(kategorie) {
    return (KOSMETIK_LISTEN[kategorie] || []).map(e => ({ wert: e.id, name: e.name, symbol: e.symbol || e.emoji || e.badge }));
}

function debugKategorien() {
    return Object.keys(KOSMETIK_LISTEN).map(k => {
        const haus = KOSMETIK_KATEGORIEN.find(x => x.id === k);
        const figur = k.startsWith("figur_") && FIGUR_KATEGORIEN.find(x => x.id === k.slice(6));
        return { wert: k, name: haus ? haus.name : figur ? tf("Figur: {0}", figur.name) : k, symbol: haus ? haus.symbol : null };
    });
}

const DEBUG_BEFEHLE = [
    { gruppe: "Währungen (+ = dazu, = = auf den Wert setzen)" },
    { name: "gold", text: "Gold", setzen: true, felder: [{ typ: "zahl", wert: 1000000, min: 0 }] },
    { name: "sternensamen", text: "Sternensamen", setzen: true, felder: [{ typ: "zahl", wert: 100, min: 0 }] },
    { name: "mondblueten", text: "Mondblüten", setzen: true, felder: [{ typ: "zahl", wert: 100, min: 0 }] },
    { name: "splitter", text: "Sternensplitter", setzen: true, felder: [{ typ: "zahl", wert: 10, min: 0 }] },
    { name: "gutscheine", text: "Gutscheine", setzen: true, felder: [{ typ: "zahl", wert: 5, min: 0 }] },
    { name: "kristalle", text: "Gems", setzen: true, ueberall: true, felder: [{ typ: "zahl", wert: 500, min: 0 }] },
    { gruppe: "Level" },
    { name: "level", text: "Level setzen", felder: [{ typ: "zahl", wert: 50, min: 1 }] },
    { name: "xp", text: "Erfahrung geben", felder: [{ typ: "zahl", wert: 10000, min: 0 }] },
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
    { name: "bot", text: "Bot hinzufügen (tritt deiner Duo-Lobby bei)", ueberall: true },
    { name: "alleSterne", text: "Alle Sterne auf Max-Stufe (unendliche Sterne auf diese Stufe)", felder: [{ typ: "zahl", wert: 10, min: 0 }] },
    { name: "alleMarkt", text: "Markt komplett: Upgrades, Felder und Pflanzen-Upgrades auf Max (unendliche auf diese Stufe)", felder: [{ typ: "zahl", wert: 10, min: 0 }] },
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
        { typ: "wahl", optionen: debugKategorien },
        { typ: "wahl", optionen: werte => debugKosmetikOptionen(werte[0]) }] },
    { name: "liste", text: "Skins einer Kategorie (Konsole)", felder: [{ typ: "wahl", optionen: debugKategorien }] },
    { gruppe: "Duo" },
    { gruppe: "Gefahr" },
    { name: "resetMeta", text: "Gesamten Fortschritt löschen", gefahr: true }
];

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
            liste.appendChild(el("div", "debug-gruppe", t(b.gruppe)));
            return;
        }
        const zeile = el("div", "debug-zeile");
        zeile.appendChild(el("span", "debug-name", t(b.text)));
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
                zuruecksetzen[index] = () => {
                    gewaehlt = erste();
                    werte[index] = gewaehlt.wert;
                    zeige();
                };
                knopf.addEventListener("click", () => zeigeDebugInventar(t(b.text), f.optionen(werte), gewaehlt.wert, o => {
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
            else feld.value = f.typ === "zahl" ? "" : f.wert;
            if (f.schritt) feld.step = f.schritt;
            if (f.min !== undefined) feld.min = f.min;
            if (f.max !== undefined) feld.max = f.max;
            if (f.typ === "zahl" && f.max !== undefined) feld.placeholder = f.min + "-" + f.max;
            if (f.platzhalter) feld.placeholder = f.platzhalter;
            feld.addEventListener("keydown", event => { if (event.key !== "F12") event.stopPropagation(); });
            zeile.appendChild(feld);
            return () => {
                if (f.typ === "haken") return feld.checked;
                if (f.leerNull && feld.value === "") return null;
                if (f.typ !== "zahl") return feld.value;
                if (feld.value === "") throw new Error(t("Bitte erst eine Zahl eintragen."));
                let zahlWert = Number(feld.value) || 0;
                if (f.min !== undefined) zahlWert = Math.max(f.min, zahlWert);
                if (f.max !== undefined) zahlWert = Math.min(f.max, zahlWert);
                feld.value = zahlWert;
                return zahlWert;
            };
        });
        const ausfuehren = (aktion, name) => {
            if (!b.ueberall && !hauptmenue.classList.contains("versteckt")) {
                Klang.fehler();
                zeigeToast(t("🛠️ Debug geht nur im Spiel: Lade zuerst einen Spielstand."));
                return;
            }
            if (b.gefahr && !confirm(t(b.text) + "?")) return;
            try {
                aktion(...eingaben.map(lies => lies()));
                zeigeToast("🛠️ debug." + name + " ✔");
            } catch (fehler) {
                console.error(fehler);
                zeigeToast("🛠️ debug." + name + ": " + fehler.message);
            }
        };
        const los = el("button", "knopf " + (b.gefahr ? "knopf-rot" : "knopf-gruen"), b.setzen ? "+" : "▶");
        setzeTipp(los, b.setzen ? t("Dazugeben") : t("Ausführen"));
        los.addEventListener("click", () => ausfuehren(debug[b.name], b.name));
        zeile.appendChild(los);
        if (b.setzen) {
            const setzen = el("button", "knopf", "=");
            setzeTipp(setzen, t("Auf diesen Wert setzen"));
            setzen.addEventListener("click", () => ausfuehren(wert => debug.setze(b.name, wert), "setze"));
            zeile.appendChild(setzen);
        }
        liste.appendChild(zeile);
    });
    debugFensterSchliessen = zeigePopup({ titel: t("🛠️ Debug (Strg+F12)"), farbe: "#44506b", breite: 680, klasse: "debug-fenster", inhalt: liste,
        onSchliessen: () => { debugFensterSchliessen = null; } });
}

function zeigeLobbyDebug() {
    const knopf = el("button", "knopf knopf-gruen", t("🤖 Bot hinzufügen"));
    debugFensterSchliessen = zeigePopup({ titel: t("🛠️ Debug (Strg+F12)"), farbe: "#44506b", breite: 360, klasse: "debug-fenster",
        inhalt: el("div", "lobby-debug", null, [knopf]), onSchliessen: () => { debugFensterSchliessen = null; } });
    knopf.addEventListener("click", () => {
        debug.bot();
        if (debugFensterSchliessen) debugFensterSchliessen();
    });
}

window.addEventListener("keydown", event => {
    if (event.key !== "F12" || !DEBUG_ERLAUBT) return;
    event.preventDefault();
    if (debugFensterSchliessen) {
        event.stopPropagation();
        debugFensterSchliessen();
        return;
    }
    const inLobby = typeof koop !== "undefined" && koop.code && !koop.imSpiel && !$("menue-koop").classList.contains("versteckt") &&
        !hauptmenue.classList.contains("versteckt");
    if (event.ctrlKey && inLobby) {
        event.stopPropagation();
        zeigeLobbyDebug();
        return;
    }
    const imKlangReiter = !einstellungenFenster.classList.contains("versteckt") && aktiverEinstellungsReiter === "audio";
    if (!event.ctrlKey || !imKlangReiter) return;
    event.stopPropagation();
    einstellungenFenster.classList.add("versteckt");
    zeigeDebugFenster();
}, true);

window.addEventListener("message", event => {
    if (!event.data || typeof event.data.sproutvaleBot !== "string") return;
    const status = document.querySelector(".debug-bot-status");
    if (status) status.textContent = event.data.sproutvaleBot;
});


erstelleSternenhimmel();
erstelleHimmel();
const startInSandbox = meta.letzterModus === "sandbox" && hatSandbox();
if (!ladeRun(startInSandbox) && !(startInSandbox && ladeRun(false))) starteNeuenRun(false);
erstelleTeich();
erstelleHaustier();
wendeKosmetikAn();
aktualisiereAlles();
zeigeHauptmenue();
requestAnimationFrame(hauptSchleife);

function zeigeNeuigkeiten(ausgabe = 0) {
    const blatt = el("div", "zeitung-blatt");
    fuelleZeitung(blatt, ausgabe);
    Klang.klick(8);
    zeigePopup({
        titel: t("📰 Neuigkeiten"),
        farbe: "#8a5a2c",
        breite: 660,
        klasse: "zeitung-fenster",
        inhalt: blatt,
        knoepfe: [{ text: t("Weiter spielen"), klasse: "knopf-gruen" }]
    });
    meta.neuigkeitenGelesen = SPIEL_VERSION;
    speichereMeta();
    aktualisiereZeitungKnopf();
}

function fuelleZeitung(blatt, ausgabe) {
    const eintrag = NEUIGKEITEN[ausgabe];
    blatt.innerHTML = "";
    blatt.classList.remove("umblaettern");
    void blatt.offsetWidth;
    blatt.classList.add("umblaettern");
    blatt.appendChild(el("div", "zeitung-kopf", null, [
        el("div", "zeitung-name", t("Sproutvale Tagblatt")),
        el("div", "zeitung-zeile", null, [
            el("span", null, tf("Ausgabe {0}", NEUIGKEITEN.length - ausgabe)),
            el("span", null, eintrag.version),
            el("span", null, t("Preis: 1 Weizen"))
        ])
    ]));
    const [titel, ...rest] = eintrag.punkte;
    blatt.appendChild(el("div", "zeitung-titel", ausgabe === 0 ? tf("Neu in {0}!", eintrag.version) : eintrag.version));
    blatt.appendChild(el("div", "zeitung-aufmacher", titel));
    if (rest.length) blatt.appendChild(el("div", "zeitung-spalten", null, rest.map(punkt => el("div", "zeitung-meldung", punkt))));
    const dorf = DORFZEITUNG.map(f => { try { return f(meta, run); } catch (fehler) { return null; } }).filter(Boolean);
    if (dorf.length) blatt.appendChild(el("div", "zeitung-dorf", null, [el("b", null, t("Aus dem Dorf: ")), el("span", null, zufall(dorf))]));
    const blaettern = el("div", "zeitung-blaettern");
    const knopf = (text, ziel) => {
        const k = el("button", "knopf zeitung-knopf", text);
        k.disabled = ziel < 0 || ziel >= NEUIGKEITEN.length;
        k.addEventListener("click", () => {
            Klang.klick(6);
            fuelleZeitung(blatt, ziel);
            blatt.scrollTop = 0;
        });
        return k;
    };
    blaettern.append(knopf(t("◀ Neuere"), ausgabe - 1), el("span", null, (ausgabe + 1) + " / " + NEUIGKEITEN.length), knopf(t("Ältere ▶"), ausgabe + 1));
    blatt.appendChild(blaettern);
}

function aktualisiereZeitungKnopf() {
    const knopf = $("menue-zeitung");
    if (knopf) knopf.classList.toggle("ungelesen", meta.neuigkeitenGelesen !== SPIEL_VERSION);
}
$("menue-zeitung").appendChild(pixelIcon("📰", 40));
$("menue-zeitung").addEventListener("click", () => zeigeNeuigkeiten(0));
setzeTipp($("menue-zeitung"), t("📰 Neuigkeiten: Was ist neu in Sproutvale?"));
aktualisiereZeitungKnopf();

(function festAnkuendigen() {
    const fest = aktuellesFest();
    if (!fest) return;
    const heute = new Date().toDateString();
    if (meta.festGesehen === heute) return;
    meta.festGesehen = heute;
    speichereMeta();
    setTimeout(() => zeigeBanner(fest.symbol, fest.name + "!", fest.zeitung, "#b8862b", 4200), 1500);
})();
$("menue-version").textContent = SPIEL_VERSION;
if (meta.neuigkeitenGesehen !== SPIEL_VERSION) {
    const schonGespielt = (meta.lebenszeit && meta.lebenszeit.tage > 0) || meta.mondblueten > 0;
    meta.neuigkeitenGesehen = SPIEL_VERSION;
    speichereMeta();
    if (schonGespielt && NEUIGKEITEN[0].version === SPIEL_VERSION) setTimeout(() => zeigeNeuigkeiten(0), 600);
}

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

$("koop-knopf").querySelector("img").src = spriteUrl("sym_duo");
$("koop-knopf").addEventListener("click", zeigeKoopFenster);

$("profil-knopf").addEventListener("click", oeffneProfil);
$("profil-schliessen").addEventListener("click", schliesseProfil);
aktualisiereProfilKnopf();

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
    SPRACHEN_BALD.forEach(s => {
        const karte = el("button", "knopf sprach-karte bald", null, [
            el("span", "sprach-flagge flagge-" + s.id),
            el("span", "sprach-text", null, [el("span", "sprach-name", s.name), el("span", "sprach-bald", t("Bald"))])
        ]);
        karte.disabled = true;
        setzeTipp(karte, t("Diese Sprache kommt bald."));
        wahl.appendChild(karte);
    });
})();

(function spieleIntro() {
    const intro = document.getElementById("intro");
    const buehne = document.getElementById("intro-buehne");
    const leinwand = document.getElementById("intro-leinwand");
    if (!intro || !buehne || !leinwand) return;
    const c = leinwand.getContext("2d");
    const B = 640, H = 360;
    const SCHIRM_FARBE = "#0a0a09";

    let ctx = c;
    const px = (x, y, w, h, farbe) => { ctx.fillStyle = farbe; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const raster = (x, y, w, h, a, b) => {
        px(x, y, w, h, a);
        ctx.fillStyle = b;
        for (let yy = 0; yy < h; yy++) for (let xx = (yy % 2); xx < w; xx += 2) ctx.fillRect(x + xx, y + yy, 1, 1);
    };
    const verlauf = (x, y, w, h, farben) => {
        const stufe = h / farben.length;
        farben.forEach((f, i) => {
            px(x, y + i * stufe, w, stufe + 1, f);
            if (i > 0) raster(x, Math.round(y + i * stufe) - 2, w, 3, f, farben[i - 1]);
        });
    };
    const kasten = (x, y, w, h, farbe, ecke = 3) => {
        for (let i = 0; i < ecke; i++) px(x + ecke - i, y + i, w - 2 * (ecke - i), 1, farbe);
        px(x, y + ecke, w, h - 2 * ecke, farbe);
        for (let i = 0; i < ecke; i++) px(x + i + 1, y + h - ecke + i, w - 2 * (i + 1), 1, farbe);
    };
    const kugel = (mx, my, r, dunkel, mitte, hell, glanz) => {
        for (let y = -r; y <= r; y++) {
            const b = Math.round(Math.sqrt(r * r - y * y));
            px(mx - b, my + y, b * 2, 1, dunkel);
            if (y < r - 1) px(mx - b + 1, my + y, b * 2 - 2, 1, mitte);
        }
        for (let y = -r + 1; y <= 0; y++) {
            const b = Math.round(Math.sqrt(r * r - y * y) * 0.7);
            px(mx - b - 1, my + y - 1, b * 2 - 1, 1, hell);
        }
        px(mx - Math.round(r * 0.5), my - Math.round(r * 0.6), Math.max(2, Math.round(r * 0.35)), Math.max(1, Math.round(r * 0.25)), glanz);
    };
    const knopf = (mx, my, rx, farbe, hell, dunkel) => {
        const ry = Math.round(rx * 0.55);
        const ellipse = (cx, cy, a, b, f) => { for (let y = -b; y <= b; y++) { const w = Math.round(a * Math.sqrt(1 - (y * y) / (b * b))); px(cx - w, cy + y, w * 2, 1, f); } };
        ellipse(mx, my + 3, rx + 2, ry + 2, "#140a22");
        ellipse(mx, my + 2, rx + 1, ry + 1, "#2a2a30");
        ellipse(mx, my + 2, rx, ry, dunkel);
        ellipse(mx, my, rx, ry, farbe);
        ellipse(mx - 1, my - 1, rx - 3, ry - 2, hell);
        px(mx - Math.round(rx * 0.5), my - ry + 1, Math.round(rx * 0.4), 1, "#ffffff");
    };

    let saat = 11;
    const zufall = () => { saat = (saat * 16807) % 2147483647; return saat / 2147483647; };

    const vorlage = document.createElement("canvas");
    vorlage.width = B;
    vorlage.height = H;

    const SCHIRM = { x: 160, y: 62, w: 320, h: 206 };
    const A = { x: 112, w: 416 };

    function maleHalle() {
        verlauf(0, 0, B, 244, ["#0f0820", "#140b28", "#180e30", "#1c1037", "#20133e", "#23153f"]);
        for (let y = 34; y < 236; y += 16) for (let x = (y / 16 % 2) * 8; x < B; x += 16) px(x, y, 1, 1, "#2e1d52");
        px(0, 12, B, 7, "rgba(255,90,208,0.10)");
        px(0, 14, B, 3, "rgba(255,90,208,0.25)");
        px(0, 15, B, 1, "#ff8ae0");
        verlauf(0, 244, B, H - 244, ["#120a20", "#170d28", "#1b1030", "#1e1234"]);
        const konfetti = ["#4ad0ff", "#ff5ad0", "#ffcf4a", "#7ed957", "#a877e0"];
        for (let i = 0; i < 700; i++) {
            const y = 246 + Math.floor(Math.pow(zufall(), 0.8) * (H - 246));
            const x = Math.floor(zufall() * B);
            const g = y > 300 ? 2 : 1;
            px(x, y, g, 1, konfetti[i % konfetti.length] + (y > 300 ? "cc" : "77"));
        }
        px(0, 240, B, 4, "#0a0514");
        px(0, 240, B, 1, "#4ad0ff");
        px(0, 241, B, 1, "rgba(74,208,255,0.35)");
    }

    function maleNebenAutomat(x, y, s, farbe, hell, dunkel, schild, seiteLinks) {
        const w = 40 * s, h = 90 * s, tiefe = 8 * s;
        px(x - 4, y + h - 2, w + tiefe + 8, 6, "rgba(0,0,0,0.45)");
        const sx = seiteLinks ? x - tiefe : x + w;
        px(sx, y + 4, tiefe, h - 4, dunkel);
        px(sx + (seiteLinks ? 0 : tiefe - 1), y + 4, 1, h - 4, "#000");
        kasten(x, y, w, h, "#0c0616", 2);
        verlauf(x + 1, y + 1, w - 2, h - 2, [hell, farbe, farbe, dunkel]);
        px(x + 1, y + 1, 1, h - 2, "rgba(255,255,255,0.35)");
        px(x + 3, y + 3, w - 6, 9 * s, "#0c0616");
        verlauf(x + 4, y + 4, w - 8, 9 * s - 2, [schild + "ff", schild + "cc"]);
        px(x + 4, y + 4, w - 8, 1, "rgba(255,255,255,0.6)");
        kasten(x + 4, y + 16 * s, w - 8, 28 * s, "#07040c", 2);
        px(x - 1, y + 48 * s, w + 2, 3 * s, "#0c0616");
        px(x, y + 48 * s, w, 2 * s, hell);
        px(x + w / 2 - 6, y + 62 * s, 12, 10, "#0c0616");
        px(x + w / 2 - 4, y + 64 * s, 2, 5, "#ff5a3a");
        px(x + w / 2 + 2, y + 64 * s, 2, 5, "#ff5a3a");
        return { sx: x + 6, sy: y + 16 * s + 2, sw: w - 12, sh: 28 * s - 4, x, y, w, h };
    }

    let neben = [];
    function maleNebenAutomaten() {
        const gelb = maleNebenAutomat(590, 70, 1.9, "#c89018", "#f0c040", "#6a4a08", "#4ad0ff", true);
        neben = [
            maleNebenAutomat(-26, 70, 1.9, "#2a5ac0", "#5a8ae8", "#142e6a", "#ff8a3a", false),
            maleNebenAutomat(56, 104, 1.45, "#b82a2a", "#e85a4a", "#5a1414", "#5affc8", false),
            maleNebenAutomat(544, 104, 1.45, "#2f7a2a", "#6ac04a", "#143a12", "#ff5ad0", true),
            gelb
        ];
    }

    function maleHauptAutomat() {
        const { x, w } = A;
        px(x - 14, 0, 14, H, "#1c0f30");
        px(x - 14, 0, 3, H, "#2a1846");
        px(x - 2, 0, 2, H, "#c8a0ff");
        px(x + w, 0, 14, H, "#140a24");
        px(x + w + 11, 0, 3, H, "#0a0514");
        px(x + w, 0, 2, H, "#8a60c8");
        verlauf(x, 0, w, H, ["#7a4ab4", "#6b3fa0", "#63399a", "#5a3290", "#4e2a80"]);
        px(x, 0, 3, H, "rgba(255,255,255,0.18)");
        px(x + w - 3, 0, 3, H, "rgba(0,0,0,0.25)");

        kasten(x + 16, 4, w - 32, 50, "#12081e", 3);
        verlauf(x + 21, 8, w - 42, 42, ["#fff0b0", "#ffd060", "#ffb03a", "#f08a24"]);
        px(x + 21, 8, w - 42, 2, "#fffbe0");
        px(x + 21, 48, w - 42, 2, "#b85a10");

        for (let i = 0; i < 14; i++) px(x + 150 + i * 9, 57, 5, 1, "#3a2066");

        kasten(SCHIRM.x - 26, SCHIRM.y - 6, SCHIRM.w + 52, SCHIRM.h + 14, "#0a0512", 6);
        kasten(SCHIRM.x - 23, SCHIRM.y - 3, SCHIRM.w + 46, SCHIRM.h + 8, "#1a1024", 5);
        verlauf(SCHIRM.x - 20, SCHIRM.y, SCHIRM.w + 40, SCHIRM.h + 2, ["#241834", "#1c122a", "#160e22"]);
        [[SCHIRM.x - 15, SCHIRM.y + 4], [SCHIRM.x + SCHIRM.w + 11, SCHIRM.y + 4],
            [SCHIRM.x - 15, SCHIRM.y + SCHIRM.h - 6], [SCHIRM.x + SCHIRM.w + 11, SCHIRM.y + SCHIRM.h - 6]].forEach(([sx, sy]) => {
            px(sx, sy, 4, 4, "#5a5066"); px(sx, sy, 3, 3, "#8a8096"); px(sx + 1, sy + 1, 2, 1, "#3a3046");
        });
        kasten(SCHIRM.x - 4, SCHIRM.y - 2, SCHIRM.w + 8, SCHIRM.h + 4, "#050404", 8);

        const by = 282;
        px(x - 14, by - 6, w + 28, 6, "#12081e");
        verlauf(x - 12, by, w + 24, 22, ["#b48ae8", "#9a6ad6", "#8a5ac8"]);
        px(x - 12, by, w + 24, 1, "#e8d4ff");
        px(x - 12, by + 22, w + 24, 3, "#2a1648");
        verlauf(x, by + 25, w, H - by - 25, ["#4a2a7a", "#3e2268", "#341c5a"]);
        px(x + 88, by + 6, 2, 8, "#e8d4ff"); px(x + 87, by + 7, 1, 1, "#e8d4ff"); px(x + 87, by + 13, 4, 1, "#e8d4ff");
        px(x + 93, by + 6, 3, 8, "#e8d4ff"); px(x + 96, by + 6, 2, 1, "#e8d4ff"); px(x + 96, by + 9, 2, 1, "#e8d4ff"); px(x + 98, by + 7, 1, 2, "#e8d4ff");
        kasten(x + w / 2 - 30, by + 40, 60, 38, "#1c0f30", 2);
        px(x + w / 2 - 28, by + 42, 56, 34, "#2a1846");
        [-12, 8].forEach(dx => {
            px(x + w / 2 + dx, by + 48, 6, 14, "#12081e");
            px(x + w / 2 + dx + 2, by + 50, 2, 10, "#ff6a3a");
            px(x + w / 2 + dx + 1, by + 65, 4, 3, "#8a8096");
        });
    }

    function maleStatisch() {
        ctx = vorlage.getContext("2d");
        maleHalle();
        maleNebenAutomaten();
        maleHauptAutomat();
        ctx = c;
    }

    const MONSTER = ["00100000100", "00010001000", "00111111100", "01101110110", "11111111111", "10111111101", "10100000101", "00011011000"];
    function monster(x, y, farbe, g) {
        MONSTER.forEach((zeile, yy) => [...zeile].forEach((p, xx) => { if (p === "1") px(x + xx * g, y + yy * g, g, g, farbe); }));
    }

    function maleBewegt(zeit) {
        if (Math.sin(zeit * 13) < -0.93) {
            px(0, 14, A.x - 14, 3, "rgba(20,8,32,0.8)");
            px(A.x + A.w + 14, 14, B - A.x - A.w - 14, 3, "rgba(20,8,32,0.8)");
        }
        const farben = ["#7ed957", "#ffcf4a", "#4ad0ff", "#ff5ad0"];
        c.save();
        c.beginPath();
        c.rect(0, 0, A.x - 14, H);
        c.rect(A.x + A.w + 14, 0, B - A.x - A.w - 14, H);
        c.clip();
        [0, 1, 3, 2].map(i => [neben[i], i]).forEach(([n, i]) => {
            c.save();
            if (i === 3) {
                c.beginPath();
                c.rect(neben[2].x + neben[2].w + 1, 0, B, H);
                c.clip();
            }
            px(n.sx, n.sy, n.sw, n.sh, ["#0c1a3a", "#2a0c1a", "#0c2a14", "#2a1a08"][i]);
            if (i === 2) {
            } else {
                const schritt = Math.floor(zeit * 3 + i) % 2;
                const mx = n.sx + 3 + ((zeit * 12 + i * 20) % Math.max(1, n.sw - 16));
                monster(Math.round(mx), n.sy + 4 + schritt, farben[i], 1);
                px(n.sx + n.sw / 2 - 1, n.sy + n.sh - 5, 3, 2, "#ffffff");
            }
            for (let yy = n.sy; yy < n.sy + n.sh; yy += 2) px(n.sx, yy, n.sw, 1, "rgba(0,0,0,0.3)");
            px(n.sx - 2, n.sy - 2, n.sw + 4, n.sh + 4, farben[i] + "12");
            c.restore();
        });
        c.restore();
        const puls = 0.08 + 0.06 * Math.sin(zeit * 4);
        px(A.x + 21, 8, A.w - 42, 42, "rgba(255,255,255," + puls.toFixed(3) + ")");
    }

    function maleSchrift() {
        c.font = "32px 'Jersey 15', monospace";
        c.textBaseline = "middle";
        c.textAlign = "center";
        const mx = B / 2, my = 30;
        c.fillStyle = "#b85a10";
        c.fillText("SPROUTVALE", mx + 2, my + 2);
        c.fillStyle = "#3a1406";
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.fillText("SPROUTVALE", mx + dx, my + dy);
        c.fillStyle = "#6a2a0c";
        c.fillText("SPROUTVALE", mx, my);
        c.textAlign = "left";
    }

    const vorneLeinwand = document.getElementById("intro-vorne");
    const vorne = vorneLeinwand ? vorneLeinwand.getContext("2d") : null;
    function maleSteuerung(zeit) {
        const by = 282, x = A.x;
        const wackeln = zeit > 1.2 && zeit < 1.6 ? Math.round(Math.sin(zeit * 40) * 2) : 0;
        if (vorne) {
            vorne.clearRect(0, 0, B, H);
            ctx = vorne;
        }
        knopf(x + 124, by + 12, 10, "#1a1a1e", "#2e2e34", "#0a0a0c");
        px(x + 122 + wackeln / 2, by - 6, 4, 18, "#3a3a42");
        px(x + 122 + wackeln / 2, by - 6, 1, 18, "#6a6a72");
        kugel(x + 124 + wackeln, by - 10, 9, "#8a141a", "#d02a30", "#ff5a5a", "#ffd0d0");
        ctx = c;
        knopf(x + 262, by + 11, 11, "#f5d547", "#fff3a0", "#b8961a");
        knopf(x + 296, by + 11, 11, "#5aa9e6", "#b0e0ff", "#2a6aa8");
        knopf(x + 330, by + 11, 11, "#7ed957", "#c8ffa8", "#3e8a28");
    }

    function maleSchirm(zeit) {
        const { x, y, w, h } = SCHIRM;
        px(x, y, w, h, "#030303");
        if (zeit < 0.8) {
            for (let i = 0; i < 26; i++) px(x + 12 + i, y + 8 + i, 20, 1, "rgba(255,255,255,0.035)");
            return 0;
        }
        const an = Math.min(1, (zeit - 0.8) / 0.45);
        if (an < 1) {
            const lh = Math.max(2, Math.round(h * Math.max(0, an * 2 - 1)));
            const lw = Math.round(w * Math.min(1, an * 2));
            px(x + (w - lw) / 2 - 2, y + (h - lh) / 2 - 2, lw + 4, lh + 4, "rgba(200,220,255,0.35)");
            px(x + (w - lw) / 2, y + (h - lh) / 2, lw, lh, "#eef4ff");
            return 0;
        }
        px(x, y, w, h, SCHIRM_FARBE);
        const glimmen = Math.min(1, (zeit - 1.25) / 0.6);
        px(x - 20, y - 2, 16, h + 4, "rgba(181,140,255," + (0.06 * glimmen).toFixed(3) + ")");
        px(x + w + 4, y - 2, 16, h + 4, "rgba(181,140,255," + (0.06 * glimmen).toFixed(3) + ")");
        return glimmen;
    }

    maleStatisch();
    let start = performance.now();
    const ZOOM_AB = 3.8, ENDE = 4.7;
    const inhalt = intro.querySelector(".intro-schirm");
    let laeuft = true;
    function bild(jetzt) {
        if (!laeuft) return;
        const zeit = (jetzt - start) / 1000;
        c.drawImage(vorlage, 0, 0);
        maleBewegt(zeit);
        maleSchrift();
        const sicht = maleSchirm(zeit);
        maleSteuerung(zeit);
        inhalt.style.opacity = sicht;
        inhalt.classList.toggle("flimmert", sicht > 0 && sicht < 1);
        if (sicht > 0) inhalt.classList.add("an");
        if (zeit > ZOOM_AB) {
            const z = Math.min(1, (zeit - ZOOM_AB) / (ENDE - ZOOM_AB));
            buehne.style.transformOrigin = "50% " + ((SCHIRM.y + SCHIRM.h / 2) / H) * 100 + "%";
            buehne.style.transform = "translate(-50%, -50%) scale(" + (1 + z * z * 3.5).toFixed(3) + ")";
        }
        if (zeit >= ENDE) fertig();
        else requestAnimationFrame(bild);
    }

    function fertig() {
        if (!laeuft) return;
        laeuft = false;
        intro.classList.add("weg");
        setTimeout(() => intro.remove(), 700);
    }
    intro.addEventListener("click", fertig);
    document.addEventListener("keydown", function taste() {
        document.removeEventListener("keydown", taste);
        fertig();
    });
    const logo = intro.querySelector(".intro-logo");
    const schriften = document.fonts
        ? Promise.all([document.fonts.load("32px 'Jersey 15'"), document.fonts.load("700 20px 'Pixelify Sans'")]).catch(() => {})
        : Promise.resolve();
    const logoBereit = logo && logo.decode ? logo.decode().catch(() => {}) : Promise.resolve();
    const hoechstens = new Promise(fertigWarten => setTimeout(fertigWarten, 2500));
    Promise.race([Promise.all([schriften, logoBereit]), hoechstens]).finally(() => requestAnimationFrame(jetzt => {
        start = jetzt;
        bild(jetzt);
        intro.classList.add("bereit");
    }));
})();


document.querySelectorAll("#hauptmenue .menue-knopf").forEach(knopf => {
    knopf.addEventListener("mouseenter", () => { if (!knopf.disabled) Klang.menueTon(); });
});

document.querySelectorAll(".menue-symbol[data-symbol]").forEach(platz => {
    platz.appendChild(pixelIcon("sprite:sym_" + platz.dataset.symbol, platz.closest("#menue-start") ? 48 : 30));
});


(function belebeHauptmenue() {
    const menue = document.getElementById("hauptmenue");
    if (!menue) return;
    const offen = () => !menue.classList.contains("versteckt") && !document.hidden;

    const strahlen = el("div");
    strahlen.id = "menue-strahlen";
    menue.insertBefore(strahlen, menue.firstChild);

    const leben = el("div", "menue-leben");
    menue.insertBefore(leben, document.getElementById("menue-teilchen"));

    const gluehen = el("div", "menue-gluehen");
    for (let i = 0; i < 18; i++) {
        const punkt = el("span");
        punkt.style.left = 3 + Math.random() * 94 + "%";
        punkt.style.top = 58 + Math.random() * 38 + "%";
        punkt.style.animationDuration = 5 + Math.random() * 5 + "s, " + (1.6 + Math.random() * 2.2) + "s";
        punkt.style.animationDelay = -Math.random() * 8 + "s, " + -Math.random() * 3 + "s";
        gluehen.appendChild(punkt);
    }
    leben.appendChild(gluehen);

    setInterval(() => {
        if (!offen() || einstellungen.wenigerEffekte || istNacht() || leben.querySelectorAll(".jz-schmetterling").length >= 3) return;
        const flieger = el("div", "jz-schmetterling" + (Math.random() < 0.5 ? " links" : ""));
        const fluegel = pixelIcon("🦋", 28, "jz-fluegel");
        fluegel.style.filter = "hue-rotate(" + zufall([0, 140, 200, 260, 300]) + "deg)";
        flieger.appendChild(fluegel);
        flieger.style.top = 8 + Math.random() * 70 + "%";
        flieger.style.animationDuration = 14 + Math.random() * 8 + "s";
        leben.appendChild(flieger);
        setTimeout(() => flieger.remove(), 23000);
    }, 4200);

    setInterval(() => {
        if (!offen() || einstellungen.wenigerEffekte || istNacht() || Math.random() < 0.5) return;
        const schwarm = el("div", "vogel-schwarm" + (Math.random() < 0.5 ? " links" : ""));
        const anzahl = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < anzahl; i++) {
            const vogel = el("span", "vogel");
            vogel.style.left = i * 18 + (Math.random() - 0.5) * 8 + "px";
            vogel.style.top = Math.abs(i - anzahl / 2) * 7 + "px";
            vogel.style.animationDelay = -Math.random() * 0.5 + "s";
            schwarm.appendChild(vogel);
        }
        schwarm.style.top = 4 + Math.random() * 18 + "%";
        schwarm.style.animationDuration = 16 + Math.random() * 8 + "s";
        leben.appendChild(schwarm);
        setTimeout(() => schwarm.remove(), 25000);
    }, 11000);

    const buehne = menue.querySelector(".logo-buehne");
    if (!buehne) return;
    const funkeln = () => {
        if (!offen() || einstellungen.wenigerEffekte) return;
        const stern = pixelIcon("✨", 18 + Math.round(Math.random() * 14), "logo-funke");
        stern.style.left = 6 + Math.random() * 88 + "%";
        stern.style.top = 4 + Math.random() * 88 + "%";
        buehne.appendChild(stern);
        setTimeout(() => stern.remove(), 1300);
    };
    setInterval(funkeln, 700);
    buehne.addEventListener("click", () => {
        buehne.classList.remove("logo-hops");
        void buehne.offsetWidth;
        buehne.classList.add("logo-hops");
        Klang.erfolg();
        for (let i = 0; i < 8; i++) setTimeout(funkeln, i * 60);
    });
})();
