"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_SPIEL = "file:///" + path.join(__dirname, "..", "index.html").split(path.sep).join("/");
const AUS = process.env.AUS || path.join(__dirname, "..", "_bilder");
fs.mkdirSync(AUS, { recursive: true });
const schritte = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const breite = Number(process.env.B || 1600), hoehe = Number(process.env.H || 900);
const port = 9300 + Math.floor(Math.random() * 500);
const profil = fs.mkdtempSync(path.join(require("os").tmpdir(), "sv-chrome-"));

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--remote-debugging-port=" + port,
  "--user-data-dir=" + profil, "--window-size=" + breite + "," + hoehe, "--lang=" + (process.env.LANG_CHROME || "de-DE"), "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });

const warte = ms => new Promise(ok => setTimeout(ok, ms));
const holeJson = u => new Promise((ok, nein) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { ok(JSON.parse(d)); } catch (e) { nein(e); } }); }).on("error", nein));

(async () => {
  let ziele;
  for (let i = 0; i < 50; i++) { try { ziele = await holeJson("http://127.0.0.1:" + port + "/json"); break; } catch (e) { await warte(200); } }
  const seite = ziele.find(z => z.type === "page");
  const ws = new WebSocket(seite.webSocketDebuggerUrl);
  await new Promise(ok => ws.addEventListener("open", ok));
  let id = 0;
  const offen = new Map();
  const logs = [];
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id && offen.has(m.id)) { offen.get(m.id)(m); offen.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") logs.push("FEHLER " + JSON.stringify(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text).slice(0, 300));
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) logs.push(m.params.type + " " + m.params.args.map(a => a.value || a.description).join(" ").slice(0, 200));
  });
  const sende = (method, params = {}) => new Promise(ok => { const n = ++id; offen.set(n, ok); ws.send(JSON.stringify({ id: n, method, params })); });
  await sende("Runtime.enable");
  await sende("Page.enable");
  await sende("Emulation.setDeviceMetricsOverride", { width: breite, height: hoehe, deviceScaleFactor: 1, mobile: false });
  if (process.env.VORHER) await sende("Page.addScriptToEvaluateOnNewDocument", { source: fs.readFileSync(process.env.VORHER, "utf8") });
  await sende("Page.navigate", { url: URL_SPIEL });
  for (const s of schritte) {
    if (s.warte) await warte(s.warte);
    if (s.js) {
      const r = await sende("Runtime.evaluate", { expression: s.js, awaitPromise: true, returnByValue: true });
      const wert = r.result && r.result.result && r.result.result.value;
      if (r.result && r.result.exceptionDetails) console.log("JS-Fehler: " + JSON.stringify(r.result.exceptionDetails).slice(0, 400));
      else if (wert !== undefined) console.log("JS: " + JSON.stringify(wert).slice(0, 2000));
    }
    if (s.klick) {
      const r = await sende("Runtime.evaluate", { expression: "(() => { const e = document.querySelector(" + JSON.stringify(s.klick) + "); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()", returnByValue: true });
      const p = r.result.result.value;
      if (p) for (const typ of ["mousePressed", "mouseReleased"]) await sende("Input.dispatchMouseEvent", { type: typ, x: p[0], y: p[1], button: "left", clickCount: 1 });
      else console.log("nicht gefunden: " + s.klick);
    }
    if (s.maus) await sende("Input.dispatchMouseEvent", { type: "mouseMoved", x: s.maus[0], y: s.maus[1] });
    if (s.bild) {
      const r = await sende("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(AUS, s.bild), Buffer.from(r.result.data, "base64"));
      console.log("Bild: " + s.bild);
    }
  }
  if (logs.length) console.log(logs.slice(0, 30).join("\n"));
  ws.close();
  chrome.kill();
  await warte(500);
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
  process.exit(0);
})().catch(e => { console.log("Abbruch: " + e.stack); chrome.kill(); process.exit(1); });
