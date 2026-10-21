"use strict";

// ============================================================
// SPROUTVALE: Neue oder geaenderte Uebersetzungen in alle Sprachdateien eintragen (Test-Werkzeug, wird nicht mitgeliefert)
// Start (im Projektordner):  node werkzeuge/uebersetzung-eintragen.js texte.json
// texte.json sieht so aus (deutscher Text = Schluessel, fehlende Sprachen werden einfach ausgelassen):
//   { "Neuer Text {0}": { "en": "New text {0}", "es": "...", "fr": "...", "it": "...", "pt": "...", "nl": "...",
//                         "pl": "...", "tr": "...", "ru": "...", "uk": "...", "ja": "...", "zh": "...", "ko": "..." } }
// Gibt es den Schluessel schon, wird der Wert ersetzt, sonst kommt er ans Ende der Datei.
// Danach pruefen: node werkzeuge/pruefe-uebersetzung.js
// ============================================================

const fs = require("fs");
const path = require("path");

const JS = path.join(__dirname, "..", "js");
const auftrag = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const sprachen = new Set();
Object.values(auftrag).forEach(werte => Object.keys(werte).forEach(sp => sprachen.add(sp)));

const platzhalter = text => (text.match(/\{\d+\}/g) || []).sort().join(",");

sprachen.forEach(sp => {
    const datei = path.join(JS, "sprache-" + sp + ".js");
    if (!fs.existsSync(datei)) { console.log("Keine Datei fuer " + sp); return; }
    let code = fs.readFileSync(datei, "utf8");
    let neu = 0, ersetzt = 0;
    const anhang = [];
    Object.entries(auftrag).forEach(([schluessel, werte]) => {
        const wert = werte[sp];
        if (wert === undefined) return;
        if (platzhalter(schluessel) !== platzhalter(wert)) console.log("ACHTUNG Platzhalter " + sp + ": " + wert);
        const zeile = "    " + JSON.stringify(schluessel) + ": " + JSON.stringify(wert);
        const start = code.indexOf("\n    " + JSON.stringify(schluessel) + ": ");
        if (start >= 0) {
            const ende = code.indexOf("\n", start + 1);
            const komma = code.slice(start, ende).trimEnd().endsWith(",") ? "," : "";
            code = code.slice(0, start + 1) + zeile + komma + code.slice(ende);
            ersetzt++;
        } else {
            anhang.push(zeile);
            neu++;
        }
    });
    if (anhang.length) {
        const schluss = code.lastIndexOf("\n});");
        const vorher = code.slice(0, schluss).trimEnd();
        code = vorher + (vorher.endsWith(",") || vorher.endsWith("{") ? "" : ",") + "\n" + anhang.join(",\n") + code.slice(schluss);
    }
    fs.writeFileSync(datei, code);
    console.log(sp + ": " + neu + " neu, " + ersetzt + " ersetzt");
});
