"use strict";

// ============================================================
// SPROUTVALE DESKTOP (Electron)
// Oeffnet das Spiel als eigenes Fenster. Das Spiel wird direkt aus dem Projektordner geladen,
// darum ist jede Code-Aenderung beim naechsten Start sofort drin. Aendert sich eine Datei,
// waehrend das Spiel offen ist, laedt das Fenster automatisch neu.
//
// Tasten: F11 = Vollbild, F12 = Entwickler-Werkzeuge, Strg+R = neu laden
// ============================================================

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
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
    return kandidaten.find(ordner => fs.existsSync(path.join(ordner, "index.html"))) || kandidaten[kandidaten.length - 1];
}

const ORDNER = spielOrdner();
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
    sproutvale_meta_sandbox: ["persistedsavefile_1.json", "fortschritt"],
    sproutvale_sandbox: ["persistedsavefile_1.json", "run"],
    sproutvale_meta_sandbox_2: ["persistedsavefile_2.json", "fortschritt"],
    sproutvale_sandbox_2: ["persistedsavefile_2.json", "run"],
    sproutvale_meta_sandbox_3: ["persistedsavefile_3.json", "fortschritt"],
    sproutvale_sandbox_3: ["persistedsavefile_3.json", "run"]
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
        } else if (eingabe.key === "F12") {
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
    if (ORDNER === path.join(process.resourcesPath || "", "spiel")) return;
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

app.whenReady().then(() => {
    steam.starte();
    erstelleFenster();
    beobachteSpielordner();
});

app.on("window-all-closed", () => app.quit());
