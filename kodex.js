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

// ---------- KODEX-BELOHNUNGEN ----------
// Alle 10 Entdeckungen: 1 Kuschel-Gutschein. Ein ganzer Bereich vollstaendig: 2 Gutscheine und fuer immer +3% Gold.
const KODEX_BELOHNUNG = { alleEntdeckungen: 10, gutscheineBereich: 2, goldBereich: 0.03 };

function kodexStand(reiterId) {
    const eintraege = kodexEintraege(reiterId);
    return { entdeckt: eintraege.filter(e => e.anzahl > 0).length, gesamt: eintraege.length };
}

// Wie viele Bereiche fuer immer vollstaendig sind (fuer den Gold-Bonus)
function kodexBereicheFertig() {
    return Object.keys(meta.kodexBelohnt || {}).length;
}

function pruefeKodexBelohnungen() {
    if (!meta || !run) return;
    if (!meta.kodexBelohnt) meta.kodexBelohnt = {};
    let geaendert = false;
    let summe = 0;
    KODEX_REITER.forEach(r => {
        const { entdeckt, gesamt } = kodexStand(r.id);
        summe += entdeckt;
        if (entdeckt >= gesamt && gesamt > 0 && !meta.kodexBelohnt[r.id]) {
            meta.kodexBelohnt[r.id] = true;
            meta.gutscheine += KODEX_BELOHNUNG.gutscheineBereich;
            zeigeBanner("📖", "Kodex vollständig: " + r.text.replace(/^\S+ /, ""),
                "+" + KODEX_BELOHNUNG.gutscheineBereich + " 🎟️ und für immer +3% Gold", "#6b4220", 3600);
            Klang.jackpot();
            geaendert = true;
        }
    });
    // Gutschein alle 10 Entdeckungen (zaehlt ab jetzt, bereits entdecktes zaehlt beim ersten Mal mit)
    const stufe = Math.floor(summe / KODEX_BELOHNUNG.alleEntdeckungen);
    if (meta.kodexStufe === undefined) meta.kodexStufe = 0;
    if (stufe > meta.kodexStufe) {
        const neu = stufe - meta.kodexStufe;
        meta.kodexStufe = stufe;
        meta.gutscheine += neu;
        zeigeToast("📖 Kodex: " + summe + " Entdeckungen! +" + neu + " 🎟️ Kuschel-Gutschein");
        geaendert = true;
    }
    if (geaendert) speichereMeta();
}
setInterval(pruefeKodexBelohnungen, 2500);

function renderKodex(inhalt) {
    inhalt.innerHTML = "";
    // Fortschritt und Belohnungen oben
    const alle = KODEX_REITER.reduce((summe, r) => summe + kodexStand(r.id).entdeckt, 0);
    const naechste = (Math.floor(alle / KODEX_BELOHNUNG.alleEntdeckungen) + 1) * KODEX_BELOHNUNG.alleEntdeckungen;
    const aktuell = kodexStand(aktiverKodexReiter);
    const fertig = meta.kodexBelohnt && meta.kodexBelohnt[aktiverKodexReiter];
    const balken = el("div", "kodex-balken", null, [el("div")]);
    balken.firstChild.style.width = (aktuell.entdeckt / Math.max(1, aktuell.gesamt)) * 100 + "%";
    inhalt.appendChild(el("div", "kodex-belohnung", null, [
        el("div", "kodex-belohnung-zeile", null, [
            el("b", null, "📖 " + alle + " Entdeckungen"),
            el("span", null, "Nächster 🎟️ Gutschein bei " + naechste),
            el("span", null, "Bereiche vollständig: " + kodexBereicheFertig() + " / " + KODEX_REITER.length +
                " (+" + Math.round(kodexBereicheFertig() * KODEX_BELOHNUNG.goldBereich * 100) + "% Gold)")
        ]),
        balken,
        el("div", "kodex-belohnung-text", fertig ? "✔ Dieser Bereich ist vollständig: Belohnung erhalten."
            : "Vervollständige diesen Bereich (" + aktuell.entdeckt + " / " + aktuell.gesamt + ") für +" +
            KODEX_BELOHNUNG.gutscheineBereich + " 🎟️ und für immer +3% Gold.")
    ]));
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


