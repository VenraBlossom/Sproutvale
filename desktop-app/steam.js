"use strict";


const fs = require("fs");
const path = require("path");

const STEAM_KONFIG = {
    appId: 0,
    dlc: { unterstuetzer: 0 },
    gemPakete: { gems_100: 0, gems_500: 0, gems_1100: 0 }
};

let client = null;
let appId = 0;
const gemeldet = new Set();

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
        }
    }
    return 0;
}

module.exports = {
    starte({ ueberSteamStarten = false } = {}) {
        client = null;
        appId = leseAppId();
        if (!appId) return true;
        try {
            const steamworks = require("steamworks.js");
            if (ueberSteamStarten && steamworks.restartAppIfNecessary(appId)) return false;
            client = steamworks.init(appId);
            if (steamworks.electronEnableSteamOverlay) steamworks.electronEnableSteamOverlay();
            console.log("[Steam] verbunden, App-ID", appId);
        } catch (fehler) {
            client = null;
            console.warn("[Steam] nicht verfuegbar:", fehler.message);
        }
        return true;
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
        }
    },
    dlcBesitz() {
        if (!client) return [];
        return Object.entries(STEAM_KONFIG.dlc)
            .filter(([, dlcId]) => dlcId && safe(() => client.apps.isDlcInstalled(dlcId)))
            .map(([name]) => name);
    },
    kassBereit() {
        return Boolean(client) && Object.values(STEAM_KONFIG.gemPakete).some(Boolean);
    },
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
