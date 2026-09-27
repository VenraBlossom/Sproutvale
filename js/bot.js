"use strict";

// ============================================================
// SPROUTVALE: Test-Bot fuer das Duo (debug.bot("CODE"))
// Laeuft in einem unsichtbaren zweiten Spiel (index.html?bot=CODE) und tritt deiner Lobby als Gast bei.
// Er spielt wie ein durchschnittlicher Spieler: klickt nicht zu schnell, reagiert mit etwas Verzoegerung,
// erntet, sammelt ein, verjagt Kraehen, kauft zwischen den Tagen sinnvoll ein und bezahlt Rechnungen.
// Sein Spielstand liegt nur im Speicher (speicher.js), dein eigener Spielstand wird nie angefasst.
// Wird als letzte Datei geladen.
// ============================================================

const BOT = {
    tickMs: 100,
    klicksProSek: 5,          // durchschnittlicher Spieler, kein Autoklicker
    reaktionMs: [400, 1400],  // so lange dauert es, bis er etwas bemerkt (Ernte, Saaten, Kraehen)
    pausenChance: 0.004,      // pro Tick: kurz nicht klicken (trinkt was, schaut aufs Handy)
    emoteChance: 0.0015,      // pro Tick: ab und zu ein Emote
    rechnungWarteMs: 3000,    // so lange laesst er dir den Vortritt bei der Rechnung
    tagWarteMs: 2500          // nach dem Einkaufen so lange warten, dann "bereit"
};

(function starteBot() {
    if (typeof BOT_CODE !== "string" || !BOT_CODE) return;

    // Der Bot hat einen eigenen Namen im Duo
    profil().name = "Bot";
    const bemerkt = new Map(); // Ding -> Zeitpunkt, ab dem er reagiert
    let pauseBis = 0;
    let klickRest = 0;
    let vorTagSeit = 0;
    let rechnungSeit = 0;
    let beigetreten = false;

    const zufallZwischen = (a, b) => a + Math.random() * (b - a);
    const bemerkeUndFrage = (ding, jetzt) => {
        if (!bemerkt.has(ding)) bemerkt.set(ding, jetzt + zufallZwischen(...BOT.reaktionMs));
        return jetzt >= bemerkt.get(ding);
    };

    // Einkaufen wie der Balancing-Bot: Sternensamen zuerst in neue Pflanzen, Gold erst nach der Ruecklage fuer die Rechnung
    function kaufeEin() {
        const fehlgeschlagen = new Set();
        const naechste = naechsteRechnung();
        const ruecklage = !run.sandbox && naechste.tageBis <= 2 ? naechste.betrag / 2 : 0;
        for (let i = 0; i < 200; i++) {
            const sterne = SKILLS.filter(d => istKnotenOffen(d) && level(d.id) < d.max && !(d.erledigt && d.erledigt()) &&
                knotenKosten(d) <= run.skillpunkte && !fehlgeschlagen.has(d.id))
                .sort((x, y) => (x.art === "pflanze" ? 0 : 1) - (y.art === "pflanze" ? 0 : 1) || knotenKosten(x) - knotenKosten(y));
            if (sterne.length) {
                const vorher = run.skillpunkte;
                kaufeUpgrade(sterne[0], "skillpunkte");
                if (run.skillpunkte === vorher) fehlgeschlagen.add(sterne[0].id);
                continue;
            }
            const frei = run.gold - ruecklage;
            const beste = run.pflanzen.filter(p => p.freigeschaltet).sort((x, y) => verkaufswert(y) - verkaufswert(x))[0];
            const ertrag = PFLANZEN_UPGRADES.find(u => u.id === "ertrag");
            const wachstum = PFLANZEN_UPGRADES.find(u => u.id === "wachstum");
            const angebote = [];
            if (beste && pflanzenUpgradeFrei(beste, ertrag)) angebote.push({ id: "ertrag", prio: 0, kosten: pflanzenUpgradeKosten(beste, ertrag), kauf: () => kaufePflanzenUpgrade(beste, ertrag) });
            if (run.felder.length < Math.min(6, maxEigeneFelder())) angebote.push({ id: "feld", prio: 1, kosten: feldKosten(), kauf: kaufeFeld });
            if (beste && pflanzenUpgradeFrei(beste, wachstum) && beste.level.wachstum < wachstum.max) {
                angebote.push({ id: "wachstum", prio: 2, kosten: pflanzenUpgradeKosten(beste, wachstum), kauf: () => kaufePflanzenUpgrade(beste, wachstum) });
            }
            SHOP_UPGRADES.filter(d => shopUpgradeFrei(d) && level(d.id) < d.max)
                .forEach(d => angebote.push({ id: d.id, prio: 3, kosten: kostenMitFaktor(d.basiskosten, d.faktor, level(d.id)), kauf: () => kaufeUpgrade(d, "gold") }));
            if (run.felder.length < maxEigeneFelder()) angebote.push({ id: "feld2", prio: 4, kosten: feldKosten(), kauf: kaufeFeld });
            const moeglich = angebote.filter(a => a.kosten <= frei && !fehlgeschlagen.has(a.id)).sort((x, y) => x.prio - y.prio || x.kosten - y.kosten);
            if (!moeglich.length) break;
            const vorher = run.gold;
            moeglich[0].kauf();
            if (run.gold === vorher) fehlgeschlagen.add(moeglich[0].id);
        }
    }

    // Fenster wegklicken, die ein echter Spieler auch wegklicken wuerde (Tutorial, Hinweise), aber nicht die Rechnung
    function schliesseHinweise() {
        document.querySelectorAll(".popup-huelle").forEach(h => {
            if (!h.querySelector(".rechnung-frage")) h.remove();
        });
    }

    function spieleTag(jetzt) {
        if (spielPausiert() || run.koopFertig) return;
        if (jetzt < pauseBis) return;
        if (Math.random() < BOT.pausenChance) {
            pauseBis = jetzt + zufallZwischen(1500, 5000);
            return;
        }
        // Klicken mit etwas Schwankung (mal schneller, mal langsamer)
        klickRest += BOT.klicksProSek * zufallZwischen(0.6, 1.4) * BOT.tickMs / 1000;
        while (klickRest >= 1) {
            klickSamenladen(false, 0, 0);
            klickRest -= 1;
        }
        run.felder.filter(f => f.fertig && !f.kraehe).forEach(f => {
            if (bemerkeUndFrage(f, jetzt)) {
                bemerkt.delete(f);
                ernteFeld(f, false);
            }
        });
        [...lootKugeln].filter(l => !l.weg).forEach(l => {
            if (bemerkeUndFrage(l, jetzt)) {
                bemerkt.delete(l);
                sammleEin(l);
            }
        });
        run.felder.filter(f => f.kraehe && f.kraehe.gelandet).forEach(f => {
            const kraehe = f.kraehe;
            if (bemerkeUndFrage(kraehe, jetzt)) {
                bemerkt.delete(kraehe);
                verscheucheKraehe(kraehe);
            }
        });
        if (Math.random() < BOT.emoteChance) {
            const e = zufall(FIGUR_EMOTES);
            koopSende("emote", { id: e.id });
        }
    }

    function spieleZwischenDenTagen(jetzt) {
        // Rechnung: dir den Vortritt lassen, dann bezahlen
        if (run.rechnungOffen) {
            if (!rechnungSeit) rechnungSeit = jetzt;
            if (jetzt - rechnungSeit > BOT.rechnungWarteMs) {
                rechnungSeit = 0;
                koopRechnungEntscheidung(true, true);
            }
            return;
        }
        rechnungSeit = 0;
        if (run.segenAuswahl) {
            segenSperreBis = 0;
            waehleSegen(zufall(run.segenAuswahl), document.body);
            return;
        }
        if (koop.ichBereit) return;
        if (!vorTagSeit) {
            vorTagSeit = jetzt;
            kaufeEin();
        }
        if (jetzt - vorTagSeit > BOT.tagWarteMs) {
            vorTagSeit = 0;
            starteTag();
        }
    }

    setInterval(() => {
        const jetzt = performance.now();
        if (!beigetreten) {
            beigetreten = true;
            koopBeitreten(BOT_CODE);
            return;
        }
        if (!koopAktiv()) return;
        schliesseHinweise();
        if (run.phase === "tag") {
            vorTagSeit = 0;
            spieleTag(jetzt);
        } else if (run.phase === "vorTag") {
            spieleZwischenDenTagen(jetzt);
        }
    }, BOT.tickMs);
})();
