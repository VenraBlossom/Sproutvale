"use strict";


const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sproutvaleDesktop", {
    beenden: () => ipcRenderer.send("beenden"),
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
        dlc: () => ipcRenderer.sendSync("steam-dlc")
    },
    kasse: {
        bereit: () => ipcRenderer.sendSync("kasse-bereit"),
        kaufe: paketId => ipcRenderer.invoke("kasse-kaufe", String(paketId))
    },
    tresor: {
        lesen: () => ipcRenderer.sendSync("tresor-lesen"),
        kaufe: was => ipcRenderer.sendSync("tresor-kaufe", String(was)),
        code: text => ipcRenderer.sendSync("tresor-code", String(text)),
        uebernimmAlt: daten => ipcRenderer.sendSync("tresor-alt", daten),
        entwickler: (art, wert) => ipcRenderer.sendSync("tresor-entwickler", String(art), wert)
    },
    entwickler: () => ipcRenderer.sendSync("entwickler"),
    speicher: {
        lesen: () => ipcRenderer.sendSync("speicher-lesen"),
        schreiben: (schluessel, text) => ipcRenderer.send("speicher-schreiben", String(schluessel), String(text)),
        loeschen: schluessel => ipcRenderer.send("speicher-loeschen", String(schluessel)),
        pfad: () => ipcRenderer.sendSync("speicher-pfad"),
        oeffnen: () => ipcRenderer.send("speicher-oeffnen")
    }
});
