"use strict";


function kaufPruefsumme(text) {
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

const TRESOR_ALT = { gems: "sproutvale_gems", gekauft: "sproutvale_gekauft", codes: "sproutvale_codes", beta: "sproutvale_beta" };

const Tresor = (() => {
    const desktop = window.sproutvaleDesktop && window.sproutvaleDesktop.tresor ? window.sproutvaleDesktop.tresor : null;
    let zwischen = null;

    const BROWSER_KEY = "sproutvale_tresor";
    const BROWSER_CODES = [{ pruef: kaufPruefsumme("code:BETAVALE"), beta: true, endlos: true }];
    const PREIS_DLC = 500;
    const PREIS_EINZELN = 50;

    function browserLeer() {
        return { gems: 0, gekauft: [], codes: [], beta: false, endlos: false, altUebernommen: false };
    }
    function browserLesen() {
        try {
            const roh = JSON.parse(localStorage.getItem(BROWSER_KEY));
            if (roh && typeof roh.daten === "string" && kaufPruefsumme(roh.daten) === roh.sig) {
                return { ...browserLeer(), ...JSON.parse(decodeURIComponent(escape(atob(roh.daten)))) };
            }
        } catch (fehler) {
        }
        return browserLeer();
    }
    function browserSchreiben(stand) {
        const daten = btoa(unescape(encodeURIComponent(JSON.stringify(stand))));
        try {
            localStorage.setItem(BROWSER_KEY, JSON.stringify({ daten, sig: kaufPruefsumme(daten) }));
        } catch (fehler) {
            console.warn("Tresor konnte nicht speichern", fehler);
        }
    }
    function browserOeffentlich(stand) {
        return { gems: stand.gems, gekauft: [...stand.gekauft], beta: stand.beta, endlos: stand.endlos,
            dlc: stand.gekauft.includes("dlc"), codes: stand.codes.length };
    }
    function altLesen(schluessel) {
        try {
            const roh = JSON.parse(localStorage.getItem(schluessel));
            if (!roh || typeof roh.daten !== "string" || kaufPruefsumme(roh.daten) !== roh.sig) return null;
            const text = roh.daten.startsWith("{") || roh.daten.startsWith("[") ? roh.daten : decodeURIComponent(escape(atob(roh.daten)));
            return JSON.parse(text);
        } catch (fehler) {
            return null;
        }
    }

    const browser = {
        lesen: () => browserOeffentlich(browserLesen()),
        kaufe(was) {
            was = String(was || "");
            if (!(was === "dlc" || /^[a-z_]+:[a-z0-9_]+$/i.test(was))) return { ok: false, grund: "ungueltig" };
            const stand = browserLesen();
            if (stand.gekauft.includes(was)) return { ok: false, grund: "schon" };
            const preis = was === "dlc" ? PREIS_DLC : PREIS_EINZELN;
            if (stand.gems < preis) return { ok: false, grund: "gems" };
            stand.gems -= preis;
            stand.gekauft.push(was);
            browserSchreiben(stand);
            return { ok: true };
        },
        code(text) {
            const pruef = kaufPruefsumme("code:" + String(text || "").trim().toUpperCase());
            const code = BROWSER_CODES.find(c => c.pruef === pruef);
            if (!code) return { ok: false, grund: "ungueltig" };
            const stand = browserLesen();
            if (stand.codes.includes(pruef)) return { ok: false, grund: "schon" };
            stand.codes.push(pruef);
            if (code.gems) stand.gems += code.gems;
            if (code.beta) stand.beta = true;
            if (code.endlos) stand.endlos = true;
            browserSchreiben(stand);
            return { ok: true, belohnung: { gems: code.gems || 0, beta: Boolean(code.beta), endlos: Boolean(code.endlos) } };
        },
        uebernimmAlt() {
            const stand = browserLesen();
            if (stand.altUebernommen) return;
            stand.altUebernommen = true;
            const beta = altLesen(TRESOR_ALT.beta);
            if (beta && beta.beta) stand.beta = true;
            stand.gems += Math.max(0, Math.min(PREIS_EINZELN, Number(altLesen(TRESOR_ALT.gems)) || 0));
            const gekauft = altLesen(TRESOR_ALT.gekauft);
            if (Array.isArray(gekauft)) gekauft.filter(w => typeof w === "string" && w !== "dlc").slice(0, 1).forEach(w => stand.gekauft.push(w));
            browserSchreiben(stand);
        },
        entwickler(art, wert) {
            const stand = browserLesen();
            if (art === "gems") stand.gems = Math.max(0, Math.floor(Number(wert) || 0));
            if (art === "dlc") stand.gekauft = wert ? [...new Set([...stand.gekauft, "dlc"])] : stand.gekauft.filter(w => w !== "dlc");
            if (art === "gekauft" && !stand.gekauft.includes(String(wert))) stand.gekauft.push(String(wert));
            if (art === "beta") stand.beta = Boolean(wert);
            if (art === "endlos") stand.endlos = Boolean(wert);
            if (art === "reset") Object.assign(stand, browserLeer(), { altUebernommen: true });
            browserSchreiben(stand);
        }
    };

    const quelle = desktop || browser;

    try {
        if (desktop) {
            const roh = {};
            Object.entries(TRESOR_ALT).forEach(([art, schluessel]) => { roh[art] = localStorage.getItem(schluessel); });
            desktop.uebernimmAlt(roh);
        } else {
            browser.uebernimmAlt();
        }
    } catch (fehler) {
        console.warn("Alte Kaeufe konnten nicht uebernommen werden", fehler);
    }

    return {
        stand() {
            if (!zwischen) {
                try {
                    zwischen = quelle.lesen() || null;
                } catch (fehler) {
                    zwischen = null;
                }
                if (!zwischen) zwischen = { gems: 0, gekauft: [], beta: false, endlos: false, dlc: false, codes: 0 };
            }
            return zwischen;
        },
        kaufe(was) {
            const antwort = quelle.kaufe(was) || { ok: false };
            zwischen = null;
            return antwort;
        },
        code(text) {
            const antwort = quelle.code(text) || { ok: false, grund: "ungueltig" };
            zwischen = null;
            return antwort;
        },
        entwickler(art, wert) {
            quelle.entwickler(art, wert);
            zwischen = null;
        },
        gutschreibenBrowser(menge) {
            if (desktop) return;
            const stand = browserLesen();
            stand.gems += Math.max(0, Math.floor(Number(menge) || 0));
            browserSchreiben(stand);
            zwischen = null;
        },
        neuLaden() {
            zwischen = null;
        }
    };
})();
