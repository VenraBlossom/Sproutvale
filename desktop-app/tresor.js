"use strict";

// ============================================================
// TRESOR: gekaufte Inhalte, Gems und eingeloeste Codes (nur Desktop-App, laeuft im Hauptprozess)
// - Liegt verschluesselt (AES-256-GCM) in save/tresor.dat. Wer die Datei von Hand aendert, macht sie nur kaputt:
//   eine Datei, die nicht zum Schluessel passt, zaehlt als leer.
// - Der Schluessel kommt aus desktop-app/geheim.txt. Diese Datei ist NICHT im Repo (.gitignore) und steckt beim
//   Bauen in der app.asar. Sie darf sich nie aendern, sonst koennen Spieler ihre Kaeufe nicht mehr lesen. Sichern!
// - Das Spiel (Renderer) darf hier nichts frei setzen: es kann nur Gems AUSGEBEN (Preise stehen hier),
//   Codes einloesen (Codes stehen hier als Pruefsumme) und den Stand lesen. Gems gutschreiben und das
//   Unterstuetzer-Paket freischalten geht nur ueber Steam (steam.js) oder einen Code.
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VERSION = 1;
// Preise in Gems (gleich wie im Spiel: DLC_KRISTALLE und LEGENDAER_KRISTALLE in js/haus.js / js/daten.js)
const PREIS_DLC = 500;
const PREIS_EINZELN = 50;
// Promocodes: SHA-256 von "sproutvale-code:" + CODE (Grossbuchstaben). Der Code selbst steht nirgends im Repo.
// Neuen Code anlegen: node -e "console.log(require('crypto').createHash('sha256').update('sproutvale-code:MEINCODE').digest('hex'))"
const CODES = [
    // BETAVALE: Beta-Tester-Begleiter, BETA Shirt und Endless
    { pruef: "de2954897ffb496230445a593cbbda6cd156edbf05da4f79362a7f32a1d1f8d9", beta: true, endlos: true, aktiv: true }
];

let schluessel = null;
let datei = null;
let stand = null;
let steamDlc = false;

function leererStand() {
    return { v: VERSION, gems: 0, gekauft: [], codes: [], beta: false, endlos: false, altUebernommen: false };
}

// Geheimnis lesen (oder beim allerersten Start auf dem Entwickler-PC anlegen)
function ladeSchluessel() {
    const pfad = path.join(__dirname, "geheim.txt");
    let geheim = "";
    try {
        geheim = fs.readFileSync(pfad, "utf8").trim();
    } catch (fehler) {
        geheim = "";
    }
    if (!geheim) {
        geheim = crypto.randomBytes(32).toString("hex");
        try {
            fs.writeFileSync(pfad, geheim + "\n", "utf8");
            console.warn("[Tresor] Neues Geheimnis in geheim.txt angelegt. Diese Datei sichern und nie aendern!");
        } catch (fehler) {
            console.warn("[Tresor] geheim.txt konnte nicht angelegt werden:", fehler.message);
        }
    }
    return crypto.scryptSync(geheim, "sproutvale-tresor-v1", 32);
}

function verschluessele(objekt) {
    const iv = crypto.randomBytes(12);
    const chiffre = crypto.createCipheriv("aes-256-gcm", schluessel, iv);
    const daten = Buffer.concat([chiffre.update(JSON.stringify(objekt), "utf8"), chiffre.final()]);
    return "SVT1." + Buffer.concat([iv, chiffre.getAuthTag(), daten]).toString("base64");
}

function entschluessele(text) {
    if (!text || !text.startsWith("SVT1.")) return null;
    try {
        const roh = Buffer.from(text.slice(5), "base64");
        const entziffer = crypto.createDecipheriv("aes-256-gcm", schluessel, roh.subarray(0, 12));
        entziffer.setAuthTag(roh.subarray(12, 28));
        const daten = Buffer.concat([entziffer.update(roh.subarray(28)), entziffer.final()]);
        return JSON.parse(daten.toString("utf8"));
    } catch (fehler) {
        return null; // falscher Schluessel oder von Hand geaendert
    }
}

// Gespeichert wird zweimal: tresor.dat und tresor.bak (falls eine Datei einmal kaputtgeht)
function speichere() {
    try {
        const inhalt = verschluessele(stand);
        fs.writeFileSync(datei.replace(/\.dat$/, ".bak"), inhalt, "utf8");
        fs.writeFileSync(datei + ".tmp", inhalt, "utf8");
        fs.renameSync(datei + ".tmp", datei);
    } catch (fehler) {
        console.warn("[Tresor] konnte nicht speichern:", fehler.message);
    }
}

// ---------- UEBERNAHME ALTER DATEIEN (bis Beta 0.4.x) ----------
// Damals gab es kaeufe.dat und beta.dat mit einer einfachen Pruefsumme. Beta-Tester behalten ihre Belohnung.
function altePruefsumme(text) {
    const salz = "sv-" + text.length + "-bl00m";
    let h1 = 0xdeadbeef ^ 0x5eed;
    let h2 = 0x41c6ce57 ^ 0x5eed;
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

function leseAltSigniert(roh) {
    try {
        const objekt = typeof roh === "string" ? JSON.parse(roh) : roh;
        if (!objekt || typeof objekt.daten !== "string" || altePruefsumme(objekt.daten) !== objekt.sig) return null;
        const text = objekt.daten.startsWith("{") || objekt.daten.startsWith("[") ? objekt.daten
            : Buffer.from(objekt.daten, "base64").toString("utf8");
        return JSON.parse(text);
    } catch (fehler) {
        return null;
    }
}

function uebernimmAlteDateien(ordner) {
    const betaDatei = path.join(ordner, "beta.dat");
    try {
        if (fs.existsSync(betaDatei)) {
            const beta = leseAltSigniert(fs.readFileSync(betaDatei, "utf8"));
            if (beta && beta.beta) stand.beta = true;
        }
    } catch (fehler) {
        // keine alte Datei
    }
}

module.exports = {
    starte(speicherOrdner) {
        schluessel = ladeSchluessel();
        datei = path.join(speicherOrdner, "tresor.dat");
        const lies = pfad => {
            try {
                return fs.existsSync(pfad) ? entschluessele(fs.readFileSync(pfad, "utf8")) : null;
            } catch (fehler) {
                return null;
            }
        };
        const sicherung = datei.replace(/\.dat$/, ".bak");
        stand = lies(datei) || lies(sicherung);
        if (!stand) {
            const neu = !fs.existsSync(datei);
            if (!neu) {
                // Ungueltige Datei aufheben (fuer den Support), dann leer anfangen
                console.warn("[Tresor] tresor.dat ist ungueltig und wird zurueckgesetzt.");
                try { fs.renameSync(datei, datei + ".ungueltig"); } catch (fehler) { /* egal */ }
            }
            stand = leererStand();
            if (neu) uebernimmAlteDateien(speicherOrdner);
            speichere();
        }
        stand = { ...leererStand(), ...stand };
    },
    // Steam meldet beim Start, ob das Unterstuetzer-Paket (DLC) gekauft ist
    setzeSteamDlc(besitz) {
        steamDlc = Boolean(besitz);
    },
    lesen() {
        return {
            gems: stand.gems,
            gekauft: [...stand.gekauft],
            beta: stand.beta,
            endlos: stand.endlos,
            dlc: steamDlc || stand.gekauft.includes("dlc"),
            codes: stand.codes.length
        };
    },
    // Mit Gems kaufen: "dlc" (Unterstuetzer-Paket) oder ein legendaerer Einzel-Inhalt "kategorie:id"
    kaufe(was) {
        was = String(was || "");
        if (!(was === "dlc" || /^[a-z_]+:[a-z0-9_]+$/i.test(was))) return { ok: false, grund: "ungueltig" };
        if (stand.gekauft.includes(was)) return { ok: false, grund: "schon" };
        const preis = was === "dlc" ? PREIS_DLC : PREIS_EINZELN;
        if (stand.gems < preis) return { ok: false, grund: "gems" };
        stand.gems -= preis;
        stand.gekauft.push(was);
        speichere();
        return { ok: true, stand: this.lesen() };
    },
    // Promocode einloesen (jeder Code nur einmal pro Spieler)
    code(text) {
        const sauber = String(text || "").trim().toUpperCase();
        const pruef = crypto.createHash("sha256").update("sproutvale-code:" + sauber).digest("hex");
        const code = CODES.find(c => c.pruef === pruef && c.aktiv);
        if (!code) return { ok: false, grund: "ungueltig" };
        if (stand.codes.includes(pruef)) return { ok: false, grund: "schon" };
        stand.codes.push(pruef);
        if (code.gems) stand.gems += code.gems;
        if (code.beta) stand.beta = true;
        if (code.endlos) stand.endlos = true;
        speichere();
        return { ok: true, belohnung: { gems: code.gems || 0, beta: Boolean(code.beta), endlos: Boolean(code.endlos) }, stand: this.lesen() };
    },
    // Gems gutschreiben: NUR fuer bestaetigte Kaeufe (Steam) aus dem Hauptprozess, nie vom Spiel aus
    gutschreiben(menge) {
        stand.gems += Math.max(0, Math.floor(Number(menge) || 0));
        speichere();
    },
    // Einmalig: Gems, Gekauftes und Codes aus dem alten Browser-Speicher des Spiels uebernehmen.
    // Grosszuegig, aber begrenzt: Bis Beta 0.4.x gab es keine echten Kaeufe, nur den alten Code (50 Gems).
    uebernimmAlt(daten) {
        if (stand.altUebernommen) return this.lesen();
        stand.altUebernommen = true;
        const gems = Number(leseAltSigniert(daten && daten.gems)) || 0;
        const gekauft = leseAltSigniert(daten && daten.gekauft);
        const beta = leseAltSigniert(daten && daten.beta);
        if (beta && beta.beta) stand.beta = true;
        if (Array.isArray(gekauft)) {
            gekauft.filter(was => typeof was === "string" && was !== "dlc" && /^[a-z_]+:[a-z0-9_]+$/i.test(was))
                .slice(0, 1).forEach(was => { if (!stand.gekauft.includes(was)) stand.gekauft.push(was); });
        }
        stand.gems += Math.max(0, Math.min(PREIS_EINZELN, Math.floor(gems)));
        speichere();
        return this.lesen();
    },
    // Nur in der Entwickler-Version (nicht in der fertigen App): Werte zum Testen setzen
    entwickler(art, wert) {
        if (art === "gems") stand.gems = Math.max(0, Math.floor(Number(wert) || 0));
        if (art === "dlc") stand.gekauft = wert ? [...new Set([...stand.gekauft, "dlc"])] : stand.gekauft.filter(w => w !== "dlc");
        if (art === "gekauft" && !stand.gekauft.includes(String(wert))) stand.gekauft.push(String(wert));
        if (art === "beta") stand.beta = Boolean(wert);
        if (art === "endlos") stand.endlos = Boolean(wert);
        if (art === "reset") Object.assign(stand, leererStand(), { altUebernommen: true });
        speichere();
        return this.lesen();
    }
};
