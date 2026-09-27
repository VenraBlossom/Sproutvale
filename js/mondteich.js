"use strict";

// ============================================================
// SPROUTVALE: Mondteich (dauerhafte Upgrades, Tarot, Kuscheltiere, Sternenfall, Spielmodi)
// Gehoert zu script.js (gemeinsame Funktionen und Zustand stehen dort).
// ============================================================

function oeffnePrestigeShop() {
    schliessePanels();
    prestigeShop.classList.remove("versteckt");
    renderPrestigeShop();
    aktualisiereMusik();
}

function schliessePrestigeShop() {
    prestigeShop.classList.add("versteckt");
}

// ---------- DAUERHAFTE UPGRADES (Mondblueten) ----------

function kaufeMetaUpgrade(def) {
    const lvl = metaLevel(def.id);
    const kosten = kostenMitFaktor(def.basiskosten, def.faktor, lvl);
    if (lvl >= def.max || meta.mondblueten < kosten) return;
    meta.mondblueten -= kosten;
    meta.upgrades[def.id] = lvl + 1;
    Klang.kaufen();
    speichereMeta();
    renderPrestigeShop();
}

function renderMetaUpgrades() {
    prestigeInfo.textContent = (run.sandbox
        ? t("♾️ Mondteich von Endlos: eigener Fortschritt, getrennt von Story. Mondblüten gibt es beim Neuanfang für Meilensteine")
        : t("Mondblüten bekommst du am Ende jedes Runs für bezahlte Rechnungen (1. = 2, 2. = 8, 3. = 18 …)")) +
        (meta.sternenfaelle > 0 ? t(", durch deine Sternenfälle x") + zahl(sternenfallFaktor()) + "." : ".");
    META_UPGRADES.filter(def => !(run.sandbox && SANDBOX_AUS_META.includes(def.id))).forEach(def => {
        const lvl = metaLevel(def.id);
        const kosten = kostenMitFaktor(def.basiskosten, def.faktor, lvl);
        const istMax = lvl >= def.max;
        const karte = erstelleKarte({
            titel: def.name + " (" + stufenText(lvl, def.max) + ")",
            beschreibung: def.beschreibung,
            info: t("Aktuell: ") + def.info(lvl),
            knopfText: istMax ? t("Maximal") : zahl(kosten) + t(" Mondblüten"),
            aktiv: !istMax && meta.mondblueten >= kosten,
            onKauf: () => kaufeMetaUpgrade(def)
        });
        if (def.max === Infinity) karte.classList.add("unendlich");
        prestigeInhalt.appendChild(karte);
    });
}

// ---------- TAROTKARTEN ----------
// Alle Karten sind gleich gross. Klick auf eine Karte oeffnet sie gross mit allen Texten und Knoepfen.

function kaufeTarot(karte) {
    const preis = tarotKaufPreis();
    if (hatTarot(karte.id) || meta.mondblueten < preis) return false;
    meta.mondblueten -= preis;
    meta.tarot.push(karte.id);
    Klang.segen();
    speichereMeta();
    renderPrestigeShop();
    return true;
}

function verbessereTarot(karte) {
    if (!hatTarot(karte.id) || istVerbessert(karte.id) || meta.mondblueten < KONFIG.tarotVerbessernPreis) return false;
    meta.mondblueten -= KONFIG.tarotVerbessernPreis;
    meta.tarotVerbessert.push(karte.id);
    Klang.jackpot();
    speichereMeta();
    renderPrestigeShop();
    return true;
}

function wechsleTarotSlot(karte) {
    if (!istVerbessert(karte.id)) return false;
    const slots = meta.tarotSlots;
    const index = slots.indexOf(karte.id);
    if (index >= 0) {
        slots.splice(index, 1);
        Klang.klick(10);
    } else if (slots.length < KONFIG.tarotSlots) {
        slots.push(karte.id);
        Klang.stern();
    } else {
        zeigeToast("Alle " + KONFIG.tarotSlots + t(" Plätze sind belegt. Leg zuerst eine ausgerüstete Karte ab."));
        Klang.fehler();
        return false;
    }
    speichereMeta();
    renderPrestigeShop();
    return true;
}

function tarotStatus(karte) {
    if (istVerstaerkt(karte.id)) return { text: t("⭐ Ausgerüstet"), klasse: "ausgeruestet" };
    if (istVerbessert(karte.id)) return { text: t("✨ Verbessert"), klasse: "verbessert" };
    if (hatTarot(karte.id)) return { text: t("Im Besitz"), klasse: "besessen" };
    return { text: zahl(tarotKaufPreis()) + t(" Mondblüten"), klasse: "kaufbar" };
}

function renderTarot() {
    prestigeInfo.textContent = t("⭐ Ausgerüstet: ") + meta.tarotSlots.length + "/" + KONFIG.tarotSlots +
        t("  ·  Nächste Karte: ") + zahl(tarotKaufPreis()) + t(" Mondblüten (jede Karte macht die nächste 20% teurer)") +
        t("  ·  Verbessern: ") + KONFIG.tarotVerbessernPreis + t(" Mondblüten. Klick auf eine Karte für alle Details.");

    const raster = el("div", "tarot-raster");
    TAROT.filter(karte => !(run.sandbox && SANDBOX_AUS_TAROT.includes(karte.id))).forEach(karte => {
        const status = tarotStatus(karte);
        const kachel = el("button", "tarot-karte " + status.klasse);
        kachel.append(
            el("div", "tarot-nummer", karte.nummer),
            pixelIcon(karte.symbol, 48, "tarot-symbol"),
            el("div", "tarot-name", karte.name),
            el("div", "tarot-effekt", karte.text(istVerstaerkt(karte.id) ? KONFIG.tarotVerstaerkung : 1)),
            el("div", "tarot-fuss", status.text)
        );
        kachel.addEventListener("click", () => zeigeTarotDetails(karte));
        raster.appendChild(kachel);
    });
    prestigeInhalt.appendChild(raster);
}

function zeigeTarotDetails(karte) {
    const besessen = hatTarot(karte.id);
    const verbessert = istVerbessert(karte.id);
    const ausgeruestet = istVerstaerkt(karte.id);
    const f = KONFIG.tarotVerstaerkung;

    const inhalt = el("div", "tarot-detail", null, [
        el("div", "tarot-detail-bild", null, [el("div", "tarot-nummer", karte.nummer), pixelIcon(karte.symbol, 96)]),
        el("div", "tarot-detail-texte", null, [
            el("div", "tarot-detail-zeile", null, [el("b", null, t("Normal: ")), el("span", null, karte.text(1))]),
            el("div", "tarot-detail-zeile" + (ausgeruestet ? " aktiv" : ""), null, [
                el("b", null, t("Verbessert und ausgerüstet: ")),
                el("span", null, karte.text(f) + (karte.extra ? t(" Zusätzlich: ") + karte.extra : ""))
            ]),
            el("div", "tarot-detail-status", besessen
                ? (ausgeruestet ? t("⭐ Diese Karte ist ausgerüstet und wirkt verstärkt.")
                    : verbessert ? t("✨ Verbessert. Rüste sie aus, damit sie verstärkt wirkt.")
                        : t("Du besitzt diese Karte. Sie wirkt in jedem Run."))
                : t("Du besitzt diese Karte noch nicht."))
        ])
    ]);

    const knoepfe = [];
    if (!besessen) {
        const preis = tarotKaufPreis();
        knoepfe.push({ text: t("Kaufen · ") + zahl(preis) + t(" Mondblüten"), klasse: "knopf-lila", deaktiviert: meta.mondblueten < preis,
            aktion: () => { if (kaufeTarot(karte)) zeigeTarotDetails(karte); } });
    } else if (!verbessert) {
        knoepfe.push({ text: t("Verbessern · ") + KONFIG.tarotVerbessernPreis + t(" Mondblüten"), klasse: "knopf-lila",
            deaktiviert: meta.mondblueten < KONFIG.tarotVerbessernPreis,
            aktion: () => { if (verbessereTarot(karte)) zeigeTarotDetails(karte); } });
    } else {
        knoepfe.push({ text: ausgeruestet ? t("Ablegen") : t("Ausrüsten (") + meta.tarotSlots.length + "/" + KONFIG.tarotSlots + ")",
            klasse: ausgeruestet ? null : "knopf-gruen",
            aktion: () => { if (wechsleTarotSlot(karte)) zeigeTarotDetails(karte); } });
    }
    knoepfe.push({ text: t("Schließen") });
    schliesseOberstesPopup();
    zeigePopup({ titel: karte.nummer + " · " + karte.name, inhalt, farbe: "#7c4fb3", breite: 640, knoepfe, klasse: "tarot-popup" });
}

// ---------- KUSCHEL-AUTOMAT (Gacha, Kuscheltiere bleiben fuer immer) ----------
// Ein Zug pro Klick (keine 10er-Zuege). Mit Gutschein kostenlos, sonst Mondblueten:
// der erste Zug kostet 1, jeder bezahlte Zug macht den naechsten um 1 teurer (mit Kuschel-Rabatt nur jeder 2.).

function kuschelPreis() {
    const schritte = metaLevel("kuschelrabatt") > 0 ? Math.floor(meta.kuschelZuegeBezahlt / 2) : meta.kuschelZuegeBezahlt;
    return KUSCHEL_KONFIG.preis + schritte;
}

function wuerfleKuschelRaritaet() {
    return KUSCHEL_RARITAETEN.indexOf(gewichteterZufall(KUSCHEL_RARITAETEN, r => r.chance));
}

// Wie viele Stueck braucht man fuer die naechste Stufe? (1, 2, 4, 8, 16)
function kuschelNaechsteStufeBei(stufe) {
    return Math.pow(2, stufe);
}

// Sind die Gutscheine gerade aufgebraucht, kann man kurz nicht mit Mondblueten ziehen (sonst gibt man sie aus Versehen aus)
const KUSCHEL_SPERRE_MS = 2500;
let kuschelSperreBis = 0;

function zieheKuschel(mitGutschein) {
    if (mitGutschein) {
        if (meta.gutscheine <= 0) return;
        meta.gutscheine -= 1;
        if (meta.gutscheine === 0) kuschelSperreBis = performance.now() + KUSCHEL_SPERRE_MS;
    } else {
        const preis = kuschelPreis();
        if (meta.mondblueten < preis || performance.now() < kuschelSperreBis) return;
        meta.mondblueten -= preis;
        meta.kuschelZuegeBezahlt += 1;
    }
    const raritaet = wuerfleKuschelRaritaet();
    const tier = zufall(KUSCHELTIERE.filter(k => k.raritaet === raritaet && !(run.sandbox && SANDBOX_AUS_KUSCHEL.includes(k.id))));
    const stufeVorher = kuschel(tier.id);
    meta.kuscheltiere[tier.id] = (meta.kuscheltiere[tier.id] || 0) + 1;
    const stufeNachher = kuschel(tier.id);
    speichereMeta();
    zeigeKapsel({ tier, raritaet, neu: stufeVorher === 0, stufe: stufeNachher, aufgestiegen: stufeVorher > 0 && stufeNachher > stufeVorher });
}

// Kapsel faellt, wackelt 3-mal und springt auf. Je seltener, desto bunter die Strahlen.
function zeigeKapsel(ergebnis) {
    const r = KUSCHEL_RARITAETEN[ergebnis.raritaet];
    const buehne = el("div", "kapsel-buehne");
    buehne.style.setProperty("--kapsel-farbe", r.farbe);
    buehne.style.setProperty("--kapsel-rand", r.rand);
    const strahlen = el("div", "kapsel-strahlen");
    const kapsel = el("div", "kapsel", null, [el("div", "kapsel-oben"), el("div", "kapsel-unten")]);
    const preis = el("div", "kapsel-preis versteckt");
    buehne.append(strahlen, kapsel, preis);
    const unten = el("div", "kapsel-knoepfe");
    const inhalt = el("div", null, null, [buehne, unten]);
    const schliesse = zeigePopup({ titel: t("🎪 Kuschel-Automat"), inhalt, farbe: r.rand, breite: 560, schliessbar: false, klasse: "kapsel-popup" });

    // Selten und besser wackelt laenger (Spannung!). "Ueberspringen" oeffnet die Kapsel sofort.
    const wackler = ergebnis.raritaet >= 3 ? 3 : 2;
    const timer = [];
    for (let i = 0; i < wackler; i++) {
        timer.push(setTimeout(() => {
            kapsel.classList.remove("wackelt");
            void kapsel.offsetWidth;
            kapsel.classList.add("wackelt");
            Klang.kapselWackeln();
        }, 500 + i * 550));
    }
    const ueberspringen = el("button", "knopf spiel-skip", t("⏭ Überspringen"));
    unten.appendChild(ueberspringen);
    let geoeffnet = false;
    const oeffne = () => {
        if (geoeffnet) return;
        geoeffnet = true;
        timer.forEach(clearTimeout);
        ueberspringen.remove();
        renderPrestigeShop(); // erst jetzt erscheint das Tier in der Sammlung dahinter
        kapsel.classList.add("offen");
        strahlen.classList.add("an", "r-" + r.id);
        Klang.kapselAuf(ergebnis.raritaet);
        if (ergebnis.raritaet >= 4) {
            bildschirmBlitz(r.farbe, 0.4, 350);
            wackleBildschirm(8);
        }
        const tier = ergebnis.tier;
        preis.classList.remove("versteckt");
        preis.append(
            pixelIcon(tier.symbol, 96, "kapsel-tier"),
            el("div", "kapsel-name", tier.name),
            el("div", "kapsel-raritaet", r.name),
            el("div", "kapsel-status", ergebnis.neu ? t("NEU!") : ergebnis.aufgestiegen ? t("Stufe ") + ergebnis.stufe + "!" : t("+1 Stück")),
            el("div", "kapsel-text", tier.text(ergebnis.stufe))
        );
        preis.querySelector(".kapsel-raritaet").style.color = r.rand;

        const nochmal = meta.gutscheine > 0
            ? el("button", "knopf knopf-lila", t("Nochmal mit Gutschein 🎟️ (") + meta.gutscheine + ")")
            : el("button", "knopf knopf-lila", t("Nochmal · ") + zahl(kuschelPreis()) + t(" Mondblüten"));
        nochmal.disabled = meta.gutscheine <= 0 && meta.mondblueten < kuschelPreis();
        // Letzter Gutschein verbraucht: kurz warten und deutlich sagen, dass jetzt Mondblueten kosten
        const rest = kuschelSperreBis - performance.now();
        if (meta.gutscheine <= 0 && rest > 0 && !nochmal.disabled) {
            nochmal.disabled = true;
            const text = nochmal.textContent;
            unten.appendChild(el("div", "kuschel-sperre", t("Keine Gutscheine mehr! Der nächste Zug kostet Mondblüten.")));
            setTimeout(() => {
                nochmal.disabled = meta.mondblueten < kuschelPreis();
                nochmal.textContent = text;
            }, rest);
        }
        nochmal.addEventListener("click", () => {
            schliesse();
            zieheKuschel(meta.gutscheine > 0);
        });
        const fertig = el("button", "knopf knopf-gruen", t("Super!"));
        fertig.addEventListener("click", schliesse);
        unten.append(nochmal, fertig);
        schliesse.erlaubeSchliessen();
    };
    ueberspringen.addEventListener("click", oeffne);
    timer.push(setTimeout(oeffne, 600 + wackler * 550));
}

function renderKuscheltiere() {
    const k = KUSCHEL_KONFIG;
    prestigeInfo.textContent = t("Kuscheltiere bleiben für immer und geben dir in jedem Run einen Bonus. ") +
        t("Doppelte verbessern ein Kuscheltier automatisch (Stufe 1 bis ") + k.maxStufe + t(": 1, 2, 4, 8, 16 Stück). ") +
        t("Gutscheine bekommst du für jede Erfolg-Stufe (bei den Erfolgen abholen).");

    const preis = kuschelPreis();
    const chancen = el("div", "kuschel-chancen");
    KUSCHEL_RARITAETEN.forEach(r => {
        const teil = el("span", null, r.name + " " + prozentText(r.chance));
        teil.style.color = r.rand;
        chancen.appendChild(teil);
    });
    const automat = el("div", "kuschel-automat", null, [
        el("div", "kuschel-automat-kopf", null, [pixelIcon("🎪", 48), el("b", null, t("Kuschel-Automat")), chancen]),
        el("div", "spiel-knoepfe", null, [
            kleinerKnopf(t("🎟️ Mit Gutschein ziehen (") + meta.gutscheine + ")", meta.gutscheine > 0, () => zieheKuschel(true), "knopf-gruen"),
            kleinerKnopf(t("Ziehen · ") + zahl(preis) + t(" Mondblüten"), meta.mondblueten >= preis && performance.now() >= kuschelSperreBis,
                () => zieheKuschel(false), "knopf-lila")
        ]),
        el("div", "kuschel-hinweis", (metaLevel("kuschelrabatt") > 0 ? t("Jeder 2. Zug") : t("Jeder Zug")) +
            t(" mit Mondblüten macht den nächsten um 1 teurer. Gutschein-Züge sind immer kostenlos."))
    ]);
    prestigeInhalt.appendChild(automat);

    const rahmen = gewaehlteKosmetik("rahmen").css;
    const sammlung = el("div", "kuschel-sammlung");
    KUSCHELTIERE.filter(tier => !(run.sandbox && SANDBOX_AUS_KUSCHEL.includes(tier.id))).forEach(tier => {
        const r = KUSCHEL_RARITAETEN[tier.raritaet];
        const anzahl = meta.kuscheltiere[tier.id] || 0;
        const stufe = kuschel(tier.id);
        const karte = el("div", "kuschel-karte r-" + r.id + (rahmen ? " " + rahmen : ""));
        karte.classList.toggle("besessen", stufe > 0);
        karte.style.borderColor = r.rand;
        karte.append(
            pixelIcon(stufe > 0 ? tier.symbol : "❔", 48, "kuschel-symbol"),
            el("div", "kuschel-name", stufe > 0 ? tier.name : "???")
        );
        const seltenheit = el("div", "kuschel-seltenheit", r.name);
        seltenheit.style.color = r.rand;
        karte.appendChild(seltenheit);
        if (stufe > 0) {
            karte.append(
                el("div", "kuschel-sterne", "★".repeat(stufe) + "☆".repeat(k.maxStufe - stufe)),
                el("div", "kuschel-text", tier.text(stufe)),
                el("div", "kuschel-fortschritt", stufe >= k.maxStufe
                    ? t("Maximal (") + anzahl + t(" Stück)")
                    : anzahl + " / " + kuschelNaechsteStufeBei(stufe) + t(" bis Stufe ") + (stufe + 1))
            );
        } else {
            karte.appendChild(el("div", "kuschel-text", t("Noch nicht gefunden.")));
        }
        sammlung.appendChild(karte);
    });
    prestigeInhalt.appendChild(sammlung);
}

// ---------- STERNENFALL (zweite Prestige-Ebene) ----------

function sternenfallSplitter() {
    return Math.floor(Math.sqrt(meta.mondbluetenSeitSternenfall / STERNENFALL_KONFIG.splitterTeiler));
}

function kannSternenfall() {
    return meta.mondbluetenSeitSternenfall >= STERNENFALL_KONFIG.mindestMondblueten;
}

function loeseSternenfallAus() {
    if (!kannSternenfall()) return;
    const splitter = sternenfallSplitter();
    const geschenk = 5 * sfLevel("himmelsgabe");
    meta.sternensplitter += splitter;
    meta.sternenfaelle += 1;
    meta.mondblueten = 0;
    meta.mondbluetenSeitSternenfall = 0;
    meta.upgrades = {};
    meta.gutscheine += geschenk;
    speichereMeta();
    Klang.goldregen();
    bildschirmBlitz("#c9b0f5", 0.6, 600);
    zeigeBanner("☄️", t("Sternenfall!"), "+" + splitter + t(" Sternensplitter · alle Mondblüten ab jetzt x") +
        zahl(sternenfallFaktor()) + (geschenk ? " · +" + geschenk + t(" Gutscheine") : ""), "#7c4fb3", 4500);
    // Ein vorbereiteter Tag 1 wird mit den neuen Werten neu aufgebaut
    if (run.phase === "vorTag" && run.tag === 1 && !run.koop) starteNeuenRun(false);
    oeffnePrestigeShop();
}

function frageSternenfall() {
    const splitter = sternenfallSplitter();
    zeigePopup({
        titel: t("☄️ Sternenfall auslösen?"),
        farbe: "#7c4fb3",
        breite: 620,
        inhalt: el("div", "sternenfall-frage", null, [
            el("p", null, t("Du verlierst: alle Mondblüten und alle dauerhaften Upgrades im Mondteich.")),
            el("p", null, t("Du behältst: Tarotkarten, Kuscheltiere, Gutscheine, Erfolge, Kosmetik und Endlos.")),
            el("p", null, t("Du bekommst: ") + splitter + t(" Sternensplitter und alle zukünftigen Mondblüten zählen dreifach (x") +
                zahl(Math.pow(STERNENFALL_KONFIG.mondbluetenFaktor, meta.sternenfaelle + 1)) + ").")
        ]),
        knoepfe: [
            { text: t("Abbrechen") },
            { text: t("☄️ Sternenfall!"), klasse: "knopf-lila", aktion: loeseSternenfallAus }
        ]
    });
}

function kaufeSternenfallUpgrade(def) {
    const lvl = sfLevel(def.id);
    const kosten = kostenMitFaktor(def.basiskosten, def.faktor, lvl);
    if (lvl >= def.max || meta.sternensplitter < kosten) return;
    meta.sternensplitter -= kosten;
    meta.sternenfallUpgrades[def.id] = lvl + 1;
    Klang.stern();
    speichereMeta();
    renderPrestigeShop();
}

function renderSternenfall() {
    prestigeInfo.textContent = t("Der Sternenfall ist die zweite Prestige-Ebene. Er setzt Mondblüten und Mondteich-Upgrades zurück, ") +
        t("dafür zählt jede zukünftige Mondblüte dreifach und du bekommst Sternensplitter für starke, dauerhafte Upgrades.");

    const fortschritt = Math.min(1, meta.mondbluetenSeitSternenfall / STERNENFALL_KONFIG.mindestMondblueten);
    const balken = el("div", "erfolg-balken");
    const fuellung = el("div");
    fuellung.style.width = fortschritt * 100 + "%";
    balken.appendChild(fuellung);
    const knopf = el("button", "knopf knopf-lila haupt-knopf", kannSternenfall()
        ? t("☄️ Sternenfall auslösen (+") + sternenfallSplitter() + t(" Splitter)")
        : t("🔒 Noch ") + zahl(STERNENFALL_KONFIG.mindestMondblueten - meta.mondbluetenSeitSternenfall) + t(" Mondblüten"));
    knopf.disabled = !kannSternenfall();
    knopf.addEventListener("click", frageSternenfall);
    prestigeInhalt.appendChild(el("div", "sternenfall-kasten", null, [
        pixelIcon("☄️", 64),
        el("div", "sternenfall-text", null, [
            el("b", null, t("Sternenfälle bisher: ") + meta.sternenfaelle + t(" · Mondblüten x") + zahl(sternenfallFaktor())),
            el("span", null, t("Verdient seit dem letzten Sternenfall: ") + zahl(meta.mondbluetenSeitSternenfall) + " / " +
                zahl(STERNENFALL_KONFIG.mindestMondblueten) + t(" Mondblüten")),
            balken
        ]),
        knopf
    ]));

    STERNENFALL_UPGRADES.forEach(def => {
        const lvl = sfLevel(def.id);
        const kosten = kostenMitFaktor(def.basiskosten, def.faktor, lvl);
        const istMax = lvl >= def.max;
        const karte = erstelleKarte({
            icon: def.symbol,
            titel: def.name + " (" + stufenText(lvl, def.max) + ")",
            beschreibung: def.beschreibung,
            info: t("Aktuell: ") + def.info(lvl),
            knopfText: istMax ? t("Maximal") : zahl(kosten) + t(" Sternensplitter"),
            aktiv: !istMax && meta.sternensplitter >= kosten,
            onKauf: () => kaufeSternenfallUpgrade(def)
        });
        if (def.max === Infinity) karte.classList.add("unendlich");
        prestigeInhalt.appendChild(karte);
    });
}

// ---------- SPIELMODI ----------

function hatSandbox() {
    return meta.sandbox || meta.dlc;
}

function kaufeSandbox() {
    if (hatSandbox() || meta.mondblueten < SANDBOX_KONFIG.preis) return;
    meta.mondblueten -= SANDBOX_KONFIG.preis;
    meta.sandbox = true;
    speichereMeta();
    Klang.jackpot();
    zeigeBanner("♾️", t("Endlos freigeschaltet!"), t("Keine Rechnungen, unendliche Entwicklung"), "#2e9e2e", 3500);
    renderPrestigeShop();
}

// Mondphasen: Auswahl der Schwierigkeit fuer den naechsten normalen Run
function waehleMondphase(index) {
    if (index > (meta.mondphaseFrei || 0)) return;
    meta.mondphase = index;
    speichereMeta();
    // Ein vorbereiteter Tag 1 uebernimmt die Phase sofort (im Duo nicht: dort waehlt der Host beim Start)
    if (run.phase === "vorTag" && run.tag === 1 && !run.sandbox && !run.koop) starteNeuenRun(false);
    Klang.stern();
    oeffnePrestigeShop();
}

function renderMondphasen() {
    const kasten = el("div", "mondphasen-kasten");
    kasten.appendChild(el("div", "mondphasen-titel", t("🌙 Mondphasen: Schwierigkeit für normale Runs")));
    kasten.appendChild(el("div", "mondphasen-hinweis", t("Jede Phase ist schwerer als die vorige, ihre Regeln gelten zusammen. ") +
        t("Dafür gibt es +") + Math.round(MONDPHASE_BONUS * 100) + t("% Mondblüten pro Phase. Die nächste Phase wird frei, wenn du in der ") +
        t("höchsten freien Phase ") + MONDPHASE_FREI_AB_RECHNUNGEN + t(" Rechnungen in einem Run bezahlst.")));
    const reihe = el("div", "mondphasen-reihe");
    MONDPHASEN.forEach((phase, index) => {
        const frei = index <= (meta.mondphaseFrei || 0);
        const aktiv = index === Math.min(meta.mondphase || 0, meta.mondphaseFrei || 0);
        const neu = index > (meta.mondphaseGesehen || 0) && frei;
        const knopf = el("button", "mondphase" + (aktiv ? " aktiv" : "") + (frei ? "" : " gesperrt") + (neu ? " neu" : ""), null, [
            neu ? el("div", "mondphase-neu", t("NEU")) : null,
            el("div", "mondphase-symbol", phase.symbol),
            el("div", "mondphase-name", phase.name),
            el("div", "mondphase-text", frei ? phase.text : "🔒 " + MONDPHASE_FREI_AB_RECHNUNGEN + t(" Rechnungen in der Phase davor")),
            el("div", "mondphase-bonus", "+" + Math.round(MONDPHASE_BONUS * 100 * index) + t("% Mondblüten"))
        ]);
        knopf.addEventListener("click", () => {
            if (!frei) {
                Klang.fehler();
                return;
            }
            waehleMondphase(index);
        });
        reihe.appendChild(knopf);
    });
    kasten.appendChild(reihe);
    prestigeInhalt.appendChild(kasten);
}

function renderSpielmodi() {
    prestigeInfo.textContent = t("Spielmodi verändern die Regeln eines Runs.");
    // Im Duo startet nur der Host neue Runs, und zwar aus der Lobby
    if (run.koop) {
        prestigeInhalt.appendChild(erstelleHinweis(t("👥 Im Duo startet der Host neue Runs in der Lobby. Die Mondphase des Hosts gilt für euch beide. ") +
            t("Deine Auswahl hier gilt für deine Solo-Runs.")));
        if (!run.sandbox) renderMondphasen();
        if (neueMondphase()) {
            meta.mondphaseGesehen = meta.mondphaseFrei || 0;
            speichereMeta();
            aktualisiereMondphaseHinweis();
        }
        return;
    }
    if (!run.sandbox) renderMondphasen(); // Mondphasen gelten nur fuer normale Runs
    // Neue Mondphasen sind jetzt gesehen (das Ausrufezeichen verschwindet beim naechsten Oeffnen)
    if (neueMondphase()) {
        meta.mondphaseGesehen = meta.mondphaseFrei || 0;
        speichereMeta();
        aktualisiereMondphaseHinweis();
    }
    prestigeInhalt.appendChild(erstelleKarte({
        icon: "🌱",
        titel: t("Normaler Run"),
        beschreibung: t("Rechnungen alle 5 Tage, Segen, Kredite mit Auflagen und Mondblüten am Ende."),
        info: t("Immer verfügbar"),
        knopfText: run.sandbox ? t("Zum normalen Run") : t("Normalen Run starten"),
        aktiv: true,
        onKauf: () => (run.sandbox ? wechsleZuModus(false) : starteNeuenRun(false))
    }));
    const frei = hatSandbox();
    prestigeInhalt.appendChild(erstelleKarte({
        icon: "♾️",
        titel: t("Endlos"),
        beschreibung: t("Keine Rechnungen, unendliche Entwicklung: Bau deinen Hof so groß, wie du willst. ") +
            t("Keine Energie: Tag und Nacht laufen einfach weiter, einkaufen kannst du jederzeit. Statt Rechnungen gibt es ") +
            t("Meilensteine für verdientes Gold (je 1 Segen). Mit dem Neuanfang fängst du von vorn an und bekommst die Hälfte der ") +
            t("Mondblüten, die die Meilensteine als Rechnungen bringen würden. Keine Erfolge. Eigener Spielstand, wählbar im Hauptmenü. ") +
            t("Mit dem Unterstützer-Paket ist sie später sofort frei."),
        info: frei ? t("Freigeschaltet") : t("Einmalig ") + zahl(SANDBOX_KONFIG.preis) + t(" Mondblüten"),
        knopfText: frei ? (run.sandbox ? t("Endlos neu starten") : t("Zu Endlos")) : zahl(SANDBOX_KONFIG.preis) + t(" Mondblüten"),
        aktiv: frei || meta.mondblueten >= SANDBOX_KONFIG.preis,
        onKauf: () => (!frei ? kaufeSandbox() : run.sandbox ? starteNeuenRun(true) : wechsleZuModus(true))
    }));
}

// Wurde eine neue Mondphase frei, die man sich noch nicht angesehen hat?
function neueMondphase() {
    return (meta.mondphaseFrei || 0) > (meta.mondphaseGesehen || 0);
}

// Ausrufezeichen am Mondteich-Knopf (Tageskarte)
function aktualisiereMondphaseHinweis() {
    const knopf = $("karte-prestige");
    if (knopf) knopf.classList.toggle("hat-neues", neueMondphase());
}

// ---------- MONDTEICH-FENSTER ----------

function renderPrestigeShop() {
    prestigeGuthaben.innerHTML = "";
    prestigeGuthaben.append(
        el("span", "guthaben-teil", null, [spriteIcon("mondbluete", true), el("span", null, zahl(meta.mondblueten) + t(" Mondblüten"))]),
        el("span", "guthaben-teil", null, [pixelIcon("🎟️", 32), el("span", null, meta.gutscheine + t(" Gutscheine"))])
    );
    if (meta.sternenfaelle > 0 || meta.sternensplitter > 0) {
        prestigeGuthaben.appendChild(el("span", "guthaben-teil", null, [pixelIcon("💠", 32), el("span", null, zahl(meta.sternensplitter) + t(" Sternensplitter"))]));
    }
    prestigeWeiter.textContent = run.phase !== "runEnde" ? t("Übernehmen") : run.sandbox ? t("Endlos neu starten") : t("Neuen Run starten");

    renderReiter(prestigeReiter, [
        { id: "upgrades", text: t("🏆 Upgrades") },
        { id: "tarot", text: t("🔮 Tarot (") + meta.tarot.length + "/" + TAROT.length + ")" },
        { id: "kuschel", text: t("🧸 Kuscheltiere (") + Object.keys(meta.kuscheltiere).length + "/" + KUSCHELTIERE.length + ")" +
            (meta.gutscheine > 0 ? " 🎟️" + meta.gutscheine : "") },
        { id: "sternenfall", text: t("☄️ Sternenfall") + (kannSternenfall() ? " !" : "") },
        { id: "modi", text: t("🎮 Spielmodi") + (neueMondphase() ? " !" : "") }
    ], aktiverPrestigeReiter, id => {
        aktiverPrestigeReiter = id;
        renderPrestigeShop();
    });

    prestigeInhalt.innerHTML = "";
    prestigeInhalt.dataset.ansicht = aktiverPrestigeReiter;
    if (aktiverPrestigeReiter === "tarot") renderTarot();
    else if (aktiverPrestigeReiter === "kuschel") renderKuscheltiere();
    else if (aktiverPrestigeReiter === "sternenfall") renderSternenfall();
    else if (aktiverPrestigeReiter === "modi") renderSpielmodi();
    else renderMetaUpgrades();
}

// Klick auf die Mondphase oben: direkt zur Auswahl im Mondteich (wenn er gerade offen sein darf)
mondphaseDisplay.addEventListener("click", () => {
    if (spielPausiert()) return;
    if (darfMondteich()) aktiverPrestigeReiter = "modi";
    versucheMondteich();
});

// Nach dem Run: Mondteich einklappen, um Markt, Stellarium usw. in Ruhe anzuschauen (kaufen geht erst im neuen Run)
const prestigeEinklappen = $("prestige-einklappen");
const mondteichAusklappen = $("mondteich-ausklappen");
setzeTipp(prestigeEinklappen, t("Mondteich einklappen: Markt, Stellarium und Hof ansehen, bevor du neu startest (kaufen geht erst im neuen Run)"));
prestigeEinklappen.addEventListener("click", () => {
    schliessePrestigeShop();
    mondteichAusklappen.classList.remove("versteckt");
    zeigeToast(t("👀 Nur ansehen: Kaufen und Klicken geht erst im neuen Run."));
});
mondteichAusklappen.addEventListener("click", () => {
    mondteichAusklappen.classList.add("versteckt");
    oeffnePrestigeShop();
});
registriereHaken("anzeige", () => {
    prestigeEinklappen.classList.toggle("versteckt", run.phase !== "runEnde");
    if (run.phase !== "runEnde" || !prestigeShop.classList.contains("versteckt")) mondteichAusklappen.classList.add("versteckt");
});
