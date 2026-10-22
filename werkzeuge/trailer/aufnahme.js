const { spawn, execFileSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path"), http = require("http");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FFMPEG = "H:/!Desktop/Venray Studios/Coding/Tools/ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe";
const SPIEL = "file:///" + path.join(__dirname, "..", "..", "index.html").split(path.sep).join("/");
const warte = ms => new Promise(ok => setTimeout(ok, ms));
const holeJson = u => new Promise((ok, nein) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { ok(JSON.parse(d)); } catch (e) { nein(e); } }); }).on("error", nein));

async function aufnehmen(name, schritte, opt = {}) {
  const B = opt.b || 1920, H = opt.h || 1080;
  const port = 9300 + Math.floor(Math.random() * 500);
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "sv-rec-"));
  const chrome = spawn(CHROME, ["--headless=new", "--mute-audio", "--hide-scrollbars", "--remote-debugging-port=" + port, "--user-data-dir=" + profil, "--window-size=" + B + "," + H, "about:blank"], { stdio: "ignore" });
  let ziele; for (let i = 0; i < 60 && !ziele; i++) { try { ziele = await holeJson("http://127.0.0.1:" + port + "/json"); } catch (e) { await warte(200); } }
  const ws = new WebSocket(ziele.find(z => z.type === "page").webSocketDebuggerUrl);
  await new Promise(ok => ws.addEventListener("open", ok));
  let id = 0; const offen = new Map();
  const ordner = path.join(__dirname, "frames", name);
  fs.rmSync(ordner, { recursive: true, force: true }); fs.mkdirSync(ordner, { recursive: true });
  const bilder = [];
  let nimmtAuf = false;
  const sende = (method, params = {}) => new Promise(ok => { const n = ++id; offen.set(n, ok); ws.send(JSON.stringify({ id: n, method, params })); });
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id && offen.has(m.id)) { offen.get(m.id)(m); offen.delete(m.id); }
    if (m.method === "Page.screencastFrame") {
      ws.send(JSON.stringify({ id: ++id, method: "Page.screencastFrameAck", params: { sessionId: m.params.sessionId } }));
      if (nimmtAuf) {
        const datei = path.join(ordner, String(bilder.length).padStart(5, "0") + ".jpg");
        fs.writeFileSync(datei, Buffer.from(m.params.data, "base64"));
        bilder.push({ datei, zeit: m.params.metadata.timestamp });
      }
    }
  });
  await sende("Page.enable");
  await sende("Emulation.setDeviceMetricsOverride", { width: B, height: H, deviceScaleFactor: 1, mobile: false });
  if (opt.vorher) await sende("Page.addScriptToEvaluateOnNewDocument", { source: opt.vorher });
  await sende("Page.navigate", { url: SPIEL });
  await sende("Emulation.setFocusEmulationEnabled", { enabled: true });
  for (const s of schritte) {
    if (s.start) { nimmtAuf = true; await sende("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: B, maxHeight: H, everyNthFrame: 1 }); }
    if (s.stopp) nimmtAuf = false;
    if (s.warte) await warte(s.warte);
    if (s.js) {
      const r = await sende("Runtime.evaluate", { expression: s.js, awaitPromise: !s.nichtWarten, returnByValue: true });
      if (r.result && r.result.exceptionDetails) console.log(name + " JS-Fehler: " + JSON.stringify(r.result.exceptionDetails).slice(0, 300));
    }
    if (s.klick) {
      const r = await sende("Runtime.evaluate", { expression: "(() => { const e = document.querySelector(" + JSON.stringify(s.klick) + "); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()", returnByValue: true });
      const p = r.result.result.value;
      if (p) for (const typ of ["mouseMoved", "mousePressed", "mouseReleased"]) await sende("Input.dispatchMouseEvent", { type: typ, x: p[0], y: p[1], button: "left", clickCount: 1 });
    }
    if (s.maus) await sende("Input.dispatchMouseEvent", { type: "mouseMoved", x: s.maus[0], y: s.maus[1] });
  }
  await sende("Page.stopScreencast");
  ws.close(); chrome.kill(); await warte(400);
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
  if (bilder.length < 2) { console.log(name + ": zu wenige Bilder " + bilder.length); return null; }
  const liste = bilder.map((b, i) => "file '" + b.datei.replace(/\\/g, "/") + "'\nduration " + Math.max(0.001, ((bilder[i + 1] ? bilder[i + 1].zeit : b.zeit + 1 / 30) - b.zeit)).toFixed(4)).join("\n") + "\nfile '" + bilder[bilder.length - 1].datei.replace(/\\/g, "/") + "'\n";
  const listeDatei = path.join(ordner, "liste.txt");
  fs.writeFileSync(listeDatei, liste);
  const ziel = path.join(__dirname, "clips", name + ".mp4");
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  execFileSync(FFMPEG, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listeDatei, "-vf", "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "medium", ziel]);
  const dauer = bilder[bilder.length - 1].zeit - bilder[0].zeit;
  console.log(name + ": " + bilder.length + " Bilder, " + dauer.toFixed(1) + " s, " + (bilder.length / dauer).toFixed(1) + " fps");
  return ziel;
}
module.exports = { aufnehmen };
if (require.main === module) {
  aufnehmen("test", [{ warte: 1500, js: "document.getElementById('intro').remove(); true" }, { start: true, warte: 3000 }, { stopp: true }]);
}
