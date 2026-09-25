"use strict";

// ============================================================
// SPROUTVALE: Mehr Spektakel (reine Optik)
// Kombo-Fieber am Bildschirmrand, Ringe beim Klicken und Ernten, Gold-Ticker, Jackpot-Feier mit Konfetti,
// grosse Titel bei Tagesstart und Feierabend, federnde Felder, Funken beim Kaufen, funkelnde reife Pflanzen,
// Vogelschwaerme am Himmel. Alles abschaltbar ueber "Wackeln/Blitze" bleibt wie gehabt in ui.js.
// Gehoert zu script.js (wird ueber Haken und kleine Aufrufe angestossen).
// ============================================================

const fieberRahmen = el("div");
fieberRahmen.id = "fieber-rahmen";
document.body.appendChild(fieberRahmen);

// ---------- Ring an einer Stelle (Klick, Ernte, Kauf) ----------

function zeigeRing(x, y, groesse, farbe, dauerMs = 450) {
    const ring = el("div", "effekt-ring");
    ring.style.left = x + "px";
    ring.style.top = y + "px";
    ring.style.setProperty("--groesse", groesse + "px");
    ring.style.borderColor = farbe;
    ring.style.animationDuration = dauerMs + "ms";
    fxLayer.appendChild(ring);
    setTimeout(() => ring.remove(), dauerMs + 50);
}

// ---------- KOMBO-FIEBER: Bildschirmrand leuchtet, ab x4 steigen Flammen am Laden auf ----------

let fieberFlammenMs = 0;

registriereHaken("tagTick", dtMs => {
    const multi = komboMultiplikator();
    const stufe = multi >= 3 ? multi : 0;
    if (document.body.dataset.fieber !== String(stufe)) document.body.dataset.fieber = stufe;
    if (multi < 4) return;
    fieberFlammenMs += dtMs;
    if (fieberFlammenMs < (multi >= 5 ? 90 : 160)) return;
    fieberFlammenMs = 0;
    const rect = plantButton.getBoundingClientRect();
    const flamme = el("div", "fieber-flamme");
    flamme.style.left = rect.left + Math.random() * rect.width + "px";
    flamme.style.top = rect.top + rect.height * (0.4 + Math.random() * 0.5) + "px";
    flamme.style.background = zufall(multi >= 5 ? ["#ff4a1a", "#ffd93d", "#ff8fb1", "#5aa9e6"] : ["#ff8a2a", "#ffd93d", "#ff4a1a"]);
    fxLayer.appendChild(flamme);
    setTimeout(() => flamme.remove(), 900);
});

registriereHaken("tagEnde", () => { document.body.dataset.fieber = 0; });

// ---------- Klick auf den Samenladen: Ring ----------

function klickRing() {
    const rect = plantButton.getBoundingClientRect();
    const multi = run.phase === "tag" ? komboMultiplikator() : 1;
    zeigeRing(rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width * (1.1 + 0.12 * multi),
        KOMBO_FARBEN[multi] || "#ffe89a", 380);
}

// ---------- ERNTE: Druckwelle und Blattwirbel ----------

registriereHaken("ernte", feld => {
    if (run.phase !== "tag") return;
    const { x, y, rect } = feldMitte(feld);
    zeigeRing(x, y, rect.width * 1.3, "rgba(255, 246, 200, 0.9)", 420);
    partikel(x, y, ["#a3dc6f", "#6cc24a", "#ffe89a"], 6, 70);
});

// Viele Pflanzen auf einmal geerntet: grosse Welle (aus script.js, ernteMitCursor)
function grosseErnteWelle(x, y, anzahl) {
    zeigeRing(x, y, 120 + anzahl * 25, "#ffd93d", 600);
    if (anzahl >= 6) {
        zeigeRing(x, y, 200 + anzahl * 30, "#ffffff", 750);
        wackleBildschirm(Math.min(10, anzahl));
    }
}

// ---------- GOLD: Anzeige leuchtet, darunter zaehlt ein "+X" zusammen ----------

let tickerSumme = 0;
let tickerEl = null;
let tickerTimer = null;

function goldTicker(wert) {
    moneyDisplay.classList.remove("gold-glanz");
    void moneyDisplay.offsetWidth;
    moneyDisplay.classList.add("gold-glanz");
    tickerSumme += wert;
    if (!tickerEl) {
        tickerEl = el("div", "gold-ticker");
        document.body.appendChild(tickerEl);
    }
    const rect = moneyDisplay.getBoundingClientRect();
    tickerEl.style.left = rect.left + rect.width / 2 + "px";
    tickerEl.style.top = rect.bottom + 6 + "px";
    tickerEl.textContent = "+" + zahl(tickerSumme);
    tickerEl.classList.remove("weg");
    tickerEl.classList.remove("pop");
    void tickerEl.offsetWidth;
    tickerEl.classList.add("pop");
    clearTimeout(tickerTimer);
    tickerTimer = setTimeout(() => {
        tickerEl.classList.add("weg");
        tickerSumme = 0;
    }, 900);
}

// ---------- JACKPOT: riesiger Schriftzug und Konfetti ueber den ganzen Bildschirm ----------

let letzteJackpotFeier = 0;

function jackpotFeier(x, y) {
    if (performance.now() - letzteJackpotFeier < 1500) return;
    letzteJackpotFeier = performance.now();
    const schrift = el("div", "jackpot-schrift", t("JACKPOT!"));
    document.body.appendChild(schrift);
    setTimeout(() => schrift.remove(), 1600);
    zeigeRing(x, y, 300, "#ffd93d", 700);
    const farben = ["#ffd93d", "#ff8fb1", "#5aa9e6", "#a3dc6f", "#b06ee8", "#ffffff"];
    for (let i = 0; i < 60; i++) {
        const stueck = el("div", "konfetti");
        stueck.style.left = Math.random() * 100 + "vw";
        stueck.style.background = zufall(farben);
        stueck.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
        stueck.style.animationDelay = Math.random() * 0.4 + "s";
        stueck.style.setProperty("--drift", (Math.random() - 0.5) * 200 + "px");
        document.body.appendChild(stueck);
        setTimeout(() => stueck.remove(), 3600);
    }
}

// ---------- GROSSE TITEL: Tagesstart und Feierabend ----------

function zeigeTitel(text, klasse) {
    document.querySelectorAll(".gross-titel").forEach(t => t.remove());
    const titel = el("div", "gross-titel " + (klasse || ""), text);
    document.body.appendChild(titel);
    setTimeout(() => titel.remove(), 1900);
}

registriereHaken("tagStart", () => {
    const z = jahreszeit();
    zeigeTitel(t("☀️ Tag ") + run.tag, "titel-tag");
    setTimeout(() => {
        if (run.phase === "tag") partikel(window.innerWidth / 2, window.innerHeight * 0.35, ["#ffe89a", "#ffffff", z.farbe], 30, 160);
    }, 150);
});

registriereHaken("tagEnde", () => {
    if (!run.sandbox) zeigeTitel(t("🌙 Feierabend!"), "titel-abend");
});

// ---------- SAMEN: das Feld federt beim Landen ----------

registriereHaken("samen", feld => {
    feld.el.feldDiv.animate([{ scale: "1" }, { scale: "0.9" }, { scale: "1.06" }, { scale: "1" }], { duration: 320, easing: "ease-out" });
});

// ---------- KAUFEN: Funken am Knopf ----------

document.addEventListener("click", event => {
    const knopf = event.target.closest && event.target.closest(".upgrade-buy-button, .stern-karte-kaufen, .kauf-kachel");
    if (!knopf || knopf.disabled || knopf.classList.contains("gesperrt")) return;
    const rect = knopf.getBoundingClientRect();
    partikel(rect.left + rect.width / 2, rect.top + rect.height / 2, ["#ffd93d", "#ffffff", "#a3dc6f"], 14, 70);
    zeigeRing(rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width * 1.2, "#ffe89a", 400);
}, true);

// ---------- REIFE PFLANZEN FUNKELN, VOEGEL AM HIMMEL ----------

setInterval(() => {
    if (!run || run.phase !== "tag" || document.hidden || spielPausiert()) return;
    const fertig = run.felder.filter(f => f.fertig);
    if (fertig.length === 0) return;
    const rect = zufall(fertig).el.spriteEl.getBoundingClientRect();
    const funkel = el("div", "reif-funkeln");
    funkel.style.left = rect.left + rect.width * (0.2 + Math.random() * 0.6) + "px";
    funkel.style.top = rect.top + rect.height * (0.1 + Math.random() * 0.5) + "px";
    fxLayer.appendChild(funkel);
    setTimeout(() => funkel.remove(), 800);
}, 260);

setInterval(() => {
    if (document.hidden || !hauptmenue.classList.contains("versteckt") || Math.random() < 0.6) return;
    if (tageszeit > 0.8) return; // nachts schlafen die Voegel
    const schwarm = el("div", "vogel-schwarm" + (Math.random() < 0.5 ? " links" : ""));
    const anzahl = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < anzahl; i++) {
        const vogel = el("span", "vogel");
        vogel.style.left = i * 18 + (Math.random() - 0.5) * 8 + "px";
        vogel.style.top = Math.abs(i - anzahl / 2) * 7 + "px";
        vogel.style.animationDelay = -Math.random() * 0.5 + "s";
        schwarm.appendChild(vogel);
    }
    schwarm.style.top = 30 + Math.random() * 60 + "px";
    schwarm.style.animationDuration = 14 + Math.random() * 8 + "s";
    topBar.appendChild(schwarm);
    setTimeout(() => schwarm.remove(), 23000);
}, 9000);

// ---------- SAMMEL-KETTE: viel Saat schnell hintereinander einsammeln ----------

const KETTE_FENSTER_MS = 700;
let kette = { anzahl: 0, bis: 0, el: null };

function sammelKette(x, y) {
    const jetzt = performance.now();
    kette.anzahl = jetzt < kette.bis ? kette.anzahl + 1 : 1;
    kette.bis = jetzt + KETTE_FENSTER_MS;
    if (kette.anzahl < 3) return;
    if (!kette.el) {
        kette.el = el("div", "sammel-kette");
        document.body.appendChild(kette.el);
    }
    kette.el.textContent = t("Kette x") + kette.anzahl;
    kette.el.style.left = x + "px";
    kette.el.style.top = y - 50 + "px";
    kette.el.style.setProperty("--kette", Math.min(1, kette.anzahl / 50));
    kette.el.classList.remove("weg", "pop");
    void kette.el.offsetWidth;
    kette.el.classList.add("pop");
    clearTimeout(kette.timer);
    kette.timer = setTimeout(() => kette.el.classList.add("weg"), KETTE_FENSTER_MS);
    if ([10, 25, 50, 100, 200].includes(kette.anzahl)) {
        partikel(x, y, ["#ffd93d", "#ff8fb1", "#5aa9e6", "#ffffff"], 30, 130);
        zeigeRing(x, y, 160, "#ff8fb1", 500);
        Klang.erfolg();
    }
}

// ---------- LICHTSAEULE: epische und legendaere Saat leuchten beim Landen ----------

function lichtsaeule(x, y, farbe) {
    const saeule = el("div", "lichtsaeule");
    saeule.style.left = x + "px";
    saeule.style.top = y + "px";
    saeule.style.setProperty("--farbe", farbe);
    fxLayer.appendChild(saeule);
    setTimeout(() => saeule.remove(), 1300);
}

// ---------- STELLARIUM: gekaufter Stern blitzt auf ----------

function sternGekauft(def) {
    const stern = document.querySelector('.stern[data-id="' + def.id + '"]');
    if (!stern) return;
    const rect = stern.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    zeigeRing(x, y, rect.width * 2.4, "#ffe89a", 550);
    partikel(x, y, ["#ffe89a", "#ffffff", "#8fa2f0"], 22, 90);
    const stufe = level(def.id);
    const text = el("div", "stern-aufstieg", def.max > 1 ? t("Stufe ") + stufe + "!" : t("✔ Freigeschaltet!"));
    text.style.left = x + "px";
    text.style.top = rect.top - 10 + "px";
    document.body.appendChild(text);
    setTimeout(() => text.remove(), 1200);
}

// ---------- RECHNUNG BEZAHLT: Stempel und goldener Regen ----------

registriereHaken("rechnungBezahlt", (nummer, warBoss) => {
    const stempel = el("div", "bezahlt-stempel" + (warBoss ? " kredit" : ""), warBoss ? t("✔ KREDIT ABBEZAHLT") : t("✔ BEZAHLT"));
    document.body.appendChild(stempel);
    setTimeout(() => stempel.remove(), 1900);
    wackleBildschirm(8);
    for (let i = 0; i < 30; i++) {
        const stueck = el("div", "konfetti goldregen-stueck");
        stueck.style.left = Math.random() * 100 + "vw";
        stueck.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
        stueck.style.animationDelay = Math.random() * 0.5 + "s";
        stueck.style.setProperty("--drift", (Math.random() - 0.5) * 120 + "px");
        document.body.appendChild(stueck);
        setTimeout(() => stueck.remove(), 3200);
    }
});

// ---------- NEUE PFLANZE: gross in der Mitte mit Lichtstrahlen ----------

function neuePflanzeFeier(pflanze) {
    const buehne = el("div", "neue-pflanze");
    const bild = document.createElement("img");
    bild.alt = "";
    setzeSpriteBild(bild, pflanze.id, 10);
    buehne.append(el("div", "neue-pflanze-strahlen"), bild, el("div", "neue-pflanze-text", t("Neu: ") + pflanze.name + "!"));
    document.body.appendChild(buehne);
    setTimeout(() => buehne.remove(), 2400);
}

// ---------- GLEICHTAKT: alle Dauer-Animationen auf den Feldern laufen synchron ----------
// Felder werden zu verschiedenen Zeiten gekauft, ihre Animationen (Kristall-Glanz, Lava, Sterne, reife Pflanzen ...)
// starten also versetzt. Hier bekommen alle endlosen Animationen denselben Startpunkt (0 = Seitenstart).
// Einmal-Effekte (Ernte-Hopser usw.) bleiben unberuehrt, sonst waeren sie sofort vorbei.

const feldRasterFuerTakt = document.getElementById("field-grid");

function synchronisiereFeldAnimationen() {
    if (!feldRasterFuerTakt || document.hidden) return;
    feldRasterFuerTakt.getAnimations({ subtree: true }).forEach(animation => {
        const ziel = animation.effect && animation.effect.target;
        if (!ziel || !ziel.closest(".feld")) return;
        if (animation.effect.getTiming().iterations !== Infinity) return;
        if (animation.startTime !== 0 && animation.playState === "running") animation.startTime = 0;
    });
}
setInterval(synchronisiereFeldAnimationen, 400);
