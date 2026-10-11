"use strict";

// ============================================================
// SPROUTVALE: Bruecke zur Handy-App (Capacitor, siehe handy-app/README.md)
// Laeuft nur, wenn das Spiel in der Handy-App steckt (window.Capacitor ist da). Im Browser und in der
// Desktop-App passiert hier nichts.
// Stellt window.sproutvaleHandy bereit, das kasse.js benutzt:
//   kasse:   Gems kaufen ueber Google Play / App Store (Plugin: @revenuecat/purchases-capacitor)
//   werbung: freiwillige Belohnungs-Werbung (Plugin: @capacitor-community/admob), nur auf Knopfdruck
// Fehlt ein Plugin oder ist es nicht eingerichtet, meldet die Bruecke "nicht bereit" und das Spiel zeigt nichts davon.
// ============================================================

(function handyBruecke() {
    const cap = window.Capacitor;
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
    const plugins = cap.Plugins || {};

    // Hier die IDs eintragen, sobald die Konten bei Google/Apple, RevenueCat und AdMob angelegt sind
    const HANDY_KONFIG = {
        revenueCatSchluessel: { android: "", ios: "" },
        // Produkt-IDs im Play Store / App Store = Paket-IDs aus kasse.js (gems_100, gems_500, gems_1100)
        admobBelohnung: { android: "", ios: "" }
    };
    const plattform = cap.getPlatform ? cap.getPlatform() : "android";

    let kasseBereit = false;
    let werbungBereit = false;
    const offen = [];

    // Kaeufe
    const kaeufe = plugins.Purchases;
    const kaufSchluessel = HANDY_KONFIG.revenueCatSchluessel[plattform];
    if (kaeufe && kaufSchluessel) {
        kaeufe.configure({ apiKey: kaufSchluessel })
            .then(() => { kasseBereit = true; })
            .catch(fehler => console.warn("Kaeufe nicht verfuegbar", fehler));
    }

    // Werbung
    const admob = plugins.AdMob;
    const werbeId = HANDY_KONFIG.admobBelohnung[plattform];
    if (admob && werbeId) {
        admob.initialize({ initializeForTesting: false })
            .then(() => { werbungBereit = true; })
            .catch(fehler => console.warn("Werbung nicht verfuegbar", fehler));
    }

    window.sproutvaleHandy = {
        kasse: {
            bereit: () => kasseBereit,
            async kaufe(paketId) {
                try {
                    const angebot = await kaeufe.getProducts({ productIdentifiers: [paketId], type: "INAPP" });
                    const produkt = angebot && angebot.products && angebot.products[0];
                    if (!produkt) return { ok: false };
                    await kaeufe.purchaseStoreProduct({ product: produkt });
                    return { ok: true };
                } catch (fehler) {
                    return { ok: false };
                }
            },
            offeneKaeufe: () => offen.slice(),
            bestaetige: id => {
                const i = offen.findIndex(k => k.id === id);
                if (i >= 0) offen.splice(i, 1);
            }
        },
        werbung: {
            bereit: () => werbungBereit,
            async zeige() {
                try {
                    await admob.prepareRewardVideoAd({ adId: werbeId });
                    const ergebnis = await admob.showRewardVideoAd();
                    return { belohnt: Boolean(ergebnis) };
                } catch (fehler) {
                    return { belohnt: false };
                }
            }
        }
    };
})();
