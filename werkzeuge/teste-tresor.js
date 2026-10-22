"use strict";

// ============================================================
// SPROUTVALE: Test fuer den Tresor (Kaeufe, Gems, Codes), laeuft in normalem Node, ohne Electron (wird nicht mitgeliefert)
// Start (im Projektordner):  node werkzeuge/teste-tresor.js
// Benutzt einen leeren Ordner im Temp-Verzeichnis, echte Spielstaende werden nicht angefasst.
// Braucht desktop-app/geheim.txt (wird sonst wie in der App angelegt).
// ============================================================

const fs = require("fs");
const os = require("os");
const path = require("path");

const MODUL = path.join(__dirname, "..", "desktop-app", "tresor.js");
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), "sproutvale-tresortest-"));
let fehler = 0, ok = 0;

function pruefe(name, bedingung) {
    if (bedingung) ok++;
    else { fehler++; console.log("FEHLER: " + name); }
}

// Wie ein Neustart der App: Modul frisch laden und starten
function neustart() {
    delete require.cache[require.resolve(MODUL)];
    const tresor = require(MODUL);
    tresor.starte(ordner);
    return tresor;
}

// Alte Pruefsumme (bis Beta 0.4.x), nur um alte Daten fuer den Test zu erzeugen
function altePruefsumme(text) {
    const salz = "sv-" + text.length + "-bl00m";
    let h1 = 0xdeadbeef ^ 0x5eed, h2 = 0x41c6ce57 ^ 0x5eed;
    const eingabe = salz + text + salz;
    for (let i = 0; i < eingabe.length; i++) {
        const c = eingabe.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 2654435761);
        h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
// So hat das alte Spiel gespeichert: Inhalt als JSON, Base64-kodiert, dazu die Pruefsumme
const altSigniert = wert => { const daten = Buffer.from(JSON.stringify(wert)).toString("base64"); return JSON.stringify({ daten, sig: altePruefsumme(daten) }); };

try {
    let t = neustart();
    pruefe("leer am Anfang", t.lesen().gems === 0 && !t.lesen().dlc && !t.lesen().beta);
    pruefe("ohne Gems nichts kaufen", t.kaufe("dlc").grund === "gems");
    pruefe("ungueltiger Kauf", t.kaufe("../boese").grund === "ungueltig" && t.kaufe("").grund === "ungueltig");

    t.gutschreiben(600);
    pruefe("gutschreiben", t.lesen().gems === 600);
    pruefe("DLC kaufen", t.kaufe("dlc").ok && t.lesen().gems === 100 && t.lesen().dlc);
    pruefe("DLC nicht doppelt", t.kaufe("dlc").grund === "schon" && t.lesen().gems === 100);
    pruefe("Einzelteil kaufen", t.kaufe("haustier:mantarochen").ok && t.lesen().gems === 50);
    t.gutschreiben(-1000);
    pruefe("keine negativen Gutschriften", t.lesen().gems === 50);

    pruefe("Code klein geschrieben", t.code(" betavale ").ok && t.lesen().beta && t.lesen().endlos);
    pruefe("Code nur einmal", t.code("BETAVALE").grund === "schon");
    pruefe("falscher Code", t.code("GIBMIRGEMS").grund === "ungueltig");

    t = neustart();
    pruefe("bleibt nach Neustart", t.lesen().gems === 50 && t.lesen().dlc && t.lesen().beta && t.lesen().gekauft.length === 2);

    // Datei von Hand aendern: dann gilt die Sicherung
    const dat = path.join(ordner, "tresor.dat"), bak = path.join(ordner, "tresor.bak");
    const inhalt = fs.readFileSync(dat, "utf8");
    fs.writeFileSync(dat, inhalt.slice(0, 20) + (inhalt[20] === "A" ? "B" : "A") + inhalt.slice(21));
    t = neustart();
    pruefe("kaputte Datei: Sicherung greift", t.lesen().gems === 50 && t.lesen().dlc);

    // Beide Dateien kaputt: leer anfangen, kaputte Datei aufheben
    fs.writeFileSync(dat, "SVT1.dGVzdA==");
    fs.writeFileSync(bak, "Unsinn");
    t = neustart();
    pruefe("beide kaputt: leer", t.lesen().gems === 0 && !t.lesen().dlc);
    pruefe("kaputte Datei aufgehoben", fs.existsSync(dat + ".ungueltig"));

    // Uebernahme aus dem alten Browser-Speicher: begrenzt und nur einmal
    const alt = { gems: altSigniert(5000), gekauft: altSigniert(["dlc", "haustier:a", "haustier:b"]), beta: altSigniert({ beta: true }) };
    let stand = t.uebernimmAlt(alt);
    pruefe("alt: Gems begrenzt", stand.gems === 50);
    pruefe("alt: kein DLC, nur 1 Teil", !stand.dlc && stand.gekauft.length === 1);
    pruefe("alt: Beta bleibt", stand.beta);
    stand = t.uebernimmAlt(alt);
    pruefe("alt: nur einmal", stand.gems === 50);
    pruefe("alt: gefaelschte Pruefsumme zaehlt nicht",
        (neustart(), true) && (() => { fs.rmSync(dat); fs.rmSync(bak); const n = neustart(); return n.uebernimmAlt({ gems: JSON.stringify({ daten: "9999", sig: "x" }) }).gems === 0; })());
} catch (e) {
    fehler++;
    console.log("ABBRUCH: " + e.stack);
} finally {
    fs.rmSync(ordner, { recursive: true, force: true });
}

console.log(ok + " Pruefungen ok, " + fehler + " Fehler");
process.exitCode = fehler ? 1 : 0;
