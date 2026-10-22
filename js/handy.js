"use strict";


(function handyBruecke() {
    const cap = window.Capacitor;
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
    const plugins = cap.Plugins || {};

    const HANDY_KONFIG = {
        revenueCatSchluessel: { android: "", ios: "" },
        admobBelohnung: { android: "", ios: "" }
    };
    const plattform = cap.getPlatform ? cap.getPlatform() : "android";

    let kasseBereit = false;
    let werbungBereit = false;
    const offen = [];

    const kaeufe = plugins.Purchases;
    const kaufSchluessel = HANDY_KONFIG.revenueCatSchluessel[plattform];
    if (kaeufe && kaufSchluessel) {
        kaeufe.configure({ apiKey: kaufSchluessel })
            .then(() => { kasseBereit = true; })
            .catch(fehler => console.warn("Kaeufe nicht verfuegbar", fehler));
    }

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
