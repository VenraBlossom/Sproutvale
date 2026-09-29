"use strict";

// ============================================================
// SPROUTVALE: Helfer als echte Figuren
// Eichhoernchen wuseln um den Samenladen (und huepfen bei jedem Helfer-Klick), Igel laufen zur Saat und sammeln sie ein,
// Bienen fliegen zu dem Feld, das sie wachsen lassen, der Saat-Spatz fliegt vom Himmel zum freien Feld,
// der Erntehase hoppelt zur reifen Pflanze. Die Arbeit passiert erst, wenn die Figur angekommen ist.
// Gehoert zu script.js (Klicks der Eichhoernchen und die Timer stehen dort in aktualisiereHelfer).
// ============================================================

const helferFiguren = [];

// Figur erzeugen: ein Pixel-Symbol auf der Effekt-Ebene
function neueHelferFigur(typ, symbol, groesse, x, y) {
    const bild = pixelIcon(symbol, groesse, "helfer-figur");
    bild.classList.add("helfer-" + typ);
    fxLayer.appendChild(bild);
    const figur = { typ, el: bild, x, y, ziel: null, auftrag: null, wartenMs: 0, richtung: 1 };
    setzeFigur(figur);
    helferFiguren.push(figur);
    return figur;
}

function setzeFigur(figur) {
    figur.el.style.left = figur.x + "px";
    figur.el.style.top = figur.y + "px";
    figur.el.style.scale = figur.richtung < 0 ? "-1 1" : "1 1";
}

function entferneFigur(figur) {
    figur.el.remove();
    const index = helferFiguren.indexOf(figur);
    if (index >= 0) helferFiguren.splice(index, 1);
}

// Einen Schritt Richtung Ziel. Gibt true zurueck, wenn die Figur angekommen ist.
function bewegeFigur(figur, tempo, dtMs) {
    if (!figur.ziel) return true;
    const dx = figur.ziel.x - figur.x;
    const dy = figur.ziel.y - figur.y;
    const abstand = Math.hypot(dx, dy);
    const schritt = tempo * dtMs / 1000;
    figur.el.classList.toggle("laeuft", abstand > 2);
    if (abstand <= schritt) {
        figur.x = figur.ziel.x;
        figur.y = figur.ziel.y;
        setzeFigur(figur);
        return true;
    }
    figur.x += (dx / abstand) * schritt;
    figur.y += (dy / abstand) * schritt;
    // Die Emojis schauen nach links: nach rechts laufend wird gespiegelt
    if (Math.abs(dx) > 1) figur.richtung = dx > 0 ? -1 : 1;
    setzeFigur(figur);
    return false;
}

function figurenVom(typ) {
    return helferFiguren.filter(f => f.typ === typ);
}

// Anzahl Figuren eines Typs an die Stufe anpassen
function passeAnzahlAn(typ, soll, erzeuge) {
    const figuren = figurenVom(typ);
    for (let i = figuren.length; i < soll; i++) erzeuge(i);
    figuren.slice(soll).forEach(f => {
        if (f.auftrag && f.auftrag.feld) f.auftrag.feld.reserviert = false;
        entferneFigur(f);
    });
}

function zufallsPunktIn(rect, rand = 0) {
    return {
        x: rect.left + rand + Math.random() * Math.max(1, rect.width - 2 * rand),
        y: rect.top + rand + Math.random() * Math.max(1, rect.height - 2 * rand)
    };
}

// ---------- EICHHOERNCHEN: wuseln um den Samenladen ----------

function eichhoernchenAnzahl() {
    if (helferKlicksProSek() <= 0) return 0;
    return Math.min(5, 1 + Math.floor((level("eichhoernchen") - 1) / 5) + (level("eichhoernchen2") > 0 ? 1 : 0));
}

// Ziel irgendwo am Rand des Samenladens
function punktAmLaden() {
    const rect = marktstand.getBoundingClientRect();
    const seite = Math.floor(Math.random() * 3);
    if (seite === 0) return { x: rect.left - 14, y: rect.top + Math.random() * rect.height };
    if (seite === 1) return { x: rect.right + 14, y: rect.top + Math.random() * rect.height };
    return { x: rect.left + Math.random() * rect.width, y: rect.bottom + 12 };
}

function aktualisiereEichhoernchen(dtMs) {
    passeAnzahlAn("eichhoernchen", eichhoernchenAnzahl(), () => {
        const start = punktAmLaden();
        neueHelferFigur("eichhoernchen", "🐿️", 40, start.x, start.y);
    });
    figurenVom("eichhoernchen").forEach(f => {
        if (f.wartenMs > 0) {
            f.wartenMs -= dtMs;
            f.el.classList.remove("laeuft");
            return;
        }
        if (!f.ziel) f.ziel = punktAmLaden();
        if (bewegeFigur(f, 170, dtMs)) {
            f.ziel = null;
            f.wartenMs = 200 + Math.random() * 700;
        }
    });
}

// Wird bei jedem Helfer-Klick aufgerufen: ein Eichhoernchen huepft auf den Knopf
function eichhoernchenKlickt() {
    const figuren = figurenVom("eichhoernchen");
    if (figuren.length === 0) return;
    const f = zufall(figuren);
    f.el.classList.remove("huepft");
    void f.el.offsetWidth;
    f.el.classList.add("huepft");
}

// ---------- IGEL: laufen zur gelandeten Saat ----------

function igelAnzahl() {
    return level("igel") > 0 ? Math.min(4, 1 + Math.floor((level("igel") - 1) / 5)) : 0;
}

function igelTempo() {
    return 90 + 14 * level("igel");
}

function aktualisiereIgel(dtMs) {
    passeAnzahlAn("igel", igelAnzahl(), () => {
        const rect = marktstand.getBoundingClientRect();
        neueHelferFigur("igel", "🦔", 40, rect.left + rect.width / 2, rect.bottom + 20);
    });
    figurenVom("igel").forEach(f => {
        // Ziel verschwunden (anders eingesammelt)? Neues suchen
        if (f.auftrag && f.auftrag.loot && f.auftrag.loot.weg) f.auftrag = null;
        if (!f.auftrag) {
            const vergeben = new Set(figurenVom("igel").map(i => i.auftrag && i.auftrag.loot).filter(Boolean));
            const frei = lootKugeln.filter(l => l.gelandet && !l.weg && !vergeben.has(l));
            if (frei.length > 0) {
                const naechste = frei.reduce((beste, l) =>
                    (Math.hypot(l.x - f.x, l.y - f.y) < Math.hypot(beste.x - f.x, beste.y - f.y) ? l : beste), frei[0]);
                f.auftrag = { loot: naechste };
            }
        }
        if (f.auftrag) {
            f.ziel = { x: f.auftrag.loot.x, y: f.auftrag.loot.y };
            if (bewegeFigur(f, igelTempo(), dtMs)) {
                // Angekommen: diese Saat und alles in der Naehe einsammeln
                lootKugeln.filter(l => l.gelandet && !l.weg && Math.hypot(l.x - f.x, l.y - f.y) < 45).forEach(sammleEin);
                f.auftrag = null;
                f.el.classList.remove("huepft");
                void f.el.offsetWidth;
                f.el.classList.add("huepft");
            }
        } else {
            // Nichts zu tun: gemuetlich herumschnueffeln
            if (!f.ziel || f.wartenMs <= 0) {
                f.ziel = zufallsPunktIn(fieldGrid.getBoundingClientRect(), 40);
                f.wartenMs = 2000 + Math.random() * 2000;
            }
            f.wartenMs -= dtMs;
            bewegeFigur(f, 40, dtMs);
        }
    });
}

// ---------- BIENEN: fliegen zum Feld, das sie wachsen lassen ----------

function bienenHeimat() {
    const korb = hofEbene.querySelector(".deko-bienen");
    const rect = (korb || marktstand).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.4 };
}

function aktualisiereBienen(dtMs) {
    passeAnzahlAn("biene", Math.min(3, level("biene")), () => {
        const heim = bienenHeimat();
        neueHelferFigur("biene", "🐝", 32, heim.x, heim.y);
    });
    const bienen = figurenVom("biene");
    if (bienen.length === 0) return;

    // Neuer Auftrag im alten Takt: eine freie Biene fliegt zu einem wachsenden Feld
    run.bienenMs += dtMs;
    if (run.bienenMs >= bienenIntervallSek() * 1000) {
        const frei = bienen.find(b => !b.auftrag);
        const wachsend = run.felder.filter(f => !f.leer && !f.fertig && !f.kraehe);
        if (frei && wachsend.length > 0) {
            run.bienenMs = 0;
            const feld = zufall(wachsend);
            const { x, y } = feldMitte(feld);
            frei.auftrag = { feld, schwebenMs: 700 };
            frei.ziel = { x, y: y - 10 };
        }
    }
    bienen.forEach(b => {
        if (b.auftrag) {
            if (!bewegeFigur(b, 160, dtMs)) return;
            // Kurz ueber der Pflanze summen, dann waechst sie ein Drittel weiter
            b.auftrag.schwebenMs -= dtMs;
            if (b.auftrag.schwebenMs > 0) return;
            const feld = b.auftrag.feld;
            if (!feld.leer && !feld.fertig) {
                wachseEineStufe(feld);
                partikel(b.x, b.y + 10, ["#ffd93d", "#fff6a0", "#a3dc6f"], 8, 35);
            }
            b.auftrag = null;
            b.ziel = null;
            return;
        }
        // Ohne Auftrag: um die Heimat herumsummen
        if (!b.ziel || bewegeFigur(b, 70, dtMs)) {
            const heim = bienenHeimat();
            b.ziel = { x: heim.x + (Math.random() - 0.5) * 70, y: heim.y + (Math.random() - 0.5) * 40 };
        }
    });
}

// ---------- SAAT-SPATZ: fliegt vom Himmel auf ein freies Feld ----------

function aktualisiereSpatzen(dtMs) {
    if (level("saatspatz") > 0) {
        run.spatzMs = (run.spatzMs || 0) + dtMs;
        if (run.spatzMs >= spatzIntervallSek() * 1000) {
            const frei = run.felder.filter(f => f.leer && !f.reserviert);
            if (frei.length > 0) {
                run.spatzMs = 0;
                const feld = zufall(frei);
                feld.reserviert = true;
                const vonLinks = Math.random() < 0.5;
                const spatz = neueHelferFigur("spatz", "🐦", 40, vonLinks ? -40 : window.innerWidth + 40,
                    topBar.getBoundingClientRect().bottom * (0.3 + Math.random() * 0.5));
                const { x, y } = feldMitte(feld);
                spatz.auftrag = { feld };
                spatz.ziel = { x, y: y - 8 };
            }
        }
    }
    figurenVom("spatz").forEach(s => {
        if (!bewegeFigur(s, 380, dtMs)) return;
        if (s.auftrag) {
            const feld = s.auftrag.feld;
            feld.reserviert = false;
            if (feld.leer) {
                pflanzeSamen(feld);
                partikel(s.x, s.y + 12, ["#8f6139", "#5b3a22", "#c89b6a"], 8, 35);
            }
            s.auftrag = null;
            // Wieder davonfliegen
            s.ziel = { x: s.x < window.innerWidth / 2 ? -60 : window.innerWidth + 60, y: -40 };
            return;
        }
        entferneFigur(s);
    });
}

// ---------- ERNTEHASE: hoppelt zur reifen Pflanze ----------

function aktualisiereHasen(dtMs) {
    passeAnzahlAn("hase", level("erntehase") > 0 ? 1 : 0, () => {
        const rect = fieldGrid.getBoundingClientRect();
        neueHelferFigur("hase", "🐇", 48, rect.left + 30, rect.bottom - 30);
    });
    const hase = figurenVom("hase")[0];
    if (!hase) return;
    if (!hase.auftrag) {
        run.haseMs = (run.haseMs || 0) + dtMs;
        if (run.haseMs >= erntehaseSek() * 1000) {
            const fertig = run.felder.filter(f => f.fertig && !f.kraehe && f.ernteKlicksRest <= 1);
            if (fertig.length > 0) {
                run.haseMs = 0;
                const feld = zufall(fertig);
                const { x, y } = feldMitte(feld);
                hase.auftrag = { feld };
                hase.ziel = { x, y: y + 6 };
            }
        }
    }
    if (hase.auftrag) {
        if (!bewegeFigur(hase, 260, dtMs)) return;
        const feld = hase.auftrag.feld;
        if (feld.fertig && !feld.kraehe) ernteFeld(feld, false);
        hase.auftrag = null;
        hase.ziel = null;
        hase.el.classList.remove("huepft");
        void hase.el.offsetWidth;
        hase.el.classList.add("huepft");
    } else {
        hase.el.classList.remove("laeuft");
    }
}

// ---------- SCHILDKROETE: kriecht langsam zur reifen Pflanze ----------

function aktualisiereSchildkroete(dtMs) {
    passeAnzahlAn("kroete", level("schildkroete") > 0 ? 1 : 0, () => {
        const rect = fieldGrid.getBoundingClientRect();
        neueHelferFigur("kroete", "🐢", 44, rect.right - 40, rect.bottom - 30);
    });
    const kroete = figurenVom("kroete")[0];
    if (!kroete) return;
    if (!kroete.auftrag) {
        run.kroeteMs = (run.kroeteMs || 0) + dtMs;
        if (run.kroeteMs >= schildkroeteSek() * 1000) {
            const fertig = run.felder.filter(f => f.fertig && !f.kraehe && f.ernteKlicksRest <= 1);
            if (fertig.length > 0) {
                run.kroeteMs = 0;
                const feld = zufall(fertig);
                const { x, y } = feldMitte(feld);
                kroete.auftrag = { feld };
                kroete.ziel = { x, y: y + 6 };
            }
        }
    }
    if (kroete.auftrag) {
        if (!bewegeFigur(kroete, 70, dtMs)) return;
        const feld = kroete.auftrag.feld;
        if (feld.fertig && !feld.kraehe) ernteFeld(feld, false);
        kroete.auftrag = null;
        kroete.ziel = null;
    } else {
        kroete.el.classList.remove("laeuft");
    }
}

// ---------- IM SPIEL-TAKT ----------

function aktualisiereHelferFiguren(dtMs) {
    aktualisiereEichhoernchen(dtMs);
    aktualisiereIgel(dtMs);
    aktualisiereBienen(dtMs);
    aktualisiereSpatzen(dtMs);
    aktualisiereHasen(dtMs);
    aktualisiereSchildkroete(dtMs);
}

// Feierabend und Run-Ende: alle Helfer gehen nach Hause (reservierte Felder werden wieder frei)
function schickeHelferHeim() {
    [...helferFiguren].forEach(f => {
        if (f.auftrag && f.auftrag.feld) f.auftrag.feld.reserviert = false;
        entferneFigur(f);
    });
}

registriereHaken("tagEnde", schickeHelferHeim);
registriereHaken("runEnde", schickeHelferHeim);
registriereHaken("runStart", schickeHelferHeim);
