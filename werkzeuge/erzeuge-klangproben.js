"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const TOOLS = process.env.TOOLS || path.join(__dirname, "..", "..", "Tools");
const FFMPEG = path.join(TOOLS, "ffmpeg", "ffmpeg-master-latest-win64-gpl", "bin", "ffmpeg.exe");
const VSCO = path.join(TOOLS, "vsco2", "VSCO-2-CE-master");
const ZIEL = path.join(__dirname, "..", "js", "klangproben.js");
const RATE = 44100;

const INSTRUMENTE = {
    harfe: {
        laenge: 2.6, ziel: 0.35, ordner: "Strings/Harp",
        proben: [
            ["KSHarp_G3_mf.wav", 54.96], ["KSHarp_B3_mf.wav", 58.90], ["KSHarp_D4_mf.wav", 61.89], ["KSHarp_F4_mf.wav", 65.00],
            ["KSHarp_A4_mf.wav", 68.90], ["KSHarp_C5_mf.wav", 71.90], ["KSHarp_E5_mf.wav", 75.89], ["KSHarp_G5_mf.wav", 78.93],
            ["KSHarp_B5_mf.wav", 82.93], ["KSHarp_D6_mf.wav", 85.92], ["KSHarp_F6_mf.wav", 88.94], ["KSHarp_A6_mf.wav", 92.82]
        ]
    },
    marimba: {
        laenge: 1.4, ziel: 0.35, ordner: "Percussion/Marimba",
        proben: [
            ["Marimba_hit_Outrigger_C2_loud_01.wav", 48.01], ["Marimba_hit_Outrigger_G2_loud_01.wav", 54.98],
            ["Marimba_hit_Outrigger_B2_loud_01.wav", 59.02], ["Marimba_hit_Outrigger_F3_loud_01.wav", 65.00],
            ["Marimba_hit_Outrigger_C4_loud_01.wav", 72.04], ["Marimba_hit_Outrigger_G4_loud_01.wav", 78.98],
            ["Marimba_hit_Outrigger_B4_loud_01.wav", 83.00]
        ]
    },
    glocke: {
        laenge: 2.4, ziel: 0.3, ordner: "Percussion/Glock",
        proben: [
            ["glock_medium_G4.wav", 79.08], ["glock_medium_C5.wav", 84.12], ["glock_medium_G5.wav", 91.12],
            ["glock_medium_C6.wav", 96.15], ["glock_medium_G6.wav", 103.16]
        ]
    },
    bass: {
        laenge: 1.5, ziel: 0.35, ordner: "Strings/Solo Contrabass/Pizz",
        proben: [
            ["BKCtbss_Pizz_E1_v1_rr1.wav", 39.86], ["BKCtbss_Pizz_G#1_v1_rr1.wav", 44.0], ["BKCtbss_Pizz_C#2_v1_rr1.wav", 49.05],
            ["BKCtbss_Pizz_E2_v1_rr1.wav", 52.01], ["BKCtbss_Pizz_G#2_v1_rr1.wav", 56.0], ["BKCtbss_Pizz_B2_v1_rr1.wav", 58.90]
        ]
    },
    trommel: {
        laenge: 0.45, ziel: 0.35, messen: 0.12, ordner: "Percussion",
        proben: [["BDrumNewhit_v3_rr1_Sum.wav", 0]]
    },
    schellen: {
        laenge: 0.7, ziel: 0.3, messen: 0.15, ordner: "Percussion",
        proben: [["Sleighbells_Hit_v1_rr1_Mid.wav", 0]]
    }
};

function lade(datei) {
    const roh = execFileSync(FFMPEG, ["-v", "error", "-i", datei, "-ac", "1", "-ar", String(RATE), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
    return new Float32Array(roh.buffer, roh.byteOffset, roh.length / 4);
}

function bearbeite(x, laenge, ziel, messen) {
    let spitze = 0;
    for (const w of x) spitze = Math.max(spitze, Math.abs(w));
    let anfang = 0;
    while (anfang < x.length && Math.abs(x[anfang]) < spitze * 0.02) anfang++;
    anfang = Math.max(0, anfang - 30);
    const n = Math.min(x.length - anfang, Math.round(laenge * RATE));
    const y = new Float32Array(n);
    const ausblenden = Math.round(n * 0.35);
    for (let i = 0; i < n; i++) {
        let w = x[anfang + i];
        if (i < 30) w *= i / 30;
        if (i > n - ausblenden) w *= 0.5 + 0.5 * Math.cos(Math.PI * (i - (n - ausblenden)) / ausblenden);
        y[i] = w;
    }
    let max = 0;
    for (const w of y) max = Math.max(max, Math.abs(w));
    for (let i = 0; i < n; i++) y[i] *= 0.95 / max;
    const m = Math.min(n, Math.round((messen || 0.25) * RATE));
    let summe = 0;
    for (let i = 0; i < m; i++) summe += y[i] * y[i];
    return { daten: y, staerke: ziel / Math.sqrt(summe / m) };
}

function alsWav(y) {
    const puffer = Buffer.alloc(44 + y.length * 2);
    puffer.write("RIFF", 0);
    puffer.writeUInt32LE(36 + y.length * 2, 4);
    puffer.write("WAVEfmt ", 8);
    puffer.writeUInt32LE(16, 16);
    puffer.writeUInt16LE(1, 20);
    puffer.writeUInt16LE(1, 22);
    puffer.writeUInt32LE(RATE, 24);
    puffer.writeUInt32LE(RATE * 2, 28);
    puffer.writeUInt16LE(2, 32);
    puffer.writeUInt16LE(16, 34);
    puffer.write("data", 36);
    puffer.writeUInt32LE(y.length * 2, 40);
    for (let i = 0; i < y.length; i++) puffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(y[i] * 32767))), 44 + i * 2);
    return puffer;
}

const arbeit = fs.mkdtempSync(path.join(os.tmpdir(), "sproutvale-klang-"));
const ausgabe = {};
let bytes = 0;
try {
    Object.entries(INSTRUMENTE).forEach(([name, instrument]) => {
        ausgabe[name] = instrument.proben.map(([datei, note], i) => {
            const { daten, staerke } = bearbeite(lade(path.join(VSCO, instrument.ordner, datei)), instrument.laenge, instrument.ziel, instrument.messen);
            const wav = path.join(arbeit, name + i + ".wav");
            const mp3 = path.join(arbeit, name + i + ".mp3");
            fs.writeFileSync(wav, alsWav(daten));
            execFileSync(FFMPEG, ["-v", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "64k", "-ac", "1", mp3]);
            const inhalt = fs.readFileSync(mp3);
            bytes += inhalt.length;
            return [note, Math.round(staerke * 1000) / 1000, inhalt.toString("base64")];
        });
        console.log(name + ": " + instrument.proben.length + " Proben");
    });
} finally {
    fs.rmSync(arbeit, { recursive: true, force: true });
}

const zeilen = Object.entries(ausgabe).map(([name, liste]) =>
    "    " + name + ": [\n" + liste.map(([note, staerke, daten]) => "        [" + note + ", " + staerke + ", \"" + daten + "\"]").join(",\n") + "\n    ]");
fs.writeFileSync(ZIEL, "\"use strict\";\n\nconst KLANGPROBEN = {\n" + zeilen.join(",\n") + "\n};\n");
console.log("Fertig: " + Math.round(bytes / 1024) + " KB MP3, " + Math.round(fs.statSync(ZIEL).size / 1024) + " KB in " + path.basename(ZIEL));
