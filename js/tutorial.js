"use strict";

// ============================================================
// SPROUTVALE: Tutorial fuer den ersten Run (jederzeit ueberspringbar)
// Eine kleine Sprechblase zeigt Schritt fuer Schritt auf das, was als Naechstes wichtig ist.
// Jeder Schritt geht weiter, sobald man das Gezeigte gemacht hat (Haken aus script.js).
// Stand in meta.tutorial: Nummer des Schritts oder "fertig". Neu starten: Einstellungen > Spielstand.
// In der Sandbox gibt es kein Tutorial.
// ============================================================

const TUTORIAL_SCHRITTE = [
    { text: t("Willkommen in Sproutvale! 🌱 Jeder Tag hat Energie. Ist sie leer, ist Feierabend. Starte deinen ersten Tag!"),
        ziel: () => karteWeiter, wann: () => run.phase === "vorTag", weiterBei: "tagStart" },
    { text: t("Klick schnell auf den Samenladen! Jeder Klick bringt Fortschritt für einen Samen. Schnelle Klicks bauen eine Kombo auf."),
        ziel: () => plantButton, wann: () => run.phase === "tag", weiterBei: "samen" },
    { text: t("Der Samen wächst. Ist die Pflanze fertig, klick auf das Feld, um sie zu ernten."),
        ziel: () => (run.felder.find(f => !f.leer) || run.felder[0]).el.feldDiv, wann: () => run.phase === "tag", weiterBei: "ernte" },
    { text: t("Fahr mit der Maus über die Saat und die Sternensaat, um sie einzusammeln. Was bei Feierabend noch liegt, verfällt!"),
        ziel: () => moneyDisplay, wann: () => run.phase === "tag", weiterBei: "eingesammelt" },
    { text: t("Super! Ernte und sammle weiter, bis Feierabend ist. Je schneller du klickst, desto mehr schaffst du."),
        ziel: () => energieFuellung.parentElement, wann: () => run.phase === "tag", weiterBei: "tagEnde" },
    { text: t("Feierabend! Auf dem Markt kaufst du mit Gold neue Felder und mehr Ertrag für deine Pflanzen."),
        ziel: () => $("shop-button"), wann: () => run.phase === "vorTag", weiterBei: "panelOffen", bedingung: id => id === "shop-panel" },
    { text: t("Im Stellarium gibst du Sternensamen aus: für neue Pflanzen, mehr Gold, Helfer und weitere Markt-Upgrades. ") +
        t("Kaufbare Sterne leuchten."),
        ziel: () => $("skilltree-button"), wann: () => run.phase === "vorTag", weiterBei: "panelOffen", bedingung: id => id === "skilltree" },
    { text: t("Alle 5 Tage kommt eine Rechnung. Kannst du sie nicht bezahlen, endet der Run. Für bezahlte Rechnungen gibt es ") +
        t("Mondblüten für dauerhafte Upgrades im Mondteich. Fahr über die Jahreszeiten-Uhr und den Kalender, um zu sehen, ") +
        t("was gerade wirkt. Viel Spaß!"),
        ziel: () => rechnungDisplay, wann: () => run.phase === "vorTag", knopf: t("Los geht's!") }
];

const tutorialBlase = el("div", "tutorial-blase pergament versteckt");
const tutorialKopf = el("div", "tutorial-kopf");
const tutorialText = el("div", "tutorial-text");
const tutorialKnoepfe = el("div", "tutorial-knoepfe");
tutorialBlase.append(tutorialKopf, tutorialText, tutorialKnoepfe);
document.body.appendChild(tutorialBlase);
let tutorialZiel = null;

// Wer schon gespielt hat, bekommt kein Tutorial mehr
if (meta.tutorial === undefined) meta.tutorial = meta.lebenszeit.tage > 0 ? "fertig" : 0;

function tutorialAktiv() {
    return typeof meta.tutorial === "number" && meta.tutorial < TUTORIAL_SCHRITTE.length;
}

function tutorialWeiter() {
    if (!tutorialAktiv()) return;
    meta.tutorial += 1;
    if (meta.tutorial >= TUTORIAL_SCHRITTE.length) meta.tutorial = "fertig";
    speichereMeta();
    Klang.klick(20);
    zeigeTutorial();
}

function beendeTutorial() {
    meta.tutorial = "fertig";
    speichereMeta();
    Klang.klick(8);
    zeigeTutorial();
}

function starteTutorialNeu() {
    meta.tutorial = 0;
    speichereMeta();
    zeigeTutorial();
}

// Blase anzeigen, verstecken und neben das Ziel setzen
function zeigeTutorial() {
    if (tutorialZiel) tutorialZiel.classList.remove("tutorial-ziel");
    tutorialZiel = null;
    const schritt = tutorialAktiv() ? TUTORIAL_SCHRITTE[meta.tutorial] : null;
    const blockiert = !hauptmenue.classList.contains("versteckt") || !einstellungenFenster.classList.contains("versteckt") ||
        !segenFenster.classList.contains("versteckt") || !prestigeShop.classList.contains("versteckt") ||
        !skilltreeFenster.classList.contains("versteckt") || popupOffen();
    if (!schritt || run.sandbox || blockiert || !schritt.wann()) {
        tutorialBlase.classList.add("versteckt");
        return;
    }
    tutorialKopf.textContent = t("📖 Tipp ") + (meta.tutorial + 1) + " / " + TUTORIAL_SCHRITTE.length;
    tutorialText.textContent = schritt.text;
    tutorialKnoepfe.innerHTML = "";
    if (schritt.knopf) {
        const knopf = el("button", "knopf knopf-gruen", schritt.knopf);
        knopf.addEventListener("click", tutorialWeiter);
        tutorialKnoepfe.appendChild(knopf);
    }
    const ueberspringen = el("button", "knopf tutorial-ueberspringen", t("⏭ Tutorial überspringen"));
    ueberspringen.addEventListener("click", beendeTutorial);
    tutorialKnoepfe.appendChild(ueberspringen);
    tutorialBlase.classList.remove("versteckt");

    tutorialZiel = schritt.ziel();
    if (!tutorialZiel) return;
    tutorialZiel.classList.add("tutorial-ziel");
    const rect = tutorialZiel.getBoundingClientRect();
    const breite = tutorialBlase.offsetWidth;
    const hoehe = tutorialBlase.offsetHeight;
    // Ziele in der Tageskarte: Blase unter die ganze Karte samt Lasche, sonst verdeckt sie die Lasche
    const karte = tutorialZiel.closest("#karten-halter");
    let y = (karte ? karte.getBoundingClientRect().bottom : rect.bottom) + 14;
    let unten = true;
    if (y + hoehe > window.innerHeight - 10) {
        y = rect.top - hoehe - 14;
        unten = false;
    }
    const x = klemme(rect.left + rect.width / 2 - breite / 2, 10, window.innerWidth - breite - 10);
    tutorialBlase.style.left = x + "px";
    tutorialBlase.style.top = y + "px";
    tutorialBlase.classList.toggle("pfeil-oben", unten);
    tutorialBlase.classList.toggle("pfeil-unten", !unten);
    tutorialBlase.style.setProperty("--pfeil-x", klemme(rect.left + rect.width / 2 - x, 20, breite - 20) + "px");
}

// Jeder Schritt wartet auf ein bestimmtes Spielereignis
["tagStart", "samen", "ernte", "eingesammelt", "tagEnde", "panelOffen"].forEach(name => {
    registriereHaken(name, wert => {
        if (!tutorialAktiv() || run.sandbox) return;
        const schritt = TUTORIAL_SCHRITTE[meta.tutorial];
        if (schritt.weiterBei !== name) return;
        if (schritt.bedingung && !schritt.bedingung(wert)) return;
        tutorialWeiter();
    });
});

// Ziele bewegen sich (Felder, Fenster), darum regelmaessig neu ausrichten
setInterval(zeigeTutorial, 300);

$("tutorial-neu").addEventListener("click", () => {
    starteTutorialNeu();
    zeigeToast(t("📖 Das Tutorial startet im normalen Modus beim nächsten passenden Moment neu."));
});
