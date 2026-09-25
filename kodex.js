"use strict";

// ============================================================
// SPROUTVALE: Kodex (Sammelbuch)
// Zeigt alles, was du schon entdeckt hast: Pflanzen, Spezialpflanzen, Wetter, Werkzeuge, Boss-Regeln und Besucher.
// Unentdecktes bleibt ein Schatten mit "???". Die Zaehler stehen in meta.kodex (script.js / ereignisse.js).
// ============================================================

let aktiverKodexReiter = "pflanzen";

function kodexEintraege(reiter) {
    const k = meta.kodex;
    switch (reiter) {
        case "pflanzen":
            return PFLANZEN_VORLAGEN.map(p => {
                const stufe = meisterStufe(p.id);
                const naechste = MEISTER_SCHWELLEN[stufe];
                return {
                    bild: { sprite: p.id }, name: p.name, anzahl: k.pflanzen[p.id] || 0,
                    text: "Grundwert " + zahl(p.verkaufswert) + " Gold, " + sekText(p.sekProStufe * 3) + " bis zur Ernte." +
                        (p.eigenschaftText ? " " + p.eigenschaftText : ""),
                    zaehler: "geerntet",
                    extra: "🏅 Meisterschaft " + stufe + "/" + MEISTER_SCHWELLEN.length +
                        (stufe > 0 ? " (+" + Math.round(MEISTER_BONUS * 100 * stufe) + "% Wert)" : "") +
                        (naechste ? " · nächste bei " + zahl(naechste) : " · Maximum!")
                };
            });
        case "varianten":
            return VARIANTEN.map(v => ({ bild: { emoji: v.badge }, name: v.titel, anzahl: k.varianten[v.id] || 0, text: v.beschreibung, zaehler: "geerntet" }));
        case "wetter":
            return WETTER.map(w => ({ bild: { emoji: w.symbol }, name: w.name, anzahl: k.wetter[w.id] || 0, text: w.text, zaehler: "erlebt" }));
        case "werkzeuge":
            return WERKZEUGE.map(w => ({ bild: { emoji: w.symbol }, name: w.name, anzahl: k.werkzeuge[w.id] || 0,
                text: "Stufe 1: " + w.text(werkzeugWertFuer(w, 1)) + " Stufe 5: " + w.text(werkzeugWertFuer(w, 5)), zaehler: "gekauft" }));
        case "jahreszeiten":
            return JAHRESZEITEN.map(z => ({ bild: { emoji: z.symbol }, name: z.name, anzahl: (k.jahreszeiten || {})[z.id] || 0,
                text: z.text, zaehler: "erlebt" }));
        case "boss":
            return BOSS_REGELN.map(b => ({ bild: { emoji: b.symbol }, name: b.name, anzahl: k.boss[b.id] || 0, text: b.text, zaehler: "besiegt" }));
        default: {
            const l = meta.lebenszeit;
            return [
                { bild: { sprite: "kraehe" }, name: "Krähe", anzahl: l.kraehen, text: "Stiehlt Pflanzen, wenn du sie nicht wegklickst. Die Vogelscheuche hilft.", zaehler: "verscheucht" },
                { bild: { emoji: "🌠" }, name: "Sternschnuppe", anzahl: l.sterne, text: "Fang sie für doppeltes Gold.", zaehler: "gefangen" },
                { bild: { emoji: "🪲" }, name: "Glühwürmchen", anzahl: l.gluehwuermchen, text: "Kommen am Abend und verlängern den Tag.", zaehler: "gefangen" },
                { bild: { emoji: "🌧️" }, name: "Goldregen", anzahl: l.goldregen, text: "Ganz selten regnet es goldene Saat.", zaehler: "erlebt" },
                { bild: { emoji: "🐾" }, name: "Streicheleinheiten", anzahl: l.streicheln, text: "Dein Begleiter freut sich über jede.", zaehler: "gestreichelt" }
            ];
        }
    }
}

const KODEX_REITER = [
    { id: "pflanzen", text: "🌱 Pflanzen" },
    { id: "varianten", text: "✨ Spezialpflanzen" },
    { id: "wetter", text: "🌦️ Wetter" },
    { id: "jahreszeiten", text: "🍂 Jahreszeiten" },
    { id: "werkzeuge", text: "🧰 Werkzeuge" },
    { id: "boss", text: "🏦 Kredit-Auflagen" },
    { id: "besucher", text: "🐦 Besucher" }
];

// Der Kodex steht in den Einstellungen (Reiter "Kodex")
function oeffneKodex() {
    oeffneEinstellungsReiter("kodex");
}

function renderKodex(inhalt) {
    inhalt.innerHTML = "";
    const leiste = el("div", "haus-reiter");
    KODEX_REITER.forEach(r => {
        const eintraege = kodexEintraege(r.id);
        const entdeckt = eintraege.filter(e => e.anzahl > 0).length;
        const knopf = el("button", "knopf reiter-knopf", r.text + " " + entdeckt + "/" + eintraege.length);
        knopf.classList.toggle("aktiv", r.id === aktiverKodexReiter);
        knopf.addEventListener("click", () => {
            aktiverKodexReiter = r.id;
            Klang.klick(8);
            renderKodex(inhalt);
        });
        leiste.appendChild(knopf);
    });
    inhalt.appendChild(leiste);

    const raster = el("div", "kodex-raster");
    kodexEintraege(aktiverKodexReiter).forEach(e => {
        const entdeckt = e.anzahl > 0;
        let bild;
        if (e.bild.sprite) {
            bild = document.createElement("img");
            bild.alt = "";
            setzeSpriteBild(bild, e.bild.sprite, 4);
        } else {
            bild = pixelIcon(e.bild.emoji, 64);
        }
        bild.classList.add("kodex-bild");
        const karte = el("div", "kodex-karte" + (entdeckt ? "" : " unbekannt"), null, [
            el("div", "kodex-bildrahmen", null, [bild]),
            el("div", "kodex-name", entdeckt ? e.name : "???"),
            el("div", "kodex-text", entdeckt ? e.text : "Noch nicht entdeckt."),
            el("div", "kodex-zahl", entdeckt ? zahl(e.anzahl) + "x " + e.zaehler : ""),
            entdeckt && e.extra ? el("div", "kodex-meister", e.extra) : null
        ]);
        raster.appendChild(karte);
    });
    inhalt.appendChild(raster);
}


