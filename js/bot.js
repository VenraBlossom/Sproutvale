"use strict";

const BOT = {
    tickMs: 100,
    klicksProSek: 5,
    reaktionMs: [400, 1400],
    pausenChance: 0.004,
    emoteChance: 0.0015,
    rechnungWarteMs: 3000,
    tagWarteMs: 2500
};

(function starteBot() {
    if (typeof BOT_CODE !== "string" || !BOT_CODE || !DEBUG_ERLAUBT) return;

    profil().name = "Bot";
    const bemerkt = new Map();
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

    function meldeStand() {
        let text;
        if (!koop.verbunden) text = "🤖 verbindet … " + (koop.status || "");
        else if (!koopAktiv()) text = "🤖 in der Lobby, wartet auf den Start";
        else text = "🤖 Tag " + run.tag + " · " + (run.phase === "tag" ? "spielt" : run.koopFertig ? "Feierabend" : koop.ichBereit ? "bereit" : "kauft ein") +
            " · " + zahl(run.gold) + " Gold · " + run.felder.length + " Felder · " + run.gesamt.klicks + " Klicks";
        try { window.parent.postMessage({ sproutvaleBot: text }, "*"); } catch (fehler) {  }
    }
    setInterval(meldeStand, 1000);

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
