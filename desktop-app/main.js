"use strict";


const { app, BrowserWindow, ipcMain, shell, session, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const crypto = require("crypto");
const steam = require("./steam");
const tresor = require("./tresor");

const ENTWICKLER = !app.isPackaged || fs.existsSync(path.join(process.resourcesPath || "", "spielordner.txt"));
const VERTRIEB = (() => {
    try {
        return fs.readFileSync(path.join(process.resourcesPath || "", "vertrieb.txt"), "utf8").trim() || "itch";
    } catch (fehler) {
        return "itch";
    }
})();

function spielOrdner() {
    const kandidaten = [];
    if (process.env.SPROUTVALE_ORDNER) kandidaten.push(process.env.SPROUTVALE_ORDNER);
    if (app.isPackaged) {
        const datei = path.join(process.resourcesPath, "spielordner.txt");
        if (fs.existsSync(datei)) kandidaten.push(fs.readFileSync(datei, "utf8").trim());
        kandidaten.push(path.join(process.resourcesPath, "spiel.asar"));
        kandidaten.push(path.join(process.resourcesPath, "spiel"));
    }
    kandidaten.push(path.resolve(__dirname, ".."));
    const ordner = kandidaten.find(o => fs.existsSync(path.join(o, "index.html"))) || kandidaten[kandidaten.length - 1];
    if (istReleaseOrdner(ordner)) {
        const update = neuestesUpdate();
        if (update && vergleicheVersion(update.version, liesVersion(ordner)) > 0) return update.ordner;
    }
    return ordner;
}

const UPDATE_REPO = "VenraBlossom/Sproutvale";
const UPDATE_ORDNER = path.join(app.getPath("userData"), "updates");
const UPDATE_AUSLASSEN = [/^desktop-app\//, /^werkzeuge\//, /^\.github\//, /^\.git/, /\.md$/i, /^docs\//];

function istReleaseOrdner(ordner) {
    if (VERTRIEB === "steam") return false;
    return app.isPackaged && !process.env.SPROUTVALE_ORDNER && path.resolve(ordner) === path.resolve(process.resourcesPath, "spiel");
}

function versionTeile(text) {
    const treffer = String(text || "").match(/(\d+)\.(\d+)\.(\d+)/);
    return treffer ? treffer.slice(1).map(Number) : null;
}

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

function gitSha(puffer) {
    return crypto.createHash("sha1").update("blob " + puffer.length + "\0").update(puffer).digest("hex");
}

async function suchePatch() {
    if (!istReleaseOrdner(ORDNER) && !process.env.SPROUTVALE_UPDATE_TEST) return;
    const lokal = liesVersion(ORDNER);
    const tags = await holeDaten("https://api.github.com/repos/" + UPDATE_REPO + "/tags?per_page=100", true);
    try {
        const namen = new Set(tags.map(tag => String(tag.name).replace(/^v/, "")));
        fs.readdirSync(UPDATE_ORDNER).filter(name => !name.endsWith(".laden") && !namen.has(name))
            .forEach(name => fs.rmSync(path.join(UPDATE_ORDNER, name), { recursive: true, force: true }));
    } catch (fehler) {
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
    try {
        fs.readdirSync(UPDATE_ORDNER).filter(name => name !== version).forEach(name =>
            fs.rmSync(path.join(UPDATE_ORDNER, name), { recursive: true, force: true }));
    } catch (e) {
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


const SPEICHER_DATEIEN = {
    sproutvale_meta: ["fortschritt.json"],
    sproutvale_run: ["run.json"],
    sproutvale_einstellungen: ["einstellungen.json"],
    sproutvale_kaeufe: ["kaeufe.dat"],
    sproutvale_beta: ["beta.dat"],
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
    fs.rmSync(path.join(SPEICHER_ORDNER, "LIESMICH.txt"), { force: true });
    fs.writeFileSync(path.join(SPEICHER_ORDNER, "README.txt"), [
        "This is your Sproutvale save folder.",
        "It is kept automatically with every new version. To make a backup, just copy this folder somewhere else.",
        "",
        "fortschritt.json          = Story: moon blossoms, upgrades, plushies, achievements",
        "run.json                  = Story: the current run (day, gold, fields ...)",
        "persistedsavefile_1.json  = Endless, save 1 (progress and farm)",
        "persistedsavefile_2.json  = Endless, save 2",
        "persistedsavefile_3.json  = Endless, save 3",
        "koop_1.json to _3.json    = Endless in Duo (shared saves)",
        "einstellungen.json        = sound, display ...",
        "tresor.dat                = purchased content, gems and codes (encrypted, please do not change)",
        "",
        "----------",
        "",
        "Das ist dein Sproutvale-Spielstand.",
        "Er bleibt bei jeder neuen Version automatisch erhalten. Zum Sichern kannst du diesen Ordner einfach irgendwo hin kopieren.",
        "",
        "fortschritt.json          = Story: Mondblueten, Upgrades, Kuscheltiere, Erfolge",
        "run.json                  = Story: der laufende Run (Tag, Gold, Felder ...)",
        "persistedsavefile_1.json  = Endlos, Speicherstand 1 (Fortschritt und Hof)",
        "persistedsavefile_2.json  = Endlos, Speicherstand 2",
        "persistedsavefile_3.json  = Endlos, Speicherstand 3",
        "koop_1.json bis _3.json   = Endlos im Duo (gemeinsame Speicherstaende)",
        "einstellungen.json        = Klang, Anzeige ...",
        "tresor.dat                = gekaufte Inhalte, Gems und Codes (verschluesselt, bitte nicht aendern)",
        ""
    ].join("\r\n"), "utf8");
} catch (fehler) {
    console.warn("README konnte nicht geschrieben werden:", fehler.message);
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
            inhalt = JSON.stringify(JSON.parse(text), null, 2);
        } catch (fehler) {
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

tresor.starte(SPEICHER_ORDNER);
ipcMain.on("tresor-lesen", event => { event.returnValue = tresor.lesen(); });
ipcMain.on("tresor-kaufe", (event, was) => { event.returnValue = tresor.kaufe(String(was)); });
ipcMain.on("tresor-code", (event, text) => { event.returnValue = tresor.code(String(text)); });
ipcMain.on("tresor-alt", (event, daten) => { event.returnValue = tresor.uebernimmAlt(daten); });
ipcMain.on("tresor-entwickler", (event, art, wert) => {
    event.returnValue = ENTWICKLER ? tresor.entwickler(String(art), wert) : tresor.lesen();
});
ipcMain.on("entwickler", event => { event.returnValue = ENTWICKLER; });
ipcMain.on("speicher-oeffnen", () => shell.openPath(SPEICHER_ORDNER));

const FENSTER_DATEI = path.join(app.getPath("userData"), "fenster.json");

function liesFensterStand() {
    try {
        const stand = JSON.parse(fs.readFileSync(FENSTER_DATEI, "utf8"));
        if (stand.vollbild !== false) return { vollbild: true };
        const passt = screen.getAllDisplays().some(anzeige => {
            const b = anzeige.workArea;
            return stand.x >= b.x - 50 && stand.y >= b.y - 50 && stand.x + 200 <= b.x + b.width && stand.y + 100 <= b.y + b.height;
        });
        return passt ? stand : { vollbild: false };
    } catch (fehler) {
        return { vollbild: true };
    }
}

function merkeFensterStand() {
    if (!fenster || fenster.isDestroyed()) return;
    try {
        let vorher = {};
        try {
            vorher = JSON.parse(fs.readFileSync(FENSTER_DATEI, "utf8"));
        } catch (fehler) {
            vorher = {};
        }
        const vollbild = fenster.isFullScreen();
        const maximiert = fenster.isMaximized();
        const aussen = fenster.getBounds();
        const [breite, hoehe] = fenster.getContentSize();
        const b = vollbild || maximiert ? vorher : { x: aussen.x, y: aussen.y, width: breite, height: hoehe };
        fs.writeFileSync(FENSTER_DATEI, JSON.stringify({ vollbild, maximiert, x: b.x, y: b.y, width: b.width, height: b.height }));
    } catch (fehler) {
        console.warn("Fenstergroesse konnte nicht gemerkt werden:", fehler.message);
    }
}

function erstelleFenster() {
    const stand = liesFensterStand();
    fenster = new BrowserWindow({
        width: stand.width || 1600,
        height: stand.height || 900,
        x: stand.x,
        y: stand.y,
        minWidth: 1280,
        minHeight: 720,
        useContentSize: true,
        backgroundColor: "#86c457",
        title: "Sproutvale",
        icon: path.join(ORDNER, "assets", "Icon.png"),
        autoHideMenuBar: true,
        fullscreen: stand.vollbild,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: ENTWICKLER,
            backgroundThrottling: false
        }
    });
    fenster.setAspectRatio(16 / 9);
    fenster.setMenuBarVisibility(false);
    if (stand.maximiert && !stand.vollbild) fenster.maximize();
    fenster.on("close", merkeFensterStand);
    const startseite = path.join(ORDNER, "index.html");
    if (fs.existsSync(startseite)) {
        fenster.loadFile(startseite);
    } else {
        const text = "<body style='font-family:sans-serif;background:#86c457;color:#2e1a09;padding:40px'>" +
            "<h2>Sproutvale: game files not found</h2><p>Searched in: " + ORDNER + "</p>" +
            "<p>Please reinstall the game or verify the game files in Steam.</p><hr>" +
            "<h2>Sproutvale: Spieldateien nicht gefunden</h2><p>Gesucht in: " + ORDNER + "</p>" +
            "<p>Bitte das Spiel neu installieren oder in Steam die Spieldateien prüfen.</p></body>";
        fenster.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(text));
    }
    fenster.once("ready-to-show", () => fenster.show());

    fenster.webContents.on("before-input-event", (event, eingabe) => {
        if (eingabe.type !== "keyDown") return;
        if (eingabe.key === "F11") {
            fenster.setFullScreen(!fenster.isFullScreen());
            event.preventDefault();
        } else if (eingabe.key === "F12" && eingabe.control && eingabe.shift && ENTWICKLER) {
            fenster.webContents.toggleDevTools();
            event.preventDefault();
        }
    });

    const istWebseite = url => /^https?:\/\//i.test(url);
    fenster.webContents.setWindowOpenHandler(({ url }) => {
        if (istWebseite(url)) shell.openExternal(url);
        return { action: "deny" };
    });
    fenster.webContents.on("will-navigate", (event, url) => {
        if (url.startsWith("file:") || url.startsWith("data:")) return;
        event.preventDefault();
        if (istWebseite(url)) shell.openExternal(url);
    });
}

function beobachteSpielordner() {
    if (ORDNER === path.join(process.resourcesPath || "", "spiel") || ORDNER.startsWith(UPDATE_ORDNER)) return;
    const ignorieren = ["desktop-app", "node_modules", ".git"];
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
ipcMain.on("steam-aktiv", event => { event.returnValue = steam.aktiv(); });
ipcMain.on("steam-dlc", event => { event.returnValue = steam.dlcBesitz(); });
ipcMain.on("kasse-bereit", event => { event.returnValue = steam.kassBereit(); });
ipcMain.handle("kasse-kaufe", (_event, paketId) => steam.kaufe(String(paketId)));

ipcMain.on("update-anwenden", () => {
    const neu = spielOrdner();
    if (neu === ORDNER || !fenster) return;
    ORDNER = neu;
    fenster.loadFile(path.join(ORDNER, "index.html"));
});
ipcMain.on("update-status", event => { event.returnValue = bereitesUpdate; });

steam.starte();

app.whenReady().then(() => {
    const erlaubt = ["clipboard-sanitized-write", "fullscreen"];
    session.defaultSession.setPermissionRequestHandler((_inhalt, recht, antwort) => antwort(erlaubt.includes(recht)));
    tresor.setzeSteamDlc(steam.dlcBesitz().includes("unterstuetzer"));
    erstelleFenster();
    beobachteSpielordner();
    setTimeout(() => suchePatch().catch(fehler => console.warn("Update-Suche:", fehler.message)), 4000);
});

app.on("window-all-closed", () => app.quit());
