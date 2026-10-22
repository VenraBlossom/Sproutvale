"use strict";


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

function neustart() {
    delete require.cache[require.resolve(MODUL)];
    const tresor = require(MODUL);
    tresor.starte(ordner);
    return tresor;
}

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

    const dat = path.join(ordner, "tresor.dat"), bak = path.join(ordner, "tresor.bak");
    const inhalt = fs.readFileSync(dat, "utf8");
    fs.writeFileSync(dat, inhalt.slice(0, 20) + (inhalt[20] === "A" ? "B" : "A") + inhalt.slice(21));
    t = neustart();
    pruefe("kaputte Datei: Sicherung greift", t.lesen().gems === 50 && t.lesen().dlc);

    fs.writeFileSync(dat, "SVT1.dGVzdA==");
    fs.writeFileSync(bak, "Unsinn");
    t = neustart();
    pruefe("beide kaputt: leer", t.lesen().gems === 0 && !t.lesen().dlc);
    pruefe("kaputte Datei aufgehoben", fs.existsSync(dat + ".ungueltig"));

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

try {
    const vm = require("vm");
    const code = fs.readFileSync(path.join(__dirname, "..", "js", "tresor.js"), "utf8") + "\n;globalThis.Tresor = Tresor;";
    const speicher = {};
    const neuerBrowser = () => {
        const kontext = {
            window: {}, console: { warn() {} }, atob, btoa, escape, unescape,
            localStorage: { getItem: k => (k in speicher ? speicher[k] : null), setItem: (k, v) => { speicher[k] = String(v); } }
        };
        vm.createContext(kontext);
        vm.runInContext(code, kontext);
        return kontext.Tresor;
    };
    let b = neuerBrowser();
    pruefe("Browser: leer", b.stand().gems === 0);
    pruefe("Browser: ungueltiger Kauf", b.kaufe("../x").grund === "ungueltig");
    b.gutschreibenBrowser(120);
    pruefe("Browser: gutschreiben", b.stand().gems === 120);
    pruefe("Browser: Einzelteil kaufen", b.kaufe("haus:sternenhaus").ok && b.stand().gems === 70);
    pruefe("Browser: DLC zu teuer", b.kaufe("dlc").grund === "gems");
    pruefe("Browser: Code", b.code("betavale").ok && b.stand().beta && b.stand().endlos && b.code("BETAVALE").grund === "schon");
    b = neuerBrowser();
    pruefe("Browser: bleibt nach Neustart", b.stand().gems === 70 && b.stand().gekauft.length === 1);
    const roh = JSON.parse(speicher.sproutvale_tresor);
    roh.daten = btoa(JSON.stringify({ gems: 99999 }));
    speicher.sproutvale_tresor = JSON.stringify(roh);
    b = neuerBrowser();
    pruefe("Browser: geaenderte Daten zaehlen nicht", b.stand().gems === 0);
} catch (e) {
    fehler++;
    console.log("ABBRUCH Browser: " + e.stack);
}

console.log(ok + " Pruefungen ok, " + fehler + " Fehler");
process.exitCode = fehler ? 1 : 0;
