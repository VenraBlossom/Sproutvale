"use strict";

// ============================================================
// SPROUTVALE: Ereignisse waehrend eines Runs
// - Wetter (selten: an den meisten Tagen gibt es keins)
// - Kraehen (meistens 0 oder 1 pro Tag, hoechstens 3), Vogelscheuche verscheucht die erste
// - Goldregen (sehr selten)
// - Boss-Rechnungen (jede 3. Rechnung hat eine Zusatzregel)
// - Wanderhaendler mit Werkzeugen (Joker fuer den laufenden Run) und Waren
// - Jahreszeiten: Uhr in der Kopfleiste, Banner, Stimmung im Hof (die Effekte stehen in script.js)
// Gehoert zu script.js (die Wirkungen stehen dort in den Formeln, z.B. wetterIst(), bossIst(), hatWerkzeug()).
// ============================================================

const wetterEbene = $("wetter-ebene");
const wetterSchleier = $("wetter-schleier");
const wetterAnzeige = $("wetter-anzeige");
const werkzeugLeiste = $("werkzeug-leiste");

// Zeit seit Tagesbeginn und geplante Ereignisse des Tages
const tagesPlan = { ms: 0, kraehen: [], goldregen: null, blitzMs: 0, kraehenHeute: 0 };

// ---------- WETTER ----------

function wetterChance() {
    if (run && hatWerkzeug("kristallkugel")) return 1;
    return Math.min(1, WETTER_KONFIG.chance * (1 + 0.3 * level("wetterfrosch")) * (1 + segen("wetterglueck")) *
        (1 + werkzeugWert("wetterfahne")));
}

function wuerfleWetter() {
    run.wetter = null;
    const nurGut = hatWerkzeug("kristallkugel");
    // Boss-Regel "Unwetter": jeden Tag schlechtes Wetter (ausser mit der Kristallkugel)
    const saison = jahreszeit().wetter || {};
    const saisonGewicht = w => (saison[w.id] === undefined ? 1 : saison[w.id]);
    if (bossIst("unwetter") && !nurGut) {
        const wetter = zufall(WETTER.filter(w => !w.gut && saisonGewicht(w) > 0));
        run.wetter = wetter.id;
        meta.kodex.wetter[wetter.id] = (meta.kodex.wetter[wetter.id] || 0) + 1;
        return;
    }
    if (run.tag < WETTER_KONFIG.abTag || Math.random() >= wetterChance()) return;
    const gutBonus = 1 + 0.25 * metaLevel("wettergott") + 0.2 * level("wetterfrosch");
    const schlechtFaktor = segen("wetterglueck") > 0 ? 0.5 : 1;
    // Boss-Regel "Duerre": kein Regen und kein Gewitter
    const trocken = w => bossIst("duerre") && (w.id === "regen" || w.id === "gewitter");
    const moeglich = WETTER.filter(w => (w.gut || !nurGut) && saisonGewicht(w) > 0 && !trocken(w));
    const wetter = gewichteterZufall(moeglich, w => w.gewicht * (w.gut ? gutBonus : schlechtFaktor) * saisonGewicht(w));
    run.wetter = wetter.id;
    meta.kodex.wetter[wetter.id] = (meta.kodex.wetter[wetter.id] || 0) + 1;
}

function zeigeWetter(mitBanner) {
    const wetter = run.phase === "tag" && run.wetter ? WETTER_NACH_ID[run.wetter] : null;
    WETTER.forEach(w => document.body.classList.toggle("wetter-" + w.id, Boolean(wetter) && wetter.id === w.id));
    wetterSchleier.innerHTML = "";
    wetterEbene.innerHTML = "";
    wetterAnzeige.classList.toggle("versteckt", !wetter);
    Klang.regen(Boolean(wetter) && (wetter.id === "regen" || wetter.id === "gewitter"));
    if (!wetter) return;

    wetterAnzeige.innerHTML = "";
    wetterAnzeige.append(pixelIcon(wetter.symbol, 32));
    setzeTipp(wetterAnzeige, "## " + wetter.symbol + " " + wetter.name + "\n= " + (wetter.gut ? t("Gutes Wetter") : t("Schlechtes Wetter")) + "\n" +
        wetterText(wetter) + "\n- " + t("Gilt für den ganzen Tag."));

    if (wetter.id === "regen" || wetter.id === "gewitter") {
        const tropfen = wetter.id === "gewitter" ? 90 : 60;
        for (let i = 0; i < tropfen; i++) {
            const t = el("span", "regentropfen");
            t.style.left = Math.random() * 100 + "%";
            t.style.animationDelay = -Math.random() * 1.2 + "s";
            t.style.animationDuration = 0.6 + Math.random() * 0.5 + "s";
            wetterSchleier.appendChild(t);
        }
    }
    if (wetter.id === "regenbogen") wetterEbene.appendChild(el("div", "regenbogen-bogen"));
    if (wetter.id === "sternennacht") {
        for (let i = 0; i < 24; i++) {
            const funke = el("span", "sternen-funke");
            funke.style.left = Math.random() * 100 + "%";
            funke.style.top = Math.random() * 60 + "%";
            funke.style.animationDelay = -Math.random() * 3 + "s";
            wetterEbene.appendChild(funke);
        }
    }
    if (mitBanner) zeigeBanner(wetter.symbol, wetter.name, wetterText(wetter), wetter.gut ? "#2f7fcf" : "#b86a1a", 4200);
}

// Gewitter: ab und zu schlaegt ein Blitz in eine wachsende Pflanze ein und macht sie sofort reif
function gewitterTick(dtMs) {
    tagesPlan.blitzMs -= dtMs;
    if (tagesPlan.blitzMs > 0) return;
    tagesPlan.blitzMs = 8000 + Math.random() * 6000;
    Klang.donner();
    bildschirmBlitz("#e8f0ff", 0.55, 260);
    const wachsend = run.felder.filter(f => !f.leer && !f.fertig && !f.kraehe);
    if (wachsend.length === 0) return;
    const feld = zufall(wachsend);
    while (!feld.fertig) wachseEineStufe(feld);
    const { x, y } = feldMitte(feld);
    Klang.blitzEinschlag();
    partikel(x, y, ["#fff6a0", "#ffffff", "#9fd8ff"], 18, 80);
    zeigeSchwebeText(x, y - 30, t("⚡ Blitz!"), "#2f7fcf", false);
}

// ---------- KRAEHEN ----------

function kraehenZahl() {
    if (wetterIst("wind")) return 0; // Windiger Tag: keine Kraehen
    if (bossIst("kraehenplage")) return 2 + Math.floor(Math.random() * 3);
    const chancen = KRAEHEN_KONFIG.anzahlChancen;
    const wurf = () => gewichteterZufall(chancen.map((_, i) => i), i => chancen[i]);
    // Mondphase Vollmond: es kommen mehr Kraehen (der hoehere von zwei Wuerfen)
    return run.mondphase >= 4 ? Math.max(wurf(), wurf()) : wurf();
}

function stehlZeitMs() {
    return (KRAEHEN_KONFIG.stehlZeitSek + metaLevel("kraehenschreck") + kuschel("koala")) * 1000;
}

function tagesDauerMs() {
    if (run.sandbox) return SANDBOX_TAG_MS;
    return (run.tagesMaxEnergie / KONFIG.energieProSek) * 1000;
}

function planeKraehen() {
    const dauer = tagesDauerMs();
    tagesPlan.kraehen = Array.from({ length: kraehenZahl() }, () => dauer * (0.15 + Math.random() * 0.6)).sort((a, b) => a - b);
    tagesPlan.kraehenHeute = 0;
}

function kraeheKommt() {
    const ziele = run.felder.filter(f => !f.leer && !f.kraehe && !f.reserviert);
    if (ziele.length === 0) {
        tagesPlan.kraehen.push(tagesPlan.ms + 3000); // spaeter nochmal versuchen
        return;
    }
    // Kraehen moegen fertige Pflanzen am liebsten
    const fertige = ziele.filter(f => f.fertig);
    const feld = zufall(fertige.length > 0 && Math.random() < 0.7 ? fertige : ziele);
    const ziel = feldMitte(feld);
    const vonLinks = Math.random() < 0.5;
    const startX = vonLinks ? -60 : window.innerWidth + 60;
    const startY = topBar.getBoundingClientRect().bottom * 0.6;

    const kraehe = document.createElement("img");
    kraehe.classList.add("kraehe");
    kraehe.alt = "";
    kraehe.draggable = false;
    setzeSpriteBild(kraehe, "kraehe_flug1", 4);
    kraehe.style.transform = vonLinks ? "" : "scaleX(-1)";
    fxLayer.appendChild(kraehe);

    const eintrag = { el: kraehe, feld, restMs: stehlZeitMs(), gelandet: false, weg: false, x: startX, y: startY };
    feld.kraehe = eintrag;
    tagesPlan.kraehenHeute += 1;
    // Vogelscheuche: die erste Kraehe des Tages wird mitten im Anflug verjagt und macht in der Luft kehrt
    const scheuche = level("vogelscheuche") > 0 && tagesPlan.kraehenHeute === 1;
    Klang.kraehe();

    const landeX = ziel.x;
    const landeY = ziel.rect.top + ziel.rect.height * 0.25;
    const startZeit = performance.now();
    const dauer = 1400;
    function flieg() {
        if (eintrag.weg) return;
        const anteil = Math.min(1, (performance.now() - startZeit) / dauer);
        eintrag.x = startX + (landeX - startX) * anteil;
        eintrag.y = startY + (landeY - startY) * anteil - Math.sin(anteil * Math.PI) * 40;
        kraehe.style.left = eintrag.x + "px";
        kraehe.style.top = eintrag.y + "px";
        setzeSpriteBild(kraehe, Math.floor(anteil * 10) % 2 ? "kraehe_flug2" : "kraehe_flug1", 4);
        if (scheuche && anteil >= 0.55) {
            vogelscheucheBuh(eintrag, startX);
            return;
        }
        if (anteil < 1) {
            setTimeout(flieg, 16);
            return;
        }
        eintrag.gelandet = true;
        setzeSpriteBild(kraehe, "kraehe", 4);
        kraehe.classList.add("gelandet");
        setzeTipp(kraehe, t("Krähe! Klick sie weg, bevor sie die Pflanze stiehlt."));
    }
    kraehe.addEventListener("pointerdown", event => {
        if (event.button !== 0 || spielPausiert()) return;
        event.stopPropagation();
        verscheucheKraehe(eintrag);
    });
    flieg();
}

function verscheucheKraehe(eintrag) {
    if (eintrag.weg) return;
    eintrag.feld.kraehe = null;
    run.statistik.kraehen += 1;
    run.gesamt.kraehen += 1;
    meta.lebenszeit.kraehen += 1;
    Klang.fluegelschlag();
    partikel(eintrag.x, eintrag.y, ["#1c1b24", "#3a3a4a", "#ffffff"], 10, 50);
    spawnLootKugel(eintrag.x, eintrag.y, wuerfleSternWert((KRAEHEN_KONFIG.belohnungSternensamen + 5 * kuschel("biber")) * (segen("kraehenkoenig") > 0 ? 5 : 1)), null, "stern");
    if (hatWerkzeug("feder")) {
        const wert = aufrunden(verkaufswert(bestePflanze()) * werkzeugWert("feder") * goldMulti());
        spawnLootKugel(eintrag.x, eintrag.y, wert, 0);
    }
    fliegeKraeheWeg(eintrag);
}

// Die Vogelscheuche ruft "Buh!", wackelt mit den Armen, die Kraehe erschrickt in der Luft und fliegt zurueck
function vogelscheucheBuh(eintrag, herkunftX) {
    const scheuche = hofEbene.querySelector('.deko[data-deko="vogelscheuche"]');
    if (scheuche) {
        scheuche.classList.remove("scheuche-buh");
        void scheuche.offsetWidth;
        scheuche.classList.add("scheuche-buh");
        const r = scheuche.getBoundingClientRect();
        zeigeSchwebeText(r.left + r.width / 2, r.top - 10, t("🧑‍🌾 Buh!"), "#8a5a2b", true);
    }
    zeigeSchwebeText(eintrag.x, eintrag.y - 34, "❗", "#e8434a", true);
    partikel(eintrag.x, eintrag.y, ["#1c1b24", "#3a3a4a", "#ffffff"], 14, 60);
    eintrag.fluchtX = herkunftX < window.innerWidth / 2 ? -80 : window.innerWidth + 80;
    verscheucheKraehe(eintrag);
}

function fliegeKraeheWeg(eintrag) {
    eintrag.weg = true;
    const kraehe = eintrag.el;
    kraehe.classList.remove("gelandet");
    setzeTipp(kraehe, null);
    const startX = eintrag.x;
    const startY = eintrag.y;
    const zielX = eintrag.fluchtX !== undefined ? eintrag.fluchtX : startX < window.innerWidth / 2 ? -80 : window.innerWidth + 80;
    kraehe.style.transform = zielX < startX ? "scaleX(-1)" : "";
    const startZeit = performance.now();
    function weg() {
        const t = Math.min(1, (performance.now() - startZeit) / 900);
        kraehe.style.left = startX + (zielX - startX) * t + "px";
        kraehe.style.top = startY - t * 220 + "px";
        setzeSpriteBild(kraehe, Math.floor(t * 12) % 2 ? "kraehe_flug2" : "kraehe_flug1", 4);
        if (t < 1) setTimeout(weg, 16);
        else kraehe.remove();
    }
    weg();
}

function kraehenTick(dtMs) {
    while (tagesPlan.kraehen.length > 0 && tagesPlan.ms >= tagesPlan.kraehen[0]) {
        tagesPlan.kraehen.shift();
        kraeheKommt();
    }
    run.felder.forEach(feld => {
        const k = feld.kraehe;
        if (!k || !k.gelandet || k.weg) return;
        k.restMs -= dtMs;
        k.el.classList.toggle("eilig", k.restMs < 1500);
        if (k.restMs > 0) return;
        // Zu spaet: die Kraehe stiehlt die Pflanze
        feld.kraehe = null;
        run.statistik.gestohlen += 1;
        const { x, y } = feldMitte(feld);
        zeigeSchwebeText(x, y - 20, t("🐦 geklaut!"), "#6b3f1d", false);
        Klang.kraehe();
        leereFeld(feld);
        fliegeKraeheWeg(k);
    });
}

function entferneAlleKraehen() {
    run.felder.forEach(feld => {
        if (feld.kraehe) fliegeKraeheWeg(feld.kraehe);
        feld.kraehe = null;
    });
    tagesPlan.kraehen = [];
}

// ---------- GOLDREGEN ----------

function goldregenTick() {
    if (tagesPlan.goldregen === null || tagesPlan.ms < tagesPlan.goldregen) return;
    tagesPlan.goldregen = null;
    run.gesamt.goldregen += 1;
    meta.lebenszeit.goldregen += 1;
    const k = GOLDREGEN_KONFIG;
    zeigeBanner("🌧️", t("Goldregen!"), t("Schnell, sammel die Saat ein!"), "#d49a00", 3000);
    Klang.goldregen();
    const acker = fieldGrid.getBoundingClientRect();
    const oben = topBar.getBoundingClientRect().bottom;
    const runId = run.id;
    for (let i = 0; i < k.muenzen; i++) {
        setTimeout(() => {
            if (run.id !== runId || run.phase !== "tag") return;
            const x = acker.left + 40 + Math.random() * (acker.width - 80);
            const zielY = acker.top + 30 + Math.random() * (acker.height - 60);
            const fallend = document.createElement("img");
            fallend.classList.add("fallende-muenze");
            setzeSpriteBild(fallend, muenzeSprite(0), 3);
            fallend.style.left = x + "px";
            fxLayer.appendChild(fallend);
            const start = performance.now();
            function fall() {
                const t = Math.min(1, (performance.now() - start) / 600);
                fallend.style.top = oben + (zielY - oben) * t * t + "px";
                if (t < 1) {
                    setTimeout(fall, 16);
                    return;
                }
                fallend.remove();
                const wert = aufrunden(verkaufswert(bestePflanze()) * k.wertAnteil * goldMulti());
                spawnLootKugel(x, zielY, wert, 0);
                Klang.muenze(0);
            }
            fall();
        }, (i / k.muenzen) * k.dauerSek * 1000);
    }
}

// Erntefieber: ein paar Sekunden wachsen alle Pflanzen rasend schnell, der Rand leuchtet
function fieberTick(dtMs) {
    if (tagesPlan.fieber !== null && tagesPlan.fieber !== undefined && tagesPlan.ms >= tagesPlan.fieber) {
        tagesPlan.fieber = null;
        run.fieberMs = ERNTEFIEBER_KONFIG.dauerMs;
        meta.lebenszeit.fieber = (meta.lebenszeit.fieber || 0) + 1;
        zeigeBanner("🔥", t("Erntefieber!"), t("Ein paar Sekunden wächst alles rasend schnell. Ernte, was du kannst!"), "#e8602a", 2600);
        Klang.goldregen();
        document.body.classList.add("erntefieber");
    }
    if (run.fieberMs > 0) {
        run.fieberMs -= dtMs;
        if (run.fieberMs <= 0) {
            run.fieberMs = 0;
            document.body.classList.remove("erntefieber");
        }
    }
}

// ---------- BOSS-RECHNUNGEN ----------

function waehleBossRegel() {
    run.bossRegel = !run.sandbox && istBossRechnung(run.bezahlteRechnungen) ? zufall(BOSS_REGELN).id : null;
    if (run.bossRegel) {
        const regel = BOSS_NACH_ID[run.bossRegel];
        setTimeout(() => {
            zeigeBanner("🏦", t("Kredit-Auflage: ") + regel.name, regel.text + t(" Gilt, bis der Kredit abbezahlt ist."), "#b8232a", 5000);
            Klang.boss();
        }, 600);
    }
}

// ---------- WANDERHAENDLER UND WERKZEUGE ----------

// 1 Platz, die Tarotkarte "Der Gehaengte" gibt +1 und verbessert (ausgeruestet) noch einmal +1
function werkzeugPlaetze() {
    return KONFIG.werkzeugPlaetze + (hatTarot("gehaengte") ? 1 : 0) + (istVerstaerkt("gehaengte") ? 1 : 0);
}

function haendlerChance() {
    if (run && hatWerkzeug("kompass")) return 1;
    return Math.min(1, (1 + stil("haendler")) * HAENDLER_KONFIG.chance * (1 + 0.5 * level("haendlerfreund")) + 0.1 * metaLevel("haendlerglueck") +
        0.05 * kuschel("papagei"));
}

// Preise richten sich nach der naechsten Rechnung (in der Sandbox nach dem naechsten Meilenstein)
function haendlerBasis() {
    const nummer = run.sandbox ? run.meilensteine : run.bezahlteRechnungen;
    return rechnungsBetrag(nummer) * (1 - 0.25 * stil("haendler")) * (1 - 0.15 * kuschel("greif")) * (1 - Math.min(0.5, werkzeugWert("kompass")));
}

function werkzeugPreis(werkzeug) {
    return Math.max(1, aufrunden(haendlerBasis() * werkzeug.preis));
}

function haendlerKommt() {
    const anzahl = HAENDLER_KONFIG.angebote;
    const werkzeuge = mische(WERKZEUGE.filter(w => !hatWerkzeug(w.id) && !(run.sandbox && SANDBOX_AUS_WERKZEUGE.includes(w.id))));
    const waren = mische(HAENDLER_WAREN.filter(w => !(run.sandbox && SANDBOX_AUS_WAREN.includes(w.id))));
    const angebote = [];
    for (let i = 0; i < anzahl; i++) {
        const ware = Math.random() < 0.3 && waren.length > 0;
        const eintrag = ware ? waren.pop() : werkzeuge.pop();
        if (!eintrag) continue;
        angebote.push({ art: ware ? "ware" : "werkzeug", id: eintrag.id, preis: Math.max(1, aufrunden(haendlerBasis() * eintrag.preis)),
            stufe: werkzeugStufeJetzt(), gekauft: false });
    }
    run.haendler = { angebote };
    Klang.haendler();
    // Sandbox: das Haendler-Symbol oben blinkt 10 Sekunden lang
    if (run.sandbox) {
        haendlerKnopf.classList.remove("blinkt");
        void haendlerKnopf.offsetWidth;
        haendlerKnopf.classList.add("blinkt");
        setTimeout(() => haendlerKnopf.classList.remove("blinkt"), 10000);
    }
    zeigeBanner("🧳", t("Ein Wanderhändler ist da!"), t("Er bleibt bis zum nächsten Tag"), "#b8862b", 3200);
}

function haendlerEintrag(angebot) {
    return angebot.art === "werkzeug" ? WERKZEUG_NACH_ID[angebot.id] : HAENDLER_WAREN.find(w => w.id === angebot.id);
}

function kaufeAngebot(angebot) {
    if (!darfEinkaufen() || angebot.gekauft || run.haendler.gekauft || run.gold < angebot.preis) return;
    if (angebot.art === "werkzeug" && run.werkzeuge.length >= werkzeugPlaetze()) {
        Klang.fehler();
        zeigeToast(t("🧰 Kein Platz mehr. Verkauf zuerst ein Werkzeug (Rechtsklick in der Werkzeug-Leiste)."));
        return;
    }
    run.gold -= angebot.preis;
    angebot.gekauft = true;
    run.haendler.gekauft = true; // pro Besuch nur ein Kauf, die anderen Angebote sind danach weg
    if (angebot.art === "werkzeug") {
        gibWerkzeug(angebot.id, angebot.preis, angebot.stufe);
    } else {
        wendeWareAn(angebot.id);
        Klang.kaufen();
    }
    aktualisiereAlles();
    oeffneHaendler();
}

function gibWerkzeug(id, preis, stufe = werkzeugStufeJetzt()) {
    run.werkzeuge.push(id);
    run.werkzeugPreise = run.werkzeugPreise || {};
    run.werkzeugPreise[id] = preis;
    run.werkzeugStufen = run.werkzeugStufen || {};
    run.werkzeugStufen[id] = stufe;
    meta.kodex.werkzeuge[id] = (meta.kodex.werkzeuge[id] || 0) + 1;
    meta.lebenszeit.maxWerkzeuge = Math.max(meta.lebenszeit.maxWerkzeuge || 0, run.werkzeuge.length);
    Klang.werkzeug();
    pruefeEvolutionen();
}

function wendeWareAn(id) {
    if (id === "sternenbeutel") {
        const menge = 20 + 2 * run.statistik.sternensamen;
        gibSternensamen(menge);
        zeigeToast("👝 +" + zahl(menge) + t(" Sternensamen"));
    } else if (id === "goldsamen") {
        run.naechsterTag.goldeneSamen += 1;
    } else if (id === "elixier") {
        run.naechsterTag.energie += 60;
    } else if (id === "duengersack") {
        run.naechsterTag.extraDuenger += 4;
    } else if (id === "sonnenflasche") {
        run.naechsterTag.goldBuffSek += 30;
    } else if (id === "saatregen") {
        run.naechsterTag.samenregen = true;
    } else if (id === "gluecksklee") {
        run.naechsterTag.mindestGruen = true;
    } else if (id === "gutschein") {
        meta.gutscheine += 1;
        speichereMeta();
        zeigeToast("🎟️ +1 Kuschel-Gutschein");
    }
}

function verkaufsWert(id) {
    const preis = (run.werkzeugPreise && run.werkzeugPreise[id]) || werkzeugPreis(WERKZEUG_NACH_ID[id]);
    return Math.max(1, Math.floor(preis * HAENDLER_KONFIG.verkaufsAnteil));
}

function verkaufeWerkzeug(id) {
    const index = run.werkzeuge.indexOf(id);
    if (index < 0 || !darfEinkaufen()) return;
    run.gold += verkaufsWert(id);
    run.werkzeuge.splice(index, 1);
    Klang.muenze(1);
    aktualisiereAlles();
}

function frageWerkzeugVerkauf(id) {
    if (!darfEinkaufen()) {
        zeigeToast(t("Werkzeuge verkaufst du zwischen den Tagen."));
        return;
    }
    const w = WERKZEUG_NACH_ID[id];
    zeigePopup({
        titel: w.symbol + " " + w.name + t(" verkaufen?"),
        inhalt: t("Stufe ") + werkzeugStufe(id) + ": " + werkzeugText(id),
        breite: 520,
        knoepfe: [
            { text: t("Behalten") },
            { text: t("Verkaufen · +") + zahl(verkaufsWert(id)) + t(" Gold"), klasse: "knopf-rot", aktion: () => verkaufeWerkzeug(id) }
        ]
    });
}

let haendlerSchliessen = null;

function oeffneHaendler() {
    if (!run.haendler) return;
    if (haendlerSchliessen) haendlerSchliessen();
    const inhalt = el("div", "haendler-inhalt");
    inhalt.appendChild(el("div", "haendler-gruss", null, [
        pixelIcon("🧳", 64),
        el("div", null, run.haendler.gekauft ? t("\"Gute Wahl! Den Rest packe ich wieder ein. Bis zum nächsten Mal!\"")
            : t("\"Grüß dich! Du darfst dir EINE meiner Waren aussuchen. Werkzeuge helfen dir bis zum Ende dieses Runs.\""))
    ]));
    const raster = el("div", "haendler-raster");
    run.haendler.angebote.forEach(angebot => {
        const eintrag = haendlerEintrag(angebot);
        const werkzeug = angebot.art === "werkzeug";
        const stufe = angebot.stufe || 1;
        const weg = run.haendler.gekauft && !angebot.gekauft;
        const karte = el("div", "haendler-karte" + (angebot.gekauft ? " gekauft" : "") + (weg ? " weg" : ""), null, [
            pixelIcon(eintrag.symbol, 64),
            el("div", "haendler-name", eintrag.name),
            el("div", "haendler-art", werkzeug ? t("🧰 Werkzeug · Stufe ") + stufe : t("📦 Ware")),
            el("div", "haendler-text", werkzeug ? werkzeugText(angebot.id, stufe) : eintrag.text)
        ]);
        const knopf = el("button", "knopf upgrade-buy-button", angebot.gekauft ? t("✔ Gekauft") : weg ? t("🔒 Weg") : zahl(angebot.preis) + t(" Gold"));
        knopf.disabled = angebot.gekauft || weg || !darfEinkaufen() || run.gold < angebot.preis;
        knopf.addEventListener("click", () => kaufeAngebot(angebot));
        karte.appendChild(knopf);
        raster.appendChild(karte);
    });
    inhalt.appendChild(raster);
    inhalt.appendChild(el("div", "panel-hinweis", t("Nur 1 Kauf pro Besuch. 🧰 Werkzeug-Plätze: ") + run.werkzeuge.length + " / " + werkzeugPlaetze() +
        t("  ·  Du hast ") + zahl(run.gold) + t(" Gold. Werkzeuge verkaufst du mit Rechtsklick in der Leiste (40% zurück). ") +
        t("Je später du ein Werkzeug kaufst, desto höher seine Stufe und desto stärker wirkt es.")));
    haendlerSchliessen = zeigePopup({
        titel: t("🧳 Wanderhändler"),
        inhalt,
        farbe: "#b8862b",
        breite: 1000,
        klasse: "haendler-popup",
        onSchliessen: () => { haendlerSchliessen = null; }
    });
}

// Werkzeuge: oben ein Knopf "🧰 1/2", ein Klick klappt die Plaetze auf
const werkzeugKnopf = $("werkzeug-knopf");
const werkzeugBereich = $("werkzeug-bereich");
werkzeugKnopf.prepend(pixelIcon("🧰", 28, "icon"));

werkzeugKnopf.addEventListener("click", () => {
    werkzeugLeiste.classList.toggle("versteckt");
    Klang.klick(12);
});
document.addEventListener("pointerdown", event => {
    if (!werkzeugBereich.contains(event.target) && !event.target.closest(".popup-huelle")) werkzeugLeiste.classList.add("versteckt");
});

function renderWerkzeugLeiste() {
    werkzeugBereich.classList.toggle("versteckt", run.phase === "runEnde");
    werkzeugKnopf.querySelector("span").textContent = run.werkzeuge.length + "/" + werkzeugPlaetze();
    const schluessel = run.werkzeuge.map(id => id + werkzeugStufe(id)).join(",") + "|" + werkzeugPlaetze();
    if (werkzeugLeiste.dataset.stand === schluessel) return;
    werkzeugLeiste.dataset.stand = schluessel;
    werkzeugLeiste.innerHTML = "";
    for (let i = 0; i < werkzeugPlaetze(); i++) {
        const id = run.werkzeuge[i];
        const platz = el("div", "werkzeug-platz" + (id ? "" : " leer"));
        if (id) {
            const w = WERKZEUG_NACH_ID[id];
            platz.appendChild(pixelIcon(w.symbol, 32));
            platz.appendChild(el("span", "werkzeug-stufe", String(werkzeugStufe(id))));
            setzeTipp(platz, "## " + w.symbol + " " + w.name + t(" · Stufe ") + werkzeugStufe(id) + "\n" + werkzeugText(id) +
                t("\nRechtsklick: verkaufen (+") + zahl(verkaufsWert(id)) + t(" Gold)"));
            platz.addEventListener("contextmenu", event => {
                event.preventDefault();
                frageWerkzeugVerkauf(id);
            });
        }
        if (!id) setzeTipp(platz, t("Freier Werkzeug-Platz. Werkzeuge kaufst du beim Wanderhändler.") +
            (werkzeugPlaetze() < 3 ? t("\nMehr Plätze gibt die Tarotkarte \"Der Gehängte\".") : ""));
        werkzeugLeiste.appendChild(platz);
    }
}

// ---------- HAKEN: alles an die Spielschleife anschliessen ----------

registriereHaken("runStart", () => {
    run.werkzeugPreise = {};
    run.werkzeugStufen = {};
    tagesPlan.kraehen = [];
    tagesPlan.goldregen = null;
    waehleBossRegel();
    // Sternenfall-Upgrade "Kometenschweif": Start mit zufaelligen Werkzeugen
    mische(WERKZEUGE).slice(0, Math.min(sfLevel("kometenschweif"), werkzeugPlaetze())).forEach(w => gibWerkzeug(w.id, werkzeugPreis(w)));
    zeigeWetter();
});

registriereHaken("tagVorbereiten", wuerfleWetter);

registriereHaken("tagStart", fortsetzen => {
    tagesPlan.ms = 0;
    tagesPlan.blitzMs = 5000;
    planeKraehen();
    tagesPlan.goldregen = Math.random() < GOLDREGEN_KONFIG.chance * (1 + 0.5 * level("goldschauer")) ? tagesDauerMs() * (0.2 + Math.random() * 0.5) : null;
    const f = ERNTEFIEBER_KONFIG;
    tagesPlan.fieber = run.tag >= f.abTag && Math.random() < f.chance ? tagesDauerMs() * (0.15 + Math.random() * 0.55) : null;
    run.fieberMs = 0;
    zeigeWetter(!fortsetzen && !imHauptmenue());
    if (haendlerSchliessen) haendlerSchliessen();
});

registriereHaken("tagTick", dtMs => {
    tagesPlan.ms += dtMs;
    kraehenTick(dtMs);
    goldregenTick();
    fieberTick(dtMs);
    if (wetterIst("gewitter")) gewitterTick(dtMs);
});

registriereHaken("tagEnde", () => {
    entferneAlleKraehen();
    tagesPlan.goldregen = null;
    tagesPlan.fieber = null;
    run.fieberMs = 0;
    document.body.classList.remove("erntefieber");
    run.wetter = null;
    zeigeWetter();
});

registriereHaken("rechnungBezahlt", (nummer, warBoss) => {
    if (warBoss && run.bossRegel) meta.kodex.boss[run.bossRegel] = (meta.kodex.boss[run.bossRegel] || 0) + 1;
    waehleBossRegel();
});

registriereHaken("pauseStart", () => {
    if (run.tag >= HAENDLER_KONFIG.abTag && Math.random() < haendlerChance()) haendlerKommt();
});

registriereHaken("runEnde", () => {
    entferneAlleKraehen();
    run.wetter = null;
    zeigeWetter();
    if (haendlerSchliessen) haendlerSchliessen();
});

registriereHaken("karteZusatz", teile => {
    if (run.bossRegel) {
        const regel = BOSS_NACH_ID[run.bossRegel];
        teile.push(`<p class="karte-boss">🏦 ${t("Kredit-Auflage bis zur Rückzahlung:")} <b>${regel.name}</b>. ${regel.text}</p>`);
    }
    if (run.haendler && run.karte.modus !== "runEnde") {
        teile.push(`<p class="karte-haendler-text">🧳 ${t("Ein Wanderhändler wartet auf dich.")}</p>`);
    }
});

registriereHaken("anzeige", renderWerkzeugLeiste);

// Sandbox: keine Tageskarte, darum sitzt der Haendler-Knopf oben in der Leiste
const haendlerKnopf = $("haendler-button");
registriereHaken("anzeige", () => {
    haendlerKnopf.classList.toggle("versteckt", !(run.sandbox && run.haendler && run.phase !== "runEnde"));
});
haendlerKnopf.addEventListener("click", oeffneHaendler);
karteHaendler.addEventListener("click", oeffneHaendler);

// ---------- JAHRESZEITEN: UHR, BANNER, STIMMUNG IM HOF ----------
// Die Uhr in der Kopfleiste ist eine Scheibe mit 4 Farben (Fruehling, Sommer, Herbst, Winter).
// Der Zeiger wandert ueber alle 20 Tage, auch waehrend eines Tages ein kleines Stueck weiter.

const jahreszeitUhr = $("jahreszeit-uhr");
const uhrZeiger = jahreszeitUhr.querySelector(".uhr-zeiger");

// Kurzer Effekt-Text einer Jahreszeit aus ihren Faktoren (mit Segen "Kind der Jahreszeiten" doppelt so stark)
function jahreszeitEffekte(z) {
    const prozent = (faktor, name) => (faktor > 1 ? "+" : "-") + Math.round(Math.abs(faktor - 1) * 100) + "% " + name;
    const teile = [];
    if (z.wachstum) teile.push(prozent(z.wachstum, t("Wachstum")));
    if (z.energie) teile.push(prozent(z.energie, t("Energie")));
    if (z.gold) teile.push(prozent(z.gold, t("Gold")));
    if (z.sterne) teile.push(prozent(z.sterne, t("Sternensamen aus Ernten")));
    return teile.join(", ");
}

function jahreszeitWetterText(z) {
    const oefter = [];
    const seltener = [];
    const nie = [];
    Object.entries(z.wetter || {}).forEach(([id, gewicht]) => {
        const name = WETTER_NACH_ID[id].symbol + " " + WETTER_NACH_ID[id].name;
        if (gewicht === 0) nie.push(name);
        else if (gewicht > 1) oefter.push(name);
        else seltener.push(name);
    });
    const teile = [];
    if (oefter.length) teile.push(t("öfter ") + oefter.join(", "));
    if (seltener.length) teile.push(t("seltener ") + seltener.join(", "));
    if (nie.length) teile.push(t("nie ") + nie.join(", "));
    return teile.length ? t("Wetter: ") + teile.join("; ") : "";
}

function jahreszeitTipp() {
    const index = jahreszeitIndex();
    const z = jahreszeit();
    const rest = jahreszeitRestTage();
    const zeilen = [
        "## " + z.symbol + " " + z.name + " · " + (rest === 1 ? t("letzter Tag") : tf("noch {0}", rest + t(" Tage"))),
        jahreszeitEffekte(z),
        jahreszeitWetterText(z)
    ];
    if (segen("saisonkind") > 0) zeilen.push(t("🍂 Kind der Jahreszeiten: alle Effekte doppelt so stark"));
    zeilen.push("", tf("## Das Jahr (jede Jahreszeit {0} Tage)", JAHRESZEITEN_KONFIG.tageProJahreszeit));
    JAHRESZEITEN.forEach((jz, i) => {
        const zeile = jz.symbol + " " + jz.name + ": " + jahreszeitEffekte(i === index ? z : jahreszeitFuer(i));
        zeilen.push(i === index ? "> " + zeile : zeile);
    });
    return zeilen.filter(zeile => zeile !== undefined).join("\n");
}

function renderJahreszeitUhr() {
    const z = jahreszeit();
    const tageImJahr = JAHRESZEITEN_KONFIG.tageProJahreszeit * JAHRESZEITEN.length;
    const position = ((run.tag - 1) % tageImJahr + tagesFortschritt()) / tageImJahr;
    uhrZeiger.style.setProperty("--winkel", position * 360 + "deg");
    jahreszeitUhr.querySelector("span").textContent = z.symbol;
    setzeTipp(jahreszeitUhr, jahreszeitTipp());
}

registriereHaken("anzeige", renderJahreszeitUhr);
registriereHaken("tagTick", () => {
    uhrZeiger.style.setProperty("--winkel", (((run.tag - 1) % (JAHRESZEITEN_KONFIG.tageProJahreszeit * JAHRESZEITEN.length)) +
        tagesFortschritt()) / (JAHRESZEITEN_KONFIG.tageProJahreszeit * JAHRESZEITEN.length) * 360 + "deg");
});

// Banner am ersten Tag einer Jahreszeit
registriereHaken("tagStart", () => {
    if ((run.tag - 1) % JAHRESZEITEN_KONFIG.tageProJahreszeit !== 0) return;
    const z = jahreszeit();
    meta.kodex.jahreszeiten = meta.kodex.jahreszeiten || {};
    meta.kodex.jahreszeiten[z.id] = (meta.kodex.jahreszeiten[z.id] || 0) + 1;
    // Laeuft der Tag nur im Hintergrund hinter dem Hauptmenue an, keine Meldung
    if (imHauptmenue()) return;
    zeigeBanner(z.symbol, z.name + t(" beginnt!"), z.text, z.farbe, 4000);
});

// Zeile auf der Tageskarte: welche Jahreszeit der naechste Tag hat
registriereHaken("karteZusatz", teile => {
    if (run.karte.modus === "runEnde") return;
    const z = jahreszeit();
    const neu = (run.tag - 1) % JAHRESZEITEN_KONFIG.tageProJahreszeit === 0 && run.tag > 1;
    const rest = jahreszeitRestTage();
    teile.push(`<p class="karte-jahreszeit" style="--jz-farbe:${z.farbe}">${z.symbol} ` +
        (neu ? `<b>${t("Ab morgen:")} ${z.name}!</b> ` : `<b>${z.name}</b> (${tf("noch {0}", rest === 1 ? t("1 Tag") : rest + t(" Tage"))}): `) + `${z.text}</p>`);
});

// ---------- JAHRESZEITEN-TEILCHEN ----------
// Nur ab und zu und nur wenige gleichzeitig: sie zeigen, welche Jahreszeit gerade ist, ohne den Bildschirm zu fuellen.
// Fruehling rosa Kirschblueten, Sommer Schmetterlinge, Herbst Blaetter, Winter Schneeflocken.
// Abschaltbar in den Einstellungen (Anzeige). Bei Wetter (Regen ...) Pause.
// Jedes Teilchen: aussen faellt es, innen wiegt es hin und her. Alles nur CSS-Animationen.

const jahreszeitEbene = $("jahreszeit-ebene");

// chance = wie oft pro Versuch (alle 1,2 Sekunden) etwas kommt, max = hoechstens so viele gleichzeitig
const JAHRESZEIT_TEILCHEN = {
    bluete: { farben: ["#ff94be", "#ffb3d1", "#ff7fb0"], bilder: ["🌸"], bildChance: 0.4, max: 5, chance: 0.45 },
    schmetterling: { max: 2, chance: 0.15 },
    blatt: { farben: ["#e8902a", "#c0602a", "#d9a82a", "#a8401a"], bilder: ["🍂", "🍁"], bildChance: 0.35, max: 5, chance: 0.45 },
    schnee: { farben: ["#ffffff", "#eef4fb"], bilder: [], bildChance: 0, max: 7, chance: 0.55 }
};

function jahreszeitTeilchenErlaubt() {
    return run && !document.hidden && einstellungen.jahreszeitTeilchen !== false && !ohneEffekte() &&
        hauptmenue.classList.contains("versteckt") && !(run.phase === "tag" && run.wetter);
}

function erzeugeJahreszeitTeilchen(art) {
    const k = JAHRESZEIT_TEILCHEN[art];
    const aussen = el("div", "jz-teilchen");
    const innen = el("div", "jz-wiegen");
    let form;
    if (k.bilder.length > 0 && Math.random() < k.bildChance) {
        form = pixelIcon(zufall(k.bilder), 24 + 8 * Math.floor(Math.random() * 3), "jz-bild");
    } else {
        form = el("div", "jz-form jz-" + art);
        form.style.background = zufall(k.farben);
        form.style.setProperty("--groesse", (0.7 + Math.random() * 0.8).toFixed(2));
    }
    innen.appendChild(form);
    aussen.appendChild(innen);
    aussen.style.left = Math.random() * 100 + "%";
    const dauer = art === "schnee" ? 10 + Math.random() * 8 : 8 + Math.random() * 6;
    aussen.style.animationDuration = dauer + "s";
    aussen.style.setProperty("--drift", (Math.random() - 0.3) * 260 + "px");
    innen.style.animationDuration = 1.8 + Math.random() * 2.2 + "s";
    innen.style.animationDelay = -Math.random() * 3 + "s";
    jahreszeitEbene.appendChild(aussen);
    setTimeout(() => aussen.remove(), dauer * 1000 + 200);
}

// Sommer: ab und zu flattert ein Schmetterling quer ueber Hof und Acker (in verschiedenen Farben)
function schickeSchmetterling() {
    const flieger = el("div", "jz-schmetterling" + (Math.random() < 0.5 ? " links" : ""));
    const fluegel = pixelIcon("🦋", 32, "jz-fluegel");
    fluegel.style.filter = "hue-rotate(" + zufall([0, 140, 200, 260, 300]) + "deg)";
    flieger.appendChild(fluegel);
    flieger.style.top = 10 + Math.random() * 70 + "%";
    flieger.style.animationDuration = 12 + Math.random() * 6 + "s";
    jahreszeitEbene.appendChild(flieger);
    setTimeout(() => flieger.remove(), 18500);
}

setInterval(() => {
    if (!jahreszeitTeilchenErlaubt()) return;
    const art = jahreszeit().partikel;
    const k = JAHRESZEIT_TEILCHEN[art];
    if (!k || Math.random() > k.chance) return;
    if (art === "schmetterling") {
        if (jahreszeitEbene.querySelectorAll(".jz-schmetterling").length < k.max) schickeSchmetterling();
        return;
    }
    if (jahreszeitEbene.querySelectorAll(".jz-teilchen").length < k.max) erzeugeJahreszeitTeilchen(art);
}, 1200);

// Ausgeschaltet oder bei Wetter: vorhandene Teilchen weg
registriereHaken("anzeige", () => {
    if (einstellungen.jahreszeitTeilchen === false) jahreszeitEbene.innerHTML = "";
});
registriereHaken("tagVorbereiten", () => {
    if (run.wetter) jahreszeitEbene.innerHTML = "";
});

// Regengeraeusch nur, solange man wirklich auf dem Hof ist (nicht im Hauptmenue)
setInterval(() => {
    if (!run) return;
    Klang.regen(run.phase === "tag" && (run.wetter === "regen" || run.wetter === "gewitter") && !imHauptmenue());
}, 500);
