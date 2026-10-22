"use strict";

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
                    text: tf("Grundwert {0} Gold, {1} bis zur Ernte.{2}", zahl(p.verkaufswert), sekText(p.sekProStufe * 3), (p.eigenschaftText ? " " + p.eigenschaftText : "")),
                    zaehler: t("geerntet"),
                    extra: tf("🏅 Meisterschaft {0}/{1}{2}{3}", stufe, MEISTER_SCHWELLEN.length, (stufe > 0 ? tf(" (+{0}% Wert)", Math.round(meisterBonus() * 100 * stufe)) : ""), (naechste ? tf(" · nächste bei {0}", zahl(naechste)) : t(" · Maximum!")))
                };
            });
        case "varianten":
            return VARIANTEN.map(v => ({ bild: { emoji: v.badge }, name: v.titel, anzahl: k.varianten[v.id] || 0, text: v.beschreibung, zaehler: t("geerntet") }));
        case "wetter":
            return WETTER.map(w => ({ bild: { emoji: w.symbol }, name: w.name, anzahl: k.wetter[w.id] || 0, text: w.text, zaehler: t("erlebt") }));
        case "werkzeuge":
            return WERKZEUGE.map(w => ({ bild: { emoji: w.symbol }, name: w.name, anzahl: k.werkzeuge[w.id] || 0,
                text: w.text(w.wert), zaehler: t("gekauft"),
                detail: tf("Stufe 1: {0} · {1}{2} pro weitere Stufe", w.kurz(w.wert), (w.kurz(1).trim().startsWith("-") ? "-" : "+"), prozentText(w.wert * WERKZEUG_STUFEN_BONUS)) }));
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

function oeffneKodex() {
    oeffneEinstellungsReiter("kodex");
}

const KODEX_BELOHNUNG = { alleEntdeckungen: 10, gutscheineBereich: 2, goldBereich: 0.03 };

function kodexStand(reiterId) {
    const eintraege = kodexEintraege(reiterId);
    return { entdeckt: eintraege.filter(e => e.anzahl > 0).length, gesamt: eintraege.length };
}

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
            zeigeBanner("📖", tf("Kodex vollständig: {0}", r.text.replace(/^\S+ /, "")),
                tf("+{0} 🎟️ und für immer +3% Gold", KODEX_BELOHNUNG.gutscheineBereich), "#6b4220", 3600);
            Klang.jackpot();
            geaendert = true;
        }
    });
    meta.kodexEntdecktZahl = summe;
    const stufe = Math.floor(summe / KODEX_BELOHNUNG.alleEntdeckungen);
    if (meta.kodexStufe === undefined) meta.kodexStufe = 0;
    if (stufe > meta.kodexStufe) {
        const neu = stufe - meta.kodexStufe;
        meta.kodexStufe = stufe;
        meta.gutscheine += neu;
        zeigeToast(tf("📖 Kodex: {0} Entdeckungen! +{1} 🎟️ Kuschel-Gutschein", summe, neu));
        geaendert = true;
    }
    if (geaendert) speichereMeta();
}
setInterval(pruefeKodexBelohnungen, 2500);

function renderKodex(inhalt) {
    inhalt.innerHTML = "";
    const alle = KODEX_REITER.reduce((summe, r) => summe + kodexStand(r.id).entdeckt, 0);
    const naechste = (Math.floor(alle / KODEX_BELOHNUNG.alleEntdeckungen) + 1) * KODEX_BELOHNUNG.alleEntdeckungen;
    const aktuell = kodexStand(aktiverKodexReiter);
    const fertig = meta.kodexBelohnt && meta.kodexBelohnt[aktiverKodexReiter];
    const balken = el("div", "kodex-balken", null, [el("div")]);
    balken.firstChild.style.width = (aktuell.entdeckt / Math.max(1, aktuell.gesamt)) * 100 + "%";
    inhalt.appendChild(el("div", "kodex-belohnung", null, [
        el("div", "kodex-belohnung-zeile", null, [
            el("b", null, tf("📖 {0} Entdeckungen", alle)),
            el("span", null, tf("Nächster 🎟️ Gutschein bei {0}", naechste)),
            el("span", null, tf("Bereiche vollständig: {0} / {1} (+{2}% Gold)", kodexBereicheFertig(), KODEX_REITER.length, Math.round(kodexBereicheFertig() * KODEX_BELOHNUNG.goldBereich * 100)))
        ]),
        balken,
        el("div", "kodex-belohnung-text", fertig ? t("✔ Dieser Bereich ist vollständig: Belohnung erhalten.")
            : tf("Vervollständige diesen Bereich ({0} / {1}) für +{2} 🎟️ und für immer +3% Gold.", aktuell.entdeckt, aktuell.gesamt, KODEX_BELOHNUNG.gutscheineBereich))
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
            el("div", "kodex-zahl", entdeckt && !e.ohneZaehler ? tf("{0}x {1}", zahl(e.anzahl), e.zaehler) : ""),
            entdeckt && e.extra ? el("div", "kodex-meister", e.extra) : null,
            entdeckt && e.detail ? el("div", "kodex-detail versteckt", e.detail) : null
        ]);
        if (entdeckt && e.detail) {
            karte.classList.add("klickbar");
            karte.addEventListener("click", () => {
                karte.querySelector(".kodex-detail").classList.toggle("versteckt");
                Klang.klick(10);
            });
        }
        raster.appendChild(karte);
    });
    inhalt.appendChild(raster);
}

