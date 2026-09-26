"use strict";

// ============================================================
// SPROUTVALE: Oberflaechen-Bausteine
// - pixelIcon(): macht aus einem Emoji ein 16x16-Pixelbild (alle Icons gleich gross und im Pixel-Stil)
// - zeigePopup(): schoene Fenster mit Animation statt schlichter Dialoge
// - zeigeBanner(): kurze Einblendung oben (Wetter, Boss-Rechnung, Erfolge ...)
// - Tooltips (data-tipp="..."), abschaltbar in den Einstellungen
// - zaehleHoch(): Zahlen zaehlen sichtbar hoch statt zu springen
// - Tastenkuerzel
// ============================================================

// ---------- PIXEL-ICONS AUS EMOJIS ----------
// Das Emoji wird klein (16x16) auf eine Leinwand gemalt und dann pixelig vergroessert.
// So sehen alle Symbole (Tarot, Kuscheltiere, Segen, Sterne) einheitlich aus.

const pixelIconCache = {};

function pixelIconUrl(emoji, pixel = 16) {
    const schluessel = emoji + "|" + pixel;
    if (!pixelIconCache[schluessel]) {
        const leinwand = document.createElement("canvas");
        leinwand.width = pixel;
        leinwand.height = pixel;
        const stift = leinwand.getContext("2d");
        stift.textAlign = "center";
        stift.textBaseline = "middle";
        stift.font = Math.round(pixel * 0.86) + "px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
        stift.fillText(emoji, pixel / 2, pixel / 2 + pixel * 0.06);
        // Halbtransparente Kantenpixel hart machen, damit es wie echte Pixelart aussieht
        const daten = stift.getImageData(0, 0, pixel, pixel);
        for (let i = 3; i < daten.data.length; i += 4) daten.data[i] = daten.data[i] > 110 ? 255 : 0;
        stift.putImageData(daten, 0, 0);
        pixelIconCache[schluessel] = leinwand.toDataURL();
    }
    return pixelIconCache[schluessel];
}

// Liefert ein <img> mit dem Pixel-Icon. groesse = Bildschirm-Pixel (Vielfaches von 16 empfohlen)
function pixelIcon(emoji, groesse = 32, klasse) {
    const img = document.createElement("img");
    img.classList.add("pixel-icon");
    if (klasse) img.classList.add(klasse);
    img.src = pixelIconUrl(emoji);
    img.alt = emoji;
    img.draggable = false;
    img.style.width = groesse + "px";
    img.style.height = groesse + "px";
    return img;
}

// ---------- POPUPS ----------
// zeigePopup({ titel, inhalt (Element oder Text), farbe, breite, knoepfe: [{ text, klasse, aktion, bleibtOffen }],
//              klasse, schliessbar (Standard true), onSchliessen })
// Gibt eine Funktion zurueck, die das Popup schliesst.

const offenePopups = [];

function zeigePopup(optionen) {
    const o = { schliessbar: true, knoepfe: [], ...optionen };
    const huelle = document.createElement("div");
    huelle.classList.add("popup-huelle");
    const fenster = document.createElement("div");
    fenster.classList.add("popup");
    if (o.klasse) fenster.classList.add(o.klasse);
    if (o.breite) fenster.style.width = o.breite + "px";
    if (o.farbe) fenster.style.setProperty("--popup-farbe", o.farbe);

    if (o.titel) {
        const titel = document.createElement("div");
        titel.classList.add("popup-titel");
        titel.textContent = o.titel;
        fenster.appendChild(titel);
    }
    if (o.schliessbar) {
        const x = document.createElement("button");
        x.classList.add("popup-x");
        x.textContent = "✕";
        x.addEventListener("click", () => schliesse());
        fenster.appendChild(x);
    }
    const inhalt = document.createElement("div");
    inhalt.classList.add("popup-inhalt");
    if (typeof o.inhalt === "string") inhalt.textContent = o.inhalt;
    else if (o.inhalt) inhalt.appendChild(o.inhalt);
    fenster.appendChild(inhalt);

    if (o.knoepfe.length > 0) {
        const leiste = document.createElement("div");
        leiste.classList.add("popup-knoepfe");
        o.knoepfe.forEach(k => {
            const knopf = document.createElement("button");
            knopf.classList.add("knopf");
            if (k.klasse) knopf.classList.add(k.klasse);
            knopf.textContent = k.text;
            if (k.deaktiviert) knopf.disabled = true;
            // kurz gesperrt, damit man nicht aus Versehen draufklickt (mit kleinem Ladebalken)
            if (k.sperreMs) {
                knopf.disabled = true;
                knopf.classList.add("knopf-gesperrt-zeit");
                knopf.style.setProperty("--sperre", k.sperreMs + "ms");
                setTimeout(() => {
                    knopf.disabled = false;
                    knopf.classList.remove("knopf-gesperrt-zeit");
                }, k.sperreMs);
            }
            knopf.addEventListener("click", () => {
                if (k.aktion) k.aktion();
                if (!k.bleibtOffen) schliesse();
            });
            leiste.appendChild(knopf);
        });
        fenster.appendChild(leiste);
    }

    huelle.appendChild(fenster);
    if (o.schliessbar) {
        huelle.addEventListener("pointerdown", event => {
            if (event.target === huelle) schliesse();
        });
    }
    document.body.appendChild(huelle);
    const eintrag = { huelle, schliessbar: o.schliessbar, schliesse: null };
    offenePopups.push(eintrag);

    let zu = false;
    function schliesse() {
        if (zu) return;
        zu = true;
        offenePopups.splice(offenePopups.indexOf(eintrag), 1);
        huelle.classList.add("popup-weg");
        setTimeout(() => huelle.remove(), 180);
        if (o.onSchliessen) o.onSchliessen();
    }
    eintrag.schliesse = schliesse;
    // Erst gesperrtes Popup spaeter mit Esc/Klick daneben schliessbar machen (z.B. nach einer Animation)
    schliesse.erlaubeSchliessen = () => {
        eintrag.schliessbar = true;
        huelle.addEventListener("pointerdown", event => {
            if (event.target === huelle) schliesse();
        });
    };
    return schliesse;
}

function schliesseOberstesPopup() {
    const oben = offenePopups[offenePopups.length - 1];
    if (oben && oben.schliessbar) {
        oben.schliesse();
        return true;
    }
    return false;
}

function popupOffen() {
    return offenePopups.length > 0;
}

// Kleines Element aus HTML-freien Bausteinen: el("div", "klasse", "Text", [Kinder])
function el(tag, klasse, text, kinder) {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined && text !== null) e.textContent = text;
    if (kinder) kinder.forEach(k => k && e.appendChild(k));
    return e;
}

// ---------- BANNER (kurze Einblendung oben in der Mitte) ----------

// Hoechstens 2 Banner gleichzeitig, weitere warten (sonst bedecken viele Erfolge auf einmal den Bildschirm)
const BANNER_MAX = 2;
const bannerWarteschlange = [];

function zeigeBanner(symbol, titel, text, farbe, dauerMs = 3200) {
    let box = document.getElementById("banner-box");
    if (!box) {
        box = el("div");
        box.id = "banner-box";
        document.body.appendChild(box);
    }
    if (box.children.length >= BANNER_MAX) {
        bannerWarteschlange.push([symbol, titel, text, farbe, dauerMs]);
        return;
    }
    // Stehen noch viele in der Schlange, sind die einzelnen Banner etwas kuerzer zu sehen
    if (bannerWarteschlange.length > 2) dauerMs = Math.min(dauerMs, 2000);
    const banner = el("div", "banner", null, [
        symbol ? pixelIcon(symbol, 48) : null,
        el("div", "banner-text", null, [el("b", null, titel), text ? el("span", null, text) : null])
    ]);
    if (farbe) banner.style.setProperty("--banner-farbe", farbe);
    box.appendChild(banner);
    setTimeout(() => banner.classList.add("banner-weg"), dauerMs);
    setTimeout(() => {
        banner.remove();
        const naechstes = bannerWarteschlange.shift();
        if (naechstes) zeigeBanner(...naechstes);
    }, dauerMs + 450);
}

// ---------- TOOLTIPS ----------
// Jedes Element mit data-tipp="Text" zeigt beim Drueberfahren einen Hinweis (abschaltbar: Einstellungen > Tipps).
// Zeilen, die mit "## " beginnen, werden als Ueberschrift gezeigt, Zeilen mit "> " als hervorgehobene Zeile.

let tippEl = null;
let tippZiel = null;
let tippTimer = null;

function setzeTipp(element, text) {
    if (!element) return;
    if (text) element.dataset.tipp = text;
    else delete element.dataset.tipp;
}

function zeigeTippFuer(ziel) {
    if ((!einstellungen.tipps && tippFest !== ziel) || !ziel || !ziel.dataset.tipp) return;
    if (!tippEl) {
        tippEl = el("div");
        tippEl.id = "tooltip";
        document.body.appendChild(tippEl);
    }
    tippEl.innerHTML = "";
    ziel.dataset.tipp.split("\n").forEach(zeile => {
        if (zeile.startsWith("## ")) tippEl.appendChild(el("div", "tipp-titel", zeile.slice(3)));
        else if (zeile.startsWith("> ")) tippEl.appendChild(el("div", "tipp-aktiv", zeile.slice(2)));
        else if (zeile.startsWith("= ")) tippEl.appendChild(el("div", "tipp-wert", zeile.slice(2)));
        else if (zeile.startsWith("- ")) tippEl.appendChild(el("div", "tipp-punkt", zeile.slice(2)));
        else tippEl.appendChild(el("div", "tipp-zeile", zeile || " "));
    });
    tippEl.classList.toggle("tipp-breit", ziel.dataset.tipp.length > 220);
    // Infokarten der oberen Leiste haben einen eigenen, groesseren Look
    tippEl.classList.toggle("tipp-karte", Boolean(ziel.closest("#top-leiste")));
    tippEl.classList.toggle("tipp-fest", tippFest === ziel);
    tippEl.classList.add("sichtbar");
    const rect = ziel.getBoundingClientRect();
    const breite = tippEl.offsetWidth;
    const hoehe = tippEl.offsetHeight;
    let x = rect.left + rect.width / 2 - breite / 2;
    let y = rect.bottom + 8;
    if (y + hoehe > window.innerHeight - 6) y = rect.top - hoehe - 8;
    x = Math.max(6, Math.min(window.innerWidth - breite - 6, x));
    tippEl.style.left = x + "px";
    tippEl.style.top = y + "px";
}

// Infokarten in der oberen Leiste: anklicken haelt sie offen, bis man woanders hinklickt
let tippFest = null;

function versteckeTipp() {
    clearTimeout(tippTimer);
    tippZiel = null;
    if (tippFest) return;
    if (tippEl) tippEl.classList.remove("sichtbar");
}

document.addEventListener("pointerover", event => {
    if (tippFest) return;
    const ziel = event.target.closest ? event.target.closest("[data-tipp]") : null;
    if (ziel === tippZiel) return;
    versteckeTipp();
    if (!ziel) return;
    tippZiel = ziel;
    tippTimer = setTimeout(() => zeigeTippFuer(ziel), 350);
});
document.addEventListener("pointerdown", event => {
    const info = event.target.closest ? event.target.closest(".info-knopf") : null;
    if (info && info.dataset.tipp) {
        const schonOffen = tippFest === info;
        tippFest = null;
        versteckeTipp();
        if (!schonOffen) {
            tippFest = info;
            zeigeTippFuer(info);
        }
        return;
    }
    tippFest = null;
    versteckeTipp();
});
// Offene Infokarte laufend aktualisieren (Zahlen aendern sich)
setInterval(() => {
    if (tippFest && tippFest.isConnected && tippEl && tippEl.classList.contains("sichtbar")) zeigeTippFuer(tippFest);
    else if (tippFest && !tippFest.isConnected) {
        tippFest = null;
        versteckeTipp();
    }
}, 500);

// ---------- ZAHLEN HOCHZAEHLEN ----------
// Die Anzeige laeuft in ca. 0,35 Sekunden vom alten zum neuen Wert.

const zaehlerZustand = new WeakMap();

function zaehleHoch(element, zielwert, format = zahl) {
    if (!element) return;
    let z = zaehlerZustand.get(element);
    if (!z) {
        z = { angezeigt: zielwert, ziel: zielwert, start: zielwert, startZeit: 0, laeuft: false };
        zaehlerZustand.set(element, z);
        element.textContent = format(zielwert);
        return;
    }
    if (zielwert === z.ziel) return;
    z.start = z.angezeigt;
    z.ziel = zielwert;
    z.startZeit = performance.now();
    // grosse Spruenge nach unten (Einkaufen) sofort zeigen, Gewinne zaehlen hoch
    if (zielwert < z.start) {
        z.angezeigt = zielwert;
        element.textContent = format(zielwert);
        return;
    }
    if (z.laeuft) return;
    z.laeuft = true;
    const schritt = jetzt => {
        const t = Math.min(1, (jetzt - z.startZeit) / 350);
        const weich = 1 - Math.pow(1 - t, 3);
        z.angezeigt = z.start + (z.ziel - z.start) * weich;
        element.textContent = format(t >= 1 ? z.ziel : z.angezeigt);
        if (t < 1) requestAnimationFrame(schritt);
        else z.laeuft = false;
    };
    requestAnimationFrame(schritt);
}

// ---------- BARRIEREFREIHEIT ----------

function wackelnErlaubt() {
    return einstellungen.wackeln !== false;
}

function blitzeErlaubt() {
    return einstellungen.blitze !== false;
}

// Kurzer heller Blitz ueber dem ganzen Bildschirm (Gewitter, Jackpot), abschaltbar
function bildschirmBlitz(farbe = "#ffffff", staerke = 0.7, dauerMs = 220) {
    if (!blitzeErlaubt()) return;
    const blitz = el("div", "bildschirm-blitz");
    blitz.style.background = farbe;
    document.body.appendChild(blitz);
    blitz.animate([{ opacity: staerke }, { opacity: 0 }], { duration: dauerMs, easing: "ease-out" }).onfinish = () => blitz.remove();
}

// ---------- TASTENKUERZEL ----------
// Die Aktionen stehen in TASTENKUERZEL (start.js), hier nur die Verteilung.

const tastenAktionen = {};

// anzeige = wie die Taste in den Einstellungen heisst (z.B. "Leertaste")
function registriereTaste(taste, beschreibung, aktion, anzeige) {
    tastenAktionen[taste.toLowerCase()] = { beschreibung, aktion, taste, anzeige };
}

document.addEventListener("keydown", event => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const ziel = event.target;
    if (ziel && (ziel.tagName === "INPUT" || ziel.tagName === "SELECT" || ziel.tagName === "TEXTAREA")) return;
    if (event.key === "Escape") {
        if (schliesseOberstesPopup()) {
            event.preventDefault();
            return;
        }
    }
    const eintrag = tastenAktionen[event.key.toLowerCase()] || tastenAktionen[event.code.toLowerCase()];
    if (!eintrag) return;
    if (eintrag.aktion(event) !== false) event.preventDefault();
});
