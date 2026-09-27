"use strict";

// ============================================================
// SPROUTVALE: Spielstand als Dateien (nur in der Desktop-App)
// Wird als ERSTE Datei geladen, noch bevor das Spiel seinen Spielstand liest.
// 1) Beim Start: Dateien aus dem Ordner "save" haben Vorrang und werden ins Spiel geladen.
//    Gibt es noch keine Dateien, werden die bisherigen Daten des Spiels einmal als Dateien angelegt.
// 2) Danach wird jede Aenderung am Spielstand zusaetzlich in die Dateien geschrieben.
// Der Ordner liegt im Benutzerordner (%APPDATA%/Sproutvale/save) und bleibt bei neuen Versionen erhalten.
// Im Browser (ohne Desktop-App) passiert hier nichts.
// ============================================================

// Test-Bot (index.html?bot=CODE, siehe bot.js): eigener Spielstand nur im Speicher, ohne Ton
const BOT_CODE = new URLSearchParams(location.search).get("bot");

(function botSpeicher() {
    if (!BOT_CODE) return;
    // Der Bot laeuft in einem unsichtbaren Rahmen: dort bremst der Browser requestAnimationFrame, also per Timer
    window.requestAnimationFrame = rueckruf => setTimeout(() => rueckruf(performance.now()), 16);
    const daten = new Map([["sproutvale_einstellungen", JSON.stringify({ musik: 0, sfx: 0, tipps: false })]]);
    const lesen = Storage.prototype.getItem;
    const setzen = Storage.prototype.setItem;
    const entfernen = Storage.prototype.removeItem;
    Storage.prototype.getItem = function (schluessel) {
        if (this !== localStorage) return lesen.call(this, schluessel);
        return daten.has(schluessel) ? daten.get(schluessel) : null;
    };
    Storage.prototype.setItem = function (schluessel, wert) {
        if (this !== localStorage) return setzen.call(this, schluessel, wert);
        daten.set(schluessel, String(wert));
    };
    Storage.prototype.removeItem = function (schluessel) {
        if (this !== localStorage) return entfernen.call(this, schluessel);
        daten.delete(schluessel);
    };
})();

(function verbindeSpeicherOrdner() {
    const desktop = window.sproutvaleDesktop;
    if (BOT_CODE) return;
    if (!desktop || !desktop.speicher) return;
    const istSpielstand = schluessel => typeof schluessel === "string" && schluessel.startsWith("sproutvale_");

    let dateien = {};
    try {
        dateien = desktop.speicher.lesen() || {};
    } catch (fehler) {
        console.warn("Spielstand-Ordner nicht lesbar", fehler);
    }
    const setzen = Storage.prototype.setItem;
    const entfernen = Storage.prototype.removeItem;
    const leeren = Storage.prototype.clear;

    // Dateien -> Spiel (Dateien gewinnen), fehlende Dateien aus den bisherigen Daten anlegen
    ["sproutvale_meta", "sproutvale_run", "sproutvale_einstellungen", "sproutvale_kaeufe", "sproutvale_beta",
        "sproutvale_meta_sandbox", "sproutvale_sandbox", "sproutvale_meta_sandbox_2", "sproutvale_sandbox_2",
        "sproutvale_meta_sandbox_3", "sproutvale_sandbox_3", "sproutvale_koop_1", "sproutvale_koop_2", "sproutvale_koop_3"].forEach(schluessel => {
        if (dateien[schluessel] !== undefined) {
            setzen.call(localStorage, schluessel, dateien[schluessel]);
        } else {
            const bisher = localStorage.getItem(schluessel);
            if (bisher !== null) desktop.speicher.schreiben(schluessel, bisher);
        }
    });

    // Ab jetzt: jede Aenderung auch in die Datei
    Storage.prototype.setItem = function (schluessel, wert) {
        setzen.call(this, schluessel, wert);
        if (this === localStorage && istSpielstand(schluessel)) desktop.speicher.schreiben(schluessel, wert);
    };
    Storage.prototype.removeItem = function (schluessel) {
        entfernen.call(this, schluessel);
        if (this === localStorage && istSpielstand(schluessel)) desktop.speicher.loeschen(schluessel);
    };
    Storage.prototype.clear = function () {
        if (this === localStorage) {
            Object.keys(localStorage).filter(istSpielstand).forEach(schluessel => desktop.speicher.loeschen(schluessel));
        }
        leeren.call(this);
    };
})();
