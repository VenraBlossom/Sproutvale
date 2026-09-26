"use strict";

// Bruecke zwischen Spiel und Desktop-App. Im Spiel verfuegbar als window.sproutvaleDesktop
// (im normalen Browser gibt es das nicht, dann laeuft das Spiel ohne diese Extras).

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sproutvaleDesktop", {
    beenden: () => ipcRenderer.send("beenden"),
    vollbild: () => ipcRenderer.send("vollbild"),
    steam: {
        erfolg: id => ipcRenderer.send("steam-erfolg", String(id)),
        status: text => ipcRenderer.send("steam-status", String(text))
    },
    // Spielstand als Dateien im Ordner "save" im Benutzerordner (%APPDATA%/Sproutvale/save), bleibt bei neuen Versionen erhalten
    speicher: {
        lesen: () => ipcRenderer.sendSync("speicher-lesen"),
        schreiben: (schluessel, text) => ipcRenderer.send("speicher-schreiben", String(schluessel), String(text)),
        loeschen: schluessel => ipcRenderer.send("speicher-loeschen", String(schluessel)),
        pfad: () => ipcRenderer.sendSync("speicher-pfad"),
        oeffnen: () => ipcRenderer.send("speicher-oeffnen")
    }
});
