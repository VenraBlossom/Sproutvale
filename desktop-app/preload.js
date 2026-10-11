"use strict";

// Bruecke zwischen Spiel und Desktop-App. Im Spiel verfuegbar als window.sproutvaleDesktop
// (im normalen Browser gibt es das nicht, dann laeuft das Spiel ohne diese Extras).

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sproutvaleDesktop", {
    beenden: () => ipcRenderer.send("beenden"),
    // Auto-Patcher: meldet ein fertig geladenes Update; anwenden laedt das Spiel mit den neuen Dateien
    update: {
        wennBereit: rueckruf => {
            ipcRenderer.on("update-bereit", (_event, version) => rueckruf(String(version)));
            const schon = ipcRenderer.sendSync("update-status");
            if (schon) rueckruf(String(schon));
        },
        anwenden: () => ipcRenderer.send("update-anwenden")
    },
    vollbild: () => ipcRenderer.send("vollbild"),
    steam: {
        erfolg: id => ipcRenderer.send("steam-erfolg", String(id)),
        status: text => ipcRenderer.send("steam-status", String(text)),
        aktiv: () => ipcRenderer.sendSync("steam-aktiv"),
        // Pakete, die auf Steam gekauft wurden (z.B. ["unterstuetzer"])
        dlc: () => ipcRenderer.sendSync("steam-dlc")
    },
    // Echte Kaeufe (Gems) ueber Steam, sobald dort eingerichtet
    kasse: {
        bereit: () => ipcRenderer.sendSync("kasse-bereit"),
        kaufe: paketId => ipcRenderer.invoke("kasse-kaufe", String(paketId))
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
