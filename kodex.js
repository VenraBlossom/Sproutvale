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
                    text: t("Grundwert ") + zahl(p.verkaufswert) + t(" Gold, ") + sekText(p.sekProStufe * 3) + t(" bis zur Ernte.") +
                        (p.eigenschaftText ? " " + p.eigenschaftText : ""),
                    zaehler: t("geerntet"),
                    extra: t("🏅 Meisterschaft ") + stufe + "/" + MEISTER_SCHWELLEN.length +
                        (stufe > 0 ? " (+" + Math.round(MEISTER_BONUS * 100 * stufe) + t("% Wert)") : "") +
                        (naechste ? t(" · nächste bei ") + zahl(naechste) : t(" · Maximum!"))
                };
            });
        case "varianten":
            return VARIANTEN.map(v => ({ bild: { emoji: v.badge }, name: v.titel, anzahl: k.varianten[v.id] || 0, text: v.beschreibung, zaehler: t("geerntet") }));
        case "wetter":
            return WETTER.map(w => ({ bild: { emoji: w.symbol }, name: w.name, anzahl: k.wetter[w.id] || 0, text: w.text, zaehler: t("erlebt") }));
        case "werkzeuge":
            return WERKZEUGE.map(w => ({ bild: { emoji: w.symbol }, name: w.name, anzahl: k.werkzeuge[w.id] || 0,
                text: t("Stufe 1: ") + w.text(werkzeugWertFuer(w, 1)) + t(" Stufe 5: ") + w.text(werkzeugWertFuer(w, 5)), zaehler: t("gekauft") }));
        case "jahreszeiten":
            return JAHRESZEITEN.map(z => ({ bild: { emoji: z.symbol }, name: z.name, anzahl: (k.jahreszeiten || {})[z.id] || 0,
                text: z.text, ohneZaehler: true }));
        case "segen":
            return SEGEN.map(s => ({ bild: { emoji: s.badge }, name: s.name, anzahl: (k.segen || {})[s.id] || 0, text: s.text, zaehler: t("gewählt") }));
        case "boss":
            return BOSS_REGELN.map(b => ({ bild: { emoji: b.symbol }, name: b.name, anzahl: k.boss[b.id] || 0, text: b.text, zaehler: t("besiegt") }));
        default: {
            const l = meta.lebenszeit;
            return [
                { bild: { sprite: "kraehe" }, name: t("Krähe"), anzahl: l.kraehen, text: t("Stiehlt Pflanzen, wenn du sie nicht wegklickst. Die Vogelscheuche hilft."), zaehler: t("verscheucht") },
                { bild: { emoji: "🌠" }, name: t("Sternschnuppe"), anzahl: l.sterne, text: t("Fang sie für doppeltes Gold."), zaehler: t("gefangen") },
                { bild: { emoji: "🪲" }, name: t("Glühwürmchen"), anzahl: l.gluehwuermchen, text: t("Kommen am Abend und verlängern den Tag."), zaehler: t("gefangen") },
                { bild: { emoji: "🌧️" }, name: t("Goldregen"), anzahl: l.goldregen, text: t("Ganz selten regnet es goldene Saat."), zaehler: t("erlebt") },
                { bild: { emoji: "🐾" }, name: t("Streicheleinheiten"), anzahl: l.streicheln, text: t("Dein Begleiter freut sich über jede."), zaehler: t("gestreichelt") }
            ];
        }
    }
}

const KODEX_REITER = [
    { id: "pflanzen", text: t("🌱 Pflanzen") },
    { id: "varianten", text: t("✨ Spezialpflanzen") },
    { id: "wetter", text: t("🌦️ Wetter") },
    { id: "jahreszeiten", text: t("🍂 Jahreszeiten") },
    { id: "werkzeuge", text: t("🧰 Werkzeuge") },
    { id: "segen", text: t("🙏 Segen") },
    { id: "boss", text: t("🏦 Kredit-Auflagen") },
    { id: "besucher", text: t("🐦 Besucher") }
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
            zeigeBanner("📖", t("Kodex vollständig: ") + r.text.replace(/^\S+ /, ""),
                "+" + KODEX_BELOHNUNG.gutscheineBereich + t(" 🎟️ und für immer +3% Gold"), "#6b4220", 3600);
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
        zeigeToast("📖 Kodex: " + summe + t(" Entdeckungen! +") + neu + t(" 🎟️ Kuschel-Gutschein"));
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
            el("b", null, "📖 " + alle + t(" Entdeckungen")),
            el("span", null, t("Nächster 🎟️ Gutschein bei ") + naechste),
            el("span", null, t("Bereiche vollständig: ") + kodexBereicheFertig() + " / " + KODEX_REITER.length +
                " (+" + Math.round(kodexBereicheFertig() * KODEX_BELOHNUNG.goldBereich * 100) + t("% Gold)"))
        ]),
        balken,
        el("div", "kodex-belohnung-text", fertig ? t("✔ Dieser Bereich ist vollständig: Belohnung erhalten.")
            : t("Vervollständige diesen Bereich (") + aktuell.entdeckt + " / " + aktuell.gesamt + t(") für +") +
            KODEX_BELOHNUNG.gutscheineBereich + t(" 🎟️ und für immer +3% Gold."))
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
            el("div", "kodex-text", entdeckt ? e.text : t("Noch nicht entdeckt.")),
            el("div", "kodex-zahl", entdeckt && !e.ohneZaehler ? zahl(e.anzahl) + t("x ") + e.zaehler : ""),
            entdeckt && e.extra ? el("div", "kodex-meister", e.extra) : null
        ]);
        raster.appendChild(karte);
    });
    inhalt.appendChild(raster);
}


