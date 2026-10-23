const fs = require("fs");
const { aufnehmen } = require("./aufnahme.js");
const VORHER = fs.readFileSync(__dirname + "/szene.js", "utf8");
const S = (art, opt, extra = "") => `(async () => { __zeiger(); ${extra}; const r = await __szene('${art}', ${JSON.stringify(opt)}); return r; })()`;
const A = code => `Promise.race([(async () => { ${code}; return true; })(), new Promise(ok => setTimeout(() => ok('zeit'), 15000))])`;
const clip = (zoom, setup, aktion, nach = 300) => ({ zoom, schritte: [{ warte: 1500, js: setup }, { start: true, warte: 120 }, { js: A(aktion) }, { warte: nach }, { stopp: true }] });
const OHNE_BLITZ = "einstellungen.blitze = false; bildschirmBlitz = () => null";
const STERNE_KAUFEN = `run.phase = 'vorTag'; run.skillpunkte = 9.9e9; oeffneSkilltree(); await __warte(700); __bewege(1500, 900);
  const mitte = [window.innerWidth * 0.4, window.innerHeight * 0.5];
  const sterne = [...document.querySelectorAll('.stern[data-id]')].map(s => ({ s, r: s.getBoundingClientRect() }))
    .filter(o => o.r.width > 0 && o.r.left > 40 && o.r.right < window.innerWidth * 0.75 && o.r.top > 110 && o.r.bottom < window.innerHeight - 30)
    .sort((a, b) => Math.hypot(a.r.left - mitte[0], a.r.top - mitte[1]) - Math.hypot(b.r.left - mitte[0], b.r.top - mitte[1]));
  let gekauft = 0;
  for (const o of sterne) {
    if (gekauft >= 7) break;
    const def = SKILLS.find(d => d.id === o.s.dataset.id); if (!def) continue;
    const vorher = level(def.id);
    const r = o.s.getBoundingClientRect();
    await __fahre([[r.left + r.width / 2, r.top + r.height / 2]], 330); __klickHier();
    kaufeUpgrade(def, 'skillpunkte'); if (level(def.id) > vorher) { gekauft++; await __warte(260); }
  }
  await __warte(500);`;

const CLIPS = {
  e_saat: clip(1.7, S("frueh", { felder: 3 }, "klicksProSamen = () => 2"),
    `__bewege(1100, 640); __tempo(0.4); const [x, y] = __mitte('#plant-button'); await __fahre([[x + 120, y + 60], [x, y]], 700); await __stand(9, 140); await __warte(1500);`),
  e_ernte: clip(1.7, S("frueh", { felder: 3, pflanzen: true, reif: true }, "__glueck([0.7, 0.3, 0, 0, 0])"),
    `const f = __felder(x => x.fertig); __bewege(f[3][0] + 200, f[3][1] + 160); await __fahre([f[3]], 500); __klickHier(); await __warte(120);
     await __fahre([f[1]], 280); __klickHier(); await __fahre([f[0]], 300); __klickHier(); await __fahre([f[2]], 300); __klickHier(); await __warte(800);
     await __sammle(); await __warte(400);`),
  e_wachsen: clip(1.7, S("frueh", { felder: 5, pflanzen: true, gold: 40 }, "klicksProSamen = () => 1; __glueck([0.6, 0.35, 0.05, 0, 0])"),
    `run.pflanzen[1].freigeschaltet = true; __tempo(0.35); const [x, y] = __mitte('#plant-button'); __bewege(x + 160, y + 120); await __fahre([[x, y]], 400); await __stand(7, 110); await __warte(1500);
     const f = __schlange(__felder(z => z.fertig)); await __fahre(f, 1300, 80); await __warte(500); await __sammle();`),
  e_feldkauf: clip(1.7, S("frueh", { felder: 3, pflanzen: true, gold: 400 }),
    `run.phase = 'vorTag'; aktualisiereAlles(); await __warte(200); __bewege(1000, 600);
     for (let i = 0; i < 4; i++) { const s = document.querySelector('.kauf-kachel:not(.gesperrt)'); if (!s) break; const r = s.getBoundingClientRect(); await __fahre([[r.left + r.width / 2, r.top + r.height / 2]], 420); __klickHier(); await __warte(380); }
     await __warte(400);`),
  e_neu: clip(1.7, S("frueh", { felder: 5, pflanzen: true }), `__bewege(1200, 700); await __warte(200); neuePflanzeFeier(run.pflanzen[1]); await __warte(2300);`),
  m_kombo: clip(1.35, S("mitte", { pflanzen: true, bepflanzt: 4 }, "klicksProSamen = () => 1"),
    `__tempo(0.6); const [x, y] = __mitte('#plant-button'); __bewege(x + 200, y + 150); await __fahre([[x, y]], 350); await __stand(52, 58); await __warte(300);`),
  m_ernte: clip(1.35, S("mitte", { pflanzen: true, reif: true }, "__glueck([0.42, 0.27, 0.19, 0.11, 0.01])"),
    `const f = __schlange(__felder(x => x.fertig)); __bewege(f[0][0] - 100, f[0][1] - 60); await __fahre(f, 3000, 65); await __sammle(1500);`),
  m_goldregen: clip(1.35, S("mitte", { pflanzen: true, reif: true }, "GOLDREGEN_KONFIG.dauerSek = 3.2"),
    `tagesPlan.goldregen = 0; goldregenTick(); __bewege(700, 500); await __warte(1100); for (let i = 0; i < 5; i++) { await __sammle(900); await __warte(80); } await __warte(300);`),
  m_kraehen: clip(1.35, S("mitte", { pflanzen: true }),
    `for (let i = 0; i < 4; i++) setTimeout(() => kraeheKommt(), i * 300); __bewege(700, 750); await __warte(1800);
     for (const k of [...document.querySelectorAll('.kraehe')]) { const r = k.getBoundingClientRect(); await __fahre([[r.left + r.width / 2, r.top + r.height / 2]], 330); __klickHier(); await __warte(120); }
     await __warte(900);`),
  m_herbst: clip(1.35, S("mitte", { pflanzen: true, reif: true, tag: 13, wetter: "regen" }, "__glueck([0.5, 0.25, 0.16, 0.09, 0])"),
    `const f = __schlange(__felder(x => x.fertig)).reverse(); __bewege(f[0][0] + 80, f[0][1]); await __fahre(f.slice(0, 14), 2200, 80); await __sammle(1400);`),
  m_nacht: clip(1.35, S("mitte", { pflanzen: true, reif: true, tageszeit: 1.02 }),
    `for (let i = 0; i < 9; i++) setTimeout(() => spawnGluehwuermchen(), i * 180); setTimeout(() => spawnSternschnuppe(), 300); __bewege(700, 700); await __warte(1400);
     const s = document.querySelector('.sternschnuppe'); if (s) { const r = s.getBoundingClientRect(); await __fahre([[r.left + r.width / 2, r.top + r.height / 2]], 420); __klickHier(); }
     await __warte(300); for (const e of [...document.querySelectorAll('.gluehwuermchen')].slice(0, 4)) { const r = e.getBoundingClientRect(); await __fahre([[r.left + r.width / 2, r.top + r.height / 2]], 330); __klickHier(); }
     await __warte(600);`),
  m_stellarium: clip(1, S("mitte", {}), STERNE_KAUFEN),
  m_bezahlt: clip(1.35, S("mitte", { pflanzen: true }), `__bewege(900, 700); haken('rechnungBezahlt', 3, false); await __warte(2000);`),
  s_weit: clip(1, S("spaet", { pflanzen: "spaet" }), `__bewege(-50, -50); await __warte(3500);`),
  s_riesen: clip(1, S("spaet", { pflanzen: "spaet", reif: true }, OHNE_BLITZ + "; __glueck([0.3, 0.3, 0.25, 0.15, 0])"),
    `const f = __schlange(__felder(x => x.fertig)); __bewege(f[0][0] - 80, f[0][1]); await __fahre(f.filter((_, i) => i % 2 === 0), 3000, 100); await __sammle(1500);`),
  s_jackpot: clip(1, S("spaet", { pflanzen: "spaet", reif: true, varianten: ["golden", null, null, null, null, null, null, null, null, null, null, null] }, "__glueck([0.4, 0.3, 0.2, 0.1, 0])"),
    `const f = __felder(x => x.fertig && x.variante && x.variante.id === 'golden').slice(0, 3); __bewege(960, 1000);
     for (const p of f) { await __fahre([p], 450); __klickHier(); await __warte(300); await __sammle(700); await __warte(500); }`),
  s_magnet: clip(1, S("spaet", { pflanzen: "spaet", reif: true, varianten: [null, "feuer", null, "pilz", null, null, null, "kristall"] }, OHNE_BLITZ + "; __glueck([0.3, 0.3, 0.25, 0.15, 0])"),
    `const f = __schlange(__felder(x => x.fertig)).reverse(); __bewege(f[0][0] + 80, f[0][1]); await __fahre(f.slice(0, 20), 2400, 70); await __warte(300);
     const m = run.felder.find(x => !x.leer && x.fertig) || run.felder.find(x => !x.leer); m.variante = VARIANTE_NACH_ID.magnet; setzeVariantenKlasse(m, m.variante); while (!m.fertig) wachseEineStufe(m);
     const r = m.el.feldDiv.getBoundingClientRect(); await __fahre([[r.left + r.width / 2, r.top + r.height / 2]], 600); __klickHier(); await __warte(1300);`),
  s_fieber: clip(1, S("spaet", { pflanzen: "spaet", bepflanzt: 20 }, "klicksProSamen = () => 1"),
    `__tempo(0.5); const [x, y] = __mitte('#plant-button'); __bewege(x + 150, y + 100); await __fahre([[x, y]], 300); await __stand(75, 42); await __warte(200);`),
  s_winter: clip(1, S("spaet", { pflanzen: "spaet", reif: true, tag: 18 }, OHNE_BLITZ + "; __glueck([0.3, 0.3, 0.25, 0.15, 0])"),
    `const f = __schlange(__felder(x => x.fertig)); __bewege(f[20][0], f[20][1] - 60); await __fahre(f.slice(20, 44), 2800, 90); await __sammle(1200);`),
  s_gewitter: clip(1, S("spaet", { pflanzen: "spaet", reif: true, wetter: "gewitter" }, "__glueck([0.3, 0.3, 0.25, 0.15, 0])"),
    `const f = __schlange(__felder(x => x.fertig)); __bewege(f[30][0], f[30][1] + 60); await __fahre(f.slice(30, 60), 3000, 90); await __sammle(1000);`),
  s_stellarium: clip(1, S("spaet", {}), STERNE_KAUFEN),
  s_pokal: clip(1, S("spaet", { pflanzen: "spaet" }, OHNE_BLITZ), `__bewege(-50, -50); zeigeSieg(TROPHAEEN[3]); await __warte(2600);`),
  ende: { zoom: 1, schritte: [
    { warte: 1700, js: "document.getElementById('intro').remove(); const s = document.createElement('style'); s.textContent = '#menue-start .menue-knoepfe, #profil-knopf, #menue-zeitung, #menue-version { opacity: 0 !important; } #menue-start { transform: translateY(12vh); }'; document.head.appendChild(s); true" },
    { warte: 1000, start: true }, { warte: 600, klick: ".logo-buehne" }, { warte: 3200 }, { stopp: true }
  ] }
};

(async () => {
  const nur = process.argv.slice(2);
  for (const [name, c] of Object.entries(CLIPS)) {
    if (nur.length && !nur.includes(name)) continue;
    try { const k = c.zoom > 1; await aufnehmen(name, c.schritte, { vorher: VORHER, zoom: k ? 2 : 1, b: k ? 3840 : 1920, h: k ? 2160 : 1080 }); } catch (e) { console.log(name + " Fehler: " + e.message); }
  }
})();
