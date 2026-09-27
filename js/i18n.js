"use strict";

// ============================================================
// SPROUTVALE: Sprachen (Deutsch / Englisch)
// Wird direkt nach speicher.js geladen, noch vor allen Spieldaten.
// Jeder Text im Spiel laeuft durch t("deutscher Text"). Auf Englisch steht die Uebersetzung in sprache-en.js.
// Fehlt eine Uebersetzung, bleibt der deutsche Text stehen (nichts geht kaputt).
// Beim allerersten Start ist Englisch eingestellt, bestehende Spieler behalten Deutsch.
// Umschalten in den Einstellungen (Reiter "Anzeige"), danach laedt das Spiel neu.
// ============================================================

const SPRACHEN = [
    { id: "en", name: "English" },
    { id: "de", name: "Deutsch" }
];

const SPRACHE = (() => {
    try {
        const gespeichert = JSON.parse(localStorage.getItem("sproutvale_einstellungen"));
        if (gespeichert && gespeichert.sprache) return gespeichert.sprache;
        if (gespeichert) return "de"; // Spielstand von vor den Sprachen: bleibt Deutsch
    } catch (fehler) {
        console.warn("Sprache nicht lesbar", fehler);
    }
    return "en";
})();

const SPRACH_LOCALE = SPRACHE === "en" ? "en-US" : "de-DE";
document.documentElement.lang = SPRACHE;

// wird von sprache-en.js gefuellt
const UEBERSETZUNG = {};

function t(text) {
    if (SPRACHE === "de") return text;
    const uebersetzt = UEBERSETZUNG[text];
    return uebersetzt !== undefined ? uebersetzt : text;
}

// Text mit Platzhaltern: tf("Tag {0} starten", 5) -> "Start day 5" (die Wortstellung darf sich je Sprache unterscheiden)
function tf(text, ...werte) {
    return t(text).replace(/\{(\d+)\}/g, (_, i) => werte[Number(i)]);
}

// Feste Texte in index.html (Knoepfe, Ueberschriften, Tooltips, Platzhalter) einmal beim Start uebersetzen
function uebersetzeDokument(wurzel) {
    if (SPRACHE === "de") return;
    const laeufer = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
    const knoten = [];
    while (laeufer.nextNode()) knoten.push(laeufer.currentNode);
    knoten.forEach(k => {
        const roh = k.nodeValue;
        const text = roh.split(/\s+/).join(" ").trim();
        if (!text || UEBERSETZUNG[text] === undefined) return;
        const vorne = roh.match(/^\s*/)[0].length ? " " : "";
        const hinten = roh.match(/\s*$/)[0].length ? " " : "";
        k.nodeValue = vorne + UEBERSETZUNG[text] + hinten;
    });
    ["data-tipp", "placeholder", "title", "alt"].forEach(attribut => {
        wurzel.querySelectorAll("[" + attribut + "]").forEach(el => {
            const wert = el.getAttribute(attribut);
            if (UEBERSETZUNG[wert] !== undefined) el.setAttribute(attribut, UEBERSETZUNG[wert]);
        });
    });
}
