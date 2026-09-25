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
// Liegt neben der Sproutvale.exe (Entwickler-Version: im Projektordner). Wer eine neue Version herunterlaedt,
// kopiert einfach diesen Ordner hinein. Darf dort nicht geschrieben werden (z.B. unter "Programme"),
// wird der Benutzerordner genommen. Die Dateien sind lesbares JSON (Tag, Gold, Mondblueten ...).

const SPEICHER_DATEIEN = {
    sproutvale_meta: "fortschritt.json",
    sproutvale_meta_sandbox: "sandbox-fortschritt.json",
    sproutvale_run: "run.json",
    sproutvale_sandbox: "sandbox.json",
    sproutvale_einstellungen: "einstellungen.json"
};

function findeSpeicherOrdner() {
    const kandidaten = [
        app.isPackaged ? path.join(path.dirname(process.execPath), "save") : path.join(ORDNER, "save"),
        path.join(app.getPath("userData"), "save")
    ];
    for (const ordner of kandidaten) {
        try {
            fs.mkdirSync(ordner, { recursive: true });
            fs.accessSync(ordner, fs.constants.W_OK);
            return ordner;
        } catch (fehler) {
            console.warn("Spielstand-Ordner nicht beschreibbar:", ordner);
        }
    }
    return kandidaten[kandidaten.length - 1];
}

const SPEICHER_ORDNER = findeSpeicherOrdner();

try {
    const liesmich = path.join(SPEICHER_ORDNER, "LIESMICH.txt");
    if (!fs.existsSync(liesmich)) {
        fs.writeFileSync(liesmich, "Das ist dein Sproutvale-Spielstand.\r\n\r\n" +
            "Neue Version heruntergeladen? Kopiere diesen ganzen Ordner \"save\" in den Ordner der neuen Version\r\n" +
            "(neben die Sproutvale.exe). Beim naechsten Start ist alles wieder da.\r\n\r\n" +
            "fortschritt.json         = Mondblueten, Upgrades, Kuscheltiere, Erfolge (Standard)\r\n" +
            "run.json                 = der laufende Run (Tag, Gold, Felder ...)\r\n" +
            "sandbox.json             = die laufende Sandbox\r\n" +
            "sandbox-fortschritt.json = Fortschritt der Sandbox\r\n" +
            "einstellungen.json       = Klang, Anzeige ...\r\n", "utf8");
    }
} catch (fehler) {
    console.warn("LIESMICH konnte nicht geschrieben werden:", fehler.message);
}

ipcMain.on("speicher-lesen", event => {
    const daten = {};
    Object.entries(SPEICHER_DATEIEN).forEach(([schluessel, datei]) => {
        const pfad = path.join(SPEICHER_ORDNER, datei);
        try {
            if (fs.existsSync(pfad)) daten[schluessel] = fs.readFileSync(pfad, "utf8");
        } catch (fehler) {
            console.warn("Spielstand-Datei nicht lesbar:", pfad);
        }
    });
    event.returnValue = daten;
});

ipcMain.on("speicher-schreiben", (_event, schluessel, text) => {
    const datei = SPEICHER_DATEIEN[schluessel];
    if (!datei) return;
    let inhalt = text;
    try {
        inhalt = JSON.stringify(JSON.parse(text), null, 2); // schoen eingerueckt, damit man die Zahlen lesen kann
    } catch (fehler) {
        // kein JSON: so speichern, wie es ist
    }
    const ziel = path.join(SPEICHER_ORDNER, datei);
    try {
        // erst in eine Zwischendatei, dann umbenennen: so ist die Datei nie halb geschrieben
        fs.writeFileSync(ziel + ".tmp", inhalt, "utf8");
        fs.renameSync(ziel + ".tmp", ziel);
    } catch (fehler) {
        console.warn("Spielstand konnte nicht gespeichert werden:", fehler.message);
    }
});

ipcMain.on("speicher-loeschen", (_event, schluessel) => {
    const datei = SPEICHER_DATEIEN[schluessel];
    if (!datei) return;
    try {
        fs.rmSync(path.join(SPEICHER_ORDNER, datei), { force: true });
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
        icon: path.join(ORDNER, "Icon.png"),
        autoHideMenuBar: true,
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
