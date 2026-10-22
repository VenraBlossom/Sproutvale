"use strict";

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
        filter: quelle => !path.basename(quelle).startsWith("_") && !/\.(psd|kra|aseprite|ase|xcf)$/i.test(quelle)
    });
});
console.log("Spiel kopiert nach", ZIEL);
