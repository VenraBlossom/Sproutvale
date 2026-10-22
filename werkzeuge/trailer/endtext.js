const { spawn } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path"), http = require("http");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const warte = ms => new Promise(ok => setTimeout(ok, ms));
const holeJson = u => new Promise((ok, nein) => http.get(u, r => { let d = ""; r.on("data", c => d += c); r.on("end", () => { try { ok(JSON.parse(d)); } catch (e) { nein(e); } }); }).on("error", nein));
const SCHRIFT = "file:///" + path.join(__dirname, "..", "..", "assets", "fonts", "jersey15-latin.woff2").split(path.sep).join("/");
const html = `<!doctype html><html><head><style>
@font-face { font-family: J; src: url("${SCHRIFT}"); }
html, body { margin: 0; background: transparent; width: 1920px; height: 1080px; overflow: hidden; }
.box { position: absolute; left: 0; right: 0; bottom: 70px; text-align: center; }
.text { display: inline-block; font-family: J; font-size: 92px; letter-spacing: 4px; color: #fff8e6; padding: 6px 46px 14px;
  text-shadow: 5px 5px 0 #2e1a09, -2px -2px 0 #2e1a09, 2px -2px 0 #2e1a09, -2px 2px 0 #2e1a09;
  background: #5aa832; box-shadow: 0 0 0 6px #14360e, inset 0 6px 0 #b4ec7c, inset 0 -8px 0 #2f6b1a, 0 12px 0 rgba(20,40,10,.5); }
.klein { display: block; font-family: J; font-size: 44px; color: #fff8e6; margin-top: 18px; text-shadow: 3px 3px 0 #2e1a09; }
</style></head><body><div class="box"><span class="text">WISHLIST NOW ON STEAM</span></div></body></html>`;
(async () => {
  const datei = path.join(__dirname, "endtext.html");
  fs.writeFileSync(datei, html);
  const port = 9300 + Math.floor(Math.random() * 500);
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "sv-txt-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=" + port, "--user-data-dir=" + profil, "--window-size=1920,1080", "about:blank"], { stdio: "ignore" });
  let ziele; for (let i = 0; i < 50 && !ziele; i++) { try { ziele = await holeJson("http://127.0.0.1:" + port + "/json"); } catch (e) { await warte(200); } }
  const ws = new WebSocket(ziele.find(z => z.type === "page").webSocketDebuggerUrl);
  await new Promise(ok => ws.addEventListener("open", ok));
  let id = 0; const offen = new Map();
  ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && offen.has(m.id)) { offen.get(m.id)(m); offen.delete(m.id); } });
  const sende = (method, params = {}) => new Promise(ok => { const n = ++id; offen.set(n, ok); ws.send(JSON.stringify({ id: n, method, params })); });
  await sende("Page.enable");
  await sende("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await sende("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await sende("Page.navigate", { url: "file:///" + datei.split(path.sep).join("/") });
  await warte(1500);
  const r = await sende("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "endtext.png"), Buffer.from(r.result.data, "base64"));
  ws.close(); chrome.kill(); await warte(300);
  try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) {}
  console.log("endtext.png fertig");
  process.exit(0);
})();
