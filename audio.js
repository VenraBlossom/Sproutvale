"use strict";

// ============================================================
// AUDIO: Soundeffekte und Hintergrundmusik, komplett im Code erzeugt (Web Audio API).
// Spaeter koennen hier echte Sound-Dateien (.ogg/.mp3) eingebunden werden.
// Browser erlauben Ton erst nach dem ersten Klick, darum startet Klang.start() beim ersten Klick.
//
// Aufbau: Instrumente (Zupfen, Glocke, Flaeche, Bass, Kick, Rauschen) -> Musik- bzw. SFX-Bus
//         -> Hall (Convolver) + Echo -> Kompressor -> Lautsprecher
// Musik: LIEDER (unten) sind kleine Stuecke aus Akkorden und Melodie-Takten. Gewechselt wird am Taktende.
// ============================================================

const EINSTELLUNGEN_KEY = "sproutvale_einstellungen";

function ladeEinstellungen() {
    const standard = {
        musik: 0.4, sfx: 0.6, sprache: "de",
        wackeln: true, blitze: true, farbenblind: false, tipps: true, jahreszeitTeilchen: true, musikTitel: "auto"
    };
    try {
        const daten = JSON.parse(localStorage.getItem(EINSTELLUNGEN_KEY));
        if (daten) return { ...standard, ...daten };
    } catch (fehler) {
        console.warn("Einstellungen konnten nicht geladen werden", fehler);
    }
    return standard;
}

function speichereEinstellungen() {
    try {
        localStorage.setItem(EINSTELLUNGEN_KEY, JSON.stringify(einstellungen));
    } catch (fehler) {
        console.warn("Einstellungen konnten nicht gespeichert werden", fehler);
    }
}

const einstellungen = ladeEinstellungen();

function midiZuFrequenz(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

// ---------- DIE LIEDER ----------
// akkorde: Name -> { bass: MIDI-Ton, toene: [MIDI-Toene] }
// takte: [Akkordname, Melodie als [[Note, Laenge in Achteln], ...]], Note 0 = Pause
// taktAchtel: 8 = 4/4-Takt, 6 = 3/4-Takt (Walzer)
// bass: "normal" | "walking" | "oompah" | "walzer" | "lang"
// schlagzeug: "sanft" | "hell" | "swing" | "oompah" | "schlitten" | "keins"
// begleitung: "zupfen" | "arpeggio" | "stabs" | "walzer" | "keine"
// melodie: "zupfen" | "glocke", swing: 0 = gerade, 0.15 = leicht geswingt

const PAUSE = akkorde => akkorde.map(a => [a, [[0, 8]]]);

const LIEDER = {
    sproutvale: {
        name: "Sproutvale", tempo: 84, taktAchtel: 8, bass: "normal", schlagzeug: "sanft", begleitung: "zupfen",
        melodie: "zupfen", flaeche: 0.035, swing: 0,
        akkorde: {
            F: { bass: 41, toene: [53, 57, 60] }, C: { bass: 36, toene: [52, 55, 60] },
            Dm: { bass: 38, toene: [50, 53, 57] }, Bb: { bass: 34, toene: [50, 53, 58] }
        },
        teile: {
            a: [
                ["F", [[72, 2], [69, 1], [72, 1], [77, 2], [76, 2]]],
                ["C", [[74, 3], [72, 1], [67, 4]]],
                ["Dm", [[69, 2], [74, 2], [72, 2], [69, 2]]],
                ["Bb", [[70, 2], [69, 1], [67, 1], [65, 4]]],
                ["F", [[72, 2], [69, 1], [72, 1], [77, 2], [79, 2]]],
                ["C", [[81, 3], [79, 1], [76, 4]]],
                ["Bb", [[77, 2], [74, 2], [70, 2], [74, 2]]],
                ["C", [[72, 6], [0, 2]]]
            ],
            b: [
                ["Dm", [[74, 2], [77, 2], [81, 2], [77, 2]]],
                ["Bb", [[79, 3], [77, 1], [74, 4]]],
                ["F", [[72, 2], [77, 2], [76, 2], [77, 2]]],
                ["C", [[79, 6], [0, 2]]],
                ["Bb", [[74, 2], [77, 2], [79, 2], [77, 2]]],
                ["C", [[76, 3], [74, 1], [72, 4]]],
                ["F", [[69, 2], [72, 2], [74, 2], [76, 2]]],
                ["F", [[77, 6], [0, 2]]]
            ],
            p: PAUSE(["F", "C", "Dm", "Bb"])
        },
        ablauf: ["p", "a", "b", "a", "p", "b", "a", "p"]
    },
    morgentau: {
        name: "Morgentau", tempo: 96, taktAchtel: 8, bass: "normal", schlagzeug: "hell", begleitung: "arpeggio",
        melodie: "zupfen", flaeche: 0.025, swing: 0,
        akkorde: {
            G: { bass: 43, toene: [55, 59, 62] }, D: { bass: 38, toene: [50, 54, 57] },
            Em: { bass: 40, toene: [52, 55, 59] }, C: { bass: 36, toene: [48, 52, 55] }
        },
        teile: {
            a: [
                ["G", [[74, 2], [79, 2], [78, 1], [76, 1], [74, 2]]],
                ["D", [[76, 2], [74, 2], [69, 4]]],
                ["Em", [[71, 2], [74, 2], [79, 2], [78, 2]]],
                ["C", [[76, 3], [74, 1], [72, 4]]],
                ["G", [[74, 2], [79, 2], [81, 2], [83, 2]]],
                ["D", [[81, 3], [79, 1], [78, 4]]],
                ["C", [[76, 2], [79, 2], [76, 2], [72, 2]]],
                ["D", [[74, 6], [0, 2]]]
            ],
            p: PAUSE(["G", "D", "Em", "C"])
        },
        ablauf: ["p", "a", "a", "p"]
    },
    abendrot: {
        name: "Abendrot", tempo: 70, taktAchtel: 8, bass: "lang", schlagzeug: "keins", begleitung: "arpeggio",
        melodie: "zupfen", flaeche: 0.045, swing: 0,
        akkorde: {
            D: { bass: 38, toene: [50, 54, 57] }, Bm: { bass: 35, toene: [47, 50, 54] },
            G: { bass: 31, toene: [43, 47, 50] }, A: { bass: 33, toene: [45, 49, 52] }
        },
        teile: {
            a: [
                ["D", [[66, 3], [69, 1], [71, 2], [69, 2]]],
                ["Bm", [[66, 4], [62, 4]]],
                ["G", [[67, 2], [71, 2], [74, 3], [71, 1]]],
                ["A", [[69, 6], [0, 2]]],
                ["D", [[66, 2], [69, 2], [74, 2], [73, 2]]],
                ["Bm", [[71, 3], [69, 1], [66, 4]]],
                ["G", [[67, 2], [69, 2], [71, 2], [67, 2]]],
                ["A", [[69, 4], [64, 4]]]
            ],
            p: PAUSE(["D", "Bm", "G", "A"])
        },
        ablauf: ["p", "a", "a", "p"]
    },
    mondnacht: {
        name: "Mondnacht", tempo: 60, taktAchtel: 8, bass: "lang", schlagzeug: "keins", begleitung: "keine",
        melodie: "glocke", flaeche: 0.05, swing: 0,
        akkorde: {
            Am: { bass: 33, toene: [45, 48, 52] }, F: { bass: 29, toene: [41, 45, 48] },
            C: { bass: 36, toene: [48, 52, 55] }, G: { bass: 31, toene: [43, 47, 50] }
        },
        teile: {
            a: [
                ["Am", [[76, 4], [72, 4]]],
                ["F", [[77, 6], [0, 2]]],
                ["C", [[79, 4], [76, 4]]],
                ["G", [[74, 8]]],
                ["Am", [[72, 2], [76, 2], [81, 4]]],
                ["F", [[79, 4], [77, 4]]],
                ["C", [[76, 4], [74, 2], [72, 2]]],
                ["G", [[71, 6], [0, 2]]]
            ],
            p: PAUSE(["Am", "F", "C", "G"])
        },
        ablauf: ["p", "a", "p", "a"]
    },
    mondteich: {
        name: "Mondteich", tempo: 66, taktAchtel: 8, bass: "lang", schlagzeug: "keins", begleitung: "arpeggio",
        melodie: "glocke", flaeche: 0.04, swing: 0,
        akkorde: {
            Fmaj7: { bass: 29, toene: [53, 57, 60, 64] }, Em7: { bass: 28, toene: [52, 55, 59, 62] },
            Dm7: { bass: 26, toene: [50, 53, 57, 60] }, Cmaj7: { bass: 24, toene: [48, 52, 55, 59] }
        },
        teile: {
            a: [
                ["Fmaj7", [[84, 1], [81, 1], [77, 1], [81, 1], [84, 2], [88, 2]]],
                ["Em7", [[86, 4], [83, 4]]],
                ["Dm7", [[81, 1], [77, 1], [74, 1], [77, 1], [81, 2], [84, 2]]],
                ["Cmaj7", [[83, 6], [0, 2]]],
                ["Fmaj7", [[88, 2], [84, 2], [81, 2], [84, 2]]],
                ["Em7", [[83, 3], [79, 1], [76, 4]]],
                ["Dm7", [[77, 2], [81, 2], [84, 2], [86, 2]]],
                ["Cmaj7", [[84, 8]]]
            ]
        },
        ablauf: ["a"]
    },
    gluecksspiel: {
        name: "Glücksspiel", tempo: 116, taktAchtel: 8, bass: "walking", schlagzeug: "swing", begleitung: "stabs",
        melodie: "zupfen", flaeche: 0, swing: 0.16,
        akkorde: {
            C: { bass: 36, toene: [52, 55, 60] }, A7: { bass: 33, toene: [49, 52, 55, 57] },
            D7: { bass: 38, toene: [54, 57, 60] }, G7: { bass: 31, toene: [53, 55, 59] }
        },
        teile: {
            a: [
                ["C", [[76, 1], [77, 1], [79, 2], [84, 1], [79, 1], [76, 2]]],
                ["A7", [[73, 1], [76, 1], [81, 2], [79, 1], [76, 1], [73, 2]]],
                ["D7", [[74, 1], [78, 1], [81, 2], [84, 2], [81, 2]]],
                ["G7", [[79, 2], [77, 2], [74, 2], [71, 2]]],
                ["C", [[72, 1], [76, 1], [79, 1], [84, 1], [88, 2], [84, 2]]],
                ["A7", [[85, 2], [81, 2], [76, 2], [73, 2]]],
                ["D7", [[74, 2], [78, 1], [81, 1], [79, 2], [77, 2]]],
                ["G7", [[79, 4], [0, 4]]]
            ]
        },
        ablauf: ["a"]
    },
    kirmes: {
        name: "Kirmes", tempo: 126, taktAchtel: 8, bass: "oompah", schlagzeug: "oompah", begleitung: "stabs",
        melodie: "zupfen", flaeche: 0, swing: 0,
        akkorde: {
            C: { bass: 36, toene: [52, 55, 60] }, F: { bass: 41, toene: [53, 57, 60] },
            G7: { bass: 31, toene: [53, 55, 59] }
        },
        teile: {
            a: [
                ["C", [[72, 2], [76, 2], [79, 2], [76, 2]]],
                ["F", [[77, 2], [81, 2], [84, 4]]],
                ["G7", [[83, 2], [79, 2], [77, 2], [74, 2]]],
                ["C", [[72, 6], [0, 2]]],
                ["C", [[79, 1], [81, 1], [79, 1], [76, 1], [72, 2], [76, 2]]],
                ["F", [[77, 1], [79, 1], [77, 1], [74, 1], [69, 4]]],
                ["G7", [[71, 2], [74, 2], [77, 2], [79, 2]]],
                ["C", [[84, 6], [0, 2]]]
            ]
        },
        ablauf: ["a"]
    },
    winterzauber: {
        name: "Winterzauber", tempo: 76, taktAchtel: 8, bass: "normal", schlagzeug: "schlitten", begleitung: "arpeggio",
        melodie: "glocke", flaeche: 0.04, swing: 0,
        akkorde: {
            Em: { bass: 40, toene: [52, 55, 59] }, C: { bass: 36, toene: [48, 52, 55] },
            G: { bass: 43, toene: [55, 59, 62] }, D: { bass: 38, toene: [50, 54, 57] }
        },
        teile: {
            a: [
                ["Em", [[76, 2], [79, 2], [83, 4]]],
                ["C", [[84, 3], [83, 1], [79, 4]]],
                ["G", [[79, 2], [83, 2], [86, 2], [83, 2]]],
                ["D", [[81, 6], [0, 2]]],
                ["Em", [[83, 2], [79, 2], [76, 2], [79, 2]]],
                ["C", [[81, 4], [76, 4]]],
                ["G", [[74, 2], [79, 2], [78, 2], [76, 2]]],
                ["Em", [[76, 6], [0, 2]]]
            ]
        },
        ablauf: ["a"]
    },
    sternenwalzer: {
        name: "Sternenwalzer", tempo: 104, taktAchtel: 6, bass: "walzer", schlagzeug: "keins", begleitung: "walzer",
        melodie: "glocke", flaeche: 0.02, swing: 0,
        akkorde: {
            F: { bass: 41, toene: [53, 57, 60] }, Dm: { bass: 38, toene: [50, 53, 57] },
            Gm: { bass: 43, toene: [55, 58, 62] }, C: { bass: 36, toene: [52, 55, 60] }
        },
        teile: {
            a: [
                ["F", [[72, 3], [77, 1], [81, 2]]],
                ["Dm", [[81, 2], [77, 2], [74, 2]]],
                ["Gm", [[74, 3], [79, 1], [82, 2]]],
                ["C", [[79, 4], [76, 2]]],
                ["F", [[77, 2], [81, 2], [84, 2]]],
                ["Dm", [[86, 3], [84, 1], [81, 2]]],
                ["Gm", [[82, 2], [79, 2], [74, 2]]],
                ["C", [[76, 4], [0, 2]]]
            ]
        },
        ablauf: ["a"]
    }
};

// Alle Takte eines Liedes hintereinander (aus dem Ablauf der Teile)
function liedTakte(lied) {
    if (!lied.alleTakte) lied.alleTakte = lied.ablauf.flatMap(teil => lied.teile[teil]);
    return lied.alleTakte;
}

// Tonleiter fuer die Klick-Toene: je hoeher die Kombo, desto hoeher der Ton
const KLICK_TONLEITER = [72, 74, 77, 79, 81, 84, 86, 89, 91, 93, 96];
// Pentatonik fuer die Ernte-Toene: jede Pflanze klingt etwas hoeher als die vorige
const ERNTE_TONLEITER = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100, 103, 105];

const Klang = {
    ctx: null,
    musikBus: null,
    sfxBus: null,
    hallEingang: null,
    echoEingang: null,
    rauschen: null,
    naechsterTaktZeit: 0,
    taktNummer: 0,
    liedId: "sproutvale",
    naechstesLiedId: "sproutvale",
    tempoFaktor: 1,
    regenQuelle: null,

    start() {
        if (this.ctx) {
            if (this.ctx.state === "suspended") this.ctx.resume();
            return;
        }
        const AudioKontext = window.AudioContext || window.webkitAudioContext;
        if (!AudioKontext) return;
        this.ctx = new AudioKontext();
        const ctx = this.ctx;

        const kompressor = ctx.createDynamicsCompressor();
        kompressor.threshold.value = -16;
        kompressor.ratio.value = 4;
        kompressor.connect(ctx.destination);

        // Hall: kuenstliche Raumantwort aus abklingendem Rauschen
        const hall = ctx.createConvolver();
        hall.buffer = this.erzeugeHall(2.6);
        const hallLautstaerke = ctx.createGain();
        hallLautstaerke.gain.value = 0.35;
        hall.connect(hallLautstaerke);
        hallLautstaerke.connect(kompressor);
        this.hallEingang = hall;

        // Echo mit Rueckkopplung, leicht gedaempft
        const echo = ctx.createDelay(1);
        echo.delayTime.value = 0.54;
        const rueckkopplung = ctx.createGain();
        rueckkopplung.gain.value = 0.28;
        const echoFilter = ctx.createBiquadFilter();
        echoFilter.type = "lowpass";
        echoFilter.frequency.value = 2200;
        echo.connect(echoFilter);
        echoFilter.connect(rueckkopplung);
        rueckkopplung.connect(echo);
        const echoLautstaerke = ctx.createGain();
        echoLautstaerke.gain.value = 0.22;
        echoFilter.connect(echoLautstaerke);
        echoLautstaerke.connect(kompressor);
        this.echoEingang = echo;
        this.echoKnoten = echo;

        this.musikBus = ctx.createGain();
        this.musikBus.connect(kompressor);
        this.sfxBus = ctx.createGain();
        this.sfxBus.connect(kompressor);

        this.rauschen = this.erzeugeRauschen();
        this.setzeLautstaerken();
        this.starteMusik();
    },

    erzeugeHall(sekunden) {
        const laenge = Math.floor(this.ctx.sampleRate * sekunden);
        const puffer = this.ctx.createBuffer(2, laenge, this.ctx.sampleRate);
        for (let kanal = 0; kanal < 2; kanal++) {
            const daten = puffer.getChannelData(kanal);
            for (let i = 0; i < laenge; i++) daten[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / laenge, 3);
        }
        return puffer;
    },

    erzeugeRauschen() {
        const laenge = this.ctx.sampleRate;
        const puffer = this.ctx.createBuffer(1, laenge, this.ctx.sampleRate);
        const daten = puffer.getChannelData(0);
        for (let i = 0; i < laenge; i++) daten[i] = Math.random() * 2 - 1;
        return puffer;
    },

    setzeLautstaerken() {
        if (!this.ctx) return;
        this.musikBus.gain.value = einstellungen.musik * 0.5;
        this.sfxBus.gain.value = einstellungen.sfx * 0.55;
    },

    // Verbindet eine Stimme mit dem Bus und optional mit Hall/Echo
    verbinde(knoten, bus, hallAnteil, echoAnteil) {
        knoten.connect(bus);
        if (hallAnteil > 0) {
            const senden = this.ctx.createGain();
            senden.gain.value = hallAnteil * bus.gain.value;
            knoten.connect(senden);
            senden.connect(this.hallEingang);
        }
        if (echoAnteil > 0) {
            const senden = this.ctx.createGain();
            senden.gain.value = echoAnteil * bus.gain.value;
            knoten.connect(senden);
            senden.connect(this.echoEingang);
        }
    },

    // ---------- Instrumente ----------

    // Weiches Zupfen (Melodie, Muenzen): Dreieck + Sinus eine Oktave hoeher, schnell ansteigend, langsam abklingend
    zupfen(zeit, frequenz, dauer, lautstaerke, bus, hall = 0.4, echo = 0) {
        const ctx = this.ctx;
        const huelle = ctx.createGain();
        huelle.gain.setValueAtTime(0.0001, zeit);
        huelle.gain.exponentialRampToValueAtTime(lautstaerke, zeit + 0.012);
        huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(Math.min(9000, frequenz * 6), zeit);
        filter.frequency.exponentialRampToValueAtTime(Math.max(400, frequenz * 1.5), zeit + dauer);

        [["triangle", 1, 1], ["sine", 2, 0.35]].forEach(([typ, faktor, anteil]) => {
            const osz = ctx.createOscillator();
            osz.type = typ;
            osz.frequency.value = frequenz * faktor;
            const g = ctx.createGain();
            g.gain.value = anteil;
            osz.connect(g);
            g.connect(filter);
            osz.start(zeit);
            osz.stop(zeit + dauer + 0.05);
        });
        filter.connect(huelle);
        this.verbinde(huelle, bus, hall, echo);
    },

    // Glocke / Spieluhr: Sinus mit nicht-harmonischem Oberton, langer Nachklang
    glocke(zeit, frequenz, dauer, lautstaerke, bus, hall = 0.5, echo = 0.3) {
        const ctx = this.ctx;
        const huelle = ctx.createGain();
        huelle.gain.setValueAtTime(0.0001, zeit);
        huelle.gain.exponentialRampToValueAtTime(lautstaerke, zeit + 0.005);
        huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer * 1.6);
        [[1, 1], [2.76, 0.25], [5.4, 0.08]].forEach(([faktor, anteil]) => {
            const osz = ctx.createOscillator();
            osz.type = "sine";
            osz.frequency.value = frequenz * faktor;
            const g = ctx.createGain();
            g.gain.value = anteil;
            osz.connect(g);
            g.connect(huelle);
            osz.start(zeit);
            osz.stop(zeit + dauer * 1.6 + 0.05);
        });
        this.verbinde(huelle, bus, hall, echo);
    },

    // Flaeche: zwei leicht verstimmte Saegezaehne, stark gefiltert, langsam ein- und ausblendend
    flaeche(zeit, toene, dauer, lautstaerke) {
        const ctx = this.ctx;
        const huelle = ctx.createGain();
        huelle.gain.setValueAtTime(0.0001, zeit);
        huelle.gain.exponentialRampToValueAtTime(lautstaerke, zeit + dauer * 0.3);
        huelle.gain.setValueAtTime(lautstaerke, zeit + dauer * 0.7);
        huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer + 0.4);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;
        filter.connect(huelle);
        toene.forEach(note => {
            [-6, 6].forEach(cent => {
                const osz = ctx.createOscillator();
                osz.type = "sawtooth";
                osz.frequency.value = midiZuFrequenz(note);
                osz.detune.value = cent;
                osz.connect(filter);
                osz.start(zeit);
                osz.stop(zeit + dauer + 0.5);
            });
        });
        this.verbinde(huelle, this.musikBus, 0.6, 0);
    },

    bass(zeit, note, dauer, lautstaerke) {
        const ctx = this.ctx;
        const huelle = ctx.createGain();
        huelle.gain.setValueAtTime(0.0001, zeit);
        huelle.gain.exponentialRampToValueAtTime(lautstaerke, zeit + 0.02);
        huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);
        [["triangle", 1], ["sine", 0.5]].forEach(([typ, faktor]) => {
            const osz = ctx.createOscillator();
            osz.type = typ;
            osz.frequency.value = midiZuFrequenz(note) * 2 * faktor;
            osz.connect(huelle);
            osz.start(zeit);
            osz.stop(zeit + dauer + 0.05);
        });
        this.verbinde(huelle, this.musikBus, 0.1, 0);
    },

    kick(zeit, lautstaerke, bus = this.musikBus) {
        const ctx = this.ctx;
        const osz = ctx.createOscillator();
        const huelle = ctx.createGain();
        osz.frequency.setValueAtTime(120, zeit);
        osz.frequency.exponentialRampToValueAtTime(45, zeit + 0.14);
        huelle.gain.setValueAtTime(lautstaerke, zeit);
        huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + 0.18);
        osz.connect(huelle);
        osz.start(zeit);
        osz.stop(zeit + 0.2);
        this.verbinde(huelle, bus, 0, 0);
    },

    rauschStoss(zeit, dauer, lautstaerke, filterFrequenz, bus, hall = 0.1, typ = "highpass") {
        const ctx = this.ctx;
        const quelle = ctx.createBufferSource();
        quelle.buffer = this.rauschen;
        const filter = ctx.createBiquadFilter();
        filter.type = typ;
        filter.frequency.value = filterFrequenz;
        const huelle = ctx.createGain();
        huelle.gain.setValueAtTime(lautstaerke, zeit);
        huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);
        quelle.connect(filter);
        filter.connect(huelle);
        quelle.start(zeit, Math.random() * 0.5);
        quelle.stop(zeit + dauer + 0.02);
        this.verbinde(huelle, bus, hall, 0);
    },

    // Kurzer Ton mit Tonhoehen-Verlauf (fuer Plopp-Geraeusche)
    plopp(zeit, von, bis, dauer, lautstaerke, typ = "sine") {
        const ctx = this.ctx;
        const osz = ctx.createOscillator();
        osz.type = typ;
        osz.frequency.setValueAtTime(von, zeit);
        osz.frequency.exponentialRampToValueAtTime(bis, zeit + dauer);
        const huelle = ctx.createGain();
        huelle.gain.setValueAtTime(0.0001, zeit);
        huelle.gain.exponentialRampToValueAtTime(lautstaerke, zeit + 0.008);
        huelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);
        osz.connect(huelle);
        osz.start(zeit);
        osz.stop(zeit + dauer + 0.02);
        this.verbinde(huelle, this.sfxBus, 0.15, 0);
    },

    // Arpeggio aus MIDI-Noten mit festem Abstand
    arpeggio(noten, abstand, dauer, lautstaerke, hall = 0.35, echo = 0) {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        noten.forEach((note, i) => this.zupfen(jetzt + i * abstand, midiZuFrequenz(note), dauer, lautstaerke, this.sfxBus, hall, echo));
    },

    glockenspiel(noten, abstand, dauer, lautstaerke) {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        noten.forEach((note, i) => this.glocke(jetzt + i * abstand, midiZuFrequenz(note), dauer, lautstaerke, this.sfxBus, 0.5, 0.2));
    },

    bereit() {
        return this.ctx && einstellungen.sfx > 0;
    },

    // ---------- Soundeffekte ----------
    klick(komboZaehler) {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        const note = KLICK_TONLEITER[Math.min(KLICK_TONLEITER.length - 1, Math.floor(komboZaehler / 6))];
        this.zupfen(jetzt, midiZuFrequenz(note), 0.12, 0.12, this.sfxBus, 0.12);
        this.rauschStoss(jetzt, 0.025, 0.05, 3000, this.sfxBus, 0);
    },
    samen() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        this.plopp(jetzt, 180, 90, 0.12, 0.35);
        this.rauschStoss(jetzt, 0.06, 0.06, 800, this.sfxBus, 0.05);
    },
    // Jede Pflanze hat ihren eigenen Ernte-Ton (je wertvoller, desto hoeher und heller)
    ernte(pflanzenIndex = 0) {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        const i = Math.max(0, Math.min(ERNTE_TONLEITER.length - 1, pflanzenIndex));
        this.plopp(jetzt, 260 + i * 25, 620 + i * 60, 0.09, 0.25);
        this.zupfen(jetzt + 0.05, midiZuFrequenz(ERNTE_TONLEITER[i]), 0.3, 0.11, this.sfxBus, 0.3);
        if (i >= 8) this.glocke(jetzt + 0.1, midiZuFrequenz(ERNTE_TONLEITER[i] + 7), 0.4, 0.05, this.sfxBus, 0.4, 0.1);
    },
    muenze(raritaet) {
        const ketten = [[88, 95], [88, 93, 100], [86, 90, 93, 98], [84, 88, 91, 96, 100], [84, 88, 91, 96, 100, 103]];
        this.arpeggio(ketten[raritaet] || ketten[0], 0.05, 0.35, 0.09, 0.3);
    },
    xp() { this.glockenspiel([91, 98], 0.06, 0.35, 0.07); },
    jackpot() {
        if (!this.bereit()) return;
        this.arpeggio([72, 76, 79, 84, 88, 91, 96], 0.07, 1.2, 0.1, 0.5, 0.4);
        const jetzt = this.ctx.currentTime;
        this.rauschStoss(jetzt + 0.45, 0.8, 0.05, 6000, this.sfxBus, 0.6);
    },
    kaufen() { this.arpeggio([79, 84], 0.07, 0.3, 0.1, 0.25); },
    fehler() {
        if (!this.bereit()) return;
        this.plopp(this.ctx.currentTime, 220, 150, 0.2, 0.15, "triangle");
    },
    feierabend() { this.arpeggio([77, 72, 69, 65], 0.18, 1.4, 0.1, 0.6, 0.3); },
    tagStart() { this.arpeggio([65, 69, 72, 77], 0.1, 0.6, 0.1, 0.4); },
    rechnung() { this.arpeggio([84, 79, 88], 0.09, 0.5, 0.1, 0.3); },
    stern() { this.glockenspiel([91, 95, 98, 103, 107], 0.05, 0.8, 0.07); },
    segen() { this.arpeggio([65, 69, 72, 77, 81, 84], 0.08, 1.2, 0.09, 0.6, 0.3); },
    erfolg() { this.glockenspiel([79, 83, 86, 91], 0.08, 0.7, 0.09); },
    gluehwuermchen() { this.glockenspiel([96, 100, 103], 0.04, 0.5, 0.06); },
    banner() { this.glockenspiel([84, 91], 0.1, 0.6, 0.06); },
    // tonhoehe: 1 = normale Katze, hoeher = Fuchs/Katzenmaedchen, tiefer = Teufelskatze
    miau(tonhoehe = 1) {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        const hoehe = (0.9 + Math.random() * 0.25) * tonhoehe;
        const ctx = this.ctx;
        // Miau: Tonhoehe steigt und faellt, ein Bandpass macht den "Mund" auf und zu
        const osz = ctx.createOscillator();
        osz.type = "sawtooth";
        osz.frequency.setValueAtTime(520 * hoehe, jetzt);
        osz.frequency.linearRampToValueAtTime(760 * hoehe, jetzt + 0.12);
        osz.frequency.linearRampToValueAtTime(430 * hoehe, jetzt + 0.42);
        const mund = ctx.createBiquadFilter();
        mund.type = "bandpass";
        mund.Q.value = 3;
        mund.frequency.setValueAtTime(900, jetzt);
        mund.frequency.linearRampToValueAtTime(2200, jetzt + 0.14);
        mund.frequency.linearRampToValueAtTime(800, jetzt + 0.42);
        const huelle = ctx.createGain();
        huelle.gain.setValueAtTime(0.0001, jetzt);
        huelle.gain.exponentialRampToValueAtTime(0.35, jetzt + 0.05);
        huelle.gain.setValueAtTime(0.3, jetzt + 0.3);
        huelle.gain.exponentialRampToValueAtTime(0.0001, jetzt + 0.45);
        osz.connect(mund);
        mund.connect(huelle);
        osz.start(jetzt);
        osz.stop(jetzt + 0.5);
        this.verbinde(huelle, this.sfxBus, 0.2, 0);
    },
    // Hund: kurzes "Wuff" (Rauschen und tiefer Ton mit schnellem Abfall)
    wuff(tonhoehe = 1) {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        const h = (0.95 + Math.random() * 0.15) * tonhoehe;
        [0, 0.18].forEach(versatz => {
            this.plopp(jetzt + versatz, 380 * h, 170 * h, 0.13, 0.3, "sawtooth");
            this.rauschStoss(jetzt + versatz, 0.07, 0.08, 900, this.sfxBus, 0.05, "bandpass");
        });
    },
    // Mantarochen/Axolotl/Pinguin: weiches, blubberndes Glucksen
    blubb() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        const hoehe = 0.9 + Math.random() * 0.2;
        this.plopp(jetzt, 260 * hoehe, 520 * hoehe, 0.12, 0.3);
        this.plopp(jetzt + 0.1, 330 * hoehe, 700 * hoehe, 0.1, 0.25);
        this.plopp(jetzt + 0.19, 420 * hoehe, 900 * hoehe, 0.09, 0.2);
    },
    // Leises Schnurren: tiefes Brummen, das schnell pulsiert
    schnurren() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        for (let i = 0; i < 10; i++) this.rauschStoss(jetzt + i * 0.07, 0.06, 0.07, 260, this.sfxBus, 0.05, "lowpass");
    },
    fressen() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        for (let i = 0; i < 4; i++) this.rauschStoss(jetzt + i * 0.13, 0.05, 0.12, 1200, this.sfxBus, 0.05, "bandpass");
        this.arpeggio([84, 88], 0.08, 0.3, 0.06, 0.3);
    },
    ball() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        [0, 0.28, 0.48, 0.62].forEach((t, i) => this.plopp(jetzt + t, 520 - i * 40, 240, 0.12, 0.2 - i * 0.03));
    },
    trick() { this.arpeggio([72, 76, 79, 84], 0.05, 0.4, 0.08, 0.3); },
    geschenk() { this.arpeggio([84, 88, 91, 96, 91, 96], 0.06, 0.5, 0.09, 0.45, 0.2); },
    reset() { this.arpeggio([77, 72, 67, 60], 0.12, 0.8, 0.1, 0.5); },

    // Kraehe: heiseres "Kraah" (Saegezahn durch Bandpass)
    kraehe() {
        if (!this.bereit()) return;
        const ctx = this.ctx;
        const jetzt = ctx.currentTime;
        [0, 0.28].forEach(versatz => {
            const t = jetzt + versatz;
            const osz = ctx.createOscillator();
            osz.type = "sawtooth";
            osz.frequency.setValueAtTime(640, t);
            osz.frequency.linearRampToValueAtTime(470, t + 0.22);
            const filter = ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = 1300;
            filter.Q.value = 2;
            const huelle = ctx.createGain();
            huelle.gain.setValueAtTime(0.0001, t);
            huelle.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
            huelle.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
            osz.connect(filter);
            filter.connect(huelle);
            osz.start(t);
            osz.stop(t + 0.26);
            this.verbinde(huelle, this.sfxBus, 0.2, 0);
        });
    },
    fluegelschlag() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        for (let i = 0; i < 5; i++) this.rauschStoss(jetzt + i * 0.07, 0.05, 0.1, 500, this.sfxBus, 0.05, "lowpass");
    },
    // Gewitter: grollendes, tiefes Rauschen
    donner() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        this.rauschStoss(jetzt, 0.12, 0.35, 2000, this.sfxBus, 0.2, "lowpass");
        this.rauschStoss(jetzt + 0.08, 2.2, 0.3, 180, this.sfxBus, 0.6, "lowpass");
        this.plopp(jetzt, 70, 40, 1.6, 0.25, "triangle");
    },
    // Regen: leises, gleichmaessiges Rauschen im Hintergrund (an/aus)
    regen(an) {
        if (!this.ctx) return;
        if (an && !this.regenQuelle) {
            const ctx = this.ctx;
            const quelle = ctx.createBufferSource();
            quelle.buffer = this.rauschen;
            quelle.loop = true;
            const filter = ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.value = 2600;
            filter.Q.value = 0.6;
            const g = ctx.createGain();
            g.gain.value = 0.0001;
            g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 1.5);
            quelle.connect(filter);
            filter.connect(g);
            g.connect(this.sfxBus);
            quelle.start();
            this.regenQuelle = { quelle, g };
        } else if (!an && this.regenQuelle) {
            const { quelle, g } = this.regenQuelle;
            g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1);
            quelle.stop(this.ctx.currentTime + 1.1);
            this.regenQuelle = null;
        }
    },
    goldregen() { this.glockenspiel([84, 88, 91, 96, 100, 103, 108], 0.07, 0.8, 0.07); },
    blitzEinschlag() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        this.rauschStoss(jetzt, 0.3, 0.3, 3000, this.sfxBus, 0.3);
        this.arpeggio([96, 91], 0.03, 0.3, 0.07, 0.2);
    },
    haendler() { this.arpeggio([72, 79, 76, 84, 83, 79], 0.09, 0.5, 0.08, 0.35); },
    werkzeug() { this.arpeggio([67, 74, 79, 86], 0.06, 0.5, 0.09, 0.3); },
    boss() {
        if (!this.bereit()) return;
        this.arpeggio([60, 63, 66, 69], 0.14, 0.8, 0.09, 0.5);
        this.kick(this.ctx.currentTime, 0.4, this.sfxBus);
    },
    muenzwurf() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        for (let i = 0; i < 8; i++) this.glocke(jetzt + i * 0.09, midiZuFrequenz(96 + (i % 2) * 3), 0.1, 0.03, this.sfxBus, 0.2, 0);
    },
    rubbeln() {
        if (!this.bereit()) return;
        this.rauschStoss(this.ctx.currentTime, 0.12, 0.09, 2500, this.sfxBus, 0.05);
    },
    gackern() {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        [0, 0.09, 0.18, 0.36].forEach((t, i) => this.plopp(jetzt + t, 900 + (i % 2) * 150, 600, 0.07, 0.12, "square"));
    },
    plinkoNagel(i) {
        if (!this.bereit()) return;
        this.glocke(this.ctx.currentTime, midiZuFrequenz(84 + (i % 5) * 2), 0.12, 0.04, this.sfxBus, 0.2, 0);
    },
    kapselWackeln() {
        if (!this.bereit()) return;
        this.plopp(this.ctx.currentTime, 300, 360, 0.08, 0.12, "triangle");
    },
    // Kapsel geht auf: je seltener, desto groesser der Klang
    kapselAuf(raritaet) {
        if (!this.bereit()) return;
        const jetzt = this.ctx.currentTime;
        this.plopp(jetzt, 200, 900, 0.1, 0.3);
        const ketten = [[84, 88], [84, 88, 91], [84, 88, 91, 96], [79, 84, 88, 91, 96], [72, 79, 84, 88, 91, 96, 100], [72, 76, 79, 84, 88, 91, 96, 100, 103, 108]];
        const kette = ketten[raritaet] || ketten[0];
        kette.forEach((note, i) => this.glocke(jetzt + 0.1 + i * 0.07, midiZuFrequenz(note), 0.7, 0.08, this.sfxBus, 0.6, 0.3));
        if (raritaet >= 4) this.rauschStoss(jetzt + 0.4, 1.2, 0.05, 6000, this.sfxBus, 0.7);
    },

    // ---------- Hintergrundmusik ----------
    starteMusik() {
        this.naechsterTaktZeit = this.ctx.currentTime + 0.3;
        this.taktNummer = 0;
        setInterval(() => this.planeMusik(), 100);
    },

    // Wechselt zum Lied, sobald der aktuelle Takt vorbei ist
    waehleLied(id) {
        if (LIEDER[id]) this.naechstesLiedId = id;
    },

    // Schnellere Musik bei hoher Kombo (1 = normal)
    setzeTempoFaktor(faktor) {
        this.tempoFaktor = faktor;
    },

    planeMusik() {
        if (!this.ctx) return;
        while (this.naechsterTaktZeit < this.ctx.currentTime + 0.6) {
            if (this.naechstesLiedId !== this.liedId) {
                this.liedId = this.naechstesLiedId;
                this.taktNummer = 0;
            }
            const lied = LIEDER[this.liedId];
            const takte = liedTakte(lied);
            const achtel = 60 / (lied.tempo * this.tempoFaktor) / 2;
            if (einstellungen.musik > 0) this.spieleTakt(lied, takte[this.taktNummer % takte.length], this.naechsterTaktZeit, achtel);
            this.naechsterTaktZeit += achtel * lied.taktAchtel;
            this.taktNummer += 1;
        }
    },

    spieleTakt(lied, [akkordName, melodie], start, achtel) {
        const akkord = lied.akkorde[akkordName];
        const bus = this.musikBus;
        const n = lied.taktAchtel;
        // Swing: jede zweite Achtel kommt etwas spaeter
        const zeitVon = i => start + achtel * i + (i % 2 === 1 ? achtel * lied.swing : 0);

        if (lied.flaeche > 0) this.flaeche(start, akkord.toene, achtel * n, lied.flaeche);

        // Bass
        switch (lied.bass) {
            case "walking":
                [0, 4, 7, 9].forEach((stufe, i) => this.bass(zeitVon(i * 2), akkord.bass + stufe, achtel * 1.8, 0.26));
                break;
            case "oompah":
                this.bass(zeitVon(0), akkord.bass, achtel * 1.5, 0.32);
                this.bass(zeitVon(4), akkord.bass + 7, achtel * 1.5, 0.26);
                break;
            case "walzer":
                this.bass(zeitVon(0), akkord.bass, achtel * 2, 0.3);
                break;
            case "lang":
                this.bass(zeitVon(0), akkord.bass, achtel * n, 0.26);
                break;
            default:
                this.bass(zeitVon(0), akkord.bass, achtel * 3, 0.32);
                this.bass(zeitVon(4), akkord.bass + 7, achtel * 2, 0.24);
                this.bass(zeitVon(6), akkord.bass, achtel * 2, 0.24);
        }

        // Schlagzeug
        switch (lied.schlagzeug) {
            case "sanft":
                this.kick(zeitVon(0), 0.28);
                this.kick(zeitVon(4), 0.2);
                [1, 3, 5, 7].forEach(i => this.rauschStoss(zeitVon(i), 0.04, i === 3 || i === 7 ? 0.035 : 0.02, 7000, bus, 0));
                break;
            case "hell":
                [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => this.rauschStoss(zeitVon(i), 0.03, i % 2 ? 0.018 : 0.028, 8000, bus, 0));
                this.kick(zeitVon(0), 0.16);
                break;
            case "swing":
                this.kick(zeitVon(0), 0.26);
                this.kick(zeitVon(4), 0.2);
                [2, 6].forEach(i => this.rauschStoss(zeitVon(i), 0.09, 0.07, 1800, bus, 0.1));
                [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => this.rauschStoss(zeitVon(i), 0.03, 0.02, 8000, bus, 0));
                break;
            case "oompah":
                this.kick(zeitVon(0), 0.3);
                this.kick(zeitVon(4), 0.24);
                [2, 6].forEach(i => this.rauschStoss(zeitVon(i), 0.07, 0.06, 2500, bus, 0.05));
                break;
            case "schlitten":
                for (let i = 0; i < n; i++) this.rauschStoss(zeitVon(i), 0.08, i % 2 ? 0.025 : 0.04, 9000, bus, 0.2);
                break;
            default:
                break;
        }

        // Begleitung
        switch (lied.begleitung) {
            case "zupfen":
                [0, 2, 4, 6].forEach((i, k) => {
                    const note = akkord.toene[k % akkord.toene.length] + 12;
                    this.zupfen(zeitVon(i), midiZuFrequenz(note), achtel * 1.5, 0.045, bus, 0.35);
                });
                break;
            case "arpeggio":
                for (let i = 0; i < n; i++) {
                    const note = akkord.toene[i % akkord.toene.length] + 12;
                    this.zupfen(zeitVon(i), midiZuFrequenz(note), achtel * 1.4, 0.032, bus, 0.4);
                }
                break;
            case "stabs":
                [2, 6].forEach(i => akkord.toene.forEach(note => this.zupfen(zeitVon(i), midiZuFrequenz(note + 12), achtel * 0.9, 0.028, bus, 0.2)));
                break;
            case "walzer":
                [2, 4].forEach(i => akkord.toene.forEach(note => this.zupfen(zeitVon(i), midiZuFrequenz(note + 12), achtel * 1.2, 0.026, bus, 0.35)));
                break;
            default:
                break;
        }

        // Melodie
        let position = 0;
        melodie.forEach(([note, laenge]) => {
            if (note) {
                const zeit = zeitVon(position);
                if (lied.melodie === "glocke") this.glocke(zeit, midiZuFrequenz(note), achtel * laenge * 1.2, 0.1, bus, 0.5, 0.35);
                else this.zupfen(zeit, midiZuFrequenz(note), achtel * laenge * 1.3, 0.13, bus, 0.45, 0.35);
            }
            position += laenge;
        });
    }
};

// Ton startet beim allerersten Klick irgendwo auf der Seite
document.addEventListener("pointerdown", () => Klang.start(), { once: true });
