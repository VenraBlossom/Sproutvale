"use strict";

if (SPRACHE !== "de" && SPRACHE !== "en" && SPRACHEN.some(s => s.id === SPRACHE)) document.write("<script src=\"js/sprache-" + SPRACHE + ".js\"></" + "script>");
