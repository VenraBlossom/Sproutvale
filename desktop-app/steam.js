"use strict";

// ============================================================
// STEAM-ANBINDUNG (vorbereitet)
// Solange das Spiel noch keine Steam-App-ID hat, merkt sich diese Datei nur, was an Steam gemeldet
// wuerde (Erfolge, Status-Text "Rich Presence"), und schreibt es in die Konsole.
//
// Spaeter: "npm install steamworks.js" und in starte() z.B.
//   const steamworks = require("steamworks.js");
//   client = steamworks.init(DEINE_APP_ID);
// dann in erfolg(): client.achievement.activate(id) und in status(): client.localplayer.setRichPresence("status", text)
// Die Erfolg-IDs kommen aus dem Spiel (siehe steamErfolgId in script.js), z.B. "GOLD_1" oder "RECHNUNG_3".
// ============================================================

let client = null;
const gemeldet = new Set();

module.exports = {
    starte() {
        client = null;
    },
    erfolg(id) {
        if (gemeldet.has(id)) return;
        gemeldet.add(id);
        if (client) {
            // client.achievement.activate(id);
        } else {
            console.log("[Steam vorbereitet] Erfolg:", id);
        }
    },
    status(text) {
        if (client) {
            // client.localplayer.setRichPresence("steam_display", text);
        }
    }
};
