"use strict";

// ============================================================
// SPROUTVALE: Online-Koop (Duo)
// Zwei Spiele verbinden sich direkt (WebRTC-Datenkanal). Zum Finden dient der kostenlose PeerJS-Vermittler
// (0.peerjs.com): Der Lobby-Code ist die Adresse des Hosts. Kein eigener Server, keine Kosten.
//
// Aufteilung:
// - Jeder spielt sein eigenes Spiel auf seiner Seite des Ackers: eigenes Gold, eigener Markt, eigenes Stellarium,
//   eigene Segen, eigener Mondteich. Der Host spielt links, der Gast rechts. Die Felder des anderen sieht man nur.
// - Gemeinsam: Tag und Feierabend (Feierabend, wenn beide keine Energie mehr haben), die Rechnungen (das Gold beider
//   wird zusammengezaehlt, jeder zahlt seinen Anteil) und in Endlos die Meilensteine (Gold beider zusammen).
//   Rechnungen und Meilensteine sind im Koop doppelt so teuer.
// - Skins: standardmaessig die des Hosts, wer zuletzt waehlt, gewinnt. Es gibt einen gemeinsamen Begleiter.
// - Beide muessen dieselbe Spielversion haben.
// ============================================================

const KOOP_KONFIG = {
    server: "wss://0.peerjs.com/peerjs",
    schluessel: "peerjs",
    praefix: "sproutvale-v1-",
    ice: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    codeZeichen: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
    codeLaenge: 6,
    infoMs: 400,            // so oft wird geprueft, ob sich Gold oder Felder geaendert haben
    infoSpaetestensMs: 2000, // spaetestens dann wird die Info trotzdem geschickt (Lebenszeichen)
    stilleMs: 15000,        // so lange ohne Nachricht, dann gilt der Mitspieler als weg
    slots: 3                // Endlos-Speicherstaende im Koop
};

const koop = {
    rolle: null,            // "host" | "gast" | null
    code: null,
    ws: null,
    wsTakt: null,
    pc: null,
    kanal: null,
    partnerId: null,
    verbunden: false,
    imSpiel: false,
    partner: null,          // { hatEndlos, meta }
    lobby: { modus: "story", slot: 1 },
    kosmetik: {},           // gemeinsame Skins im Koop (ueberschreiben die eigenen, werden nicht gespeichert)
    partnerPausiert: false,
    eigenePause: false,
    lootZiel: null,         // Host: Ernte vom Gast, die Saaten gehen an den Gast
    lootSlot: null,
    naechsteLootId: 1,
    status: ""
};

function koopAktiv() {
    return koop.imSpiel && Boolean(run && run.koop);
}
function koopHost() {
    return koopAktiv() && koop.rolle === "host" && koop.verbunden;
}
function koopGast() {
    return koopAktiv() && koop.rolle === "gast";
}
// Welche Seite des Ackers gehoert mir? (null = alle, also Solo)
function eigeneSeite() {
    if (!koopAktiv()) return null;
    return koop.seite || (koop.rolle === "gast" ? "rechts" : "links");
}
// Seite des Mitspielers (nach einer Uebernahme kann der Host auch rechts spielen)
function partnerSeite() {
    return eigeneSeite() === "links" ? "rechts" : "links";
}

// Der Lobby-Code ist standardmaessig versteckt (z.B. fuer Streamer, damit niemand ungefragt beitritt)
function koopCodeText() {
    if (!koop.code) return "…";
    return koop.codeSichtbar ? koop.code : "X X X X X X";
}

// Knopf zum Zeigen/Verstecken des Codes; nachher = was danach neu gezeichnet werden soll
function koopCodeAugeKnopf(nachher) {
    const knopf = el("button", "knopf koop-klein", koop.codeSichtbar ? t("🙈 Verbergen") : t("👁 Anzeigen"));
    knopf.addEventListener("click", () => {
        koop.codeSichtbar = !koop.codeSichtbar;
        nachher();
    });
    return knopf;
}

function koopKopiereCode() {
    if (koop.code && navigator.clipboard) navigator.clipboard.writeText(koop.code);
    zeigeToast(t("📋 Code kopiert"));
}

// Host: Mitspieler rauswerfen. Danach gibt es sofort einen neuen Code, mit dem alten kommt er nicht wieder rein.
function koopKicken() {
    if (koop.rolle !== "host" || !koop.verbunden) return;
    const name = koop.partnerProfil && koop.partnerProfil.name ? koop.partnerProfil.name : t("Mitspieler");
    koopSende("gekickt");
    setTimeout(() => {
        if (koop.kanal) {
            koop.kanal.onclose = null;
            koop.kanal.close();
        }
        if (koop.pc) koop.pc.close();
        koop.pc = null;
        koopVerbindungWeg(true);
        koopNeuerCode();
        zeigeToast(tf("🥾 {0} wurde entfernt. Die Lobby hat einen neuen Code.", name));
    }, 300);
}

function zufallsCode(laenge = KOOP_KONFIG.codeLaenge) {
    let code = "";
    for (let i = 0; i < laenge; i++) code += KOOP_KONFIG.codeZeichen[Math.floor(Math.random() * KOOP_KONFIG.codeZeichen.length)];
    return code;
}

// ---------- VERMITTLER (nur zum Finden, danach laeuft alles direkt) ----------

function koopVermittler(id) {
    return new Promise((erfolg, fehler) => {
        const token = Math.random().toString(36).slice(2);
        let ws;
        try {
            ws = new WebSocket(KOOP_KONFIG.server + "?key=" + KOOP_KONFIG.schluessel + "&id=" + encodeURIComponent(id) +
                "&token=" + token + "&version=1.5.4");
        } catch (e) {
            fehler(new Error("keine Verbindung"));
            return;
        }
        let offen = false;
        const zeit = setTimeout(() => {
            if (!offen) {
                fehler(new Error("keine Verbindung"));
                ws.close();
            }
        }, 10000);
        ws.onmessage = event => {
            let nachricht;
            try {
                nachricht = JSON.parse(event.data);
            } catch (e) {
                return;
            }
            if (nachricht.type === "OPEN") {
                offen = true;
                clearTimeout(zeit);
                erfolg(ws);
                return;
            }
            if (nachricht.type === "ID-TAKEN") {
                clearTimeout(zeit);
                fehler(new Error("belegt"));
                ws.close();
                return;
            }
            if (nachricht.type === "ERROR" && !offen) {
                clearTimeout(zeit);
                fehler(new Error("fehler"));
                return;
            }
            koopSignal(nachricht);
        };
        ws.onerror = () => {
            if (!offen) {
                clearTimeout(zeit);
                fehler(new Error("keine Verbindung"));
            }
        };
        ws.onclose = () => {
            if (koop.ws === ws) {
                koop.ws = null;
                clearInterval(koop.wsTakt);
            }
        };
    });
}

// Der Vermittler erwartet die Angaben, die auch die PeerJS-Bibliothek mitschickt
function koopPaketDaten() {
    const id = koop.verbindungsId || "dc_sproutvale";
    return { type: "data", connectionId: id, label: id, reliable: true, serialization: "json", browser: "chrome" };
}

function koopVermittlerSende(nachricht) {
    if (koop.ws && koop.ws.readyState === 1) koop.ws.send(JSON.stringify(nachricht));
}

function setzeVermittler(ws) {
    if (koop.ws && koop.ws !== ws) koop.ws.close();
    koop.ws = ws;
    clearInterval(koop.wsTakt);
    koop.wsTakt = setInterval(() => koopVermittlerSende({ type: "HEARTBEAT" }), 5000);
}

// ---------- DIREKTE VERBINDUNG ----------

function neueVerbindung() {
    if (koop.pc) koop.pc.close();
    const pc = new RTCPeerConnection({ iceServers: KOOP_KONFIG.ice });
    koop.pc = pc;
    koop.wartendeKandidaten = [];
    pc.onicecandidate = event => {
        if (event.candidate && koop.partnerId) {
            koopVermittlerSende({ type: "CANDIDATE", dst: koop.partnerId, payload: { candidate: event.candidate.toJSON(), ...koopPaketDaten() } });
        }
    };
    pc.onconnectionstatechange = () => {
        if (koop.pc === pc && ["failed", "closed"].includes(pc.connectionState)) koopVerbindungWeg();
    };
    // Kurz "disconnected" kommt bei wackligem WLAN vor, erst nach 8 Sekunden aufgeben
    pc.oniceconnectionstatechange = () => {
        clearTimeout(koop.wackelTimer);
        if (koop.pc === pc && pc.iceConnectionState === "disconnected") {
            koop.wackelTimer = setTimeout(() => {
                if (koop.pc === pc && pc.iceConnectionState === "disconnected") koopVerbindungWeg();
            }, 8000);
        }
    };
    return pc;
}

function richteKanalEin(kanal) {
    koop.kanal = kanal;
    kanal.onopen = () => {
        koop.verbunden = true;
        koop.letzteNachricht = performance.now();
        koop.letzteInfo = "";
        koop.letzterStand = "";
        koop.status = "";
        koop.beitrittGemeldet = false;
        // Der Gast braucht den Vermittler nicht mehr (die Verbindung laeuft jetzt direkt)
        if (koop.rolle === "gast" && koop.ws) {
            koop.ws.close();
            koop.ws = null;
        }
        koopSende("hallo", { hatEndlos: hatSandbox(), rolle: koop.rolle, version: SPIEL_VERSION });
        koopSendeProfil();
        renderKoopLobby();
    };
    kanal.onmessage = event => {
        koop.letzteNachricht = performance.now();
        let nachricht;
        try {
            nachricht = JSON.parse(event.data);
        } catch (e) {
            return;
        }
        koopEmpfange(nachricht);
    };
    kanal.onclose = () => koopVerbindungWeg();
}

async function koopSignal(nachricht) {
    const payload = nachricht.payload || {};
    try {
        if (nachricht.type === "OFFER" && koop.rolle === "host") {
            if (koop.verbunden) return; // schon ein Mitspieler da
            koop.partnerId = nachricht.src;
            const pc = neueVerbindung();
            pc.ondatachannel = event => richteKanalEin(event.channel);
            await pc.setRemoteDescription(payload.sdp);
            const antwort = await pc.createAnswer();
            await pc.setLocalDescription(antwort);
            koop.verbindungsId = payload.connectionId || koop.verbindungsId;
            koopVermittlerSende({ type: "ANSWER", dst: koop.partnerId, payload: { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }, ...koopPaketDaten() } });
            koop.wartendeKandidaten.splice(0).forEach(k => pc.addIceCandidate(k).catch(() => {}));
        } else if (nachricht.type === "ANSWER" && koop.pc) {
            await koop.pc.setRemoteDescription(payload.sdp);
            koop.wartendeKandidaten.splice(0).forEach(k => koop.pc.addIceCandidate(k).catch(() => {}));
        } else if (nachricht.type === "CANDIDATE" && koop.pc && payload.candidate) {
            if (koop.pc.remoteDescription) await koop.pc.addIceCandidate(payload.candidate);
            else koop.wartendeKandidaten.push(payload.candidate);
        } else if (nachricht.type === "EXPIRE" && koop.rolle === "gast" && !koop.verbunden) {
            koopFehler(t("Lobby nicht gefunden. Stimmt der Code?"));
        }
    } catch (e) {
        console.warn("Koop-Signal", e);
    }
}

function koopSende(typ, daten = {}) {
    if (!koop.kanal || koop.kanal.readyState !== "open") return;
    try {
        koop.kanal.send(JSON.stringify({ typ, ...daten }));
    } catch (e) {
        console.warn("Koop senden", e);
    }
}

// Mitspieler trennen, die Lobby bleibt offen (z.B. bei falscher Version)
function koopVerbindungTrennen() {
    if (koop.kanal) {
        koop.kanal.onclose = null;
        koop.kanal.close();
    }
    if (koop.pc) koop.pc.close();
    koop.kanal = null;
    koop.pc = null;
    koop.verbunden = false;
    koop.partner = null;
    renderKoopLobby();
}

// ---------- LOBBY ----------

async function koopLobbyErstellen() {
    koopVerlassen(true);
    koop.rolle = "host";
    koop.status = t("Lobby wird erstellt …");
    renderKoopLobby();
    for (let versuch = 0; versuch < 4; versuch++) {
        const code = zufallsCode();
        try {
            setzeVermittler(await koopVermittler(KOOP_KONFIG.praefix + code));
            koop.code = code;
            koop.status = "";
            renderKoopLobby();
            return;
        } catch (e) {
            if (e.message !== "belegt") break;
        }
    }
    koopFehler(t("Keine Verbindung zum Vermittler. Bist du online?"));
}

// Neuer Code: der alte verfaellt sofort, ein verbundener Mitspieler bleibt verbunden
async function koopNeuerCode() {
    if (koop.rolle !== "host") return;
    if (koop.ws) koop.ws.close();
    koop.ws = null;
    koop.code = null;
    renderKoopLobby();
    for (let versuch = 0; versuch < 4; versuch++) {
        const code = zufallsCode();
        try {
            setzeVermittler(await koopVermittler(KOOP_KONFIG.praefix + code));
            koop.code = code;
            renderKoopLobby();
            if (typeof renderEinstellungen === "function" && !einstellungenFenster.classList.contains("versteckt")) renderEinstellungen();
            return;
        } catch (e) {
            if (e.message !== "belegt") break;
        }
    }
    koopFehler(t("Keine Verbindung zum Vermittler. Bist du online?"));
}

async function koopBeitreten(eingabe) {
    const code = String(eingabe || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== KOOP_KONFIG.codeLaenge) {
        koopFehler(t("Der Code hat 6 Zeichen."));
        return;
    }
    koopVerlassen(true);
    koop.rolle = "gast";
    koop.code = code;
    koop.status = t("Verbinde …");
    renderKoopLobby();
    try {
        setzeVermittler(await koopVermittler(KOOP_KONFIG.praefix + "g-" + zufallsCode(10)));
    } catch (e) {
        koopFehler(t("Keine Verbindung zum Vermittler. Bist du online?"));
        return;
    }
    koop.partnerId = KOOP_KONFIG.praefix + code;
    const pc = neueVerbindung();
    richteKanalEin(pc.createDataChannel("sproutvale", { ordered: true }));
    const angebot = await pc.createOffer();
    await pc.setLocalDescription(angebot);
    koop.verbindungsId = "dc_" + zufallsCode(12).toLowerCase();
    koopVermittlerSende({ type: "OFFER", dst: koop.partnerId, payload: { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp }, ...koopPaketDaten() } });
    setTimeout(() => {
        if (koop.rolle === "gast" && !koop.verbunden && koop.code === code) koopFehler(t("Lobby nicht gefunden. Stimmt der Code?"));
    }, 15000);
}

function koopFehler(text) {
    Klang.fehler();
    zeigeToast("👥 " + text);
    koop.status = text;
    if (koop.rolle === "gast" && !koop.verbunden) koopVerlassen(true);
    renderKoopLobby();
}

// Lobby verlassen (still = ohne Meldung, z.B. vor einem neuen Versuch)
function koopVerlassen(still) {
    // Der Mitspieler behaelt meinen letzten Stand: wer spaeter auf meiner Seite einsteigt, spielt damit weiter
    if (koop.imSpiel && run && run.koop && run.phase !== "runEnde") koopSende("stand", { daten: runDaten() });
    if (koop.imSpiel) koopBeendeSpiel(true);
    koopSende("tschuess");
    if (koop.kanal) koop.kanal.onclose = null;
    if (koop.kanal) koop.kanal.close();
    if (koop.pc) koop.pc.close();
    if (koop.ws) koop.ws.close();
    clearInterval(koop.wsTakt);
    Object.assign(koop, {
        rolle: null, code: null, ws: null, pc: null, kanal: null, partnerId: null, verbunden: false, imSpiel: false,
        partner: null, partnerProfil: null, partnerPausiert: false, status: still ? koop.status : ""
    });
    zeigePauseSchild();
    if (!still) renderKoopLobby();
}

// Verbindung zum Mitspieler ist weg: jeder spielt sein eigenes Spiel weiter
function koopVerbindungWeg(still = false) {
    if (!koop.verbunden && !koop.kanal) return;
    const warImSpiel = koop.imSpiel;
    koop.verbunden = false;
    koop.partnerProfil = null; // Figur und Begleiter des Mitspielers verschwinden
    koop.kanal = null;
    koop.partnerPausiert = false;
    koop.partnerFelder = [];
    koop.partnerGold = 0;
    zeigePauseSchild();
    if (warImSpiel && run) renderPartnerFelder();
    if (koop.rolle === "host") {
        if (warImSpiel && !still) zeigeToast(t("👥 Dein Mitspieler hat das Spiel verlassen. Mit dem Lobby-Code kann er wieder beitreten."));
    } else if (warImSpiel) {
        // Der Host ist weg: wir werden Host und melden denselben Code wieder an
        koop.rolle = "host";
        // Ab jetzt gelten meine Skins, und mein Speicherplatz wird der Platz der Lobby
        koop.kosmetik = { ...meta.kosmetik };
        if (run) wendeKosmetikAn();
        if (run && run.koop && run.sandbox && run.koopSlot) koop.lobby = { ...koop.lobby, modus: "endlos", slot: run.koopSlot };
        zeigeToast(t("👑 Der Host hat das Spiel verlassen. Du bist jetzt Host und spielst weiter."));
        koopMeldeCodeWiederAn(koop.code, 0);
    } else {
        zeigeToast(t("👥 Die Verbindung zum Host ist weg."));
        koopVerlassen(false);
    }
    // Wartet man gerade auf den Mitspieler, geht es jetzt allein weiter
    if (warImSpiel && run) {
        if (run.koopFertig) koopPruefeFeierabend();
        if (koop.ichBereit) koopPruefeTagStart();
    }
    renderKoopLobby();
}

// Denselben Code wieder anmelden (der alte Host braucht ein paar Sekunden, bis sein Code frei ist)
async function koopMeldeCodeWiederAn(code, versuch) {
    if (koop.rolle !== "host" || !code) return;
    try {
        setzeVermittler(await koopVermittler(KOOP_KONFIG.praefix + code));
        koop.code = code;
        renderKoopLobby();
    } catch (e) {
        if (versuch < 12) setTimeout(() => koopMeldeCodeWiederAn(code, versuch + 1), 4000);
        else koopNeuerCode();
    }
}

// ---------- NACHRICHTEN ----------

function koopEmpfange(n) {
    switch (n.typ) {
        case "hallo":
            // Beide muessen dieselbe Version haben, sonst passt das Spiel nicht zusammen
            if (koop.rolle === "host" && n.version !== SPIEL_VERSION) {
                koopSende("falscheVersion", { version: SPIEL_VERSION });
                setTimeout(() => koopVerbindungTrennen(), 500);
                return;
            }
            koop.partner = { hatEndlos: Boolean(n.hatEndlos) };
            if (koop.rolle === "host") koopSende("lobby", { lobby: koop.lobby });
            // Laeuft schon ein Koop-Spiel, steigt der Neue direkt auf der freien Seite ein
            // (Endlos: mit seinem gespeicherten Stand, Story: neu, aber am selben Tag und mit denselben Rechnungen)
            if (koop.rolle === "host" && koop.imSpiel && run && run.koop && run.phase !== "runEnde") {
                koopSende("start", {
                    sandbox: Boolean(run.sandbox), slot: run.koopSlot, kosmetik: { ...koop.kosmetik }, gastSeite: partnerSeite(),
                    spielId: koop.spielId, gastDaten: koop.partnerStand, hostDaten: null,
                    mondphase: run.mondphase || 0,
                    wiedereinstieg: { tag: run.tag, bezahlteRechnungen: run.bezahlteRechnungen, phase: run.phase }
                });
                zeigeToast(t("👥 Dein Mitspieler ist wieder da."));
            }
            renderKoopLobby();
            break;
        case "lobby":
            if (koop.rolle === "gast") koop.lobby = n.lobby;
            renderKoopLobby();
            break;
        case "falscheVersion":
            koopVerlassen(true);
            koopFehler(tf("Du hast nicht dieselbe Version wie der Host (Host: {0}, du: {1}). Aktualisiert beide auf dieselbe Version.",
                n.version, SPIEL_VERSION));
            break;
        case "tschuess":
            koopVerbindungWeg();
            break;
        case "pause":
            koop.partnerPausiert = Boolean(n.an);
            zeigePauseSchild();
            break;
        case "kosmetik":
            // Nur die Skins des Hosts gelten
            if (koop.rolle !== "gast") break;
            koop.kosmetik = n.kosmetik || {};
            if (run) wendeKosmetikAn();
            break;
        case "start":
            if (koop.rolle === "gast") {
                koop.spielId = n.spielId || null;
                koop.gastPlatz = 0;
                koop.keinPlatzGemeldet = false;
                koop.partnerStand = n.hostDaten || null;
                koop.startMondphase = Math.max(0, Math.min(MONDPHASEN.length - 1, Number(n.mondphase) || 0));
                koop.wiedereinstieg = n.wiedereinstieg || null;
                koopStarteEigenesSpiel(Boolean(n.sandbox), n.slot || 0, n.kosmetik || {}, n.gastSeite || "rechts", n.gastDaten || null);
            }
            break;
        case "stand":
            koop.partnerStand = n.daten || null;
            if (run && run.koop && run.sandbox) koopSchreibeStand(null);
            break;
        case "info":
            koopEmpfangeInfo(n);
            break;
        case "wurf":
            if (koopAktiv()) koopZeigeWurf(n.slot, n.samen);
            break;
        case "fertig":
            koop.partnerFertig = true;
            koop.partnerGold = n.gold || 0;
            if (koop.rolle === "host") koopPruefeFeierabend();
            break;
        case "feierabend":
            koop.partnerGold = n.gold || 0;
            koopFuehreFeierabendAus();
            break;
        case "rechnung":
            koopRechnungEntscheidung(Boolean(n.bezahlen), false);
            break;
        case "bereit":
            koop.partnerBereit = true;
            if (koop.rolle === "host") koopPruefeTagStart();
            break;
        case "tagStart":
            koopStarteTagGemeinsam();
            break;
        case "ende":
            if (koopAktiv() && run.phase !== "runEnde") {
                zeigeToast(run.sandbox ? t("👥 Dein Mitspieler hat einen Neuanfang gestartet. Ihr fangt beide neu an.")
                    : t("👥 Dein Mitspieler hat den Run beendet."));
                koopBeendeRunLokal();
            }
            break;
        case "profil":
            koop.partnerProfil = { name: String(n.name || "").slice(0, 16), titel: String(n.titel || "").slice(0, 40), teile: n.teile || {}, begleiter: n.begleiter || "rot" };
            // Beim ersten Profil nach dem Verbinden: mit Namen melden, wer da ist (nie den Code zeigen)
            if (!koop.beitrittGemeldet) {
                koop.beitrittGemeldet = true;
                const name = koop.partnerProfil.name || t("Mitspieler");
                zeigeToast(koop.rolle === "host" ? tf("👥 Spieler {0} ist beigetreten", name) : tf("👥 Verbunden mit {0}", name));
                Klang.geschenk();
            }
            renderKoopLobby();
            break;
        case "emote":
            zeigePartnerEmote(n.id);
            break;
        case "frueh":
            // Der Mitspieler hat die Rechnung frueher bezahlt (mit dem Gold beider): hier genauso
            if (koopAktiv()) bezahleFrueher(false);
            break;
        case "gekickt":
            if (koop.rolle !== "gast") break;
            zeigeToast(t("🥾 Der Host hat dich aus der Lobby entfernt."));
            koopVerlassen(false);
            break;
        case "zurLobby":
            koopZurueckZurLobby(false);
            break;
        default:
            break;
    }
}

// ---------- SPIEL STARTEN (jeder spielt sein eigenes Spiel auf seiner Seite) ----------

function koopKannStarten() {
    return koop.rolle === "host" && koop.verbunden && !(koop.lobby.modus === "endlos" && !hatSandbox());
}

function koopStarteSpiel() {
    if (!koopKannStarten()) return;
    const endlos = koop.lobby.modus === "endlos";
    const slot = endlos ? koop.lobby.slot : 0;
    // Endlos: der Host spielt wieder seine alte Seite, der Gast uebernimmt die andere Seite des Spielstands
    const stand = endlos ? koopLeseStand(slot) : null;
    const hostSeite = stand ? stand.ich : "links";
    const gastSeite = hostSeite === "links" ? "rechts" : "links";
    koop.spielId = stand && stand.id ? stand.id : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    koop.partnerStand = stand ? stand.seiten[gastSeite] || null : null; // Story: neues Spiel, noch kein Stand
    const hostDaten = stand ? stand.seiten[hostSeite] || null : null;
    // Story: die Mondphase des Hosts gilt fuer beide (sonst waeren die Rechnungen auf beiden Seiten verschieden)
    koop.startMondphase = endlos ? 0 : Math.min(meta.mondphase || 0, meta.mondphaseFrei || 0);
    koopSende("start", { sandbox: endlos, slot, kosmetik: { ...meta.kosmetik }, gastSeite, spielId: koop.spielId, gastDaten: koop.partnerStand, hostDaten,
        mondphase: koop.startMondphase });
    koopStarteEigenesSpiel(endlos, slot, { ...meta.kosmetik }, hostSeite, hostDaten);
}

// Eigenes Koop-Spiel starten (oder den eigenen Koop-Spielstand weiterspielen)
function koopStarteEigenesSpiel(endlos, slot, kosmetik, seite, gespeichert = null) {
    legeRunBeiseite();
    wechsleMetaProfil(false);
    raeumeLootAuf();
    koop.imSpiel = true;
    koop.seite = seite;
    koop.slot = slot;
    koop.kosmetik = kosmetik;
    koop.partnerFelder = [];
    koop.partnerGold = 0;
    koop.partnerGesamtGold = 0;
    koop.partnerFertig = false;
    koop.partnerBereit = false;
    koop.ichBereit = false;
    run = erstelleRunZustand(endlos);
    run.koop = true;
    run.mondphase = endlos ? 0 : koop.startMondphase || 0;
    run.koopSlot = slot;
    run.slot = 0;
    erstelleSlots();
    if (gespeichert) {
        koopWendeRunDatenAn(gespeichert);
    } else {
        run.startFelder = 1 + metaLevel("startfelder") + sfLevel("kosmischefelder");
        for (let i = 0; i < run.startFelder; i++) erstelleFeld(naechsterSlot(seite));
        run.pflanzen.slice(1, 1 + metaLevel("saatvorrat")).forEach(p => {
            p.freigeschaltet = true;
            run.level["p_" + p.id] = 1;
        });
    }
    hauptmenue.classList.add("versteckt");
    prestigeShop.classList.add("versteckt");
    einstellungenFenster.classList.add("versteckt");
    segenFenster.classList.add("versteckt");
    haken("runStart");
    const wieder = koop.wiedereinstieg;
    koop.wiedereinstieg = null;
    if (!endlos && wieder) {
        // Wiedereinstieg in Story: gleicher Tag und gleiche Rechnungen wie der Host, damit alles zusammenpasst
        run.tag = Math.max(1, Number(wieder.tag) || 1);
        run.bezahlteRechnungen = Math.max(0, Number(wieder.bezahlteRechnungen) || 0);
    }
    if (endlos) starteTag(true);
    else if (wieder && wieder.phase === "tag") {
        koop.tagStartFrei = true;
        starteTag();
        koop.tagStartFrei = false;
    } else zeigeTagesKarte(run.tag === 1 && run.bezahlteRechnungen === 0 ? "start" : "feierabend");
    wendeKosmetikAn();
    Klang.start();
    aktualisiereAlles();
    // Gleich speichern, damit beide den ganzen Spielstand haben
    if (endlos) setTimeout(speichereRun, 500);
}

// ---------- KOOP-SPIELSTAND ----------
// Nur Endlos. Jeder speichert den ganzen Stand (beide Seiten) und merkt sich, welche Seite er selbst war.
// Spielt man den Stand spaeter mit jemand anderem, ist man wieder man selbst und der Neue uebernimmt die andere Seite.
// Skins stehen NICHT im Spielstand (es gelten immer die Skins des Hosts).

function koopRunKey(endlos, slot) {
    return endlos ? "sproutvale_koop_" + slot : "sproutvale_koop_story";
}

// Ganzer Stand: { id, ich, seiten: { links, rechts } } (alte Staende mit nur einer Seite werden umgedeutet)
function koopLeseStand(slot) {
    try {
        const daten = JSON.parse(localStorage.getItem(koopRunKey(true, slot)));
        if (!daten) return null;
        if (daten.seiten) return daten;
        if (daten.run) return { id: null, ich: "links", seiten: { links: daten, rechts: null } };
    } catch (e) {
        console.warn("Koop-Spielstand", e);
    }
    return null;
}

// Die eigene Seite eines Stands (fuer die Anzeige in der Lobby)
function koopLeseEigenenRun(endlos, slot) {
    if (!endlos) return null;
    const stand = koopLeseStand(slot);
    const daten = stand && stand.seiten[stand.ich];
    return daten && daten.run ? daten : null;
}

// Wohin speichere ich dieses Koop-Spiel? Host: gewaehlter Platz. Gast: Platz mit demselben Spiel, sonst ein freier Platz.
function koopSpeicherPlatz() {
    if (koop.rolle === "host") return run.koopSlot;
    if (koop.gastPlatz) return koop.gastPlatz;
    let frei = 0;
    for (let slot = 1; slot <= KOOP_KONFIG.slots; slot++) {
        const stand = koopLeseStand(slot);
        if (stand && stand.id && stand.id === koop.spielId) return slot;
        if (!stand && !frei) frei = slot;
    }
    return frei;
}

// Stand schreiben: eigene Seite (wenn uebergeben) plus die zuletzt erhaltene Seite des Mitspielers
function koopSchreibeStand(eigeneDaten) {
    const platz = koopSpeicherPlatz();
    if (!platz) {
        if (!koop.keinPlatzGemeldet) koopFragePlatzUeberschreiben();
        koop.keinPlatzGemeldet = true;
        return;
    }
    const alt = koopLeseStand(platz);
    const gleich = alt && alt.id === koop.spielId;
    const ich = eigeneSeite();
    const stand = {
        id: koop.spielId,
        ich,
        seiten: {
            links: gleich ? alt.seiten.links : null,
            rechts: gleich ? alt.seiten.rechts : null
        }
    };
    if (eigeneDaten) stand.seiten[ich] = eigeneDaten;
    if (koop.partnerStand) stand.seiten[partnerSeite()] = koop.partnerStand;
    if (!stand.seiten[ich]) return;
    run.koopSlot = platz;
    try {
        localStorage.setItem(koopRunKey(true, platz), JSON.stringify(stand));
    } catch (e) {
        console.warn("Koop-Spielstand", e);
    }
}

// Gast mit 3 belegten Koop-Speicherstaenden: einen ueberschreiben oder dieses Spiel nicht speichern
function koopFragePlatzUeberschreiben() {
    const knoepfe = [];
    for (let slot = 1; slot <= KOOP_KONFIG.slots; slot++) {
        const r = (koopLeseEigenenRun(true, slot) || {}).run;
        knoepfe.push({
            text: t("💾 Platz ") + slot + (r ? " (" + t("Tag ") + r.tag + ")" : ""),
            klasse: "knopf-rot",
            aktion: () => {
                koop.gastPlatz = slot;
                speichereRun();
                zeigeToast(tf("💾 Koop-Spiel wird auf Platz {0} gespeichert", slot));
            }
        });
    }
    knoepfe.push({ text: t("Nicht speichern"), aktion: () => {} });
    zeigePopup({
        titel: t("💾 Alle Koop-Speicherstände sind voll"),
        breite: 560,
        inhalt: t("Wähle einen Speicherstand, der mit diesem Koop-Spiel überschrieben wird. Der alte Stand auf diesem Platz geht dabei verloren."),
        knoepfe
    });
}

// Aus speichereRun: eigenen Stand speichern und dem Mitspieler schicken
function koopSpeichereRun(daten) {
    // Endlos: den ganzen Stand speichern. Story: nur dem Mitspieler schicken (fuer einen Wiedereinstieg auf dieser Seite)
    if (run.sandbox) koopSchreibeStand(daten);
    // Den Stand nur schicken, wenn er sich geaendert hat (ohne die Uhrzeit)
    const { gespeichertAm, ...vergleich } = daten;
    const text = JSON.stringify(vergleich);
    if (text === koop.letzterStand) return;
    koop.letzterStand = text;
    koopSende("stand", { daten });
}

function koopWendeRunDatenAn(daten) {
    const { pflanzen, ...rest } = daten.run;
    Object.assign(run, rest, { koop: true, zielFeld: null, samenUnterwegs: false, klickZaehler: 0, phase: rest.sandbox ? "vorTag" : "vorTag" });
    (pflanzen || []).forEach(gespeichert => {
        const pflanze = run.pflanzen.find(p => p.id === gespeichert.id);
        if (!pflanze) return;
        pflanze.freigeschaltet = gespeichert.freigeschaltet;
        pflanze.level = { ...pflanze.level, ...gespeichert.level };
    });
    erstelleSlots();
    run.felder = [];
    const slots = daten.feldSlots || [];
    slots.forEach((slot, i) => {
        erstelleFeld(slot);
        if (daten.felder && daten.felder[i]) stelleFeldWiederHer(run.felder[i], daten.felder[i]);
    });
    if (slots.length === 0) {
        for (let i = 0; i < Math.max(1, daten.anzahlFelder || 1); i++) erstelleFeld(naechsterSlot(eigeneSeite()));
    }
}

function koopLoescheEigenenRun(endlos, slot) {
    try {
        localStorage.removeItem(koopRunKey(endlos, slot));
    } catch (e) {
        console.warn("Koop-Spielstand", e);
    }
}

// ---------- INFOS FUER DEN MITSPIELER (Gold und Felder, nur zum Ansehen) ----------

// Nur schicken, wenn sich etwas geaendert hat (spaetestens alle 2 Sekunden als Lebenszeichen)
setInterval(() => {
    if (!koop.verbunden) return;
    // Kommt lange nichts mehr an (Spiel abgestuerzt, Internet weg), gilt der Mitspieler als weg
    if (performance.now() - (koop.letzteNachricht || 0) > KOOP_KONFIG.stilleMs) {
        koopVerbindungWeg();
        return;
    }
    if (!koopAktiv()) {
        if (performance.now() - (koop.letzteInfoZeit || 0) > KOOP_KONFIG.infoSpaetestensMs) {
            koop.letzteInfoZeit = performance.now();
            koopSende("lebt");
        }
        return;
    }
    const info = {
        gold: run.gold,
        gesamtGold: run.gesamt.gold,
        tag: run.tag,
        phase: run.phase,
        felder: run.felder.map(feld => {
            const stufenMs = feld.leer || feld.fertig ? 1 : stufenZeitSek(feld) * 1000;
            return {
                slot: feld.slot,
                bild: feld.leer ? null : feld.stufe === 2 ? unreifSprite(feld.pflanze.id) : feld.stufe < 3 ? STUFEN_SPRITES[feld.stufe] : feld.pflanze.id,
                fertig: feld.fertig,
                anteil: feld.leer ? 0 : feld.fertig ? 1 : Math.round((feld.stufe + Math.min(1, feld.fortschrittMs / stufenMs)) / 3 * 50) / 50
            };
        })
    };
    const text = JSON.stringify(info);
    const jetzt = performance.now();
    if (text !== koop.letzteInfo || jetzt - (koop.letzteInfoZeit || 0) > KOOP_KONFIG.infoSpaetestensMs) {
        koop.letzteInfo = text;
        koop.letzteInfoZeit = jetzt;
        koopSende("info", info);
    }
    // eigene Pause melden (Einstellungen oder Hauptmenue offen)
    const pause = !hauptmenue.classList.contains("versteckt") || !einstellungenFenster.classList.contains("versteckt");
    if (pause !== koop.eigenePause) {
        koop.eigenePause = pause;
        koopSende("pause", { an: pause });
    }
}, KOOP_KONFIG.infoMs);

function koopEmpfangeInfo(n) {
    koop.partnerGold = n.gold || 0;
    koop.partnerGesamtGold = n.gesamtGold || 0;
    koop.partnerTag = n.tag;
    koop.partnerFelder = n.felder || [];
    if (koopAktiv()) renderPartnerFelder();
}

// Felder des Mitspielers auf seiner Seite zeigen (anklicken geht nicht)
function renderPartnerFelder() {
    const belegt = new Set(koop.partnerFelder.map(f => f.slot));
    slotEls.forEach((el, i) => {
        if (el.classList.contains("partner-feld") && !belegt.has(i)) {
            el.className = "slot";
            el.innerHTML = "";
        }
    });
    koop.partnerFelder.forEach(f => {
        const el = slotEls[f.slot];
        if (!el || run.felder.some(eigen => eigen.slot === f.slot)) return;
        if (!el.classList.contains("partner-feld")) {
            el.className = "slot feld partner-feld";
            el.innerHTML = '<img class="feld-sprite" alt="" draggable="false"><div class="fortschritt-aussen"><div class="fortschritt-innen"></div></div>';
            setzeTipp(el, t("Feld deines Mitspielers"));
        }
        const bild = el.querySelector(".feld-sprite");
        // Unreife Pflanzen sind Farbvarianten, die hier vielleicht noch nie erzeugt wurden
        let name = f.bild;
        if (name && name.startsWith("unreif_") && !SPRITE_ABWANDLUNGEN[name] && SPRITE_PIXEL[name.slice(7)]) name = unreifSprite(name.slice(7));
        if (name && !SPRITE_PIXEL[name] && !SPRITE_ABWANDLUNGEN[name] && !SPRITE_DATEIEN[name]) name = null;
        if (name) {
            const url = spriteUrl(pflanzenSkinSprite(name));
            if (bild.dataset.bild !== f.bild) {
                bild.dataset.bild = f.bild;
                bild.src = url;
            }
            bild.hidden = false;
        } else {
            bild.hidden = true;
            bild.dataset.bild = "";
        }
        el.classList.toggle("feld-leer", !f.bild);
        el.classList.toggle("feld-fertig", Boolean(f.fertig));
        el.querySelector(".fortschritt-innen").style.width = Math.round(f.anteil * 100) + "%";
    });
}

// Wurf des Mitspielers: Samen fliegen vom Samenladen auf seine Seite
function koopZeigeWurf(slot, samen) {
    const el = slotEls[slot];
    if (!el) return;
    const ziel = el.getBoundingClientRect();
    const knopf = plantButton.getBoundingClientRect();
    spawnWurfKugel(knopf.left + knopf.width / 2, knopf.top + knopf.height * 0.45, ziel.left + ziel.width / 2, ziel.top + ziel.height / 2, samen, () => {});
}

// ---------- FEIERABEND: erst wenn beide keine Energie mehr haben ----------

function koopMeldeFertig() {
    if (run.koopFertig) return;
    run.koopFertig = true;
    koopSende("fertig", { gold: run.gold });
    zeigeWarteSchild(t("🌙 Feierabend! Warte auf deinen Mitspieler …"));
    if (koop.rolle === "host") koopPruefeFeierabend();
}

function koopPruefeFeierabend() {
    if (!run.koopFertig || (koop.verbunden && !koop.partnerFertig)) return;
    koopSende("feierabend", { gold: run.gold });
    koopFuehreFeierabendAus();
}

function koopFuehreFeierabendAus() {
    if (!run.koopFertig && run.phase !== "tag") return;
    run.koopFertig = false;
    koop.partnerFertig = false;
    zeigeWarteSchild(null);
    beendeTag();
}

// Rechnung: Gold beider zusammen. Wer zuerst entscheidet, entscheidet fuer beide.
function koopRechnungEntscheidung(bezahlen, selbst) {
    if (!koopAktiv() || !run.rechnungOffen) return;
    if (selbst) koopSende("rechnung", { bezahlen });
    document.querySelectorAll(".rechnung-frage").forEach(fenster => {
        const huelle = fenster.closest(".popup-huelle");
        if (huelle) huelle.remove();
    });
    run.rechnungOffen = false;
    if (bezahlen) {
        if (bezahleRechnungen()) schliesseFeierabendAb();
    } else {
        run.tag += 1;
        beendeRun(0, true);
    }
}

// Naechster Tag: startet, wenn beide bereit sind
function koopBereit() {
    if (koop.ichBereit) return;
    koop.ichBereit = true;
    koopSende("bereit");
    zeigeWarteSchild(t("☀️ Bereit! Warte auf deinen Mitspieler …"));
    if (koop.rolle === "host") koopPruefeTagStart();
}

function koopPruefeTagStart() {
    if (!koop.ichBereit || (koop.verbunden && !koop.partnerBereit)) return;
    koopSende("tagStart");
    koopStarteTagGemeinsam();
}

function koopStarteTagGemeinsam() {
    koop.ichBereit = false;
    koop.partnerBereit = false;
    zeigeWarteSchild(null);
    koop.tagStartFrei = true;
    starteTag();
    koop.tagStartFrei = false;
}

// Run beenden (einer beendet, beide sind fertig)
function koopBeendeRunLokal() {
    if (run.phase === "runEnde") return;
    run.rechnungOffen = false;
    document.querySelectorAll(".rechnung-frage").forEach(fenster => {
        const huelle = fenster.closest(".popup-huelle");
        if (huelle) huelle.remove();
    });
    zeigeWarteSchild(null);
    beendeRun(0, true);
}

// ---------- ZURUECK IN DIE LOBBY ----------

function koopZurueckZurLobby(melden) {
    if (melden) koopSende("zurLobby");
    koopBeendeSpiel(true);
    zeigeHauptmenue();
    zeigeMenueSeite("koop");
}

function koopBeendeSpiel(ladeSolo) {
    if (!koop.imSpiel) return;
    if (run && run.koop && run.phase !== "runEnde") speichereRun();
    koop.imSpiel = false;
    koop.partnerPausiert = false;
    koop.kosmetik = {};
    koop.partnerFelder = [];
    raeumeLootAuf();
    segenFenster.classList.add("versteckt");
    zeigePauseSchild();
    zeigeWarteSchild(null);
    if (ladeSolo) {
        speichernGesperrt = true;
        const endlos = meta.letzterModus === "sandbox" && hatSandbox();
        if (!ladeRun(endlos) && !(endlos && ladeRun(false))) starteNeuenRun(false);
        speichernGesperrt = false;
        wendeKosmetikAn();
    }
}

// ---------- SCHILDER: Pause des Mitspielers und Warten ----------

function zeigePauseSchild() {
    let schild = document.getElementById("koop-pause");
    const zeigen = koopAktiv() && koop.partnerPausiert;
    if (!zeigen) {
        if (schild) schild.remove();
        return;
    }
    if (!schild) {
        schild = el("div", "koop-pause-schild", t("⏸ Der andere Spieler hat das Spiel pausiert"));
        schild.id = "koop-pause";
        document.body.appendChild(schild);
    }
}

function zeigeWarteSchild(text) {
    let schild = document.getElementById("koop-warten");
    if (!text) {
        if (schild) schild.remove();
        return;
    }
    if (!schild) {
        schild = el("div", "koop-warte-schild");
        schild.id = "koop-warten";
        document.body.appendChild(schild);
    }
    schild.textContent = text;
}

// ---------- KOSMETIK IM KOOP ----------

// Im Koop gelten immer die Skins des Hosts. Sie werden nie im Spielstand gespeichert.
function koopSetzeKosmetik(kategorie, wert) {
    if (!koopAktiv()) return;
    if (koop.rolle !== "host") {
        zeigeToast(t("🎨 Im Koop gelten die Skins des Hosts."));
        return;
    }
    koop.kosmetik = { ...koop.kosmetik, [kategorie]: wert };
    koopSende("kosmetik", { kosmetik: koop.kosmetik });
}

// ---------- OBERFLAECHE: SOLO/DUO UND LOBBY ----------

function renderKoopLobby() {
    const seite = $("menue-koop");
    if (!seite || seite.classList.contains("versteckt")) return;
    const inhalt = $("koop-inhalt");
    inhalt.innerHTML = "";

    if (!koop.rolle) {
        // Noch keine Lobby: erstellen oder beitreten
        const erstellen = el("button", "knopf knopf-gruen koop-gross", t("➕ Lobby erstellen"));
        erstellen.addEventListener("click", koopLobbyErstellen);
        const eingabe = document.createElement("input");
        eingabe.className = "koop-code-eingabe";
        eingabe.type = "password"; // auch der eingetippte Code bleibt fuer Zuschauer unsichtbar
        eingabe.maxLength = 7;
        eingabe.placeholder = t("Code");
        eingabe.autocomplete = "off";
        const beitreten = el("button", "knopf koop-gross", t("🚪 Beitreten"));
        beitreten.addEventListener("click", () => koopBeitreten(eingabe.value));
        eingabe.addEventListener("keydown", event => {
            if (event.key === "Enter") koopBeitreten(eingabe.value);
        });
        inhalt.append(
            el("div", "koop-karte", null, [el("b", null, t("Neue Lobby")), el("p", null, t("Du bist Host und wählst den Modus. Gib deinem Freund den Code.")), erstellen]),
            el("div", "koop-karte", null, [el("b", null, t("Einer Lobby beitreten")), el("p", null, t("Gib den Code ein, den dir dein Freund gegeben hat.")),
                el("div", "koop-zeile", null, [eingabe, beitreten])])
        );
        if (koop.status) inhalt.appendChild(el("p", "koop-status", koop.status));
        return;
    }

    const host = koop.rolle === "host";
    // Waehrend eines Koop-Spiels (ueber das Hauptmenue hierher gekommen)
    if (koop.imSpiel) {
        const zurueck = el("button", "knopf knopf-gruen koop-gross", t("▶ Zurück ins Spiel"));
        zurueck.addEventListener("click", () => {
            hauptmenue.classList.add("versteckt");
            aktualisiereAlles();
        });
        const ende = el("button", "knopf knopf-rot", host ? t("🏳️ Koop-Spiel beenden") : t("🚪 Koop-Spiel verlassen"));
        ende.addEventListener("click", () => (host ? koopZurueckZurLobby(true) : koopVerlassen(false)));
        inhalt.appendChild(el("div", "koop-knoepfe", null, [ende, zurueck]));
    }
    // Code
    const codeZeile = el("div", "koop-code", null, [
        el("span", "koop-code-titel", t("Lobby-Code")),
        el("span", "koop-code-wert", koopCodeText())
    ]);
    if (koop.code) {
        codeZeile.appendChild(koopCodeAugeKnopf(renderKoopLobby));
        const kopieren = el("button", "knopf koop-klein", t("📋 Kopieren"));
        kopieren.addEventListener("click", koopKopiereCode);
        codeZeile.appendChild(kopieren);
    }
    if (host) {
        const neu = el("button", "knopf koop-klein", t("🔄 Neuer Code"));
        setzeTipp(neu, t("Der alte Code verfällt sofort. Ein verbundener Mitspieler bleibt in der Lobby."));
        neu.addEventListener("click", koopNeuerCode);
        codeZeile.appendChild(neu);
    }
    inhalt.appendChild(codeZeile);

    // Spieler
    // mit Namen und kleiner Figur aus dem Profil
    const spielerZeile = (text, teile, klasse = "", kicken = false) => {
        const zeile = el("div", "koop-spieler-zeile" + klasse);
        if (teile) {
            const mini = erstelleFigurBild(2);
            zeigeFigurBild(mini, figurTeileAus(teile, false), "stehen", 0, false, "vorne");
            zeile.appendChild(mini.huelle);
        }
        zeile.appendChild(el("span", null, text));
        if (kicken) {
            const knopf = el("button", "knopf knopf-rot koop-klein koop-kicken", t("🥾 Rauswerfen"));
            setzeTipp(knopf, t("Mitspieler aus der Lobby entfernen. Die Lobby bekommt einen neuen Code."));
            knopf.addEventListener("click", koopKicken);
            zeile.appendChild(knopf);
        }
        return zeile;
    };
    const partner = koop.partnerProfil;
    inhalt.appendChild(el("div", "koop-spieler", null, [
        spielerZeile((host ? "👑 " : "🙂 ") + profilName() + (host ? t(" (du, Host)") : t(" (du)")), profil().teile),
        koop.verbunden
            ? spielerZeile((host ? "🙂 " : "👑 ") + (partner && partner.name ? partner.name : t("Mitspieler")) + (partner && partner.titel ? " · " + partner.titel : "") + (host ? "" : t(" (Host)")),
                partner ? partner.teile : null, "", host)
            : spielerZeile(host ? t("⏳ Warte auf einen Mitspieler …") : koop.status || t("Verbinde …"), null, " wartet")
    ]));

    // Modus
    const modi = el("div", "koop-modi");
    [["story", t("🌾 Story"), t("Immer ein neuer Run. Alle 5 Tage kommt eine gemeinsame Rechnung.")],
        ["endlos", t("♾️ Endlos"), t("Keine Rechnungen, keine Energie. 3 gemeinsame Speicherstände.")]].forEach(([id, name, text]) => {
        const gesperrt = id === "endlos" && host && !hatSandbox();
        const karte = el("button", "koop-modus" + (koop.lobby.modus === id ? " aktiv" : "") + (gesperrt ? " gesperrt" : ""), null, [
            el("b", null, name), el("span", null, gesperrt ? t("🔒 Der Host braucht Endlos freigeschaltet.") : text)
        ]);
        karte.disabled = !host || gesperrt;
        karte.addEventListener("click", () => {
            koop.lobby = { ...koop.lobby, modus: id };
            koopSende("lobby", { lobby: koop.lobby });
            Klang.klick(8);
            renderKoopLobby();
        });
        modi.appendChild(karte);
    });
    inhalt.appendChild(modi);

    // Endlos: gemeinsame Speicherstaende
    if (koop.lobby.modus === "endlos") {
        const liste = el("div", "endlos-slots koop-slots");
        for (let slot = 1; slot <= KOOP_KONFIG.slots; slot++) {
            const daten = koopLeseEigenenRun(true, slot);
            const r = daten && daten.run;
            const zeile = el("div", "endlos-slot" + (koop.lobby.slot === slot ? " aktiv" : ""), null, [
                el("div", "endlos-slot-text", null, [
                    el("b", null, t("Koop-Speicherstand ") + slot),
                    el("span", null, r ? "📅 " + t("Tag ") + r.tag + " · 🏁 " + (r.meilensteine || 0) + t(" Meilensteine") + " · 🪙 " + zahl(r.gold || 0) + t(" Gold") : t("Leer"))
                ])
            ]);
            if (host) {
                const waehlen = el("button", "knopf knopf-gruen", koop.lobby.slot === slot ? t("✔ Gewählt") : r ? t("Wählen") : t("+ Neu"));
                waehlen.addEventListener("click", () => {
                    koop.lobby = { ...koop.lobby, slot };
                    koopSende("lobby", { lobby: koop.lobby });
                    renderKoopLobby();
                });
                zeile.appendChild(waehlen);
                if (r) {
                    const weg = el("button", "knopf knopf-rot endlos-slot-loeschen", "🗑️");
                    setzeTipp(weg, t("Speicherstand löschen"));
                    weg.addEventListener("click", () => {
                        koopLoescheEigenenRun(true, slot);
                        renderKoopLobby();
                    });
                    zeile.appendChild(weg);
                }
            }
            liste.appendChild(zeile);
        }
        inhalt.appendChild(liste);
    }

    // Knoepfe
    const knoepfe = el("div", "koop-knoepfe");
    const verlassen = el("button", "knopf knopf-rot", t("🚪 Lobby verlassen"));
    verlassen.addEventListener("click", () => koopVerlassen(false));
    knoepfe.appendChild(verlassen);
    if (host) {
        const start = el("button", "knopf knopf-gruen koop-gross", t("▶ Spiel starten"));
        start.disabled = !koopKannStarten();
        if (!koop.verbunden) setzeTipp(start, t("Warte, bis dein Mitspieler verbunden ist."));
        start.addEventListener("click", koopStarteSpiel);
        knoepfe.appendChild(start);
    } else {
        knoepfe.appendChild(el("span", "koop-warte", t("⏳ Der Host startet das Spiel.")));
    }
    inhalt.appendChild(knoepfe);
}


// ---------- DUO-KNOPF IM SPIEL ----------
// Oben in der Leiste: der Host sieht den Lobby-Code (kopieren, neu machen: der alte gilt dann nicht mehr),
// beide koennen das Duo verlassen. Wer mit dem Code wieder beitritt, steigt auf der freien Seite ein.

function aktualisiereKoopKnopf() {
    const knopf = $("koop-knopf");
    if (!knopf) return;
    const aktiv = Boolean(koop.rolle) && koop.imSpiel;
    knopf.classList.toggle("versteckt", !aktiv);
    if (!aktiv) return;
    const text = koop.verbunden ? t("Duo") : t("Allein");
    const span = knopf.querySelector("span");
    if (span.textContent !== text) span.textContent = text;
    knopf.classList.toggle("wartet", !koop.verbunden);
    setzeTipp(knopf, "## " + t("👥 Duo") + "\n= " + (koop.rolle === "host" ? t("Du bist Host") : t("Du bist Gast")) +
        "\n- " + (koop.verbunden ? t("Mitspieler verbunden") : t("Mitspieler nicht da: mit dem Code kann er wieder beitreten")) +
        "\n" + t("Klick: Code anzeigen, kopieren oder neu machen"));
}

function zeigeKoopFenster() {
    const host = koop.rolle === "host";
    const inhalt = el("div", "koop-fenster-inhalt", null, [
        el("p", null, host
            ? t("Gib deinem Mitspieler diesen Code. Wer mit dem Code beitritt, steigt auf der freien Seite ins laufende Spiel ein.")
            : t("Du spielst als Gast. Verlässt du das Duo, kannst du mit demselben Code wieder beitreten.")),
        host ? el("div", "koop-code-gross", koopCodeText()) : null,
        host && koop.code ? koopCodeAugeKnopf(() => { schliesse(); zeigeKoopFenster(); }) : null,
        el("p", "koop-fenster-status", koop.verbunden ? t("👥 Mitspieler verbunden") : t("⏳ Kein Mitspieler da"))
    ].filter(Boolean));
    const knoepfe = [{ text: t("Schließen") }];
    if (host) {
        knoepfe.push({ text: t("📋 Kopieren"), aktion: koopKopiereCode });
        if (koop.verbunden) knoepfe.push({ text: t("🥾 Rauswerfen"), klasse: "knopf-rot", aktion: koopKicken });
        knoepfe.push({ text: t("🔄 Neuer Code"), aktion: () => {
            koopNeuerCode();
            zeigeToast(t("🔄 Neuer Code: der alte gilt nicht mehr."));
        } });
    }
    knoepfe.push({ text: host ? t("🏳️ Duo beenden") : t("🚪 Duo verlassen"), klasse: "knopf-rot", aktion: () => {
        if (host) koopZurueckZurLobby(true);
        else koopVerlassen(false);
    } });
    const schliesse = zeigePopup({ titel: t("👥 Duo"), breite: 460, inhalt, knoepfe });
}

setInterval(aktualisiereKoopKnopf, 500);
