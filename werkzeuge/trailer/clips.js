const { aufnehmen } = require("./aufnahme.js");

const BASIS = (opt = {}) => `(async () => {
  document.getElementById('intro') && document.getElementById('intro').remove();
  meta.tutorial = 'fertig';
  spieleModus(false);
  await new Promise(r => setTimeout(r, 300));
  document.querySelectorAll('.popup-huelle').forEach(h => h.remove());
  meta.stellariumFrei = true;
  const anzahlPflanzen = ${opt.pflanzen || 6};
  run.pflanzen.slice(0, anzahlPflanzen).forEach((p, i) => { p.freigeschaltet = true; p.level.ertrag = 5; p.level.ertragEigen = 5; });
  for (let i = 0; i < ${opt.felder || 23}; i++) { const slot = naechsterSlot(eigeneSeite()); if (slot < 0) break; erstelleFeld(slot); }
  run.gold = ${opt.gold || 48250}; run.skillpunkte = 1260; run.tag = ${opt.tag || 9};
  aktualisiereAlles();
  const stil = document.createElement('style');
  stil.textContent = '${opt.banner ? "#toasts { display: none !important; }" : "#banner-box, #toasts { display: none !important; }"}';
  document.head.appendChild(stil);
  const originalBanner = zeigeBanner;
  zeigeBanner = (symbol, titel, ...rest) => /Achievement|Level|Day/.test(String(titel)) ? null : originalBanner(symbol, titel, ...rest);
  starteTag();
  run.wetter = ${opt.wetter ? "'" + opt.wetter + "'" : "null"};
  zeigeWetter(false);
  ${opt.wetter ? "" : "document.getElementById('wetter-ebene').innerHTML = '';"}
  pflanzeAufZufaelligeFelder(${opt.bepflanzt || 21});
  const arten = run.pflanzen.filter(p => p.freigeschaltet);
  run.felder.filter(f => !f.leer).forEach((f, i) => { f.pflanze = arten[(i * 5) % arten.length]; f.el.nameEl.textContent = f.pflanze.name; zeigeFeldSprite(f); });
  run.felder.forEach((f, i) => { const n = ${opt.reif ? "3" : "[3, 2, 3, 1, 3, 2, 3, 3][i % 8]"}; for (let j = 0; j < n; j++) wachseEineStufe(f); });
  await new Promise(r => setTimeout(r, 2700));
  return true;
})()`;

const ACKER = "#field-grid";
const feldPunkte = `[...document.querySelectorAll('.feld:not(.feld-leer)')].map(f => { const b = f.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })`;

function mausWeg(punkte, schritt = 40) {
  const s = [];
  for (const [x, y] of punkte) s.push({ maus: [x, y], warte: schritt });
  return s;
}

function zickzack() {
  const p = [];
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i <= 12; i++) {
      const x = r % 2 === 0 ? 120 + i * 140 : 1800 - i * 140;
      p.push([x, 470 + r * 140]);
    }
  }
  return p;
}

const CLIPS = {
  intro: [{ start: true, warte: 5600 }, { stopp: true }],
  menue: [
    { warte: 1700, js: "document.getElementById('intro').remove(); document.getElementById('menue-beenden').classList.remove('versteckt'); true" },
    { warte: 1200, start: true },
    { warte: 700, klick: ".logo-buehne" },
    { warte: 900, maus: [960, 700] },
    { warte: 1400 }, { stopp: true }
  ],
  iris: [
    { warte: 1700, js: "document.getElementById('intro').remove(); meta.tutorial = 'fertig'; true" },
    { warte: 400, klick: "#menue-spielen" }, { warte: 400, klick: "#art-solo" },
    { warte: 500, start: true }, { warte: 300, klick: "#modus-reihe .modus-karte" },
    { warte: 1800 }, { stopp: true }
  ],
  ernte: [
    { warte: 1700, js: BASIS({ reif: true }) },
    { start: true, warte: 100 },
    ...mausWeg(zickzack(), 28),
    { warte: 600 }, { stopp: true }
  ],
  kombo: [
    { warte: 1700, js: BASIS({ bepflanzt: 6 }) },
    { start: true, warte: 100 },
    ...Array.from({ length: 34 }, () => ({ klick: "#plant-button", warte: 70 })),
    { warte: 700 }, { stopp: true }
  ],
  goldregen: [
    { warte: 1700, js: BASIS({ banner: true, reif: false }) },
    { start: true, js: "GOLDREGEN_KONFIG.dauerSek = 2.5; tagesPlan.goldregen = 0; true" },
    { warte: 2600 },
    ...mausWeg(zickzack().slice(0, 30), 30),
    { stopp: true }
  ],
  fieber: [
    { warte: 1700, js: BASIS({ banner: true, bepflanzt: 23 }) },
    { start: true, js: "tagesPlan.fieber = 0; true" },
    { warte: 1200 },
    ...mausWeg(zickzack().slice(0, 26), 35),
    { stopp: true }
  ],
  markt: [
    { warte: 1700, js: BASIS({ gold: 4.8e6 }) },
    { js: "run.phase = 'vorTag'; aktualisiereAlles(); document.getElementById('shop-button').click(); true" },
    { warte: 400, start: true },
    ...Array.from({ length: 6 }, (_, i) => ({ klick: "#shop-panel .markt-karte button:not([disabled]), #shop-panel .karte button:not([disabled])", warte: 320 })),
    { warte: 500 }, { stopp: true }
  ],
  stellarium: [
    { warte: 1700, js: BASIS({}) },
    { js: "debug.alleSterne(2); run.skillpunkte = 18500; aktualisiereAlles(); document.querySelectorAll('.popup-huelle').forEach(h => h.remove()); oeffneSkilltree(); true" },
    { warte: 700, start: true, maus: [960, 540] },
    ...mausWeg([[900, 500], [800, 450], [700, 400], [650, 380], [600, 360]], 260),
    { warte: 600 }, { stopp: true }
  ],
  herbst: [
    { warte: 1700, js: BASIS({ tag: 13 }) },
    { warte: 3000, start: true }, { stopp: true }
  ],
  winter: [
    { warte: 1700, js: BASIS({ tag: 18 }) },
    { warte: 3000, start: true }, { stopp: true }
  ],
  nacht: [
    { warte: 1700, js: BASIS({}) },
    { js: "debug.tageszeit(1.02); for (let i = 0; i < 6; i++) setTimeout(() => spawnGluehwuermchen(), i * 250); true" },
    { warte: 1800, start: true }, { warte: 3000 }, { stopp: true }
  ],
  regenbogen: [
    { warte: 1700, js: BASIS({ wetter: "regenbogen" }) },
    { warte: 3000, start: true }, { stopp: true }
  ],
  gluecksspiel: [
    { warte: 1700, js: "document.getElementById('intro').remove(); meta.tutorial = 'fertig'; spieleModus(false); true" },
    { warte: 500, js: "(() => { const s = document.createElement('style'); s.textContent = '#banner-box, #toasts { display: none !important; }'; document.head.appendChild(s); document.querySelectorAll('.popup-huelle').forEach(h => h.remove()); GLUECK_SPIELE.forEach(s => { run.level[s.id] = 1; }); run.level.vipkarte = 1; run.gold = 48250; marktModus = 'glueck'; aktiverGlueckReiter = 'gacha'; document.getElementById('shop-button').click(); return true; })()" },
    { warte: 600, start: true }, { warte: 200, klick: "#shop-panel .spiel-knoepfe button" },
    { warte: 2600 }, { stopp: true }
  ],
  segen: [
    { warte: 1700, js: BASIS({}) },
    { start: true, js: "zeigeSegenAuswahl(); true" },
    { warte: 1400, maus: [960, 560] }, { warte: 900 }, { stopp: true }
  ],
  pokal: [
    { warte: 1700, js: BASIS({}) },
    { start: true, js: "zeigeSieg(TROPHAEEN[1]); true" },
    { warte: 2600 }, { stopp: true }
  ],
  haus: [
    { warte: 1700, js: BASIS({}) },
    { js: "run.phase = 'vorTag'; oeffneHaus('haustier'); true" },
    { warte: 500, start: true },
    ...[4, 7, 9, 12, 14].map(i => ({ klick: ".haus-kachel:nth-child(" + i + ")", warte: 520 })),
    { warte: 400 }, { stopp: true }
  ],
  profil: [
    { warte: 1700, js: "document.getElementById('intro').remove(); oeffneProfil(); true" },
    { warte: 600, start: true },
    ...[2, 3, 5, 7, 9].map(i => ({ klick: ".profil-kachel:nth-child(" + i + ")", warte: 450 })),
    { warte: 400 }, { stopp: true }
  ],
  mondteich: [
    { warte: 1700, js: BASIS({}) },
    { js: "meta.mondblueten = 2400; oeffnePrestigeShop(); true" },
    { warte: 600, start: true }, { warte: 900 },
    { js: "(() => { const k = [...document.querySelectorAll('#prestige-shop button')].find(b => /Tarot/.test(b.textContent)); if (k) k.click(); return true; })()" },
    { warte: 1600 }, { stopp: true }
  ],
  ende: [
    { warte: 1700, js: "document.getElementById('intro').remove(); const s = document.createElement('style'); s.textContent = '#menue-start .menue-knoepfe, #profil-knopf, #menue-zeitung, #menue-version { opacity: 0 !important; } #menue-start { transform: translateY(12vh); }'; document.head.appendChild(s); true" },
    { warte: 1000, start: true }, { warte: 600, klick: ".logo-buehne" }, { warte: 3200 }, { stopp: true }
  ]
};

(async () => {
  const nur = process.argv.slice(2);
  for (const [name, schritte] of Object.entries(CLIPS)) {
    if (nur.length && !nur.includes(name)) continue;
    try { await aufnehmen(name, schritte); } catch (e) { console.log(name + " Fehler: " + e.message); }
  }
})();
