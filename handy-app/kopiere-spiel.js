"use strict";

// Kopiert das Spiel (index.html, js, css, assets) in den Ordner www, den Capacitor in die App packt.
// Test-Dateien (mit "_" am Anfang), Werkzeuge und die Desktop-App kommen nicht mit.
const fs = require("fs");
const path = require("path");

const PROJEKT = path.resolve(__dirname, "..");
const ZIEL = path.join(__dirname, "www");

fs.rmSync(ZIEL, { recursive: true, force: true });
fs.mkdirSync(ZIEL, { recursive: true });
fs.copyFileSync(path.join(PROJEKT, "index.html"), path.join(ZIEL, "index.html"));
["js", "css", "assets"].forEach(ordner => {
    fs.cpSync(path.join(PROJEKT, ordner), path.join(ZIEL, ordner), {
        recursive: true,
        filter: quelle => !path.basename(quelle).startsWith("_")
    });
});
console.log("Spiel kopiert nach", ZIEL);
