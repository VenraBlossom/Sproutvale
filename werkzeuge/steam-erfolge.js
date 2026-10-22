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
const SPRACHEN = ["de", "en", "es", "fr", "it", "pt", "nl", "pl", "tr", "ru", "uk", "ja", "zh", "ko"];
const STEAM_NAMEN = { de: "german", en: "english", es: "spanish", fr: "french", it: "italian", pt: "brazilian", nl: "dutch", pl: "polish",
    tr: "turkish", ru: "russian", uk: "ukrainian", ja: "japanese", zh: "schinese", ko: "koreana" };

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

async function erfolgeIn(sprache) {
    const { w, fehler } = await starteSpiel(sprache);
    const liste = w.eval(`(() => {
        const zeilen = [];
        ERFOLG_KETTEN.filter(k => !k.nurSandbox).forEach(kette => kette.ziele.forEach((ziel, i) => {
            zeilen.push({ api: steamErfolgId(kette, i), name: kette.text(ziel), text: kette.text(ziel), icon: kette.icon, stufe: i, stufen: kette.ziele.length });
        }));
        TROPHAEEN.forEach(tr => zeilen.push({ api: "POKAL_" + tr.id.toUpperCase(), name: tr.name, text: tf("Du hast den {0} gewonnen!", tr.name), pokal: tr.id }));
        return JSON.parse(JSON.stringify(zeilen));
    })()`);
    w.close();
    if (fehler.length) console.log(sprache + ": " + fehler.length + " Meldungen, z.B. " + fehler[0]);
    return liste;
}

(async () => {
    const proSprache = {};
    for (const sprache of SPRACHEN) {
        proSprache[sprache] = await erfolgeIn(sprache);
        console.log(sprache + ": " + proSprache[sprache].length);
    }
    const feld = text => '"' + String(text).replace(/"/g, '""') + '"';
    const kopf = ["api"].concat(...SPRACHEN.map(s => ["name_" + STEAM_NAMEN[s], "beschreibung_" + STEAM_NAMEN[s]]));
    const zeilen = [kopf.join(",")];
    proSprache.de.forEach((eintrag, i) => {
        zeilen.push([feld(eintrag.api)].concat(...SPRACHEN.map(s => [feld(proSprache[s][i].name), feld(proSprache[s][i].text)])).join(","));
    });
    const ziel = path.join(__dirname, "steam-erfolge.csv");
    fs.writeFileSync(ziel, "﻿" + zeilen.join("\n") + "\n");
    fs.writeFileSync(path.join(__dirname, "steam-erfolge.json"), JSON.stringify(proSprache.de.map(e => ({ api: e.api, icon: e.icon, stufe: e.stufe, stufen: e.stufen, pokal: e.pokal })), null, 1));
    console.log(proSprache.de.length + " Erfolge geschrieben: " + ziel);
    process.exit(0);
})();
