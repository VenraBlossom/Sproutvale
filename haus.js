"use strict";

// ============================================================
// SPROUTVALE: Hof und Haus
// - Kosmetik (Klick aufs Bauernhaus): Haustiere, Landschaft, Deko, Musik, Samenladen, Felder, Muenzen, Rahmen, Pflanzen
// - Haustier: laufen, schlafen, streicheln (Linksklick), Aktionen (Rechtsklick), hilft beim Einsammeln
// - Mondteich im Hof
// Gehoert zu script.js (gemeinsame Funktionen und Zustand stehen dort).
// ============================================================

// ---------- KOSMETIK: WAS IST FREIGESCHALTET? ----------

const KOSMETIK_LISTEN = {
    haustier: HAUSTIER_SKINS,
    landschaft: HOF_THEMEN,
    deko: DEKO_OBJEKTE,
    musik: MUSIK_TITEL,
    samenladen: SAMENLADEN_SKINS,
    felder: FELD_SKINS,
    kugeln: KUGEL_SKINS,
    rahmen: RAHMEN_SKINS,
    pflanzen: PFLANZEN_SKINS
};

// frei = immer, erspielt = Bedingung einmal erfuellt (bleibt dann fuer immer),
// dlc = Unterstuetzer-Paket (meta.dlc) oder einzeln gekauft (meta.freigeschaltet)
function istKosmetikFrei(eintrag, kategorie) {
    if (!eintrag) return false;
    const schluessel = kategorie + ":" + eintrag.id;
    if (eintrag.quelle === "frei") return true;
    if (meta.freigeschaltet[schluessel]) return true;
    if (eintrag.quelle === "dlc") return eintrag.paket === "unterstuetzer" && Boolean(meta.dlc);
    // Erspielt wird nur im Standard-Modus (die Sandbox hat eigenen Fortschritt)
    if (eintrag.bedingung && metaProfil !== "sandbox" && eintrag.bedingung()) {
        meta.freigeschaltet[schluessel] = true;
        // neue Deko steht gleich im Hof, wenn noch ein Platz frei ist
        if (kategorie === "deko" && meta.kosmetik.deko.length < DEKO_MAX) meta.kosmetik.deko.push(eintrag.id);
        return true;
    }
    return false;
}

// Anprobieren im Haus: ein Inhalt wird kurz angezeigt, auch wenn man ihn (noch) nicht besitzt
let kosmetikVorschau = null; // { kategorie, id }

function gewaehlteKosmetik(kategorie) {
    const liste = KOSMETIK_LISTEN[kategorie];
    if (kosmetikVorschau && kosmetikVorschau.kategorie === kategorie && kategorie !== "deko") {
        return liste.find(e => e.id === kosmetikVorschau.id);
    }
    return eigeneKosmetik(kategorie);
}

// Was man selbst ausgewaehlt hat (ohne Vorschau)
function eigeneKosmetik(kategorie) {
    const liste = KOSMETIK_LISTEN[kategorie];
    const eintrag = liste.find(e => e.id === meta.kosmetik[kategorie]);
    return eintrag && istKosmetikFrei(eintrag, kategorie) ? eintrag : liste[0];
}

function aktuellerSkin() {
    return gewaehlteKosmetik("haustier");
}

// Deko, die gerade im Hof steht (hoechstens 3, beim Anprobieren ersetzt die Vorschau den letzten Platz)
function aufgestellteDeko() {
    const liste = meta.kosmetik.deko
        .map(id => DEKO_OBJEKTE.find(d => d.id === id))
        .filter(deko => deko && istKosmetikFrei(deko, "deko"));
    if (kosmetikVorschau && kosmetikVorschau.kategorie === "deko" && !liste.some(d => d.id === kosmetikVorschau.id)) {
        if (liste.length >= DEKO_MAX) liste.pop();
        liste.push(DEKO_OBJEKTE.find(d => d.id === kosmetikVorschau.id));
    }
    return liste.slice(0, DEKO_MAX);
}

// Meldet neu erspielte Kosmetik (wird alle 2 Sekunden geprueft)
function pruefeNeueKosmetik() {
    if (!run || run.sandbox) return;
    let neu = false;
    Object.entries(KOSMETIK_LISTEN).forEach(([kategorie, liste]) => {
        liste.filter(e => e.quelle === "erspielt" && !meta.freigeschaltet[kategorie + ":" + e.id]).forEach(e => {
            if (!istKosmetikFrei(e, kategorie)) return;
            neu = true;
            zeigeBanner("🏡", "Neu im Haus: " + e.name, "Klick aufs Bauernhaus, um es auszuwählen", "#2e9e2e", 3600);
            Klang.geschenk();
        });
    });
    if (neu) {
        speichereMeta();
        renderDeko();
    }
}
setInterval(pruefeNeueKosmetik, 2000);

function dunklereFarbe(hex, faktor) {
    const n = parseInt(hex.slice(1), 16);
    return "#" + [16, 8, 0].map(s => Math.round(((n >> s) & 255) * faktor).toString(16).padStart(2, "0")).join("");
}

// Setzt genau eine Klasse aus einer Liste (z.B. den Look des Samenladens)
function setzeLookKlasse(element, liste, klasse) {
    liste.forEach(e => { if (e.klasse) element.classList.remove(e.klasse); });
    if (klasse) element.classList.add(klasse);
}

// Uebertraegt die gewaehlte Kosmetik ins Spiel (CSS-Farben, Bilder, Landschaft, Effekte)
let letztesHofThema = null;

function wendeKosmetikAn() {
    const wurzel = document.documentElement.style;

    const laden = gewaehlteKosmetik("samenladen");
    wurzel.setProperty("--markise-1", laden.markise[0]);
    wurzel.setProperty("--markise-2", laden.markise[1]);
    wurzel.setProperty("--laden-holz-1", laden.holz[0]);
    wurzel.setProperty("--laden-holz-2", laden.holz[1]);
    setzeLookKlasse(marktstand, SAMENLADEN_SKINS, laden.klasse);
    baueLaden(laden);

    const feld = gewaehlteKosmetik("felder");
    const hatFarben = Object.keys(feld.farben).length > 0;
    const erde = hatFarben ? spriteVariante("erde_" + feld.id, "erde", feld.farben) : "erde";
    const nass = hatFarben
        ? spriteVariante("erde_nass_" + feld.id, "erde", Object.fromEntries(Object.entries(feld.farben).map(([k, f]) => [k, dunklereFarbe(f, 0.8)])))
        : "erde_nass";
    wurzel.setProperty("--erde", "url(" + spriteUrl(erde) + ")");
    wurzel.setProperty("--erde-nass", "url(" + spriteUrl(nass) + ")");
    wurzel.setProperty("--feld-rahmen", feld.rahmen || "transparent");
    setzeLookKlasse(document.body, FELD_SKINS, feld.klasse);
    setzeLookKlasse(document.body, KUGEL_SKINS, gewaehlteKosmetik("kugeln").klasse);
    setzeLookKlasse(document.body, PFLANZEN_SKINS, gewaehlteKosmetik("pflanzen").klasse);

    const thema = gewaehlteKosmetik("landschaft").id;
    const gras = SPRITE_ABWANDLUNGEN["gras_" + thema] ? "gras_" + thema : "gras";
    wurzel.setProperty("--gras", "url(" + spriteUrl(gras) + ")");
    if (thema !== letztesHofThema) {
        letztesHofThema = thema;
        zeichneLandschaften();
    }

    const geldIcon = moneyDisplay.querySelector("img");
    if (geldIcon) setzeSpriteBild(geldIcon, muenzeSprite(0), 2);
    document.body.classList.toggle("farbenblind", Boolean(einstellungen.farbenblind));

    haustier.letzteUrl = "";
    if (haustier.bild) zeigeHaustierBild();
    renderDeko();
    if (run) run.felder.filter(f => !f.leer).forEach(zeigeFeldSprite); // Pflanzen-Look sofort sichtbar
}

// ---------- HOF: DEKO UND MONDTEICH ----------

function hofSprite(name, xProzent, klasse) {
    const img = document.createElement("img");
    img.classList.add("hof-objekt", klasse);
    img.alt = "";
    img.draggable = false;
    setzeSpriteBild(img, name, HOF_PIXEL);
    img.style.left = xProzent + "%";
    hofEbene.appendChild(img);
    return img;
}

// Deko steht auf 3 Plaetzen im Hintergrund der Wiese (hinter Haustier und Teich)
function renderDeko() {
    hofEbene.querySelectorAll(".deko").forEach(e => e.remove());
    aufgestellteDeko().forEach((deko, index) => {
        const sprite = deko.farben ? spriteVariante("deko_" + deko.id, deko.sprite, deko.farben) : deko.sprite;
        const bild = hofSprite(sprite, DEKO_SLOTS[index].x, "deko");
        if (deko.effekt) bild.classList.add("deko-" + deko.effekt);
        if (deko.partikel) bild.dataset.partikel = deko.partikel.join(",");
        setzeTipp(bild, deko.name);
        // Windmuehle: die Fluegel drehen sich vor dem Turm
        if (deko.fluegel) {
            const fluegel = hofSprite("muehlenfluegel", DEKO_SLOTS[index].x, "deko");
            fluegel.classList.add("muehlen-fluegel");
            setzeTipp(fluegel, deko.name);
        }
    });
}

let teichEl = null;

function erstelleTeich() {
    teichEl = hofSprite("teich", TEICH_X, "teich");
    setzeTipp(teichEl, "Mondteich (M)");
    teichEl.addEventListener("pointerdown", event => {
        if (event.button === 0) versucheMondteich();
    });
}

function versucheMondteich() {
    if (spielPausiert()) return;
    if (darfMondteich()) {
        Klang.gluehwuermchen();
        oeffnePrestigeShop();
    } else {
        Klang.fehler();
        zeigeToast(run.sandbox ? "🌙 Der Mondteich öffnet sich vor Tag 1 und nach dem Sandbox-Prestige."
            : "🌙 Der Mondteich öffnet sich vor Tag 1 und am Ende eines Runs.");
    }
}

registriereHaken("anzeige", () => {
    if (teichEl) teichEl.classList.toggle("leuchtet", darfMondteich());
});

// Klickflaeche ueber dem Bauernhaus (die Landschaft ist ein einziges Bild)
const hausFlaeche = $("haus-klickflaeche");
registriereHaken("landschaftGezeichnet", szene => {
    hausFlaeche.style.left = (szene.haus.x / szene.breite) * 100 + "%";
    hausFlaeche.style.top = (szene.haus.y / szene.hoehe) * 100 + "%";
    hausFlaeche.style.width = (szene.haus.b / szene.breite) * 100 + "%";
    hausFlaeche.style.height = (szene.haus.h / szene.hoehe) * 100 + "%";
});
hausFlaeche.addEventListener("pointerdown", event => {
    if (event.button === 0) oeffneHaus();
});

// ---------- SCHORNSTEIN ----------
// Aus dem Bauernhaus steigt leise Rauch auf (am Abend und in der Nacht etwas mehr)

setInterval(() => {
    if (!hofSzene || !hofSzene.schornstein || document.hidden) return;
    if (Math.random() < (tageszeit > 0.6 ? 0.2 : 0.55)) return;
    const puff = el("div", "rauch");
    puff.style.left = (hofSzene.schornstein.x / hofSzene.breite) * 100 + "%";
    puff.style.top = (hofSzene.schornstein.y / hofSzene.hoehe) * 100 + "%";
    puff.style.setProperty("--drift", 20 + Math.random() * 30 + "px");
    hofEbene.appendChild(puff);
    setTimeout(() => puff.remove(), 3200);
}, 700);

// Deko mit Teilchen (Lagerfeuer, Feenbrunnen ...) und Landschaften mit Funkeln (Zauberwald)
setInterval(() => {
    if (document.hidden) return;
    // Bienenkorb: ab und zu fliegt eine Biene eine kleine Runde
    hofEbene.querySelectorAll(".deko-bienen").forEach(korb => {
        if (Math.random() < 0.45 || fxLayer.querySelectorAll(".deko-biene").length > 5) return;
        const rect = korb.getBoundingClientRect();
        const biene = el("div", "deko-biene");
        biene.style.left = rect.left + rect.width * (0.3 + Math.random() * 0.4) + "px";
        biene.style.top = rect.top + rect.height * 0.55 + "px";
        biene.style.setProperty("--bx", (Math.random() - 0.5) * 70 + "px");
        biene.style.setProperty("--by", -20 - Math.random() * 30 + "px");
        fxLayer.appendChild(biene);
        setTimeout(() => biene.remove(), 2600);
    });
    hofEbene.querySelectorAll(".deko[data-partikel]").forEach(deko => {
        if (Math.random() < 0.4) return;
        const rect = deko.getBoundingClientRect();
        const funke = el("div", "deko-funke");
        funke.style.left = rect.left + rect.width * (0.3 + Math.random() * 0.4) + "px";
        funke.style.top = rect.top + rect.height * 0.3 + "px";
        funke.style.background = zufall(deko.dataset.partikel.split(","));
        fxLayer.appendChild(funke);
        setTimeout(() => funke.remove(), 1800);
    });
    const thema = gewaehlteKosmetik("landschaft");
    if (thema.irrlichter && hofEbene.querySelectorAll(".irrlicht").length < 4 && Math.random() < 0.3) {
        const licht = el("div", "irrlicht");
        licht.style.left = 10 + Math.random() * 80 + "%";
        licht.style.top = 40 + Math.random() * 35 + "%";
        licht.style.setProperty("--farbe", zufall(thema.irrlichter));
        licht.style.setProperty("--weg-x", (Math.random() - 0.5) * 160 + "px");
        licht.style.setProperty("--weg-y", -20 - Math.random() * 40 + "px");
        hofEbene.appendChild(licht);
        setTimeout(() => licht.remove(), 7000);
    }
    if (run && run.felder.length > 0 && !spielPausiert()) {
        const feldLook = gewaehlteKosmetik("felder");
        if (feldLook.teilchen && Math.random() < 0.8) {
            const rect = zufall(run.felder).el.feldDiv.getBoundingClientRect();
            steigendesTeilchen(rect.left + rect.width * Math.random(), rect.top + rect.height * (0.5 + Math.random() * 0.4), feldLook.teilchen);
        }
        const pflanzenLook = gewaehlteKosmetik("pflanzen");
        const bepflanzt = run.felder.filter(f => !f.leer);
        if (pflanzenLook.teilchen && bepflanzt.length > 0) {
            const rect = zufall(bepflanzt).el.spriteEl.getBoundingClientRect();
            steigendesTeilchen(rect.left + rect.width * (0.2 + Math.random() * 0.6), rect.top + rect.height * 0.3, pflanzenLook.teilchen);
        }
    }
    if (thema.funkeln && hofEbene.querySelectorAll(".land-funke").length < 12) {
        const funke = el("div", "land-funke");
        funke.style.left = Math.random() * 100 + "%";
        funke.style.top = 35 + Math.random() * 45 + "%";
        funke.style.background = zufall(thema.funkeln);
        hofEbene.appendChild(funke);
        setTimeout(() => funke.remove(), 4000);
    }
}, 450);

function steigendesTeilchen(x, y, farben) {
    const funke = el("div", "deko-funke");
    funke.style.left = x + "px";
    funke.style.top = y + "px";
    funke.style.background = zufall(farben);
    funke.style.color = funke.style.background;
    fxLayer.appendChild(funke);
    setTimeout(() => funke.remove(), 1800);
}

// ---------- SKIN-EFFEKTE ----------
// Samenladen: Funken bei jedem Samen, Feuerwerksladen schiesst tagsueber Raketen.
// Haustiere mit "effekt": Blasen, Herzen, Funkeln oder kleine Flammen.

function ladenOben() {
    const rect = plantButton.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.15, rect };
}

registriereHaken("samen", () => {
    const laden = gewaehlteKosmetik("samenladen");
    if (!laden.funken || run.phase !== "tag") return;
    const { x, y } = ladenOben();
    partikel(x, y, laden.funken, 14, 70);
});

// ---------- LEGENDAERE SAMENLAEDEN: eigene Gebaeude ----------
// Feuerwerksstand, Zirkuszelt und Sternwarte bekommen einen eigenen Aufbau (Dach, Kisten, Kuppel ...),
// ein eigenes Symbol in der Mitte und kleine Animationen, auch zwischen den Tagen.

// Jedes legendaere Gebaeude besteht aus eigenen Teilen (Aussehen in style.css, Abschnitt LEGENDAERE GEBAEUDE)
const LADEN_BAUTEILE = {
    feuerwerk: ["bau-turm", "bau-rampe", "bau-rauch", "bau-flamme", "bau-kiste rechts"],
    zirkus: ["bau-spot", "bau-zelt", "bau-vorhang links", "bau-vorhang rechts", "bau-manege", "bau-wimpel", "bau-seeball"],
    sternwarte: ["bau-turmhaus", "bau-kuppel", "bau-teleskop", "bau-orbit"]
};

function baueLaden(laden) {
    const bauweise = laden.bauweise || "";
    $("plant-button-bild").src = laden.bild ? pixelIconUrl(laden.bild) : spriteUrl("saatsack");
    plantButton.dataset.zustand = ""; // Beschriftung (Startrampe, Manege ...) neu setzen
    if ((marktstand.dataset.bauweise || "") === bauweise) return;
    // Ohne Gebaeude darf das Attribut gar nicht da sein (sonst greifen die Gebaeude-Styles)
    if (bauweise) marktstand.dataset.bauweise = bauweise;
    else delete marktstand.dataset.bauweise;
    marktstand.querySelectorAll(".laden-bau").forEach(e => e.remove());
    if (!bauweise) return;
    const bau = el("div", "laden-bau");
    LADEN_BAUTEILE[bauweise].forEach(klassen => bau.appendChild(el("div", klassen)));
    if (bauweise === "feuerwerk") {
        const rauch = bau.querySelector(".bau-rauch");
        for (let i = 0; i < 4; i++) {
            const wolke = el("span");
            wolke.style.animationDelay = -i * 0.55 + "s";
            rauch.appendChild(wolke);
        }
    }
    if (bauweise === "zirkus") {
        const wimpel = bau.querySelector(".bau-wimpel");
        ["#ffd93d", "#5aa9e6", "#a3dc6f", "#ff8fb1", "#ffd93d", "#5aa9e6", "#a3dc6f"].forEach(farbe => {
            const w = el("span");
            w.style.background = farbe;
            wimpel.appendChild(w);
        });
    }
    if (bauweise === "sternwarte") {
        bau.querySelector(".bau-orbit").appendChild(el("span"));
    }
    marktstand.appendChild(bau);
}

// Oberkante des Gebaeudes (Dach, Zelt oder Kuppel), dort starten die Idle-Effekte
function ladenSpitze() {
    const teil = marktstand.querySelector(".bau-turm, .bau-zelt, .bau-kuppel") || plantButton;
    const rect = teil.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + 6, rect };
}

// Feuerwerk: Teilchen fliegen gleichmaessig im Kreis auseinander und sinken dann leicht
function feuerwerkRing(x, y, farben, anzahl, radius) {
    const versatz = Math.random() * Math.PI * 2;
    for (let i = 0; i < anzahl; i++) {
        const funke = el("div", "partikel");
        const groesse = 3 + Math.floor(Math.random() * 3);
        funke.style.width = groesse + "px";
        funke.style.height = groesse + "px";
        funke.style.left = x + "px";
        funke.style.top = y + "px";
        funke.style.backgroundColor = farben[i % farben.length];
        funke.style.boxShadow = "0 0 6px " + farben[i % farben.length];
        fxLayer.appendChild(funke);
        const winkel = versatz + (i / anzahl) * Math.PI * 2;
        const dx = Math.cos(winkel) * radius;
        const dy = Math.sin(winkel) * radius;
        funke.animate([
            { transform: "translate(0, 0)", opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${dx * 1.1}px, ${dy * 1.1 + radius * 0.5}px)`, opacity: 0 }
        ], { duration: 900 + Math.random() * 300, easing: "cubic-bezier(.15,.8,.35,1)" }).onfinish = () => funke.remove();
    }
}

// Kleine Sternschnuppe, die von einem Punkt schraeg nach oben fliegt (Sternwarte, Sternenkatze)
function miniSchnuppe(x, y, richtung = 1) {
    const kopf = el("div", "mini-schnuppe");
    kopf.style.left = x + "px";
    kopf.style.top = y + "px";
    fxLayer.appendChild(kopf);
    const start = performance.now();
    const weite = 90 + Math.random() * 60;
    function flieg() {
        const t = Math.min(1, (performance.now() - start) / 900);
        const px = x + richtung * weite * t;
        const py = y - weite * 0.8 * t;
        kopf.style.left = px + "px";
        kopf.style.top = py + "px";
        kopf.style.opacity = 1 - t * t;
        partikel(px, py, ["#fff6a0", "#ffffff"], 1, 8);
        if (t < 1) setTimeout(flieg, 30);
        else kopf.remove();
    }
    flieg();
}

function schiesseRakete(farben) {
    const spitze = ladenSpitze();
    const startX = spitze.x + (Math.random() - 0.5) * spitze.rect.width * 0.8;
    const startY = spitze.y;
    const rakete = el("div", "rakete");
    rakete.style.left = startX + "px";
    rakete.style.top = startY + "px";
    fxLayer.appendChild(rakete);
    const hoehe = 70 + Math.random() * 70;
    const start = performance.now();
    function flieg() {
        const t = Math.min(1, (performance.now() - start) / 650);
        const y = startY - hoehe * (1 - Math.pow(1 - t, 2));
        rakete.style.top = y + "px";
        partikel(startX, y + 6, ["#ffd93d", "#ffffff"], 1, 8);
        if (t < 1) {
            setTimeout(flieg, 30);
            return;
        }
        rakete.remove();
        const farbe = zufall(farben);
        feuerwerkRing(startX, y, [farbe, farbe, "#ffffff"], 16, 34 + Math.random() * 18);
        Klang.plinkoNagel(4);
    }
    flieg();
}

// Kurze Reaktion des Gebaeudes auf jeden Klick (Rakete ruckelt, Robbe huepft, Teleskop blitzt)
function ladenKlick() {
    if (!marktstand.dataset.bauweise) return;
    marktstand.classList.remove("bau-klick");
    void marktstand.offsetWidth;
    marktstand.classList.add("bau-klick");
}

// Was ein legendaeres Gebaeude ab und zu von allein macht
function ladenIdle(laden) {
    const spitze = ladenSpitze();
    if (laden.bauweise === "feuerwerk") {
        schiesseRakete(laden.funken);
        if (Math.random() < 0.4) setTimeout(() => schiesseRakete(laden.funken), 350);
    } else if (laden.bauweise === "zirkus") {
        partikel(spitze.x, spitze.y - 10, laden.funken, 18, 80);
        // Ab und zu macht die Robbe einen Salto
        if (Math.random() < 0.5) {
            marktstand.classList.remove("bau-trick");
            void marktstand.offsetWidth;
            marktstand.classList.add("bau-trick");
        }
    } else if (laden.bauweise === "sternwarte") {
        const rohr = marktstand.querySelector(".bau-teleskop");
        const r = rohr ? rohr.getBoundingClientRect() : spitze.rect;
        miniSchnuppe(r.right, r.top, 1);
    }
}

(function ladenIdleSchleife() {
    const laden = gewaehlteKosmetik("samenladen");
    if (laden.bauweise && !document.hidden && !spielPausiert()) ladenIdle(laden);
    setTimeout(ladenIdleSchleife, 2600 + Math.random() * 2200);
})();

// Landung eines Wurfs: kleine Explosion (Feuerwerk), Konfetti (Zirkus) oder Sternenglitzer (Sternwarte)
function wurfAnkunft(x, y, laden, istSamen) {
    if (laden.bauweise === "feuerwerk") {
        feuerwerkRing(x, y, istSamen ? laden.ankunft : [zufall(laden.ankunft), "#ffffff"], istSamen ? 18 : 6, istSamen ? 38 : 14);
        if (istSamen) Klang.plinkoNagel(2);
    } else if (laden.bauweise === "sternwarte") {
        feuerwerkRing(x, y, laden.ankunft, istSamen ? 10 : 4, istSamen ? 26 : 10);
    } else {
        partikel(x, y, laden.ankunft, istSamen ? 18 : 4, istSamen ? 70 : 25);
    }
}

const HAUSTIER_EFFEKTE = {
    blasen: { abstandMs: 500, symbol: null, klasse: "effekt-blase" },
    herzen: { abstandMs: 900, symbol: "💗", klasse: "effekt-symbol" },
    funkeln: { abstandMs: 700, symbol: "✨", klasse: "effekt-symbol" },
    flammen: { abstandMs: 3500, symbol: "🔥", klasse: "effekt-symbol" },
    sterne: { abstandMs: 800, symbol: "⭐", klasse: "effekt-symbol" },
    schnee: { abstandMs: 700, symbol: "❄️", klasse: "effekt-symbol" }
};
let haustierEffektMs = 0;
let haustierIdleMs = 6000;

// Atem-Wolke aus dem Maul (Feuer, Frost): Teilchen fliegen in Blickrichtung
function haustierAtem(farben, anzahl) {
    const kopf = haustierKopf();
    const richtung = haustier.richtung;
    for (let i = 0; i < anzahl; i++) {
        const teil = el("div", "partikel");
        const groesse = 4 + Math.floor(Math.random() * 4);
        teil.style.width = groesse + "px";
        teil.style.height = groesse + "px";
        teil.style.left = kopf.x + richtung * 10 + "px";
        teil.style.top = kopf.y + 8 + "px";
        teil.style.backgroundColor = zufall(farben);
        teil.style.boxShadow = "0 0 6px " + farben[0];
        fxLayer.appendChild(teil);
        const weite = 40 + Math.random() * 50;
        teil.animate([
            { transform: "translate(0, 0) scale(0.6)", opacity: 1 },
            { transform: `translate(${richtung * weite}px, ${(Math.random() - 0.6) * 24}px) scale(1.4)`, opacity: 0 }
        ], { duration: 500 + Math.random() * 300, delay: i * 25, easing: "ease-out", fill: "backwards" }).onfinish = () => teil.remove();
    }
}

// Eigene Animationen der legendaeren Haustiere (kommen alle paar Sekunden, wenn das Tier ruht)
const HAUSTIER_IDLE = {
    feuer: () => { haustierAtem(["#ffd93d", "#ff8a2a", "#e8434a"], 18); Klang.plinkoNagel(1); },
    frost: () => { haustierAtem(["#ffffff", "#bff0ff", "#5aa9e6"], 18); Klang.plinkoNagel(6); },
    teufel: () => {
        haustier.bild.animate([{ translate: "0 0" }, { translate: "0 -16px" }, { translate: "0 0" }], { duration: 450, easing: "ease-out" });
        const rect = haustier.bild.getBoundingClientRect();
        partikel(rect.left + rect.width / 2, rect.bottom - 4, ["#ff4a1a", "#ffd93d", "#3a1822"], 14, 40);
    },
    phoenix: () => {
        const rect = haustier.bild.getBoundingClientRect();
        feuerwerkRing(rect.left + rect.width / 2, rect.top + rect.height / 2, ["#ffd93d", "#ff8a2a", "#e8434a"], 14, 36);
        haustier.bild.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.8)" }, { filter: "brightness(1)" }], { duration: 700 });
    },
    engel: () => {
        haustier.bild.animate([{ translate: "0 0" }, { translate: "0 -12px" }, { translate: "0 0" }], { duration: 1600, easing: "ease-in-out" });
        const kopf = haustierKopf();
        feuerwerkRing(kopf.x, kopf.y - 6, ["#fff6a0", "#ffffff"], 10, 22);
    },
    sterne: () => {
        const kopf = haustierKopf();
        miniSchnuppe(kopf.x, kopf.y - 8, haustier.richtung);
    },
    geist: () => {
        haustier.bild.animate([{ opacity: 0.72 }, { opacity: 0.08 }, { opacity: 0.08 }, { opacity: 0.72 }], { duration: 1800, easing: "ease-in-out" });
    },
    tanz: () => {
        haustier.bild.animate([{ scale: "1 1" }, { scale: "-1 1" }, { scale: "1 1" }, { scale: "-1 1" }, { scale: "1 1" }],
            { duration: 900, easing: "steps(4)" });
        const kopf = haustierKopf();
        zeigeHerzen(kopf.x, kopf.y, 3);
    },
    blubb: () => {
        const kopf = haustierKopf();
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const blase = el("div", "effekt-blase");
                blase.style.left = kopf.x + (Math.random() - 0.5) * 16 + "px";
                blase.style.top = kopf.y + "px";
                fxLayer.appendChild(blase);
                setTimeout(() => blase.remove(), 1600);
            }, i * 120);
        }
        haustier.bild.animate([{ rotate: "0deg" }, { rotate: "-8deg" }, { rotate: "8deg" }, { rotate: "0deg" }], { duration: 600 });
    },
    manta: () => {
        haustier.bild.animate([
            { translate: "0 0", rotate: "0deg" }, { translate: "0 -34px", rotate: "-180deg" }, { translate: "0 0", rotate: "-360deg" }
        ], { duration: 1400, easing: "ease-in-out" });
        HAUSTIER_IDLE.blubb();
    }
};

function aktualisiereHaustierIdle(dtMs) {
    const skin = aktuellerSkin();
    if (!skin.idle || !["sitzen", "stehen", "liegen"].includes(haustier.zustand)) return;
    haustierIdleMs -= dtMs;
    if (haustierIdleMs > 0) return;
    haustierIdleMs = 7000 + Math.random() * 6000;
    HAUSTIER_IDLE[skin.idle]();
}

function aktualisiereHaustierEffekt(dtMs) {
    const skin = aktuellerSkin();
    const effekt = skin.effekt && HAUSTIER_EFFEKTE[skin.effekt];
    if (!effekt || haustier.zustand === "schlafen") return;
    haustierEffektMs += dtMs * (haustier.zustand === "laufen" ? 2 : 1);
    if (haustierEffektMs < effekt.abstandMs) return;
    haustierEffektMs = 0;
    const kopf = haustierKopf();
    const teil = effekt.symbol ? pixelIcon(effekt.symbol, 16, effekt.klasse) : el("div", effekt.klasse);
    teil.style.left = kopf.x + (Math.random() - 0.5) * 30 + "px";
    teil.style.top = kopf.y + Math.random() * 20 + "px";
    fxLayer.appendChild(teil);
    setTimeout(() => teil.remove(), 1600);
}

// ---------- HAUS: KOSMETIK-FENSTER ----------

let aktiveKosmetikKategorie = "haustier";
let hausSchliessen = null;
const landschaftVorschau = {};

const MUSIK_SYMBOLE = {
    auto: "🔁", sproutvale: "🌱", morgentau: "🌅", abendrot: "🌇", mondnacht: "🌙",
    kirmes: "🎡", winterzauber: "❄️", sternenwalzer: "✨"
};

function beendeKosmetikVorschau() {
    if (!kosmetikVorschau) return;
    kosmetikVorschau = null;
    wendeKosmetikAn();
    aktualisiereMusik();
}

function oeffneHaus(kategorie) {
    if (spielPausiert()) return;
    if (kategorie) aktiveKosmetikKategorie = kategorie;
    if (hausSchliessen) hausSchliessen();
    schliesseHaustierMenue();
    const inhalt = el("div", "haus-inhalt");
    hausSchliessen = zeigePopup({
        titel: "🏡 Dein Bauernhaus",
        inhalt,
        klasse: "haus-popup",
        breite: 1080,
        onSchliessen: () => {
            hausSchliessen = null;
            beendeKosmetikVorschau();
        }
    });
    Klang.banner();
    renderHaus(inhalt);
}

function kosmetikBild(kategorie, eintrag) {
    const bild = document.createElement("img");
    bild.alt = "";
    bild.draggable = false;
    bild.classList.add("haus-vorschau");
    switch (kategorie) {
        case "haustier":
            bild.src = haustierUrl(eintrag, "sitzen", 0, false);
            bild.style.width = HAUSTIER_BREITE * 4 + "px";
            bild.style.height = HAUSTIER_HOEHE * 4 + "px";
            return bild;
        case "landschaft":
            if (!landschaftVorschau[eintrag.id]) landschaftVorschau[eintrag.id] = zeichneHof(100, 34, eintrag.id).url;
            bild.src = landschaftVorschau[eintrag.id];
            bild.style.width = "200px";
            bild.style.height = "68px";
            return bild;
        case "deko":
            setzeSpriteBild(bild, eintrag.farben ? spriteVariante("deko_" + eintrag.id, eintrag.sprite, eintrag.farben) : eintrag.sprite, 3);
            if (eintrag.effekt) bild.classList.add("deko-" + eintrag.effekt);
            if (eintrag.fluegel) {
                // Vorschau der Windmuehle: Turm mit drehenden Fluegeln
                const fluegel = document.createElement("img");
                fluegel.alt = "";
                fluegel.classList.add("vorschau-fluegel");
                setzeSpriteBild(fluegel, "muehlenfluegel", 3);
                return el("div", "vorschau-muehle", null, [bild, fluegel]);
            }
            return bild;
        case "felder": {
            const hatFarben = Object.keys(eintrag.farben).length > 0;
            setzeSpriteBild(bild, hatFarben ? spriteVariante("erde_" + eintrag.id, "erde", eintrag.farben) : "erde", 4);
            if (eintrag.rahmen) bild.style.outline = "4px solid " + eintrag.rahmen;
            if (eintrag.klasse) bild.classList.add("vorschau-" + eintrag.klasse);
            return bild;
        }
        case "kugeln":
            setzeSpriteBild(bild, spriteVariante("muenze_vorschau_" + eintrag.id, "muenze", { ...eintrag.farben, Z: eintrag.farben.y || "#d9a82a" }), 5);
            if (eintrag.klasse) bild.classList.add("vorschau-" + eintrag.klasse);
            return bild;
        case "samenladen": {
            const laden = el("div", "laden-vorschau" + (eintrag.klasse ? " vorschau-" + eintrag.klasse : "") +
                (eintrag.bauweise ? " vorschau-bau-" + eintrag.bauweise : ""));
            if (eintrag.bild) laden.appendChild(pixelIcon(eintrag.bild, 32, "laden-vorschau-bild"));
            laden.style.setProperty("--m1", eintrag.markise[0]);
            laden.style.setProperty("--m2", eintrag.markise[1]);
            laden.style.setProperty("--h1", eintrag.holz[0]);
            laden.style.setProperty("--h2", eintrag.holz[1]);
            return laden;
        }
        case "rahmen":
            return el("div", "rahmen-vorschau " + eintrag.css, null, [pixelIcon("🧸", 48)]);
        case "musik":
            return pixelIcon(MUSIK_SYMBOLE[eintrag.id] || "🎵", 64, "haus-vorschau");
        default: {
            // Pflanzen-Look: Vorschau mit der Tomate
            const hatFarben = eintrag.farben && Object.keys(eintrag.farben).length > 0;
            setzeSpriteBild(bild, hatFarben ? spriteVariante("tomate_" + eintrag.id, "tomate", eintrag.farben) : "tomate", 4);
            return bild;
        }
    }
}

// Was ein Klick auf eine Kachel macht: auswaehlen (eigene Inhalte) oder anprobieren (fremde Inhalte)
function waehleKosmetik(kategorie, eintrag, inhalt) {
    const frei = istKosmetikFrei(eintrag, kategorie);
    if (!frei) {
        const gleich = kosmetikVorschau && kosmetikVorschau.kategorie === kategorie && kosmetikVorschau.id === eintrag.id;
        kosmetikVorschau = gleich ? null : { kategorie, id: eintrag.id };
        wendeKosmetikAn();
        aktualisiereMusik();
        if (!gleich && kategorie === "haustier") haustierLaut();
        else Klang.klick(12);
        renderHaus(inhalt);
        return;
    }
    kosmetikVorschau = null;
    if (kategorie === "deko") {
        const liste = meta.kosmetik.deko;
        const index = liste.indexOf(eintrag.id);
        if (index >= 0) {
            liste.splice(index, 1);
        } else if (liste.length >= DEKO_MAX) {
            Klang.fehler();
            zeigeToast("Es passen höchstens " + DEKO_MAX + " Deko-Objekte in den Hof. Nimm zuerst eins weg.");
            return;
        } else {
            liste.push(eintrag.id);
        }
    } else {
        meta.kosmetik[kategorie] = eintrag.id;
    }
    speichereMeta();
    wendeKosmetikAn();
    aktualisiereMusik();
    if (kategorie === "haustier") haustierLaut();
    else Klang.kaufen();
    renderHaus(inhalt);
    if (!prestigeShop.classList.contains("versteckt")) renderPrestigeShop();
}

// Blendet das Haus-Fenster kurz aus, damit man die Vorschau im Hof sieht, und fuehrt Effekte vor
function zeigeVorschauKurz(inhalt) {
    const huelle = inhalt.closest(".popup-huelle");
    if (!huelle) return;
    huelle.classList.add("kurz-weg");
    document.body.classList.add("vorschau-ansicht");
    const laden = gewaehlteKosmetik("samenladen");
    if (kosmetikVorschau && kosmetikVorschau.kategorie === "samenladen") {
        const { x, y } = ladenOben();
        if (laden.funken) partikel(x, y, laden.funken, 20, 80);
        if (laden.bauweise) {
            ladenIdle(laden);
            setTimeout(() => ladenIdle(laden), 1100);
        }
        // Ein paar Probewuerfe auf den Acker (es wird nichts gepflanzt)
        const knopf = plantButton.getBoundingClientRect();
        const acker = fieldGrid.getBoundingClientRect();
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                spawnWurfKugel(knopf.left + knopf.width / 2, knopf.top + knopf.height * 0.45,
                    acker.left + acker.width * (0.15 + Math.random() * 0.7), acker.top + acker.height * (0.2 + Math.random() * 0.6),
                    i % 2 === 1, () => {});
            }, 300 + i * 450);
        }
    }
    if (kosmetikVorschau && kosmetikVorschau.kategorie === "kugeln") {
        const rect = fieldGrid.getBoundingClientRect();
        for (let i = 0; i < 6; i++) {
            spawnLootKugel(rect.left + rect.width * (0.3 + Math.random() * 0.4), rect.top + rect.height * 0.5, 0, i % 4, "gold",
                { anzeige: "Vorschau" });
        }
    }
    if (kosmetikVorschau && kosmetikVorschau.kategorie === "haustier") {
        haustierLaut();
        const skin = aktuellerSkin();
        if (skin.idle) {
            wechsleHaustierZustand("sitzen", 4000);
            setTimeout(() => HAUSTIER_IDLE[skin.idle](), 500);
            setTimeout(() => HAUSTIER_IDLE[skin.idle](), 2200);
        } else {
            laufeZuNeuemPlatz();
        }
    }
    setTimeout(() => {
        huelle.classList.remove("kurz-weg");
        document.body.classList.remove("vorschau-ansicht");
    }, 3500);
}

function renderHaus(inhalt) {
    inhalt.innerHTML = "";
    const reiter = el("div", "haus-reiter");
    KOSMETIK_KATEGORIEN.forEach(k => {
        const knopf = el("button", "knopf reiter-knopf", null, [pixelIcon(k.symbol, 32), el("span", null, k.name)]);
        knopf.classList.toggle("aktiv", k.id === aktiveKosmetikKategorie);
        knopf.addEventListener("click", () => {
            beendeKosmetikVorschau();
            aktiveKosmetikKategorie = k.id;
            Klang.klick(8);
            renderHaus(inhalt);
        });
        reiter.appendChild(knopf);
    });
    inhalt.appendChild(reiter);

    const kategorie = aktiveKosmetikKategorie;
    const hinweise = {
        haustier: "Dein Begleiter auf dem Hof. Rechtsklick auf ihn öffnet seine Aktionen.",
        landschaft: "Das Aussehen deines Hofs und der Wiese.",
        deko: "Bis zu " + DEKO_MAX + " Deko-Objekte stehen im Hintergrund deines Hofs. Klick zum Aufstellen oder Wegräumen.",
        musik: "\"Automatisch\" wechselt mit der Tageszeit zwischen deinen Liedern. Klick auf ein fremdes Lied zum Probehören.",
        samenladen: "Der Look deines Samenladens, manche mit Effekten.",
        felder: "So sieht die Erde auf deinen Feldern aus.",
        kugeln: "So sieht die Saat aus, die bei der Ernte fällt. Die Farbe des Edelsteins zeigt weiter die Rarität.",
        rahmen: "Der Rahmen um deine Kuscheltiere im Mondteich.",
        pflanzen: "Andere Blattfarben für alle deine Pflanzen."
    };
    inhalt.appendChild(el("div", "panel-hinweis", hinweise[kategorie]));

    // Vorschau-Leiste: was gerade anprobiert wird und was es kostet
    if (kosmetikVorschau && kosmetikVorschau.kategorie === kategorie) {
        const eintrag = KOSMETIK_LISTEN[kategorie].find(e => e.id === kosmetikVorschau.id);
        const woher = eintrag.quelle === "dlc" ? "Bald im Steam-Shop: " + dlcPreisText(eintrag)
            : "Freispielen: " + eintrag.bedingungText;
        const ende = el("button", "knopf", "Vorschau beenden");
        ende.addEventListener("click", () => {
            beendeKosmetikVorschau();
            renderHaus(inhalt);
        });
        const knoepfe = [ende];
        if (kategorie !== "musik" && kategorie !== "rahmen") {
            const ansehen = el("button", "knopf knopf-lila", "👁 Ansehen");
            ansehen.addEventListener("click", () => zeigeVorschauKurz(inhalt));
            knoepfe.unshift(ansehen);
        }
        inhalt.appendChild(el("div", "haus-vorschau-leiste", null, [
            el("span", null, "👀 Du probierst gerade " + eintrag.name + " an. " + woher),
            el("div", "haus-vorschau-knoepfe", null, knoepfe)
        ]));
    }

    const raster = el("div", "haus-raster");
    KOSMETIK_LISTEN[kategorie].forEach(eintrag => {
        const frei = istKosmetikFrei(eintrag, kategorie);
        const aktiv = kategorie === "deko" ? meta.kosmetik.deko.includes(eintrag.id) : eigeneKosmetik(kategorie).id === eintrag.id && frei;
        const vorschau = kosmetikVorschau && kosmetikVorschau.kategorie === kategorie && kosmetikVorschau.id === eintrag.id;
        const kachel = el("button", "haus-kachel");
        kachel.classList.toggle("aktiv", frei && aktiv);
        kachel.classList.toggle("gesperrt", !frei);
        kachel.classList.toggle("vorschau", vorschau);
        kachel.classList.toggle("dlc", eintrag.quelle === "dlc");
        const seltenheit = KUSCHEL_RARITAETEN[kosmetikSeltenheit(eintrag)];
        kachel.style.setProperty("--seltenheit", seltenheit.rand);
        kachel.classList.add("selten-" + seltenheit.id);

        let status;
        if (vorschau) status = "👀 Vorschau";
        else if (!frei) status = eintrag.quelle === "dlc" ? "💝 " + dlcPreisText(eintrag) : "🔒 " + eintrag.bedingungText;
        else if (kategorie === "deko") status = aktiv ? "✓ Steht im Hof" : "Aufstellen";
        else status = aktiv ? "✓ Ausgewählt" : "Auswählen";
        const knopfText = !frei ? (kategorie === "musik" ? "🎧 Probehören" : "👀 Anprobieren") : null;

        kachel.append(
            el("div", "haus-seltenheit", seltenheit.name),
            el("div", "haus-bild", null, [kosmetikBild(kategorie, eintrag)]),
            el("div", "haus-name", eintrag.name),
            el("div", "haus-status", status)
        );
        if (knopfText && !vorschau) kachel.appendChild(el("div", "haus-testen", knopfText));
        kachel.addEventListener("click", () => waehleKosmetik(kategorie, eintrag, inhalt));
        raster.appendChild(kachel);
    });
    inhalt.appendChild(raster);

    if (KOSMETIK_LISTEN[kategorie].some(e => e.quelle === "dlc" && !istKosmetikFrei(e, kategorie))) {
        const paket = DLC_PAKETE.unterstuetzer;
        inhalt.appendChild(el("div", "panel-hinweis leise",
            "💝 Alles hier ist reine Optik und unterstützt die Entwicklung von Sproutvale. " + paket.name + " (" + euro(paket.preis) +
            "): " + paket.inhalt + ". Legendäre Inhalte mit Animationen gibt es einzeln für je " + euro(LEGENDAER_PREIS) +
            ". Kaufen geht, sobald Sproutvale auf Steam ist."));
    }
}

// ---------- HAUSTIER ----------
// Kleine Zustaende: sitzen, laufen, stehen, liegen, schlafen (nachts lieber schlafen)

const haustier = {
    el: null, bild: null, x: 50, zielX: 50, richtung: 1,
    zustand: "sitzen", zustandMs: 3000, bildNummer: 0, bildMs: 0,
    blinzelMs: 2500, blinzeltBis: 0, zzzMs: 0, letzteUrl: "", hilfeMs: 0, ball: null
};

const HAUSTIER_BILD_DAUER = { laufen: 130, stehen: 700, sitzen: 650, liegen: 900, schlafen: 1100 };

// Chance, dass das Haustier alle paar Sekunden liegende Muenzen fuer dich einsammelt
function haustierHilfeChance() {
    return Math.min(0.9, KONFIG.haustierHilfeChance + 0.1 * level("haustiertraining")) * (1 + 0.1 * kuschel("hundplueschi"));
}

function erstelleHaustier() {
    const huelle = document.createElement("div");
    huelle.classList.add("hof-objekt", "haustier");
    const bild = document.createElement("img");
    bild.alt = "";
    bild.draggable = false;
    bild.style.width = HAUSTIER_BREITE * HOF_PIXEL + "px";
    bild.style.height = HAUSTIER_HOEHE * HOF_PIXEL + "px";
    huelle.appendChild(bild);
    setzeTipp(huelle, "Streicheln (Linksklick) · Aktionen (Rechtsklick)");
    huelle.style.left = haustier.x + "%";
    hofEbene.appendChild(huelle);
    haustier.el = huelle;
    haustier.bild = bild;

    huelle.addEventListener("pointerdown", event => {
        if (event.button === 0) streichleHaustier(event);
    });
    huelle.addEventListener("contextmenu", event => {
        event.preventDefault();
        if (!spielPausiert()) oeffneHaustierMenue();
    });
    zeigeHaustierBild();
}

function zeigeHaustierBild() {
    const blinzelt = haustier.blinzeltBis > performance.now();
    const url = haustierUrl(aktuellerSkin(), haustier.zustand, haustier.bildNummer, blinzelt);
    if (url !== haustier.letzteUrl) {
        haustier.bild.src = url;
        haustier.letzteUrl = url;
    }
    haustier.bild.style.transform = haustier.richtung < 0 ? "scaleX(-1)" : "";
    // Legendaere Tiere leuchten und schweben teilweise
    const skin = aktuellerSkin();
    haustier.el.classList.toggle("haustier-aura", Boolean(skin.aura));
    haustier.el.classList.toggle("haustier-schwebt", Boolean(skin.schwebt));
    if (skin.aura) haustier.el.style.setProperty("--aura", skin.aura);
    // Besondere Figuren (z.B. Geisterkatze) bekommen einen eigenen Look
    const klasse = skin.klasse || "";
    if (haustier.el.dataset.klasse !== klasse) {
        if (haustier.el.dataset.klasse) haustier.el.classList.remove(haustier.el.dataset.klasse);
        if (klasse) haustier.el.classList.add(klasse);
        haustier.el.dataset.klasse = klasse;
    }
}

function wechsleHaustierZustand(zustand, ms) {
    haustier.zustand = zustand;
    haustier.zustandMs = ms;
    haustier.bildNummer = 0;
    haustier.bildMs = 0;
}

function laufeZu(ziel) {
    haustier.zielX = ziel;
    haustier.richtung = ziel > haustier.x ? 1 : -1;
    wechsleHaustierZustand("laufen", 0);
}

function laufeZuNeuemPlatz() {
    let ziel;
    do {
        ziel = 36 + Math.random() * 28;
    } while (Math.abs(ziel - haustier.x) < 6);
    laufeZu(ziel);
}

function naechsterHaustierZustand() {
    const nacht = tageszeit > 0.85 && tageszeit < 1.2;
    const wurf = Math.random();
    const dauer = (min, max) => min + Math.random() * (max - min);
    switch (haustier.zustand) {
        case "stehen":
            wechsleHaustierZustand("sitzen", dauer(3000, 6000));
            break;
        case "sitzen":
            if (wurf < (nacht ? 0.15 : 0.5)) laufeZuNeuemPlatz();
            else if (wurf < (nacht ? 0.9 : 0.75)) wechsleHaustierZustand("liegen", dauer(4000, 8000));
            else wechsleHaustierZustand("sitzen", dauer(3000, 5000));
            break;
        case "liegen":
            if (wurf < (nacht ? 0.85 : 0.45)) wechsleHaustierZustand("schlafen", dauer(8000, 16000));
            else wechsleHaustierZustand("sitzen", dauer(3000, 5000));
            break;
        default:
            if (nacht && wurf < 0.6) wechsleHaustierZustand("schlafen", dauer(8000, 14000));
            else wechsleHaustierZustand("liegen", dauer(2000, 4000));
    }
}

function aktualisiereHaustier(dtMs, jetzt) {
    if (!haustier.el) return;
    haustier.bildMs += dtMs;
    if (haustier.bildMs >= HAUSTIER_BILD_DAUER[haustier.zustand]) {
        haustier.bildMs = 0;
        haustier.bildNummer += 1;
    }

    if (haustier.zustand === "laufen") {
        const tempo = haustier.ball ? 90 : 40;
        const schritt = (tempo / topBar.clientWidth) * 100 * (dtMs / 1000);
        const rest = haustier.zielX - haustier.x;
        if (Math.abs(rest) <= schritt) {
            haustier.x = haustier.zielX;
            if (haustier.ball) holeBall();
            else wechsleHaustierZustand("stehen", 700 + Math.random() * 800);
        } else {
            haustier.x += Math.sign(rest) * schritt;
        }
        haustier.el.style.left = haustier.x + "%";
    } else {
        haustier.zustandMs -= dtMs;
        if (haustier.zustandMs <= 0) naechsterHaustierZustand();
    }

    if (haustier.zustand === "schlafen") {
        haustier.zzzMs -= dtMs;
        if (haustier.zzzMs <= 0) {
            haustier.zzzMs = 1400;
            zeigeZzz();
        }
    }

    haustier.blinzelMs -= dtMs;
    if (haustier.blinzelMs <= 0) {
        haustier.blinzelMs = 2000 + Math.random() * 4000;
        haustier.blinzeltBis = jetzt + 160;
    }

    // Tagsueber hilft das Haustier manchmal und sammelt liegende Muenzen ein
    if (run.phase === "tag" && !spielPausiert()) {
        haustier.hilfeMs += dtMs;
        if (haustier.hilfeMs >= KONFIG.haustierHilfeSek * 1000) {
            haustier.hilfeMs = 0;
            const muenzen = lootKugeln.filter(l => l.gelandet && l.typ === "gold");
            if (muenzen.length > 0 && Math.random() < haustierHilfeChance()) {
                muenzen.slice(0, 3).forEach(sammleEin);
                zeigeEmote("✨");
                haustierLaut();
            }
        }
    }
    aktualisiereHaustierEffekt(dtMs);
    aktualisiereHaustierIdle(dtMs);
    bewegeBallImMaul();
    zeigeHaustierBild();
}

function haustierKopf() {
    const rect = haustier.bild.getBoundingClientRect();
    return {
        x: haustier.richtung > 0 ? rect.left + rect.width * 0.72 : rect.left + rect.width * 0.28,
        y: rect.top + rect.height * 0.3,
        rect
    };
}

function zeigeZzz() {
    const kopf = haustierKopf();
    const zzz = el("div", "zzz", "z");
    zzz.style.left = kopf.x + "px";
    zzz.style.top = kopf.y + "px";
    fxLayer.appendChild(zzz);
    setTimeout(() => zzz.remove(), 1800);
}

// Sprechblase mit Pixel-Symbol ueber dem Kopf
function zeigeEmote(symbol) {
    const kopf = haustierKopf();
    const blase = el("div", "emote", null, [pixelIcon(symbol, 32)]);
    blase.style.left = kopf.x + "px";
    blase.style.top = kopf.y - 30 + "px";
    fxLayer.appendChild(blase);
    setTimeout(() => blase.remove(), 1500);
}

// Legendaerer Jackpot: das Haustier springt vor Freude (hoechstens alle 2 Sekunden)
let letzteFreude = 0;

function haustierFreutSich() {
    if (!haustier.el || performance.now() - letzteFreude < 2000) return;
    letzteFreude = performance.now();
    if (haustier.zustand === "schlafen" || haustier.zustand === "liegen") wechsleHaustierZustand("sitzen", 3000);
    zeigeEmote(zufall(["🤩", "🎉", "😻", "💛"]));
    haustierLaut();
    haustier.bild.animate([
        { translate: "0 0" }, { translate: "0 -22px" }, { translate: "0 0" }, { translate: "0 -12px" }, { translate: "0 0" }
    ], { duration: 800, easing: "ease-out" });
    const kopf = haustierKopf();
    zeigeHerzen(kopf.x, kopf.y, 4);
    partikel(kopf.x, kopf.y, ["#ffd93d", "#ffffff", "#ff8fb1"], 16, 60);
}

function haustierLaut() {
    const skin = aktuellerSkin();
    if (skin.laut === "wuff") Klang.wuff(skin.stimme || 1);
    else if (skin.laut === "blubb" || skin.art === "manta") Klang.blubb();
    else Klang.miau(skin.stimme || 1);
}

function zeigeHerzen(x, y, anzahl = 3) {
    for (let i = 0; i < anzahl; i++) {
        const herz = document.createElement("img");
        herz.classList.add("herz");
        setzeSpriteBild(herz, "herz", 4);
        herz.style.left = x + (Math.random() - 0.5) * 30 + "px";
        herz.style.top = y - 10 + "px";
        herz.style.setProperty("--dx", (Math.random() - 0.5) * 40 + "px");
        herz.style.animationDelay = i * 0.09 + "s";
        herz.style.animationDuration = 0.9 + i * 0.15 + "s";
        fxLayer.appendChild(herz);
        setTimeout(() => herz.remove(), 1400 + i * 150);
    }
}

function streichleHaustier(event) {
    if (spielPausiert()) return;
    schliesseHaustierMenue();
    run.gesamt.streicheln += 1;
    meta.lebenszeit.streicheln += 1;
    if (haustier.zustand === "liegen" || haustier.zustand === "schlafen") Klang.schnurren();
    else haustierLaut();

    if (haustier.zustand === "schlafen" || haustier.zustand === "laufen") {
        if (haustier.ball) haustier.ball.remove();
        haustier.ball = null;
        wechsleHaustierZustand("sitzen", 2500);
    }
    haustier.blinzeltBis = performance.now() + 450;
    haustier.bild.animate(
        [{ scale: "1.12 0.88" }, { scale: "0.96 1.06" }, { scale: "1 1" }],
        { duration: 300, easing: "ease-out" }
    );
    zeigeHerzen(event.clientX, event.clientY);

    // Jedes 3. Streicheln gibt Gold, aber nur waehrend eines Tages (wenn Energie verbraucht wird), nicht bei Feierabend.
    // Easteregg: ab dem 333. Streicheln (fuer immer) steht dort "<3" und es gibt 3 Gold.
    if (run.phase === "tag") {
        run.streichelZaehler += 1;
        if (run.streichelZaehler % KONFIG.streichelnFuerGold === 0) gibStreichelGold();
    }
    if (meta.lebenszeit.streicheln === KONFIG.streichelHerzAb) {
        partikel(event.clientX, event.clientY, ["#ff8fb1", "#ffd6f0", "#ffffff"], 30, 120);
        Klang.geschenk();
    }
}

// Das Haustier laesst eine Muenze fallen, die man einsammeln muss (1 Gold, ab dem 333. Streicheln "<3" = 3 Gold)
function gibStreichelGold() {
    const herz = meta.lebenszeit.streicheln >= KONFIG.streichelHerzAb;
    const menge = ((herz ? KONFIG.streichelHerzGold : KONFIG.streichelGold) + kuschel("kuschelkatze")) * (1 + segen("tierfreund"));
    const rect = haustier.bild.getBoundingClientRect();
    spawnLootKugel(rect.left + rect.width / 2, rect.top + rect.height * 0.6, menge, 0, "gold", {
        streicheln: true,
        anzeige: herz ? "<3" : null
    });
}

// ---------- HAUSTIER: AKTIONEN (Rechtsklick, funktionieren immer) ----------

let haustierMenue = null;

function oeffneHaustierMenue() {
    schliesseHaustierMenue();
    const menue = el("div", "haustier-menue pergament");
    menue.appendChild(el("div", "haustier-menue-titel", aktuellerSkin().name));
    const raster = el("div", "haustier-menue-raster");
    HAUSTIER_AKTIONEN.forEach(aktion => {
        const knopf = el("button", "haustier-aktion", null, [pixelIcon(aktion.symbol, 32), el("span", null, aktion.name)]);
        knopf.addEventListener("click", () => {
            schliesseHaustierMenue();
            fuehreHaustierAktionAus(aktion.id);
        });
        raster.appendChild(knopf);
    });
    menue.appendChild(raster);
    const wechseln = el("button", "knopf haustier-wechseln", "🏡 Begleiter wechseln");
    wechseln.addEventListener("click", () => oeffneHaus("haustier"));
    menue.appendChild(wechseln);
    document.body.appendChild(menue);
    haustierMenue = menue;

    const rect = haustier.el.getBoundingClientRect();
    const breite = menue.offsetWidth;
    menue.style.left = klemme(rect.left + rect.width / 2 - breite / 2, 8, window.innerWidth - breite - 8) + "px";
    menue.style.top = Math.min(rect.bottom + 6, window.innerHeight - menue.offsetHeight - 8) + "px";
    Klang.klick(12);
}

function schliesseHaustierMenue() {
    if (haustierMenue) haustierMenue.remove();
    haustierMenue = null;
}

document.addEventListener("pointerdown", event => {
    if (haustierMenue && !haustierMenue.contains(event.target) && !haustier.el.contains(event.target)) schliesseHaustierMenue();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") schliesseHaustierMenue();
});

// Leckerli passend zum Tier
function futterSymbol() {
    const skin = aktuellerSkin();
    const stil = skin.stil || {};
    if (skin.art === "manta" || stil.axolotl) return "🦐";
    if (stil.einhorn) return "🍎";
    if (stil.hund) return "🦴";
    if (stil.hase) return "🥕";
    if (stil.panda) return "🎋";
    if (stil.fuchs) return "🍗";
    if (stil.drache) return "🌶️";
    if (skin.art === "maedchen") return "🍰";
    return "🐟";
}

function fuehreHaustierAktionAus(id) {
    const bild = haustier.bild;
    const kopf = haustierKopf();
    if (haustier.ball) haustier.ball.remove();
    haustier.ball = null;
    switch (id) {
        case "winken":
            wechsleHaustierZustand("stehen", 1800);
            zeigeEmote("👋");
            haustierLaut();
            bild.animate([{ translate: "0 0" }, { translate: "0 -14px" }, { translate: "0 0" }, { translate: "0 -8px" }, { translate: "0 0" }],
                { duration: 700, easing: "ease-out" });
            break;
        case "kuscheln":
            wechsleHaustierZustand("liegen", 4000);
            zeigeEmote("💕");
            Klang.schnurren();
            zeigeHerzen(kopf.x, kopf.y, 6);
            break;
        case "tanzen":
            wechsleHaustierZustand("stehen", 2400);
            zeigeEmote("🎵");
            Klang.trick();
            bild.animate([
                { rotate: "0deg", translate: "0 0" }, { rotate: "-12deg", translate: "-6px -8px" },
                { rotate: "12deg", translate: "6px -8px" }, { rotate: "-12deg", translate: "-6px -8px" },
                { rotate: "12deg", translate: "6px -8px" }, { rotate: "0deg", translate: "0 0" }
            ], { duration: 2000, easing: "ease-in-out" });
            break;
        case "rolle": {
            // Seitliche Rolle ueber die Wiese: hin, kurz liegen bleiben, stolz aufstehen
            wechsleHaustierZustand("sitzen", 3200);
            Klang.trick();
            const weg = haustier.richtung * 60;
            bild.animate([
                { translate: "0 0", rotate: "0deg" },
                { translate: weg * 0.5 + "px -10px", rotate: haustier.richtung * 180 + "deg" },
                { translate: weg + "px 0", rotate: haustier.richtung * 360 + "deg" },
                { translate: weg + "px 0", rotate: haustier.richtung * 360 + "deg", offset: 0.75 },
                { translate: "0 0", rotate: haustier.richtung * 360 + "deg" }
            ], { duration: 1800, easing: "ease-in-out" });
            setTimeout(() => {
                const k = haustierKopf();
                partikel(k.x, k.y + 20, ["#8fcf5c", "#6cc24a", "#ffffff"], 10, 40);
                zeigeEmote("✨");
            }, 900);
            break;
        }
        case "sitz":
            wechsleHaustierZustand("sitzen", 6000);
            zeigeEmote("👍");
            Klang.trick();
            break;
        case "schlafen":
            wechsleHaustierZustand("schlafen", 14000);
            zeigeEmote("💤");
            break;
        case "fuettern":
            wechsleHaustierZustand("sitzen", 3000);
            zeigeEmote(futterSymbol());
            Klang.fressen();
            setTimeout(() => {
                const k = haustierKopf();
                zeigeHerzen(k.x, k.y, 4);
                haustierLaut();
            }, 900);
            break;
        case "ball":
            wirfBall();
            break;
    }
}

// Ball werfen: er fliegt in hohem Bogen, huepft zweimal auf, das Haustier rennt hin
// und bringt ihn im Maul zurueck an die Stelle, von der es losgelaufen ist
function wirfBall() {
    if (haustier.ball) haustier.ball.remove();
    const hof = topBar.getBoundingClientRect();
    let ziel;
    do {
        ziel = 30 + Math.random() * 40;
    } while (Math.abs(ziel - haustier.x) < 12);
    const start = haustierKopf();
    const ball = pixelIcon("🎾", 32, "hof-ball");
    const zielX = hof.left + (ziel / 100) * hof.width;
    const bodenY = hof.bottom - HOF_PIXEL * 9;
    const richtung = Math.sign(zielX - start.x);
    ball.style.left = start.x + "px";
    ball.style.top = start.y + "px";
    fxLayer.appendChild(ball);
    ball.animate([
        { left: start.x + "px", top: start.y + "px", rotate: "0deg" },
        { left: (start.x + zielX) / 2 + "px", top: Math.min(start.y, bodenY) - 110 + "px", rotate: richtung * 180 + "deg", offset: 0.35 },
        { left: zielX + "px", top: bodenY + "px", rotate: richtung * 360 + "deg", offset: 0.6 },
        { left: zielX + richtung * 20 + "px", top: bodenY - 30 + "px", rotate: richtung * 450 + "deg", offset: 0.75 },
        { left: zielX + richtung * 36 + "px", top: bodenY + "px", rotate: richtung * 540 + "deg", offset: 0.87 },
        { left: zielX + richtung * 44 + "px", top: bodenY - 8 + "px", rotate: richtung * 580 + "deg", offset: 0.94 },
        { left: zielX + richtung * 48 + "px", top: bodenY + "px", rotate: richtung * 600 + "deg" }
    ], { duration: 1300, easing: "linear", fill: "forwards" });
    Klang.ball();
    setTimeout(() => Klang.ball(), 800);
    haustier.ball = ball;
    haustier.ballStart = haustier.x;
    haustier.ballZurueck = false;
    const endeProzent = ((zielX + richtung * 48 - hof.left) / hof.width) * 100;
    setTimeout(() => {
        if (haustier.ball === ball) {
            zeigeEmote("❗");
            laufeZu(klemme(endeProzent, 5, 95));
        }
    }, 450);
}

// Ball erreicht: aufheben, zurueckbringen, vor die Fuesse legen
function holeBall() {
    const ball = haustier.ball;
    if (!ball) return;
    if (!haustier.ballZurueck) {
        haustier.ballZurueck = true;
        ball.getAnimations().forEach(a => a.cancel());
        ball.classList.add("im-maul");
        haustierLaut();
        laufeZu(haustier.ballStart);
        return;
    }
    haustier.ball = null;
    ball.classList.remove("im-maul");
    const kopf = haustierKopf();
    ball.animate([{ top: kopf.y + "px" }, { top: kopf.y + 26 + "px" }], { duration: 250, fill: "forwards" });
    setTimeout(() => ball.remove(), 1200);
    wechsleHaustierZustand("sitzen", 3000);
    zeigeEmote("⭐");
    zeigeHerzen(kopf.x, kopf.y, 2);
    haustierLaut();
}

// Waehrend das Tier den Ball traegt, sitzt er an seinem Maul
function bewegeBallImMaul() {
    const ball = haustier.ball;
    if (!ball || !ball.classList.contains("im-maul")) return;
    const kopf = haustierKopf();
    ball.style.left = kopf.x + haustier.richtung * 8 + "px";
    ball.style.top = kopf.y + 14 + "px";
}

