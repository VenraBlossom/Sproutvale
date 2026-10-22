"use strict";

// ============================================================
// SPROUTVALE: Wertet ein Log des Balancing-Simulators aus (Test-Werkzeug, wird nicht mitgeliefert)
// Zeigt pro Run: Tage, bezahlte Rechnungen, Spielzeit, und wann (Spielzeit inklusive aller Neustarts)
// zum ersten Mal der Holz-, Gold-, Platin- und Kristallpokal bezahlt wurde.
// Start:  node werkzeuge/sim-auswertung.js _sim-log.txt
// ============================================================

const fs = require("fs");

const datei = process.argv[2] || "_sim-log.txt";
const zeilen = fs.readFileSync(datei, "utf8").split(/\r?\n/);

// Rechnung (1 = erste), mit der ein Pokal kommt. Aus daten.js (TROPHAEEN.nummer + Kredit-Verschiebung)
// Andere Plaetze testen (z.B. mit einem PATCH): POKALE=4,7,10,14 node werkzeuge/sim-auswertung.js _sim-x-log.txt
const PLAETZE = (process.env.POKALE || "5,7,11,14").split(",").map(Number);
const POKALE = [["Holz", PLAETZE[0]], ["Gold", PLAETZE[1]], ["Platin", PLAETZE[2]], ["Kristall", PLAETZE[3]]];
const ZIELE = { Holz: "45-55 Min", Gold: "ca. 2,5 Std", Platin: "ca. 5,5 Std", Kristall: "10-15 Std" };

const runs = [];
let aktuell = null;
zeilen.forEach(zeile => {
    const start = zeile.match(/START (\d+)/);
    if (start) {
        aktuell = { nr: Number(start[1]), tage: [] };
        runs.push(aktuell);
        return;
    }
    const tag = zeile.match(/ TAG (\{.*\})$/);
    if (tag && aktuell) {
        try { aktuell.tage.push(JSON.parse(tag[1])); } catch (fehler) { /* halbe Zeile am Ende */ }
    }
});

const zeit = min => (min >= 60 ? Math.floor(min / 60) + " Std " + String(Math.round(min % 60)).padStart(2, "0") + " Min" : Math.round(min) + " Min");
let vorher = 0; // Spielzeit aller vorigen Runs
const erreicht = {};
console.log("Run | Tage | Rechnungen | Spielzeit Run | gesamt | Goldmulti | Felder | beste Pflanze");
runs.forEach(r => {
    if (!r.tage.length) return;
    const letzter = r.tage[r.tage.length - 1];
    r.tage.forEach(t => {
        POKALE.forEach(([name, nummer]) => {
            if (!erreicht[name] && t.rechnungen >= nummer) erreicht[name] = { min: vorher + t.spielMin, run: r.nr, tag: t.tag };
        });
    });
    console.log([r.nr, letzter.tag, letzter.rechnungen, zeit(letzter.spielMin), zeit(vorher + letzter.spielMin),
        letzter.gm, letzter.felder, letzter.beste].join(" | "));
    vorher += letzter.spielMin;
});
console.log("\nPokale (Spielzeit inklusive Neustarts):");
POKALE.forEach(([name, nummer]) => {
    const e = erreicht[name];
    console.log("  " + name.padEnd(9) + (nummer + ". Rechnung").padEnd(14) + (e ? zeit(e.min) + " (Run " + e.run + ", Tag " + e.tag + ")" : "noch nicht") +
        "   Ziel: " + ZIELE[name]);
});
