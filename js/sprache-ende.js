"use strict";

// ============================================================
// SPROUTVALE: Nach allen Sprach-Dateien die festen Texte in index.html uebersetzen
// (die Skripte stehen am Ende der Seite, alles ist schon da)
// ============================================================

uebersetzeDokument(document.body);
if (SPRACHE !== "de") document.title = "Sproutvale";
