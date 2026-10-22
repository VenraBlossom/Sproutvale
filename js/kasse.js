"use strict";


const GEM_PAKETE = [
    { id: "gems_100", kristalle: 100, preis: 0.99 },
    { id: "gems_500", kristalle: 500, preis: 4.99 },
    { id: "gems_1100", kristalle: 1100, preis: 9.99 }
];

const Kasse = {
    anbieter() {
        try {
            const d = window.sproutvaleDesktop;
            if (d && d.kasse && d.kasse.bereit()) return "steam";
            const h = window.sproutvaleHandy;
            if (h && h.kasse && h.kasse.bereit()) return "handy";
        } catch (fehler) {
            console.warn("Kasse nicht erreichbar", fehler);
        }
        return null;
    },
    bereit() {
        return Boolean(this.anbieter());
    },
    async kaufe(paket) {
        const anbieter = this.anbieter();
        if (!anbieter) return { ok: false };
        const kanal = anbieter === "steam" ? window.sproutvaleDesktop.kasse : window.sproutvaleHandy.kasse;
        const antwort = (await kanal.kaufe(paket.id)) || {};
        if (anbieter === "steam") {
            Tresor.neuLaden();
            aktualisiereKristallAnzeigen();
        } else if (antwort.ok && !antwort.offen) {
            gibGems(paket.kristalle);
        }
        return antwort;
    },
    abgleichen() {
        try {
            const h = window.sproutvaleHandy;
            if (h && h.kasse && h.kasse.offeneKaeufe) {
                (h.kasse.offeneKaeufe() || []).forEach(kauf => {
                    const paket = GEM_PAKETE.find(p => p.id === kauf.paket);
                    if (!paket) return;
                    gibGems(paket.kristalle);
                    h.kasse.bestaetige(kauf.id);
                });
            }
        } catch (fehler) {
            console.warn("Kaeufe abgleichen fehlgeschlagen", fehler);
        }
    }
};

function gibGems(menge) {
    Tresor.gutschreibenBrowser(menge);
    aktualisiereKristallAnzeigen();
    Klang.jackpot();
    zeigeToast(tf("🎁 +{0} 💎", zahl(menge)));
}

function oeffneGemShop() {
    const bereit = Kasse.bereit();
    const liste = el("div", "gem-pakete", null, GEM_PAKETE.map(paket => {
        const knopf = el("button", "knopf knopf-gruen gem-paket-knopf", euro(paket.preis));
        knopf.disabled = !bereit;
        knopf.addEventListener("click", async () => {
            Klang.klick(8);
            knopf.disabled = true;
            const antwort = await Kasse.kaufe(paket);
            knopf.disabled = false;
            if (antwort.offen) zeigeToast(t("Der Kauf läuft im Shop-Fenster. Die Gems kommen, sobald er fertig ist."));
            else if (!antwort.ok) zeigeToast(t("Der Kauf hat nicht geklappt. Es wurde nichts abgebucht."));
        });
        return el("div", "gem-paket", null, [
            el("div", "gem-paket-menge", null, [pixelIcon("💎", 28), el("b", null, zahl(paket.kristalle))]),
            knopf
        ]);
    }));
    const inhalt = el("div", "gem-shop", null, [
        liste,
        el("p", "leise", bereit ? t("Käufe im Spiel unterstützen die Zukunft von Sproutvale. Sie haben keinerlei Einfluss auf das Spiel. ❤️")
            : t("Gems kann man aktuell noch nicht kaufen. Das geht, sobald Sproutvale auf Steam oder im App-Store ist."))
    ]);
    zeigePopup({ titel: t("💎 Gems kaufen"), breite: 460, farbe: "#b0407a", inhalt, knoepfe: [{ text: t("Schließen") }] });
}

const WERBUNG_BONUS = 0.25;

const Werbung = {
    verfuegbar() {
        try {
            const h = window.sproutvaleHandy;
            return Boolean(h && h.werbung && h.werbung.bereit());
        } catch (fehler) {
            return false;
        }
    },
    async zeige() {
        if (!this.verfuegbar()) return false;
        const ergebnis = await window.sproutvaleHandy.werbung.zeige();
        return Boolean(ergebnis && ergebnis.belohnt);
    }
};

function werbeGoldBonus() {
    return run && !run.koop && run.werbeBuffTag === run.tag ? WERBUNG_BONUS : 0;
}

registriereHaken("tagesKarte", (inhalt, modus) => {
    if (modus === "runEnde" || !run || run.koop || run.werbeBuffTag === run.tag || !Werbung.verfuegbar()) return;
    const knopf = el("button", "knopf karte-werbung", tf("📺 Werbung ansehen: am nächsten Tag +{0}% Gold", Math.round(WERBUNG_BONUS * 100)));
    knopf.addEventListener("click", async () => {
        knopf.disabled = true;
        const belohnt = await Werbung.zeige();
        if (belohnt) {
            run.werbeBuffTag = run.tag;
            speichereRun();
            zeigeToast(tf("📺 Danke! Am nächsten Tag +{0}% Gold.", Math.round(WERBUNG_BONUS * 100)));
            knopf.remove();
        } else {
            knopf.disabled = false;
        }
    });
    inhalt.appendChild(knopf);
});

Kasse.abgleichen();
synchronisiereSteamErfolge();
