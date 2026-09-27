"use strict";

// ============================================================
// SPROUTVALE: Pixel-Grafiken fuer die besonderen Samenlaeden (epische und legendaere Skins)
// Jedes Gebaeude wird auf einem kleinen Raster gezeichnet (32 Pixel breit) und dann gross skaliert,
// genau wie Haus, Scheune und Pflanzen. Formen bekommen automatisch Licht oben, Schatten unten
// und einen dunklen 1-Pixel-Umriss. Details (Fenster, Streifen, Glanz) kommen danach ohne Umriss dazu.
// Legendaere Laeden haben mehrere Bilder (frames) fuer kleine Animationen.
// ============================================================

const LADEN_PIXEL_BREITE = 32;

function farbeMischen(hex, anteil) {
    // anteil > 0 = heller, < 0 = dunkler
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const ziel = anteil > 0 ? 255 : 0;
    const a = Math.abs(anteil);
    r = Math.round(r + (ziel - r) * a);
    g = Math.round(g + (ziel - g) * a);
    b = Math.round(b + (ziel - b) * a);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function neuesPixelBild(H) {
    const W = LADEN_PIXEL_BREITE;
    const leer = () => Array.from({ length: H }, () => Array(W).fill(null));
    const basis = leer();
    const deko = leer();
    const setze = (ebene, x, y, c) => {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && x < W && y >= 0 && y < H) ebene[y][x] = c;
    };
    const api = {
        W, H,
        // Formen (bekommen Licht, Schatten und Umriss)
        r(x, y, w, h, c) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setze(basis, xx, yy, c); },
        ell(cx, cy, rx, ry, c, nurOben = false) {
            for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
                if (nurOben && y > cy) continue;
                const t = (y - cy) / ry;
                const dx = rx * Math.sqrt(Math.max(0, 1 - t * t));
                for (let x = Math.round(cx - dx); x <= Math.round(cx + dx); x++) setze(basis, x, y, c);
            }
        },
        // Dreieck mit Spitze oben in der Mitte (Dach, Zelt)
        dach(x1, x2, yUnten, yOben, c) {
            const mitte = (x1 + x2) / 2;
            for (let y = yOben; y <= yUnten; y++) {
                const halb = ((x2 - x1) / 2) * ((y - yOben) / Math.max(1, yUnten - yOben));
                for (let x = Math.round(mitte - halb); x <= Math.round(mitte + halb); x++) setze(basis, x, y, c);
            }
        },
        poly(punkte, c) {
            const innen = (px, py) => {
                let drin = false;
                for (let i = 0, j = punkte.length - 1; i < punkte.length; j = i++) {
                    const [xi, yi] = punkte[i];
                    const [xj, yj] = punkte[j];
                    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) drin = !drin;
                }
                return drin;
            };
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (innen(x + 0.5, y + 0.5)) basis[y][x] = c;
        },
        loesche(x, y, w, h) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (basis[yy] && xx >= 0 && xx < W) basis[yy][xx] = null; },
        // Details (ohne Umriss)
        p(x, y, c) { setze(deko, x, y, c); },
        dr(x, y, w, h, c) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setze(deko, xx, yy, c); },
        dell(cx, cy, rx, ry, c) {
            for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
                const t = (y - cy) / ry;
                const dx = rx * Math.sqrt(Math.max(0, 1 - t * t));
                for (let x = Math.round(cx - dx); x <= Math.round(cx + dx); x++) setze(deko, x, y, c);
            }
        },
        // nur Pixel ueberschreiben, die schon zur Form gehoeren (fuer Streifen, Maserung)
        auf(x, y, c) { x = Math.round(x); y = Math.round(y); if (basis[y] && basis[y][x]) deko[y][x] = c; },
        istForm(x, y) { return Boolean(basis[y] && basis[y][x]); },
        fertig() {
            const leinwand = document.createElement("canvas");
            leinwand.width = W;
            leinwand.height = H;
            const g = leinwand.getContext("2d");
            const f = (x, y) => (basis[y] && x >= 0 && x < W ? basis[y][x] : null);
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    let c = basis[y][x];
                    if (c) {
                        if (!f(x, y - 1)) c = farbeMischen(c, 0.22);
                        else if (!f(x, y + 1) || !f(x + 1, y)) c = farbeMischen(c, -0.2);
                    } else {
                        // Umriss: dunkle Version der Nachbarfarbe
                        const n = f(x, y + 1) || f(x, y - 1) || f(x - 1, y) || f(x + 1, y);
                        if (n) c = farbeMischen(n, -0.6);
                    }
                    if (deko[y][x]) c = deko[y][x];
                    if (c) {
                        g.fillStyle = c;
                        g.fillRect(x, y, 1, 1);
                    }
                }
            }
            return leinwand.toDataURL();
        }
    };
    return api;
}

// Kleine Helfer fuer wiederkehrende Details
function pixelStern(b, x, y, c) {
    b.p(x, y, c); b.p(x - 1, y, c); b.p(x + 1, y, c); b.p(x, y - 1, c); b.p(x, y + 1, c);
}

function pixelBeere(b, x, y, c, glanz) {
    b.dr(x, y, 2, 2, c);
    b.p(x, y, glanz);
}

// ---------- Die Gebaeude ----------
// Jede Funktion bekommt die Nummer des Animationsbildes und gibt ein fertiges Bild (data-URL) zurueck.

const LADEN_PIXEL = {
    // ===== EPISCH (ruhig, ein Bild) =====
    kisten: { hoehe: 34, bilder: 1, zeichne() {
        const b = neuesPixelBild(34);
        // Tafel auf zwei Beinen
        b.r(9, 16, 2, 10, "#7a5230");
        b.r(21, 16, 2, 10, "#7a5230");
        b.r(6, 5, 20, 12, "#9c6b3c");
        b.dr(8, 7, 16, 8, "#2e4a36");
        b.dr(10, 9, 7, 1, "#e8e8e8");
        b.dr(10, 12, 10, 1, "#dcdcdc");
        b.dr(19, 9, 2, 2, "#f08a24");
        b.p(19, 8, "#6cc24a");
        // untere und obere Kiste
        b.r(1, 25, 30, 9, "#c08448");
        b.r(4, 19, 24, 7, "#b27a40");
        for (let y = 27; y < 34; y += 3) b.dr(2, y, 28, 1, "#8f6139");
        for (let y = 21; y < 26; y += 3) b.dr(5, y, 22, 1, "#8f6139");
        [2, 15, 29].forEach(x => b.dr(x, 26, 1, 7, "#9c6b3c"));
        // Gemuese obendrauf
        b.ell(8, 17, 2, 2, "#f08a24"); b.ell(11, 17, 2, 2, "#f08a24");
        b.p(8, 14, "#6cc24a"); b.p(11, 14, "#6cc24a"); b.p(9, 14, "#3f8a32");
        b.ell(15, 17, 2, 2, "#e8434a"); b.p(14, 16, "#ffb0b0");
        b.ell(20, 16, 3, 3, "#7cbf4d"); b.dr(19, 15, 2, 1, "#a3dc6f");
        b.r(24, 13, 2, 6, "#f5d547"); b.p(26, 14, "#6cc24a"); b.p(23, 15, "#6cc24a");
        // Gemuese vorne an der Kiste
        b.dr(6, 29, 3, 2, "#f08a24"); b.dr(22, 29, 2, 2, "#e8434a");
        return b.fertig();
    } },

    beerenbusch: { hoehe: 34, bilder: 1, zeichne() {
        const b = neuesPixelBild(34);
        b.ell(16, 22, 15, 11, "#4f9a34");
        b.ell(8, 13, 6, 5, "#4f9a34");
        b.ell(17, 10, 7, 6, "#58a53a");
        b.ell(25, 14, 6, 5, "#4f9a34");
        // hellere Blattbueschel
        [[7, 11], [15, 7], [18, 8], [24, 12], [10, 18], [20, 17], [5, 22], [26, 22]].forEach(([x, y]) => {
            b.dr(x, y, 3, 1, "#7cc04f"); b.p(x + 1, y - 1, "#9fd870");
        });
        [[12, 27], [22, 28], [6, 26], [27, 25]].forEach(([x, y]) => b.dr(x, y, 3, 1, "#3a7a28"));
        // Beeren
        [[9, 14], [14, 12], [20, 11], [25, 16], [11, 21], [17, 19], [23, 21], [7, 25], [15, 25], [26, 26], [19, 27]].forEach(([x, y], i) =>
            pixelBeere(b, x, y, i % 3 === 1 ? "#3b5bdb" : "#e8434a", i % 3 === 1 ? "#a8b8ff" : "#ffc0c0"));
        return b.fertig();
    } },

    strandbude: { hoehe: 38, bilder: 1, zeichne() {
        const b = neuesPixelBild(38);
        b.ell(15, 35, 15, 3, "#f3dea0");
        b.r(5, 17, 21, 18, "#f0ffff");
        for (let x = 5; x < 26; x++) for (let y = 17; y < 35; y++) if (Math.floor((x - 5) / 3) % 2 === 0) b.auf(x, y, "#2ab0c0");
        b.dr(8, 21, 15, 6, "#3a2a2a");
        b.dr(8, 21, 15, 1, "#5a4040");
        b.dr(7, 27, 17, 2, "#c9975d");
        b.dr(11, 22, 2, 4, "#ff8fb1");
        b.poly([[1, 18], [30, 18], [26, 9], [5, 9]], "#e8c77a");
        for (let x = 4; x < 28; x += 2) b.dr(x, 12, 1, 5, "#c9a04a");
        b.dr(6, 9, 20, 1, "#f3dea0");
        // Surfbrett
        b.ell(28.5, 25, 2.5, 10, "#ff8fb1");
        b.dr(28, 17, 1, 16, "#ffffff");
        // Seestern
        pixelStern(b, 6, 36, "#ff8a4a");
        return b.fertig();
    } },

    truhe: { hoehe: 32, bilder: 1, zeichne() {
        const b = neuesPixelBild(32);
        // offener Deckel
        b.poly([[4, 16], [28, 16], [26, 6], [6, 6]], "#9a6a2a");
        for (let y = 9; y < 16; y += 3) b.dr(6, y, 20, 1, "#7a4a18");
        b.dr(8, 6, 2, 10, "#e0a800"); b.dr(22, 6, 2, 10, "#e0a800");
        // Muenzberg
        [[8, 16], [12, 15], [16, 14], [20, 15], [24, 16], [10, 17], [15, 17], [21, 17], [18, 16]].forEach(([x, y]) => b.ell(x, y, 2, 1.6, "#f5d547"));
        b.ell(17, 12, 1.5, 1.5, "#e8434a");
        // Truhe
        b.r(3, 18, 26, 13, "#8a5a1a");
        for (let y = 21; y < 31; y += 3) b.dr(4, y, 24, 1, "#6b4210");
        b.dr(6, 18, 2, 13, "#e0a800"); b.dr(24, 18, 2, 13, "#e0a800");
        b.dr(14, 17, 4, 5, "#ffe89a"); b.p(15, 19, "#3b2210"); b.p(16, 19, "#3b2210"); b.p(15, 20, "#3b2210");
        [[4, 19], [27, 19], [4, 29], [27, 29]].forEach(([x, y]) => b.p(x, y, "#fff3b0"));
        pixelStern(b, 26, 11, "#ffffff");
        pixelStern(b, 6, 13, "#fff6a0");
        return b.fertig();
    } },

    kirschbaum: { hoehe: 44, bilder: 1, zeichne() {
        const b = neuesPixelBild(44);
        b.r(14, 26, 4, 17, "#7a5230");
        b.poly([[15, 28], [8, 20], [9, 19], [16, 26]], "#7a5230");
        b.poly([[17, 27], [24, 19], [25, 20], [18, 29]], "#7a5230");
        b.ell(9, 17, 8, 7, "#ffb0cf");
        b.ell(18, 11, 9, 8, "#ffb0cf");
        b.ell(25, 18, 6, 6, "#ffb0cf");
        b.ell(16, 21, 9, 5, "#ffa6c8");
        [[6, 14], [15, 7], [20, 8], [24, 15], [11, 19], [18, 17]].forEach(([x, y]) => { b.dr(x, y, 3, 1, "#ffd6ea"); b.p(x + 1, y - 1, "#fff0f6"); });
        [[9, 21], [20, 22], [26, 21], [13, 14], [22, 12]].forEach(([x, y]) => b.dr(x, y, 2, 1, "#e8789e"));
        [[5, 42], [9, 43], [21, 42], [26, 43], [12, 41]].forEach(([x, y]) => b.p(x, y, "#ffb0cf"));
        b.dr(13, 42, 6, 1, "#5a3a22");
        return b.fertig();
    } },

    bienenkorb: { hoehe: 38, bilder: 1, zeichne() {
        const b = neuesPixelBild(38);
        b.r(5, 33, 22, 4, "#7a5230");
        b.ell(16, 21, 12, 14, "#e0a94a");
        b.loesche(0, 33, 32, 5);
        b.r(5, 33, 22, 4, "#7a5230");
        for (let y = 9; y < 33; y += 3) for (let x = 0; x < 32; x++) b.auf(x, y, "#b8862b");
        b.dell(16, 27, 2.5, 1.5, "#3b2210");
        // Honigtropfen und zwei Bienen
        b.dr(9, 14, 1, 3, "#f5a623"); b.p(9, 17, "#ffcf4a");
        [[24, 9], [5, 18]].forEach(([x, y]) => {
            b.dr(x, y, 3, 2, "#f5d547"); b.p(x + 1, y, "#1c1b24"); b.p(x + 1, y + 1, "#1c1b24");
            b.p(x + 1, y - 1, "#ffffff"); b.p(x + 2, y - 1, "#dff6ff");
        });
        return b.fertig();
    } },

    eiswagen: { hoehe: 38, bilder: 1, zeichne() {
        const b = neuesPixelBild(38);
        // Schirm
        b.ell(16, 10, 15, 7, "#ff8fb1", true);
        for (let x = 1; x < 32; x++) for (let y = 3; y <= 10; y++) if (Math.floor((x - 1) / 4) % 2 === 1) b.auf(x, y, "#fff6f0");
        b.r(15, 11, 2, 9, "#7a3a5a");
        b.ell(16, 2, 1.5, 1.5, "#fff6a0");
        // Wagen
        b.r(3, 19, 26, 12, "#ffc2dc");
        b.dr(3, 27, 26, 2, "#9fe0ff");
        b.dr(6, 21, 20, 5, "#5a3a4a");
        b.dell(10, 23, 1.6, 1.6, "#fff6a0"); b.dell(16, 23, 1.6, 1.6, "#ff8fb1"); b.dell(22, 23, 1.6, 1.6, "#8fe0c0");
        b.dr(9, 25, 2, 1, "#d9a86a"); b.dr(15, 25, 2, 1, "#d9a86a"); b.dr(21, 25, 2, 1, "#d9a86a");
        // Raeder
        b.ell(8, 33, 3, 3, "#3a3a44"); b.ell(24, 33, 3, 3, "#3a3a44");
        b.p(8, 33, "#d8d8e0"); b.p(24, 33, "#d8d8e0");
        return b.fertig();
    } },

    nachtzelt: { hoehe: 40, bilder: 1, zeichne() {
        const b = neuesPixelBild(40);
        b.dach(1, 30, 38, 5, "#3a2a7a");
        for (let y = 5; y <= 38; y++) for (let x = 0; x < 32; x++) if (Math.floor((x - 15.5 + 40) / 4) % 2 === 0) b.auf(x, y, "#2a1d5a");
        b.dach(11, 20, 38, 23, "#ffd98a");
        b.dr(15, 30, 2, 8, "#fff0b8");
        b.r(15, 1, 1, 5, "#7a5230");
        b.poly([[16, 1], [21, 2.5], [16, 4]], "#ff8fb1");
        [[9, 20], [22, 18], [18, 12], [6, 31], [25, 30]].forEach(([x, y]) => b.p(x, y, "#fff6a0"));
        // Lampion-Girlande
        for (let x = 0; x < 32; x++) b.p(x, 14 + Math.round(Math.sin((x / 31) * Math.PI) * 3), "#2a1d3a");
        [4, 11, 20, 27].forEach(x => {
            const y = 15 + Math.round(Math.sin((x / 31) * Math.PI) * 3);
            b.dr(x, y, 2, 3, "#ffcf4a"); b.p(x, y, "#fff3b0");
            b.p(x - 1, y + 1, "rgba(255, 220, 120, 0.5)"); b.p(x + 2, y + 1, "rgba(255, 220, 120, 0.5)");
        });
        return b.fertig();
    } },

    lebkuchenhaus: { hoehe: 40, bilder: 1, zeichne() {
        const b = neuesPixelBild(40);
        b.r(5, 20, 22, 18, "#b8702f");
        b.dach(1, 30, 21, 5, "#7a4418");
        // Zuckerguss am Dachrand
        for (let x = 1; x <= 30; x++) { b.p(x, 21, "#fff6f0"); if (x % 3 === 0) b.p(x, 22, "#fff6f0"); }
        [[10, 14, "#e8434a"], [16, 10, "#6cc24a"], [21, 15, "#ffd93d"], [13, 18, "#ff8fb1"], [19, 19, "#9fe0ff"]].forEach(([x, y, c]) => { b.dr(x, y, 2, 2, c); b.p(x, y, "#ffffff"); });
        [[9, 25], [18, 31], [12, 34], [23, 26]].forEach(([x, y]) => b.p(x, y, "#8a4a1a"));
        b.dr(13, 29, 6, 9, "#6a3a14"); b.dr(14, 28, 4, 1, "#6a3a14");
        for (let y = 28; y < 38; y += 2) { b.p(12, y, "#fff6f0"); b.p(19, y, "#fff6f0"); }
        b.dr(7, 24, 4, 4, "#fff3b0"); b.dr(21, 24, 4, 4, "#fff3b0");
        b.dr(7, 25, 4, 1, "#ffffff"); b.dr(8, 24, 1, 4, "#ffffff"); b.dr(21, 25, 4, 1, "#ffffff"); b.dr(22, 24, 1, 4, "#ffffff");
        // Zuckerstangen
        [0, 29].forEach(x => {
            b.r(x, 24, 2, 14, "#ffffff");
            for (let y = 24; y < 38; y++) if ((y + x) % 4 < 2) b.auf(x, y, "#e8434a"), b.auf(x + 1, y, "#e8434a");
        });
        b.ell(9, 37, 1.5, 1.2, "#8fe0c0"); b.ell(23, 37, 1.5, 1.2, "#ff8fb1");
        return b.fertig();
    } },

    // ===== LEGENDAER (mit Animation) =====
    feuerwerk: { spitze: [17, 3], hoehe: 46, bilder: 4, zeichne(bild) {
        const b = neuesPixelBild(46);
        b.r(2, 40, 28, 5, "#8a9098");
        for (let x = 2; x < 30; x++) b.auf(x, 40, Math.floor(x / 2) % 2 ? "#1d1d24" : "#ffd93d");
        // Stahlturm
        b.r(3, 9, 5, 31, "#c0392b");
        for (let y = 9; y < 40; y++) { b.auf(3 + ((y) % 5), y, "#7a1a14"); b.auf(7 - ((y) % 5), y, "#7a1a14"); }
        b.r(8, 13, 6, 2, "#c0392b");
        b.dr(4, 6, 3, 3, bild % 2 ? "#5a1a14" : "#ff4a3a");
        if (bild % 2 === 0) { b.p(3, 7, "rgba(255, 90, 60, 0.5)"); b.p(7, 7, "rgba(255, 90, 60, 0.5)"); }
        // Rakete
        b.dach(14, 21, 12, 3, "#e8434a");
        b.r(14, 12, 8, 24, "#f4f6fa");
        b.dr(21, 12, 1, 24, "#c8ccd6");
        b.poly([[14, 29], [14, 37], [10, 38]], "#e8434a");
        b.poly([[22, 29], [22, 37], [26, 38]], "#e8434a");
        b.dr(14, 29, 8, 2, "#e8434a");
        b.dell(17.5, 19, 2, 2, "#5aa9e6"); b.p(17, 18, "#ffffff"); b.dr(16, 17, 4, 1, "#c9a04a");
        // Flamme
        const lang = [3, 4, 2, 4][bild];
        for (let i = 0; i < lang; i++) b.dr(16 + (i > 1 ? 1 : 0), 36 + i, 4 - (i > 1 ? 2 : 0), 1, i === 0 ? "#fff6a0" : i === 1 ? "#ffb02a" : "#ff4a1a");
        // Dampf
        const w = bild % 2;
        b.dell(10 - w, 39, 2, 1.2, "rgba(240, 240, 248, 0.85)"); b.dell(26 + w, 39, 2, 1.2, "rgba(240, 240, 248, 0.85)");
        return b.fertig();
    } },

    zirkus: { spitze: [16, 2], hoehe: 46, bilder: 4, zeichne(bild) {
        const b = neuesPixelBild(46);
        b.ell(16, 44, 15, 1.6, "#f3dea0");
        b.r(3, 22, 26, 21, "#e8434a");
        for (let x = 3; x < 29; x++) for (let y = 22; y < 43; y++) if (Math.floor((x - 3) / 3) % 2 === 1) b.auf(x, y, "#fff6e8");
        b.dach(0, 31, 23, 7, "#e8434a");
        for (let y = 7; y <= 23; y++) for (let x = 0; x < 32; x++) if (Math.floor((x - 15.5 + 60) / 3) % 2 === 1) b.auf(x, y, "#fff6e8");
        // Eingang mit Vorhaengen
        b.dach(11, 20, 42, 28, "#3a1a2a");
        b.dr(10, 28, 2, 15, "#c02a32"); b.dr(20, 28, 2, 15, "#c02a32");
        b.p(11, 33, "#ffd93d"); b.p(20, 33, "#ffd93d");
        // Wimpel am Dachrand
        const farben = ["#ffd93d", "#5aa9e6", "#a3dc6f", "#ff8fb1"];
        for (let i = 0; i < 8; i++) b.p(2 + i * 4, 24, farben[i % 4]);
        // Mast und wehende Fahne
        b.r(15, 1, 1, 7, "#7a5230");
        const welle = [0, 1, 0, -1][bild];
        b.poly([[16, 1], [22, 2 + welle], [16, 4]], "#ffd93d");
        b.p(20, 2 + welle, "#e8434a");
        pixelStern(b, 25, 13, bild % 2 ? "#ffffff" : "#fff6a0");
        return b.fertig();
    } },

    sternwarte: { spitze: [16, 11], hoehe: 48, bilder: 4, zeichne(bild) {
        const b = neuesPixelBild(48);
        b.r(2, 43, 28, 4, "#5a6080");
        b.r(7, 22, 18, 21, "#8088ac");
        for (let y = 24; y < 43; y += 3) { b.dr(7, y, 18, 1, "#666e92"); for (let x = 7 + ((y / 3) % 2 ? 2 : 0); x < 25; x += 4) b.p(x, y + 1, "#666e92"); }
        b.dr(13, 35, 6, 8, "#2a2f4a"); b.dr(14, 34, 4, 1, "#2a2f4a");
        b.dr(9, 27, 3, 4, "#ffd66e"); b.dr(20, 27, 3, 4, "#ffd66e");
        // Kuppel
        b.ell(16, 22, 12, 11, "#5a6ad8", true);
        for (let x = 5; x < 28; x += 4) for (let y = 11; y < 22; y++) b.auf(x, y, "#4a58b8");
        b.dr(15, 11, 3, 11, "#141a42");
        b.r(3, 22, 26, 2, "#e0b85a");
        // Teleskop schraeg aus dem Schlitz
        b.poly([[16, 14], [18, 12], [25, 5], [27, 7], [20, 14]], "#d9a82a");
        b.p(26, 5, "#fff6a0");
        // funkelnde Sterne
        const sterne = [[4, 4], [11, 2], [28, 12], [2, 13], [21, 1]];
        sterne.forEach(([x, y], i) => { if ((i + bild) % 3 !== 0) pixelStern(b, x, y, (i + bild) % 2 ? "#fff6a0" : "#ffffff"); });
        return b.fertig();
    } },

    hexe: { spitze: [18, 3], hoehe: 48, bilder: 4, zeichne(bild) {
        const b = neuesPixelBild(48);
        // Huette
        b.r(4, 24, 19, 22, "#5a3a5a");
        for (let x = 6; x < 23; x += 3) b.dr(x, 25, 1, 21, "#432a45");
        b.dr(10, 36, 6, 10, "#1d1024"); b.dr(11, 35, 4, 1, "#1d1024");
        b.dr(11, 37, 4, 2, "rgba(141, 255, 122, 0.55)");
        b.dr(6, 28, 3, 3, "#8dff7a"); b.p(6, 28, "#d8ffb0");
        // Hexenhut als Dach
        b.ell(13, 24, 13, 3, "#3a2250");
        b.poly([[5, 23], [21, 23], [16, 6], [20, 1], [14, 5]], "#4a2c68");
        b.dr(7, 19, 13, 2, "#6fd04a");
        b.dr(12, 19, 3, 2, "#ffd93d");
        // Kessel
        b.ell(27, 42, 5, 4, "#2a2a34");
        b.dell(27, 38.5, 4, 1.2, "#6fd04a"); b.dr(25, 38, 3, 1, "#b8ff90");
        // Feuer
        b.dr(25, 46, 5, 1, bild % 2 ? "#ffb02a" : "#ff5a2a"); b.dr(26, 45, 3, 1, bild % 2 ? "#fff3b0" : "#ffb02a");
        // aufsteigende Blasen
        [[25, 36], [28, 33], [26, 30], [29, 27]].forEach(([x, y], i) => {
            const yy = y - bild;
            if ((i + bild) % 4 !== 3) { b.p(x, yy, "#b8ff90"); b.p(x + 1, yy, "#6fd04a"); }
        });
        return b.fertig();
    } },

    // ===== neue epische Laeden =====
    gemuesewagen: { hoehe: 36, bilder: 1, zeichne() {
        const b = neuesPixelBild(36);
        // Deichsel und Griff
        b.poly([[26, 24], [31, 20], [31, 21], [27, 26]], "#7a5230");
        // Gemuese oben drauf (liegt hinter der Kiste)
        b.ell(9, 16, 4, 3, "#6cc24a");
        b.ell(15, 15, 4, 4, "#e8434a");
        b.ell(21, 16, 4, 3, "#f08a24");
        b.ell(12, 13, 3, 3, "#8fd05c");
        b.ell(19, 12, 2.5, 2.5, "#e8434a");
        // Kiste
        b.r(3, 17, 24, 11, "#b87a3e");
        for (let y = 20; y < 28; y += 3) b.dr(4, y, 22, 1, "#8f6139");
        b.dr(4, 17, 22, 1, "#d8a060");
        // Raeder
        b.ell(9, 30, 4, 4, "#6a4a2a");
        b.ell(22, 30, 4, 4, "#6a4a2a");
        b.dr(8, 29, 3, 3, "#c8a878"); b.dr(21, 29, 3, 3, "#c8a878");
        // Glanz und Blaetter
        b.p(14, 13, "#ffb0a0"); b.p(18, 11, "#ffb0a0");
        b.dr(20, 13, 2, 1, "#4f9a34"); b.dr(8, 14, 2, 1, "#4f9a34");
        b.p(21, 12, "#6cc24a"); b.p(15, 11, "#4f9a34");
        // Preisschild
        b.dr(11, 21, 8, 4, "#fff1d6");
        b.dr(12, 22, 2, 1, "#3a2a1a"); b.dr(15, 22, 3, 1, "#3a2a1a"); b.dr(12, 23, 5, 1, "#8a7a6a");
        return b.fertig();
    } },

    teehaus: { hoehe: 40, bilder: 1, zeichne() {
        const b = neuesPixelBild(40);
        // Sockel und Stufen
        b.r(4, 35, 24, 3, "#8a8e96");
        b.r(12, 33, 8, 2, "#a8aeb6");
        // Haus
        b.r(6, 20, 20, 13, "#e8d8b8");
        for (let x = 6; x < 26; x += 5) b.dr(x, 20, 1, 13, "#8a5a2c");
        // Papiertueren mit Gitter
        b.dr(12, 23, 8, 10, "#fff6e8");
        for (let x = 12; x < 20; x += 3) b.dr(x, 23, 1, 10, "#c8a878");
        for (let y = 23; y < 33; y += 3) b.dr(12, y, 8, 1, "#c8a878");
        // geschwungenes Dach
        b.dach(1, 31, 19, 8, "#3a4a6a");
        b.r(0, 18, 32, 2, "#2a3a5a");
        b.r(0, 17, 2, 1, "#2a3a5a"); b.r(30, 17, 2, 1, "#2a3a5a");
        b.dr(14, 9, 4, 1, "#5a6a8a");
        for (let x = 4; x < 29; x += 3) b.auf(x, 16, "#4a5a7a");
        // rote Laterne
        b.dr(7, 22, 1, 2, "#3a2a1a");
        b.dell(7, 26, 2, 2.5, "#e8434a");
        b.p(7, 25, "#ffb0a0");
        // Kirschblueten-Zweig
        [[24, 23], [26, 22], [25, 25], [27, 24]].forEach(([x, y]) => b.p(x, y, "#ff8fb8"));
        b.p(25, 24, "#ffd6ea");
        return b.fertig();
    } },

    // ===== neue legendaere Laeden (animiert) =====
    riesenrad: { spitze: [16, 18], hoehe: 46, bilder: 8, zeichne(bild) {
        const b = neuesPixelBild(46);
        // Kassenhaeuschen unten
        b.r(9, 37, 14, 8, "#e8434a");
        b.dach(8, 24, 37, 33, "#fff6e8");
        b.dr(12, 39, 8, 3, "#3a2a2a");
        b.dr(13, 40, 6, 1, "#ffd84a");
        for (let x = 9; x < 23; x += 4) b.auf(x, 44, "#c02a32");
        // Stuetzen
        b.poly([[15, 18], [17, 18], [10, 37], [8, 37]], "#6a7078");
        b.poly([[15, 18], [17, 18], [24, 37], [22, 37]], "#6a7078");
        // Rad: Ring und Speichen (dreht sich)
        const cx = 16, cy = 18, r = 13;
        for (let a = 0; a < 72; a++) {
            const w = (a / 72) * Math.PI * 2;
            b.p(cx + Math.cos(w) * r, cy + Math.sin(w) * r, "#d8dce4");
        }
        const dreh = (bild / 8) * (Math.PI / 4);
        for (let i = 0; i < 8; i++) {
            const w = dreh + (i / 8) * Math.PI * 2;
            for (let d = 2; d < r; d++) b.p(cx + Math.cos(w) * d, cy + Math.sin(w) * d, "#a8aeb6");
        }
        b.dell(cx, cy, 1.6, 1.6, "#ffd84a");
        // Gondeln haengen immer nach unten
        const farben = ["#e8434a", "#5aa9e6", "#ffd84a", "#7ed957", "#ff8fb8", "#a877e0", "#f08a24", "#5affc8"];
        for (let i = 0; i < 8; i++) {
            const w = dreh + (i / 8) * Math.PI * 2;
            const gx = Math.round(cx + Math.cos(w) * r), gy = Math.round(cy + Math.sin(w) * r);
            b.dr(gx - 1, gy, 3, 1, "#3a3a44");
            b.dr(gx - 1, gy + 1, 3, 2, farben[i]);
            b.p(gx - 1, gy + 1, "#ffffff");
        }
        // Lichterkette blinkt
        for (let i = 0; i < 12; i++) {
            const w = (i / 12) * Math.PI * 2;
            if ((i + bild) % 3 === 0) b.p(cx + Math.cos(w) * (r + 1), cy + Math.sin(w) * (r + 1), "#fff3b0");
        }
        return b.fertig();
    } },

    ufo: { spitze: [16, 14], hoehe: 44, bilder: 4, zeichne(bild) {
        const b = neuesPixelBild(44);
        const hoch = [0, -1, 0, 1][bild];
        // Wiese unten
        b.r(0, 41, 32, 3, "#5fb03c");
        b.dr(0, 41, 32, 1, "#8fd05c");
        // Lichtstrahl (breiter nach unten), darin schwebt ein kleiner Samen
        for (let y = 20 + hoch; y < 41; y++) {
            const halb = 3 + (y - 20) * 0.35;
            b.dr(16 - halb, y, halb * 2, 1, "rgba(141, 255, 122, 0.28)");
        }
        const sy = 34 - bild * 2;
        b.dr(15, sy, 2, 2, "#ffd84a"); b.p(15, sy, "#fff6c0");
        // Kuppel und Untertasse
        b.ell(16, 12 + hoch, 6, 5, "#9fe0ff", true);
        b.ell(16, 16 + hoch, 15, 4, "#a8aeb6");
        b.dr(3, 17 + hoch, 26, 1, "#6a7078");
        b.p(13, 9 + hoch, "#ffffff"); b.p(14, 8 + hoch, "#ffffff");
        // kleiner Pilot
        b.dell(16, 11 + hoch, 2, 1.8, "#8dff7a");
        b.p(15, 11 + hoch, "#1a1a1a"); b.p(17, 11 + hoch, "#1a1a1a");
        // Lichter am Rand laufen reihum
        const lichter = [5, 9, 13, 19, 23, 27];
        lichter.forEach((x, i) => b.p(x, 16 + hoch, (i + bild) % 3 === 0 ? "#ff5a5a" : (i + bild) % 3 === 1 ? "#ffd84a" : "#5affc8"));
        return b.fertig();
    } },

    leuchtturm: { spitze: [16, 6], hoehe: 50, bilder: 4, zeichne(bild) {
        const b = neuesPixelBild(50);
        // Meer und Felsen
        b.dr(0, 47, 32, 3, "#2f6fb8");
        for (let x = 0; x < 32; x++) if ((x + bild * 2) % 6 < 2) b.p(x, 47, "#dff6ff");
        b.ell(16, 45, 14, 4, "#7a8088");
        b.dr(8, 43, 4, 1, "#a8aeb6"); b.dr(19, 44, 5, 1, "#a8aeb6");
        // Turm
        b.poly([[10, 44], [22, 44], [19.5, 14], [12.5, 14]], "#fff6e8");
        for (let y = 14; y < 44; y++) if (Math.floor((y - 14) / 5) % 2 === 0) for (let x = 0; x < 32; x++) b.auf(x, y, "#e8434a");
        b.dr(14, 37, 4, 7, "#3a2a2a");
        b.dr(15, 24, 2, 3, "#5aa9e6");
        // Galerie, Laterne, Dach
        b.r(10, 12, 12, 2, "#2a2e34");
        b.r(13, 6, 6, 6, "#fff3b0");
        b.dr(15, 6, 2, 6, "#ffffff");
        b.dach(11, 20, 5, 1, "#c02a32");
        // drehender Lichtstrahl
        const licht = "rgba(255, 243, 176, 0.55)";
        if (bild === 0) for (let i = 0; i < 12; i++) b.dr(12 - i, 8 - Math.floor(i / 3), 1, 1 + Math.floor(i / 2), licht);
        if (bild === 2) for (let i = 0; i < 12; i++) b.dr(19 + i, 8 - Math.floor(i / 3), 1, 1 + Math.floor(i / 2), licht);
        // Moewe
        const mx = [4, 7, 10, 7][bild];
        b.p(mx, 20, "#ffffff"); b.p(mx + 1, 19, "#ffffff"); b.p(mx + 2, 20, "#ffffff"); b.p(mx + 3, 19, "#ffffff"); b.p(mx + 4, 20, "#ffffff");
        return b.fertig();
    } },

    mondteich: { spitze: [16, 26], hoehe: 44, bilder: 4, zeichne(bild) {
        const b = neuesPixelBild(44);
        // Mondsichel am Himmel
        for (let y = 1; y <= 9; y++) for (let x = 3; x <= 13; x++) {
            const innen = Math.hypot(x - 8, y - 5) <= 3.4;
            const loch = Math.hypot(x - 9.8, y - 4) <= 3;
            if (innen && !loch) b.p(x, y, "#fff3c0");
        }
        // Rohrkolben links
        [[2, 18], [4, 15], [6, 20]].forEach(([x, y], i) => {
            b.r(x, y + 3, 1, 34 - y, "#4f9a34");
            b.r(x, y, 1, 4, "#7a5230");
            if (i === 1) b.p(x + 1, y + 8, "#6cb448");
        });
        // Steinlaterne rechts mit flackerndem Licht
        b.r(24, 31, 6, 2, "#8a9098");
        b.r(25, 25, 4, 6, "#9aa0a8");
        b.r(23, 21, 8, 4, "#9aa0a8");
        b.dach(22, 32, 20, 16, "#7a8088");
        b.dr(25, 22, 4, 2, bild % 2 ? "#ffd66e" : "#ffe9a0");
        b.p(24, 22, "rgba(255, 220, 120, 0.5)"); b.p(29, 22, "rgba(255, 220, 120, 0.5)");
        // Steinrand
        b.ell(16, 34, 15, 8, "#969ca4");
        for (let a = 0; a < 28; a++) {
            const w = (a / 28) * Math.PI * 2;
            b.auf(16 + Math.cos(w) * 14, 34 + Math.sin(w) * 7.2, a % 2 ? "#b8bec6" : "#7a8088");
        }
        // Wasser
        b.dell(16, 34, 12, 5.5, "#2f5ab0");
        b.dell(16, 33, 9, 3.5, "#4a78d0");
        b.dell(15, 32, 5, 1.8, "#6a98e8");
        // Mondspiegelbild
        b.dell(16, 34, 2.6, 1.3, "#fffbe0");
        b.p(13, 34, "#fff6c0"); b.p(19, 34, "#fff6c0");
        // Seerosen
        b.dell(8, 36, 2.5, 1.5, "#5fa83a"); b.p(9, 36, "#2f5ab0");
        b.p(8, 35, "#ff9ac0"); b.p(7, 35, "#ffd6ea");
        b.dell(24, 32, 2, 1.2, "#6cb448"); b.p(23, 32, "#2f5ab0");
        b.p(24, 31, "#ffffff");
        // Schimmer, der ueber das Wasser wandert
        const sx = [8, 13, 18, 23][bild];
        for (let i = 0; i < 4; i++) b.p(sx + i, 31 + (i % 2), "rgba(255, 255, 255, 0.75)");
        if (bild % 2 === 0) { b.p(20, 37, "#8ab4f0"); b.p(21, 37, "#8ab4f0"); } else { b.p(11, 37, "#8ab4f0"); b.p(12, 37, "#8ab4f0"); }
        // Gluehwuermchen
        [[12, 16], [19, 12], [15, 22]].forEach(([x, y], i) => { if ((i + bild) % 2 === 0) b.p(x, y - (bild % 2), "#fff6a0"); });
        return b.fertig();
    } }
};

const ladenPixelCache = {};

function ladenPixelBild(bauweise, bild = 0) {
    const def = LADEN_PIXEL[bauweise];
    if (!def) return null;
    const schluessel = bauweise + ":" + (bild % def.bilder);
    if (!ladenPixelCache[schluessel]) ladenPixelCache[schluessel] = def.zeichne(bild % def.bilder);
    return ladenPixelCache[schluessel];
}
