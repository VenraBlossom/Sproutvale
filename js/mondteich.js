"use strict";


function oeffnePrestigeShop() {
    schliessePanels();
    prestigeShop.classList.remove("versteckt");
    renderPrestigeShop();
    aktualisiereMusik();
}

function schliessePrestigeShop() {
    prestigeShop.classList.add("versteckt");
}


function kaufeMetaUpgrade(def) {
    if (def.sichtbar && !def.sichtbar(meta)) return;
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
        (meta.sternenfaelle > 0 ? tf(", durch deine Sternenfälle x{0}.", zahl(sternenfallFaktor())) : ".");
    META_UPGRADES.filter(def => !(run.sandbox && SANDBOX_AUS_META.includes(def.id))).forEach(def => {
        if (def.sichtbar && !def.sichtbar(meta)) {
            prestigeInhalt.appendChild(erstelleKarte({ titel: t("🔒 Noch unbekannt"), beschreibung: def.sichtbarText, info: "",
                knopfText: t("Gesperrt"), aktiv: false, onKauf: () => {} }));
            return;
        }
        const lvl = metaLevel(def.id);
        const kosten = kostenMitFaktor(def.basiskosten, def.faktor, lvl);
        const istMax = lvl >= def.max;
        const karte = erstelleKarte({
            titel: def.name + " (" + stufenText(lvl, def.max) + ")",
            beschreibung: def.beschreibung,
            info: tf("Aktuell: {0}", def.info(lvl)),
            knopfText: istMax ? t("Maximal") : tf("{0} Mondblüten", zahl(kosten)),
            aktiv: !istMax && meta.mondblueten >= kosten,
            onKauf: () => kaufeMetaUpgrade(def)
        });
        if (def.max === Infinity) karte.classList.add("unendlich");
        prestigeInhalt.appendChild(karte);
    });
}


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
        zeigeToast(tf("Alle {0} Plätze sind belegt. Leg zuerst eine ausgerüstete Karte ab.", KONFIG.tarotSlots));
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
    return { text: tf("{0} Mondblüten", zahl(tarotKaufPreis())), klasse: "kaufbar" };
}

function renderTarot() {
    prestigeInfo.textContent = tf("⭐ Ausgerüstet: {0}/{1}  ·  Nächste Karte: {2} Mondblüten (jede Karte macht die nächste 20% teurer)  ·  Verbessern: {3} Mondblüten. Klick auf eine Karte für alle Details.", meta.tarotSlots.length, KONFIG.tarotSlots, zahl(tarotKaufPreis()), KONFIG.tarotVerbessernPreis);

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
                el("span", null, karte.text(f) + (karte.extra ? tf(" Zusätzlich: {0}", karte.extra) : ""))
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
        knoepfe.push({ text: tf("Kaufen · {0} Mondblüten", zahl(preis)), klasse: "knopf-lila", deaktiviert: meta.mondblueten < preis,
            aktion: () => { if (kaufeTarot(karte)) zeigeTarotDetails(karte); } });
    } else if (!verbessert) {
        knoepfe.push({ text: tf("Verbessern · {0} Mondblüten", KONFIG.tarotVerbessernPreis), klasse: "knopf-lila",
            deaktiviert: meta.mondblueten < KONFIG.tarotVerbessernPreis,
            aktion: () => { if (verbessereTarot(karte)) zeigeTarotDetails(karte); } });
    } else {
        knoepfe.push({ text: ausgeruestet ? t("Ablegen") : tf("Ausrüsten ({0}/{1})", meta.tarotSlots.length, KONFIG.tarotSlots),
            klasse: ausgeruestet ? null : "knopf-gruen",
            aktion: () => { if (wechsleTarotSlot(karte)) zeigeTarotDetails(karte); } });
    }
    knoepfe.push({ text: t("Schließen") });
    schliesseOberstesPopup();
    zeigePopup({ titel: karte.nummer + " · " + karte.name, inhalt, farbe: "#7c4fb3", breite: 640, knoepfe, klasse: "tarot-popup" });
}


function kuschelPreis() {
    const schritte = metaLevel("kuschelrabatt") > 0 ? Math.floor(meta.kuschelZuegeBezahlt / 2) : meta.kuschelZuegeBezahlt;
    return KUSCHEL_KONFIG.preis + schritte;
}

function wuerfleKuschelRaritaet() {
    return KUSCHEL_RARITAETEN.indexOf(gewichteterZufall(KUSCHEL_RARITAETEN, r => r.chance));
}

function kuschelNaechsteStufeBei(stufe) {
    return Math.pow(2, stufe);
}

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
    gibBauernXp(30);
    const stufeNachher = kuschel(tier.id);
    speichereMeta();
    zeigeKapsel({ tier, raritaet, neu: stufeVorher === 0, stufe: stufeNachher, aufgestiegen: stufeVorher > 0 && stufeNachher > stufeVorher });
}

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
        renderPrestigeShop();
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
            el("div", "kapsel-status", ergebnis.neu ? t("NEU!") : ergebnis.aufgestiegen ? tf("Stufe {0}!", ergebnis.stufe) : t("+1 Stück")),
            el("div", "kapsel-text", tier.text(ergebnis.stufe))
        );
        preis.querySelector(".kapsel-raritaet").style.color = r.rand;

        const nochmal = meta.gutscheine > 0
            ? el("button", "knopf knopf-lila", tf("Nochmal mit Gutschein 🎟️ ({0})", meta.gutscheine))
            : el("button", "knopf knopf-lila", tf("Nochmal · {0} Mondblüten", zahl(kuschelPreis())));
        nochmal.disabled = meta.gutscheine <= 0 && meta.mondblueten < kuschelPreis();
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
    prestigeInfo.textContent = tf("Kuscheltiere bleiben für immer und geben dir in jedem Run einen Bonus. Doppelte verbessern ein Kuscheltier automatisch (Stufe 1 bis {0}: 1, 2, 4, 8, 16 Stück). Gutscheine bekommst du für jede Erfolg-Stufe (bei den Erfolgen abholen).", k.maxStufe);

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
            kleinerKnopf(tf("🎟️ Mit Gutschein ziehen ({0})", meta.gutscheine), meta.gutscheine > 0, () => zieheKuschel(true), "knopf-gruen"),
            kleinerKnopf(tf("Ziehen · {0} Mondblüten", zahl(preis)), meta.mondblueten >= preis && performance.now() >= kuschelSperreBis,
                () => zieheKuschel(false), "knopf-lila")
        ]),
        el("div", "kuschel-hinweis", tf("{0} mit Mondblüten macht den nächsten um 1 teurer. Gutschein-Züge sind immer kostenlos.", (metaLevel("kuschelrabatt") > 0 ? t("Jeder 2. Zug") : t("Jeder Zug"))))
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
                    ? tf("Maximal ({0} Stück)", anzahl)
                    : tf("{0} / {1} bis Stufe {2}", anzahl, kuschelNaechsteStufeBei(stufe), (stufe + 1)))
            );
        } else {
            karte.appendChild(el("div", "kuschel-text", t("Noch nicht gefunden.")));
        }
        sammlung.appendChild(karte);
    });
    prestigeInhalt.appendChild(sammlung);
}


function sternenfallSplitter() {
    return Math.floor(Math.sqrt(meta.mondbluetenSeitSternenfall / STERNENFALL_KONFIG.splitterTeiler) * pokalFaktor());
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
    gibBauernXp(1000 + 400 * splitter);
    meta.mondblueten = 0;
    meta.mondbluetenSeitSternenfall = 0;
    meta.upgrades = {};
    meta.gutscheine += geschenk;
    speichereMeta();
    Klang.goldregen();
    bildschirmBlitz("#c9b0f5", 0.6, 600);
    zeigeBanner("☄️", t("Sternenfall!"), tf("+{0} Sternensplitter · alle Mondblüten ab jetzt x{1}{2}", splitter, zahl(sternenfallFaktor()), (geschenk ? tf(" · +{0} Gutscheine", geschenk) : "")), "#7c4fb3", 4500);
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
            el("p", null, tf("Du bekommst: {0} Sternensplitter und alle zukünftigen Mondblüten zählen dreifach (x{1}).", splitter, zahl(Math.pow(STERNENFALL_KONFIG.mondbluetenFaktor, meta.sternenfaelle + 1))))
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
    prestigeInfo.textContent = t("Der Sternenfall ist die zweite Prestige-Ebene. Er setzt Mondblüten und Mondteich-Upgrades zurück, dafür zählt jede zukünftige Mondblüte dreifach und du bekommst Sternensplitter für starke, dauerhafte Upgrades.");

    const fortschritt = Math.min(1, meta.mondbluetenSeitSternenfall / STERNENFALL_KONFIG.mindestMondblueten);
    const balken = el("div", "erfolg-balken");
    const fuellung = el("div");
    fuellung.style.width = fortschritt * 100 + "%";
    balken.appendChild(fuellung);
    const knopf = el("button", "knopf knopf-lila haupt-knopf", kannSternenfall()
        ? tf("☄️ Sternenfall auslösen (+{0} Splitter)", sternenfallSplitter())
        : tf("🔒 Noch {0} Mondblüten", zahl(STERNENFALL_KONFIG.mindestMondblueten - meta.mondbluetenSeitSternenfall)));
    knopf.disabled = !kannSternenfall();
    knopf.addEventListener("click", frageSternenfall);
    prestigeInhalt.appendChild(el("div", "sternenfall-kasten", null, [
        pixelIcon("☄️", 64),
        el("div", "sternenfall-text", null, [
            el("b", null, tf("Sternenfälle bisher: {0} · Mondblüten x{1}", meta.sternenfaelle, zahl(sternenfallFaktor()))),
            el("span", null, tf("Verdient seit dem letzten Sternenfall: {0} / {1} Mondblüten", zahl(meta.mondbluetenSeitSternenfall), zahl(STERNENFALL_KONFIG.mindestMondblueten))),
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
            info: tf("Aktuell: {0}", def.info(lvl)),
            knopfText: istMax ? t("Maximal") : tf("{0} Sternensplitter", zahl(kosten)),
            aktiv: !istMax && meta.sternensplitter >= kosten,
            onKauf: () => kaufeSternenfallUpgrade(def)
        });
        if (def.max === Infinity) karte.classList.add("unendlich");
        prestigeInhalt.appendChild(karte);
    });
}


function hatSandbox() {
    return meta.sandbox || hatDlc() || Boolean(Tresor.stand().endlos);
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

function waehleMondphase(index) {
    const m = storyMeta();
    if (index > (m.mondphaseFrei || 0)) return;
    m.mondphase = index;
    speichereMeta();
    if (run.phase === "vorTag" && run.tag === 1 && !run.sandbox && !run.koop) starteNeuenRun(false);
    Klang.stern();
    oeffnePrestigeShop();
}

function renderMondphasen() {
    const m = storyMeta();
    const kasten = el("div", "mondphasen-kasten");
    kasten.appendChild(el("div", "mondphasen-titel", t("🌙 Mondphasen: Schwierigkeit für normale Runs")));
    if (run.sandbox) kasten.appendChild(el("div", "mondphasen-hinweis", t("♾️ In Endlos gibt es keine Mondphasen. Deine Auswahl gilt für deine Story-Runs.")));
    kasten.appendChild(el("div", "mondphasen-hinweis", tf("Jede Phase ist schwerer als die vorige, ihre Regeln gelten zusammen. Dafür gibt es +{0}% Mondblüten pro Phase. Die nächste Phase wird frei, wenn du in der höchsten freien Phase {1} Rechnungen in einem Run bezahlst.", Math.round(MONDPHASE_BONUS * 100), MONDPHASE_FREI_AB_RECHNUNGEN)));
    const reihe = el("div", "mondphasen-reihe");
    MONDPHASEN.forEach((phase, index) => {
        const frei = index <= (m.mondphaseFrei || 0);
        const aktiv = index === Math.min(m.mondphase || 0, m.mondphaseFrei || 0);
        const neu = index > (m.mondphaseGesehen || 0) && frei;
        const knopf = el("button", "mondphase" + (aktiv ? " aktiv" : "") + (frei ? "" : " gesperrt") + (neu ? " neu" : ""), null, [
            neu ? el("div", "mondphase-neu", t("NEU")) : null,
            el("div", "mondphase-symbol", phase.symbol),
            el("div", "mondphase-name", phase.name),
            el("div", "mondphase-text", frei ? phase.text : tf("🔒 {0} Rechnungen in der Phase davor", MONDPHASE_FREI_AB_RECHNUNGEN)),
            el("div", "mondphase-bonus", tf("+{0}% Mondblüten", Math.round(MONDPHASE_BONUS * 100 * index)))
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

function renderHerausforderungen() {
    const m = storyMeta();
    const kasten = el("div", "mondphasen-kasten");
    kasten.appendChild(el("div", "mondphasen-titel", t("🏆 Herausforderungen")));
    if ((m.lebenszeit.runs || 0) < HERAUSFORDERUNG_AB_RUNS) {
        kasten.appendChild(el("div", "mondphasen-hinweis", tf("🔒 Erscheinen nach {0} Runs.", HERAUSFORDERUNG_AB_RUNS)));
        prestigeInhalt.appendChild(kasten);
        return;
    }
    kasten.appendChild(el("div", "mondphasen-hinweis", t("Ein Story-Run mit einer Einschränkung. Schaffst du das Ziel, gibt es für immer einen Bonus. Klick nochmal auf die gewählte, um sie abzuwählen. Gilt ab dem nächsten Story-Run.")));
    const reihe = el("div", "mondphasen-reihe");
    HERAUSFORDERUNGEN.forEach(h => {
        const aktiv = m.herausforderung === h.id;
        const geschafft = m.herausforderungen && m.herausforderungen[h.id];
        const knopf = el("button", "mondphase herausforderung" + (aktiv ? " aktiv" : "") + (geschafft ? " geschafft" : ""), null, [
            el("div", "mondphase-symbol", h.symbol),
            el("div", "mondphase-name", h.name),
            el("div", "mondphase-text", h.regel + " " + tf("Ziel: {0} Rechnungen.", h.ziel)),
            el("div", "mondphase-bonus", (geschafft ? "✅ " : "🎁 ") + h.belohnung)
        ]);
        knopf.addEventListener("click", () => {
            m.herausforderung = aktiv ? null : h.id;
            speichereMeta();
            if (run.phase === "vorTag" && run.tag === 1 && !run.sandbox && !run.koop) starteNeuenRun(false);
            Klang.stern();
            oeffnePrestigeShop();
        });
        reihe.appendChild(knopf);
    });
    kasten.appendChild(reihe);
    prestigeInhalt.appendChild(kasten);
}

function renderSpielmodi() {
    prestigeInfo.textContent = t("Spielmodi verändern die Regeln eines Runs.");
    if (run.koop) {
        prestigeInhalt.appendChild(erstelleHinweis(t("👥 Im Duo startet der Host neue Runs in der Lobby. Die Mondphase des Hosts gilt für euch beide. Deine Auswahl hier gilt für deine Solo-Runs.")));
        renderMondphasen();
        if (neueMondphase()) {
            storyMeta().mondphaseGesehen = storyMeta().mondphaseFrei || 0;
            speichereMeta();
            aktualisiereMondphaseHinweis();
        }
        return;
    }
    renderMondphasen();
    renderHerausforderungen();
    if (neueMondphase()) {
        storyMeta().mondphaseGesehen = storyMeta().mondphaseFrei || 0;
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
        beschreibung: t("Keine Rechnungen, unendliche Entwicklung: Bau deinen Hof so groß, wie du willst. Keine Energie: Tag und Nacht laufen einfach weiter, einkaufen kannst du jederzeit. Statt Rechnungen gibt es Meilensteine für verdientes Gold (je 1 Segen). Mit dem Neuanfang fängst du von vorn an und bekommst die Hälfte der Mondblüten, die die Meilensteine als Rechnungen bringen würden. Keine Erfolge. Eigener Spielstand, wählbar im Hauptmenü. Mit dem Unterstützer-Paket ist sie später sofort frei."),
        info: frei ? t("Freigeschaltet") : tf("Einmalig {0} Mondblüten", zahl(SANDBOX_KONFIG.preis)),
        knopfText: frei ? (run.sandbox ? t("Endlos neu starten") : t("Zu Endlos")) : tf("{0} Mondblüten", zahl(SANDBOX_KONFIG.preis)),
        aktiv: frei || meta.mondblueten >= SANDBOX_KONFIG.preis,
        onKauf: () => (!frei ? kaufeSandbox() : run.sandbox ? starteNeuenRun(true) : wechsleZuModus(true))
    }));
}

function neueMondphase() {
    return (storyMeta().mondphaseFrei || 0) > (storyMeta().mondphaseGesehen || 0);
}

function aktualisiereMondphaseHinweis() {
    const knopf = $("karte-prestige");
    if (knopf) knopf.classList.toggle("hat-neues", neueMondphase());
}


function renderPrestigeShop() {
    prestigeGuthaben.innerHTML = "";
    prestigeGuthaben.append(
        el("span", "guthaben-teil", null, [spriteIcon("mondbluete", true), el("span", null, tf("{0} Mondblüten", zahl(meta.mondblueten)))]),
        el("span", "guthaben-teil", null, [pixelIcon("🎟️", 32), el("span", null, tf("{0} Gutscheine", meta.gutscheine))])
    );
    if (meta.sternenfaelle > 0 || meta.sternensplitter > 0) {
        prestigeGuthaben.appendChild(el("span", "guthaben-teil", null, [pixelIcon("💠", 32), el("span", null, tf("{0} Sternensplitter", zahl(meta.sternensplitter)))]));
    }
    prestigeWeiter.textContent = run.phase !== "runEnde" ? t("Übernehmen") : run.sandbox ? t("Endlos neu starten") : t("Neuen Run starten");

    renderReiter(prestigeReiter, [
        { id: "upgrades", text: t("🏆 Upgrades") },
        { id: "tarot", text: tf("🔮 Tarot ({0}/{1})", meta.tarot.length, TAROT.length) },
        { id: "kuschel", text: tf("🧸 Kuscheltiere ({0}/{1}){2}", Object.keys(meta.kuscheltiere).length, KUSCHELTIERE.length, (meta.gutscheine > 0 ? " 🎟️" + meta.gutscheine : "")) },
        { id: "sternenfall", text: tf("☄️ Sternenfall{0}", (kannSternenfall() ? " !" : "")) },
        { id: "modi", text: tf("🎮 Spielmodi{0}", (neueMondphase() ? " !" : "")) }
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

mondphaseDisplay.addEventListener("click", () => {
    if (spielPausiert()) return;
    if (darfMondteich()) aktiverPrestigeReiter = "modi";
    versucheMondteich();
});

const prestigeEinklappen = $("prestige-einklappen");
setzeTipp(prestigeEinklappen, t("Mondteich einklappen: Markt, Stellarium und Hof ansehen, bevor du neu startest (kaufen geht erst im neuen Run)"));
prestigeEinklappen.addEventListener("click", () => {
    schliessePrestigeShop();
    zeigeToast(t("👀 Nur ansehen: Kaufen geht erst im neuen Run. Klick auf den leuchtenden Mondteich, um weiterzumachen."));
});
registriereHaken("anzeige", () => {
    prestigeEinklappen.classList.toggle("versteckt", run.phase !== "runEnde");
});
