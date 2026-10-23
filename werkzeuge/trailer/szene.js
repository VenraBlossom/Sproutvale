window.__szene = async function (art, opt = {}) {
  const warte = ms => new Promise(r => setTimeout(r, ms));
  document.getElementById('intro') && document.getElementById('intro').remove();
  meta.tutorial = 'fertig'; einstellungen.tipps = false;
  spieleModus(false);
  await warte(300);
  document.querySelectorAll('.popup-huelle').forEach(h => h.remove());
  const stil = document.createElement('style');
  stil.textContent = '#banner-box, #toasts, .tutorial-blase { display: none !important; } .gross-titel.titel-tag { display: none !important; }';
  document.head.appendChild(stil);
  const originalBanner = zeigeBanner;
  zeigeBanner = (symbol, titel, ...rest) => opt.banner ? originalBanner(symbol, titel, ...rest) : null;
  meta.stellariumFrei = art !== 'frueh';
  if (art === 'frueh') {
    run.pflanzen[0].freigeschaltet = true;
    for (let i = 0; i < (opt.felder || 3); i++) { const slot = naechsterSlot(eigeneSeite()); if (slot < 0) break; erstelleFeld(slot); }
    run.gold = opt.gold || 12; run.skillpunkte = 0; run.tag = opt.tag || 1;
  } else if (art === 'mitte') {
    run.pflanzen.slice(0, 7).forEach((p, i) => { p.freigeschaltet = true; p.level.ertrag = 6; p.level.ertragEigen = 6; });
    for (let i = 0; i < (opt.felder || 23); i++) { const slot = naechsterSlot(eigeneSeite()); if (slot < 0) break; erstelleFeld(slot); }
    ['glueck', 'magnetfeld', 'eichhoernchen', 'doppelernte', 'obstkorb'].forEach(id => { run.level[id] = Math.max(run.level[id] || 0, 2); });
    run.gold = opt.gold || 184250; run.skillpunkte = 3260; run.tag = opt.tag || 12;
  } else {
    debug.alleSterne(opt.unendlich || 12);
    debug.alleMarkt(opt.unendlich || 12);
    run.pflanzen.forEach(p => { p.freigeschaltet = true; });
    run.gold = opt.gold || 8.4e12; run.skillpunkte = 2.6e7; run.tag = opt.tag || 41;
  }
  aktualisiereAlles();
  starteTag();
  run.wetter = opt.wetter || null;
  zeigeWetter(false);
  if (!opt.wetter) { document.getElementById('wetter-ebene').innerHTML = ''; document.getElementById('wetter-schleier').className = ''; }
  if (opt.pflanzen) {
    const arten = run.pflanzen.filter(p => p.freigeschaltet);
    const wahl = opt.pflanzen === 'spaet' ? arten.slice(-10) : arten;
    pflanzeAufZufaelligeFelder(opt.bepflanzt || 999);
    run.felder.filter(f => !f.leer).forEach((f, i) => { f.pflanze = wahl[Math.floor(Math.random() * wahl.length)]; f.el.nameEl.textContent = f.pflanze.name; zeigeFeldSprite(f); });
    run.felder.forEach((f, i) => { const n = opt.reif ? 3 : [3, 2, 3, 1, 3, 2, 3, 3][i % 8]; for (let j = 0; j < n; j++) if (!f.leer && !f.fertig) wachseEineStufe(f); });
  }
  if (opt.varianten) run.felder.filter(f => !f.leer).forEach((f, i) => { const v = opt.varianten[i % opt.varianten.length]; if (v) { f.variante = VARIANTE_NACH_ID[v]; setzeVariantenKlasse(f, f.variante); f.ernteKlicksRest = f.variante.ernteKlicks || 0; } });
  if (opt.tageszeit !== undefined) debug.tageszeit(opt.tageszeit);
  await warte(opt.warte || 2400);
  return run.felder.length + ' felder';
};
window.__zeiger = function () {
  const z = document.createElement('div');
  z.id = 'trailer-zeiger';
  z.innerHTML = '<svg width="34" height="40" viewBox="0 0 17 20" shape-rendering="crispEdges"><path d="M1 1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h-5v1h1v1h1v2h1v2h-2v-1h-1v-2h-1v-1h-1v1h-1v1h-1v1h-1z" fill="#fff8e6" stroke="#2e1a09" stroke-width="1" paint-order="stroke"/></svg>';
  z.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);filter:drop-shadow(2px 3px 0 rgba(30,15,5,.45));';
  document.documentElement.appendChild(z);
  addEventListener('mousemove', e => { z.style.left = e.clientX + 'px'; z.style.top = e.clientY + 'px'; }, true);
};
window.__warte = ms => new Promise(r => setTimeout(r, ms));
window.__maus = { x: 960, y: 700 };
window.__bewege = function (x, y) {
  __maus.x = x; __maus.y = y;
  const z = document.getElementById('trailer-zeiger');
  if (z) { z.style.left = x + 'px'; z.style.top = y + 'px'; }
  document.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true, pointerType: 'mouse' }));
  const unter = document.elementFromPoint(x, y);
  if (unter) unter.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true, pointerType: 'mouse' }));
};
window.__klickHier = function () {
  const { x, y } = __maus;
  const ziel = document.elementFromPoint(x, y);
  const z = document.getElementById('trailer-zeiger');
  if (z && z.animate) z.animate([{ scale: '1' }, { scale: '0.82' }, { scale: '1' }], { duration: 120 });
  if (!ziel) return;
  ziel.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, button: 0, pointerType: 'mouse' }));
  ziel.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true, button: 0, pointerType: 'mouse' }));
  ziel.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, button: 0 }));
};
window.__fahre = function (punkte, ms, klickMs = 0) {
  const p = [[__maus.x, __maus.y], ...punkte];
  const n = p.length - 1;
  const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return new Promise(ok => {
    const start = performance.now();
    let letzterKlick = start - klickMs;
    function schritt() {
      const jetzt = performance.now();
      let t = Math.max(0, Math.min(1, (jetzt - start) / ms));
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const u = n === 1 ? t * 0.15 + e * 0.85 : t * 0.6 + e * 0.4;
      const pos = Math.max(0, u * n), i = Math.max(0, Math.min(n - 1, Math.floor(pos))), f = pos - i;
      const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(n, i + 2)];
      __bewege(cr(a[0], b[0], c[0], d[0], f), cr(a[1], b[1], c[1], d[1], f));
      if (klickMs && jetzt - letzterKlick >= klickMs) { letzterKlick = jetzt; __klickHier(); }
      if (t < 1) requestAnimationFrame(schritt); else ok(true);
    }
    requestAnimationFrame(schritt);
  });
};
window.__mitte = function (sel) { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
window.__felder = function (filter) {
  return run.felder.filter(filter || (() => true)).map(f => { const r = f.el.feldDiv.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
};
window.__schlange = function (punkte, seite) {
  const reihen = {};
  punkte.forEach(p => { const k = Math.round(p[1] / 40); (reihen[k] = reihen[k] || []).push(p); });
  return Object.keys(reihen).map(Number).sort((a, b) => a - b).flatMap((k, i) => reihen[k].sort((a, b) => (i % 2 ? b[0] - a[0] : a[0] - b[0])));
};
window.__stand = async function (anzahl, abstandMs) {
  const [x, y] = __mitte('#plant-button');
  for (let i = 0; i < anzahl; i++) {
    __bewege(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 24);
    __klickHier();
    await __warte(abstandMs);
  }
};
window.__glueck = function (chancen) { raritaetsChancen = () => chancen; };
window.__tempo = function (sek) { stufenZeitSek = () => sek; };
window.__sammle = async function (ms) {
  let punkte = lootKugeln.filter(l => l.gelandet && !l.weg).map(l => [l.x, l.y]);
  if (!punkte.length) { await __warte(250); return; }
  const weg = [];
  let jetzt = [__maus.x, __maus.y];
  while (punkte.length) {
    punkte.sort((a, b) => Math.hypot(a[0] - jetzt[0], a[1] - jetzt[1]) - Math.hypot(b[0] - jetzt[0], b[1] - jetzt[1]));
    jetzt = punkte.shift();
    weg.push(jetzt);
    punkte = punkte.filter(q => Math.hypot(q[0] - jetzt[0], q[1] - jetzt[1]) > 30);
  }
  await __fahre(weg, ms || Math.min(2600, 250 + weg.length * 140));
};
