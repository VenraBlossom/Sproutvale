"use strict";

// ============================================================
// SPROUTVALE: Prueft die Uebersetzungen (Test-Werkzeug, wird nicht mitgeliefert)
// Sucht alle Texte im Code (t("...") und tf("...")) und in index.html und meldet,
// welche in sprache-en.js, sprache-es.js oder sprache-fr.js fehlen.
// Ausserdem: Eintraege, die im Code gar nicht mehr vorkommen (veraltet), und Platzhalter {0}, die nicht passen.
// Start (im Projektordner):  node werkzeuge/pruefe-uebersetzung.js
// Mit "--alle" werden auch alle veralteten Eintraege einzeln aufgelistet.
// ============================================================

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ORDNER = path.join(__dirname, "..");
const JS = path.join(ORDNER, "js");
const ALLE = process.argv.includes("--alle");

// Uebersetzungen einer Sprache laden (die Dateien fuellen UEBERSETZUNG, Spanisch und Franzoesisch nur bei passender SPRACHE)
function ladeSprache(sprache) {
    const kontext = { SPRACHE: sprache, UEBERSETZUNG: {} };
    vm.createContext(kontext);
    const datei = { en: "sprache-en.js", es: "sprache-es.js", fr: "sprache-fr.js" }[sprache];
    const code = fs.readFileSync(path.join(JS, datei), "utf8").replace(/^"use strict";/, "");
    vm.runInContext(code.replace(/\bconst UEBERSETZUNG\b/, "var _x"), kontext);
    return kontext.UEBERSETZUNG;
}

// Alle Text-Schluessel aus dem Code
function sammleCodeTexte() {
    const texte = new Map();
    const dateien = fs.readdirSync(JS).filter(n => n.endsWith(".js") && !n.startsWith("sprache-") && n !== "i18n.js");
    const muster = /\bt[f]?\(\s*("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')\s*[,)]/g;
    dateien.forEach(name => {
        const code = fs.readFileSync(path.join(JS, name), "utf8");
        let treffer;
        while ((treffer = muster.exec(code))) {
            let roh = treffer[1];
            if (roh.startsWith("'")) roh = '"' + roh.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"';
            let text;
            try { text = JSON.parse(roh); } catch (fehler) { continue; }
            if (!text.trim()) continue;
            const zeile = code.slice(0, treffer.index).split("\n").length;
            if (!texte.has(text)) texte.set(text, name + ":" + zeile);
        }
    });
    return texte;
}

// Feste Texte aus index.html (so wie uebersetzeDokument sie sieht: Leerraum zusammengefasst)
function sammleHtmlTexte() {
    const texte = new Map();
    let html = fs.readFileSync(path.join(ORDNER, "index.html"), "utf8");
    html = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
    // Bereiche mit data-kein-i18n auslassen
    html = html.replace(/<(\w+)[^>]*data-kein-i18n[^>]*>[\s\S]*?<\/\1>/g, "");
    const ent = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
    const body = html.slice(html.indexOf("<body"));
    const textMuster = />([^<>]+)</g;
    let treffer;
    while ((treffer = textMuster.exec(body))) {
        const text = ent(treffer[1].split(/\s+/).join(" ").trim());
        if (text && /[A-Za-zÄÖÜäöüß]/.test(text) && !texte.has(text)) texte.set(text, "index.html");
    }
    const attrMuster = /\b(data-tipp|placeholder|title|alt)="([^"]*)"/g;
    while ((treffer = attrMuster.exec(body))) {
        const text = ent(treffer[2]);
        if (text && /[A-Za-zÄÖÜäöüß]/.test(text) && !texte.has(text)) texte.set(text, "index.html (" + treffer[1] + ")");
    }
    return texte;
}

const platzhalter = text => (text.match(/\{\d+\}/g) || []).sort().join(",");

const code = sammleCodeTexte();
const html = sammleHtmlTexte();
const alle = new Map([...html, ...code]);
// Texte, die gleich bleiben duerfen (Namen, Zahlen, Symbole)
const GLEICH_OK = /^[\s\d.,:;!?+\-x×%/()·…|#=<>*★☆✔✕✓❓🔒]*$|^Sproutvale$|^VenraBlossom$|^BETA$/u;

let fehler = 0;
["en", "es", "fr"].forEach(sprache => {
    const tabelle = ladeSprache(sprache);
    const fehlt = [];
    const englisch = [];
    const falscheZeichen = [];
    const enTabelle = sprache === "en" ? null : ladeSprache("en");
    alle.forEach((ort, text) => {
        if (GLEICH_OK.test(text)) return;
        if (!(text in tabelle)) { fehlt.push([text, ort]); return; }
        if (platzhalter(text) !== platzhalter(tabelle[text])) falscheZeichen.push([text, tabelle[text]]);
        // Spanisch/Franzoesisch: Wert ist wortgleich mit Englisch (vermutlich vergessen), nur bei laengeren Texten
        if (enTabelle && tabelle[text] === enTabelle[text] && text.length > 12 && /[a-z]{4}/.test(tabelle[text])) englisch.push([text, ort]);
    });
    const veraltet = Object.keys(tabelle).filter(k => !alle.has(k));
    console.log("\n===== " + sprache.toUpperCase() + ": " + fehlt.length + " fehlen, " + falscheZeichen.length + " mit falschen Platzhaltern" +
        (enTabelle ? ", " + englisch.length + " noch auf Englisch" : "") + ", " + veraltet.length + " veraltet (nicht im Code gefunden)");
    fehlt.forEach(([text, ort]) => console.log("  FEHLT  " + ort + "  " + JSON.stringify(text)));
    falscheZeichen.forEach(([text, wert]) => console.log("  PLATZHALTER  " + JSON.stringify(text) + " -> " + JSON.stringify(wert)));
    englisch.forEach(([text, ort]) => console.log("  ENGLISCH  " + ort + "  " + JSON.stringify(text)));
    if (ALLE) veraltet.forEach(text => console.log("  VERALTET  " + JSON.stringify(text)));
    fehler += fehlt.length + falscheZeichen.length;
});
console.log("\n" + alle.size + " Texte im Code und in index.html geprueft.");
process.exitCode = fehler > 0 ? 1 : 0;
