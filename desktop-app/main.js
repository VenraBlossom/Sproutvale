"use strict";

// ============================================================
// SPROUTVALE DESKTOP (Electron)
// Oeffnet das Spiel als eigenes Fenster. Das Spiel wird direkt aus dem Projektordner geladen,
// darum ist jede Code-Aenderung beim naechsten Start sofort drin. Aendert sich eine Datei,
// waehrend das Spiel offen ist, laedt das Fenster automatisch neu.
//
// Tasten: F11 = Vollbild, Strg+F12 in den Einstellungen (Reiter Klang) = Debug-Fenster (Strg+Umschalt+F12 = Entwickler-Werkzeuge), Strg+R = neu laden
// ============================================================

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const crypto = require("crypto");
const steam = require("./steam");

// Wo liegt das Spiel? 1) Umgebungsvariable, 2) spielordner.txt neben der .exe (Entwickler-Version),
// 3) mitgelieferter Ordner resources/spiel (Release-Version zum Weitergeben), 4) Ordner ueber desktop-app
function spielOrdner() {
    const kandidaten = [];
    if (process.env.SPROUTVALE_ORDNER) kandidaten.push(process.env.SPROUTVALE_ORDNER);
    if (app.isPackaged) {
        const datei = path.join(process.resourcesPath, "spielordner.txt");
        if (fs.existsSync(datei)) kandidaten.push(fs.readFileSync(datei, "utf8").trim());
        kandidaten.push(path.join(process.resourcesPath, "spiel"));
    }
    kandidaten.push(path.resolve(__dirname, ".."));
    const ordner = kandidaten.find(o => fs.existsSync(path.join(o, "index.html"))) || kandidaten[kandidaten.length - 1];
    // Release-Version: ein fertig geladenes, neueres Update hat Vorrang
    if (istReleaseOrdner(ordner)) {
        const update = neuestesUpdate();
        if (update && vergleicheVersion(update.version, liesVersion(ordner)) > 0) return update.ordner;
    }
    return ordner;
}

// ---------- AUTO-PATCHER (nur Release-Version) ----------
// Beim Start wird auf GitHub nach dem neuesten Versions-Tag (vX.Y.Z-alpha) geschaut. Ist er neuer, werden nur die
// geaenderten Spieldateien geladen (Vergleich ueber die Git-Pruefsumme) und in %APPDATA%/Sproutvale/updates/<version>
// abgelegt. Das Spiel fragt dann, ob es neu laden soll. Spielstaende liegen woanders und bleiben unberuehrt.
// Ist das Repo nicht oeffentlich oder kein Internet da, passiert einfach nichts.
const UPDATE_REPO = "VenraBlossom/Sproutvale";
const UPDATE_ORDNER = path.join(app.getPath("userData"), "updates");
const UPDATE_AUSLASSEN = [/^desktop-app\//, /^\.github\//, /^\.claude\//, /^\.git/, /\.md$/i, /^docs\//];

function istReleaseOrdner(ordner) {
    return app.isPackaged && !process.env.SPROUTVALE_ORDNER && path.resolve(ordner) === path.resolve(process.resourcesPath, "spiel");
}

// "Alpha 0.7.2" oder "v0.7.2-alpha" -> [0, 7, 2]
function versionTeile(text) {
    const treffer = String(text || "").match(/(\d+)\.(\d+)\.(\d+)/);
    return treffer ? treffer.slice(1).map(Number) : null;
}

// Phase einer Version: Alpha < Beta < fertige Version. Die Beta hat wieder bei 0.1 angefangen,
// darum zaehlt zuerst die Phase und erst dann die Nummer (sonst waere "Alpha 1.0.1" neuer als "Beta 0.4.2")
function versionPhase(text) {
    if (/alpha/i.test(String(text))) return 0;
    if (/beta/i.test(String(text))) return 1;
    return 2;
}

function vergleicheVersion(a, b) {
    const phase = versionPhase(a) - versionPhase(b);
    if (phase !== 0) return phase;
    const x = versionTeile(a);
    const y = versionTeile(b);
    if (!x || !y) return 0;
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
}

function liesVersion(ordner) {
    try {
        // Seit 0.7.3 liegen die Skripte in js/, aeltere Versionen hatten sie direkt im Spielordner
        const datei = [path.join(ordner, "js", "daten.js"), path.join(ordner, "daten.js")].find(p => fs.existsSync(p));
        const daten = fs.readFileSync(datei, "utf8");
        const treffer = daten.match(/SPIEL_VERSION\s*=\s*"([^"]+)"/);
        return treffer ? treffer[1] : "";
    } catch (fehler) {
        return "";
    }
}

function neuestesUpdate() {
    try {
        return fs.readdirSync(UPDATE_ORDNER)
            .filter(name => fs.existsSync(path.join(UPDATE_ORDNER, name, "fertig.txt")))
            .map(name => ({ version: name, ordner: path.join(UPDATE_ORDNER, name) }))
            .sort((a, b) => vergleicheVersion(b.version, a.version))[0] || null;
    } catch (fehler) {
        return null;
    }
}

function holeDaten(url, alsJson) {
    return new Promise((ok, fehler) => {
        const anfrage = https.get(url, { headers: { "User-Agent": "Sproutvale-Updater" }, timeout: 15000 }, antwort => {
            if (antwort.statusCode >= 300 && antwort.statusCode < 400 && antwort.headers.location) {
                antwort.resume();
                holeDaten(antwort.headers.location, alsJson).then(ok, fehler);
                return;
            }
            if (antwort.statusCode !== 200) {
                antwort.resume();
                fehler(new Error("HTTP " + antwort.statusCode + " bei " + url));
                return;
            }
            const teile = [];
            antwort.on("data", teil => teile.push(teil));
            antwort.on("end", () => {
                const puffer = Buffer.concat(teile);
                try {
                    ok(alsJson ? JSON.parse(puffer.toString("utf8")) : puffer);
                } catch (e) {
                    fehler(e);
                }
            });
        });
        anfrage.on("timeout", () => anfrage.destroy(new Error("Zeitueberschreitung")));
        anfrage.on("error", fehler);
    });
}

// Git-Pruefsumme einer Datei (so kann man ohne Download sehen, ob sie sich geaendert hat)
function gitSha(puffer) {
    return crypto.createHash("sha1").update("blob " + puffer.length + "\0").update(puffer).digest("hex");
}

async function suchePatch() {
    if (!istReleaseOrdner(ORDNER) && !process.env.SPROUTVALE_UPDATE_TEST) return;
    const lokal = liesVersion(ORDNER);
    const tags = await holeDaten("https://api.github.com/repos/" + UPDATE_REPO + "/tags?per_page=100", true);
    // Geladene Updates, deren Tag es auf GitHub nicht mehr gibt (z.B. alte Alpha-Versionen), wieder loeschen
    try {
        const namen = new Set(tags.map(tag => String(tag.name).replace(/^v/, "")));
        fs.readdirSync(UPDATE_ORDNER).filter(name => !name.endsWith(".laden") && !namen.has(name))
            .forEach(name => fs.rmSync(path.join(UPDATE_ORDNER, name), { recursive: true, force: true }));
    } catch (fehler) {
        // noch kein Update-Ordner
    }
    const neuester = tags.map(tag => tag.name).filter(name => /^v\d+\.\d+\.\d+/.test(name))
        .sort((a, b) => vergleicheVersion(b, a))[0];
    if (!neuester || vergleicheVersion(neuester, lokal) <= 0) return;
    const version = neuester.replace(/^v/, "");
    const ziel = path.join(UPDATE_ORDNER, version);
    if (fs.existsSync(path.join(ziel, "fertig.txt"))) {
        meldeUpdate(version);
        return;
    }
    const baum = await holeDaten("https://api.github.com/repos/" + UPDATE_REPO + "/git/trees/" + encodeURIComponent(neuester) + "?recursive=1", true);
    const dateien = (baum.tree || []).filter(e => e.type === "blob" && !UPDATE_AUSLASSEN.some(muster => muster.test(e.path)));
    if (dateien.length === 0 || !dateien.some(e => e.path === "index.html")) return;
    const temp = ziel + ".laden";
    fs.rmSync(temp, { recursive: true, force: true });
    for (const eintrag of dateien) {
        const zielDatei = path.join(temp, ...eintrag.path.split("/"));
        fs.mkdirSync(path.dirname(zielDatei), { recursive: true });
        // Unveraendert? Dann aus dem aktuellen Spielordner kopieren statt laden
        const alteDatei = path.join(ORDNER, ...eintrag.path.split("/"));
        if (fs.existsSync(alteDatei) && gitSha(fs.readFileSync(alteDatei)) === eintrag.sha) {
            fs.copyFileSync(alteDatei, zielDatei);
            continue;
        }
        const inhalt = await holeDaten("https://raw.githubusercontent.com/" + UPDATE_REPO + "/" + encodeURIComponent(neuester) + "/" +
            eintrag.path.split("/").map(encodeURIComponent).join("/"), false);
        if (gitSha(inhalt) !== eintrag.sha) throw new Error("Pruefsumme stimmt nicht: " + eintrag.path);
        fs.writeFileSync(zielDatei, inhalt);
    }
    fs.writeFileSync(path.join(temp, "fertig.txt"), neuester + "\n" + new Date().toISOString());
    fs.rmSync(ziel, { recursive: true, force: true });
    fs.renameSync(temp, ziel);
    // Alte Updates aufraeumen (nur das neueste behalten)
    try {
        fs.readdirSync(UPDATE_ORDNER).filter(name => name !== version).forEach(name =>
            fs.rmSync(path.join(UPDATE_ORDNER, name), { recursive: true, force: true }));
    } catch (e) {
        // egal
    }
    meldeUpdate(version);
}

let bereitesUpdate = null;
function meldeUpdate(version) {
    bereitesUpdate = version;
    if (fenster && !fenster.isDestroyed()) fenster.webContents.send("update-bereit", version);
}

let ORDNER = spielOrdner();
let fenster = null;

// ---------- SPIELSTAND-ORDNER "save" ----------
// Liegt im Benutzerordner (Windows: %APPDATA%\Sproutvale\save), getrennt vom Spielordner. Eine neue Version
// findet den Spielstand automatisch, man muss nichts kopieren. Die Dateien sind lesbares JSON.
// Endlos hat 3 Speicherstaende: persistedsavefile_1.json bis _3.json. Darin stehen Fortschritt und Hof zusammen.

// Schluessel im Spiel -> [Datei, Teil in der Datei (leer = die ganze Datei)]
const SPEICHER_DATEIEN = {
    sproutvale_meta: ["fortschritt.json"],
    sproutvale_run: ["run.json"],
    sproutvale_einstellungen: ["einstellungen.json"],
    sproutvale_kaeufe: ["kaeufe.dat"], // gekaufte Inhalte mit Pruefsumme (Hand-Aenderungen gelten nicht)
    sproutvale_beta: ["beta.dat"], // Beta-Tester (vor dem Release gespielt), bleibt fuer immer
    sproutvale_meta_sandbox: ["persistedsavefile_1.json", "fortschritt"],
    sproutvale_sandbox: ["persistedsavefile_1.json", "run"],
    sproutvale_meta_sandbox_2: ["persistedsavefile_2.json", "fortschritt"],
    sproutvale_sandbox_2: ["persistedsavefile_2.json", "run"],
    sproutvale_meta_sandbox_3: ["persistedsavefile_3.json", "fortschritt"],
    sproutvale_sandbox_3: ["persistedsavefile_3.json", "run"],
    sproutvale_koop_1: ["koop_1.json"],
    sproutvale_koop_2: ["koop_2.json"],
    sproutvale_koop_3: ["koop_3.json"]
};

const SPEICHER_ORDNER = path.join(app.getPath("userData"), "save");
try {
    fs.mkdirSync(SPEICHER_ORDNER, { recursive: true });
} catch (fehler) {
    console.warn("Spielstand-Ordner konnte nicht angelegt werden:", fehler.message);
}

function schreibeSicher(ziel, inhalt) {
    // erst in eine Zwischendatei, dann umbenennen: so ist die Datei nie halb geschrieben
    fs.writeFileSync(ziel + ".tmp", inhalt, "utf8");
    fs.renameSync(ziel + ".tmp", ziel);
}

function liesJson(pfad) {
    try {
        return fs.existsSync(pfad) ? JSON.parse(fs.readFileSync(pfad, "utf8")) : null;
    } catch (fehler) {
        console.warn("Spielstand-Datei nicht lesbar:", pfad);
        return null;
    }
}

// Umzug: Bis Alpha 0.6.1 lag der Ordner "save" neben der .exe (bzw. im Projektordner). Ist der neue Ordner
// noch leer, werden die alten Dateien einmal hierher kopiert.
(function zieheAltenSpielstandUm() {
    const alt = app.isPackaged ? path.join(path.dirname(process.execPath), "save") : path.join(ORDNER, "save");
    try {
        if (path.resolve(alt) === path.resolve(SPEICHER_ORDNER) || !fs.existsSync(alt)) return;
        const schonDa = fs.readdirSync(SPEICHER_ORDNER).some(datei => /\.(json|dat)$/.test(datei));
        if (schonDa) return;
        fs.readdirSync(alt).filter(datei => /\.(json|dat)$/.test(datei)).forEach(datei => {
            fs.copyFileSync(path.join(alt, datei), path.join(SPEICHER_ORDNER, datei));
        });
    } catch (fehler) {
        console.warn("Alter Spielstand konnte nicht uebernommen werden:", fehler.message);
    }
})();

// Alte Dateinamen: sandbox.json + sandbox-fortschritt.json werden zu persistedsavefile_1.json
(function wandleAlteNamenUm() {
    const altRun = path.join(SPEICHER_ORDNER, "sandbox.json");
    const altFortschritt = path.join(SPEICHER_ORDNER, "sandbox-fortschritt.json");
    const ziel = path.join(SPEICHER_ORDNER, "persistedsavefile_1.json");
    try {
        if (fs.existsSync(ziel) || (!fs.existsSync(altRun) && !fs.existsSync(altFortschritt))) return;
        const inhalt = {};
        const fortschritt = liesJson(altFortschritt);
        const run = liesJson(altRun);
        if (fortschritt) inhalt.fortschritt = fortschritt;
        if (run) inhalt.run = run;
        schreibeSicher(ziel, JSON.stringify(inhalt, null, 2));
        fs.rmSync(altRun, { force: true });
        fs.rmSync(altFortschritt, { force: true });
    } catch (fehler) {
        console.warn("Alte Endlos-Dateien konnten nicht umgewandelt werden:", fehler.message);
    }
})();

try {
    fs.writeFileSync(path.join(SPEICHER_ORDNER, "LIESMICH.txt"), "Das ist dein Sproutvale-Spielstand.\r\n\r\n" +
        "Er liegt hier im Benutzerordner und bleibt bei jeder neuen Version automatisch erhalten.\r\n" +
        "Du musst nichts kopieren. Zum Sichern kannst du diesen Ordner einfach irgendwo hin kopieren.\r\n\r\n" +
        "fortschritt.json          = Story: Mondblueten, Upgrades, Kuscheltiere, Erfolge\r\n" +
        "run.json                  = Story: der laufende Run (Tag, Gold, Felder ...)\r\n" +
        "persistedsavefile_1.json  = Endlos, Speicherstand 1 (Fortschritt und Hof)\r\n" +
        "persistedsavefile_2.json  = Endlos, Speicherstand 2\r\n" +
        "persistedsavefile_3.json  = Endlos, Speicherstand 3\r\n" +
        "koop_1.json bis _3.json   = Endlos im Duo (gemeinsame Speicherstaende)\r\n" +
        "einstellungen.json        = Klang, Anzeige ...\r\n" +
        "kaeufe.dat                = gekaufte Inhalte\r\n", "utf8");
} catch (fehler) {
    console.warn("LIESMICH konnte nicht geschrieben werden:", fehler.message);
}

ipcMain.on("speicher-lesen", event => {
    const daten = {};
    const dateiCache = {};
    Object.entries(SPEICHER_DATEIEN).forEach(([schluessel, [datei, teil]]) => {
        const pfad = path.join(SPEICHER_ORDNER, datei);
        try {
            if (teil) {
                if (!(datei in dateiCache)) dateiCache[datei] = liesJson(pfad);
                const inhalt = dateiCache[datei];
                if (inhalt && inhalt[teil] !== undefined) daten[schluessel] = JSON.stringify(inhalt[teil]);
            } else if (fs.existsSync(pfad)) {
                daten[schluessel] = fs.readFileSync(pfad, "utf8");
            }
        } catch (fehler) {
            console.warn("Spielstand-Datei nicht lesbar:", pfad);
        }
    });
    event.returnValue = daten;
});

ipcMain.on("speicher-schreiben", (_event, schluessel, text) => {
    const eintrag = SPEICHER_DATEIEN[schluessel];
    if (!eintrag) return;
    const [datei, teil] = eintrag;
    const ziel = path.join(SPEICHER_ORDNER, datei);
    try {
        if (teil) {
            const inhalt = liesJson(ziel) || {};
            try {
                inhalt[teil] = JSON.parse(text);
            } catch (fehler) {
                inhalt[teil] = text;
            }
            schreibeSicher(ziel, JSON.stringify(inhalt, null, 2));
            return;
        }
        let inhalt = text;
        try {
            inhalt = JSON.stringify(JSON.parse(text), null, 2); // schoen eingerueckt, damit man die Zahlen lesen kann
        } catch (fehler) {
            // kein JSON: so speichern, wie es ist
        }
        schreibeSicher(ziel, inhalt);
    } catch (fehler) {
        console.warn("Spielstand konnte nicht gespeichert werden:", fehler.message);
    }
});

ipcMain.on("speicher-loeschen", (_event, schluessel) => {
    const eintrag = SPEICHER_DATEIEN[schluessel];
    if (!eintrag) return;
    const [datei, teil] = eintrag;
    const ziel = path.join(SPEICHER_ORDNER, datei);
    try {
        if (teil) {
            const inhalt = liesJson(ziel);
            if (!inhalt) return;
            delete inhalt[teil];
            if (Object.keys(inhalt).length === 0) fs.rmSync(ziel, { force: true });
            else schreibeSicher(ziel, JSON.stringify(inhalt, null, 2));
            return;
        }
        fs.rmSync(ziel, { force: true });
    } catch (fehler) {
        console.warn("Spielstand-Datei konnte nicht geloescht werden:", fehler.message);
    }
});

ipcMain.on("speicher-pfad", event => { event.returnValue = SPEICHER_ORDNER; });
ipcMain.on("speicher-oeffnen", () => shell.openPath(SPEICHER_ORDNER));

function erstelleFenster() {
    fenster = new BrowserWindow({
        width: 1600,
        height: 900,
        minWidth: 1280,
        minHeight: 720,
        useContentSize: true,
        backgroundColor: "#86c457",
        title: "Sproutvale",
        icon: path.join(ORDNER, "assets", "Icon.png"),
        autoHideMenuBar: true,
        fullscreen: true, // Spiel startet im Vollbild (F11 wechselt)
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false
        }
    });
    fenster.setAspectRatio(16 / 9);
    fenster.setMenuBarVisibility(false);
    const startseite = path.join(ORDNER, "index.html");
    if (fs.existsSync(startseite)) {
        fenster.loadFile(startseite);
    } else {
        // Statt eines leeren gruenen Fensters: sagen, was fehlt
        const text = "<body style='font-family:sans-serif;background:#86c457;color:#2e1a09;padding:40px'>" +
            "<h2>Sproutvale: Spieldateien nicht gefunden</h2><p>Gesucht in: " + ORDNER + "</p>" +
            "<p>Bitte die Release-Version benutzen (npm run release) und den ganzen Ordner weitergeben.</p></body>";
        fenster.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(text));
    }
    fenster.once("ready-to-show", () => fenster.show());

    fenster.webContents.on("before-input-event", (event, eingabe) => {
        if (eingabe.type !== "keyDown") return;
        if (eingabe.key === "F11") {
            fenster.setFullScreen(!fenster.isFullScreen());
            event.preventDefault();
        } else if (eingabe.key === "F12" && eingabe.control && eingabe.shift) {
            // Nur fuer die Entwicklung versteckt: Strg+Umschalt+F12 = Entwickler-Werkzeuge. Strg+F12 im Klang-Reiter der Einstellungen oeffnet das Debug-Fenster.
            fenster.webContents.toggleDevTools();
            event.preventDefault();
        }
    });

    // Links (z.B. spaeter Store-Seite) im normalen Browser oeffnen, nicht im Spielfenster
    fenster.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });
}

// Auto-Neuladen: Aenderungen an Spieldateien laden das Fenster neu (nicht in desktop-app, .claude usw.)
// Nur in der Entwickler-Version (in der Release-Version aendert sich nichts).
function beobachteSpielordner() {
    if (ORDNER === path.join(process.resourcesPath || "", "spiel") || ORDNER.startsWith(UPDATE_ORDNER)) return;
    const ignorieren = ["desktop-app", ".claude", "node_modules", ".git"];
    let timer = null;
    try {
        fs.watch(ORDNER, { recursive: true }, (_art, datei) => {
            if (!datei || ignorieren.some(teil => datei.split(path.sep).includes(teil))) return;
            if (!/\.(js|css|html|png|woff2)$/i.test(datei)) return;
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (fenster && !fenster.isDestroyed()) fenster.webContents.reloadIgnoringCache();
            }, 400);
        });
    } catch (fehler) {
        console.warn("Spielordner kann nicht beobachtet werden:", fehler.message);
    }
}

ipcMain.on("beenden", () => app.quit());
ipcMain.on("vollbild", () => {
    if (fenster) fenster.setFullScreen(!fenster.isFullScreen());
});
ipcMain.on("steam-erfolg", (_event, id) => steam.erfolg(id));
ipcMain.on("steam-status", (_event, text) => steam.status(text));

// Update anwenden: Spielordner neu bestimmen und das Fenster mit den neuen Dateien laden
ipcMain.on("update-anwenden", () => {
    const neu = spielOrdner();
    if (neu === ORDNER || !fenster) return;
    ORDNER = neu;
    fenster.loadFile(path.join(ORDNER, "index.html"));
});
ipcMain.on("update-status", event => { event.returnValue = bereitesUpdate; });

app.whenReady().then(() => {
    steam.starte();
    erstelleFenster();
    beobachteSpielordner();
    // Nach dem Start in Ruhe nach einem Update schauen (Fehler sind egal, dann eben beim naechsten Mal)
    setTimeout(() => suchePatch().catch(fehler => console.warn("Update-Suche:", fehler.message)), 4000);
});

app.on("window-all-closed", () => app.quit());
