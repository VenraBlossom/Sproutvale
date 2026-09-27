"use strict";

// ============================================================
// SPROUTVALE: Gluecksspiele auf dem Markt (Muenzwurf, Slotmaschine, Rubbellose, Huehnerrennen, Samen-Plinko, Roulette, Blackjack)
// Werden im Stellarium (Ast "Glueck") freigeschaltet. Jedes Spiel darf zwischen zwei Tagen nur ein paar Mal gespielt
// werden (GLUECKSSPIEL.xyz.proPause + Stammkunde). Glueck (glueckBonus() in script.js) verbessert alle Chancen.
// Gehoert zu script.js (gemeinsame Funktionen und Zustand stehen dort).
// ============================================================

let glueckAnimation = false;
let glueckUeberspringen = null; // beendet die laufende Animation sofort (Knopf "Ueberspringen")

// Ueberspringen-Knopf unter einem laufenden Spiel
function zeigeUeberspringen(element) {
    const karte = element.closest(".spiel-karte");
    if (!karte) return;
    const knopf = el("button", "knopf spiel-skip", t("⏭ Überspringen"));
    knopf.addEventListener("click", () => {
        if (glueckUeberspringen) glueckUeberspringen();
    });
    karte.appendChild(knopf);
}

function neuerGlueckZustand() {
    return {
        muenzwurf: 0, slot: 0, rubbellos: 0, huehnerrennen: 0, plinko: 0, roulette: 0, blackjack: 0,
        los: null, letzterWurf: null, letzterSlot: null, letztesRennen: null, letztesPlinko: null,
        letztesRoulette: null, rouletteWahl: "rot", rouletteVerlauf: [], bj: null
    };
}

// Alle Gluecksspiele: Stern im Stellarium, Name im Reiter, Aufbau
const GLUECK_SPIELE = [
    { id: "muenzwurf", text: () => t("🪙 Münzwurf"), render: () => renderMuenzwurf() },
    { id: "gacha", text: () => t("🎰 Slotmaschine"), render: () => renderSlot() },
    { id: "rubbellos", text: () => t("🎟️ Rubbellose"), render: () => renderRubbellos() },
    { id: "huehnerrennen", text: () => t("🐔 Hühnerrennen"), render: () => renderHuehnerrennen() },
    { id: "plinko", text: () => t("🔻 Samen-Plinko"), render: () => renderPlinko() },
    { id: "roulette", text: () => t("🎡 Roulette"), render: () => renderRoulette() },
    { id: "blackjack", text: () => t("🃏 Blackjack"), render: () => renderBlackjack() }
];

function freieGluecksspiele() {
    return GLUECK_SPIELE.filter(s => level(s.id) > 0);
}

function hatGluecksspiel() {
    return freieGluecksspiele().length > 0;
}

function spieleProPause(id) {
    return GLUECKSSPIEL[id].proPause + level("stammkunde");
}

function restSpiele(id) {
    return spieleProPause(id) - (run.glueck[id] || 0);
}

function zaehleSieg() {
    run.gesamt.gluecksspielSiege += 1;
    meta.lebenszeit.gluecksspielSiege += 1;
}

// Ein Spiel (der gewaehlte Reiter im Gluecksspiel-Markt)
function renderGluecksspiele(id) {
    const glueck = glueckBonus();
    shopContent.appendChild(erstelleHinweis(t("🍀 Dein Glück: +") + prozentText(glueck) +
        (glueck > 0 ? t(" (bessere Gewinnchancen)") : t(" (Glück bekommst du im Stellarium (Ast \"Glück\"), im Mondteich und von Kuscheltieren)"))));
    const spiel = GLUECK_SPIELE.find(s => s.id === id && level(s.id) > 0);
    if (spiel) spiel.render();
}

function spielKarte(titel, beschreibung, info) {
    const karte = erstelleKarte({ titel, beschreibung, info });
    karte.classList.add("spiel-karte");
    shopContent.appendChild(karte);
    return karte;
}

function spielErgebnis(karte, text, gewonnen) {
    if (!text) return;
    karte.appendChild(el("div", "spiel-ergebnis " + (gewonnen ? "gewonnen" : "verloren"), text));
}

function kleinerKnopf(text, aktiv, onKlick, klasse) {
    const knopf = el("button", "knopf spiel-knopf" + (klasse ? " " + klasse : ""), text);
    knopf.disabled = !aktiv;
    knopf.addEventListener("click", onKlick);
    return knopf;
}

// Knoepfe fuer die Einsaetze (Anteile deines Goldes)
function einsatzKnoepfe(id, onWahl, rotAb = 1) {
    const leiste = el("div", "spiel-knoepfe");
    const rest = restSpiele(id);
    GLUECKSSPIEL[id].einsaetze.forEach(anteil => {
        const einsatz = Math.floor(run.gold * anteil);
        const text = (anteil === 1 ? t("Alles") : prozentText(anteil)) + " · " + zahl(einsatz) + t(" Gold");
        const aktiv = darfEinkaufen() && !glueckAnimation && rest > 0 && einsatz >= 1;
        leiste.appendChild(kleinerKnopf(text, aktiv, () => onWahl(anteil), anteil >= rotAb ? "knopf-rot" : null));
    });
    return leiste;
}

function restText(id) {
    return t("Noch ") + restSpiele(id) + t(" von ") + spieleProPause(id) + t(" Spielen bis zum nächsten Tag");
}

// Boni aus dem alten Gacha-Automaten (nur noch in alten Run-Spielstaenden vorhanden)
function gachaBonus(id) {
    return (run.gachaBoni && run.gachaBoni[id]) || 0;
}

// ---------- SLOTMASCHINE: 3 Walzen, 3 gleiche Symbole gewinnen ----------
// Das Ergebnis steht beim Drehen schon fest (wie beim Rubbellos), die Walzen halten nacheinander an.

function setzeWalze(walze, symbol) {
    walze.innerHTML = "";
    walze.appendChild(pixelIcon(symbol, 40));
}

function renderSlot() {
    const k = GLUECKSSPIEL.slot;
    const tabelle = k.symbole.map(s => "3x" + s.symbol + " x" + s.multi).join("  ");
    const karte = spielKarte(t("🎰 Slotmaschine"),
        t("Setz einen Teil deines Goldes und dreh die Walzen. 3 gleiche Symbole gewinnen: ") + tabelle, restText("slot"));
    const letzter = run.glueck.letzterSlot;
    const walzen = (letzter ? letzter.walzen : ["🌟", "🌟", "🌟"]).map(symbol => {
        const walze = el("div", "slot-walze");
        setzeWalze(walze, symbol);
        return walze;
    });
    const maschine = el("div", "slot-maschine", null, walzen);
    if (letzter && letzter.gewonnen) maschine.classList.add("gewonnen");
    karte.appendChild(maschine);
    karte.appendChild(einsatzKnoepfe("slot", anteil => dreheSlot(anteil, maschine, walzen), 2));
    if (letzter) spielErgebnis(karte, letzter.text, letzter.gewonnen);
}

function dreheSlot(anteil, maschine, walzenEls) {
    const k = GLUECKSSPIEL.slot;
    const einsatz = Math.floor(run.gold * anteil);
    if (!darfEinkaufen() || glueckAnimation || einsatz < 1 || restSpiele("slot") <= 0) return;
    run.gold -= einsatz;
    run.glueck.slot = (run.glueck.slot || 0) + 1;
    glueckAnimation = true;
    shopContent.querySelectorAll(".spiel-knopf").forEach(knopf => { knopf.disabled = true; });
    zaehleHoch(moneyDisplay.querySelector("span"), run.gold);
    maschine.classList.remove("gewonnen");

    const faktor = 1 + glueckBonus();
    let wurf = Math.random();
    let gewinn = null;
    for (const s of [...k.symbole].reverse()) {
        const chance = s.chance * faktor;
        if (wurf < chance) {
            gewinn = s;
            break;
        }
        wurf -= chance;
    }
    const alle = k.symbole.map(s => s.symbol);
    let walzen;
    if (gewinn) {
        walzen = [gewinn.symbol, gewinn.symbol, gewinn.symbol];
    } else {
        // Niete: oft zwei gleiche (Beinahe-Gewinn), nie drei gleiche
        const a = zufall(alle);
        const anders = zufall(alle.filter(s => s !== a));
        walzen = Math.random() < 0.45 ? mische([a, a, anders]) : [a, anders, zufall(alle.filter(s => s !== a))];
    }

    Klang.kaufen();
    const stopp = [650, 1050, 1450];
    let start = performance.now();
    const gestoppt = [false, false, false];
    glueckUeberspringen = () => { start = -Infinity; };
    zeigeUeberspringen(maschine);

    function dreh() {
        const vergangen = performance.now() - start;
        walzenEls.forEach((walze, i) => {
            if (gestoppt[i]) return;
            if (vergangen < stopp[i]) {
                setzeWalze(walze, zufall(alle));
                walze.classList.add("dreht");
            } else {
                gestoppt[i] = true;
                walze.classList.remove("dreht");
                setzeWalze(walze, walzen[i]);
                Klang.klick(30 + i * 12);
            }
        });
        if (gestoppt.every(Boolean)) {
            setTimeout(beende, 150);
            return;
        }
        setTimeout(dreh, 70);
    }

    function beende() {
        glueckUeberspringen = null;
        glueckAnimation = false;
        const rect = maschine.getBoundingClientRect();
        if (gewinn) {
            const betrag = Math.floor(einsatz * gewinn.multi * (1 + 0.1 * level("gluecksrabatt")));
            run.gold += betrag;
            zaehleSieg();
            maschine.classList.add("gewonnen");
            if (gewinn.multi >= 10) Klang.jackpot();
            else Klang.muenze(3);
            partikel(rect.left + rect.width / 2, rect.top + rect.height / 2, ["#ffd93d", "#ffffff", "#ff8fb1"], gewinn.multi >= 10 ? 30 : 16, 100);
            run.glueck.letzterSlot = { walzen, gewonnen: true, text: t("3x ") + gewinn.symbol + t(" = x") + gewinn.multi + " · +" + zahl(betrag) + t(" Gold") };
        } else {
            Klang.fehler();
            run.glueck.letzterSlot = { walzen, gewonnen: false, text: t("Leider nichts. -") + zahl(einsatz) + t(" Gold") };
        }
        aktualisiereAlles();
    }
    dreh();
}

// ---------- MUENZWURF: Kopf = Einsatz verdoppelt, Zahl = Einsatz weg ----------

function muenzwurfChance() {
    const k = GLUECKSSPIEL.muenzwurf;
    return Math.min(k.maxChance, k.gewinnChance + glueckBonus());
}

function renderMuenzwurf() {
    const karte = spielKarte(t("🪙 Münzwurf"),
        t("Kopf: dein Einsatz verdoppelt sich. Zahl: dein Einsatz ist weg. Gewinnchance: ") + prozentText(muenzwurfChance()) + ".",
        restText("muenzwurf"));
    const muenze = document.createElement("img");
    muenze.classList.add("wurf-muenze");
    const wurf0 = run.glueck.letzterWurf;
    setzeSpriteBild(muenze, wurf0 && !wurf0.gewonnen ? "muenze_zahl" : "muenze_kopf", 5);
    karte.appendChild(muenze);
    karte.appendChild(einsatzKnoepfe("muenzwurf", anteil => wirfMuenze(anteil, muenze), 1));
    const wurf = run.glueck.letzterWurf;
    if (wurf) spielErgebnis(karte, wurf.text, wurf.gewonnen);
}

function wirfMuenze(anteil, muenzeEl) {
    const einsatz = Math.floor(run.gold * anteil);
    if (!darfEinkaufen() || glueckAnimation || einsatz < 1 || restSpiele("muenzwurf") <= 0) return;
    run.glueck.muenzwurf += 1;
    glueckAnimation = true;
    const gewonnen = Math.random() < muenzwurfChance();
    Klang.muenzwurf();
    const flug = muenzeEl.animate(
        [{ transform: "translateY(0) rotateY(0deg)" }, { transform: "translateY(-60px) rotateY(900deg)" }, { transform: "translateY(0) rotateY(1800deg)" }],
        { duration: 900, easing: "ease-in-out" }
    );
    let fertig = false;
    // Waehrend die Muenze fliegt, wechseln sich Kopf und Zahl ab
    let seite = 0;
    const wechsel = setInterval(() => {
        seite = 1 - seite;
        muenzeEl.src = spriteUrl(seite ? "muenze_zahl" : "muenze_kopf");
    }, 100);
    // setTimeout statt onfinish: laeuft auch, wenn der Browser Animationen im Hintergrund anhaelt
    const beende = () => {
        if (fertig) return;
        fertig = true;
        clearInterval(wechsel);
        muenzeEl.src = spriteUrl(gewonnen ? "muenze_kopf" : "muenze_zahl");
        flug.cancel();
        glueckUeberspringen = null;
        glueckAnimation = false;
        const rect = muenzeEl.getBoundingClientRect();
        if (gewonnen) {
            run.gold += einsatz;
            zaehleSieg();
            Klang.muenze(4);
            if (anteil >= 0.5) Klang.jackpot();
            partikel(rect.left + rect.width / 2, rect.top + rect.height / 2, ["#ffd93d", "#ffffff"], 20, 90);
        } else {
            run.gold -= einsatz;
            Klang.fehler();
        }
        run.glueck.letzterWurf = { gewonnen, text: gewonnen ? t("Kopf! +") + zahl(einsatz) + t(" Gold") : t("Zahl … -") + zahl(einsatz) + t(" Gold") };
        aktualisiereAlles();
    };
    glueckUeberspringen = beende;
    zeigeUeberspringen(muenzeEl);
    setTimeout(beende, 900);
}

// ---------- RUBBELLOSE: 9 Felder aufrubbeln, 3 gleiche Symbole gewinnen ----------
// Der Preis ist ein Anteil deines Goldes. Das Ergebnis steht beim Kauf schon fest,
// die anderen Symbole kommen hoechstens 2-mal vor (Beinahe-Gewinne!).

function kaufeLos(anteil) {
    const k = GLUECKSSPIEL.rubbellos;
    const preis = Math.floor(run.gold * anteil);
    const offenesLos = run.glueck.los && !run.glueck.los.fertig;
    if (!darfEinkaufen() || offenesLos || preis < 1 || restSpiele("rubbellos") <= 0) return;
    run.gold -= preis;
    run.glueck.rubbellos += 1;

    const faktor = 1 + glueckBonus();
    let wurf = Math.random();
    let gewinn = null;
    for (const s of [...k.symbole].reverse()) {
        const chance = s.chance * faktor;
        if (wurf < chance) {
            gewinn = s;
            break;
        }
        wurf -= chance;
    }
    const felder = gewinn ? [gewinn.symbol, gewinn.symbol, gewinn.symbol] : [];
    const andere = mische(k.symbole.filter(s => s !== gewinn).flatMap(s => [s.symbol, s.symbol]));
    while (felder.length < 9) felder.push(andere.pop());
    run.glueck.los = { preis, felder: mische(felder), offen: Array(9).fill(false), gewinn, fertig: false };
    Klang.kaufen();
    aktualisiereAlles();
}

function rubbleFeld(index, feldEl) {
    const los = run.glueck.los;
    if (!los || los.fertig || los.offen[index]) return;
    los.offen[index] = true;
    Klang.rubbeln();
    if (feldEl) {
        feldEl.classList.add("offen");
        feldEl.textContent = "";
        feldEl.appendChild(pixelIcon(los.felder[index], 32));
    }
    if (los.offen.every(Boolean)) {
        werteLosAus();
        aktualisiereAlles();
    }
}

function rubbleAlles() {
    const los = run.glueck.los;
    if (!los || los.fertig) return;
    los.offen.fill(true);
    werteLosAus();
    aktualisiereAlles();
}

function werteLosAus() {
    const los = run.glueck.los;
    los.fertig = true;
    if (los.gewinn) {
        const betrag = los.preis * los.gewinn.multi;
        run.gold += betrag;
        zaehleSieg();
        los.text = t("3x ") + los.gewinn.symbol + t(" = x") + los.gewinn.multi + " · +" + zahl(betrag) + t(" Gold");
        if (los.gewinn.multi >= 5) Klang.jackpot();
        else Klang.muenze(2);
    } else {
        los.text = t("Leider eine Niete.");
        Klang.fehler();
    }
}

function renderRubbellos() {
    const k = GLUECKSSPIEL.rubbellos;
    const tabelle = k.symbole.map(s => "3x" + s.symbol + t(" x") + s.multi).join("  ");
    const karte = spielKarte(t("🎟️ Rubbellos"), t("Rubbel alle 9 Felder frei. 3 gleiche Symbole gewinnen: ") + tabelle, restText("rubbellos"));

    const los = run.glueck.los;
    const offenesLos = los && !los.fertig;
    if (los) {
        const raster = el("div", "rubbel-raster");
        los.felder.forEach((symbol, i) => {
            const feld = el("button", "rubbel-feld");
            const offen = los.offen[i];
            feld.classList.toggle("offen", offen);
            feld.classList.toggle("treffer", los.fertig && Boolean(los.gewinn) && symbol === los.gewinn.symbol);
            if (offen) feld.appendChild(pixelIcon(symbol, 32));
            else feld.textContent = "?";
            feld.addEventListener("pointerenter", event => {
                if (event.buttons === 1) rubbleFeld(i, feld); // mit gedrueckter Maustaste drueberwischen
            });
            feld.addEventListener("pointerdown", () => rubbleFeld(i, feld));
            raster.appendChild(feld);
        });
        karte.appendChild(raster);
    }

    if (offenesLos) {
        karte.appendChild(el("div", "spiel-knoepfe", null, [kleinerKnopf(t("Alles aufrubbeln"), true, rubbleAlles)]));
    } else {
        karte.appendChild(einsatzKnoepfe("rubbellos", kaufeLos, 2));
    }
    if (los && los.fertig) spielErgebnis(karte, los.text, Boolean(los.gewinn));
}

// ---------- HUEHNERRENNEN: auf ein Huhn setzen, Gewinn = Einsatz x Quote ----------

GLUECKSSPIEL.huehnerrennen.huehner.forEach((huhn, i) => {
    SPRITE_ABWANDLUNGEN["huhn_" + i] = { basis: "huhn", farben: { C: huhn.farbe } };
});

let rennEinsatz = 0.1;

function renderHuehnerrennen() {
    const k = GLUECKSSPIEL.huehnerrennen;
    const rest = restSpiele("huehnerrennen");
    if (!k.einsaetze.includes(rennEinsatz)) rennEinsatz = k.einsaetze[0];
    const einsatz = Math.floor(run.gold * rennEinsatz);
    const karte = spielKarte(t("🐔 Hühnerrennen"),
        t("Wähl deinen Einsatz und setz auf ein Huhn. Gewinnt es, bekommst du Einsatz x Quote."), restText("huehnerrennen"));

    const wahl = el("div", "spiel-knoepfe");
    k.einsaetze.forEach(anteil => {
        const knopf = kleinerKnopf(prozentText(anteil) + " · " + zahl(Math.floor(run.gold * anteil)), !glueckAnimation, () => {
            rennEinsatz = anteil;
            renderShop();
        }, anteil === rennEinsatz ? "knopf-gruen" : null);
        wahl.appendChild(knopf);
    });
    karte.appendChild(wahl);

    const bahn = el("div", "rennbahn");
    const huhnBilder = [];
    k.huehner.forEach((huhn, i) => {
        const spur = el("div", "renn-spur");
        const bild = document.createElement("img");
        bild.classList.add("renn-huhn");
        setzeSpriteBild(bild, "huhn_" + i, 3);
        huhnBilder.push(bild);
        const knopf = kleinerKnopf(huhn.name + t(" x") + huhn.quote, darfEinkaufen() && rest > 0 && einsatz >= 1 && !glueckAnimation,
            () => starteRennen(i, huhnBilder));
        spur.append(bild, knopf);
        bahn.appendChild(spur);
    });
    karte.appendChild(bahn);
    const rennen = run.glueck.letztesRennen;
    if (rennen) spielErgebnis(karte, rennen.text, rennen.gewonnen);
}

function starteRennen(wahl, huhnBilder) {
    const k = GLUECKSSPIEL.huehnerrennen;
    const einsatz = Math.floor(run.gold * rennEinsatz);
    if (!darfEinkaufen() || glueckAnimation || einsatz < 1 || restSpiele("huehnerrennen") <= 0) return;
    run.gold -= einsatz;
    run.glueck.huehnerrennen += 1;
    glueckAnimation = true;
    shopContent.querySelectorAll(".spiel-knopf").forEach(knopf => { knopf.disabled = true; });

    // Sieger nach Chance 1/Quote (Glueck hilft deinem Huhn), er kommt als Erstes ins Ziel
    const sieger = gewichteterZufall(k.huehner.map((h, i) => i), i => (1 / k.huehner[i].quote) * (i === wahl ? 1 + glueckBonus() : 1));
    const zeiten = k.huehner.map((_, i) => (i === sieger ? 2600 : 2800 + Math.random() * 900));
    const strecke = huhnBilder[0].parentElement.clientWidth - huhnBilder[0].offsetWidth - 150;
    let start = performance.now();
    Klang.gackern();
    glueckUeberspringen = () => { start = -Infinity; };
    zeigeUeberspringen(huhnBilder[0]);

    function animiere() {
        const vergangen = Math.min(performance.now() - start, Math.max(...zeiten) + 200);
        huhnBilder.forEach((bild, i) => {
            const t = Math.min(1, vergangen / zeiten[i]);
            const wackeln = t < 1 ? Math.sin(vergangen * 0.03 + i * 2) * 0.03 : 0;
            bild.style.transform = "translateX(" + Math.max(0, t + wackeln) * strecke + "px) translateY(" +
                (t < 1 ? -Math.abs(Math.sin(vergangen * 0.025 + i)) * 4 : 0) + "px)";
        });
        if (vergangen < Math.max(...zeiten) + 200) {
            setTimeout(animiere, 30);
            return;
        }
        glueckUeberspringen = null;
        glueckAnimation = false;
        const gewonnen = sieger === wahl;
        const name = k.huehner[sieger].name;
        if (gewonnen) {
            const betrag = einsatz * k.huehner[wahl].quote;
            run.gold += betrag;
            zaehleSieg();
            run.glueck.letztesRennen = { gewonnen, text: name + t(" gewinnt! +") + zahl(betrag) + t(" Gold") };
            Klang.jackpot();
        } else {
            run.glueck.letztesRennen = { gewonnen, text: name + t(" gewinnt. Dein Einsatz von ") + zahl(einsatz) + t(" Gold ist weg.") };
            Klang.fehler();
        }
        aktualisiereAlles();
    }
    animiere();
}

// ---------- SAMEN-PLINKO: Ein Samen hüpft durch Naegel in ein Gewinnfach ----------
// Jede Reihe: 50% links, 50% rechts. Glueck: mit dieser Chance faellt ein zweiter Samen, das bessere Fach zaehlt.

function plinkoWeg() {
    const k = GLUECKSSPIEL.plinko;
    const weg = [];
    let fach = 0;
    for (let r = 0; r < k.reihen; r++) {
        const rechts = Math.random() < 0.5;
        weg.push(rechts);
        if (rechts) fach += 1;
    }
    return { weg, fach };
}

function renderPlinko() {
    const k = GLUECKSSPIEL.plinko;
    const karte = spielKarte(t("🔻 Samen-Plinko"),
        t("Lass einen Samen fallen. Er hüpft durch ") + k.reihen + t(" Reihen Nägel und landet in einem Fach: Einsatz x Fach."),
        restText("plinko"));

    const brett = el("div", "plinko-brett");
    const breite = k.faecher.length;
    for (let r = 0; r < k.reihen; r++) {
        const reihe = el("div", "plinko-reihe");
        for (let n = 0; n <= r + 1; n++) reihe.appendChild(el("span", "plinko-nagel"));
        brett.appendChild(reihe);
    }
    const faecher = el("div", "plinko-faecher");
    k.faecher.forEach((multi, i) => {
        const fach = el("div", "plinko-fach", multiText(multi));
        fach.dataset.fach = i;
        fach.classList.toggle("gut", multi >= 1);
        fach.classList.toggle("super", multi >= 3);
        faecher.appendChild(fach);
    });
    brett.appendChild(faecher);
    const samen = document.createElement("img");
    samen.classList.add("plinko-samen", "versteckt");
    setzeSpriteBild(samen, "samen", 3);
    brett.appendChild(samen);
    brett.style.setProperty("--faecher", breite);
    karte.appendChild(brett);

    karte.appendChild(einsatzKnoepfe("plinko", anteil => lassePlinkoFallen(anteil, brett, samen), 2));
    const letztes = run.glueck.letztesPlinko;
    if (letztes) spielErgebnis(karte, letztes.text, letztes.gewonnen);
}

function lassePlinkoFallen(anteil, brett, samen) {
    const k = GLUECKSSPIEL.plinko;
    const einsatz = Math.floor(run.gold * anteil);
    if (!darfEinkaufen() || glueckAnimation || einsatz < 1 || restSpiele("plinko") <= 0) return;
    run.gold -= einsatz;
    run.glueck.plinko += 1;
    glueckAnimation = true;
    shopContent.querySelectorAll(".spiel-knopf").forEach(knopf => { knopf.disabled = true; });
    zaehleHoch(moneyDisplay.querySelector("span"), run.gold);

    let wurf = plinkoWeg();
    if (Math.random() < glueckBonus()) {
        const zweiter = plinkoWeg();
        if (k.faecher[zweiter.fach] > k.faecher[wurf.fach]) wurf = zweiter;
    }

    // Position: x in Faechern (0 = ganz links), y in Reihen
    const reihen = brett.querySelectorAll(".plinko-reihe");
    const faecherEl = brett.querySelector(".plinko-faecher");
    const brettRect = brett.getBoundingClientRect();
    const fachBreite = faecherEl.getBoundingClientRect().width / k.faecher.length;
    const links = faecherEl.getBoundingClientRect().left - brettRect.left;
    const mitteX = links + (k.faecher.length * fachBreite) / 2;
    const setze = (x, y) => {
        samen.style.left = x + "px";
        samen.style.top = y + "px";
    };
    samen.classList.remove("versteckt");
    let x = mitteX;
    setze(x, 0);
    let schritt = 0;
    let schnell = false;
    glueckUeberspringen = () => { schnell = true; };
    zeigeUeberspringen(brett);

    function naechsterSchritt() {
        if (schnell && schritt < k.reihen) {
            // Ueberspringen: alle Reihen auf einmal
            while (schritt < k.reihen) {
                x += (wurf.weg[schritt] ? 0.5 : -0.5) * fachBreite;
                schritt += 1;
            }
        }
        if (schritt < k.reihen) {
            const reihe = reihen[schritt].getBoundingClientRect();
            x += (wurf.weg[schritt] ? 0.5 : -0.5) * fachBreite;
            setze(x, reihe.top - brettRect.top + reihe.height / 2);
            Klang.plinkoNagel(schritt);
            schritt += 1;
            setTimeout(naechsterSchritt, 170);
            return;
        }
        const fachEl = faecherEl.children[wurf.fach];
        const fachRect = fachEl.getBoundingClientRect();
        setze(fachRect.left - brettRect.left + fachRect.width / 2, fachRect.top - brettRect.top + fachRect.height / 2);
        fachEl.classList.add("getroffen");
        setTimeout(() => {
            glueckUeberspringen = null;
            glueckAnimation = false;
            const multi = k.faecher[wurf.fach];
            const betrag = Math.floor(einsatz * multi);
            run.gold += betrag;
            const gewonnen = multi > 1;
            if (gewonnen) {
                zaehleSieg();
                if (multi >= 3) Klang.jackpot();
                else Klang.muenze(2);
                partikel(fachRect.left + fachRect.width / 2, fachRect.top, ["#ffd93d", "#ffffff", "#a3dc6f"], 18, 80);
            } else {
                Klang.fehler();
            }
            run.glueck.letztesPlinko = { gewonnen, text: multiText(multi) + " · " + (betrag >= einsatz ? "+" + zahl(betrag - einsatz) : "-" + zahl(einsatz - betrag)) + t(" Gold") };
            aktualisiereAlles();
        }, 350);
    }
    setTimeout(naechsterSchritt, 150);
}

// ---------- ROULETTE: eine Kugel, 37 Faecher (0 ist gruen) ----------
// Rot/Schwarz und Gerade/Ungerade zahlen x2, die gruene 0 zahlt x36. Glueck: verliert man, rollt die Kugel mit
// dieser Chance ein zweites Mal.

const ROULETTE_ROT = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const ROULETTE_WETTEN = [
    { id: "rot", text: () => t("🔴 Rot"), multi: 2, trifft: z => ROULETTE_ROT.has(z) },
    { id: "schwarz", text: () => t("⚫ Schwarz"), multi: 2, trifft: z => z > 0 && !ROULETTE_ROT.has(z) },
    { id: "gerade", text: () => t("Gerade"), multi: 2, trifft: z => z > 0 && z % 2 === 0 },
    { id: "ungerade", text: () => t("Ungerade"), multi: 2, trifft: z => z % 2 === 1 },
    { id: "gruen", text: () => t("🟢 Die 0"), multi: 36, trifft: z => z === 0 }
];

function rouletteFarbe(zahl) {
    return zahl === 0 ? "gruen" : ROULETTE_ROT.has(zahl) ? "rot" : "schwarz";
}

function setzeRouletteZahl(feld, zahl) {
    feld.textContent = zahl;
    feld.className = "roulette-zahl roulette-" + rouletteFarbe(zahl);
}

function renderRoulette() {
    const karte = spielKarte(t("🎡 Roulette"),
        t("Wähle eine Wette und deinen Einsatz. Rot, Schwarz, Gerade oder Ungerade: x2. Die grüne 0: x36."),
        restText("roulette"));
    const wahl = run.glueck.rouletteWahl || "rot";
    const wetten = el("div", "spiel-knoepfe roulette-wetten");
    ROULETTE_WETTEN.forEach(w => {
        wetten.appendChild(kleinerKnopf(w.text(), !glueckAnimation, () => {
            run.glueck.rouletteWahl = w.id;
            renderShop();
        }, "roulette-wette" + (w.id === wahl ? " aktiv" : "")));
    });
    karte.appendChild(wetten);

    const letztes = run.glueck.letztesRoulette;
    const rad = el("div", "roulette-rad");
    const feld = el("div", "roulette-zahl");
    setzeRouletteZahl(feld, letztes ? letztes.zahl : 0);
    rad.appendChild(feld);
    const verlauf = el("div", "roulette-verlauf");
    (run.glueck.rouletteVerlauf || []).forEach(z => verlauf.appendChild(el("span", "roulette-mini roulette-" + rouletteFarbe(z), String(z))));
    rad.appendChild(verlauf);
    karte.appendChild(rad);
    karte.appendChild(einsatzKnoepfe("roulette", anteil => dreheRoulette(anteil, feld), 1));
    if (letztes) spielErgebnis(karte, letztes.text, letztes.gewonnen);
}

function dreheRoulette(anteil, feld) {
    const einsatz = Math.floor(run.gold * anteil);
    if (!darfEinkaufen() || glueckAnimation || einsatz < 1 || restSpiele("roulette") <= 0) return;
    const wette = ROULETTE_WETTEN.find(w => w.id === (run.glueck.rouletteWahl || "rot"));
    run.gold -= einsatz;
    run.glueck.roulette = (run.glueck.roulette || 0) + 1;
    glueckAnimation = true;
    shopContent.querySelectorAll(".spiel-knopf").forEach(knopf => { knopf.disabled = true; });
    zaehleHoch(moneyDisplay.querySelector("span"), run.gold);

    let ergebnis = Math.floor(Math.random() * 37);
    if (!wette.trifft(ergebnis) && Math.random() < glueckBonus()) ergebnis = Math.floor(Math.random() * 37);

    // Die Kugel laeuft ueber die Zahlen und wird langsamer
    let schritt = 0;
    const schritte = 22;
    let fertig = false;
    const beende = () => {
        if (fertig) return;
        fertig = true;
        glueckUeberspringen = null;
        glueckAnimation = false;
        setzeRouletteZahl(feld, ergebnis);
        const gewonnen = wette.trifft(ergebnis);
        const rect = feld.getBoundingClientRect();
        if (gewonnen) {
            run.gold += einsatz * wette.multi;
            zaehleSieg();
            if (wette.multi > 2 || anteil >= 0.25) Klang.jackpot();
            else Klang.muenze(3);
            partikel(rect.left + rect.width / 2, rect.top + rect.height / 2, ["#ffd93d", "#ffffff", "#e0453a"], 22, 90);
        } else {
            Klang.fehler();
        }
        run.glueck.rouletteVerlauf = [ergebnis, ...(run.glueck.rouletteVerlauf || [])].slice(0, 8);
        run.glueck.letztesRoulette = {
            zahl: ergebnis, gewonnen,
            text: tf("Die Kugel fällt auf {0}. ", ergebnis) +
                (gewonnen ? "+" + zahl(einsatz * (wette.multi - 1)) + t(" Gold") : "-" + zahl(einsatz) + t(" Gold"))
        };
        aktualisiereAlles();
    };
    const tick = () => {
        if (fertig) return;
        if (schritt >= schritte) return beende();
        setzeRouletteZahl(feld, Math.floor(Math.random() * 37));
        Klang.plinkoNagel(schritt % 8);
        schritt += 1;
        setTimeout(tick, 35 + schritt * schritt * 0.35);
    };
    glueckUeberspringen = beende;
    zeigeUeberspringen(feld);
    tick();
}

// ---------- BLACKJACK: gegen den Dealer, wer naeher an 21 ist ----------
// Gewinn x2, Blackjack (21 mit 2 Karten) x2,5, Gleichstand = Einsatz zurueck. Der Dealer zieht bis 17.
// Glueck: wuerde eine gezogene Karte dich ueber 21 bringen, wird mit dieser Chance eine andere Karte gezogen.

const BJ_WERTE = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const BJ_FARBEN = ["♠", "♥", "♦", "♣"];

function bjKarte() {
    return { w: zufall(BJ_WERTE), f: zufall(BJ_FARBEN) };
}

function bjSumme(karten) {
    let summe = 0;
    let asse = 0;
    karten.forEach(k => {
        if (k.w === "A") {
            summe += 11;
            asse += 1;
        } else {
            summe += ["J", "Q", "K"].includes(k.w) ? 10 : Number(k.w);
        }
    });
    while (summe > 21 && asse > 0) {
        summe -= 10;
        asse -= 1;
    }
    return summe;
}

function bjKartenEl(karten, verdeckt) {
    const reihe = el("div", "bj-karten");
    karten.forEach((k, i) => {
        if (verdeckt && i === 1) {
            reihe.appendChild(el("div", "bj-karte verdeckt"));
            return;
        }
        const rot = k.f === "♥" || k.f === "♦";
        reihe.appendChild(el("div", "bj-karte" + (rot ? " rot" : ""), null, [
            el("span", "bj-wert", k.w), el("span", "bj-farbe", k.f)
        ]));
    });
    return reihe;
}

function renderBlackjack() {
    const karte = spielKarte(t("🃏 Blackjack"),
        t("Komm näher an 21 als der Dealer, ohne drüber zu gehen. Gewinn x2, Blackjack x2,5, Gleichstand: Einsatz zurück. Der Dealer zieht bis 17."),
        restText("blackjack"));
    const hand = run.glueck.bj;
    const imSpiel = hand && !hand.fertig;

    // Der Dealer mit Sprechblase
    const spruch = !hand ? t("Setz dich, gleich gibt es Karten.")
        : imSpiel ? (hand.dealerZieht ? t("Ich ziehe …") : t("Dein Zug. Ziehen oder halten?"))
        : hand.spruch;
    karte.appendChild(el("div", "bj-dealer", null, [
        pixelIcon("🤵", 48, "bj-dealer-bild"),
        el("div", "bj-sprechblase", spruch)
    ]));

    const tisch = el("div", "bj-tisch");
    if (hand) {
        const verdeckt = imSpiel && !hand.dealerZieht;
        tisch.appendChild(el("div", "bj-reihe-titel", t("Dealer") + (verdeckt ? "" : " · " + bjSumme(hand.dealer))));
        tisch.appendChild(bjKartenEl(hand.dealer, verdeckt));
        tisch.appendChild(el("div", "bj-reihe-titel", t("Du") + " · " + bjSumme(hand.spieler) +
            " · " + t("Einsatz: ") + zahl(hand.einsatz) + t(" Gold")));
        tisch.appendChild(bjKartenEl(hand.spieler, false));
    } else {
        tisch.appendChild(el("div", "bj-leer", t("Wähle deinen Einsatz, dann werden die Karten verteilt.")));
    }
    karte.appendChild(tisch);

    if (imSpiel) {
        const frei = darfEinkaufen() && !glueckAnimation && !hand.dealerZieht;
        const leiste = el("div", "spiel-knoepfe");
        leiste.appendChild(kleinerKnopf(t("➕ Ziehen"), frei, bjZiehen, "knopf-gruen"));
        leiste.appendChild(kleinerKnopf(t("✋ Halten"), frei, bjHalten));
        const verdoppeln = frei && hand.spieler.length === 2 && run.gold >= hand.einsatz;
        leiste.appendChild(kleinerKnopf(t("✖2 Verdoppeln"), verdoppeln, bjVerdoppeln, "knopf-rot"));
        karte.appendChild(leiste);
    } else {
        karte.appendChild(einsatzKnoepfe("blackjack", bjAusteilen, 1));
    }
    if (hand && hand.fertig) spielErgebnis(karte, hand.text, hand.gewonnen);
}

function bjAusteilen(anteil) {
    const einsatz = Math.floor(run.gold * anteil);
    if (!darfEinkaufen() || glueckAnimation || einsatz < 1 || restSpiele("blackjack") <= 0) return;
    run.gold -= einsatz;
    run.glueck.blackjack = (run.glueck.blackjack || 0) + 1;
    run.glueck.bj = { einsatz, spieler: [bjKarte(), bjKarte()], dealer: [bjKarte(), bjKarte()], fertig: false, dealerZieht: false };
    Klang.kaufen();
    if (bjSumme(run.glueck.bj.spieler) === 21) return bjAuswerten();
    aktualisiereAlles();
}

// Glueck: eine Karte, die dich ueber 21 bringen wuerde, wird mit dieser Chance noch einmal gezogen
function bjZieheFuerSpieler(hand) {
    let karte = bjKarte();
    if (bjSumme([...hand.spieler, karte]) > 21 && Math.random() < glueckBonus()) karte = bjKarte();
    hand.spieler.push(karte);
    Klang.kaufen();
}

function bjZiehen() {
    const hand = run.glueck.bj;
    if (!hand || hand.fertig || hand.dealerZieht || !darfEinkaufen()) return;
    bjZieheFuerSpieler(hand);
    const summe = bjSumme(hand.spieler);
    if (summe > 21) return bjAuswerten();
    if (summe === 21) return bjHalten();
    aktualisiereAlles();
}

function bjVerdoppeln() {
    const hand = run.glueck.bj;
    if (!hand || hand.fertig || hand.spieler.length !== 2 || run.gold < hand.einsatz || !darfEinkaufen()) return;
    run.gold -= hand.einsatz;
    hand.einsatz *= 2;
    bjZieheFuerSpieler(hand);
    if (bjSumme(hand.spieler) > 21) return bjAuswerten();
    bjHalten();
}

// Der Dealer deckt auf und zieht Karte fuer Karte bis mindestens 17
function bjHalten() {
    const hand = run.glueck.bj;
    if (!hand || hand.fertig || hand.dealerZieht) return;
    hand.dealerZieht = true;
    renderShop();
    glueckAnimation = true;
    let schnell = false;
    glueckUeberspringen = () => { schnell = true; };
    zeigeUeberspringen(shopContent.querySelector(".bj-tisch"));
    const zug = () => {
        if (bjSumme(hand.dealer) < 17) {
            hand.dealer.push(bjKarte());
            Klang.kaufen();
            if (!schnell) {
                glueckAnimation = false;
                renderShop();
                glueckAnimation = true;
                zeigeUeberspringen(shopContent.querySelector(".bj-tisch"));
            }
            setTimeout(zug, schnell ? 0 : 600);
            return;
        }
        glueckUeberspringen = null;
        glueckAnimation = false;
        bjAuswerten();
    };
    setTimeout(zug, 600);
}

function bjAuswerten() {
    const hand = run.glueck.bj;
    const spieler = bjSumme(hand.spieler);
    const dealer = bjSumme(hand.dealer);
    const blackjack = spieler === 21 && hand.spieler.length === 2;
    let auszahlung = 0;
    let spruch;
    if (spieler > 21) {
        spruch = t("Über 21. Die Bank gewinnt.");
    } else if (blackjack && !(dealer === 21 && hand.dealer.length === 2)) {
        auszahlung = Math.floor(hand.einsatz * 2.5);
        spruch = t("Blackjack! Glückwunsch.");
    } else if (dealer > 21 || spieler > dealer) {
        auszahlung = hand.einsatz * 2;
        spruch = dealer > 21 ? t("Ich bin drüber. Du gewinnst.") : t("Gut gespielt. Du gewinnst.");
    } else if (spieler === dealer) {
        auszahlung = hand.einsatz;
        spruch = t("Gleichstand. Du bekommst deinen Einsatz zurück.");
    } else {
        spruch = t("Die Bank gewinnt.");
    }
    hand.fertig = true;
    hand.dealerZieht = false;
    hand.spruch = spruch;
    run.gold += auszahlung;
    hand.gewonnen = auszahlung > hand.einsatz;
    const differenz = auszahlung - hand.einsatz;
    hand.text = differenz > 0 ? "+" + zahl(differenz) + t(" Gold") : differenz < 0 ? "-" + zahl(-differenz) + t(" Gold") : t("±0 Gold");
    if (hand.gewonnen) {
        zaehleSieg();
        if (blackjack) Klang.jackpot();
        else Klang.muenze(3);
    } else if (differenz < 0) {
        Klang.fehler();
    }
    aktualisiereAlles();
}

// Ein offenes Blatt, wenn die Pause vorbei ist: der Dealer spielt es sofort zu Ende (du haeltst)
function bjSchliesseOffeneHand() {
    const hand = run && run.glueck && run.glueck.bj;
    if (!hand || hand.fertig) return;
    while (bjSumme(hand.dealer) < 17) hand.dealer.push(bjKarte());
    bjAuswerten();
}
