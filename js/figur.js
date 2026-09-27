"use strict";

// ============================================================
// SPROUTVALE: Eigene Figur (Profil im Hauptmenue) und Figuren auf dem Hof
// - Profil: Name (fuer Duo) und Aussehen aus Teilen (FIGUR_TEILE in daten.js), gespeichert in meta.profil (fuer alle Spielstaende)
// - Die Figur laeuft wie der Begleiter ueber den Hof, etwas groesser und ein paar Pixel weiter hinten.
//   Linksklick: Herzen am Mauszeiger. Rechtsklick: Emotes. Ab und zu eine Idle-Animation (hacken, strecken, winken).
// - Duo: die Figur und der Begleiter des Mitspielers laufen mit (mit Namensschild)
// Gehoert zu script.js, haus.js und sprites.js (gemeinsame Funktionen stehen dort).
// ============================================================

const FIGUR_BREITE = 18;
const FIGUR_OBEN = 5;   // Platz ueber dem Kopf (hohe Huete, Heiligenschein, Flammenhaar)
const FIGUR_HOEHE = 26 + FIGUR_OBEN;
// Schichten von hinten nach vorne (hinten = Fluegel, Rucksack, Umhang)
const FIGUR_SCHICHTEN = ["umriss", "hinten", "haut", "augen", "kleidung", "haare", "kopf", "accessoire", "werkzeug"];
const FIGUR_BILDER = { stehen: 2, laufen: 4, sitzen: 2, schlafen: 2, winken: 2, jubeln: 2, tanzen: 4, hacken: 4 };
const FIGUR_BILD_DAUER = { stehen: 700, laufen: 130, sitzen: 800, schlafen: 1100, winken: 220, jubeln: 260, tanzen: 240, hacken: 230 };
const FIGUR_FESTE_FARBEN = { w: "#ffffff", 7: "#2a1a12", t: "#9a6634", e: "#b8c0cc" };

// ---------- PROFIL ----------

function leeresProfil() {
    return { name: "", teile: { ...FIGUR_STANDARD } };
}

function profil() {
    if (!meta.profil || !meta.profil.teile) meta.profil = leeresProfil();
    return meta.profil;
}

function figurTeil(kategorie, id) {
    const liste = FIGUR_TEILE[kategorie];
    return liste.find(e => e.id === id) || liste[0];
}

// Nur Teile, die man besitzt (sonst das Standard-Teil); vorschau = Teile, die man nur anprobiert
function figurTeileAus(teile, pruefen = true) {
    const ergebnis = {};
    FIGUR_KATEGORIEN.forEach(k => {
        const teil = figurTeil(k.id, teile[k.id] || FIGUR_STANDARD[k.id]);
        ergebnis[k.id] = !pruefen || istKosmetikFrei(teil, "figur_" + k.id) ? teil : figurTeil(k.id, FIGUR_STANDARD[k.id]);
    });
    return ergebnis;
}

function profilName() {
    const name = (profil().name || "").trim();
    return name || t("Bauer");
}

// ---------- ZEICHNEN ----------

function figurGitter() {
    const raster = Array.from({ length: FIGUR_HOEHE }, () => Array(FIGUR_BREITE).fill(null));
    // Gezeichnet wird in Koordinaten ohne den Platz oben (0 = Kopfbereich), gespeichert um FIGUR_OBEN verschoben
    const setze = (x, y, farbe) => {
        const px = Math.round(x);
        const py = Math.round(y) + FIGUR_OBEN;
        if (px >= 0 && py >= 0 && px < FIGUR_BREITE && py < FIGUR_HOEHE) raster[py][px] = farbe;
    };
    return {
        raster,
        punkt: setze,
        rechteck(x, y, b, h, farbe) {
            for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < b; dx++) setze(x + dx, y + dy, farbe);
        },
        ellipse(cx, cy, rx, ry, farbe, filter) {
            for (let y = -FIGUR_OBEN; y < FIGUR_HOEHE - FIGUR_OBEN; y++) {
                for (let x = 0; x < FIGUR_BREITE; x++) {
                    const dx = (x + 0.5 - cx) / rx;
                    const dy = (y + 0.5 - cy) / ry;
                    if (dx * dx + dy * dy <= 1 && (!filter || filter(x, y))) setze(x, y, farbe);
                }
            }
        },
        linie(x0, y0, x1, y1, farbe) {
            const schritte = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
            for (let i = 0; i <= schritte; i++) setze(x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte, farbe);
        }
    };
}

// Koerperhaltung fuer eine Pose (Positionen in Pixeln des 18x26-Rasters)
function figurHaltung(pose, bild) {
    const h = { wippen: 0, sitzt: false, beinVorn: 0, beinHinten: 0, armVorn: "unten", armHinten: "unten", armSchwung: 0, lehnen: 0, werkzeug: null };
    if (pose === "laufen") {
        const s = [2, 0, -2, 0][bild % 4];
        h.beinVorn = s;
        h.beinHinten = -s;
        h.armSchwung = -s / 2;
        h.wippen = bild % 2 === 1 ? -1 : 0;
    } else if (pose === "sitzen" || pose === "schlafen") {
        h.sitzt = true;
        h.wippen = pose === "schlafen" && bild % 2 ? 1 : 0;
    } else if (pose === "winken") {
        h.armVorn = bild % 2 ? "winken2" : "winken";
    } else if (pose === "jubeln") {
        h.armVorn = "hoch";
        h.armHinten = "hoch";
        h.wippen = bild % 2 ? -1 : 0;
    } else if (pose === "tanzen") {
        h.lehnen = [-1, 0, 1, 0][bild % 4];
        h.armVorn = bild % 2 ? "hoch" : "unten";
        h.armHinten = bild % 2 ? "unten" : "hoch";
        h.beinVorn = bild % 2 ? 1 : 0;
        h.wippen = bild % 2 ? -1 : 0;
    } else if (pose === "hacken") {
        h.armVorn = ["vorn", "hoch", "schlag", "schlag"][bild % 4];
        h.armHinten = h.armVorn;
        h.werkzeug = ["hacke_vorn", "hacke_hoch", "hacke_unten", "hacke_unten"][bild % 4];
    }
    return h;
}

// ---------- KOPF ----------

// Seitenansicht (Blick nach rechts): grosse Chibi-Augen, Wange, kleiner Mund
function figurKopfSeite(g, cx, cy, geschlossen, augen, blinzelt) {
    g.haut.ellipse(cx, cy, 4.6, 4.5, "4");
    g.haut.ellipse(cx - 0.4, cy + 0.2, 4.4, 4.3, "s", (x, y) => y + 0.5 > cy + 2.4 && x + 0.5 < cx + 1);
    g.haut.punkt(cx - 1, cy + 0.5, "s");
    g.haut.punkt(cx + 3, cy + 1.6, "r");
    if (!geschlossen) g.haut.punkt(cx + 2, cy + 2.8, "m");
    const ax = Math.round(cx + 1);
    const ay = Math.round(cy);
    if (geschlossen || blinzelt) {
        g.augen.punkt(ax, ay, "7");
        g.augen.punkt(ax + 1, ay, "7");
    } else if (augen.form === "herz") {
        g.augen.rechteck(ax, ay - 1, 2, 2, "5");
        g.augen.punkt(ax + 0.5, ay + 1, "5");
    } else {
        g.augen.punkt(ax, ay - 1, "w");
        g.augen.punkt(ax + 1, ay - 1, "5");
        g.augen.rechteck(ax, ay, 2, 1, "5");
    }
}

// Vorderansicht: zwei Augen, zwei Wangen, Laecheln
function figurKopfVorne(g, cx, cy, geschlossen, augen, blinzelt) {
    g.haut.ellipse(cx, cy, 4.8, 4.5, "4");
    g.haut.ellipse(cx, cy, 4.8, 4.5, "s", (x, y) => y + 0.5 > cy + 2.8);
    const ay = Math.round(cy);
    const links = Math.round(cx - 3);
    const rechts = Math.round(cx + 2);
    [links, rechts].forEach(ax => {
        if (geschlossen || blinzelt) {
            g.augen.rechteck(ax, ay, 2, 1, "7");
        } else if (augen.form === "herz") {
            g.augen.rechteck(ax, ay - 1, 2, 2, "5");
            g.augen.punkt(ax + (ax === links ? 1 : 0), ay + 1, "5");
        } else {
            g.augen.punkt(ax, ay - 1, "w");
            g.augen.punkt(ax + 1, ay - 1, "5");
            g.augen.rechteck(ax, ay, 2, 1, "5");
        }
    });
    g.haut.punkt(links - 1, ay + 1.5, "r");
    g.haut.punkt(rechts + 2, ay + 1.5, "r");
    if (!geschlossen) {
        g.haut.punkt(cx - 0.6, ay + 2.4, "m");
        g.haut.punkt(cx + 0.4, ay + 2.4, "m");
    }
}

// Rueckansicht: nur Hinterkopf (die Haare liegen darueber)
function figurKopfHinten(g, cx, cy) {
    g.haut.ellipse(cx, cy, 4.8, 4.5, "4");
    g.haut.punkt(cx - 5, cy + 0.5, "s");
    g.haut.punkt(cx + 4, cy + 0.5, "s");
}

// ---------- HAARE ----------

function figurHaare(g, blick, cx, cy, form, bild) {
    const p = g.haare;
    if (form === "glatze") return;
    const glanz = pts => pts.forEach(([x, y]) => p.punkt(x, y, "h"));

    if (form === "iro") {
        if (blick === "vorne" || blick === "hinten") {
            p.rechteck(cx - 1, cy - 7, 2, 4, "2");
            p.punkt(cx - 1, cy - 7, "h");
        } else {
            p.rechteck(cx - 3, cy - 6, 6, 2, "2");
            p.rechteck(cx - 4, cy - 5, 2, 2, "2");
            p.rechteck(cx - 2, cy - 6, 3, 1, "h");
        }
        return;
    }
    if (form === "wolke") {
        const w = bild % 2 ? -0.5 : 0;
        const kugeln = blick === "seite"
            ? [[cx - 3, cy - 3], [cx, cy - 4.5], [cx + 3, cy - 3.2], [cx - 4.2, cy], [cx - 4, cy + 2.6]]
            : [[cx - 4, cy - 2.6], [cx - 1.5, cy - 4.8], [cx + 1.5, cy - 4.8], [cx + 4, cy - 2.6], [cx - 5, cy + 1], [cx + 5, cy + 1]];
        kugeln.forEach(([x, y]) => p.ellipse(x, y + w, 2.6, 2.3, "2"));
        glanz([[cx - 1, cy - 6 + w], [cx + 2, cy - 5.4 + w], [cx - 4, cy - 3 + w]]);
        if (blick === "hinten") p.ellipse(cx, cy, 5, 4.8, "2");
        return;
    }

    if (blick === "hinten") {
        // Hinterkopf: die Haare decken den ganzen Kopf
        p.ellipse(cx, cy, 5, 4.8, "2");
        glanz([[cx - 2, cy - 3.6], [cx - 1, cy - 4], [cx + 1, cy - 3.8]]);
        if (form === "kurz" || form === "flamme" || form === "stachel" || form === "locken" || form === "dutt") {
            p.rechteck(cx - 3, cy + 3.5, 6, 1, "2");
        }
    } else if (blick === "vorne") {
        // Oben und an den Seiten, vorne ein gezackter Pony
        p.ellipse(cx, cy, 5, 4.8, "2", (x, y) => y + 0.5 < cy - 1.4 || ((x + 0.5 < cx - 3.7 || x + 0.5 > cx + 3.7) && y + 0.5 < cy + 1.6));
        const pony = Math.round(cy - 1.4);
        [cx - 4, cx - 3, cx - 1, cx, cx + 2, cx + 3].forEach(x => p.punkt(x, pony, "2"));
        glanz([[cx - 2, cy - 3.8], [cx - 1, cy - 4.2], [cx + 2, cy - 3.6]]);
    } else {
        // Seite: Kappe oben und hinten, vorne eine kleine Strähne, Koteletten
        p.ellipse(cx, cy, 5, 4.9, "2", (x, y) => y + 0.5 < cy - 1.2 || (x + 0.5 < cx - 1.4 && y + 0.5 < cy + 2.4));
        p.punkt(cx + 3, cy - 2, "2");
        p.punkt(cx + 4, cy - 1.4, "2");
        p.rechteck(cx - 1, cy - 1, 1, 2, "2");
        glanz([[cx - 1, cy - 4], [cx, cy - 4.2], [cx + 1, cy - 3.8]]);
    }

    const seite = blick === "seite";
    if (form === "lang" || form === "sterne") {
        if (seite) {
            p.rechteck(cx - 5, cy, 3, 8, "2");
            p.punkt(cx - 2, cy + 3, "2");
            p.punkt(cx - 4, cy + 7, "h");
        } else {
            p.rechteck(cx - 6, cy - 1, 2, 9, "2");
            p.rechteck(cx + 4, cy - 1, 2, 9, "2");
            if (blick === "hinten") p.rechteck(cx - 4, cy + 2, 8, 6, "2");
        }
        if (form === "sterne") glanz(seite ? [[cx - 4, cy + 2], [cx - 3, cy + 5], [cx + 2, cy - 3.8]] : [[cx - 5, cy + 3], [cx + 5, cy + 5], [cx, cy - 4]]);
    } else if (form === "zopf") {
        const schwung = bild % 2 ? 1 : 0;
        if (seite) {
            p.rechteck(cx - 7 + schwung, cy - 1, 2, 6, "2");
            p.punkt(cx - 5, cy - 1, "h");
        } else if (blick === "hinten") {
            p.rechteck(cx - 1 + schwung, cy + 2, 2, 7, "2");
            p.punkt(cx - 1 + schwung, cy + 2, "h");
        } else {
            p.rechteck(cx + 5, cy - 1 + schwung, 2, 5, "2");
        }
    } else if (form === "zoepfe") {
        if (seite) {
            p.rechteck(cx - 5, cy + 1, 2, 7, "2");
            p.rechteck(cx - 5, cy + 8, 2, 1, "h");
        } else {
            p.rechteck(cx - 6, cy + 1, 2, 7, "2");
            p.rechteck(cx + 4, cy + 1, 2, 7, "2");
            p.rechteck(cx - 6, cy + 8, 2, 1, "h");
            p.rechteck(cx + 4, cy + 8, 2, 1, "h");
        }
    } else if (form === "locken") {
        const kugeln = seite
            ? [[cx - 5, cy - 2], [cx - 3, cy - 4.6], [cx, cy - 5.4], [cx + 3, cy - 4.4], [cx - 5.2, cy + 1.4]]
            : [[cx - 4.4, cy - 3], [cx - 1.6, cy - 5], [cx + 1.6, cy - 5], [cx + 4.4, cy - 3], [cx - 5.4, cy + 0.6], [cx + 5.4, cy + 0.6]];
        kugeln.forEach(([x, y]) => p.ellipse(x, y, 1.6, 1.6, "2"));
    } else if (form === "dutt") {
        const x = seite ? cx - 3 : cx;
        p.ellipse(x, cy - 5.4, 2, 1.9, "2");
        p.punkt(x, cy - 6, "h");
    } else if (form === "stachel") {
        const spitzen = seite
            ? [[cx - 4, cy - 6, cx - 3, cy - 3], [cx - 1, cy - 7, cx, cy - 4], [cx + 2, cy - 6.5, cx + 2, cy - 4], [cx - 6, cy - 3, cx - 4, cy - 2]]
            : [[cx - 4, cy - 6.5, cx - 3, cy - 3.5], [cx, cy - 8, cx, cy - 4.5], [cx + 4, cy - 6.5, cx + 3, cy - 3.5], [cx - 6, cy - 3, cx - 4, cy - 2], [cx + 6, cy - 3, cx + 4, cy - 2]];
        spitzen.forEach(([x0, y0, x1, y1]) => p.linie(x0, y0, x1, y1, "2"));
    } else if (form === "flamme") {
        const hoehen = [[3, 5, 2, 4, 3], [4, 3, 5, 2, 4]][bild % 2];
        const spalten = seite ? [cx - 3, cx - 1, cx + 1, cx + 3] : [cx - 4, cx - 2, cx, cx + 2, cx + 4];
        spalten.forEach((x, i) => p.rechteck(x, cy - 4 - hoehen[i], 1, hoehen[i], i % 2 ? "h" : "2"));
    }
}

// ---------- HUT ----------

function figurHut(g, blick, cx, cy, form, bild) {
    const p = g.kopf;
    const oben = Math.round(cy - 4.6);
    const vorne = blick !== "seite";
    if (form === "strohhut") {
        p.rechteck(cx - 7, oben + 1, 15, 1, "a");
        p.rechteck(vorne ? cx - 4 : cx - 3, oben - 2, vorne ? 9 : 7, 3, "a");
        p.rechteck(vorne ? cx - 4 : cx - 3, oben, vorne ? 9 : 7, 1, "c");
        [cx - 6, cx - 2, cx + 3, cx + 6].forEach(x => p.punkt(x, oben + 1, "b"));
        p.punkt(cx - 1, oben - 2, "b");
    } else if (form === "muetze") {
        p.ellipse(cx, oben + 1, 5.2, 3.6, "a", (x, y) => y + 0.5 < oben + 2.2);
        p.rechteck(cx - 5, oben + 1, 11, 1, "b");
        for (let x = cx - 4; x <= cx + 4; x += 2) p.punkt(x, oben - 1, "b");
        p.ellipse(vorne ? cx : cx - 1, oben - 2.4, 1.4, 1.4, "c");
    } else if (form === "kappe") {
        p.ellipse(cx, oben + 1, 5, 3.3, "a", (x, y) => y + 0.5 < oben + 2);
        if (vorne) p.rechteck(cx - 4, oben + 1, 9, 1, "b");
        else p.rechteck(cx + 2, oben + 1, 5, 1, "b");
        p.punkt(cx, oben - 1, "c");
        if (blick === "vorne") p.punkt(cx, oben, "c");
    } else if (form === "kranz") {
        p.rechteck(cx - 5, oben + 1, 11, 1, "a");
        const blueten = vorne ? [cx - 4, cx - 2, cx, cx + 2, cx + 4] : [cx - 4, cx - 1, cx + 2];
        blueten.forEach((x, i) => {
            p.punkt(x, oben, i % 2 ? "c" : "b");
            p.punkt(x, oben + 1, i % 2 ? "b" : "c");
        });
    } else if (form === "hexe") {
        p.rechteck(cx - 8, oben + 1, 17, 1, "a");
        p.rechteck(cx - 4, oben - 1, 9, 2, "a");
        p.rechteck(cx - 3, oben - 3, 7, 2, "a");
        p.rechteck(cx - 2, oben - 5, 5, 2, "a");
        p.rechteck(cx - 1, oben - 6, 3, 1, "a");
        p.punkt(vorne ? cx + 2 : cx - 2, oben - 7, "a");
        p.rechteck(cx - 4, oben, 9, 1, "c");
        p.punkt(cx, oben, "b");
    } else if (form === "ohren") {
        (vorne ? [cx - 5, cx + 3] : [cx - 3, cx + 1]).forEach(x0 => {
            p.rechteck(x0, oben - 1, 3, 2, "a");
            p.punkt(x0 + 1, oben - 2, "a");
            if (blick !== "hinten") p.punkt(x0 + 1, oben - 1, "b");
        });
    } else if (form === "kopfhoerer") {
        p.ellipse(cx, cy, 5.6, 5.5, "a", (x, y) => y + 0.5 < oben + 1.2);
        if (vorne) {
            p.rechteck(cx - 6, cy - 1, 2, 3, "b");
            p.rechteck(cx + 5, cy - 1, 2, 3, "b");
        } else {
            p.rechteck(cx - 2, cy - 1, 2, 3, "b");
            p.punkt(cx - 2, cy - 1, "c");
        }
    } else if (form === "krone") {
        p.rechteck(cx - 4, oben - 1, 9, 2, "a");
        [cx - 4, cx - 2, cx, cx + 2, cx + 4].forEach((x, i) => p.punkt(x, oben - 2 - (i % 2 ? 0 : 1), "a"));
        [cx - 2, cx + 2].forEach(x => p.punkt(x, oben, "c"));
        p.punkt(cx, oben - 1, "c");
        p.rechteck(cx - 4, oben + 1, 9, 1, "b");
    } else if (form === "schein") {
        // Ring ueber dem Kopf, schwebt leicht auf und ab
        const y = oben - 3 + (bild % 2 ? -1 : 0);
        p.rechteck(cx - 2, y - 1, 5, 1, "a");
        p.rechteck(cx - 2, y + 1, 5, 1, "b");
        p.punkt(cx - 3, y, "a");
        p.punkt(cx + 3, y, "b");
        p.punkt(cx - 1, y - 1, "c");
    } else if (form === "pilz") {
        p.ellipse(cx, oben + 0.6, 6.6, 3.8, "a", (x, y) => y + 0.5 < oben + 1.6);
        [[cx - 3, oben - 1], [cx + 1, oben - 2], [cx + 4, oben], [cx - 5, oben + 1], [cx + 2, oben]].forEach(([x, y]) => p.punkt(x, y, "c"));
        p.rechteck(cx - 6, oben + 1, 13, 1, "b");
    }
}

// ---------- OBERTEIL ----------

// x0 = linke Kante des Oberkoerpers, y0 = Schulterhoehe. Seite: 5 breit (Blick nach rechts), vorne/hinten: 6 breit
function figurOberteil(g, blick, h, x0, y0, oberteil, ohneArme) {
    const k = g.kleidung;
    const form = oberteil.form;
    const breite = blick === "seite" ? 5 : 6;
    const mitte = x0 + breite / 2;
    // Umhang haengt hinter dem Koerper
    if (form === "umhang") {
        const wehen = h.armSchwung ? 1 : 0;
        const lang = h.sitzt ? 6 : 10;
        if (blick === "seite") {
            g.hinten.rechteck(x0 - 2 - wehen, y0, 3, lang, "8");
            [[x0 - 2 - wehen, y0 + 3], [x0 - 1 - wehen, y0 + 7]].forEach(([x, y]) => g.hinten.punkt(x, y, "k"));
        } else {
            g.hinten.rechteck(x0 - 2, y0, breite + 4, lang, "8");
            [[x0 - 1, y0 + 4], [x0 + breite, y0 + 7], [x0 + 2, y0 + 8]].forEach(([x, y]) => g.hinten.punkt(x, y, "k"));
        }
    }
    k.rechteck(x0, y0, breite, 6, "6");
    // Schatten: hinten bzw. unten
    if (blick === "seite") k.rechteck(x0, y0, 1, 6, "8");
    else k.rechteck(x0, y0 + 5, breite, 1, "8");

    if (form === "latz") {
        if (blick === "seite") {
            k.rechteck(x0, y0, breite, 2, "k");
            k.punkt(x0 + 3, y0, "6");
            k.punkt(x0 + 3, y0 + 3, "8");
        } else if (blick === "vorne") {
            k.rechteck(x0, y0, breite, 6, "k");
            k.rechteck(x0 + 1, y0 + 2, breite - 2, 4, "6");
            k.punkt(x0 + 1, y0, "6");
            k.punkt(x0 + 1, y0 + 1, "6");
            k.punkt(x0 + breite - 2, y0, "6");
            k.punkt(x0 + breite - 2, y0 + 1, "6");
            k.punkt(mitte - 0.5, y0 + 3, "8");
        } else {
            k.rechteck(x0, y0, breite, 4, "k");
            k.linie(x0 + 1, y0, x0 + breite - 2, y0 + 3, "6");
            k.linie(x0 + breite - 2, y0, x0 + 1, y0 + 3, "6");
            k.rechteck(x0, y0 + 4, breite, 2, "6");
        }
    } else if (form === "pulli") {
        k.rechteck(x0, y0 + 5, breite, 1, "8");
        if (blick === "vorne") k.rechteck(x0 + 2, y0, 2, 1, "8");
    } else if (form === "karo") {
        for (let y = 0; y < 6; y++) for (let x = 0; x < breite; x++) if ((x + y) % 3 === 0) k.punkt(x0 + x, y0 + y, "8");
        if (blick === "vorne") {
            k.punkt(mitte - 1, y0, "k");
            k.punkt(mitte, y0, "k");
            k.rechteck(mitte - 0.5, y0 + 1, 1, 5, "k");
        } else if (blick === "seite") {
            k.punkt(x0 + 3, y0, "k");
            k.punkt(x0 + 4, y0, "k");
        }
    } else if (form === "hoodie") {
        if (blick === "seite") {
            k.rechteck(x0 - 1, y0 - 1, 3, 2, "8");
            k.rechteck(x0 + 2, y0 + 3, 3, 2, "k");
        } else if (blick === "vorne") {
            k.rechteck(x0, y0, breite, 1, "8");
            k.punkt(mitte - 1, y0 + 1, "k");
            k.punkt(mitte, y0 + 1, "k");
            k.rechteck(x0 + 1, y0 + 3, breite - 2, 2, "k");
        } else {
            k.rechteck(x0 + 1, y0, breite - 2, 3, "8");
        }
    } else if (form === "kimono") {
        if (blick === "vorne") {
            k.linie(x0, y0, mitte - 0.5, y0 + 3, "k");
            k.linie(x0 + breite - 1, y0, mitte + 0.5, y0 + 3, "k");
        } else if (blick === "seite") {
            k.linie(x0 + 4, y0, x0 + 2, y0 + 3, "k");
        }
        k.rechteck(x0, y0 + 3, breite, 1, "k");
        if (blick === "hinten") k.rechteck(mitte - 1.5, y0 + 2, 3, 3, "k");
    } else if (form === "matrose") {
        if (blick === "vorne") {
            k.rechteck(x0, y0, 2, 2, "k");
            k.rechteck(x0 + breite - 2, y0, 2, 2, "k");
            k.punkt(mitte - 0.5, y0 + 2, "k");
        } else if (blick === "hinten") {
            k.rechteck(x0, y0, breite, 3, "k");
            k.rechteck(x0 + 1, y0 + 1, breite - 2, 1, "6");
        } else {
            k.rechteck(x0, y0, 3, 2, "k");
            k.punkt(x0 + 4, y0 + 1, "k");
            k.punkt(x0 + 4, y0 + 2, "k");
        }
    } else if (form === "weste") {
        if (blick === "vorne") {
            k.rechteck(mitte - 1, y0, 2, 6, "k");
            k.punkt(mitte - 2, y0 + 2, "8");
            k.punkt(mitte + 1, y0 + 2, "8");
        } else if (blick === "seite") {
            k.rechteck(x0 + 3, y0, 2, 6, "k");
            k.punkt(x0 + 3, y0 + 2, "8");
            k.punkt(x0 + 3, y0 + 4, "8");
        }
    } else if (form === "umhang") {
        k.punkt(blick === "seite" ? x0 + 4 : mitte - 0.5, y0, "k");
        if (blick === "vorne") k.punkt(mitte + 0.5, y0, "k");
    } else if (form === "kleid") {
        k.rechteck(x0 - 1, y0 + 4, breite + 2, 3, "6");
        k.rechteck(x0 - 2, y0 + 6, breite + 4, 1, "8");
        [[x0, y0 + 5], [x0 + 3, y0 + 1], [x0 + breite, y0 + 6], [x0 + 2, y0 + 4]].forEach(([x, y]) => k.punkt(x, y, "k"));
    }
}

// ---------- ARME, BEINE, WERKZEUG ----------

// Arm von der Schulter (sx, sy); farbe = Aermel, dahinter liegende Arme sind etwas dunkler (Hand "s")
function figurArm(g, sx, sy, art, schwung, farbe, hinten) {
    const k = g.kleidung;
    const hand = hinten ? "s" : "4";
    if (art === "hoch" || art === "winken" || art === "winken2") {
        const x = art === "winken2" ? sx + 1 : sx;
        k.rechteck(x, sy - 4, 2, 5, farbe);
        g.haut.rechteck(x, sy - 5, 2, 1, hand);
    } else if (art === "vorn") {
        k.rechteck(sx, sy, 4, 2, farbe);
        g.haut.rechteck(sx + 4, sy, 1, 2, hand);
    } else if (art === "schlag") {
        k.rechteck(sx + 1, sy + 1, 2, 3, farbe);
        g.haut.rechteck(sx + 2, sy + 4, 2, 1, hand);
    } else {
        k.rechteck(sx + schwung, sy, 2, 4, farbe);
        g.haut.rechteck(sx + schwung, sy + 4, 2, 1, hand);
    }
}

function figurWerkzeug(g, art, x, y) {
    const w = g.werkzeug;
    if (art === "hacke_vorn") {
        w.linie(x + 1, y + 2, x + 6, y - 3, "t");
        w.rechteck(x + 6, y - 4, 2, 1, "e");
        w.punkt(x + 7, y - 3, "e");
    } else if (art === "hacke_hoch") {
        w.linie(x, y - 3, x - 2, y - 10, "t");
        w.rechteck(x - 4, y - 11, 3, 1, "e");
        w.punkt(x - 4, y - 10, "e");
    } else if (art === "hacke_unten") {
        w.linie(x + 2, y + 3, x + 6, y + 8, "t");
        w.rechteck(x + 6, y + 8, 1, 3, "e");
        w.punkt(x + 7, y + 10, "e");
    }
}

// Beine mit Hose und Schuhen; x-Werte der beiden Beine, oben = Hueft-Hoehe
function figurBeine(g, beine, oben, hose, schuhe, blick) {
    const k = g.kleidung;
    const stiefel = schuhe.form === "stiefel";
    const rock = hose.form === "rock";
    beine.forEach(([x, dunkel]) => {
        const hoch = 24 - oben;
        // Rock: die Beine darunter sind Haut, Shorts: nur oben Stoff
        if (rock) g.haut.rechteck(x, oben + 2, 2, hoch - 2, dunkel ? "s" : "4");
        else if (hose.form === "shorts") {
            k.rechteck(x, oben, 2, 3, dunkel ? "9" : "3");
            g.haut.rechteck(x, oben + 3, 2, hoch - 3, dunkel ? "s" : "4");
        } else k.rechteck(x, oben, 2, hoch, dunkel ? "9" : "3");
        if (stiefel) k.rechteck(x, 21, 2, 3, "1");
        // Schuhe: seitlich nach vorne, sonst breit
        if (blick === "seite") {
            k.rechteck(x, 24, 3, 1, "1");
            k.punkt(x + 2, 24, "l");
        } else {
            k.rechteck(x - (x < 9 ? 1 : 0), 24, 3, 1, "1");
            k.punkt(x < 9 ? x - 1 : x + 2, 24, "l");
        }
        if (schuhe.form === "wolke") {
            k.punkt(x - 1, 23, "l");
            k.punkt(x + 2, 23, "l");
        }
    });
    if (rock) {
        const breit = blick === "seite" ? 0 : 1;
        k.rechteck(6 - breit, oben, 6 + 2 * breit, 2, "3");
        k.rechteck(5 - breit, oben + 2, 8 + 2 * breit, 1, "9");
    }
    if (hose.form === "sterne") {
        beine.forEach(([x], i) => {
            k.punkt(x + (i % 2), oben + 2, "k");
            k.punkt(x + 1 - (i % 2), oben + 4, "k");
        });
    }
}

// ---------- ACCESSOIRES ----------

function figurAccessoire(g, blick, cx, cy, y0, x0, acc, bild) {
    const a = g.accessoire;
    const hinten = g.hinten;
    const form = acc.form;
    if (!form || form === "keins") return;
    const ay = Math.round(cy);
    const seite = blick === "seite";
    const breite = seite ? 5 : 6;
    if (form === "brille" || form === "herzbrille") {
        if (blick === "hinten") {
            a.punkt(cx - 5, ay - 1, "x");
            a.punkt(cx + 4, ay - 1, "x");
            return;
        }
        const glaeser = seite ? [Math.round(cx + 1)] : [Math.round(cx - 3), Math.round(cx + 2)];
        glaeser.forEach(gx => {
            a.rechteck(gx, ay - 1, 2, 2, "y");
            if (form === "herzbrille") {
                a.punkt(gx, ay - 1, "x");
                a.punkt(gx + 1, ay - 1, "x");
                a.punkt(gx + 0.5, ay + 1, "x");
            } else {
                a.punkt(gx, ay - 1, "z");
            }
        });
        if (seite) a.rechteck(cx - 2, ay - 1, 3, 1, "x");
        else {
            a.rechteck(cx - 1, ay - 1, 3, 1, "x");
            a.punkt(cx - 4, ay - 1, "x");
            a.punkt(cx + 4, ay - 1, "x");
        }
    } else if (form === "monokel") {
        if (blick === "hinten") return;
        const gx = seite ? Math.round(cx + 1) : Math.round(cx + 2);
        a.rechteck(gx - 1, ay - 2, 4, 1, "x");
        a.rechteck(gx - 1, ay + 1, 4, 1, "x");
        a.rechteck(gx - 1, ay - 1, 1, 2, "x");
        a.rechteck(gx + 2, ay - 1, 1, 2, "x");
        a.linie(gx + 2, ay + 2, gx + 2, ay + 5, "x");
    } else if (form === "schal") {
        a.rechteck(seite ? x0 - 1 : x0 - 1, y0 - 1, breite + 2, 2, "x");
        for (let x = 0; x < breite + 2; x += 2) a.punkt(x0 - 1 + x, y0 - 1, "y");
        if (seite) a.rechteck(x0 - 2, y0 + 1, 2, 4, "x");
        else if (blick === "vorne") a.rechteck(x0 + breite - 2, y0 + 1, 2, 4, "x");
        else a.rechteck(x0 + 1, y0 + 1, 2, 3, "x");
        a.punkt(seite ? x0 - 2 : x0 + breite - 2, y0 + 5, "z");
    } else if (form === "rucksack") {
        if (seite) {
            hinten.rechteck(x0 - 3, y0, 3, 5, "x");
            hinten.rechteck(x0 - 3, y0, 3, 1, "y");
            hinten.punkt(x0 - 2, y0 + 2, "z");
            a.linie(x0, y0, x0 + 1, y0 + 3, "y");
        } else if (blick === "vorne") {
            a.rechteck(x0 + 1, y0, 1, 4, "y");
            a.rechteck(x0 + breite - 2, y0, 1, 4, "y");
        } else {
            a.rechteck(x0, y0, breite, 5, "x");
            a.rechteck(x0, y0, breite, 1, "y");
            a.rechteck(x0 + 1, y0 + 2, breite - 2, 2, "y");
            a.punkt(x0 + breite / 2, y0 + 1, "z");
        }
    } else if (form === "kette" || form === "lei") {
        if (blick === "hinten") return;
        const farben = form === "lei" ? ["x", "y", "z"] : ["x", "y"];
        // Bogen ueber die Brust (Blumenkette: doppelt so breit)
        const punkte = seite ? [[x0 + 4, y0], [x0 + 4, y0 + 1], [x0 + 3, y0 + 2]]
            : [[x0, y0], [x0 + 1, y0 + 1], [x0 + 2, y0 + 2], [x0 + 3, y0 + 2], [x0 + 4, y0 + 1], [x0 + 5, y0]];
        if (form === "lei" && !seite) punkte.push([x0 + 1, y0 + 2], [x0 + 2, y0 + 3], [x0 + 3, y0 + 3], [x0 + 4, y0 + 2], [x0, y0 + 1], [x0 + 5, y0 + 1]);
        punkte.forEach(([x, y], i) => a.punkt(x, y, farben[i % farben.length]));
    } else if (form === "fliege") {
        if (blick === "hinten") return;
        const x = seite ? x0 + 4 : Math.round(x0 + breite / 2 - 1);
        if (seite) {
            a.punkt(x, y0, "x");
            a.punkt(x, y0 + 1, "y");
        } else {
            a.rechteck(x - 1, y0, 1, 2, "x");
            a.rechteck(x + 2, y0, 1, 2, "x");
            a.rechteck(x, y0, 2, 1, "y");
            a.punkt(x, y0 + 1, "z");
        }
    } else if (form === "fluegel" || form === "fledermaus") {
        // Fluegel am Ruecken, schlagen im Takt
        const auf = bild % 2 === 0;
        const fleder = form === "fledermaus";
        const fluegel = (fx, richtung) => {
            const spitze = auf ? -6 : -3;
            if (fleder) {
                hinten.linie(fx, y0, fx + richtung * 5, y0 + spitze, "x");
                hinten.linie(fx + richtung * 5, y0 + spitze, fx + richtung * 6, y0 + 4, "x");
                for (let i = 1; i <= 5; i++) hinten.linie(fx, y0 + 1, fx + richtung * i, y0 + spitze + i + 1, i % 2 ? "y" : "x");
                hinten.punkt(fx + richtung * 3, y0 + 2, "z");
            } else {
                hinten.ellipse(fx + richtung * 3, y0 + spitze / 2, 3, 3.4, "x");
                hinten.ellipse(fx + richtung * 2, y0 + 4, 2, 2, "y");
                hinten.punkt(fx + richtung * 3, y0 + spitze / 2 - 1, "z");
            }
        };
        if (seite) fluegel(x0, -1);
        else {
            fluegel(x0, -1);
            fluegel(x0 + breite - 1, 1);
        }
    }
}

// ---------- DIE GANZE FIGUR ----------
// blick: "seite" (Blick nach rechts, fuer links wird gespiegelt), "vorne" oder "hinten"
function figurRaster(pose, bild, blinzelt, teile, blick = "seite") {
    const g = {};
    FIGUR_SCHICHTEN.forEach(s => { g[s] = figurGitter(); });
    const h = figurHaltung(pose, bild);
    // Werkzeug und Laufen gehen nur von der Seite
    if (h.werkzeug || pose === "laufen") blick = "seite";
    const geschlossen = pose === "schlafen";
    const w = h.wippen;
    const cx = 9 + h.lehnen;
    const aermel = teile.oberteil.form === "latz" ? "k" : "6";

    if (blick === "seite") {
        if (h.sitzt) {
            const cy = 10.5 + w;
            const y0 = 15 + w;
            g.kleidung.rechteck(8, 21, 6, 2, "3");
            g.kleidung.rechteck(8, 22, 6, 1, "9");
            if (teile.hose.form === "shorts") g.haut.rechteck(11, 21, 3, 2, "4");
            if (teile.hose.form === "rock") g.kleidung.rechteck(6, 20, 6, 2, "3");
            g.kleidung.rechteck(14, 20, 1, 3, "1");
            g.kleidung.punkt(14, 20, "l");
            figurOberteil(g, "seite", h, 6, y0, teile.oberteil);
            g.haut.rechteck(8, y0 - 1, 2, 1, "4");
            figurArm(g, 9, y0 + 1, "vorn", 0, aermel, false);
            figurKopfSeite(g, cx, cy, geschlossen, teile.augen, blinzelt);
            figurHaare(g, "seite", cx, cy, teile.frisur.form, bild);
            figurHut(g, "seite", cx, cy, teile.kopf.form, bild);
            figurAccessoire(g, "seite", cx, cy, y0, 6, teile.accessoire, bild);
        } else {
            const cy = 6.6 + w;
            const y0 = 12 + w;
            figurBeine(g, [[7 + h.beinHinten, true], [9 + h.beinVorn, false]], 18 + w, teile.hose, teile.schuhe, "seite");
            figurArm(g, 6 + h.lehnen, y0 + 1, h.armHinten, -h.armSchwung, "8", true);
            figurOberteil(g, "seite", h, 6 + h.lehnen, y0, teile.oberteil);
            g.haut.rechteck(8 + h.lehnen, y0 - 1, 2, 1, "4");
            figurArm(g, 9 + h.lehnen, y0 + 1, h.armVorn, h.armSchwung, aermel, false);
            if (h.werkzeug) figurWerkzeug(g, h.werkzeug, 10 + h.lehnen, y0 + 1);
            figurKopfSeite(g, cx, cy, geschlossen, teile.augen, blinzelt);
            figurHaare(g, "seite", cx, cy, teile.frisur.form, bild);
            figurHut(g, "seite", cx, cy, teile.kopf.form, bild);
            figurAccessoire(g, "seite", cx, cy, y0, 6 + h.lehnen, teile.accessoire, bild);
        }
    } else {
        // Von vorne bzw. hinten: symmetrisch, der Koerper ist 6 Pixel breit
        const vorne = blick === "vorne";
        const cy = (h.sitzt ? 10.6 : 6.6) + w;
        const y0 = (h.sitzt ? 16 : 12) + w;
        const x0 = 6 + h.lehnen;
        if (h.sitzt) {
            // sitzt im Schneidersitz, die Knie zeigen nach vorne
            g.kleidung.rechteck(4, 22, 10, 2, "3");
            g.kleidung.rechteck(4, 23, 10, 1, "9");
            if (teile.hose.form === "shorts" || teile.hose.form === "rock") g.haut.rechteck(4, 23, 10, 1, "4");
            g.kleidung.rechteck(3, 23, 2, 2, "1");
            g.kleidung.rechteck(13, 23, 2, 2, "1");
        } else {
            figurBeine(g, [[6 + h.beinVorn * 0, false], [10, false]], 18 + w, teile.hose, teile.schuhe, blick);
            // Huefte (verbindet die Beine)
            if (teile.hose.form !== "rock") g.kleidung.rechteck(6, 18 + w, 6, 1, teile.hose.form === "shorts" ? "3" : "3");
        }
        figurOberteil(g, blick, h, x0, y0, teile.oberteil);
        g.haut.rechteck(x0 + 2, y0 - 1, 2, 1, vorne ? "4" : "s");
        // Arme links und rechts vom Koerper
        const armL = h.armHinten === "hoch" ? "hoch" : "unten";
        const armR = h.armVorn === "hoch" || h.armVorn === "winken" || h.armVorn === "winken2" ? h.armVorn : "unten";
        figurArm(g, x0 - 2, y0, h.sitzt ? "unten" : armL, 0, aermel, !vorne);
        figurArm(g, x0 + 6, y0, h.sitzt ? "unten" : armR, 0, aermel, !vorne);
        if (vorne) figurKopfVorne(g, cx, cy, geschlossen, teile.augen, blinzelt);
        else figurKopfHinten(g, cx, cy);
        figurHaare(g, blick, cx, cy, teile.frisur.form, bild);
        figurHut(g, blick, cx, cy, teile.kopf.form, bild);
        figurAccessoire(g, blick, cx, cy, y0, x0, teile.accessoire, bild);
    }

    // Umriss: jedes leere Pixel neben irgendeiner Schicht (direkt im Raster, ohne Verschiebung)
    const voll = (x, y) => x >= 0 && y >= 0 && x < FIGUR_BREITE && y < FIGUR_HOEHE &&
        FIGUR_SCHICHTEN.some(s => s !== "umriss" && g[s].raster[y][x]);
    for (let y = 0; y < FIGUR_HOEHE; y++) {
        for (let x = 0; x < FIGUR_BREITE; x++) {
            if (voll(x, y)) continue;
            if (voll(x - 1, y) || voll(x + 1, y) || voll(x, y - 1) || voll(x, y + 1)) g.umriss.raster[y][x] = "7";
        }
    }
    // Schatten auf dem Boden (unterste Zeile)
    const boden = FIGUR_HOEHE - 1;
    for (let x = 4; x < 15; x++) if (!g.umriss.raster[boden][x] && !voll(x, boden)) g.umriss.raster[boden][x] = "q";
    return g;
}

const figurUrlCache = {};

function figurFarben(teile) {
    return {
        ...FIGUR_FESTE_FARBEN, q: "rgba(0, 0, 0, 0.18)",
        ...teile.haut.farben, ...teile.augen.farben, ...teile.haarfarbe.farben, ...teile.oberteil.farben,
        ...teile.hose.farben, ...teile.schuhe.farben, ...(teile.kopf.farben || {}), ...(teile.accessoire.farben || {})
    };
}

// Bild-URLs aller Schichten fuer eine Pose (zwischengespeichert)
function figurUrls(teile, pose, bild, blinzelt, blick = "seite") {
    const schluessel = FIGUR_KATEGORIEN.map(k => teile[k.id].id).join(",") + "|" + pose + "|" + bild + "|" + (blinzelt ? 1 : 0) + "|" + blick;
    if (!figurUrlCache[schluessel]) {
        const g = figurRaster(pose, bild, blinzelt, teile, blick);
        const farben = figurFarben(teile);
        const urls = {};
        FIGUR_SCHICHTEN.forEach(s => {
            const zeilen = g[s].raster.map(zeile => zeile.map(f => f || ".").join(""));
            urls[s] = zeilen.some(z => /[^.]/.test(z)) ? zeichneSprite(zeilen, farben).toDataURL() : "";
        });
        figurUrlCache[schluessel] = urls;
    }
    return figurUrlCache[schluessel];
}

// Welche Schicht bekommt welchen Effekt (nur Aussehen)
function figurSchichtFx(teile) {
    return {
        haut: teile.haut.fx, augen: teile.augen.fx, haare: teile.haarfarbe.fx || teile.frisur.fx,
        kleidung: teile.oberteil.fx || teile.hose.fx || teile.schuhe.fx, kopf: teile.kopf.fx,
        accessoire: teile.accessoire.fx, hinten: teile.accessoire.fx || teile.oberteil.fx
    };
}

// Eine Figur als Element mit gestapelten Schicht-Bildern (fuer Hof, Profil-Vorschau und Kacheln)
function erstelleFigurBild(groesse) {
    const huelle = el("div", "figur-bild");
    huelle.style.width = FIGUR_BREITE * groesse + "px";
    huelle.style.height = FIGUR_HOEHE * groesse + "px";
    const bilder = {};
    FIGUR_SCHICHTEN.forEach(s => {
        const img = document.createElement("img");
        img.alt = "";
        img.draggable = false;
        img.className = "figur-schicht schicht-" + s;
        huelle.appendChild(img);
        bilder[s] = img;
    });
    return { huelle, bilder, letzte: {} };
}

function zeigeFigurBild(bild, teile, pose, nummer, blinzelt, blick = "seite") {
    const urls = figurUrls(teile, pose, nummer % (FIGUR_BILDER[pose] || 1), blinzelt, blick);
    const fx = figurSchichtFx(teile);
    FIGUR_SCHICHTEN.forEach(s => {
        const img = bild.bilder[s];
        if (bild.letzte[s] !== urls[s]) {
            bild.letzte[s] = urls[s];
            if (urls[s]) img.src = urls[s];
            img.style.visibility = urls[s] ? "" : "hidden";
        }
        const teilMitFx = fx[s];
        const klasse = "figur-schicht schicht-" + s + (teilMitFx ? " fx-" + teilMitFx : "");
        if (img.className !== klasse) img.className = klasse;
    });
    // Farbe fuer Leuchten und Funkeln
    const leuchtTeil = [teile.augen, teile.kopf, teile.accessoire, teile.frisur, teile.haarfarbe, teile.haut, teile.oberteil].find(tl => tl.fxFarbe);
    if (leuchtTeil) bild.huelle.style.setProperty("--fx-farbe", leuchtTeil.fxFarbe);
    bild.huelle.classList.toggle("fx-schwebt", Object.values(teile).some(tl => tl.fx === "schweben" || tl.fx === "geist"));
}

// ---------- FIGUREN AUF DEM HOF ----------
// Jede Figur: { art: "mensch" | "begleiter", teile/skin, name, partner, x, zielX, richtung, zustand, ... }

const figuren = [];

function neueFigur(art, optionen) {
    const f = {
        art, x: 36 + Math.random() * 28, zielX: 50, richtung: 1, zustand: "stehen", zustandMs: 2000, bild: 0, bildMs: 0,
        blinzelMs: 2500, blinzeltBis: 0, idleMs: 9000 + Math.random() * 6000, zzzMs: 0, effektMs: 0, ...optionen
    };
    const huelle = el("div", "hof-objekt hof-figur " + (art === "mensch" ? "figur-mensch" : "figur-begleiter") + (f.partner ? " figur-partner" : ""));
    if (art === "mensch") {
        f.bildEl = erstelleFigurBild(HOF_PIXEL - 1); // etwas groesser als der Begleiter
        huelle.appendChild(f.bildEl.huelle);
    } else {
        const img = document.createElement("img");
        img.alt = "";
        img.draggable = false;
        img.style.width = HAUSTIER_BREITE * HOF_PIXEL + "px";
        img.style.height = HAUSTIER_HOEHE * HOF_PIXEL + "px";
        huelle.appendChild(img);
        f.img = img;
    }
    if (f.name) {
        f.schild = el("div", "figur-name", f.name);
        huelle.appendChild(f.schild);
    }
    huelle.style.left = f.x + "%";
    hofEbene.appendChild(huelle);
    f.el = huelle;

    if (art === "mensch") {
        setzeTipp(huelle, f.partner ? f.name : t("Du · Herzen (Linksklick) · Emotes (Rechtsklick)"));
        huelle.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;
            zeigeHerzen(event.clientX, event.clientY, 3);
            Klang.klick(6);
            if (!["hacken", "tanzen"].includes(f.zustand)) figurPose(f, "jubeln", 900);
        });
        huelle.addEventListener("contextmenu", event => {
            event.preventDefault();
            if (!f.partner) oeffneEmoteMenue(f, event);
        });
    }
    figuren.push(f);
    return f;
}

function entferneFigur(f) {
    if (f.el) f.el.remove();
    const i = figuren.indexOf(f);
    if (i >= 0) figuren.splice(i, 1);
}

// Blickrichtung zur Pose: Laufen und Hacken von der Seite, Sitzen und Emotes von vorne,
// beim Stehen schaut die Figur mal nach vorne, mal zur Seite, mal nach hinten (auf den Hof)
function blickFuer(zustand) {
    if (zustand === "laufen" || zustand === "hacken") return "seite";
    if (zustand !== "stehen") return "vorne";
    const wurf = Math.random();
    return wurf < 0.55 ? "vorne" : wurf < 0.85 ? "seite" : "hinten";
}

function figurPose(f, zustand, ms, blick) {
    f.zustand = zustand;
    f.zustandMs = ms;
    f.bild = 0;
    f.bildMs = 0;
    f.blick = blick || blickFuer(zustand);
}

function figurLaufeZu(f, ziel) {
    f.zielX = Math.max(8, Math.min(92, ziel));
    f.richtung = f.zielX > f.x ? 1 : -1;
    figurPose(f, "laufen", 0);
}

function naechsterFigurZustand(f) {
    const nacht = typeof tageszeit !== "undefined" && tageszeit > 0.85 && tageszeit < 1.2;
    const wurf = Math.random();
    const dauer = (min, max) => min + Math.random() * (max - min);
    const bereich = f.art === "mensch" ? [33, 68] : [34, 66];
    if (f.art === "begleiter") {
        if (f.zustand === "sitzen" && wurf < 0.45) figurLaufeZu(f, bereich[0] + Math.random() * (bereich[1] - bereich[0]));
        else if (f.zustand === "liegen" && wurf < (nacht ? 0.8 : 0.4)) figurPose(f, "schlafen", dauer(8000, 14000));
        else if (f.zustand === "sitzen" && wurf < 0.75) figurPose(f, "liegen", dauer(4000, 8000));
        else figurPose(f, "sitzen", dauer(3000, 6000));
        return;
    }
    if (nacht && wurf < 0.5) {
        figurPose(f, f.zustand === "sitzen" ? "schlafen" : "sitzen", dauer(6000, 12000));
    } else if (wurf < 0.55) {
        let ziel;
        do ziel = bereich[0] + Math.random() * (bereich[1] - bereich[0]); while (Math.abs(ziel - f.x) < 8);
        figurLaufeZu(f, ziel);
    } else if (wurf < 0.75) {
        figurPose(f, "sitzen", dauer(4000, 8000));
    } else {
        figurPose(f, "stehen", dauer(2000, 4000));
    }
}

// Kleine Idle-Animationen: mit der Hacke den Boden bearbeiten, sich strecken, winken
function figurIdle(f) {
    const wurf = Math.random();
    if (wurf < 0.5) figurPose(f, "hacken", 4 * FIGUR_BILD_DAUER.hacken * 3);
    else if (wurf < 0.75) figurPose(f, "jubeln", 1600);
    else figurPose(f, "winken", 1400);
}

function figurMitte(f) {
    const rect = (f.bildEl ? f.bildEl.huelle : f.img).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, kopfY: rect.top + rect.height * (f.art === "mensch" ? 0.18 : 0.3), rect };
}

function figurEmote(f, symbol) {
    const { x, kopfY } = figurMitte(f);
    const blase = el("div", "emote", null, [pixelIcon(symbol, 32)]);
    blase.style.left = x + "px";
    blase.style.top = kopfY - 34 + "px";
    fxLayer.appendChild(blase);
    setTimeout(() => blase.remove(), 1600);
}

function aktualisiereFigur(f, dtMs, jetzt) {
    f.bildMs += dtMs;
    const dauer = f.art === "mensch" ? FIGUR_BILD_DAUER[f.zustand] || 600 : HAUSTIER_BILD_DAUER[f.zustand] || 600;
    if (f.bildMs >= dauer) {
        f.bildMs = 0;
        f.bild += 1;
        // Beim Hacken fliegt Erde, wenn die Hacke den Boden trifft
        if (f.zustand === "hacken" && f.bild % 4 === 2) {
            const { rect } = figurMitte(f);
            const x = f.richtung > 0 ? rect.right - rect.width * 0.1 : rect.left + rect.width * 0.1;
            partikel(x, rect.bottom - 6, ["#8f6139", "#5b3a22", "#c89b6a"], 6, 26);
            if (!f.partner) Klang.blockLaut();
        }
    }
    if (f.zustand === "laufen") {
        const schritt = ((f.art === "mensch" ? 34 : 40) / topBar.clientWidth) * 100 * (dtMs / 1000);
        const rest = f.zielX - f.x;
        if (Math.abs(rest) <= schritt) {
            f.x = f.zielX;
            figurPose(f, f.art === "mensch" ? "stehen" : "stehen", 800 + Math.random() * 800);
        } else {
            f.x += Math.sign(rest) * schritt;
        }
        f.el.style.left = f.x + "%";
    } else {
        f.zustandMs -= dtMs;
        if (f.zustandMs <= 0) naechsterFigurZustand(f);
    }
    if (f.zustand === "schlafen") {
        f.zzzMs -= dtMs;
        if (f.zzzMs <= 0) {
            f.zzzMs = 1500;
            const { x, kopfY } = figurMitte(f);
            const zzz = el("div", "zzz", "z");
            zzz.style.left = x + 10 + "px";
            zzz.style.top = kopfY + "px";
            fxLayer.appendChild(zzz);
            setTimeout(() => zzz.remove(), 1800);
        }
    }
    f.blinzelMs -= dtMs;
    if (f.blinzelMs <= 0) {
        f.blinzelMs = 2200 + Math.random() * 4000;
        f.blinzeltBis = jetzt + 160;
    }
    if (f.art === "mensch" && ["stehen", "sitzen"].includes(f.zustand)) {
        f.idleMs -= dtMs;
        if (f.idleMs <= 0) {
            f.idleMs = 12000 + Math.random() * 10000;
            if (f.zustand === "stehen") figurIdle(f);
        }
    }
    zeichneFigur(f, jetzt);
}

function zeichneFigur(f, jetzt) {
    const blinzelt = f.blinzeltBis > jetzt;
    if (f.art === "mensch") {
        const teile = figurTeileAus(f.teile, !f.partner);
        const blick = f.blick || "seite";
        zeigeFigurBild(f.bildEl, teile, f.zustand, f.bild, blinzelt, blick);
        f.bildEl.huelle.style.transform = blick === "seite" && f.richtung < 0 ? "scaleX(-1)" : "";
        figurFunkeln(f, teile);
        return;
    }
    // Begleiter des Mitspielers: gleiches Bild und dieselben Effekte wie der eigene
    const skin = HAUSTIER_SKINS.find(s => s.id === f.skin) || HAUSTIER_SKINS[0];
    const pose = ["laufen", "stehen", "sitzen", "liegen", "schlafen"].includes(f.zustand) ? f.zustand : "sitzen";
    const url = haustierUrl(skin, pose, f.bild, blinzelt);
    if (f.letzteUrl !== url) {
        f.img.src = url;
        f.letzteUrl = url;
    }
    f.img.style.transform = f.richtung < 0 ? "scaleX(-1)" : "";
    f.el.classList.toggle("haustier-aura", Boolean(skin.aura));
    f.el.classList.toggle("haustier-schwebt", Boolean(skin.schwebt));
    if (skin.aura) f.el.style.setProperty("--aura", skin.aura);
    const effekt = skin.effekt && HAUSTIER_EFFEKTE[skin.effekt];
    if (effekt && pose !== "schlafen") {
        f.effektMs += 16 * (pose === "laufen" ? 2 : 1);
        if (f.effektMs >= effekt.abstandMs) {
            f.effektMs = 0;
            const { x, kopfY } = figurMitte(f);
            const teil = effekt.symbol ? pixelIcon(effekt.symbol, 16, effekt.klasse) : el("div", effekt.klasse);
            teil.style.left = x + (Math.random() - 0.5) * 30 + "px";
            teil.style.top = kopfY + Math.random() * 20 + "px";
            fxLayer.appendChild(teil);
            setTimeout(() => teil.remove(), 1600);
        }
    }
}

// Legendaere Teile mit "funkeln": ab und zu ein kleiner Stern an der Figur
function figurFunkeln(f, teile) {
    const funkelnd = Object.values(teile).find(tl => tl.fx === "funkeln");
    if (!funkelnd) return;
    f.funkelMs = (f.funkelMs || 0) + 16;
    if (f.funkelMs < 700) return;
    f.funkelMs = 0;
    const { rect } = figurMitte(f);
    const stern = pixelIcon("✨", 14, "effekt-symbol");
    stern.style.left = rect.left + Math.random() * rect.width + "px";
    stern.style.top = rect.top + Math.random() * rect.height * 0.8 + "px";
    stern.style.filter = "drop-shadow(0 0 4px " + (funkelnd.fxFarbe || "#fff6a0") + ")";
    fxLayer.appendChild(stern);
    setTimeout(() => stern.remove(), 1600);
}

// Eigene Figur, im Duo auch Figur und Begleiter des Mitspielers
function aktualisiereFiguren(dtMs, jetzt) {
    if (!hofEbene) return;
    let eigene = figuren.find(f => f.art === "mensch" && !f.partner);
    if (!eigene) eigene = neueFigur("mensch", { teile: profil().teile });
    eigene.teile = profil().teile;
    const imDuo = typeof koopAktiv === "function" && koopAktiv() && koop.verbunden && koop.partnerProfil;
    // Namensschild nur im Duo
    const name = imDuo ? profilName() : "";
    if ((eigene.schild ? eigene.schild.textContent : "") !== name) {
        if (!eigene.schild) {
            eigene.schild = el("div", "figur-name");
            eigene.el.appendChild(eigene.schild);
        }
        eigene.schild.textContent = name;
        eigene.schild.classList.toggle("versteckt", !name);
    }
    // Duo: Mitspieler-Figur und sein Begleiter
    let partner = figuren.find(f => f.art === "mensch" && f.partner);
    let partnerTier = figuren.find(f => f.art === "begleiter" && f.partner);
    if (imDuo) {
        const p = koop.partnerProfil;
        if (!partner) partner = neueFigur("mensch", { partner: true, teile: p.teile || FIGUR_STANDARD, name: p.name || t("Mitspieler") });
        partner.teile = p.teile || FIGUR_STANDARD;
        if (partner.schild) partner.schild.textContent = p.name || t("Mitspieler");
        if (!partnerTier) partnerTier = neueFigur("begleiter", { partner: true, skin: p.begleiter, zustand: "sitzen" });
        partnerTier.skin = p.begleiter;
    } else {
        if (partner) entferneFigur(partner);
        if (partnerTier) entferneFigur(partnerTier);
    }
    figuren.forEach(f => aktualisiereFigur(f, dtMs, jetzt));
}

// ---------- EMOTES (Rechtsklick auf die eigene Figur) ----------

let emoteMenue = null;

function oeffneEmoteMenue(f, event) {
    schliesseEmoteMenue();
    emoteMenue = el("div", "emote-menue");
    FIGUR_EMOTES.forEach(e => {
        const knopf = el("button", "knopf emote-knopf", null, [pixelIcon(e.symbol, 32)]);
        setzeTipp(knopf, e.name);
        knopf.addEventListener("click", () => {
            spieleEmote(f, e);
            if (typeof koop !== "undefined" && koop.verbunden) koopSende("emote", { id: e.id });
            schliesseEmoteMenue();
        });
        emoteMenue.appendChild(knopf);
    });
    emoteMenue.style.left = Math.min(event.clientX, window.innerWidth - 200) + "px";
    emoteMenue.style.top = Math.max(10, event.clientY - 120) + "px";
    document.body.appendChild(emoteMenue);
    setTimeout(() => document.addEventListener("pointerdown", emoteMenueAussen), 0);
}

function emoteMenueAussen(event) {
    if (emoteMenue && !emoteMenue.contains(event.target)) schliesseEmoteMenue();
}

function schliesseEmoteMenue() {
    document.removeEventListener("pointerdown", emoteMenueAussen);
    if (emoteMenue) emoteMenue.remove();
    emoteMenue = null;
}

function spieleEmote(f, e) {
    figurEmote(f, e.symbol);
    const dauer = e.pose === "schlafen" ? 5000 : e.pose === "hacken" ? 4 * FIGUR_BILD_DAUER.hacken * 3 : 1800;
    figurPose(f, e.pose, dauer);
    if (e.id === "herz") {
        const { x, kopfY } = figurMitte(f);
        zeigeHerzen(x, kopfY, 5);
    }
}

// Emote vom Mitspieler (Duo)
function zeigePartnerEmote(id) {
    const f = figuren.find(fi => fi.art === "mensch" && fi.partner);
    const e = FIGUR_EMOTES.find(em => em.id === id);
    if (f && e) spieleEmote(f, e);
}

// Profil an den Mitspieler schicken (Name, Aussehen, eigener Begleiter)
function koopSendeProfil() {
    if (typeof koop === "undefined" || !koop.verbunden) return;
    koopSende("profil", { name: profilName(), teile: figurTeileIds(), begleiter: meta.kosmetik.haustier || "rot" });
}

function figurTeileIds() {
    const teile = figurTeileAus(profil().teile);
    const ids = {};
    FIGUR_KATEGORIEN.forEach(k => { ids[k.id] = teile[k.id].id; });
    return ids;
}

// ---------- PROFIL-FENSTER (Hauptmenue oben rechts) ----------

let profilKategorie = "haut";
let profilVorschau = null;     // anprobierte Teile (auch nicht besessene)
let profilPose = null;         // null = steht ruhig und schaut nach vorne
let profilTakt = null;

function oeffneProfil() {
    profilVorschau = { ...profil().teile };
    renderProfil();
    $("profil-fenster").classList.remove("versteckt");
    Klang.klick(8);
    clearInterval(profilTakt);
    let bild = 0;
    profilTakt = setInterval(() => {
        bild += 1;
        const vorschau = document.querySelector("#profil-fenster .profil-vorschau-figur");
        if (vorschau && vorschau.figur) zeigeFigurBild(vorschau.figur, figurTeileAus(profilVorschau, false), profilPose || "stehen", bild, bild % 17 === 0, "vorne");
    }, 180);
}

function schliesseProfil() {
    clearInterval(profilTakt);
    $("profil-fenster").classList.add("versteckt");
    profilVorschau = null;
    aktualisiereProfilKnopf();
    koopSendeProfil();
}

function aktualisiereProfilKnopf() {
    const knopf = $("profil-knopf");
    if (!knopf) return;
    knopf.innerHTML = "";
    const mini = erstelleFigurBild(2);
    zeigeFigurBild(mini, figurTeileAus(profil().teile), "stehen", 0, false, "vorne");
    knopf.append(mini.huelle, el("span", null, profil().name ? profil().name : t("Profil")));
}

function renderProfil() {
    const inhalt = $("profil-inhalt");
    inhalt.innerHTML = "";

    // Links: grosse Vorschau, Name, Posen
    const links = el("div", "profil-links");
    const buehne = el("div", "profil-buehne");
    const figur = erstelleFigurBild(8);
    figur.huelle.classList.add("profil-vorschau-figur");
    figur.huelle.figur = figur;
    zeigeFigurBild(figur, figurTeileAus(profilVorschau, false), profilPose || "stehen", 0, false, "vorne");
    buehne.appendChild(figur.huelle);
    links.appendChild(buehne);

    const posen = el("div", "profil-posen");
    [["laufen", "🚶"], ["winken", "👋"], ["hacken", "⛏️"], ["tanzen", "💃"], ["jubeln", "🎉"], ["sitzen", "🪑"]].forEach(([pose, symbol]) => {
        const knopf = el("button", "knopf profil-pose" + (pose === profilPose ? " aktiv" : ""), null, [pixelIcon(symbol, 20)]);
        // Nochmal anklicken schaltet die Animation wieder aus
        knopf.addEventListener("click", () => {
            profilPose = profilPose === pose ? null : pose;
            renderProfil();
        });
        posen.appendChild(knopf);
    });
    links.appendChild(posen);

    const nameZeile = el("label", "profil-name-zeile", null, [el("span", null, t("Name (für Duo)"))]);
    const eingabe = document.createElement("input");
    eingabe.type = "text";
    eingabe.maxLength = 16;
    eingabe.placeholder = t("Bauer");
    eingabe.value = profil().name || "";
    eingabe.addEventListener("input", () => {
        profil().name = eingabe.value.replace(/[<>]/g, "").slice(0, 16);
        speichereMeta();
    });
    nameZeile.appendChild(eingabe);
    links.appendChild(nameZeile);

    // Hinweis, wenn etwas nur anprobiert ist
    const nichtBesessen = FIGUR_KATEGORIEN.filter(k => !istKosmetikFrei(figurTeil(k.id, profilVorschau[k.id]), "figur_" + k.id));
    if (nichtBesessen.length > 0) {
        links.appendChild(el("div", "profil-anprobe", t("👀 Nur anprobiert: ") + nichtBesessen.map(k => figurTeil(k.id, profilVorschau[k.id]).name).join(", ") +
            t(". Im Spiel trägst du dafür dein bisheriges Teil.")));
    }
    inhalt.appendChild(links);

    // Rechts: Reiter fuer die Teile und das Inventar (immer offen)
    const rechts = el("div", "profil-rechts");
    const reiter = el("div", "profil-reiter");
    FIGUR_KATEGORIEN.forEach(k => {
        const knopf = el("button", "knopf reiter-knopf" + (k.id === profilKategorie ? " aktiv" : ""), null, [pixelIcon(k.symbol, 20), el("span", null, k.name)]);
        knopf.addEventListener("click", () => {
            profilKategorie = k.id;
            renderProfil();
        });
        reiter.appendChild(knopf);
    });
    rechts.appendChild(reiter);

    const raster = el("div", "profil-inventar");
    FIGUR_TEILE[profilKategorie].forEach(teil => {
        const kategorie = "figur_" + profilKategorie;
        const frei = istKosmetikFrei(teil, kategorie);
        const seltenheit = KUSCHEL_RARITAETEN[kosmetikSeltenheit(teil)];
        const gewaehlt = profilVorschau[profilKategorie] === teil.id;
        const kachel = el("button", "profil-kachel" + (gewaehlt ? " gewaehlt" : "") + (frei ? "" : " gesperrt"));
        kachel.style.setProperty("--seltenheit", seltenheit.rand);
        const probe = { ...profilVorschau, [profilKategorie]: teil.id };
        const mini = erstelleFigurBild(3);
        zeigeFigurBild(mini, figurTeileAus(probe, false), "stehen", 0, false, "vorne");
        kachel.appendChild(mini.huelle);
        kachel.appendChild(el("div", "profil-kachel-name", teil.name));
        kachel.appendChild(el("div", "profil-kachel-status", frei ? (teil.fx ? "✨ " + seltenheit.name : seltenheit.name) : "🔒 " + dlcPreisText(teil)));
        kachel.addEventListener("click", () => {
            profilVorschau[profilKategorie] = teil.id;
            // Besessene Teile werden gleich uebernommen, andere nur anprobiert
            if (frei) {
                profil().teile[profilKategorie] = teil.id;
                speichereMeta();
                Klang.kaufen();
            } else {
                Klang.klick(4);
            }
            renderProfil();
        });
        raster.appendChild(kachel);
    });
    rechts.appendChild(raster);
    rechts.appendChild(el("div", "profil-legende", t("Gewöhnlich: frei · Episch: im Unterstützer-Paket · Legendär (mit Effekten): einzeln je ") +
        euro(LEGENDAER_PREIS)));
    inhalt.appendChild(rechts);
}
