"use strict";

// ============================================================
// SPROUTVALE: Balancing-Simulator ohne sichtbaren Browser (Test-Datei, wird nicht mitgeliefert)
// Startet das Spiel unsichtbar in Electron (ohne Bremse fuer Hintergrund-Fenster) und laesst den
// Balancing-Bot mehrere Story-Runs hintereinander spielen. Zwischen den Runs werden Mondblueten im
// Mondteich ausgegeben (immer das guenstigste Upgrade) und Gutscheine am Kuschel-Automaten eingeloest.
// Start:  desktop-app\node_modules\.bin\electron _sim-electron.js
// Optionen ueber Umgebungsvariablen: RUNS=8 KPS=4 TAGE=45
// ============================================================

const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "sproutvale-sim-")));
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");

const RUNS = Number(process.env.RUNS) || 6;
const KPS = Number(process.env.KPS) || 4;
const TAGE = Number(process.env.TAGE) || 45;
// Optional: Datei mit JS, das vor der Simulation im Spiel laeuft (Balancing-Varianten testen, ohne den Code zu aendern)
const PATCH = process.env.PATCH ? fs.readFileSync(process.env.PATCH, "utf8") : "";
// Optional: eigene Ergebnis-Dateien, damit mehrere Simulationen gleichzeitig laufen koennen
const NAME = process.env.NAME || "_sim-ergebnis";
// Optional: Rechnungen frueher bezahlen, sobald man FRUEH-mal so viel Gold hat (z.B. FRUEH=1.5), Standard: nie
const FRUEH = Number(process.env.FRUEH) || 0;

// Laeuft im Spiel
async function simulation(runs, kps, tage, frueh) {
    const intro = document.getElementById("intro");
    if (intro) intro.remove();
    meta.tutorial = "fertig";
    const ergebnis = [];
    for (let r = 0; r < runs; r++) {
        const start = Date.now();
        console.log("START " + (r + 1));
        const protokoll = await sproutvaleBot({ tage, klicksProSek: kps, tickMs: 250, meldung: false, abgeben: true, frueh });
        const eintrag = {
            run: r + 1, tag: run.tag, rechnungen: run.bezahlteRechnungen, gold: Math.round(run.gold),
            goldTag: [5, 10, 15, 20, 25, 30, 35, 40].map(t => (protokoll.find(p => p.tag === t + 1) || {}).gold ?? null),
            tage: protokoll.map(p => [p.tag - 1, p.gold, p.sternensamenHeute, p.sterne, p.sternStufen, p.marktStufen, p.klicks, p.pflanzen, p.rechnungen]),
            stil: run.stil || null
        };
        if (run.phase !== "runEnde") beendeRun(0, true);
        eintrag.mondblueten = meta.mondblueten;
        eintrag.level = bauernRang();
        eintrag.xp = meta.bauernXp;
        // Mondteich: immer das guenstigste sichtbare Upgrade kaufen
        for (let i = 0; i < 200; i++) {
            const angebot = META_UPGRADES.filter(d => (!d.sichtbar || d.sichtbar(meta)) && metaLevel(d.id) < (d.max ?? Infinity))
                .map(d => ({ d, k: kostenMitFaktor(d.basiskosten, d.faktor, metaLevel(d.id)) }))
                .filter(x => x.k <= meta.mondblueten).sort((a, b) => a.k - b.k)[0];
            if (!angebot) break;
            const vorher = meta.mondblueten;
            kaufeMetaUpgrade(angebot.d);
            if (meta.mondblueten === vorher) break;
        }
        while (meta.gutscheine > 0) zieheKuschel(true);
        document.querySelectorAll(".popup-huelle").forEach(h => h.remove());
        eintrag.upgrades = { ...meta.upgrades };
        eintrag.kuscheltiere = Object.keys(meta.kuscheltiere).length;
        eintrag.sekunden = Math.round((Date.now() - start) / 1000);
        ergebnis.push(eintrag);
        console.log("RUN " + JSON.stringify(eintrag));
    }
    return ergebnis;
}

app.whenReady().then(async () => {
    const fenster = new BrowserWindow({
        show: false, width: 1280, height: 720,
        webPreferences: { backgroundThrottling: false }
    });
    const gemeldet = new Set();
    const beginn = Date.now();
    let letzteMeldung = Date.now();
    const uhr = () => Math.round((Date.now() - beginn) / 60000) + "min";
    // Ergebnisse sofort mitschreiben (bleiben erhalten, auch wenn ein spaeterer Run haengt)
    const jsonl = path.join(__dirname, "..", NAME + ".jsonl");
    fs.writeFileSync(jsonl, "");
    // Waechter: 15 Minuten ohne jede Meldung = haengt, dann abbrechen
    setInterval(() => {
        if (Date.now() - letzteMeldung > 25 * 60000) {
            process.stdout.write("HAENGT seit 15 Minuten ohne Fortschritt (" + uhr() + "), Abbruch\n");
            app.exit(2);
        }
    }, 30000);
    fenster.webContents.on("console-message", (e, ...alt) => {
        // Neue Electron-Versionen: alles steckt im Ereignis, aeltere geben es als einzelne Werte
        const stufen = { verbose: 0, info: 1, warning: 2, error: 3 };
        const level = e.level !== undefined ? (stufen[e.level] ?? e.level) : alt[0];
        const text = String(e.message !== undefined ? e.message : alt[1]);
        const zeile = e.lineNumber !== undefined ? e.lineNumber : alt[2];
        const quelle = e.sourceId !== undefined ? e.sourceId : alt[3];
        if (/^(RUN|TAG|START) /.test(text)) letzteMeldung = Date.now();
        if (text.startsWith("RUN ")) {
            process.stdout.write(uhr() + " " + text + "\n");
            fs.appendFileSync(jsonl, text.slice(4) + "\n");
        } else if (text.startsWith("TAG ") || text.startsWith("START ")) process.stdout.write(uhr() + " " + text + "\n");
        else if (level >= 3) {
            const schluessel = text + quelle + zeile;
            if (!gemeldet.has(schluessel)) {
                gemeldet.add(schluessel);
                process.stdout.write("ERR " + text + " @ " + String(quelle).split("/").pop() + ":" + zeile + "\n");
            }
        }
    });
    await fenster.loadFile(path.join(__dirname, "..", "index.html"));
    await new Promise(ok => setTimeout(ok, 1500));
    const bot = fs.readFileSync(path.join(__dirname, "balancing-bot.js"), "utf8");
    await fenster.webContents.executeJavaScript(bot + "\n;true");
    if (PATCH) await fenster.webContents.executeJavaScript(PATCH + "\n;true");
    try {
        const ergebnis = await fenster.webContents.executeJavaScript(`(${simulation.toString()})(${RUNS}, ${KPS}, ${TAGE}, ${FRUEH})`);
        fs.writeFileSync(path.join(__dirname, "..", NAME + ".json"), JSON.stringify(ergebnis, null, 1));
        process.stdout.write("FERTIG\n");
    } catch (fehler) {
        process.stdout.write("FEHLER " + fehler.message + "\n");
    }
    app.quit();
});
