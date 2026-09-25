"use strict";

// ============================================================
// SPROUTVALE: Spielstand als Dateien (nur in der Desktop-App)
// Wird als ERSTE Datei geladen, noch bevor das Spiel seinen Spielstand liest.
// 1) Beim Start: Dateien aus dem Ordner "save" (neben der .exe) haben Vorrang und werden ins Spiel geladen.
//    Gibt es noch keine Dateien, werden die bisherigen Daten des Spiels einmal als Dateien angelegt.
// 2) Danach wird jede Aenderung am Spielstand zusaetzlich in die Dateien geschrieben.
// So kann man bei einer neuen Version einfach den Ordner "save" hinueberkopieren.
// Im Browser (ohne Desktop-App) passiert hier nichts.
// ============================================================

(function verbindeSpeicherOrdner() {
    const desktop = window.sproutvaleDesktop;
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
    ["sproutvale_meta", "sproutvale_meta_sandbox", "sproutvale_run", "sproutvale_sandbox", "sproutvale_einstellungen"].forEach(schluessel => {
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
