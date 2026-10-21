"use strict";

// ============================================================
// SPROUTVALE: Liste aller Steam-Erfolge erzeugen (Test-Werkzeug, wird nicht mitgeliefert)
// Laedt das Spiel unsichtbar in Electron und schreibt werkzeuge/steam-erfolge.csv:
// API-Name (so meldet das Spiel den Erfolg an Steam) und Name/Beschreibung in allen Sprachen des Spiels.
// Die Spalten heissen wie die Sprachen in Steamworks (german, english, schinese, ...).
// Diese Liste traegt man in Steamworks unter "Statistiken und Errungenschaften" ein.
// Start:  desktop-app\node_modules\.bin\electron werkzeuge\steam-erfolge.js
// ============================================================

const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "sproutvale-erfolge-")));

const SPRACHEN = ["de", "en", "es", "fr", "it", "pt", "nl", "pl", "tr", "ru", "uk", "ja", "zh", "ko"];
// So heissen die Sprachen in Steamworks
const STEAM_NAMEN = { de: "german", en: "english", es: "spanish", fr: "french", it: "italian", pt: "brazilian", nl: "dutch", pl: "polish",
    tr: "turkish", ru: "russian", uk: "ukrainian", ja: "japanese", zh: "schinese", ko: "koreana" };
// Zwischen den Sprachen ist kurz kein Fenster offen: dann nicht beenden
app.on("window-all-closed", () => {});

async function erfolgeIn(sprache) {
    const fenster = new BrowserWindow({ show: false, width: 1280, height: 720 });
    await fenster.loadFile(path.join(__dirname, "..", "index.html")).catch(() => {});
    await new Promise(ok => setTimeout(ok, 1000));
    await fenster.webContents.executeJavaScript(`localStorage.setItem("sproutvale_einstellungen", JSON.stringify({ sprache: "${sprache}" })); true`);
    // Das Spiel laedt sich nach dem Sprachwechsel evtl. selbst neu: Fehler beim Laden sind dann egal
    await fenster.loadFile(path.join(__dirname, "..", "index.html")).catch(() => {});
    await new Promise(ok => setTimeout(ok, 2500));
    const liste = await fenster.webContents.executeJavaScript(`(() => {
        const zeilen = [];
        ERFOLG_KETTEN.filter(k => !k.nurSandbox).forEach(kette => kette.ziele.forEach((ziel, i) => {
            zeilen.push({ api: steamErfolgId(kette, i), name: kette.text(ziel), text: kette.text(ziel) });
        }));
        TROPHAEEN.forEach(tr => zeilen.push({ api: "POKAL_" + tr.id.toUpperCase(), name: tr.name, text: tf("Du hast den {0} gewonnen!", tr.name) }));
        return zeilen;
    })()`);
    fenster.destroy();
    return liste;
}

app.whenReady().then(async () => {
    const proSprache = {};
    for (const sprache of SPRACHEN) {
        proSprache[sprache] = await erfolgeIn(sprache);
        console.log(sprache + ": " + proSprache[sprache].length);
    }
    const feld = text => '"' + String(text).replace(/"/g, '""') + '"';
    const kopf = ["api"].concat(...SPRACHEN.map(s => ["name_" + STEAM_NAMEN[s], "beschreibung_" + STEAM_NAMEN[s]]));
    const zeilen = [kopf.join(",")];
    proSprache.de.forEach((eintrag, i) => {
        zeilen.push([feld(eintrag.api)].concat(...SPRACHEN.map(s => [feld(proSprache[s][i].name), feld(proSprache[s][i].text)])).join(","));
    });
    const ziel = path.join(__dirname, "steam-erfolge.csv");
    fs.writeFileSync(ziel, "﻿" + zeilen.join("\n") + "\n");
    console.log(proSprache.de.length + " Erfolge geschrieben: " + ziel);
    app.quit();
});
