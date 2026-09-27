"use strict";

// ============================================================
// SPROUTVALE: Eigene Figur (Profil im Hauptmenue) und Figuren auf dem Hof
// - Profil: Name (fuer Duo) und Aussehen aus Teilen (FIGUR_TEILE in daten.js), gespeichert in meta.profil (fuer alle Spielstaende)
// - Die Figur laeuft wie der Begleiter ueber den Hof, etwas groesser und ein paar Pixel weiter hinten.
//   Linksklick: Herzen am Mauszeiger. Rechtsklick: Emotes. Ab und zu eine Idle-Animation (hacken, strecken, winken).
// - Duo: die Figur und der Begleiter des Mitspielers laufen mit (mit Namensschild)
// Gehoert zu script.js, haus.js und sprites.js (gemeinsame Funktionen stehen dort).
// ============================================================

// Platz links und rechts neben der Figur (fuer grosse Fluegel); gezeichnet wird weiter mit x = 0 bis 18
const FIGUR_LINKS = 3;
const FIGUR_BREITE = 18 + 2 * FIGUR_LINKS;
const FIGUR_OBEN = 5;   // Platz ueber dem Kopf (hohe Huete, Heiligenschein, Flammenhaar)
const FIGUR_HOEHE = 26 + FIGUR_OBEN;
// Schichten von hinten nach vorne (hinten = Fluegel, Rucksack, Umhang)
const FIGUR_SCHICHTEN = ["umriss", "hinten", "haut", "augen", "kleidung", "haare", "kopf", "accessoire", "werkzeug"];
const FIGUR_BILDER = { stehen: 2, laufen: 4, sitzen: 2, schlafen: 2, winken: 2, jubeln: 2, tanzen: 4, hacken: 4 };
const FIGUR_BILD_DAUER = { stehen: 700, laufen: 130, sitzen: 800, schlafen: 1100, winken: 220, jubeln: 260, tanzen: 240, hacken: 230 };
const FIGUR_FESTE_FARBEN = { w: "#ffffff", 7: "#2a1a12", t: "#9a6634", e: "#b8c0cc", i: "#1a1010" };

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

// Raster in doppelter Aufloesung: gezeichnet wird in "Figur-Pixeln" (18 breit), jeder davon besteht aus 2x2 feinen Pixeln.
// punkt/rechteck/ellipse/linie arbeiten in Figur-Pixeln (Rundungen werden fein berechnet und dadurch weicher),
// fein/feinLinie setzen einzelne feine Pixel (Koordinaten in Figur-Pixeln, halbe Werte erlaubt) fuer Details.
// Doppelte Aufloesung, aber pixelig wie der Rest des Spiels: Grundformen (Ellipsen, Linien, Umriss) liegen auf dem
// groben Raster, die feinen Pixel sind nur fuer kleine Details, Animationen und Fluegel da
const FIGUR_FEIN = 2;
const FIGUR_RB = Math.round(FIGUR_BREITE * FIGUR_FEIN);
const FIGUR_RH = Math.round(FIGUR_HOEHE * FIGUR_FEIN);

function figurGitter() {
    const raster = Array.from({ length: FIGUR_RH }, () => Array(FIGUR_RB).fill(null));
    const setzeFein = (fx, fy, farbe) => {
        if (fx >= 0 && fy >= 0 && fx < FIGUR_RB && fy < FIGUR_RH) raster[fy][fx] = farbe;
    };
    // Figur-Pixel (x, y) -> 2x2 feine Pixel; y ohne den Platz oben (0 = Kopfbereich)
    const setze = (x, y, farbe) => {
        const lx = Math.round(x) + FIGUR_LINKS;
        const ly = Math.round(y) + FIGUR_OBEN;
        const fx0 = Math.round(lx * FIGUR_FEIN);
        const fx1 = Math.max(fx0 + 1, Math.round((lx + 1) * FIGUR_FEIN));
        const fy0 = Math.round(ly * FIGUR_FEIN);
        const fy1 = Math.max(fy0 + 1, Math.round((ly + 1) * FIGUR_FEIN));
        for (let fy = fy0; fy < fy1; fy++) for (let fx = fx0; fx < fx1; fx++) setzeFein(fx, fy, farbe);
    };
    const fein = (x, y, farbe) => setzeFein(Math.round((x + FIGUR_LINKS) * FIGUR_FEIN), Math.round((y + FIGUR_OBEN) * FIGUR_FEIN), farbe);
    return {
        raster,
        punkt: setze,
        fein,
        rechteck(x, y, b, h, farbe) {
            const fx0 = Math.round((x + FIGUR_LINKS) * FIGUR_FEIN);
            const fy0 = Math.round((y + FIGUR_OBEN) * FIGUR_FEIN);
            const fb = Math.max(1, Math.round(b * FIGUR_FEIN));
            const fh = Math.max(1, Math.round(h * FIGUR_FEIN));
            for (let dy = 0; dy < fh; dy++) for (let dx = 0; dx < fb; dx++) setzeFein(fx0 + dx, fy0 + dy, farbe);
        },
        // Ellipse auf ganzen Figur-Pixeln (pixelig); filter(x, y) bekommt die Figur-Pixel-Koordinaten
        ellipse(cx, cy, rx, ry, farbe, filter) {
            for (let y = -FIGUR_OBEN; y < FIGUR_HOEHE - FIGUR_OBEN; y++) {
                for (let x = -FIGUR_LINKS; x < FIGUR_BREITE - FIGUR_LINKS; x++) {
                    const dx = (x + 0.5 - cx) / rx;
                    const dy = (y + 0.5 - cy) / ry;
                    if (dx * dx + dy * dy <= 1 && (!filter || filter(x, y))) setze(x, y, farbe);
                }
            }
        },
        // Ellipse fein gerastert (nur fuer Fluegel und kleine Details)
        ellipseFein(cx, cy, rx, ry, farbe, filter) {
            for (let fy = 0; fy < FIGUR_RH; fy++) {
                for (let fx = 0; fx < FIGUR_RB; fx++) {
                    const lx = (fx + 0.5) / FIGUR_FEIN - FIGUR_LINKS;
                    const ly = (fy + 0.5) / FIGUR_FEIN - FIGUR_OBEN;
                    const dx = (lx - cx) / rx;
                    const dy = (ly - cy) / ry;
                    if (dx * dx + dy * dy <= 1 && (!filter || filter(lx - 0.5, ly - 0.5))) setzeFein(fx, fy, farbe);
                }
            }
        },
        // Linie auf ganzen Figur-Pixeln (pixelig)
        linie(x0, y0, x1, y1, farbe) {
            const schritte = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
            for (let i = 0; i <= schritte; i++) setze(x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte, farbe);
        },
        // Linie fein (2 feine Pixel dick, fuer Fluegel)
        linieFein(x0, y0, x1, y1, farbe) {
            const schritte = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * FIGUR_FEIN;
            for (let i = 0; i <= schritte; i++) {
                const fx = Math.round((x0 + ((x1 - x0) * i) / schritte + FIGUR_LINKS) * FIGUR_FEIN);
                const fy = Math.round((y0 + ((y1 - y0) * i) / schritte + FIGUR_OBEN) * FIGUR_FEIN);
                setzeFein(fx, fy, farbe);
                setzeFein(fx + 1, fy, farbe);
                setzeFein(fx, fy + 1, farbe);
                setzeFein(fx + 1, fy + 1, farbe);
            }
        },
        // duenne Linie (1 feiner Pixel)
        feinLinie(x0, y0, x1, y1, farbe) {
            const schritte = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 0.5) * FIGUR_FEIN * 2;
            for (let i = 0; i <= schritte; i++) fein(x0 + ((x1 - x0) * i) / schritte, y0 + ((y1 - y0) * i) / schritte, farbe);
        }
    };
}

// Koerperhaltung fuer eine Pose (Positionen in Figur-Pixeln)
function figurHaltung(pose, bild) {
    const h = { wippen: 0, sitzt: false, beinVorn: 0, beinHinten: 0, armVorn: "unten", armHinten: "unten", armSchwung: 0, lehnen: 0, werkzeug: null };
    if (pose === "laufen") {
        const s = [2, 0, -2, 0][bild % 4];
        h.beinVorn = s;
        h.beinHinten = -s;
        h.armSchwung = -s / 2;
        h.wippen = bild % 2 === 1 ? -0.5 : 0;
    } else if (pose === "sitzen" || pose === "schlafen") {
        h.sitzt = true;
        h.wippen = pose === "schlafen" && bild % 2 ? 0.5 : 0;
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

// ---------- AUGEN ----------
// ax/ay = linke obere Ecke eines Auges (2x2 Figur-Pixel = 4x4 fein). anim = Animationsbild fuer legendaere Augen
function figurAuge(g, ax, ay, augen, geschlossen, anim, gespiegelt) {
    const a = g.augen;
    if (geschlossen) {
        // geschlossenes Auge: kleiner Bogen
        a.feinLinie(ax, ay + 1.2, ax + 1.5, ay + 1.2, "7");
        a.fein(ax, ay + 0.8, "7");
        a.fein(ax + 1.5, ay + 0.8, "7");
        return;
    }
    if (augen.form === "herz") {
        // Herz: .X.X / XXXX / XXXX / .XX. , pulsiert
        const gross = anim % 2 === 0;
        const ox = ax - (gross ? 0.5 : 0);
        const oy = ay - (gross ? 0.5 : 0);
        const reihen = gross
            ? [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."]
            : [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."];
        reihen.forEach((reihe, y) => [...reihe].forEach((c, x) => { if (c === "X") a.fein(ox + x / 2, oy + y / 2, "5"); }));
        a.fein(ox + 0.5, oy + 0.5, "w");
        return;
    }
    if (augen.form === "stern") {
        // Sternauge: Iris mit sternfoermiger Pupille, funkelt
        a.rechteck(ax, ay, 2, 2, "5");
        const hell = anim % 2 === 0 ? "w" : "v";
        a.fein(ax + 0.5, ay, hell);
        a.fein(ax + 1, ay + 0.5, hell);
        a.fein(ax + 0.5, ay + 0.5, hell);
        a.fein(ax, ay + 0.5, hell);
        a.fein(ax + 0.5, ay + 1, hell);
        return;
    }
    if (augen.form === "katze") {
        a.rechteck(ax, ay, 2, 2, "5");
        a.feinLinie(ax + 0.5, ay, ax + 0.5, ay + 1.5, "i");
        a.fein(ax + 1, ay, "w");
        return;
    }
    // Normales Auge: Iris, dunkle Pupille, zwei Glanzpunkte, Wimpern oben
    a.rechteck(ax, ay, 2, 2, "5");
    a.rechteck(ax + (gespiegelt ? 0 : 0.5), ay + 0.5, 1, 1.5, "i");
    a.fein(ax + (gespiegelt ? 1.5 : 0), ay, "w");
    a.fein(ax + (gespiegelt ? 0.5 : 1), ay + 1, "w");
    a.feinLinie(ax - 0.5, ay - 0.5, ax + 1.5, ay - 0.5, "7");
    if (augen.form === "leuchten") {
        // Leuchtende Augen: heller Kern, der im Takt pulsiert
        a.rechteck(ax + 0.5, ay + 0.5, 1, 1, anim % 2 ? "v" : "w");
    }
}

// ---------- KOPF ----------

function figurKopfSeite(g, cx, cy, geschlossen, augen, blinzelt, anim) {
    g.haut.ellipse(cx, cy, 4.6, 4.5, "4");
    // Schatten am Kinn und hinten, kleines Ohr
    g.haut.ellipse(cx, cy, 4.6, 4.5, "s", (x, y) => y + 0.5 > cy + 3.2 || x + 0.5 < cx - 3.8);
    g.haut.ellipse(cx - 1.2, cy + 0.6, 0.9, 1.1, "s");
    g.haut.rechteck(cx + 2.5, cy + 1.5, 1.5, 0.5, "r");
    if (!geschlossen) {
        g.haut.feinLinie(cx + 2.5, cy + 2.8, cx + 3.2, cy + 2.8, "m");
        g.haut.fein(cx + 2.2, cy + 2.5, "m");
    }
    figurAuge(g, Math.round(cx + 1), Math.round(cy) - 1, augen, geschlossen || blinzelt, anim, false);
}

function figurKopfVorne(g, cx, cy, geschlossen, augen, blinzelt, anim) {
    g.haut.ellipse(cx, cy, 4.8, 4.5, "4");
    g.haut.ellipse(cx, cy, 4.8, 4.5, "s", (x, y) => y + 0.5 > cy + 3.2);
    // Ohren an den Seiten
    g.haut.ellipse(cx - 4.9, cy + 0.6, 0.7, 1, "4");
    g.haut.ellipse(cx + 4.9, cy + 0.6, 0.7, 1, "4");
    const ay = Math.round(cy) - 1;
    figurAuge(g, cx - 3, ay, augen, geschlossen || blinzelt, anim, false);
    figurAuge(g, cx + 1, ay, augen, geschlossen || blinzelt, anim, true);
    g.haut.rechteck(cx - 4, ay + 2.5, 1.5, 0.5, "r");
    g.haut.rechteck(cx + 2.5, ay + 2.5, 1.5, 0.5, "r");
    if (!geschlossen) {
        // kleines Laecheln
        g.haut.feinLinie(cx - 0.5, ay + 3.5, cx + 0.5, ay + 3.5, "m");
        g.haut.fein(cx - 1, ay + 3, "m");
        g.haut.fein(cx + 1, ay + 3, "m");
    }
}

function figurKopfHinten(g, cx, cy) {
    g.haut.ellipse(cx, cy, 4.8, 4.5, "4");
    g.haut.ellipse(cx - 4.9, cy + 0.6, 0.7, 1, "s");
    g.haut.ellipse(cx + 4.9, cy + 0.6, 0.7, 1, "s");
}

// Legendaere Haut: Sterne in der Haut, Kristall-Facetten (nur Aussehen, im Takt der Animation)
function figurHautMuster(g, teile, cx, cy, y0, blick, anim) {
    const form = teile.haut.form;
    if (form === "sternenhaut") {
        const sterne = [[cx - 2, cy - 2], [cx + 3, cy - 3], [cx - 3, cy + 2], [cx + 1, cy + 1.5], [cx - 1, cy - 3.5], [cx + 3.5, cy + 0.5]];
        sterne.forEach(([x, y], i) => { if ((i + anim) % 3 !== 0) g.haut.fein(x, y, i % 2 ? "v" : "w"); });
    } else if (form === "kristall") {
        g.haut.feinLinie(cx - 3, cy - 2, cx - 1, cy - 3.5, "v");
        g.haut.feinLinie(cx + 2, cy + 2, cx + 3.5, cy + 0.5, "v");
        const x = cx - 3 + (anim % 4) * 2;
        g.haut.fein(x, cy - 1, "w");
        g.haut.fein(x + 0.5, cy - 1.5, "w");
    }
}

// ---------- HAARE ----------

function figurHaare(g, blick, cx, cy, form, bild, anim) {
    const p = g.haare;
    if (form === "glatze") {
        g.haut.fein(cx - 1, cy - 3.5, "w");
        return;
    }
    const glanz = (x0, y0, x1, y1) => p.feinLinie(x0, y0, x1, y1, "h");
    const seite = blick === "seite";

    if (form === "iro") {
        if (seite) {
            p.ellipse(cx - 0.5, cy - 5, 3.6, 1.8, "2", (x, y) => y + 0.5 < cy - 4);
            for (let i = 0; i < 4; i++) p.feinLinie(cx - 3 + i * 1.5, cy - 5, cx - 2 + i * 1.5, cy - 7, "2");
            glanz(cx - 2, cy - 5.5, cx + 1, cy - 5.5);
        } else {
            p.rechteck(cx - 1, cy - 7.5, 2, 4, "2");
            for (let i = 0; i < 3; i++) p.fein(cx - 0.5 + i * 0.5, cy - 8, "2");
            glanz(cx - 0.5, cy - 7, cx - 0.5, cy - 4.5);
        }
        g.haut.ellipse(cx, cy, 4.7, 4.4, "s", (x, y) => y + 0.5 < cy - 2.5 && Math.abs(x + 0.5 - cx) > 1.2);
        return;
    }
    if (form === "wolke") {
        const w = anim % 2 ? -0.5 : 0;
        const kugeln = seite
            ? [[cx - 3, cy - 3], [cx, cy - 4.5], [cx + 3, cy - 3.2], [cx - 4.2, cy], [cx - 4, cy + 2.6]]
            : [[cx - 4, cy - 2.6], [cx - 1.5, cy - 4.8], [cx + 1.5, cy - 4.8], [cx + 4, cy - 2.6], [cx - 5, cy + 1], [cx + 5, cy + 1]];
        kugeln.forEach(([x, y]) => p.ellipse(x, y + w, 2.6, 2.3, "2"));
        kugeln.forEach(([x, y]) => p.ellipse(x - 0.6, y + w - 0.6, 1.2, 0.9, "h"));
        if (blick === "hinten") p.ellipse(cx, cy, 5, 4.8, "2");
        return;
    }

    if (form === "stoppel" || form === "undercut") {
        if (form === "stoppel") {
            p.ellipse(cx, cy, 4.9, 4.7, "2", (x, y) => y + 0.5 < cy - 2.2 || (blick === "hinten" && y + 0.5 < cy + 2));
        }
        figurHaare(g, blick, cx, cy, form + "_details", bild, anim);
        return;
    }
    if (form === "stoppel_details" || form === "undercut_details") form = form.replace("_details", "");
    // Grundform: Oberkopf mit Glanz und Schattenkante
    if (blick === "hinten" && form !== "stoppel" && form !== "undercut") {
        p.ellipse(cx, cy, 5, 4.8, "2");
        p.ellipse(cx, cy, 5, 4.8, "d", (x, y) => y + 0.5 > cy + 2.6);
        glanz(cx - 2.5, cy - 3.5, cx + 1, cy - 4);
        p.feinLinie(cx, cy - 4.5, cx, cy + 3, "d");
    } else if (form === "stoppel" || form === "undercut") {
        // nur die eigenen Teile (siehe unten)
    } else if (blick === "vorne") {
        p.ellipse(cx, cy, 5, 4.8, "2", (x, y) => y + 0.5 < cy - 1.4 || ((x + 0.5 < cx - 3.7 || x + 0.5 > cx + 3.7) && y + 0.5 < cy + 1.6));
        // Pony in feinen Straehnen
        for (let x = cx - 4; x <= cx + 4; x += 1) {
            const laenge = [1, 1.5, 1, 0.5, 1, 1.5, 1, 1.5, 1][Math.round(x - (cx - 4))] || 1;
            p.rechteck(x, cy - 1.5, 1, laenge, "2");
        }
        p.feinLinie(cx - 1, cy - 4, cx + 1, cy - 1.5, "d");
        glanz(cx - 3, cy - 3, cx - 1, cy - 4);
        glanz(cx + 1.5, cy - 4, cx + 2.5, cy - 3.5);
    } else {
        p.ellipse(cx, cy, 5, 4.9, "2", (x, y) => y + 0.5 < cy - 1.2 || (x + 0.5 < cx - 1.4 && y + 0.5 < cy + 2.4));
        p.rechteck(cx + 2.5, cy - 2, 1, 1, "2");
        p.rechteck(cx + 3.5, cy - 1.5, 0.5, 1, "2");
        p.rechteck(cx - 1, cy - 1, 1, 2.5, "2");
        p.feinLinie(cx - 4, cy + 1.5, cx - 2, cy - 3, "d");
        glanz(cx - 2, cy - 4, cx + 1.5, cy - 4);
    }

    if (form === "lang" || form === "sterne") {
        if (seite) {
            p.rechteck(cx - 5, cy, 3, 8, "2");
            p.rechteck(cx - 2, cy + 3, 1, 2, "2");
            p.feinLinie(cx - 4, cy + 1, cx - 4, cy + 7.5, "d");
            glanz(cx - 3.5, cy + 1, cx - 3.5, cy + 4);
        } else {
            p.rechteck(cx - 6, cy - 1, 2, 9, "2");
            p.rechteck(cx + 4, cy - 1, 2, 9, "2");
            p.fein(cx - 6, cy + 8, "2");
            p.fein(cx + 5.5, cy + 8, "2");
            if (blick === "hinten") {
                p.rechteck(cx - 4, cy + 2, 8, 6, "2");
                for (let x = cx - 3; x <= cx + 3; x += 2) p.feinLinie(x, cy + 3, x, cy + 7.5, "d");
            } else {
                p.feinLinie(cx - 5, cy, cx - 5, cy + 7, "d");
                p.feinLinie(cx + 5, cy, cx + 5, cy + 7, "d");
            }
        }
        if (form === "sterne") {
            // funkelnde Sterne im Haar, wandern mit der Animation
            const sterne = seite ? [[cx - 4, cy + 2], [cx - 3, cy + 5], [cx + 1, cy - 4], [cx - 2, cy - 3]]
                : [[cx - 5, cy + 3], [cx + 5, cy + 5], [cx, cy - 4], [cx - 3, cy - 3], [cx + 3, cy - 3.5], [cx - 5, cy + 6]];
            sterne.forEach(([x, y], i) => {
                if ((i + anim) % 3 === 0) return;
                p.fein(x, y, "v");
                if ((i + anim) % 2 === 0) {
                    p.fein(x - 0.5, y, "h");
                    p.fein(x + 0.5, y, "h");
                    p.fein(x, y - 0.5, "h");
                    p.fein(x, y + 0.5, "h");
                }
            });
        }
    } else if (form === "zopf") {
        const schwung = bild % 2 ? 0.5 : 0;
        if (seite) {
            p.ellipse(cx - 6 + schwung, cy + 1.5, 1.3, 3.2, "2");
            p.rechteck(cx - 5, cy - 1, 1, 1, "h");
            p.feinLinie(cx - 6 + schwung, cy, cx - 6 + schwung, cy + 4, "d");
        } else if (blick === "hinten") {
            p.ellipse(cx + schwung, cy + 5, 1.3, 3.5, "2");
            p.rechteck(cx - 0.5, cy + 1.5, 1, 1, "h");
        } else {
            p.ellipse(cx + 5.5, cy + 1 + schwung, 1, 2.5, "2");
        }
    } else if (form === "zoepfe") {
        const zopf = (x, y) => {
            for (let i = 0; i < 4; i++) p.ellipse(x, y + i * 1.8, 1.1, 1.1, "2");
            for (let i = 0; i < 4; i++) p.fein(x - 0.5, y + i * 1.8 - 0.5, "h");
            p.rechteck(x - 0.5, y + 7, 1, 0.5, "h");
        };
        if (seite) zopf(cx - 4, cy + 1.5);
        else {
            zopf(cx - 5, cy + 1.5);
            zopf(cx + 5, cy + 1.5);
        }
    } else if (form === "doppeldutt") {
        (seite ? [cx - 3] : [cx - 3.5, cx + 3.5]).forEach(x => {
            p.ellipse(x, cy - 5, 1.9, 1.8, "2");
            p.feinLinie(x - 1, cy - 5.5, x, cy - 6, "h");
        });
    } else if (form === "locken") {
        const kugeln = seite
            ? [[cx - 5, cy - 2], [cx - 3, cy - 4.6], [cx, cy - 5.4], [cx + 3, cy - 4.4], [cx - 5.2, cy + 1.4]]
            : [[cx - 4.4, cy - 3], [cx - 1.6, cy - 5], [cx + 1.6, cy - 5], [cx + 4.4, cy - 3], [cx - 5.4, cy + 0.6], [cx + 5.4, cy + 0.6]];
        kugeln.forEach(([x, y]) => {
            p.ellipse(x, y, 1.6, 1.6, "2");
            p.fein(x - 0.5, y - 0.5, "h");
            p.fein(x + 0.5, y + 0.5, "d");
        });
    } else if (form === "scheitel") {
        // Seitenscheitel: Scheitel links, der Pony faellt zur Seite
        if (blick === "vorne") {
            p.rechteck(cx - 4, cy - 2, 7, 1, "2");
            p.rechteck(cx - 4, cy - 1, 3, 1, "2");
            p.feinLinie(cx - 2, cy - 4.5, cx - 1.5, cy - 2, "d");
        } else if (seite) {
            p.rechteck(cx + 2, cy - 3, 3, 1, "2");
            p.feinLinie(cx - 2, cy - 4.5, cx + 2, cy - 3.5, "d");
        } else {
            p.feinLinie(cx + 1.5, cy - 4.5, cx + 1.5, cy - 2, "d");
        }
    } else if (form === "stoppel") {
        // sehr kurz: nur eine duenne Schicht, feine Stoppel-Punkte
        for (let x = cx - 4; x <= cx + 4; x += 1) for (let y = cy - 4; y <= cy - 1; y += 1) if ((x + y) % 2 === 0) p.fein(x + 0.5, y + 0.5, "d");
    } else if (form === "wuschel") {
        // verwuschelt: kleine Buschel rundherum
        const buschel = seite
            ? [[cx - 4, cy - 4], [cx - 1, cy - 5.5], [cx + 2, cy - 5], [cx - 5.5, cy - 1], [cx + 4, cy - 3]]
            : [[cx - 4.5, cy - 3.5], [cx - 1.5, cy - 5.5], [cx + 1.5, cy - 5.5], [cx + 4.5, cy - 3.5], [cx, cy - 6]];
        buschel.forEach(([x, y], i) => {
            p.punkt(x, y, "2");
            p.punkt(x + (i % 2 ? 1 : -1), y + 1, "2");
            p.fein(x, y, "h");
        });
    } else if (form === "tolle") {
        // Tolle: vorne hochgekaemmt
        if (seite) {
            p.ellipse(cx + 2, cy - 5, 2.6, 1.8, "2");
            p.punkt(cx + 4, cy - 5, "2");
            p.feinLinie(cx + 0.5, cy - 5.5, cx + 3.5, cy - 6, "h");
        } else if (blick === "vorne") {
            p.ellipse(cx, cy - 5.4, 3.6, 1.8, "2");
            p.feinLinie(cx - 2, cy - 6, cx + 2, cy - 6, "h");
        } else {
            p.ellipse(cx, cy - 4.8, 3.6, 1.4, "2");
        }
    } else if (form === "undercut") {
        // Undercut: oben laenger, an den Seiten kurz rasiert
        p.ellipse(cx + (seite ? 1 : 0), cy - 4.6, seite ? 4 : 4.4, 2, "2");
        if (seite) p.rechteck(cx + 3, cy - 4, 2, 1, "2");
        for (let y = cy - 2; y <= cy + 1; y += 1) {
            if (seite) p.fein(cx - 3, y, "d");
            else {
                p.fein(cx - 4.5, y, "d");
                p.fein(cx + 4.5, y, "d");
            }
        }
    } else if (form === "afro") {
        // grosser, runder Afro rund um den Kopf (das Gesicht bleibt frei)
        const frei = (x, y) => blick === "vorne" ? Math.abs(x + 0.5 - cx) < 3.8 && y + 0.5 > cy - 1.6
            : blick === "seite" ? x + 0.5 > cx - 0.8 && y + 0.5 > cy - 1.6 : false;
        p.ellipse(cx - (seite ? 0.6 : 0), cy - 1.6, 6.4, 5.8, "2", (x, y) => !frei(x, y));
        [[cx - 3, cy - 5], [cx + 2, cy - 6], [cx - 5, cy - 2]].forEach(([x, y]) => p.fein(x, y, "h"));
        [[cx - 4, cy - 3], [cx + 3, cy - 4], [cx, cy - 6.5]].forEach(([x, y]) => p.fein(x, y, "d"));
    } else if (form === "bob") {
        // Bob: kinnlang, gerade Kante
        if (seite) p.rechteck(cx - 5, cy, 4, 3.5, "2");
        else {
            p.rechteck(cx - 5.5, cy - 1, 2, 4.5, "2");
            p.rechteck(cx + 3.5, cy - 1, 2, 4.5, "2");
            if (blick === "hinten") p.rechteck(cx - 4, cy, 8, 3.5, "2");
        }
        p.feinLinie(cx - 5, cy + 3.5, cx - 3.5, cy + 3.5, "d");
    } else if (form === "seitenzopf") {
        // geflochtener Zopf ueber der Schulter
        const x = seite ? cx - 3 : blick === "vorne" ? cx + 4.5 : cx - 4.5;
        for (let i = 0; i < 4; i++) {
            p.ellipse(x + (i % 2 ? 0.5 : 0), cy + 2 + i * 1.6, 1.1, 1, "2");
            p.fein(x - 0.5, cy + 1.5 + i * 1.6, "h");
        }
        p.rechteck(x - 0.5, cy + 8, 1, 0.5, "h");
    } else if (form === "dutt") {    } else if (form === "dutt") {
        const x = seite ? cx - 3 : cx;
        p.ellipse(x, cy - 5.4, 2, 1.9, "2");
        p.feinLinie(x - 1, cy - 6, x + 0.5, cy - 6.5, "h");
        p.feinLinie(x - 1.5, cy - 4, x + 1.5, cy - 4, "d");
    } else if (form === "stachel") {
        const spitzen = seite
            ? [[cx - 4, cy - 6.5, cx - 3, cy - 3], [cx - 1, cy - 7.5, cx, cy - 4], [cx + 2, cy - 7, cx + 2, cy - 4], [cx - 6.5, cy - 3, cx - 4, cy - 2]]
            : [[cx - 4, cy - 7, cx - 3, cy - 3.5], [cx, cy - 8.5, cx, cy - 4.5], [cx + 4, cy - 7, cx + 3, cy - 3.5], [cx - 6.5, cy - 3, cx - 4, cy - 2], [cx + 6.5, cy - 3, cx + 4, cy - 2]];
        spitzen.forEach(([x0, y0, x1, y1]) => {
            p.linie(x0, y0, x1, y1, "2");
            p.feinLinie(x0, y0 + 0.5, x1 - 0.5, y1, "h");
        });
    } else if (form === "flamme") {
        // Flammenhaar: drei Farben, drei Animationsbilder, die Zungen zucken
        const zungen = seite ? [cx - 3.5, cx - 1.5, cx + 0.5, cx + 2.5] : [cx - 4, cx - 2, cx, cx + 2, cx + 4];
        zungen.forEach((x, i) => {
            const hoehe = [4, 5.5, 3.5, 5, 4.5][(i + anim) % 5];
            const wack = ((i + anim) % 3) * 0.5 - 0.5;
            p.linie(x, cy - 3.5, x + wack, cy - 3.5 - hoehe, "f");
            p.feinLinie(x + 0.5, cy - 3.5, x + wack + 0.5, cy - 3 - hoehe * 0.7, "g");
            p.fein(x + wack, cy - 3.5 - hoehe - 0.5, "g");
        });
    } else if (form === "meer") {
        // Meerjungfrauen-Wellen: lange Wellen, die sanft schwingen
        const welle = i => Math.sin((i + anim) * 0.9) * 0.6;
        const seiten = seite ? [cx - 4.5] : [cx - 5.5, cx + 5.5];
        seiten.forEach(x => {
            for (let y = 0; y < 11; y += 0.5) p.rechteck(x - 1 + welle(y), cy + y, 2.2, 0.5, "2");
            for (let y = 1; y < 10; y += 2) p.fein(x - 0.5 + welle(y), cy + y, "h");
        });
        if (blick === "hinten") for (let y = 1; y < 10; y += 0.5) p.rechteck(cx - 4 + welle(y) * 0.5, cy + y, 8, 0.5, "2");
        [[cx - 2, cy - 3.5], [cx + 2, cy - 4]].forEach(([x, y], i) => { if ((i + anim) % 2) p.fein(x, y, "v"); });
    }
}

// ---------- HUT ----------

function figurHut(g, blick, cx, cy, form, bild, anim) {
    const p = g.kopf;
    const oben = Math.round(cy - 4.6);
    const vorne = blick !== "seite";
    if (form === "strohhut") {
        p.ellipse(cx + (vorne ? 0 : 0.5), oben + 1.5, 7.6, 1, "a");
        p.ellipse(cx, oben, vorne ? 4.4 : 3.6, 2.4, "a", (x, y) => y + 0.5 < oben + 1);
        p.rechteck(vorne ? cx - 4 : cx - 3, oben, vorne ? 8 : 7, 1, "c");
        // Stroh-Muster
        for (let x = cx - 6; x <= cx + 6; x += 1.5) p.fein(x, oben + 1.5, "b");
        for (let x = cx - 3; x <= cx + 3; x += 1.5) p.fein(x, oben - 1.5, "b");
    } else if (form === "muetze") {
        p.ellipse(cx, oben + 1, 5.2, 3.6, "a", (x, y) => y + 0.5 < oben + 2.2);
        p.rechteck(cx - 5, oben + 1, 10.5, 1.5, "b");
        for (let x = cx - 4.5; x <= cx + 4.5; x += 1) p.fein(x, oben + 1.5, "a");
        const bommel = vorne ? cx : cx - 1;
        p.ellipse(bommel, oben - 2.4, 1.5, 1.5, "c");
        p.fein(bommel - 0.5, oben - 3, "w");
    } else if (form === "kappe") {
        p.ellipse(cx, oben + 1, 5, 3.3, "a", (x, y) => y + 0.5 < oben + 2);
        if (vorne) p.ellipse(cx, oben + 1.8, 4.6, 0.8, "b");
        else p.rechteck(cx + 2, oben + 1, 5, 1, "b");
        p.fein(cx, oben - 2, "c");
        if (blick === "vorne") p.rechteck(cx - 1, oben - 0.5, 2, 1.5, "c");
        p.feinLinie(cx - 3, oben - 0.5, cx - 1, oben - 1.5, "w");
    } else if (form === "kranz") {
        p.rechteck(cx - 5, oben + 1, 10.5, 1, "a");
        const blueten = vorne ? [cx - 4, cx - 2, cx, cx + 2, cx + 4] : [cx - 4, cx - 1, cx + 2];
        blueten.forEach((x, i) => {
            const farbe = i % 2 ? "c" : "b";
            p.fein(x, oben, farbe);
            p.fein(x - 0.5, oben + 0.5, farbe);
            p.fein(x + 0.5, oben + 0.5, farbe);
            p.fein(x, oben + 1, farbe);
            p.fein(x, oben + 0.5, "c");
        });
    } else if (form === "hexe") {
        p.ellipse(cx, oben + 1.4, 8, 1, "a");
        p.rechteck(cx - 4, oben - 1, 8.5, 2, "a");
        p.rechteck(cx - 3, oben - 3, 6.5, 2, "a");
        p.rechteck(cx - 2, oben - 5, 4.5, 2, "a");
        p.rechteck(cx - 1, oben - 6, 2.5, 1, "a");
        p.rechteck(vorne ? cx + 1 : cx - 2, oben - 7, 1.5, 1, "a");
        p.rechteck(cx - 4, oben, 8.5, 1, "c");
        p.rechteck(cx - 0.5, oben, 1.5, 1, "b");
        p.fein(cx, oben + 0.5, "c");
    } else if (form === "ohren") {
        (vorne ? [cx - 5, cx + 3] : [cx - 3, cx + 1]).forEach(x0 => {
            p.linie(x0, oben + 1, x0 + 1, oben - 2, "a");
            p.linie(x0 + 1, oben - 2, x0 + 2.5, oben + 1, "a");
            p.rechteck(x0, oben, 3, 1.5, "a");
            if (blick !== "hinten") {
                p.fein(x0 + 1, oben - 0.5, "b");
                p.fein(x0 + 1.5, oben, "b");
                p.fein(x0 + 1, oben + 0.5, "b");
            }
        });
    } else if (form === "kopfhoerer") {
        p.ellipse(cx, cy, 5.6, 5.5, "a", (x, y) => y + 0.5 < oben + 1.2 && y + 0.5 > oben - 0.2);
        if (vorne) {
            p.ellipse(cx - 5.6, cy + 0.5, 1.2, 1.8, "b");
            p.ellipse(cx + 5.6, cy + 0.5, 1.2, 1.8, "b");
            p.fein(cx - 6, cy, "c");
            p.fein(cx + 5.5, cy, "c");
        } else {
            p.ellipse(cx - 1, cy + 0.5, 1.5, 1.9, "b");
            p.fein(cx - 1.5, cy, "c");
        }
    } else if (form === "krone") {
        p.rechteck(cx - 4, oben - 1, 8.5, 2, "a");
        [cx - 4, cx - 2, cx, cx + 2, cx + 4].forEach((x, i) => {
            const h = i % 2 ? 1 : 2;
            p.rechteck(x, oben - 1 - h, 0.5, h, "a");
            p.fein(x, oben - 1.5 - h, "c");
        });
        [cx - 2.5, cx + 2].forEach(x => p.rechteck(x, oben - 0.5, 1, 1, "c"));
        p.rechteck(cx - 0.5, oben - 1, 1, 1, "c");
        p.rechteck(cx - 4, oben + 1, 8.5, 0.5, "b");
        // Glanz wandert ueber die Krone
        const glanzX = cx - 4 + (anim % 4) * 2.5;
        p.fein(glanzX, oben - 0.5, "w");
        p.fein(glanzX + 0.5, oben, "w");
    } else if (form === "schein") {
        // Duenner Ring aus feinen Pixeln (schwebt sanft auf und ab, ein Glanz wandert herum)
        const y = oben - 3 + (anim % 2 ? -0.5 : 0);
        p.ellipseFein(cx, y, 4, 1.3, "b");
        p.ellipseFein(cx, y - 0.1, 3.4, 0.8, "a");
        p.feinLinie(cx - 2, y - 0.5, cx + 1.5, y - 0.5, "c");
        p.fein(cx - 2.5 + (anim % 4) * 1.5, y - 1, "c");
    } else if (form === "pilz") {
        const hueft = anim % 2 ? -0.5 : 0;
        p.ellipse(cx, oben + 0.6 + hueft, 6.6, 3.8, "a", (x, y) => y + 0.5 < oben + 1.6 + hueft);
        p.ellipse(cx - 2, oben - 1 + hueft, 2.4, 1, "b", (x, y) => y + 0.5 > oben - 0.8 + hueft);
        [[cx - 3, oben - 1.5], [cx + 1, oben - 2], [cx + 4, oben], [cx - 5, oben + 1], [cx + 2, oben]].forEach(([x, y]) => {
            p.rechteck(x, y + hueft, 1, 1, "c");
        });
        p.rechteck(cx - 6, oben + 1 + hueft, 13, 0.5, "b");
    } else if (form === "schleife") {
        // grosse rote Schleife seitlich am Kopf, mit Knoten in der Mitte
        const sx = blick === "vorne" ? cx + 3 : blick === "hinten" ? cx - 3 : cx - 1;
        const sy = oben + 0.5;
        p.ellipse(sx - 1.6, sy, 1.6, 1.4, "a");
        p.ellipse(sx + 1.6, sy, 1.6, 1.4, "a");
        p.punkt(sx, sy, "b");
        p.fein(sx - 2, sy - 0.5, "c");
        p.fein(sx + 1.5, sy - 0.5, "c");
    } else if (form === "stirnband") {
        p.rechteck(cx - 4.5, cy - 2.5, 9.5, 1, "a");
        p.feinLinie(cx - 4.5, cy - 2, cx + 4.5, cy - 2, "b");
        if (blick === "vorne") p.fein(cx - 3, cy - 2.5, "c");
    } else if (form === "cowboy") {
        // Cowboyhut: breite, hochgebogene Krempe, Delle oben, Band
        p.rechteck(cx - 7, oben + 1, 15, 1, "a");
        p.punkt(cx - 7, oben, "a");
        p.punkt(cx + 7, oben, "a");
        p.rechteck(cx - 3.5, oben - 2, 7.5, 3, "a");
        p.fein(cx, oben - 2, "b");
        p.fein(cx + 0.5, oben - 1.5, "b");
        p.rechteck(cx - 3.5, oben, 7.5, 1, "b");
        p.fein(cx - 2, oben, "c");
        p.feinLinie(cx - 6, oben + 1.5, cx + 6, oben + 1.5, "b");
    } else if (form === "barett") {
        // Barett: flach und schraeg, mit Stiel
        p.ellipse(cx + (vorne ? 0.5 : -0.5), oben, 5.6, 1.8, "a");
        p.feinLinie(cx - 4, oben + 1, cx + 4.5, oben + 1, "b");
        p.fein(cx + 1, oben - 2, "c");
        p.fein(cx + 1, oben - 1.5, "c");
    } else if (form === "bandana") {
        // Bandana: Tuch ueber dem Kopf, hinten ein Knoten mit zwei Enden
        p.ellipse(cx, cy, 5, 4.8, "a", (x, y) => y + 0.5 < cy - 1.5);
        [[cx - 3, cy - 4], [cx, cy - 4.5], [cx + 3, cy - 3.5], [cx - 1.5, cy - 2.5], [cx + 1.5, cy - 3]].forEach(([x, y]) => p.fein(x, y, "c"));
        if (blick !== "vorne") {
            const kx = blick === "seite" ? cx - 5 : cx;
            p.punkt(kx, cy - 2, "b");
            p.linie(kx, cy - 1, kx - 1, cy + 1, "a");
            p.linie(kx, cy - 1, kx + 1, cy + 1.5, "a");
        }
    } else if (form === "regenwolke") {
        // eine kleine Regenwolke schwebt ueber dem Kopf, darunter fallen Tropfen (animiert)
        const y = oben - 3.5 + (anim % 2 ? -0.5 : 0);
        [[cx - 2, y + 0.5], [cx, y - 0.5], [cx + 2, y + 0.5], [cx + 3.5, y + 1]].forEach(([x, yy]) => p.ellipse(x, yy, 1.8, 1.4, "a"));
        p.rechteck(cx - 3.5, y + 1.2, 8, 0.5, "b");
        for (let i = 0; i < 4; i++) {
            const tx = cx - 3 + i * 2;
            const ty = y + 2.5 + ((anim + i) % 3) * 1;
            p.fein(tx, ty, "c");
            p.fein(tx, ty + 0.5, "c");
        }
    } else if (form === "zauberer") {    } else if (form === "zauberer") {
        // Zaubererhut mit Sternen, die um die Spitze kreisen
        p.ellipse(cx, oben + 1.4, 7, 1, "a");
        for (let i = 0; i < 7; i++) p.rechteck(cx - 3.5 + i * 0.5, oben - i, 7 - i, 1, "a");
        p.rechteck(cx - 3.5, oben, 7, 0.5, "c");
        const kreis = anim % 4;
        const punkte = [[cx - 2, oben - 2], [cx + 1, oben - 4], [cx + 2.5, oben - 1], [cx - 1, oben - 5]];
        punkte.forEach(([x, y], i) => { if (i !== kreis) p.fein(x, y, "c"); });
        p.rechteck(cx + 0.5, oben - 7, 1, 1, "c");
    }
}

// ---------- OBERTEIL ----------

// x0 = linke Kante des Oberkoerpers, y0 = Schulterhoehe. Seite: 5 breit (Blick nach rechts), vorne/hinten: 6 breit
function figurOberteil(g, blick, h, x0, y0, oberteil, anim) {
    const k = g.kleidung;
    const form = oberteil.form;
    const breite = blick === "seite" ? 5 : 6;
    const mitte = x0 + breite / 2;
    if (form === "umhang") {
        // Umhang weht hinten, mit Sternen, die funkeln
        const wehen = (anim % 2) * 0.5 + (h.armSchwung ? 0.5 : 0);
        const lang = h.sitzt ? 6 : 10;
        if (blick === "seite") {
            for (let y = 0; y < lang; y += 0.5) g.hinten.rechteck(x0 - 2 - wehen * (y / lang) * 2, y0 + y, 3, 0.5, "8");
            [[x0 - 2, y0 + 3], [x0 - 2.5, y0 + 7]].forEach(([x, y], i) => { if ((i + anim) % 2 === 0) g.hinten.fein(x, y, "k"); });
        } else {
            for (let y = 0; y < lang; y += 0.5) g.hinten.rechteck(x0 - 2 - (y / lang) * wehen, y0 + y, breite + 4 + (y / lang) * wehen * 2, 0.5, "8");
            [[x0 - 1, y0 + 4], [x0 + breite, y0 + 7], [x0 + 2, y0 + 8], [x0 + breite + 1, y0 + 2]].forEach(([x, y], i) => {
                if ((i + anim) % 3 !== 0) g.hinten.fein(x, y, "k");
            });
        }
    }
    k.rechteck(x0, y0, breite, 6, "6");
    // Licht oben, Schatten hinten bzw. unten
    if (blick === "seite") {
        k.rechteck(x0, y0, 1, 6, "8");
        k.feinLinie(x0 + 1, y0, x0 + breite - 0.5, y0, "o");
    } else {
        k.rechteck(x0, y0 + 5.5, breite, 0.5, "8");
        k.feinLinie(x0, y0, x0 + breite - 0.5, y0, "o");
        if (blick === "vorne") k.feinLinie(x0, y0 + 1, x0, y0 + 5, "8");
    }

    if (form === "latz") {
        if (blick === "seite") {
            k.rechteck(x0, y0, breite, 2, "k");
            k.rechteck(x0 + 3, y0, 0.5, 2, "6");
            k.fein(x0 + 3.5, y0 + 3, "8");
            k.rechteck(x0 + 1.5, y0 + 3.5, 2, 1.5, "8");
        } else if (blick === "vorne") {
            k.rechteck(x0, y0, breite, 6, "k");
            k.rechteck(x0 + 1, y0 + 2, breite - 2, 4, "6");
            k.rechteck(x0 + 1, y0, 0.5, 2, "6");
            k.rechteck(x0 + breite - 1.5, y0, 0.5, 2, "6");
            k.fein(x0 + 1, y0 + 2, "e");
            k.fein(x0 + breite - 1.5, y0 + 2, "e");
            k.rechteck(mitte - 1, y0 + 3, 2, 1.5, "8");
            k.feinLinie(mitte - 1, y0 + 3, mitte + 0.5, y0 + 3, "o");
        } else {
            k.rechteck(x0, y0, breite, 4, "k");
            k.linie(x0 + 1, y0, x0 + breite - 2, y0 + 3, "6");
            k.linie(x0 + breite - 2, y0, x0 + 1, y0 + 3, "6");
            k.rechteck(x0, y0 + 4, breite, 2, "6");
        }
    } else if (form === "pulli") {
        k.rechteck(x0, y0 + 5, breite, 1, "8");
        for (let x = x0; x < x0 + breite; x += 1) k.fein(x + 0.5, y0 + 5.5, "o");
        if (blick === "vorne") k.ellipse(mitte, y0, 1.5, 0.8, "8");
        k.feinLinie(x0 + 1, y0 + 2.5, x0 + breite - 1.5, y0 + 2.5, "8");
    } else if (form === "karo") {
        for (let y = 0; y < 6; y += 1) for (let x = 0; x < breite; x += 1) if ((x + y) % 2 === 0) k.rechteck(x0 + x, y0 + y, 0.5, 1, "8");
        for (let y = 0.5; y < 6; y += 2) k.feinLinie(x0, y0 + y, x0 + breite - 0.5, y0 + y, "8");
        if (blick === "vorne") {
            k.ellipse(mitte, y0, 1.4, 0.8, "k");
            for (let y = 1; y < 6; y += 1.5) k.fein(mitte - 0.5, y0 + y, "k");
        } else if (blick === "seite") {
            k.rechteck(x0 + 3, y0, 2, 1, "k");
        }
    } else if (form === "hoodie") {
        if (blick === "seite") {
            k.ellipse(x0, y0 - 0.5, 1.8, 1.4, "8");
            k.rechteck(x0 + 2, y0 + 3, 3, 2, "k");
            k.feinLinie(x0 + 4.5, y0, x0 + 4.5, y0 + 2, "k");
        } else if (blick === "vorne") {
            k.ellipse(mitte, y0, 3, 1, "8");
            k.feinLinie(mitte - 1, y0 + 0.5, mitte - 1, y0 + 2.5, "k");
            k.feinLinie(mitte + 0.5, y0 + 0.5, mitte + 0.5, y0 + 2.5, "k");
            k.rechteck(x0 + 1, y0 + 3.5, breite - 2, 1.5, "k");
            k.feinLinie(x0 + 1, y0 + 3.5, x0 + breite - 1.5, y0 + 3.5, "8");
        } else {
            k.ellipse(mitte, y0 + 1, 2.8, 2, "8");
            k.feinLinie(mitte - 2, y0 + 1, mitte + 1.5, y0 + 1, "k");
        }
    } else if (form === "kimono") {
        if (blick === "vorne") {
            k.linie(x0, y0, mitte - 0.5, y0 + 3, "k");
            k.linie(x0 + breite - 1, y0, mitte, y0 + 3, "k");
        } else if (blick === "seite") {
            k.linie(x0 + 4, y0, x0 + 2, y0 + 3, "k");
        }
        k.rechteck(x0, y0 + 3, breite, 1, "k");
        k.feinLinie(x0, y0 + 3.5, x0 + breite - 0.5, y0 + 3.5, "8");
        // kleine Blueten auf dem Stoff
        [[x0 + 1, y0 + 4.5], [x0 + breite - 1.5, y0 + 1.5]].forEach(([x, y]) => k.fein(x, y, "k"));
        if (blick === "hinten") k.rechteck(mitte - 1.5, y0 + 2, 3, 3, "k");
    } else if (form === "matrose") {
        if (blick === "vorne") {
            k.rechteck(x0, y0, 2, 2, "k");
            k.rechteck(x0 + breite - 2, y0, 2, 2, "k");
            k.feinLinie(x0 + 0.5, y0 + 1.5, x0 + 1.5, y0 + 1.5, "6");
            k.rechteck(mitte - 1, y0 + 2, 2, 1, "p");
            k.fein(mitte - 0.5, y0 + 3, "p");
        } else if (blick === "hinten") {
            k.rechteck(x0, y0, breite, 3, "k");
            k.feinLinie(x0 + 0.5, y0 + 2.5, x0 + breite - 1, y0 + 2.5, "6");
        } else {
            k.rechteck(x0, y0, 3, 2, "k");
            k.rechteck(x0 + 4, y0 + 1, 1, 2, "p");
        }
    } else if (form === "weste") {
        if (blick === "vorne") {
            k.rechteck(mitte - 1, y0, 2, 6, "k");
            [1.5, 3, 4.5].forEach(y => k.fein(mitte - 1.5, y0 + y, "e"));
            k.feinLinie(mitte - 1, y0, mitte - 1, y0 + 5.5, "8");
            k.feinLinie(mitte + 0.5, y0, mitte + 0.5, y0 + 5.5, "8");
        } else if (blick === "seite") {
            k.rechteck(x0 + 3, y0, 2, 6, "k");
            [2, 4].forEach(y => k.fein(x0 + 3, y0 + y, "e"));
        }
    } else if (form === "umhang") {
        const x = blick === "seite" ? x0 + 4 : mitte - 1;
        k.rechteck(x, y0, blick === "seite" ? 1 : 2, 1, "k");
        k.fein(x + 0.5, y0, "w");
    } else if (form === "kleid") {
        // Bluetenkleid: weiter Rock, Blueten, die im Takt die Farbe wechseln
        k.ellipse(mitte, y0 + 6.5, breite / 2 + 2, 2.5, "6", (x, y) => y + 0.5 < y0 + 7);
        k.rechteck(x0 - 2, y0 + 6, breite + 4, 0.5, "8");
        const blueten = [[x0, y0 + 5], [x0 + 3, y0 + 1], [x0 + breite, y0 + 5.5], [x0 + 2, y0 + 3.5], [x0 - 1, y0 + 6]];
        blueten.forEach(([x, y], i) => {
            const farbe = (i + anim) % 2 ? "k" : "w";
            k.fein(x, y, farbe);
            k.fein(x + 0.5, y, "p");
        });
    } else if (form === "astronaut") {
        // Raumanzug: weiss mit Panel und blinkenden Lichtern
        k.rechteck(x0 + (blick === "seite" ? 2 : 1.5), y0 + 1.5, blick === "seite" ? 2.5 : 3, 2.5, "8");
        k.fein(x0 + (blick === "seite" ? 2.5 : 2), y0 + 2, anim % 2 ? "p" : "k");
        k.fein(x0 + (blick === "seite" ? 3.5 : 3.5), y0 + 2, anim % 2 ? "k" : "p");
        k.feinLinie(x0, y0 + 4.5, x0 + breite - 0.5, y0 + 4.5, "8");
        if (blick === "hinten") {
            g.hinten.rechteck(x0 + 0.5, y0 + 0.5, breite - 1, 4, "8");
            g.hinten.fein(x0 + 1, y0 + 1, "p");
        }
    } else if (form === "jacke") {
        // offene Jacke: Hemd in der Mitte, Kragen, Knoepfe, Brusttasche
        if (blick === "vorne") {
            k.rechteck(mitte - 1, y0, 2, 6, "k");
            k.linie(mitte - 2, y0, mitte - 1, y0 + 2, "8");
            k.linie(mitte + 1, y0, mitte, y0 + 2, "8");
            [2, 3.5, 5].forEach(y => k.fein(mitte - 1.5, y0 + y, "p"));
            k.rechteck(x0 + 0.5, y0 + 2, 1.5, 1, "8");
        } else if (blick === "seite") {
            k.rechteck(x0 + 4, y0, 1, 6, "k");
            k.fein(x0 + 3.5, y0 + 2, "p");
            k.fein(x0 + 3.5, y0 + 4, "p");
            k.rechteck(x0 + 1.5, y0, 2, 1, "8");
        } else {
            k.rechteck(x0, y0, breite, 1, "8");
            k.feinLinie(mitte - 0.5, y0 + 1, mitte - 0.5, y0 + 5.5, "8");
        }
    } else if (form === "ringel") {
        for (let y = 1; y < 6; y += 2) k.rechteck(x0, y0 + y, breite, 1, "k");
    } else if (form === "regenbogen") {
        // Regenbogenpulli: sechs Farbstreifen, die langsam nach unten wandern
        const farben = ["A", "B", "C", "D", "E", "F"];
        for (let y = 0; y < 6; y++) k.rechteck(x0, y0 + y, breite, 1, farben[(y - anim + 12) % 6]);
        k.rechteck(x0, y0 + 5.5, breite, 0.5, "8");
        k.fein(x0 + 1, y0 + 1, "k");
    } else if (form === "pyjama") {    } else if (form === "pyjama") {
        for (let y = 0.5; y < 6; y += 1.5) k.feinLinie(x0, y0 + y, x0 + breite - 0.5, y0 + y, "k");
        if (blick === "vorne") [1.5, 3, 4.5].forEach(y => k.fein(mitte - 0.5, y0 + y, "w"));
    }
}

// ---------- ARME, BEINE, WERKZEUG ----------

// richtung: nach welcher Seite ein erhobener Arm geht (1 = rechts, -1 = links), weite: wie weit neben den Kopf
// (erhobene Arme gehen schraeg nach aussen, damit sie nicht ueber dem Gesicht haengen)
function figurArm(g, sx, sy, art, schwung, farbe, hinten, richtung = 1, weite = 2) {
    const k = g.kleidung;
    const hand = hinten ? "s" : "4";
    if (art === "hoch" || art === "winken" || art === "winken2") {
        const wink = art === "winken2" ? 1 : 0;
        const ux = richtung > 0 ? sx + 1 : sx - weite + 1;
        const fx = richtung > 0 ? sx + weite + wink : sx - weite - wink;
        k.rechteck(ux, sy - 1, weite, 2, farbe);
        k.rechteck(fx, sy - 4, 2, 4, farbe);
        k.feinLinie(richtung > 0 ? fx : fx + 1.5, sy - 4, richtung > 0 ? fx : fx + 1.5, sy - 0.5, "8");
        g.haut.ellipse(fx + 1, sy - 4.6, 1.1, 1, hand);
    } else if (art === "vorn") {
        k.rechteck(sx, sy, 4, 2, farbe);
        k.feinLinie(sx, sy + 1.5, sx + 3.5, sy + 1.5, "8");
        g.haut.ellipse(sx + 4.4, sy + 1, 0.9, 1, hand);
    } else if (art === "schlag") {
        k.rechteck(sx + 1, sy + 1, 2, 3, farbe);
        g.haut.ellipse(sx + 2.8, sy + 4.4, 1, 0.9, hand);
    } else {
        k.rechteck(sx + schwung, sy, 2, 4, farbe);
        k.feinLinie(sx + schwung, sy + 3.5, sx + schwung + 1.5, sy + 3.5, "8");
        g.haut.ellipse(sx + schwung + 1, sy + 4.5, 1, 0.9, hand);
    }
}

function figurWerkzeug(g, art, x, y) {
    const w = g.werkzeug;
    if (art === "hacke_vorn") {
        w.linie(x + 1, y + 2, x + 6, y - 3, "t");
        w.rechteck(x + 6, y - 4, 2, 1, "e");
        w.rechteck(x + 7, y - 3, 1, 1, "e");
        w.fein(x + 6, y - 4, "w");
    } else if (art === "hacke_hoch") {
        w.linie(x, y - 3, x - 2, y - 10, "t");
        w.rechteck(x - 4, y - 11, 3, 1, "e");
        w.rechteck(x - 4, y - 10, 1, 1, "e");
        w.fein(x - 3.5, y - 11, "w");
    } else if (art === "hacke_unten") {
        w.linie(x + 2, y + 3, x + 6, y + 8, "t");
        w.rechteck(x + 6, y + 8, 1, 3, "e");
        w.rechteck(x + 7, y + 10, 1, 1, "e");
    }
}

function figurBeine(g, beine, oben, hose, schuhe, blick, anim) {
    const k = g.kleidung;
    const stiefel = schuhe.form === "stiefel";
    const rock = hose.form === "rock";
    beine.forEach(([x, dunkel]) => {
        const hoch = 24 - oben;
        if (rock) g.haut.rechteck(x, oben + 2, 2, hoch - 2, dunkel ? "s" : "4");
        else if (hose.form === "shorts") {
            k.rechteck(x, oben, 2, 3, dunkel ? "9" : "3");
            k.feinLinie(x, oben + 2.5, x + 1.5, oben + 2.5, "9");
            g.haut.rechteck(x, oben + 3, 2, hoch - 3, dunkel ? "s" : "4");
        } else {
            k.rechteck(x, oben, 2, hoch, dunkel ? "9" : "3");
            if (!dunkel) k.feinLinie(x + 1.5, oben, x + 1.5, 23.5, "9");
        }
        if (stiefel) {
            k.rechteck(x, 21, 2, 3, "1");
            k.feinLinie(x, 21, x + 1.5, 21, "l");
        }
        if (blick === "seite") {
            k.rechteck(x, 24, 3, 1, "1");
            k.feinLinie(x + 1, 24, x + 2.5, 24, "l");
        } else {
            k.rechteck(x - (x < 9 ? 0.5 : 0), 24, 2.5, 1, "1");
            k.fein(x < 9 ? x - 0.5 : x + 2, 24, "l");
        }
        if (schuhe.form === "wolke") {
            // Wolkenschuhe: kleine Wolken, die im Takt aufpuffen
            const puff = anim % 2 ? 0.5 : 0;
            g.kleidung.ellipse(x + 1, 24.6, 1.8 + puff, 0.9, "1");
            g.kleidung.fein(x, 24.2 - puff, "l");
            g.kleidung.fein(x + 2, 24.5, "l");
        }
    });
    if (rock) {
        const breit = blick === "seite" ? 0 : 1;
        k.rechteck(6 - breit, oben, 6 + 2 * breit, 2, "3");
        k.rechteck(5 - breit, oben + 2, 8 + 2 * breit, 1, "9");
        for (let x = 6 - breit; x < 12 + breit; x += 1.5) k.feinLinie(x, oben + 0.5, x, oben + 2, "9");
    }
    if (hose.form === "karo") {
        beine.forEach(([x]) => {
            for (let y = oben; y < 23; y += 1.5) k.feinLinie(x, y, x + 1.5, y, "u");
            k.feinLinie(x + 1, oben, x + 1, 23.5, "u");
        });
    }
    if (schuhe.form === "clogs" || schuhe.form === "rakete") {
        beine.forEach(([x]) => {
            if (schuhe.form === "clogs") {
                k.rechteck(x - 0.5, 23, 3.5, 2, "1");
                k.feinLinie(x, 23, x + 2.5, 23, "l");
                k.fein(x + 2.5, 24, "l");
            } else {
                // Raketenschuhe: Flammen unter den Sohlen, die flackern
                k.feinLinie(x, 24.5, x + 2, 24.5, "l");
                const lang = 1 + (anim % 2) * 0.5;
                g.werkzeug.fein(x + 0.5, 25, "f");
                g.werkzeug.fein(x + 1, 25 + lang * 0.5, "g");
                g.werkzeug.fein(x + 1.5, 25, "f");
            }
        });
    }
    if (hose.form === "sterne") {
        beine.forEach(([x], i) => {
            if ((i + anim) % 2 === 0) k.fein(x + 0.5, oben + 2, "k");
            if ((i + anim) % 2 === 1) k.fein(x + 1, oben + 4, "k");
            k.fein(x + 0.5, oben + 5.5, "k");
        });
    }
}

// ---------- ACCESSOIRES ----------

function figurAccessoire(g, blick, cx, cy, y0, x0, acc, bild, anim) {
    const a = g.accessoire;
    const hinten = g.hinten;
    const form = acc.form;
    if (!form || form === "keins") return;
    const ay = Math.round(cy) - 1;
    const seite = blick === "seite";
    const breite = seite ? 5 : 6;
    if (form === "brille" || form === "herzbrille") {
        if (blick === "hinten") {
            a.feinLinie(cx - 5, ay + 0.5, cx - 4, ay + 0.5, "x");
            a.feinLinie(cx + 4, ay + 0.5, cx + 5, ay + 0.5, "x");
            return;
        }
        const glaeser = seite ? [Math.round(cx + 1)] : [cx - 3, cx + 1];
        glaeser.forEach(gx => {
            if (form === "herzbrille") {
                // Herz-Glaeser: deutliche Herzform mit Rahmen
                const reihen = [".XX.XX.", "XYYXYYX", "XYYYYYX", ".XYYYX.", "..XYX..", "...X..."];
                reihen.forEach((reihe, y) => [...reihe].forEach((c, x) => {
                    if (c === "X") a.fein(gx - 0.75 + x / 2, ay - 0.5 + y / 2, "x");
                    if (c === "Y") a.fein(gx - 0.75 + x / 2, ay - 0.5 + y / 2, "y");
                }));
                a.fein(gx, ay + 0.5, "z");
            } else {
                a.feinLinie(gx - 0.5, ay - 0.5, gx + 2, ay - 0.5, "x");
                a.feinLinie(gx - 0.5, ay + 2, gx + 2, ay + 2, "x");
                a.feinLinie(gx - 0.5, ay - 0.5, gx - 0.5, ay + 2, "x");
                a.feinLinie(gx + 2, ay - 0.5, gx + 2, ay + 2, "x");
                a.rechteck(gx, ay, 2, 2, "y");
                a.fein(gx, ay, "z");
                a.fein(gx + 0.5, ay + 0.5, "z");
            }
        });
        if (seite) a.feinLinie(cx - 2, ay + 0.5, cx + 0.5, ay + 0.5, "x");
        else {
            a.feinLinie(cx - 1, ay + 0.5, cx + 0.5, ay + 0.5, "x");
            a.feinLinie(cx - 5, ay + 0.5, cx - 3.5, ay + 0.5, "x");
            a.feinLinie(cx + 3.5, ay + 0.5, cx + 5, ay + 0.5, "x");
        }
    } else if (form === "monokel") {
        if (blick === "hinten") return;
        const gx = seite ? Math.round(cx + 1) : cx + 1;
        a.ellipse(gx + 1, ay + 1, 1.8, 1.8, "x", (x, y) => (x + 0.5 - gx - 1) ** 2 + (y + 0.5 - ay - 1) ** 2 > 1.2);
        a.fein(gx + 0.5, ay + 0.5, "z");
        a.feinLinie(gx + 2.5, ay + 2.5, gx + 2.5, ay + 6, "y");
    } else if (form === "schal") {
        a.rechteck(x0 - 1, y0 - 1, breite + 2, 2, "x");
        for (let x = 0; x < breite + 2; x += 1) a.feinLinie(x0 - 1 + x, y0 - 1, x0 - 1 + x, y0 + 0.5, x % 2 ? "x" : "y");
        const tx = seite ? x0 - 2 : blick === "vorne" ? x0 + breite - 2 : x0 + 1;
        const wehen = seite && anim % 2 ? -0.5 : 0;
        a.rechteck(tx + wehen, y0 + 1, 2, 4, "x");
        a.feinLinie(tx + wehen, y0 + 4.5, tx + wehen + 1.5, y0 + 4.5, "z");
        a.feinLinie(tx + wehen, y0 + 2, tx + wehen + 1.5, y0 + 2, "y");
    } else if (form === "rucksack") {
        if (seite) {
            hinten.rechteck(x0 - 3, y0, 3, 5, "x");
            hinten.rechteck(x0 - 3, y0, 3, 1.5, "y");
            hinten.fein(x0 - 2, y0 + 1.5, "z");
            hinten.feinLinie(x0 - 3, y0 + 3, x0 - 0.5, y0 + 3, "y");
            a.linie(x0, y0, x0 + 1, y0 + 3, "y");
        } else if (blick === "vorne") {
            a.rechteck(x0 + 1, y0, 0.5, 4, "y");
            a.rechteck(x0 + breite - 1.5, y0, 0.5, 4, "y");
            a.fein(x0 + 1, y0 + 3, "z");
            a.fein(x0 + breite - 1.5, y0 + 3, "z");
        } else {
            a.rechteck(x0, y0, breite, 5, "x");
            a.ellipse(x0 + breite / 2, y0 + 0.5, breite / 2, 1, "y");
            a.rechteck(x0 + 1, y0 + 2.5, breite - 2, 2, "y");
            a.fein(x0 + breite / 2 - 0.5, y0 + 1, "z");
            a.feinLinie(x0 + 1, y0 + 2.5, x0 + breite - 1.5, y0 + 2.5, "x");
        }
    } else if (form === "kette" || form === "lei") {
        if (blick === "hinten") return;
        const farben = form === "lei" ? ["x", "y", "z"] : ["x", "y"];
        const punkte = [];
        if (seite) punkte.push([x0 + 4, y0], [x0 + 4.5, y0 + 0.5], [x0 + 4, y0 + 1], [x0 + 3.5, y0 + 1.5]);
        else for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            punkte.push([x0 + t * (breite - 0.5), y0 + Math.sin(t * Math.PI) * (form === "lei" ? 2.5 : 2)]);
        }
        punkte.forEach(([x, y], i) => {
            a.fein(x, y, farben[i % farben.length]);
            if (form === "lei") a.fein(x, y + 0.5, farben[(i + 1) % farben.length]);
        });
    } else if (form === "fliege") {
        if (blick === "hinten") return;
        if (seite) {
            a.rechteck(x0 + 4, y0, 1, 1.5, "x");
            a.fein(x0 + 4.5, y0 + 0.5, "y");
        } else {
            const x = x0 + breite / 2 - 1;
            a.linie(x - 1, y0, x - 1, y0 + 1, "x");
            a.linie(x + 2, y0, x + 2, y0 + 1, "x");
            a.rechteck(x - 0.5, y0 + 0.5, 1, 0.5, "x");
            a.rechteck(x + 1.5, y0 + 0.5, 1, 0.5, "x");
            a.rechteck(x + 0.5, y0, 1, 1.5, "y");
            a.fein(x - 1, y0, "z");
        }
    } else if (form === "ohrringe") {
        if (blick === "vorne") {
            a.fein(cx - 5, cy + 1.5, "x");
            a.fein(cx - 5, cy + 2, "y");
            a.fein(cx + 4.5, cy + 1.5, "x");
            a.fein(cx + 4.5, cy + 2, "y");
        } else if (seite) {
            a.fein(cx - 1.5, cy + 1.5, "x");
            a.fein(cx - 1.5, cy + 2, "y");
            a.fein(cx - 1.5, cy + 1.5, "z");
        }
    } else if (form === "tasche") {
        // Umhaengetasche: Riemen quer ueber den Koerper, Tasche an der Huefte
        if (blick === "vorne") {
            a.linie(x0, y0, x0 + breite - 1, y0 + 4, "y");
            a.rechteck(x0 + breite - 1, y0 + 4, 2.5, 2, "x");
            a.feinLinie(x0 + breite - 1, y0 + 4, x0 + breite + 1, y0 + 4, "y");
            a.fein(x0 + breite, y0 + 4.5, "z");
        } else if (seite) {
            a.linie(x0 + 1, y0, x0 + 3, y0 + 4, "y");
            a.rechteck(x0 + 2, y0 + 4, 2.5, 2, "x");
            a.fein(x0 + 3, y0 + 4.5, "z");
        } else {
            a.linie(x0 + breite - 1, y0, x0, y0 + 4, "y");
        }
    } else if (form === "gitarre") {
        // Gitarre auf dem Ruecken: schraeg, mit Hals und Schallloch
        const ziel = blick === "hinten" ? a : hinten;
        const gx = seite ? x0 - 1 : x0 + 2;
        ziel.ellipse(gx, y0 + 5, 2.2, 2, "x");
        ziel.ellipse(gx + 0.8, y0 + 2.8, 1.6, 1.4, "x");
        ziel.linie(gx + 1.5, y0 + 1.5, gx + 4, y0 - 3, "y");
        ziel.rechteck(gx + 3.5, y0 - 4, 1.5, 1.5, "y");
        if (blick === "hinten") ziel.ellipse(gx + 0.2, y0 + 4.2, 0.7, 0.7, "y");
        ziel.fein(gx - 1, y0 + 4.5, "z");
    } else if (form === "gluehwuermchen") {
        // drei Gluehwuermchen kreisen um den Kopf
        for (let i = 0; i < 3; i++) {
            const winkel = (anim / 4 + i / 3) * Math.PI * 2;
            const x = cx + Math.cos(winkel) * 6;
            const y = cy - 1 + Math.sin(winkel) * 2.5;
            a.fein(x, y, "x");
            a.fein(x + 0.5, y, "y");
            a.fein(x, y - 0.5, "z");
        }
    } else if (["fluegel", "fledermaus", "engel", "schmetterling", "drache", "libelle"].includes(form)) {
        figurFluegel(hinten, form, seite, x0, y0, breite, anim);
    }
}

// Fluegel am Ruecken: 4 Animationsbilder (auf, mitte, ab, mitte), jede Art mit eigener Form und Zeichnung
function figurFluegel(p, form, seite, x0, y0, breite, anim) {
    const schlag = [-2.5, -1, 1, -1][anim % 4];
    const fluegel = (fx, r) => {
        const y = y0 + 1;
        if (form === "fluegel" || form === "libelle") {
            // Feen- und Libellenfluegel: zwei grosse, durchscheinende Blaetter mit Adern
            const schmal = form === "libelle";
            p.ellipseFein(fx + r * 4.5, y - 3.5 + schlag, 4.6, schmal ? 1.8 : 4, "x");
            p.ellipseFein(fx + r * 3.5, y + 4 + schlag * 0.4, schmal ? 4.2 : 3.2, schmal ? 1.5 : 3, "y");
            p.feinLinie(fx, y, fx + r * 8, y - 6 + schlag, "z");
            p.feinLinie(fx, y + 1, fx + r * 6, y + 5 + schlag * 0.4, "z");
            p.feinLinie(fx + r * 3, y - 2 + schlag * 0.5, fx + r * 6, y - 2 + schlag, "z");
        } else if (form === "engel") {
            // Engelsfluegel: grosse Federfluegel in Stufen, von hell nach etwas dunkler, mit Deckfedern
            p.ellipseFein(fx + r * 3.5, y - 2.5 + schlag, 4, 3.4, "x");
            for (let i = 0; i < 6; i++) {
                const yy = y - 3 + schlag * (1 - i / 6) + i * 1.6;
                const lang = 8.5 - i * 1.1;
                const x0f = r > 0 ? fx : fx - lang;
                p.rechteck(x0f, yy, lang, 1.6, i % 2 ? "y" : "x");
                p.fein(fx + r * (lang - 0.3), yy + 1, "y");
            }
            p.feinLinie(fx, y - 3 + schlag, fx + r * 7, y - 5.5 + schlag, "z");
            p.feinLinie(fx + r, y - 1 + schlag * 0.5, fx + r * 5, y - 2.5 + schlag * 0.7, "z");
        } else if (form === "fledermaus") {
            const spitze = y - 7 + schlag * 1.5;
            p.linieFein(fx, y, fx + r * 7, spitze, "x");
            p.linieFein(fx + r * 7, spitze, fx + r * 9, y + 5, "x");
            for (let i = 1; i <= 7; i++) p.linieFein(fx, y + 1, fx + r * i * 1.2, spitze + i * 1.3 + 1, i % 2 ? "y" : "x");
            p.feinLinie(fx + r * 7, spitze, fx + r * 4, y + 5, "z");
            p.feinLinie(fx + r * 7, spitze, fx + r * 7.5, y + 5, "z");
            p.fein(fx + r * 7, spitze - 0.5, "z");
        } else if (form === "schmetterling") {
            p.ellipseFein(fx + r * 4.5, y - 2.5 + schlag, 4.4, 4, "x");
            p.ellipseFein(fx + r * 3.5, y + 4.5 + schlag * 0.4, 3.2, 3, "y");
            p.ellipseFein(fx + r * 5.2, y - 3 + schlag, 1.8, 1.6, "z");
            p.ellipseFein(fx + r * 3.5, y + 4.5 + schlag * 0.4, 1.2, 1.1, "z");
            p.fein(fx + r * 5.5, y - 3.5 + schlag, "w");
            p.feinLinie(fx + r * 1, y - 5 + schlag, fx + r * 7, y - 6 + schlag, "y");
        } else if (form === "drache") {
            const spitze = y - 7 + schlag * 1.5;
            p.linieFein(fx, y, fx + r * 8.5, spitze, "x");
            p.ellipseFein(fx + r * 5, y + 1.5 + schlag * 0.5, 4.4, 4.2, "y", (xx, yy) => yy + 0.5 > spitze + 2.5);
            for (let i = 1; i <= 4; i++) p.linieFein(fx + r, y + 1, fx + r * (2.5 + i * 1.6), y + 5.5, "x");
            p.fein(fx + r * 9, spitze - 0.5, "z");
            if (anim % 2 === 0) p.fein(fx + r * 7, y + 4, "z");
        }
    };
    if (seite) fluegel(x0, -1);
    else {
        fluegel(x0, -1);
        fluegel(x0 + breite - 1, 1);
    }
}

// ---------- DIE GANZE FIGUR ----------
// blick: "seite" (Blick nach rechts, fuer links wird gespiegelt), "vorne" oder "hinten"; anim = Animationsbild (0 bis 3)
function figurRaster(pose, bild, blinzelt, teile, blick = "seite", anim = 0) {
    const g = {};
    FIGUR_SCHICHTEN.forEach(s => { g[s] = figurGitter(); });
    const h = figurHaltung(pose, bild);
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
            g.kleidung.fein(14, 20, "l");
            figurOberteil(g, "seite", h, 6, y0, teile.oberteil, anim);
            g.haut.rechteck(8, y0 - 1, 2, 1, "4");
            figurArm(g, 9, y0 + 1, "vorn", 0, aermel, false);
            figurKopfSeite(g, cx, cy, geschlossen, teile.augen, blinzelt, anim);
            figurHautMuster(g, teile, cx, cy, y0, "seite", anim);
            figurHaare(g, "seite", cx, cy, teile.frisur.form, bild, anim);
            figurHut(g, "seite", cx, cy, teile.kopf.form, bild, anim);
            figurAccessoire(g, "seite", cx, cy, y0, 6, teile.accessoire, bild, anim);
        } else {
            const cy = 6.6 + w;
            const y0 = 12 + w;
            figurBeine(g, [[7 + h.beinHinten, true], [9 + h.beinVorn, false]], 18 + w, teile.hose, teile.schuhe, "seite", anim);
            figurArm(g, 6 + h.lehnen, y0 + 1, h.armHinten, -h.armSchwung, "8", true, -1, 2);
            figurOberteil(g, "seite", h, 6 + h.lehnen, y0, teile.oberteil, anim);
            g.haut.rechteck(8 + h.lehnen, y0 - 1, 2, 1, "4");
            figurArm(g, 9 + h.lehnen, y0 + 1, h.armVorn, h.armSchwung, aermel, false, 1, 4);
            if (h.werkzeug) figurWerkzeug(g, h.werkzeug, 10 + h.lehnen, y0 + 1);
            figurKopfSeite(g, cx, cy, geschlossen, teile.augen, blinzelt, anim);
            figurHautMuster(g, teile, cx, cy, y0, "seite", anim);
            figurHaare(g, "seite", cx, cy, teile.frisur.form, bild, anim);
            figurHut(g, "seite", cx, cy, teile.kopf.form, bild, anim);
            figurAccessoire(g, "seite", cx, cy, y0, 6 + h.lehnen, teile.accessoire, bild, anim);
        }
    } else {
        const vorne = blick === "vorne";
        const cy = (h.sitzt ? 10.6 : 6.6) + w;
        const y0 = (h.sitzt ? 16 : 12) + w;
        const x0 = 6 + h.lehnen;
        if (h.sitzt) {
            g.kleidung.ellipse(9, 22.6, 5, 1.6, "3");
            g.kleidung.ellipse(9, 23.2, 5, 1, "9", (x, y) => y + 0.5 > 23.2);
            if (teile.hose.form === "shorts" || teile.hose.form === "rock") g.haut.ellipse(9, 23.4, 4.6, 0.8, "4");
            g.kleidung.ellipse(4, 23.6, 1.3, 1, "1");
            g.kleidung.ellipse(14, 23.6, 1.3, 1, "1");
        } else {
            figurBeine(g, [[6, false], [10, false]], 18 + w, teile.hose, teile.schuhe, blick, anim);
            if (teile.hose.form !== "rock") g.kleidung.rechteck(6, 18 + w, 6, 1, "3");
        }
        figurOberteil(g, blick, h, x0, y0, teile.oberteil, anim);
        g.haut.rechteck(x0 + 2, y0 - 1, 2, 1, vorne ? "4" : "s");
        const armL = h.armHinten === "hoch" ? "hoch" : "unten";
        const armR = h.armVorn === "hoch" || h.armVorn === "winken" || h.armVorn === "winken2" ? h.armVorn : "unten";
        figurArm(g, x0 - 2, y0, h.sitzt ? "unten" : armL, 0, aermel, !vorne, -1, 2);
        figurArm(g, x0 + 6, y0, h.sitzt ? "unten" : armR, 0, aermel, !vorne, 1, 2);
        if (vorne) figurKopfVorne(g, cx, cy, geschlossen, teile.augen, blinzelt, anim);
        else figurKopfHinten(g, cx, cy);
        if (vorne) figurHautMuster(g, teile, cx, cy, y0, blick, anim);
        figurHaare(g, blick, cx, cy, teile.frisur.form, bild, anim);
        figurHut(g, blick, cx, cy, teile.kopf.form, bild, anim);
        figurAccessoire(g, blick, cx, cy, y0, x0, teile.accessoire, bild, anim);
    }

    // Umriss so dick wie im restlichen Spiel (2 feine Pixel) um alles, was gezeichnet ist
    const vollRaster = Array.from({ length: FIGUR_RH }, (_, y) => Array.from({ length: FIGUR_RB }, (_, x) =>
        FIGUR_SCHICHTEN.some(s => s !== "umriss" && g[s].raster[y][x])));
    const voll = (x, y) => x >= 0 && y >= 0 && x < FIGUR_RB && y < FIGUR_RH && vollRaster[y][x];
    for (let y = 0; y < FIGUR_RH; y++) {
        for (let x = 0; x < FIGUR_RB; x++) {
            if (voll(x, y)) continue;
            let nah = false;
            for (let dy = -2; dy <= 2 && !nah; dy++) {
                for (let dx = -2; dx <= 2 && !nah; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) <= 2 && voll(x + dx, y + dy)) nah = true;
                }
            }
            if (nah) g.umriss.raster[y][x] = "7";
        }
    }
    // Schatten auf dem Boden
    for (let y = FIGUR_RH - 2; y < FIGUR_RH; y++) {
        for (let x = Math.round((4 + FIGUR_LINKS) * FIGUR_FEIN); x < Math.round((14 + FIGUR_LINKS) * FIGUR_FEIN); x++) if (!g.umriss.raster[y][x] && !voll(x, y)) g.umriss.raster[y][x] = "q";
    }
    return g;
}

const figurUrlCache = {};

// Farben aller Teile; abgeleitet: d = dunkle Haarfarbe, o = helle Oberteil-Kante
function figurFarben(teile) {
    const f = {
        ...FIGUR_FESTE_FARBEN, q: "rgba(0, 0, 0, 0.18)",
        ...teile.haut.farben, ...teile.augen.farben, ...teile.haarfarbe.farben, ...teile.oberteil.farben,
        ...teile.hose.farben, ...teile.schuhe.farben, ...(teile.kopf.farben || {}), ...(teile.accessoire.farben || {})
    };
    if (!f.d && f[2]) f.d = mischeHex(f[2], "#000000", 0.28);
    if (!f.o && f[6]) f.o = mischeHex(f[6], "#ffffff", 0.35);
    if (!f.f) f.f = "#ff5a1a";
    if (!f.g) f.g = "#ffd23a";
    if (!f.v) f.v = "#fff6a0";
    if (!f.p) f.p = "#ffd23a";
    return f;
}

// Hat die Figur legendaere, animierte Teile? Dann gibt es 4 Animationsbilder
function figurHatAnimation(teile) {
    return Object.values(teile).some(tl => tl.anim);
}

// Farbe als [r, g, b, a] (fuer das schnelle Zeichnen der Schichten), mit Zwischenspeicher
const figurFarbCache = {};
function figurRgba(farbe) {
    if (!figurFarbCache[farbe]) {
        const stift = figurFarbStift();
        stift.clearRect(0, 0, 1, 1);
        stift.fillStyle = farbe;
        stift.fillRect(0, 0, 1, 1);
        figurFarbCache[farbe] = Array.from(stift.getImageData(0, 0, 1, 1).data);
    }
    return figurFarbCache[farbe];
}
let figurFarbLeinwand = null;
function figurFarbStift() {
    if (!figurFarbLeinwand) {
        figurFarbLeinwand = document.createElement("canvas");
        figurFarbLeinwand.width = figurFarbLeinwand.height = 1;
    }
    return figurFarbLeinwand.getContext("2d", { willReadFrequently: true });
}

// Alle Schichten eines Figur-Bilds als Leinwaende (null = Schicht ist leer). Kein PNG-Kodieren mehr:
// das hat pro neuem Bild ca. 10 ms gekostet und im Duo (zwei Figuren) zu Rucklern gefuehrt.
function figurSchichten(teile, pose, bild, blinzelt, blick = "seite", anim = 0) {
    const schluessel = FIGUR_KATEGORIEN.map(k => teile[k.id].id).join(",") + "|" + pose + "|" + bild + "|" + (blinzelt ? 1 : 0) + "|" + blick + "|" + anim;
    if (!figurUrlCache[schluessel]) {
        const g = figurRaster(pose, bild, blinzelt, teile, blick, anim);
        const farben = { ...SPRITE_FARBEN, ...figurFarben(teile) };
        const schichten = {};
        FIGUR_SCHICHTEN.forEach(s => {
            const raster = g[s].raster;
            if (!raster.some(zeile => zeile.some(Boolean))) {
                schichten[s] = null;
                return;
            }
            const leinwand = document.createElement("canvas");
            leinwand.width = FIGUR_RB;
            leinwand.height = FIGUR_RH;
            const stift = leinwand.getContext("2d");
            const daten = stift.createImageData(FIGUR_RB, FIGUR_RH);
            for (let y = 0; y < FIGUR_RH; y++) {
                for (let x = 0; x < FIGUR_RB; x++) {
                    const farbe = raster[y][x] && farben[raster[y][x]];
                    if (!farbe) continue;
                    const [r, gr, b, a] = figurRgba(farbe);
                    const i = (y * FIGUR_RB + x) * 4;
                    daten.data[i] = r;
                    daten.data[i + 1] = gr;
                    daten.data[i + 2] = b;
                    daten.data[i + 3] = a;
                }
            }
            stift.putImageData(daten, 0, 0);
            schichten[s] = leinwand;
        });
        figurUrlCache[schluessel] = schichten;
    }
    return figurUrlCache[schluessel];
}

// Haeufige Bilder einer Figur vorbereiten, wenn der Browser gerade nichts zu tun hat (ein Bild pro Pause),
// damit beim Laufen und Blinzeln kein neues Bild mitten im Spiel gezeichnet werden muss
const figurVorbereitet = new Set();
const figurWarteschlange = [];
function figurVorwaermen(teile) {
    const schluessel = FIGUR_KATEGORIEN.map(k => teile[k.id].id).join(",");
    if (figurVorbereitet.has(schluessel)) return;
    figurVorbereitet.add(schluessel);
    const anims = figurHatAnimation(teile) ? [0, 1, 2, 3] : [0];
    ["stehen", "laufen", "sitzen"].forEach(pose => {
        for (let bild = 0; bild < FIGUR_BILDER[pose]; bild++) {
            ["seite", "vorne"].forEach(blick => anims.forEach(anim => [false, true].forEach(blinzelt =>
                figurWarteschlange.push([teile, pose, bild, blinzelt, blick, anim]))));
        }
    });
    figurArbeite();
}
function figurArbeite() {
    if (!figurWarteschlange.length) return;
    const weiter = window.requestIdleCallback || (rueckruf => setTimeout(rueckruf, 50));
    weiter(() => {
        const auftrag = figurWarteschlange.shift();
        if (auftrag) figurSchichten(...auftrag);
        figurArbeite();
    });
}

// Welche Schicht bekommt welchen CSS-Effekt (nur Aussehen)
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
        const leinwand = document.createElement("canvas");
        leinwand.width = FIGUR_RB;
        leinwand.height = FIGUR_RH;
        leinwand.className = "figur-schicht schicht-" + s;
        huelle.appendChild(leinwand);
        bilder[s] = leinwand;
    });
    return { huelle, bilder, letzte: {} };
}

function zeigeFigurBild(bild, teile, pose, nummer, blinzelt, blick = "seite") {
    // Legendaere Teile haben eigene Animationsbilder (unabhaengig von der Pose, etwa 4-mal pro Sekunde)
    const anim = figurHatAnimation(teile) ? Math.floor(performance.now() / 240) % 4 : 0;
    const schichten = figurSchichten(teile, pose, nummer % (FIGUR_BILDER[pose] || 1), blinzelt, blick, anim);
    const fx = figurSchichtFx(teile);
    FIGUR_SCHICHTEN.forEach(s => {
        const img = bild.bilder[s];
        if (bild.letzte[s] !== schichten[s]) {
            bild.letzte[s] = schichten[s];
            const stift = img.getContext("2d");
            stift.clearRect(0, 0, FIGUR_RB, FIGUR_RH);
            if (schichten[s]) stift.drawImage(schichten[s], 0, 0);
            img.style.visibility = schichten[s] ? "" : "hidden";
        }
        const teilMitFx = fx[s];
        const klasse = "figur-schicht schicht-" + s + (teilMitFx ? " figfx-" + teilMitFx : "");
        if (img.className !== klasse) img.className = klasse;
    });
    // Farbe fuer Leuchten und Funkeln
    const leuchtTeil = [teile.augen, teile.kopf, teile.accessoire, teile.frisur, teile.haarfarbe, teile.haut, teile.oberteil].find(tl => tl.fxFarbe);
    if (leuchtTeil) bild.huelle.style.setProperty("--fx-farbe", leuchtTeil.fxFarbe);
    bild.huelle.classList.toggle("figfx-schwebt", Object.values(teile).some(tl => tl.fx === "schweben" || tl.fx === "geist"));
}

// ---------- FIGUREN AUF DEM HOF ----------
// Jede Figur: { art: "mensch" | "begleiter", teile/skin, name, partner, x, zielX, richtung, zustand, ... }

const figuren = [];

// Wo auf dem Hof gelaufen wird (in Prozent der Breite): Spieler rechts, Begleiter links
const FIGUR_BEREICH = { mensch: [56, 86], begleiter: [14, 44] };
function figurBereich(art) {
    return FIGUR_BEREICH[art === "mensch" ? "mensch" : "begleiter"];
}

function neueFigur(art, optionen) {
    const f = {
        art, x: 0, zielX: 50, richtung: 1, zustand: "stehen", zustandMs: 2000, bild: 0, bildMs: 0,
        blinzelMs: 2500, blinzeltBis: 0, idleMs: 9000 + Math.random() * 6000, zzzMs: 0, effektMs: 0, ...optionen
    };
    const [von, bis] = figurBereich(art);
    f.x = von + Math.random() * (bis - von);
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
    const bereich = figurBereich(f.art);
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
        figurVorwaermen(teile);
        const blick = f.blick || "seite";
        zeigeFigurBild(f.bildEl, teile, f.zustand, f.bild, blinzelt, blick);
        f.bildEl.huelle.style.transform = blick === "seite" && f.richtung < 0 ? "scaleX(-1)" : "";
        figurFunkeln(f, teile);
        // Kleine Aura: in der Farbe des leuchtenden Teils, sonst ein warmes Licht
        const leuchtend = Object.values(teile).filter(tl => tl.fxFarbe).sort((a, b) => kosmetikSeltenheit(b) - kosmetikSeltenheit(a))[0];
        f.bildEl.huelle.classList.add("figur-aura");
        f.bildEl.huelle.style.setProperty("--aura", leuchtend ? leuchtend.fxFarbe : "#fff3c4");
        return;
    }
    // Begleiter des Mitspielers: gleiches Bild und dieselben Effekte wie der eigene
    const skin = HAUSTIER_SKINS.find(s => s.id === f.skin) || HAUSTIER_SKINS[0];
    const pose = ["laufen", "stehen", "sitzen", "liegen", "schlafen"].includes(f.zustand) ? f.zustand : "sitzen";
    const url = haustierUrl(skin, pose, f.bild, blinzelt, haustierAnim(skin));
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

// Kleiner Ausschnitt der eigenen Figur als Symbol fuer eine Kategorie (Kopf, Oberkoerper oder Beine)
const FIGUR_AUSSCHNITTE = { haut: 3, augen: 7, frisur: 2, haarfarbe: 2, kopf: 0, oberteil: 16, accessoire: 14, hose: 22, schuhe: 26 };
function figurAusschnitt(kategorie) {
    const fenster = el("div", "figur-ausschnitt");
    const figur = erstelleFigurBild(2);
    zeigeFigurBild(figur, figurTeileAus(profilVorschau || profil().teile, false), "stehen", 0, false, "vorne");
    figur.huelle.style.marginTop = -(FIGUR_AUSSCHNITTE[kategorie] || 0) * 2 + "px";
    figur.huelle.style.marginLeft = "-4px";
    fenster.appendChild(figur.huelle);
    return fenster;
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
    [["laufen", t("Laufen")], ["winken", t("Winken")], ["hacken", t("Hacken")], ["tanzen", t("Tanzen")], ["jubeln", t("Jubeln")], ["sitzen", t("Sitzen")]]
        .forEach(([pose, name]) => {
        const symbol = { laufen: "kat_schuhe", winken: "hand", hacken: "hacke", tanzen: "note", jubeln: "party", sitzen: "stuhl" }[pose];
        const knopf = el("button", "knopf profil-pose" + (pose === profilPose ? " aktiv" : ""), null, [pixelIcon("sprite:sym_" + symbol, 22)]);
        setzeTipp(knopf, name);
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
        const knopf = el("button", "knopf reiter-knopf" + (k.id === profilKategorie ? " aktiv" : ""), null, [pixelIcon("sprite:sym_kat_" + k.id, 22), el("span", null, k.name)]);
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
