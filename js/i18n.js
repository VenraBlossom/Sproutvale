"use strict";

// ============================================================
// SPROUTVALE: Sprachen (Deutsch / Englisch / Spanisch / Franzoesisch)
// Wird direkt nach speicher.js geladen, noch vor allen Spieldaten.
// Jeder Text im Spiel laeuft durch t("deutscher Text"). Die Uebersetzungen stehen in sprache-en.js, sprache-es.js, sprache-fr.js.
// Fehlt eine spanische oder franzoesische Uebersetzung, kommt der englische Text, sonst bleibt der deutsche stehen.
// Beim allerersten Start ist Englisch eingestellt, bestehende Spieler behalten Deutsch.
// Umschalten in den Einstellungen (Reiter "Anzeige"), danach laedt das Spiel neu.
// ============================================================

const SPRACHEN = [
    { id: "en", name: "English" },
    { id: "de", name: "Deutsch" },
    { id: "es", name: "Español" },
    { id: "fr", name: "Français" }
];
// Kommen spaeter: nur als Karte sichtbar, noch nicht waehlbar und noch ohne Uebersetzung
const SPRACHEN_BALD = [
    { id: "it", name: "Italiano" },
    { id: "pt", name: "Português" }, { id: "nl", name: "Nederlands" }, { id: "pl", name: "Polski" },
    { id: "tr", name: "Türkçe" }, { id: "ru", name: "Русский" }, { id: "uk", name: "Українська" },
    { id: "ja", name: "日本語" }, { id: "zh", name: "中文" }, { id: "ko", name: "한국어" }
];

const SPRACHE = (() => {
    try {
        const gespeichert = JSON.parse(localStorage.getItem("sproutvale_einstellungen"));
        if (gespeichert && SPRACHEN.some(s => s.id === gespeichert.sprache)) return gespeichert.sprache;
        if (gespeichert) return "de"; // Spielstand von vor den Sprachen: bleibt Deutsch
    } catch (fehler) {
        console.warn("Sprache nicht lesbar", fehler);
    }
    return "en";
})();

const SPRACH_LOCALE = { en: "en-US", de: "de-DE", es: "es-ES", fr: "fr-FR" }[SPRACHE] || "en-US";
document.documentElement.lang = SPRACHE;

// wird von sprache-en.js gefuellt (bei Spanisch und Franzoesisch danach von sprache-es.js / sprache-fr.js ueberschrieben)
const UEBERSETZUNG = {};

// Handy und Tablet (Finger statt Maus): Texte sagen "lange tippen" statt "Rechtsklick"
const TOUCH_GERAET = Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
document.documentElement.classList.toggle("touch", TOUCH_GERAET);
const TOUCH_WOERTER = {
    de: [[/Fahr über die Jahreszeiten-Uhr/g, "Tippe auf die Jahreszeiten-Uhr"], [/Fahr mit der Maus über/g, "Wisch mit dem Finger über"], [/Halte die Maus auf dem Samenladen gedrückt/g, "Halte den Finger auf dem Samenladen"],
        [/Maus auf dem Samenladen gedrückt halten/g, "Finger auf dem Samenladen halten"],
        [/Rechtsklick/g, "Lange tippen"], [/Linksklick/g, "Tippen"], [/Mausrad/g, "zwei Finger"]],
    en: [[/Hover over the season clock/g, "Tap the season clock"], [/Move the mouse over/g, "Swipe your finger over"], [/Hold the mouse button on the seed stall/g, "Hold your finger on the seed stall"],
        [/hold the mouse on the seed stall/g, "hold your finger on the seed stall"], [/Right-click/g, "Long-press"], [/right-click/g, "long-press"], [/right click/g, "long press"], [/Left-click/g, "Tap"],
        [/left-click/g, "tap"], [/left click/g, "tap"], [/mouse wheel/g, "two fingers"]],
    es: [[/Pasa el ratón sobre el reloj de estaciones/g, "Toca el reloj de estaciones"], [/Pasa el ratón sobre/g, "Desliza el dedo sobre"], [/Mantén pulsado el botón del ratón sobre/g, "Mantén el dedo sobre"],
        [/mantén el ratón sobre/g, "mantén el dedo sobre"], [/Clic derecho/g, "Pulsación larga"], [/clic derecho/g, "pulsación larga"], [/Clic izquierdo/g, "Toque"], [/clic izquierdo/g, "toque"],
        [/rueda del ratón/g, "dos dedos"]],
    fr: [[/Survole l'horloge des saisons/g, "Touche l'horloge des saisons"], [/Passe la souris sur/g, "Glisse le doigt sur"], [/Maintiens le bouton de la souris sur/g, "Garde le doigt sur"],
        [/maintiens la souris sur/g, "garde le doigt sur"], [/Clic droit/g, "Appui long"], [/clic droit/g, "appui long"], [/Clic gauche/g, "Toucher"], [/clic gauche/g, "toucher"], [/molette/g, "deux doigts"]]
};
function touchText(text) {
    if (!TOUCH_GERAET || typeof text !== "string") return text;
    return (TOUCH_WOERTER[SPRACHE] || []).reduce((s, [muster, ersatz]) => s.replace(muster, ersatz), text);
}

function t(text) {
    if (SPRACHE === "de") return touchText(text);
    const uebersetzt = UEBERSETZUNG[text];
    return touchText(uebersetzt !== undefined ? uebersetzt : text);
}

// Text mit Platzhaltern: tf("Tag {0} starten", 5) -> "Start day 5" (die Wortstellung darf sich je Sprache unterscheiden)
function tf(text, ...werte) {
    return t(text).replace(/\{(\d+)\}/g, (_, i) => werte[Number(i)]);
}

// Feste Texte in index.html (Knoepfe, Ueberschriften, Tooltips, Platzhalter) einmal beim Start uebersetzen
function uebersetzeDokument(wurzel) {
    if (SPRACHE === "de" && !TOUCH_GERAET) return;
    const laeufer = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
    const knoten = [];
    while (laeufer.nextNode()) knoten.push(laeufer.currentNode);
    knoten.forEach(k => {
        const roh = k.nodeValue;
        const text = roh.split(/\s+/).join(" ").trim();
        if (!text) return;
        const neu = t(text);
        if (neu === text) return;
        const vorne = roh.match(/^\s*/)[0].length ? " " : "";
        const hinten = roh.match(/\s*$/)[0].length ? " " : "";
        k.nodeValue = vorne + neu + hinten;
    });
    ["data-tipp", "placeholder", "title", "alt"].forEach(attribut => {
        wurzel.querySelectorAll("[" + attribut + "]").forEach(el => {
            const wert = el.getAttribute(attribut);
            const neu = t(wert);
            if (neu !== wert) el.setAttribute(attribut, neu);
        });
    });
}
