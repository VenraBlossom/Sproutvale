"use strict";

// ============================================================
// SPROUTVALE: Gluecksspiele auf dem Marktplatz (Muenzwurf, Gacha-Automat, Rubbellose, Huehnerrennen, Samen-Plinko)
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
    const knopf = el("button", "knopf spiel-skip", "⏭ Überspringen");
    knopf.addEventListener("click", () => {
        if (glueckUeberspringen) glueckUeberspringen();
    });
    karte.appendChild(knopf);
}

function neuerGlueckZustand() {
    return {
        muenzwurf: 0, rubbellos: 0, huehnerrennen: 0, plinko: 0,
        los: null, letzterWurf: null, letztesRennen: null, letztesPlinko: null
    };
}

function hatGluecksspiel() {
    return ["muenzwurf", "gacha", "rubbellos", "huehnerrennen", "plinko"].some(id => level(id) > 0);
}

function spieleProPause(id) {
    return GLUECKSSPIEL[id].proPause + level("stammkunde");
}

function restSpiele(id) {
    return spieleProPause(id) - run.glueck[id];
}

function zaehleSieg() {
    run.gesamt.gluecksspielSiege += 1;
    meta.lebenszeit.gluecksspielSiege += 1;
}

function renderGluecksspiele() {
    const glueck = glueckBonus();
    shopContent.appendChild(erstelleHinweis("🍀 Dein Glück: +" + prozentText(glueck) +
        (glueck > 0 ? " (bessere Gewinnchancen)" : " (Glück bekommst du im Stellarium (Ast \"Glück\"), im Mondteich und von Kuscheltieren)")));
    if (level("muenzwurf") > 0) renderMuenzwurf();
    if (level("gacha") > 0) renderGacha();
    if (level("rubbellos") > 0) renderRubbellos();
    if (level("huehnerrennen") > 0) renderHuehnerrennen();
    if (level("plinko") > 0) renderPlinko();
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
        const text = (anteil === 1 ? "Alles" : prozentText(anteil)) + " · " + zahl(einsatz) + " Gold";
        const aktiv = darfEinkaufen() && !glueckAnimation && rest > 0 && einsatz >= 1;
        leiste.appendChild(kleinerKnopf(text, aktiv, () => onWahl(anteil), anteil >= rotAb ? "knopf-rot" : null));
    });
    return leiste;
}

function restText(id) {
    return "Noch " + restSpiele(id) + " von " + spieleProPause(id) + " Spielen bis zum nächsten Tag";
}

// ---------- GACHA-AUTOMAT ----------
// Jeder Preis gilt fuer den ganzen Run (oder fuer immer). Darum ist der Automat teuer.

function gachaKosten() {
    const nummer = run.sandbox ? run.meilensteine : run.bezahlteRechnungen;
    const basis = Math.max(GACHA_KONFIG.mindestPreis, rechnungsBetrag(nummer) * GACHA_KONFIG.anteil);
    return aufrunden(basis * Math.pow(GACHA_KONFIG.faktor, run.gachaZuege) * (1 - 0.1 * level("gluecksrabatt")));
}

// Bonus aus Gacha-Preisen in diesem Run (0, wenn keiner gezogen wurde)
function gachaBonus(id) {
    return (run.gachaBoni && run.gachaBoni[id]) || 0;
}

function wendeGachaPreisAn(preis, kosten) {
    run.gachaBoni = run.gachaBoni || {};
    if (preis.bonus) {
        run.gachaBoni[preis.bonus] = gachaBonus(preis.bonus) + preis.wert;
        return preis.text(preis.wert);
    }
    if (preis.gutschein) {
        meta.gutscheine += 1;
        speichereMeta();
        return preis.text();
    }
    // Werkzeug: nur eins, das man noch nicht hat. Sind alle Plaetze voll, gibt es das Gold zurueck.
    const moeglich = WERKZEUGE.filter(w => !hatWerkzeug(w.id) && !(run.sandbox && SANDBOX_AUS_WERKZEUGE.includes(w.id)));
    if (run.werkzeuge.length >= werkzeugPlaetze() || moeglich.length === 0) {
        run.gold += kosten;
        return "Alle Werkzeug-Plätze sind voll: " + zahl(kosten) + " Gold zurück";
    }
    const w = zufall(moeglich);
    gibWerkzeug(w.id, kosten);
    return w.symbol + " " + w.name + " (Stufe " + werkzeugStufe(w.id) + "): " + werkzeugText(w.id);
}

// Glueck macht seltene Preise etwas wahrscheinlicher
function gachaGewicht(preis) {
    return preis.gewicht * (1 + glueckBonus() * preis.raritaet);
}

function ziehGacha() {
    const kosten = gachaKosten();
    if (!darfEinkaufen() || run.gold < kosten) return;
    run.gold -= kosten;
    run.gachaZuege += 1;
    const preis = gewichteterZufall(GACHA_PREISE, gachaGewicht);
    run.letzterGachaZug = { name: preis.symbol + " " + preis.name, text: wendeGachaPreisAn(preis, kosten), raritaet: preis.raritaet };
    if (preis.raritaet >= 2) {
        Klang.jackpot();
        zaehleSieg();
    } else {
        Klang.kaufen();
    }
    aktualisiereAlles();
}

function renderGacha() {
    const kosten = gachaKosten();
    shopContent.appendChild(erstelleKarte({
        icon: "🎰",
        titel: "Gacha-Automat",
        beschreibung: "Teuer, aber jeder Preis gilt für den ganzen Run oder für immer. Jeder Zug in diesem Run wird teurer.",
        info: "Züge in diesem Run: " + run.gachaZuege,
        knopfText: "🎰 " + preisText(kosten, "gold"),
        aktiv: darfEinkaufen() && run.gold >= kosten,
        onKauf: ziehGacha
    }));

    if (run.letzterGachaZug) {
        const zug = run.letzterGachaZug;
        const ergebnis = el("div", "gacha-ergebnis", null, [el("b", null, zug.name), el("div", null, zug.text)]);
        ergebnis.style.borderColor = RARITAETEN[zug.raritaet].rand;
        ergebnis.firstChild.style.color = RARITAETEN[zug.raritaet].rand;
        shopContent.appendChild(ergebnis);
    }

    // Was man in diesem Run schon gezogen hat
    const boni = GACHA_PREISE.filter(p => p.bonus && gachaBonus(p.bonus) > 0);
    if (boni.length > 0) {
        shopContent.appendChild(erstelleHinweis("🎰 Deine Gacha-Boni in diesem Run: " +
            boni.map(p => p.symbol + " " + p.text(Math.round(gachaBonus(p.bonus) * 1000) / 1000).replace(" (ganzer Run)", "")).join(" · ")));
    }

    const gesamt = GACHA_PREISE.reduce((summe, p) => summe + gachaGewicht(p), 0);
    const liste = el("div", "gacha-liste");
    GACHA_PREISE.forEach(preis => {
        const zeile = el("div", null, preis.symbol + " " + preis.name + ": " + (preis.bonus ? preis.text(preis.wert) : preis.text()) +
            "  ·  " + prozentText(gachaGewicht(preis) / gesamt));
        zeile.style.color = RARITAETEN[preis.raritaet].rand;
        liste.appendChild(zeile);
    });
    shopContent.appendChild(erstelleHinweis("Mögliche Preise:"));
    shopContent.appendChild(liste);
}

// ---------- MUENZWURF: Kopf = Einsatz verdoppelt, Zahl = Einsatz weg ----------

function muenzwurfChance() {
    const k = GLUECKSSPIEL.muenzwurf;
    return Math.min(k.maxChance, k.gewinnChance + glueckBonus());
}

function renderMuenzwurf() {
    const karte = spielKarte("🪙 Münzwurf",
        "Kopf: dein Einsatz verdoppelt sich. Zahl: dein Einsatz ist weg. Gewinnchance: " + prozentText(muenzwurfChance()) + ".",
        restText("muenzwurf"));
    const muenze = document.createElement("img");
    muenze.classList.add("wurf-muenze");
    setzeSpriteBild(muenze, muenzeSprite(0), 5);
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
    // setTimeout statt onfinish: laeuft auch, wenn der Browser Animationen im Hintergrund anhaelt
    const beende = () => {
        if (fertig) return;
        fertig = true;
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
        run.glueck.letzterWurf = { gewonnen, text: gewonnen ? "Kopf! +" + zahl(einsatz) + " Gold" : "Zahl … -" + zahl(einsatz) + " Gold" };
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
        los.text = "3x " + los.gewinn.symbol + " = x" + los.gewinn.multi + " · +" + zahl(betrag) + " Gold";
        if (los.gewinn.multi >= 5) Klang.jackpot();
        else Klang.muenze(2);
    } else {
        los.text = "Leider eine Niete.";
        Klang.fehler();
    }
}

function renderRubbellos() {
    const k = GLUECKSSPIEL.rubbellos;
    const tabelle = k.symbole.map(s => "3x" + s.symbol + " x" + s.multi).join("  ");
    const karte = spielKarte("🎟️ Rubbellos", "Rubbel alle 9 Felder frei. 3 gleiche Symbole gewinnen: " + tabelle, restText("rubbellos"));

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
        karte.appendChild(el("div", "spiel-knoepfe", null, [kleinerKnopf("Alles aufrubbeln", true, rubbleAlles)]));
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
    const karte = spielKarte("🐔 Hühnerrennen",
        "Wähl deinen Einsatz und setz auf ein Huhn. Gewinnt es, bekommst du Einsatz x Quote.", restText("huehnerrennen"));

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
        const knopf = kleinerKnopf(huhn.name + " x" + huhn.quote, darfEinkaufen() && rest > 0 && einsatz >= 1 && !glueckAnimation,
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
            run.glueck.letztesRennen = { gewonnen, text: name + " gewinnt! +" + zahl(betrag) + " Gold" };
            Klang.jackpot();
        } else {
            run.glueck.letztesRennen = { gewonnen, text: name + " gewinnt. Dein Einsatz von " + zahl(einsatz) + " Gold ist weg." };
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
    const karte = spielKarte("🔻 Samen-Plinko",
        "Lass einen Samen fallen. Er hüpft durch " + k.reihen + " Reihen Nägel und landet in einem Fach: Einsatz x Fach.",
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
            run.glueck.letztesPlinko = { gewonnen, text: multiText(multi) + " · " + (betrag >= einsatz ? "+" + zahl(betrag - einsatz) : "-" + zahl(einsatz - betrag)) + " Gold" };
            aktualisiereAlles();
        }, 350);
    }
    setTimeout(naechsterSchritt, 150);
}
