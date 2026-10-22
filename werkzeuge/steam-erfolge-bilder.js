"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SPIEL = "file:///" + path.join(__dirname, "..", "index.html").split(path.sep).join("/");
const ZIEL = path.join(__dirname, "..", "steam-bilder", "erfolge");
const ERFOLGE = JSON.parse(fs.readFileSync(path.join(__dirname, "steam-erfolge.json"), "utf8"));

const ZEICHNEN = `(async (erfolge) => {
    const STUFEN = [
        { rand: "#a8642a", licht: "#e09a58", schatten: "#6a3a14" },
        { rand: "#9aa6b8", licht: "#e4ecf6", schatten: "#5a6474" },
        { rand: "#e0a818", licht: "#fff0a0", schatten: "#9a6a08" },
        { rand: "#3ab8d8", licht: "#bff2ff", schatten: "#1a6a8a" },
        { rand: "#d850a8", licht: "#ffc4ec", schatten: "#7a1a5a" }
    ];
    const POKAL = { holz: 0, gold: 2, platin: 3, kristall: 4 };
    const bilder = {};
    for (const e of erfolge) {
        const img = new Image();
        img.src = e.pokal ? spriteUrl("sym_pokal_" + e.pokal) : pixelIconUrl(e.icon, 32);
        try { await img.decode(); bilder[e.api] = img; } catch (fehler) {}
    }
    const bild = (e, gesperrt) => {
        const L = document.createElement("canvas");
        L.width = 32; L.height = 32;
        const g = L.getContext("2d");
        g.imageSmoothingEnabled = false;
        const px = (x, y, w, h, f) => { g.fillStyle = f; g.fillRect(x, y, w, h); };
        const stufe = e.pokal ? POKAL[e.pokal] : Math.min(4, Math.round((e.stufe / Math.max(1, e.stufen - 1)) * 4));
        const f = STUFEN[stufe];
        const form = (rand, farbe) => {
            px(2 + rand, 0 + rand, 28 - 2 * rand, 32 - 2 * rand, farbe);
            px(1 + rand, 1 + rand, 30 - 2 * rand, 30 - 2 * rand, farbe);
            px(0 + rand, 2 + rand, 32 - 2 * rand, 28 - 2 * rand, farbe);
        };
        form(0, "#2e1a09");
        form(1, f.schatten);
        px(2, 1, 28, 2, f.licht); px(1, 2, 2, 27, f.licht);
        form(2, f.rand);
        px(3, 2, 26, 1, f.licht);
        form(4, "#2e1a09");
        form(5, "#fbf1d6");
        px(6, 5, 20, 2, "#fffaf0");
        px(5, 23, 22, 3, "#ecd8a8");
        [[3, 3], [27, 3], [3, 27], [27, 27]].forEach(([x, y]) => { px(x, y, 2, 2, "#2e1a09"); px(x, y, 1, 1, f.licht); });
        const anzahl = e.pokal ? 0 : Math.min(8, e.stufe + 1);
        const start = 16 - anzahl;
        for (let i = 0; i < anzahl; i++) { px(start + i * 2, 27, 1, 2, f.licht); px(start + i * 2, 28, 1, 1, f.schatten); }
        const gross = document.createElement("canvas");
        gross.width = 256; gross.height = 256;
        const G = gross.getContext("2d");
        G.imageSmoothingEnabled = false;
        G.drawImage(L, 0, 0, 256, 256);
        const quelle = bilder[e.api];
        if (quelle) {
            const s = Math.max(1, Math.floor(136 / Math.max(quelle.width, quelle.height)));
            const w = quelle.width * s, h = quelle.height * s;
            const x = Math.round(128 - w / 2), y = Math.round(118 - h / 2);
            G.globalAlpha = 0.25;
            G.drawImage(quelle, x + 8, y + 8, w, h);
            G.globalAlpha = 1;
            G.filter = "brightness(0)";
            G.globalAlpha = 0.25;
            G.drawImage(quelle, x + 6, y + 6, w, h);
            G.filter = "none";
            G.globalAlpha = 1;
            G.drawImage(quelle, x, y, w, h);
        }
        if (gesperrt) {
            const d = G.getImageData(0, 0, 256, 256);
            for (let i = 0; i < d.data.length; i += 4) {
                const grau = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11;
                const wert = grau * 0.55 + 20;
                d.data[i] = wert; d.data[i + 1] = wert; d.data[i + 2] = wert + 6;
            }
            G.putImageData(d, 0, 0);
        }
        return gross.toDataURL("image/png");
    };
    return erfolge.map(e => [e.api, bild(e, false), bild(e, true), Boolean(bilder[e.api])]);
})`;

const warte = ms => new Promise(ok => setTimeout(ok, ms));
const holeJson = u => new Promise((ok, nein) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { ok(JSON.parse(d)); } catch (e) { nein(e); } }); }).on("error", nein));

(async () => {
    fs.mkdirSync(ZIEL, { recursive: true });
    const port = 9300 + Math.floor(Math.random() * 500);
    const profil = fs.mkdtempSync(path.join(os.tmpdir(), "sv-chrome-"));
    const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--mute-audio", "--remote-debugging-port=" + port, "--user-data-dir=" + profil, "about:blank"], { stdio: "ignore" });
    let ziele;
    for (let i = 0; i < 50 && !ziele; i++) { try { ziele = await holeJson("http://127.0.0.1:" + port + "/json"); } catch (e) { await warte(200); } }
    const ws = new WebSocket(ziele.find(z => z.type === "page").webSocketDebuggerUrl);
    await new Promise(ok => ws.addEventListener("open", ok));
    let id = 0;
    const offen = new Map();
    ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && offen.has(m.id)) { offen.get(m.id)(m); offen.delete(m.id); } });
    const sende = (method, params = {}) => new Promise(ok => { const n = ++id; offen.set(n, ok); ws.send(JSON.stringify({ id: n, method, params })); });
    await sende("Page.enable");
    await sende("Page.navigate", { url: SPIEL });
    await warte(3000);
    const antwort = await sende("Runtime.evaluate", { expression: ZEICHNEN + "(" + JSON.stringify(ERFOLGE) + ")", awaitPromise: true, returnByValue: true });
    const liste = antwort.result.result.value;
    if (!liste) throw new Error(JSON.stringify(antwort.result).slice(0, 500));
    let ohneBild = 0;
    for (const [api, erreicht, gesperrt, mitBild] of liste) {
        fs.writeFileSync(path.join(ZIEL, api + ".png"), Buffer.from(erreicht.split(",")[1], "base64"));
        fs.writeFileSync(path.join(ZIEL, api + "_gesperrt.png"), Buffer.from(gesperrt.split(",")[1], "base64"));
        if (!mitBild) { ohneBild++; console.log("Ohne Symbol: " + api); }
    }
    console.log(liste.length + " Erfolge, je 2 Bilder in " + ZIEL + (ohneBild ? ", " + ohneBild + " ohne Symbol" : ""));
    ws.close();
    chrome.kill();
    await warte(500);
    try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
    process.exit(0);
})().catch(e => { console.log("Abbruch: " + e.stack); process.exit(1); });
