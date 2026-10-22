"use strict";

// ============================================================
// STEAM-ANBINDUNG (vorbereitet, schaltet sich selbst ein)
// Solange keine Steam-App-ID eingetragen ist oder steamworks.js fehlt, merkt sich diese Datei nur, was an
// Steam gemeldet wuerde, und schreibt es in die Konsole. Das Spiel laeuft ganz normal weiter.
//
// So wird Steam eingeschaltet (Anleitung auch in STEAM-UND-HANDY.md im Projektordner):
//   1. Im Ordner desktop-app:  npm install steamworks.js
//   2. Die App-ID von Steamworks unten in STEAM_KONFIG.appId eintragen (zum Testen ohne Steam zusaetzlich in
//      desktop-app/steam_appid.txt, die kommt nicht mit in die Steam-Version)
//   3. Die DLC-App-ID des Unterstuetzer-Pakets in STEAM_KONFIG.dlc eintragen
//   4. Die Erfolge in Steamworks anlegen (Liste: node werkzeuge/steam-erfolge.js)
// Die Erfolg-IDs kommen aus dem Spiel (steamErfolgId in script.js), z.B. "GOLD_1", "RECHNUNG_3", "POKAL_HOLZ".
// ============================================================

const fs = require("fs");
const path = require("path");

const STEAM_KONFIG = {
    // App-ID des Spiels aus Steamworks (0 = noch nicht angelegt). Muss hier stehen: die Steam-Version hat keine steam_appid.txt.
    appId: 0,
    // DLC-App-IDs aus Steamworks (0 = noch nicht angelegt)
    dlc: { unterstuetzer: 0 },
    // Gems: Steam kennt keine "Waehrung im Spiel" ohne eigenen Server. Vorbereitet ist der Weg ueber
    // den Steam-Shop: jedes Gem-Paket ist eine Seite im Shop (Item-Store), die das Overlay oeffnet.
    // Die Gutschrift kommt danach ueber den Steam-Inventar-Dienst (siehe Anleitung). 0 = noch nicht angelegt.
    gemPakete: { gems_100: 0, gems_500: 0, gems_1100: 0 }
};

let client = null;
let appId = 0;
const gemeldet = new Set();

// Woher die App-ID kommt: Umgebungsvariable zum Testen, sonst STEAM_KONFIG.appId, sonst die Kennung, die Steam beim
// Starten selbst setzt (SteamAppId), sonst steam_appid.txt (nur zum Testen ausserhalb von Steam)
function leseAppId() {
    if (process.env.SPROUTVALE_STEAM_APPID) return Number(process.env.SPROUTVALE_STEAM_APPID) || 0;
    if (STEAM_KONFIG.appId) return STEAM_KONFIG.appId;
    if (process.env.SteamAppId) return Number(process.env.SteamAppId) || 0;
    const kandidaten = [path.join(__dirname, "steam_appid.txt")];
    if (process.resourcesPath) kandidaten.push(path.join(process.resourcesPath, "steam_appid.txt"));
    for (const datei of kandidaten) {
        try {
            if (fs.existsSync(datei)) return Number(fs.readFileSync(datei, "utf8").trim()) || 0;
        } catch (fehler) {
            // weiter mit der naechsten Stelle
        }
    }
    return 0;
}

module.exports = {
    starte() {
        client = null;
        appId = leseAppId();
        if (!appId) return;
        try {
            // eslint-disable-next-line global-require
            const steamworks = require("steamworks.js");
            client = steamworks.init(appId);
            // Steam-Overlay (Umschalt+Tab) im Electron-Fenster
            if (steamworks.electronEnableSteamOverlay) steamworks.electronEnableSteamOverlay();
            console.log("[Steam] verbunden, App-ID", appId);
        } catch (fehler) {
            client = null;
            console.warn("[Steam] nicht verfuegbar:", fehler.message);
        }
    },
    aktiv() {
        return Boolean(client);
    },
    erfolg(id) {
        if (gemeldet.has(id)) return;
        gemeldet.add(id);
        if (!client) {
            console.log("[Steam vorbereitet] Erfolg:", id);
            return;
        }
        try {
            if (!client.achievement.isActivated(id)) client.achievement.activate(id);
        } catch (fehler) {
            console.warn("[Steam] Erfolg", id, fehler.message);
        }
    },
    status(text) {
        if (!client) return;
        try {
            client.localplayer.setRichPresence("steam_display", "#Status");
            client.localplayer.setRichPresence("status", String(text).slice(0, 250));
        } catch (fehler) {
            // Rich Presence ist nur Deko
        }
    },
    // Welche Pakete gehoeren dem Spieler auf Steam? (z.B. ["unterstuetzer"])
    dlcBesitz() {
        if (!client) return [];
        return Object.entries(STEAM_KONFIG.dlc)
            .filter(([, dlcId]) => dlcId && safe(() => client.apps.isDlcInstalled(dlcId)))
            .map(([name]) => name);
    },
    // Kann man hier mit echtem Geld kaufen?
    kassBereit() {
        return Boolean(client) && Object.values(STEAM_KONFIG.gemPakete).some(Boolean);
    },
    // Kauf starten: oeffnet die Shop-Seite im Steam-Overlay. Gutgeschrieben wird erst, wenn Steam den Kauf meldet.
    kaufe(paketId) {
        const itemId = STEAM_KONFIG.gemPakete[paketId];
        if (!client || !itemId) return { ok: false, grund: "nicht-eingerichtet" };
        const ok = safe(() => {
            client.overlay.activateToWebPage("https://store.steampowered.com/itemstore/" + appId + "/detail/" + itemId + "/");
            return true;
        });
        return { ok: Boolean(ok), offen: true };
    }
};

function safe(f) {
    try {
        return f();
    } catch (fehler) {
        return null;
    }
}
