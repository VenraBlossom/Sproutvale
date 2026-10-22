const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const FFMPEG = "H:/!Desktop/Venray Studios/Coding/Tools/ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe";
const R = path.join(__dirname, "..", "..", "js") + path.sep;
const RATE = 44100;
const TEMPO = 112;
const ACHTEL = 60 / TEMPO / 2;
const TAKT = ACHTEL * 8;

const proben = eval(fs.readFileSync(R + "klangproben.js", "utf8").replace('"use strict";', "") + ";KLANGPROBEN");
const audioQuelle = fs.readFileSync(R + "audio.js", "utf8");
const t = x => x;
const LIEDER = eval(audioQuelle.slice(audioQuelle.indexOf("const PAUSE"), audioQuelle.indexOf("function liedTakte")) + ";LIEDER");

function dekodiere(b64) {
  const tmp = path.join(__dirname, "tmp.mp3");
  fs.writeFileSync(tmp, Buffer.from(b64, "base64"));
  const roh = execFileSync(FFMPEG, ["-v", "error", "-i", tmp, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
  let d = new Float32Array(roh.buffer, roh.byteOffset, roh.length / 4);
  let a = 0;
  while (a < d.length && Math.abs(d[a]) < 0.004) a++;
  return d.slice(Math.max(0, a - 24));
}
const instrumente = {};
for (const [name, liste] of Object.entries(proben)) instrumente[name] = liste.map(([note, staerke, b64]) => ({ note, staerke, daten: dekodiere(b64) }));

const LAENGE = Math.ceil(56 * RATE);
const L = new Float32Array(LAENGE), Rk = new Float32Array(LAENGE);

function spiele(name, zeit, note, dauer, laut, pan = 0) {
  const liste = instrumente[name];
  let beste = liste[0];
  if (note) liste.forEach(p => { if (Math.abs(p.note - note) < Math.abs(beste.note - note)) beste = p; });
  const tempo = note ? Math.pow(2, (note - beste.note) / 12) : 1;
  const start = Math.floor(zeit * RATE);
  const n = Math.min(Math.floor(dauer * RATE), Math.floor(beste.daten.length / tempo) - 2);
  const ausklang = Math.floor(0.25 * RATE);
  const gl = laut * beste.staerke * (1 - pan) * 0.5 * 2, gr = laut * beste.staerke * (1 + pan) * 0.5 * 2;
  for (let i = 0; i < n && start + i < LAENGE; i++) {
    const pos = i * tempo, i0 = Math.floor(pos), f = pos - i0;
    let w = beste.daten[i0] * (1 - f) + beste.daten[i0 + 1] * f;
    if (i > n - ausklang) w *= (n - i) / ausklang;
    L[start + i] += w * gl;
    Rk[start + i] += w * gr;
  }
}

let rausch = 12345;
const zufall = () => { rausch = (rausch * 1103515245 + 12345) & 0x7fffffff; return rausch / 0x7fffffff * 2 - 1; };
function hat(zeit, laut, dauer = 0.04) {
  const s = Math.floor(zeit * RATE), n = Math.floor(dauer * RATE);
  let vor = 0;
  for (let i = 0; i < n && s + i < LAENGE; i++) {
    const r = zufall(), w = (r - vor) * Math.exp(-i / (n * 0.3)) * laut;
    vor = r;
    L[s + i] += w * 0.9; Rk[s + i] += w * 1.1;
  }
}
function snare(zeit, laut) {
  const s = Math.floor(zeit * RATE), n = Math.floor(0.16 * RATE);
  for (let i = 0; i < n && s + i < LAENGE; i++) {
    const huelle = Math.exp(-i / (n * 0.22));
    const w = (zufall() * 0.7 + Math.sin(2 * Math.PI * 190 * i / RATE) * 0.5) * huelle * laut;
    L[s + i] += w; Rk[s + i] += w;
  }
}
function pad(zeit, toene, dauer, laut) {
  const s = Math.floor(zeit * RATE), n = Math.floor(dauer * RATE);
  for (let i = 0; i < n && s + i < LAENGE; i++) {
    const a = Math.min(1, i / (0.3 * RATE)) * Math.min(1, (n - i) / (0.4 * RATE));
    let w = 0;
    toene.forEach((note, k) => { const fr = 440 * Math.pow(2, (note - 69) / 12); w += Math.sin(2 * Math.PI * fr * i / RATE + k) + 0.3 * Math.sin(4 * Math.PI * fr * i / RATE); });
    w *= a * laut / toene.length;
    L[s + i] += w; Rk[s + i] += w;
  }
}

const lied = LIEDER.sproutvale;
const ablauf = [
  ...lied.teile.p.slice(0, 2).map(t => [t, "leise"]),
  ...lied.teile.a.map(t => [t, "voll"]),
  ...lied.teile.b.map(t => [t, "voll"]),
  ...lied.teile.a.slice(0, 6).map(t => [t, "gross"]),
  [["F", [[77, 8]]], "ende"]
];

ablauf.forEach(([[akkordName, melodie], art], takt) => {
  const start = takt * TAKT;
  const akkord = lied.akkorde[akkordName];
  const z = i => start + i * ACHTEL;
  pad(start, akkord.toene.map(n => n + 12), TAKT, art === "leise" ? 0.09 : 0.04);
  if (art === "leise") {
    for (let i = 0; i < 8; i++) spiele("harfe", z(i), akkord.toene[i % 3] + 24, ACHTEL * 2.5, 0.16, i % 2 ? 0.3 : -0.3);
    return;
  }
  if (art === "ende") {
    spiele("bass", z(0), akkord.bass + 12, TAKT, 0.32);
    akkord.toene.forEach((n, k) => spiele("harfe", z(k * 0.5), n + 24, TAKT, 0.09, k - 1));
    spiele("glocke", z(0), 77, TAKT * 1.5, 0.08);
    return;
  }
  const extra = art === "gross" ? 1.15 : 1;
  spiele("bass", z(0), akkord.bass + 12, ACHTEL * 2.5, 0.34 * extra);
  spiele("bass", z(3), akkord.bass + 12, ACHTEL, 0.24 * extra);
  spiele("bass", z(4), akkord.bass + 19, ACHTEL * 1.5, 0.28 * extra);
  spiele("bass", z(6), akkord.bass + 12, ACHTEL * 2, 0.26 * extra);
  [0, 2, 4, 6].forEach((i, k) => spiele("marimba", z(i + 1), akkord.toene[k % 3] + 12, ACHTEL * 1.4, 0.05, k % 2 ? 0.35 : -0.35));
  [0, 4].forEach(i => spiele("trommel", z(i), 0, 0.4, 0.33 * extra));
  if (art === "gross") spiele("trommel", z(7), 0, 0.3, 0.2);
  [2, 6].forEach(i => snare(z(i), 0.11 * extra));
  for (let i = 0; i < 8; i++) hat(z(i), i % 2 ? 0.028 : 0.045);
  if (art === "gross") for (let i = 0; i < 8; i++) spiele("schellen", z(i) + 0.005, 0, 0.3, i % 2 ? 0.05 : 0.08);
  let pos = 0;
  melodie.forEach(([note, laenge]) => {
    if (note) {
      spiele("harfe", z(pos), note, ACHTEL * laenge * 1.6, 0.15 * extra);
      if (art === "gross") spiele("glocke", z(pos), note + 12, ACHTEL * laenge * 1.2, 0.05);
    }
    pos += laenge;
  });
});

const hall = (kanal, verz, staerke) => { const v = Math.floor(verz * RATE); for (let i = v; i < LAENGE; i++) kanal[i] += kanal[i - v] * staerke; };
hall(L, 0.311, 0.22); hall(Rk, 0.347, 0.22);
let spitze = 0;
for (let i = 0; i < LAENGE; i++) spitze = Math.max(spitze, Math.abs(L[i]), Math.abs(Rk[i]));
const faktor = 0.89 / spitze;
const ende = Math.floor((ablauf.length * TAKT + 1.5) * RATE);
const pcm = Buffer.alloc(Math.min(ende, LAENGE) * 4);
for (let i = 0; i < Math.min(ende, LAENGE); i++) {
  const ausblenden = i > ende - RATE * 1.2 ? (ende - i) / (RATE * 1.2) : 1;
  pcm.writeInt16LE(Math.round(Math.tanh(L[i] * faktor) * 32000 * ausblenden), i * 4);
  pcm.writeInt16LE(Math.round(Math.tanh(Rk[i] * faktor) * 32000 * ausblenden), i * 4 + 2);
}
fs.writeFileSync(path.join(__dirname, "musik.raw"), pcm);
execFileSync(FFMPEG, ["-v", "error", "-y", "-f", "s16le", "-ar", String(RATE), "-ac", "2", "-i", path.join(__dirname, "musik.raw"), path.join(__dirname, "musik.wav")]);
console.log("Takte: " + ablauf.length + ", Takt " + TAKT.toFixed(4) + " s, Laenge " + (ende / RATE).toFixed(1) + " s");
