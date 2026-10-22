"use strict";

const fs = require("fs");
const path = require("path");

let jsdom;
try {
    jsdom = require("jsdom");
} catch (fehler) {
    console.log("jsdom fehlt. Einmal im Ordner werkzeuge ausfuehren: npm install");
    process.exit(1);
}
const { JSDOM, ResourceLoader, VirtualConsole } = jsdom;

const ORDNER = path.join(__dirname, "..");
const wert = (name, standard) => (process.argv.find(a => a.startsWith("--" + name + "=")) || "").split("=")[1] || standard;
const ALLE_SPRACHEN = ["de", "en", "es", "fr", "it", "pt", "nl", "pl", "tr", "ru", "uk", "ja", "zh", "ko"];
const SPRACHEN = process.argv.includes("--alle-sprachen") ? ALLE_SPRACHEN : wert("sprache", "de").split(",");
const TAGE = Number(wert("tage", 16));
const NUR = wert("nur", "");

class Lader extends ResourceLoader {
    constructor(fehler) {
        super();
        this.fehler = fehler;
    }
    fetch(url) {
        const adresse = new URL(url);
        if (adresse.hostname !== "localhost") return Promise.resolve(Buffer.from(""));
        const datei = path.join(ORDNER, decodeURIComponent(adresse.pathname));
        try {
            return Promise.resolve(fs.readFileSync(datei));
        } catch (fehler) {
            this.fehler.push("Datei fehlt: " + adresse.pathname);
            return Promise.resolve(Buffer.from(""));
        }
    }
}

function leererKontext() {
    const werte = {};
    return new Proxy(function () {}, {
        get(_, name) {
            if (name === "measureText") return () => ({ width: 10 });
            if (name === "getImageData" || name === "createImageData") {
                return (x, y, b, h) => ({ data: new Uint8ClampedArray(Math.max(4, (b || 1) * (h || 1) * 4)), width: b || 1, height: h || 1 });
            }
            if (/^create(Linear|Radial)Gradient$|^createPattern$/.test(name)) return () => ({ addColorStop() {} });
            if (name in werte) return werte[name];
            return () => {};
        },
        set(_, name, inhalt) {
            werte[name] = inhalt;
            return true;
        }
    });
}

function starteSpiel(sprache) {
    const fehler = [];
    const konsole = new VirtualConsole();
    const kurz = text => String(text).split("\n").slice(0, 4).join(" | ").slice(0, 400);
    konsole.on("jsdomError", e => fehler.push(kurz(e.detail && e.detail.stack || e.stack || e.message)));
    konsole.on("error", (...teile) => fehler.push("console.error: " + kurz(teile.join(" "))));
    let html = fs.readFileSync(path.join(ORDNER, "index.html"), "utf8");
    if (!["de", "en"].includes(sprache)) html = html.replace("js/sprache-laden.js", "js/sprache-" + sprache + ".js");
    const dom = new JSDOM(html, {
        url: "http://localhost/index.html", runScripts: "dangerously", resources: new Lader(fehler), pretendToBeVisual: true, virtualConsole: konsole,
        beforeParse(w) {
            w.localStorage.setItem("sproutvale_einstellungen", JSON.stringify({ sprache, musik: 0.4, sfx: 0.6 }));
            w.HTMLCanvasElement.prototype.getContext = () => leererKontext();
            w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
            w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {} });
            w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
            w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
            w.MessageChannel = MessageChannel;
            w.HTMLElement.prototype.scrollIntoView = () => {};
            w.Element.prototype.getAnimations = () => [];
            w.Element.prototype.animate = () => ({ finished: Promise.resolve(), cancel() {}, finish() {}, play() {}, pause() {}, currentTime: 0 });
            w.document.getAnimations = () => [];
            w.Element.prototype.setPointerCapture = () => {};
            w.Element.prototype.releasePointerCapture = () => {};
            w.addEventListener("error", e => fehler.push("Fehler: " + kurz(e.error && e.error.stack || e.message)));
            w.addEventListener("unhandledrejection", e => fehler.push("Promise: " + kurz(e.reason && e.reason.stack || e.reason)));
        }
    });
    return new Promise(fertig => setTimeout(() => fertig({ w: dom.window, fehler }), 2500));
}

const BOT = fs.readFileSync(path.join(__dirname, "balancing-bot.js"), "utf8");

const TESTS = {
    start: `return { sprache: SPRACHE, probe: t("Einstellungen") };`,

    fenster: `
        meta.tutorial = "fertig";
        starteNeuenRun();
        const offen = [];
        const liste = { oeffneEinstellungen, oeffneHaus, oeffneSkilltree, oeffnePrestigeShop, oeffneKodex, oeffneStatistik, oeffneProfil,
            oeffnePokalVitrine, oeffneScheune, oeffneGemShop, renderGluecksspiele, renderShop, renderErfolge, renderTarot, renderKuscheltiere,
            renderSternenfall, renderMondphasen, renderHerausforderungen, zeigeTagesKarte, zeigeNeuigkeiten, zeigeHauptmenue, zeigeEndlosSlots };
        for (const [name, f] of Object.entries(liste)) {
            f();
            offen.push(name);
            await warte(120);
            document.querySelectorAll(".popup-huelle").forEach(h => h.remove());
        }
        document.querySelectorAll("#einstellungen-reiter button").forEach(k => k.click());
        return { fenster: offen.length };`,

    spielen: `
        meta.tutorial = "fertig";
        eval(window.__BOT);
        const protokoll = await sproutvaleBot({ tage: window.__TAGE, klicksProSek: 6, tickMs: 250, meldung: false, abgeben: true });
        return { tage: protokoll.length, tag: run.tag, rechnungen: run.bezahlteRechnungen, phase: run.phase };`,

    glueck: `
        meta.tutorial = "fertig";
        starteNeuenRun();
        GLUECK_SPIELE.forEach(s => { run.level[s.id] = 1; });
        run.level.vipkarte = 1;
        let klicks = 0;
        for (const spiel of GLUECK_SPIELE) {
            run.gold = 1e6;
            for (let runde = 0; runde < 6; runde++) {
                shopContent.innerHTML = "";
                renderGluecksspiele(spiel.id);
                const knoepfe = [...shopContent.querySelectorAll("button:not([disabled])")];
                const knopf = knoepfe[runde % Math.max(1, knoepfe.length)];
                if (knopf) { knopf.click(); klicks++; }
                for (let i = 0; i < 40 && glueckAnimation; i++) await warte(100);
                [...shopContent.querySelectorAll(".rubbel-feld, button:not([disabled])")].slice(0, 12).forEach(k => {
                    k.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                    k.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                });
                for (let i = 0; i < 60 && glueckAnimation; i++) await warte(100);
            }
        }
        return { klicks, haengt: glueckAnimation };`,

    fortschritt: `
        meta.tutorial = "fertig";
        let figuren = 0;
        for (const [art, liste] of Object.entries(FIGUR_TEILE)) for (const teil of liste) for (const pose of Object.keys(FIGUR_BILDER))
            for (const blick of ["seite", "vorne", "hinten"]) for (let n = 0; n < (FIGUR_BILDER[pose] || 1); n++) {
                figurSchichten({ ...FIGUR_STANDARD, [art]: teil.id }, pose, n, n === 0, blick, n % 4);
                figuren++;
            }
        starteNeuenRun();
        meta.mondblueten = 1e9;
        let upgrades = 0;
        for (let i = 0; i < 400; i++) {
            const angebot = META_UPGRADES.filter(d => (!d.sichtbar || d.sichtbar(meta)) && metaLevel(d.id) < Math.min(d.max ?? 20, 20));
            if (!angebot.length) break;
            kaufeMetaUpgrade(angebot[i % angebot.length]);
            upgrades++;
        }
        TAROT.forEach(karte => kaufeTarot(karte));
        meta.gutscheine = 30;
        for (let i = 0; i < 30; i++) zieheKuschel(true);
        await warte(400);
        oeffnePrestigeShop();
        renderTarot();
        renderKuscheltiere();
        loeseSternenfallAus();
        await warte(400);
        document.querySelectorAll(".popup-huelle").forEach(h => h.remove());
        meta.sandbox = true;
        spieleModus(true);
        eval(window.__BOT);
        const protokoll = await sproutvaleBot({ tage: 3, klicksProSek: 6, tickMs: 250, meldung: false, abgeben: true });
        zeigeTagesKarte();
        spieleModus(false);
        return { figuren, upgrades, endlosTage: protokoll.length };`,

    tutorial: `
        starteTutorialNeu();
        starteNeuenRun();
        eval(window.__BOT);
        await sproutvaleBot({ tage: 1, klicksProSek: 6, tickMs: 250, meldung: false, abgeben: true });
        $("shop-button").click();
        await warte(500);
        for (let i = 0; i < 4; i++) {
            await warte(400);
            const knopf = document.querySelector(".tutorial-knoepfe .knopf-gruen");
            if (knopf) knopf.click();
        }
        return { tutorial: meta.tutorial };`
};

async function fuehreAus(sprache, name) {
    const { w, fehler } = await starteSpiel(sprache);
    w.__BOT = BOT;
    w.__TAGE = TAGE;
    let ergebnis = null;
    try {
        const intro = w.document.getElementById("intro");
        if (intro) intro.remove();
        ergebnis = await w.eval("(async () => { const warte = ms => new Promise(ok => setTimeout(ok, ms));\n" + TESTS[name] + "\n})()");
    } catch (e) {
        fehler.push("Test: " + String(e && e.stack || e).split("\n").slice(0, 4).join(" | "));
    }
    w.close();
    return { ergebnis, fehler };
}

(async () => {
    let gesamt = 0;
    const namen = NUR ? NUR.split(",") : Object.keys(TESTS);
    for (const sprache of SPRACHEN) {
        for (const name of namen) {
            const start = Date.now();
            const { ergebnis, fehler } = await fuehreAus(sprache, name);
            const gruppen = {};
            fehler.forEach(f => { gruppen[f] = (gruppen[f] || 0) + 1; });
            console.log(sprache + " " + name.padEnd(12) + (fehler.length ? "FEHLER " + fehler.length : "ok") + "  " +
                JSON.stringify(ergebnis) + "  (" + Math.round((Date.now() - start) / 1000) + " s)");
            Object.entries(gruppen).forEach(([f, n]) => console.log("    " + n + "x " + f));
            gesamt += fehler.length;
        }
    }
    console.log(gesamt ? gesamt + " Fehler" : "Alles ohne Fehler.");
    process.exit(gesamt ? 1 : 0);
})();
