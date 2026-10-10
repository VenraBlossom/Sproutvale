"use strict";

// ============================================================
// SPROUTVALE: Balancing-Bot (Test-Datei, wird nicht mit ausgeliefert: Dateien mit "_" bleiben draussen)
// Im Browser in der Konsole laden:  await import("./_balancing-bot.js")  oder den Inhalt einfuegen,
// dann:  await sproutvaleBot({ tage: 40, klicksProSek: 6 })
// Spielt Story im Zeitraffer wie ein durchschnittlicher Spieler: klickt den Samenladen, erntet, sammelt ein,
// kauft zwischen den Tagen immer das guenstigste sinnvolle Upgrade, bezahlt Rechnungen, nimmt den ersten Segen.
// Gibt pro Tag Gold, Rechnungen und Einkommen zurueck.
// ============================================================

window.sproutvaleBot = async function sproutvaleBot({ tage = 40, klicksProSek = 6, tickMs = 100, meldung = true, mondphase = 0, sparTage = 2, abgeben = true } = {}) {
    speichernGesperrt = true;
    meta.mondphase = mondphase;
    // schneller: keine Partikel, keine Schwebe-Texte, keine Tageszeit-Deko
    einstellungen.wenigerEffekte = true;
    einstellungen.ohneTexte = true;
    document.body.classList.add("ohne-effekte");
    Klang.reset && Klang.reset();
    // Eigene Zeit: requestAnimationFrame und Timer laufen im Takt des Bots
    const warteschlange = [];
    window.requestAnimationFrame = cb => { warteschlange.push(cb); return warteschlange.length; };
    let zeit = performance.now();
    // Die Klick-Obergrenze misst in Spielzeit, nicht in echter Zeit
    window.klickUhr = () => zeit;
    // Auch alle Animationen laufen in Spielzeit (sonst stauen sich tausende, und jeder Tag wird langsamer)
    performance.now = () => zeit;
    window.sproutvaleBotWarteschlange = () => warteschlange.length;
    const tick = () => {
        zeit += tickMs;
        const liste = warteschlange.splice(0);
        liste.forEach(cb => cb(zeit));
    };
    // raus aus dem Hauptmenue (dort ist das Spiel pausiert), dann ein frischer Story-Run
    spieleModus(false);
    starteNeuenRun(false);
    // Hof-Stil wie ein Spieler waehlen (ab Run 2 kommt die Auswahl)
    if (document.querySelector(".stil-karte")) {
        run.stil = zufall(HOF_STILE).id;
        document.querySelectorAll(".popup-huelle").forEach(h => h.remove());
    }
    einstellungenFenster.classList.add("versteckt");
    document.querySelectorAll(".popup-huelle").forEach(h => h.remove());
    requestAnimationFrame(hauptSchleife);

    const protokoll = [];
    let botSpielSek = 0;
    let goldAmTagesStart = run.gold;
    const r = () => run;

    // Einkaufen wie ein ueberlegter Spieler:
    // 1. Sternensamen: zuerst neue Pflanzen, dann das guenstigste. 2. Gold: vor dem Rechnungstag genug zuruecklegen,
    // sonst Ertrag der besten Pflanze, Felder (bis 6), Wachstum, dann den Rest nach Preis.
    const kaufeEin = () => {
        const fehlgeschlagen = new Set();
        const tageBisRechnung = naechsteRechnung().tageBis;
        // Ruecklage waechst ueber die 5 Tage bis zur Rechnung (am letzten Tag der ganze Betrag)
        const ruecklage = tageBisRechnung <= sparTage ? naechsteRechnung().betrag : 0;
        for (let i = 0; i < 300; i++) {
            const sterne = SKILLS.filter(d => istKnotenOffen(d) && level(d.id) < d.max && !(d.erledigt && d.erledigt()) &&
                knotenKosten(d) <= run.skillpunkte && !fehlgeschlagen.has(d.id))
                .sort((x, y) => (x.art === "pflanze" ? 0 : 1) - (y.art === "pflanze" ? 0 : 1) || knotenKosten(x) - knotenKosten(y));
            if (sterne.length) {
                const d = sterne[0];
                const vorher = run.skillpunkte;
                kaufeUpgrade(d, "skillpunkte");
                if (run.skillpunkte === vorher) fehlgeschlagen.add(d.id);
                continue;
            }
            const frei = run.gold - ruecklage;
            // Wie ein Spieler: das Stellarium sofort kaufen, wenn es sich leisten laesst
            const stern = SHOP_UPGRADES.find(u => u.id === "stellarium");
            if (stern && shopUpgradeFrei(stern) && level("stellarium") < 1 && frei >= stern.basiskosten) { kaufeUpgrade(stern, "gold"); continue; }
            const beste = run.pflanzen.filter(pf => pf.freigeschaltet).sort((x, y) => verkaufswert(y) - verkaufswert(x))[0];
            const angebote = [];
            const ertrag = PFLANZEN_UPGRADES.find(u => u.id === "ertrag");
            const wachstum = PFLANZEN_UPGRADES.find(u => u.id === "wachstum");
            if (beste && pflanzenUpgradeFrei(beste, ertrag)) angebote.push({ id: "ertrag", prio: 0, kosten: pflanzenUpgradeKosten(beste, ertrag), kauf: () => kaufePflanzenUpgrade(beste, ertrag) });
            if (run.felder.length < Math.min(6, maxEigeneFelder())) angebote.push({ id: "feld", prio: 1, kosten: feldKosten(), kauf: kaufeFeld });
            if (beste && pflanzenUpgradeFrei(beste, wachstum) && beste.level.wachstum < wachstum.max) {
                angebote.push({ id: "wachstum", prio: 2, kosten: pflanzenUpgradeKosten(beste, wachstum), kauf: () => kaufePflanzenUpgrade(beste, wachstum) });
            }
            SHOP_UPGRADES.filter(d => shopUpgradeFrei(d) && level(d.id) < d.max)
                .forEach(d => angebote.push({ id: d.id, prio: 3, kosten: kostenMitFaktor(d.basiskosten, d.faktor, level(d.id)), kauf: () => kaufeUpgrade(d, "gold") }));
            if (run.felder.length < maxEigeneFelder()) angebote.push({ id: "feld2", prio: 4, kosten: feldKosten(), kauf: kaufeFeld });
            const moeglich = angebote.filter(x => x.kosten <= frei && !fehlgeschlagen.has(x.id)).sort((x, y) => x.prio - y.prio || x.kosten - y.kosten);
            if (!moeglich.length) break;
            const vorher = run.gold;
            moeglich[0].kauf();
            if (run.gold === vorher) fehlgeschlagen.add(moeglich[0].id);
        }
    };

    for (let t = 0; t < tage && run.phase !== "runEnde"; t++) {
        // nach jedem Tag kurz abgeben, damit der Browser nicht einfriert
        // (MessageChannel statt setTimeout: wird im versteckten Browser nicht auf 1 Sekunde oder mehr gebremst)
        if (abgeben) await new Promise(ok => { const k = new MessageChannel(); k.port1.onmessage = () => ok(); k.port2.postMessage(0); });
        window.sproutvaleBotStand = protokoll;
        // Effekte werden im versteckten Browser nie entfernt (ihr Ende haengt an Animationen): wegraeumen, sonst wird es immer langsamer
        // alles im Effekt-Layer weg, dazu Banner und Toasts (sonst waechst der Speicher ueber viele Runs immer weiter)
        fxLayer.innerHTML = "";
        document.querySelectorAll(".banner, .toast, #toasts > *").forEach(e => e.remove());
        document.querySelectorAll(".loot-kugel").forEach(e => { if (!lootKugeln.some(l => l.el === e)) e.remove(); });
        // Zwischen den Tagen: Segen waehlen, einkaufen, Tag starten
        if (run.segenAuswahl) {
            segenSperreBis = 0;
            waehleSegen(run.segenAuswahl[0], document.body);
        }
        document.querySelectorAll(".popup-huelle").forEach(h => { if (!h.querySelector(".rechnung-frage")) h.remove(); });
        kaufeEin();
        goldAmTagesStart = run.gold;
        starteTag();
        let klickRest = 0;
        let sicherung = 0;
        const tagStartZeit = Date.now();
        while (run.phase === "tag" && sicherung++ < 20000) {
            // Tag dauert unrealistisch lange (mehr als 5 Minuten Spielzeit): festhalten, warum, und abbrechen
            if (sicherung * tickMs > 300000) {
                window.sproutvaleBotProblem = { tag: run.tag, energie: run.energie, max: run.tagesMaxEnergie, bonus: run.bonusEnergie,
                    tagMs: run.tagMs, pausiert: spielPausiert(), fenster: [...document.querySelectorAll(".popup-titel")].map(e => e.textContent),
                    segen: !segenFenster.classList.contains("versteckt"), echtSek: (Date.now() - tagStartZeit) / 1000 };
                break;
            }
            klickRest += klicksProSek * tickMs / 1000;
            while (klickRest >= 1) {
                klickSamenladen(false, 100, 100);
                klickRest -= 1;
            }
            run.felder.filter(f => f.fertig && !f.kraehe).forEach(f => ernteFeld(f, false));
            run.felder.filter(f => f.kraehe).forEach(f => { f.kraehe = null; });
            [...lootKugeln].forEach(l => sammleEin(l));
            // Gluehwuermchen: ein normaler Spieler erwischt etwa 60%
            fxLayer.querySelectorAll(".gluehwuermchen:not(.bot-gesehen)").forEach(g => {
                g.classList.add("bot-gesehen");
                if (Math.random() < 0.6) g.dispatchEvent(new Event("pointerdown"));
            });
            // Neue Fenster, die das Spiel anhalten (Pokal, Briefe, Hinweise ...): wie ein Spieler wegklicken
            if (spielPausiert()) {
                document.querySelectorAll(".popup-huelle").forEach(h => {
                    if (h.querySelector(".rechnung-frage")) return;
                    const knoepfe = h.querySelectorAll(".popup-knoepfe .knopf");
                    if (knoepfe.length) knoepfe[0].click();
                    if (h.isConnected) h.remove();
                });
                if (run.segenAuswahl && !segenFenster.classList.contains("versteckt")) {
                    segenSperreBis = 0;
                    waehleSegen(run.segenAuswahl[0], document.body);
                }
                einstellungenFenster.classList.add("versteckt");
                if (typeof schliesseProfil === "function" && !$("profil-fenster").classList.contains("versteckt")) schliesseProfil();
            }
            tick();
            // Die Rechnungs-Frage am Abend: bezahlen, wenn es reicht
            const frage = document.querySelector(".rechnung-frage");
            if (frage) break;
        }
        // Abend: Rechnung bezahlen oder Run vorbei
        for (let i = 0; i < 50 && run.phase !== "tag"; i++) {
            const frage = document.querySelector(".rechnung-frage");
            if (frage) {
                frage.closest(".popup-huelle").remove();
                run.rechnungOffen = false;
                if (koopGesamtGold() >= faelligeRechnung() && bezahleRechnungen()) schliesseFeierabendAb();
                else { run.tag += 1; beendeRun(0, true); }
                break;
            }
            if (run.phase === "vorTag") break;
            tick();
        }
        window.sproutvaleBotTag = { tag: run.tag, rechnungen: run.bezahlteRechnungen, gold: Math.round(run.gold), zeit: Date.now() };
        // Fortschritt fuer den Simulator (eine Zeile pro Tag)
        // Echte Spielzeit schaetzen: Tageslaenge (Spielzeit) plus 20 Sekunden zum Einkaufen zwischen den Tagen
        botSpielSek += (run.tagMs || 0) / 1000 + 20;
        console.log("TAG " + JSON.stringify({ tag: run.tag, rechnungen: run.bezahlteRechnungen, gold: Math.round(run.gold),
            naechste: run.phase === "runEnde" ? null : naechsteRechnung().betrag, energie: run.tagesMaxEnergie, tagSek: Math.round((run.tagMs || 0) / 1000),
            spielMin: Math.round(botSpielSek / 60), ssHeute: Math.round(run.statistik ? run.statistik.sternensamen : 0), ssBank: Math.round(run.skillpunkte),
            sternStufen: SKILLS.reduce((summe, d) => summe + (d.id === "p_weizen" ? 0 : level(d.id)), 0), felder: run.felder.length,
            // Woher kommt das Wachstum? Multiplikatoren, beste Pflanze, Sterne und Markt mit hohen Stufen
            gm: Number(goldMulti().toPrecision(3)), sm: Number(sternWertMulti().toPrecision(3)),
            beste: bestePflanze().id, wert: Number(verkaufswert(bestePflanze()).toPrecision(3)), ertrag: bestePflanze().level.ertrag,
            hoch: SKILLS.filter(d => level(d.id) >= 6).map(d => d.id + ":" + level(d.id)).join(" "),
            markt: SHOP_UPGRADES.filter(d => level(d.id) >= 6).map(d => d.id + ":" + level(d.id)).join(" "),
            segen: Object.entries(run.segen || {}).map(([k, v]) => k + ":" + v).join(" "),
            problem: window.sproutvaleBotProblem || null }));
        window.sproutvaleBotProblem = null;
        protokoll.push({ tag: run.tag, gold: Math.round(run.gold), verdient: Math.round(run.gold - goldAmTagesStart), rechnungen: run.bezahlteRechnungen,
            naechste: run.phase === "runEnde" ? "-" : naechsteRechnung().betrag, felder: run.felder.length, sterne: Math.round(run.skillpunkte),
            // fuer das Tempo: wie viele Stern-Stufen und Markt-Stufen man insgesamt hat, und die Sternensamen des Tages
            sternStufen: SKILLS.reduce((summe, d) => summe + (d.id === "p_weizen" ? 0 : level(d.id)), 0),
            marktStufen: SHOP_UPGRADES.reduce((summe, d) => summe + level(d.id), 0) + run.pflanzen.reduce((summe, p) => summe + Object.values(p.level || {}).reduce((a, b) => a + (Number(b) || 0), 0), 0),
            sternensamenHeute: Math.round(run.statistik ? run.statistik.sternensamen : 0), klicks: klicksProSamen(),
            pflanzen: run.pflanzen.filter(p => p.freigeschaltet).length });
    }
    if (meldung) console.table(protokoll);
    return protokoll;
};
