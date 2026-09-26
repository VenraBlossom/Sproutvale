"use strict";

// ============================================================
// SPRITES: Platzhalter-Pixelart, direkt im Code gezeichnet.
//
// Austauschen gegen echte Grafiken: PNG in einen Ordner "assets" legen
// und hier in SPRITE_DATEIEN eintragen, z.B.  weizen: "assets/weizen.png"
// Dann wird die Datei statt der gezeichneten Version benutzt.
// ============================================================

const SPRITE_DATEIEN = {
    // weizen: "assets/weizen.png",
};

// Jeder Buchstabe in den Pixel-Zeilen steht fuer eine Farbe, "." ist durchsichtig
const SPRITE_FARBEN = {
    b: "#5b3a22", B: "#7a5230", c: "#8f6139",
    g: "#3f8a32", G: "#6cc24a", d: "#2f6b24",
    h: "#7cbf4d", H: "#8fcf5c", j: "#6aa944", J: "#a3dc6f",
    y: "#d9a82a", Y: "#f5d547",
    o: "#c9661c", O: "#f08a24",
    r: "#b8232a", R: "#e8434a",
    p: "#9c6b3c", P: "#c9975d",
    s: "#8a6a42",
    e: "#d9b56a", E: "#f3dfa6",
    k: "#4a2f15", K: "#7a5028",
    w: "#fff6d8",
    x: "#1b3f73", q: "#2f6fb8", Q: "#5aa9e6", z: "#cdefff",
    u: "#3d2160", m: "#6b3fa0", M: "#a877e0", v: "#ffe89a",
    a: "#c9a46a", A: "#9c7b48", n: "#7a5a36",
    T: "#8f3326", U: "#c4503f", W: "#dcb27c", V: "#b0804e", D: "#6b3f1d", F: "#9fd8ff",
    L: "#b8483a", l: "#8f3326", 8: "#b5b5bf", 9: "#85858f",
    i: "#1d2a5a", I: "#4a5fc0", N: "#8fa2f0",
    C: "#efe6ff", f: "#cbb2f5", S: "#8d6bd6", t: "#ffd6f0",
    Z: "#d9a82a", 0: "#5c5c66", X: "#1c1b24"
    // Ziffern 1 bis 7 sind fuer die Haustiere reserviert (Farben kommen aus HAUSTIER_SKINS in daten.js)
};

const SPRITE_PIXEL = {
    erde: [
        "BBBcBBBBBBBBcBBB",
        "BBBBBBBcBBBBBBBB",
        "bbbbbbbbbbbbbbbb",
        "BBBBBBBBBBBBBBBB",
        "BcBBBBBBBBcBBBBB",
        "BBBBBBcBBBBBBBBB",
        "bbbbbbbbbbbbbbbb",
        "BBBBBBBBBBBBBBBB",
        "BBBBcBBBBBBBBBcB",
        "BBBBBBBBBcBBBBBB",
        "bbbbbbbbbbbbbbbb",
        "BBBBBBBBBBBBBBBB",
        "BBcBBBBBBBBcBBBB",
        "BBBBBBBcBBBBBBBB",
        "bbbbbbbbbbbbbbbb",
        "BBBBBBBBBBBBBBBB"
    ],
    gras: [
        "hhhhHhhhhhhhhHhh",
        "hjhhhhhhhjhhhhhh",
        "hhhhhhHhhhhhhhjh",
        "hhJhhhhhhhhhhhhh",
        "hhhhhhhhhhhJhhhh",
        "hhhhhjhhhhhhhhhh",
        "Hhhhhhhhhhhhhhhh",
        "hhhhhhhhJhhhhhhH",
        "hhjhhhhhhhhhjhhh",
        "hhhhhhhhhhhhhhhh",
        "hhhhHhhhhhhhhhhh",
        "hhhhhhhhhhJhhhhh",
        "hJhhhhhjhhhhhhhh",
        "hhhhhhhhhhhhhhjh",
        "hhhhhhhhhhhhhhhh",
        "hhhhhhhHhhhhhhhh"
    ],
    samen: [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "......kkkk......",
        ".....kKeEKk.....",
        ".....kKeeKk.....",
        "......kkkk......",
        "................",
        "................"
    ],
    keimling: [
        "................",
        "................",
        "................",
        "................",
        "................",
        ".....GG...GG....",
        "....GggG.GggG...",
        "....gGGgdgGGg...",
        "......ggdgg.....",
        "........d.......",
        "........d.......",
        "........d.......",
        ".......kdk......",
        "......kkkkk.....",
        "................",
        "................"
    ],
    jungpflanze: [
        "................",
        ".......GG.......",
        "......GggG......",
        ".......dd.......",
        "..GGg..dd..gGG..",
        ".GggGg.dd.gGggG.",
        "..gggGgddgGggg..",
        "....ggGddGgg....",
        ".......dd.......",
        "...GGg.dd.gGG...",
        "..GggGgddgGggG..",
        "...gggGddGggg...",
        ".....ggddgg.....",
        ".......dd.......",
        "......kkkk......",
        "................"
    ],
    weizen: [
        "...Y....Y....Y..",
        "..YyY..YyY..YyY.",
        "..yYy..yYy..yYy.",
        "..YyY..YyY..YyY.",
        "..yYy..yYy..yYy.",
        "..YyY..YyY..YyY.",
        "...y....y....y..",
        "...y....y...y...",
        "....y...y..y....",
        "....y...y..y....",
        ".....y..y.y.....",
        "......y.yy......",
        ".......yy.......",
        "......gyyg......",
        ".....g.yy.g.....",
        "......kkkk......"
    ],
    karotte: [
        "................",
        "...G....G....G..",
        "...Gg..gG..gG...",
        "....gG.Gg.Gg....",
        ".....gGGGgG.....",
        "......dGGd......",
        ".....oOOOOo.....",
        "....oOYOOOOo....",
        "....oOYOOoOo....",
        "....oOOOOOOo....",
        ".....oOOoOo.....",
        ".....oOOOOo.....",
        "......oOoO......",
        "......oOOo......",
        ".......oO.......",
        ".......o........"
    ],
    kartoffel: [
        "................",
        ".....w....w.....",
        "....wYw..wYw....",
        ".....w.GG.w.....",
        "...GGgGggGgGG...",
        "..GggGgggGggGG..",
        "..gGgggGgggGgg..",
        "...ggGgggGggg...",
        ".....ggddgg.....",
        ".......dd.......",
        "....pPPp.pPPp...",
        "...pPPPPpPPPPp..",
        "...pPwPPppPPwp..",
        "....pppp..ppp...",
        "................",
        "................"
    ],
    erdbeere: [
        "................",
        "...GG......GG...",
        "..GggG....GggG..",
        "..gGgGG..GGgGg..",
        "...ggGgddgGgg...",
        "....G.gddg.G....",
        "...rRr.dd.rRr...",
        "..rRwRr..rRwRr..",
        "..rRRRr..rRRRr..",
        "..rRRwr..rwRRr..",
        "...rRr....rRr...",
        "....r......r....",
        "......rRr.......",
        ".....rRwRr......",
        "......rRr.......",
        ".......r........"
    ],
    tomate: [
        ".......s........",
        ".....GGsGG......",
        "....GggsggG.....",
        "...rRr.s.rRr....",
        "..rRwRrsrRwRr...",
        "..rRRRrsrRRRr...",
        "...rrr.s.rrr....",
        "....GG.sGG......",
        "...GggGsggG.....",
        "......rRRr......",
        ".....rRwRRr.....",
        ".....rRRRRr.....",
        "......rrrr......",
        ".......s........",
        ".......s........",
        "......kkk......."
    ],
    mais: [
        "......e.e.......",
        ".......ee.......",
        "......gYYg......",
        ".....gYyYyg.....",
        ".....gyYyYg.....",
        "....GgYyYyGg....",
        "....GgyYyYgG....",
        "...GgGYyYygGg...",
        "...gGgyYyYGgG...",
        "..Gg.gYyYyg.gG..",
        "..g..GgyYgG..g..",
        ".....dGgYgGd....",
        "......dGgGd.....",
        ".......dgd......",
        "........d.......",
        "................"
    ],
    kuerbis: [
        "................",
        "................",
        ".......dd.......",
        "......dGGg......",
        ".....G.dd.gG....",
        ".......dd.......",
        "....oOoOOoOo....",
        "...oOOoOOoOOo...",
        "..oOOOoOOoOOOo..",
        "..oOOOoOOoOOOo..",
        "..oOYOoOOoOOOo..",
        "..oOOOoOOoOOOo..",
        "...oOOoOOoOOo...",
        "....oooooooo....",
        "................",
        "................"
    ],
    sonnenblume: [
        ".....Y.YY.Y.....",
        "...YYyYYYYyYY...",
        "..YyYYkkkkYYyY..",
        ".YYYkkKKKKkkYYY.",
        "..YkkKkKKkKkkY..",
        ".YYkKKKkkKKKkYY.",
        "..YkkKkKKkKkkY..",
        ".YYYkkKKKKkkYYY.",
        "..YyYYkkkkYYyY..",
        "...YYyYYYYyYY...",
        ".....Y.dd.Y.....",
        ".......dd.......",
        "..GGg..dd.gGG...",
        "..GggGgddGggG...",
        ".......dd.......",
        "......kkkk......"
    ],
    // Goldmuenze. "Z" ist das Zeichen in der Mitte, die Raritaeten faerben nur dieses Zeichen um.
    blaubeere: [
        "................",
        "......GGG.......",
        "....GGgGGgG.....",
        "...GgxqxGGgG....",
        "..GGxQqxgGxqx...",
        "..GgGxxGGgxQqx..",
        "..GxqxGgGGgxx...",
        ".GxQqxgGxqxGgG..",
        ".GgxxGGgxQqxGG..",
        "..GGgGxqxxxGgG..",
        "...GgxQqxGGgG...",
        "....GGxxgGGG....",
        ".....GGgdGG.....",
        ".......dd.......",
        "......kkkk......",
        "................"
    ],
    melone: [
        "................",
        ".......kk.......",
        "......k.GG......",
        ".......GGg......",
        ".....dddddd.....",
        "...ddGGdggdgd...",
        "..dGdJGdggdggd..",
        "..dGdJGdggdggd..",
        ".dGGdGGdggdggdd.",
        ".dGGdGGdggdggdd.",
        ".dggdggdggdggdd.",
        "..dgdggdggdggd..",
        "..dgdggdggdggd..",
        "...ddggdggdgd...",
        ".....dddddd.....",
        "................"
    ],
    reis: [
        "................",
        "...e.....e......",
        "..eEe...eEe..e..",
        "..eEe.e.eEe.eEe.",
        "...e.eEe.e..eEe.",
        "...g.eEe.g...e..",
        "...g..e..g...g..",
        "...g..g..g..g...",
        "....g.g.g..g....",
        "....g.g.g.g.....",
        ".....gggg.g.....",
        "......ggggg.....",
        ".......gg.......",
        "..QqqqqQQqqqQ...",
        "..qQQqqqqQQqq...",
        "................"
    ],
    kaffee: [
        "................",
        "......GGd.......",
        ".....GggdGG.....",
        "...GGg.dGggG....",
        "..GggRrdRrgG....",
        "...GgrRdrRG.....",
        "......dd........",
        "...GG.dRr.GG....",
        "..GggGdrRGggG...",
        "...GgRrd.GgG....",
        "....GrRd........",
        ".....RrdRr......",
        "......dd........",
        "......dd........",
        ".....kkkk.......",
        "................"
    ],
    riesenpilz: [
        "................",
        ".....rrrrrr.....",
        "...rrRRwRRRrr...",
        "..rRRwwRRRwRRr..",
        ".rRRRwRRRRwwRRr.",
        ".rRwRRRRwRRRRRr.",
        "rRwwRRRRwwRRwRRr",
        "rRRRRwRRRRRRwwRr",
        "rrrrrrrrrrrrrrrr",
        "....eEEEEEEe....",
        "....eEEEEEEe....",
        "....eEEwEEEe....",
        "....eEEEEEEe....",
        "...eEEEEEEEEe...",
        "..gGeeeeeeeeGg..",
        "................"
    ],
    eisblume: [
        "................",
        ".......q........",
        "......qFq.......",
        "...q..qFq..q....",
        "...qF.qFq.Fq....",
        "....qFqwqFq.....",
        ".qqqqFwwwFqqqq..",
        "..FFFwwzwwFFF...",
        ".qqqqFwwwFqqqq..",
        "....qFqwqFq.....",
        "...qF.qFq.Fq....",
        "...q..qFq..q....",
        "......qdq.......",
        ".......d........",
        "......kkk.......",
        "................"
    ],
    mondlilie: [
        "................",
        "......SfS.......",
        ".....SfCfS......",
        "..S..SfCfS..S...",
        ".SfS.SfCfS.SfS..",
        ".SCfSSfCfSSfCS..",
        "..SCfCfvfCfCS...",
        "...SCCvYvCCS....",
        "....SSCvCSS.....",
        "......SdS.......",
        "...G...d...G....",
        "..GgG..d..GgG...",
        "...GgG.d.GgG....",
        ".....Ggdg.......",
        "......kkk.......",
        "................"
    ],
    muenze: [
        "....kkkk....",
        "..kkYYYYkk..",
        ".kYYwYYYYyk.",
        ".kYwYYYYYyk.",
        "kYYYYZZYYYyk",
        "kYYYZZZZYYyk",
        "kYYYZZZZYYyk",
        "kYYYYZZYYYyk",
        ".kYYYYYYYyk.",
        ".kyYYYYYyyk.",
        "..kkyyyykk..",
        "....kkkk...."
    ],
    // Muenzwurf: Kopf-Seite (Gesicht) und Zahl-Seite (eine 1)
    muenze_kopf: [
        "....kkkk....",
        "..kkYYYYkk..",
        ".kYwYYYYYyk.",
        ".kYYYYYYYyk.",
        "kYYYyYYyYYyk",
        "kYYYyYYyYYyk",
        "kYYYYYYYYYyk",
        "kYYyYYYYyYyk",
        ".kYYyyyyYyk.",
        ".kyYYYYYyyk.",
        "..kkyyyykk..",
        "....kkkk...."
    ],
    muenze_zahl: [
        "....kkkk....",
        "..kkYYYYkk..",
        ".kYwYYYYYyk.",
        ".kYYYyyYYyk.",
        "kYYYyyyYYYyk",
        "kYYYYyyYYYyk",
        "kYYYYyyYYYyk",
        "kYYYYyyYYYyk",
        ".kYYyyyyYyk.",
        ".kyYYYYYyyk.",
        "..kkyyyykk..",
        "....kkkk...."
    ],
    // Jackpot-Muenze mit funkelndem Stern
    muenze_stern: [
        "....kkkk....",
        "..kkYYYYkk..",
        ".kYYYwwYYyk.",
        ".kYYYwwYYyk.",
        "kYYYwwwwYYyk",
        "kwwwwwwwwwwk",
        "kwwwwwwwwwwk",
        "kYYYwwwwYYyk",
        ".kYYYwwYYyk.",
        ".kyYYwwYyyk.",
        "..kkyyyykk..",
        "....kkkk...."
    ],
    // Sternensamen: ein Samenkorn aus Nachthimmel mit kleinen Sternen darin und einem Funkeln
    sternensamen: [
        "........v...",
        ".....i.vwv..",
        "....iNi.v...",
        "...iNNIi....",
        "..iNwIIIi...",
        "..iNIIvIi...",
        ".iNIIIIIIi..",
        ".iIIIIIIIi..",
        ".iIvIIIwIi..",
        ".iIIIIIIIi..",
        "..iIIIIIi...",
        "...iiiii...."
    ],
    // mondbluete wird weiter unten als Kirschbluete berechnet
    // ---------- Icons fuer Knoepfe und Anzeigen ----------
    beutel: [
        "...kAAAAk...",
        "....kaak....",
        "...kkkkkk...",
        "..kaaaaaak..",
        ".kaaaYYaaak.",
        "kaaaYyyYaaak",
        "kaaaYyyYaaak",
        "kaaaaYYaaaak",
        "kAaaaaaaaaAk",
        ".kAAAAAAAAk.",
        "..kkkkkkkk.."
    ],
    pokal: [
        "..kkkkkkkk..",
        ".kkYwYYYYkk.",
        "kYkYwYYYYkYk",
        "kYkYYYYYYkYk",
        ".kkYYYYYykk.",
        "...kYYYyk...",
        "....kYyk....",
        "....kYyk....",
        "...kkYykk...",
        "..kYYYYYyk..",
        "..kkkkkkkk.."
    ],
    diagramm: [
        "kkkkkkkkkkkk",
        "kEEEEEEEEEEk",
        "kEEEEEEEGGEk",
        "kEEEEEEEGgEk",
        "kEEEEqqEGgEk",
        "kEEEEQqEGgEk",
        "kERrEQqEGgEk",
        "kERrEQqEGgEk",
        "kERrEQqEGgEk",
        "kEkkkkkkkkEk",
        "kEEEEEEEEEEk",
        "kkkkkkkkkkkk"
    ],
    zahnrad: [
        ".....00.....",
        "..0.0880.0..",
        ".0808888080.",
        "..08888880..",
        ".0888008880.",
        "08880..08880",
        "08880..08880",
        ".0888008880.",
        "..08888880..",
        ".0908888090.",
        "..0.0990.0..",
        ".....00....."
    ],
    sternkarte: [
        ".iiiiiiiiii.",
        "iiiiiiiiiwii",
        "iiiiiiiiwvwi",
        "iiiiiiiNiwii",
        "iiwiiNNiiiii",
        "iwvwNiiiiiii",
        "iiwNiiiiiiii",
        "iiiiNiiiiiii",
        "iiiiiNiiiiii",
        "iiiiiiNwiiii",
        "iiiiiiwvwiii",
        ".iiiiiiwiii."
    ],
    kalender: [
        "..k......k..",
        "kkRkkkkkkRkk",
        "kRRRRRRRRRRk",
        "kRRRRRRRRRRk",
        "kwwwwwwwwwwk",
        "kwkwkwkwkwwk",
        "kwwwwwwwwwwk",
        "kwkwkwkwRRwk",
        "kwwwwwwwRRwk",
        "kwkwkwkwwwwk",
        "kwwwwwwwwwwk",
        "kkkkkkkkkkkk"
    ],
    rechnung: [
        ".kkkkkkkk...",
        ".kwwwwwwkk..",
        ".kwnnnnwwwk.",
        ".kwwwwwwwwk.",
        ".kwnnnnnnwk.",
        ".kwwwwwwwwk.",
        ".kwnnnnnwwk.",
        ".kwwwwwwwwk.",
        ".kwwwwwRRwk.",
        ".kwwwwRRRRk.",
        ".kwwwwwRRwk.",
        ".kkkkkkkkkk."
    ],
    blitz: [
        "......kkkk",
        ".....kYYk.",
        "....kYYk..",
        "...kYYk...",
        "..kYYkkkk.",
        ".kYYYYYYk.",
        ".kkkkYYk..",
        "....kYk...",
        "...kYk....",
        "..kYk.....",
        ".kYk......",
        ".kk......."
    ],
    wolke: [
        "......wwww..........",
        "...wwwwwwwww..ww....",
        "..wwwwwwwwwwwwwwww..",
        ".wwwwwwwwwwwwwwwwwww",
        "wwwwwwwwwwwwwwwwwwww",
        ".zzzzzzzzzzzzzzzzzz.",
        "...zzzzz....zzzz...."
    ],
    teich: [
        "......898989898989898.......",
        "...8989QQQQQQQQQQQQQQ9898...",
        ".898QQQQzQQQQGGQQQQQQQQQ898.",
        "89QQQQQQQQQQGGgGQQQzQQQQQQ98",
        "9QQqQQMMQQQQQGGQQQQQQQqQQQQ9",
        "89QQqqQGGQQQQQQQQQzQQqqQQQ98",
        ".898QQqqqQQQQQQQQQQQqqqQQ898",
        "...8989qqqqqqqqqqqqqq9898...",
        "......898989898989898......."
    ],
    busch: [
        "...GGGG...",
        ".GGGgGGGG.",
        "GGgGGGGgGG",
        "GGGGGgGGGg",
        "gGGgGGGGgg",
        ".gggggggg.",
        "..dddddd.."
    ],
    saatsack: [
        "......G..G......",
        ".....GgGGgG.....",
        "......gddg......",
        ".....nKKKKn.....",
        "......aaaa......",
        "....AaaaaaaA....",
        "...AaaAaaaaaA...",
        "..AaaaaaaaAaaA..",
        "..AaaEEEEEEaaA..",
        "..AaaEkEEkEaaA..",
        "..AaaEEkEEEaaA..",
        "..AAaEEEEEEaAA..",
        "..AAAaaaaaaAAA..",
        "...AAAAAAAAAA...",
        ".....k.P.k..P...",
        "................"
    ],
    // Huhn fuer das Huehnerrennen, "C" ist die Gefiederfarbe (wird je Huhn umgefaerbt)
    huhn: [
        "......R...",
        ".....RR...",
        "....kCCCk.",
        "....kCkCkY",
        "k...kCCCkR",
        "kCk.kCCk..",
        "kCCkCCCCk.",
        ".kCCCCCCk.",
        "..kCCCCk..",
        "...kYkY..."
    ],
    // ---------- Deko fuer den Hof ----------
    blumenkuebel: [
        "..R..Y...M..",
        ".RwR.YwY.MwM",
        "..R.G.Y.GM..",
        "..G.G.G.G.G.",
        ".GgGgGgGgGg.",
        "kkkkkkkkkkkk",
        "kPPpPPpPPpPk",
        ".kPPpPPpPPk.",
        ".kPPpPPpPPk.",
        ".kPPpPPpPPk.",
        "..kkkkkkkk.."
    ],
    holzbank: [
        ".kkkkkkkkkkkkkk.",
        ".kPPPPPPPPPPPPk.",
        ".kkkkkkkkkkkkkk.",
        "................",
        ".kkkkkkkkkkkkkk.",
        ".kPPPPPPPPPPPPk.",
        ".kkkkkkkkkkkkkk.",
        "..kk........kk..",
        "..kP........kP..",
        "..kk........kk.."
    ],
    gartenlaterne: [
        "...kk...",
        "..kkkk..",
        ".kvvvvk.",
        ".kvwwvk.",
        ".kvvvvk.",
        "..kkkk..",
        "...kk...",
        "...kk...",
        "...kk...",
        "...kk...",
        "...kk...",
        "...kk...",
        "...kk...",
        "..kkkk..",
        ".kkkkkk."
    ],
    windmuehle: [
        "..k.........k...",
        "...k.......k....",
        "....k.....k.....",
        ".....k...k......",
        "......kUk.......",
        ".....kUUUk......",
        "....k.kUk.k.....",
        "...k.WWWWW.k....",
        "..k..WWWWW..k...",
        ".....WWwWW......",
        ".....WWWWW......",
        "....WWWWWWW.....",
        "....WWDDWWW.....",
        "....WWDDWWW.....",
        "...kkkkkkkkk...."
    ],
    // Legendaere Windmuehle: Turm ohne Fluegel (die Fluegel drehen sich als eigenes Bild, siehe muehlenfluegel)
    muehle: [
        "......TTTT......",
        ".....TUUUUT.....",
        "....TUUUUUUT....",
        "...TTTTTTTTTT...",
        "....kWWWWWWk....",
        "....kWWkkWWk....",
        "....kWWkQkWk....",
        "...kWWWWWWWWk...",
        "...kVWWWWWWVk...",
        "...kWWWWWWWWk...",
        "..kWWWWWWWWWWk..",
        "..kVWWWDDWWWVk..",
        "..kWWWWDDWWWWk..",
        "..kWWWWDDWWWWk..",
        ".kkkkkkkkkkkkkk."
    ],
    // Bienenkorb aus Stroh auf einem kleinen Holzbock
    bienenstock: [
        "....yyyy....",
        "...yYYYYy...",
        "..yYyyyyYy..",
        "..yYYYYYYy..",
        ".yYyyyyyyYy.",
        ".yYYYYYYYYy.",
        ".yYyyyyyyYy.",
        "yYYYYkkYYYYy",
        "yYyyykkyyyYy",
        "yYYYYYYYYYYy",
        ".KKKKKKKKKK.",
        ".K........K."
    ],
    // Vogeltraenke aus Stein mit Wasser
    vogeltraenke: [
        "............",
        "..........kk",
        "8QQQQQQQQkKk",
        "98QQzQQQQQ89",
        ".9888888889.",
        "...988889...",
        "....9889....",
        "....8998....",
        "....8998....",
        "...888888...",
        "..99999999..",
        "............"
    ],
    // Schneemann mit Hut, Karottennase und Schal
    schneemann: [
        "....kkkk....",
        "....kkkk....",
        "...kkkkkk...",
        "....wwww....",
        "...wkwwkw...",
        "...wwOOww...",
        "....wwww....",
        "..RRRRRRRR..",
        "..wwwwRRww..",
        ".wwwwwRRwww.",
        ".wwwwwkwwww.",
        ".wwwwwwwwww.",
        ".wwwwwkwwww.",
        "..wwwwwwww..",
        "...zzzzzz..."
    ],
    // Kraehe auf einem Zaunpfahl: 5 Bilder, nur der Vogel bewegt sich (0 sitzt, 1 kraechzt, 2 flattert, 3 schaut links, 4 nickt)
    kraehe_0: [
        "............",
        "......XXX...",
        ".....XXwXX0.",
        ".....XXXXX00",
        "...XXXXXX...",
        "..XX00XXXX..",
        ".XX0000XXX..",
        "XX.XXXXXXX..",
        "X....XXXX...",
        ".....8.8....",
        "..KKKKKKKK..",
        "..kKKKKKKk..",
        "....KKKK....",
        "....KkKK....",
        "....KKKK....",
        "..gKKKKKKg.."
    ],
    kraehe_1: [
        "............",
        "......XXX...",
        ".....XXwXX00",
        ".....XXXXX..",
        "...XXXXXX0..",
        "..XX00XXXX..",
        ".XX0000XXX..",
        "XX.XXXXXXX..",
        "X....XXXX...",
        ".....8.8....",
        "..KKKKKKKK..",
        "..kKKKKKKk..",
        "....KKKK....",
        "....KkKK....",
        "....KKKK....",
        "..gKKKKKKg.."
    ],
    kraehe_2: [
        "............",
        "......XXX...",
        "..00.XXwXX0.",
        "...00XXXXX00",
        "...XXXXXX...",
        "..XXXXXXXX..",
        ".XXXXXXXXX..",
        "XX.XXXXXXX..",
        "X....XXXX...",
        ".....8.8....",
        "..KKKKKKKK..",
        "..kKKKKKKk..",
        "....KKKK....",
        "....KkKK....",
        "....KKKK....",
        "..gKKKKKKg.."
    ],
    kraehe_3: [
        "............",
        "......XXX...",
        "....0XwXXX..",
        "...00XXXXX..",
        "...XXXXXX...",
        "..XX00XXXX..",
        ".XX0000XXX..",
        "XX.XXXXXXX..",
        "X....XXXX...",
        ".....8.8....",
        "..KKKKKKKK..",
        "..kKKKKKKk..",
        "....KKKK....",
        "....KkKK....",
        "....KKKK....",
        "..gKKKKKKg.."
    ],
    kraehe_4: [
        "............",
        "............",
        "......XXX...",
        ".....XXwXX0.",
        "...XXXXXXX00",
        "..XX00XXXX..",
        ".XX0000XXX..",
        "XX.XXXXXXX..",
        "X....XXXX...",
        ".....8.8....",
        "..KKKKKKKK..",
        "..kKKKKKKk..",
        "....KKKK....",
        "....KkKK....",
        "....KKKK....",
        "..gKKKKKKg.."
    ],
    // Neue Deko: Heuwagen, Briefkasten, Steinlaterne (episch), Gluecksdrache mit 4 Bildern (legendaer)
    heuwagen: [
        "....yYYyY.......",
        "..yYYYyYYYy.....",
        ".yYYyYYYYyYY....",
        ".DDDDDDDDDDDD...",
        ".DVWVWVWVWVWD...",
        ".DDDDDDDDDDDDDDD",
        "..kKKk....kKKk..",
        "..KkkK....KkkK..",
        "..kKKk....kKKk.."
    ],
    briefkasten: [
        "...ww...R",
        "..qwwqq.R",
        ".qQzQQQqR",
        ".qQQQQQqk",
        ".qqqqqqqk",
        ".qQQQQQq.",
        ".qqqqqqq.",
        "....KK...",
        "....KK...",
        "....KK...",
        "....KK...",
        "....KK...",
        "....KK...",
        "...kKKk.."
    ],
    steinlaterne: [
        "....99....",
        "...9889...",
        ".99888899.",
        "9888888889",
        "..999999..",
        "..8vYYv8..",
        "..8YvvY8..",
        "..999999..",
        "...8888...",
        "....88....",
        "....89....",
        "....88....",
        "...8889...",
        "..988889..",
        ".99999999."
    ],
    gluecksdrache_0: [
        ".....yY..yY.......",
        "......yY.yY.......",
        "....OOlllll.......",
        "...OOlRRRRRl......",
        "..OOlRRwXRRRll....",
        "..OlRRRRRRRRRRl...",
        "..OlRRRRRRRRRRRl..",
        "...lRRRrrrRRlll...",
        "...lRRlYYlll.Y....",
        "..OlRRl.Y....Y....",
        "..OlRRRl..........",
        "...lRRRRl...lll...",
        "....lRRRRlllRRRl..",
        "...lRRYYRRRRRRYRl.",
        "..lRRYl.lRRRRYRl..",
        ".yYYYYYYYYYYYYYYy.",
        ".yyYyyYyyYyyYyyYy.",
        "..yyyyyyyyyyyyyy.."
    ],
    gluecksdrache_1: [
        ".....yY..yY.......",
        "......yY.yY.......",
        "....OOlllll.......",
        "...OOlRRRRRl......",
        "..OOlRRllRRRll....",
        "..OlRRRRRRRRRRl...",
        "..OlRRRRRRRRRRRl..",
        "...lRRRrrrRRlll...",
        "...lRRlYYlll.Y....",
        "..OlRRl.Y....Y....",
        "..OlRRRl..........",
        "...lRRRRl...lll...",
        "....lRRRRlllRRRl..",
        "...lRRYYRRRRRRYRl.",
        "..lRRYl.lRRRRYRl..",
        ".yYYYYYYYYYYYYYYy.",
        ".yyYyyYyyYyyYyyYy.",
        "..yyyyyyyyyyyyyy.."
    ],
    gluecksdrache_2: [
        ".....yY..yY.......",
        "......yY.yY.......",
        "....OOlllll.......",
        "...OOlRRRRRl......",
        "..OOlRRwXRRRll....",
        "..OlRRRRRRRRRRl...",
        "..OlRRRRRRRRRRRlO.",
        "...lRRRrrrRRl..vO.",
        "...lRRlYYlll.Y....",
        "..OlRRl.Y....Y....",
        "..OlRRRl..........",
        "...lRRRRl...lll...",
        "....lRRRRlllRRRl..",
        "...lRRYYRRRRRRYRl.",
        "..lRRYl.lRRRRYRl..",
        ".yYYYYYYYYYYYYYYy.",
        ".yyYyyYyyYyyYyyYy.",
        "..yyyyyyyyyyyyyy.."
    ],
    gluecksdrache_3: [
        ".....yY..yY.......",
        "......yY.yY.......",
        "....OOlllll.......",
        "...OOlRRRRRl......",
        "..OOlRRwXRRRll....",
        "..OlRRRRRRRRRRl.O.",
        "..OlRRRRRRRRRRRlYO",
        "...lRRRrrrRRl.vYOO",
        "...lRRlYYlll.YvO..",
        "..OlRRl.Y....Y....",
        "..OlRRRl..........",
        "...lRRRRl...lll...",
        "....lRRRRlllRRRl..",
        "...lRRYYRRRRRRYRl.",
        "..lRRYl.lRRRRYRl..",
        ".yYYYYYYYYYYYYYYy.",
        ".yyYyyYyyYyyYyyYy.",
        "..yyyyyyyyyyyyyy.."
    ],
    // Deko (episch): Schubkarre mit Blumen, Wegweiser, Sonnenschirm
    schubkarre: [
        "...R..Y..t..R...",
        "..gGgGgGgGgGgG..",
        ".VVVVVVVVVVVVVVD",
        ".VWWWWWWWWWWWWVD",
        "..VWWWWWWWWWWV.D",
        "...VVVVVVVVVV...",
        "..kk.......D..D.",
        ".k88k......D..D.",
        ".k88k...........",
        "..kk............"
    ],
    wegweiser: [
        ".....DD.....",
        ".WWWWWWWWV..",
        ".WkkWkWkWWV.",
        ".WWWWWWWWV..",
        ".....DD.....",
        "..VWWWWWWW..",
        ".VWkWkkWkW..",
        "..VWWWWWWW..",
        ".....DD.....",
        ".....DD.....",
        ".....DD.....",
        ".....DD.....",
        ".....DD.....",
        ".....DD.....",
        "....gDDg....",
        "...gggggg..."
    ],
    sonnenschirm: [
        "......kk......",
        "....RRwwRR....",
        "..RRwwRRwwRR..",
        ".RwwRRwwRRwwR.",
        "RRwwRRwwRRwwRR",
        "......DD......",
        "......DD......",
        "......DD......",
        "......DD......",
        "....VVDDVV....",
        "......DD......",
        "......DD......",
        "....DDDDDD...."
    ],
    // Kuerbislaterne mit leuchtendem Gesicht
    kuerbislaterne: [
        ".....Gg.....",
        "....gG......",
        "..OOOOOOOO..",
        ".OoOOOOOOoO.",
        "OOvvOOOOvvOO",
        "OoOOOOOOOOoO",
        "OOOOOvvOOOOO",
        "OovOvvvvOvoO",
        "OOOvvOOvvOOO",
        ".OoOOOOOOoO.",
        "..OOOOOOOO.."
    ],
    vogelhaus: [
        "....TT....",
        "...TUUT...",
        "..TUUUUT..",
        ".TUUUUUUT.",
        "TTTTTTTTTT",
        ".WWWWWWWW.",
        ".WWWkkWWW.",
        ".WWkkkkWW.",
        ".WWWkkWWW.",
        ".VVVVVVVV.",
        "....KK....",
        "....KK....",
        "....KK....",
        "...kkkk..."
    ],
    // ---------- Kraehe (sitzend und zwei Flug-Bilder) ----------
    kraehe: [
        "........XXX...",
        ".......XXXXX..",
        ".......XXwXX9.",
        "..XX...XXXXX99",
        ".XXXXXXXXXXX..",
        "XX9XXXXXXXXX..",
        ".XXX9XXXXXX...",
        "...XXXXXXX....",
        ".....k..k.....",
        "....kk.kk....."
    ],
    kraehe_flug1: [
        ".XX......XX...",
        "..XXX..XXX....",
        "...XXXXXX.XXX.",
        "....XXXXXXXwX9",
        "..XXXXXXXXXXX9",
        ".XX..XXXXXX...",
        "......X.X....."
    ],
    kraehe_flug2: [
        "..........XXX.",
        "....XXXXXXXwX9",
        "..XXXXXXXXXXX9",
        ".XXXXXXXXXX...",
        "..XXX...XXX...",
        ".XX.......XX..",
        ".............."
    ],
    // Kodex-Buch fuer die Knopfleiste
    // Deko: Kuerbisstapel
    kuerbisstapel: [
        "......gG......",
        ".....oOOo.....",
        "....oOYOOo....",
        "....oOOOOo....",
        "..gG.oooo.gG..",
        ".oOOoo..oOOOo.",
        "oOYOOOooOYOOOo",
        "oOOOOOooOOOOOo",
        ".ooooo..ooooo."
    ],
    // Deko: Lagerfeuer (die Flammen flackern per CSS)
    lagerfeuer: [
        "......Y.....",
        ".....YO.....",
        "....YORY....",
        "...YORROY...",
        "...ORRwRO...",
        "..OORwwROO..",
        ".KkORRRROkK.",
        "KKkkKKKKkkKK",
        ".kKKkkkkKKk.",
        "..k......k.."
    ],
    // Deko: Rosenbogen aus Ranken
    blumenbogen: [
        "....GGGGGG....",
        "..GGtGGRGGGG..",
        ".GRGGGGGGYGtG.",
        ".GGG......GMG.",
        "GtG........GGG",
        "GGp........pYG",
        "GRp........pGG",
        ".Gp........pG.",
        "..p........p..",
        "..p........p..",
        "..p........p..",
        "..p........p..",
        "..p........p..",
        "..p........p..",
        ".GpG......GpG.",
        "GGkGG....GGkGG"
    ],
    // Deko: Pilzhaeuschen mit Fenster und Tuer
    pilzhaus: [
        "....RRRR....",
        "..RRwRRRRR..",
        ".RRRRRRwwRR.",
        "RRwwRRRRRRRR",
        "RRwwRRRwRRRR",
        "rrrrrrrrrrrr",
        "..EEEEEEEE..",
        "..EEqEEEEE..",
        "..EEEEKKEE..",
        "..EEEEKKEE..",
        "..EEEEKYEE..",
        "..EEEEKKEE..",
        ".GGEEEKKEEG.",
        "GGGGGGGGGGGG"
    ],
    buch: [
        "..kkkkkkkk..",
        ".kUUUUUUUUk.",
        ".kUwwwwwwUk.",
        ".kUUUUUUUUk.",
        ".kUUvvvvUUk.",
        ".kUUvYYvUUk.",
        ".kUUvvvvUUk.",
        ".kUUUUUUUUk.",
        ".kUUUUUUUUk.",
        ".kEEEEEEEEk.",
        ".kEeeeeeeek.",
        "..kkkkkkkk.."
    ],
    herz: [
        ".rr.rr.",
        "rRRrRRr",
        "rRwRRRr",
        ".rRRRr.",
        "..rRr..",
        "...r..."
    ],
    bauernhaus: [
        "................98......",
        "........TTTTTTTT98......",
        ".......TUUUUUUUUT8......",
        "......TUULUULUULUT......",
        ".....TUUUUUUUUUUUUT.....",
        "....TUULUULUULUULUUT....",
        "...TUUUUUUUUUUUUUUUUT...",
        "..TUULUULUULUULUULUULT..",
        ".TTTTTTTTTTTTTTTTTTTTTT.",
        "..WWWWWWWWWWWWWWWWWWWW..",
        "..WwwwwWWWWWWWWWWwwwwW..",
        "..WwFFwWWWDDDDWWWwFFwW..",
        "..WwFFwWWWDDDDWWWwFFwW..",
        "..WwwwwWWWDDDDWWWwwwwW..",
        "..WRtYRWWWDDDDWWWYRtRW..",
        "..VWWWWWWWDDkDWWWWWWWV..",
        "..VVVVVVVVDDDDVVVVVVVV..",
        ".kkkkkkkkkkkkkkkkkkkkkk."
    ],
    scheune: [
        ".........kk.........",
        ".......kkKKkk.......",
        ".....kkKKKKKKkk.....",
        "...kkKKKKKKKKKKkk...",
        ".kkKKKKKKKKKKKKKKkk.",
        "kKKKKKKKKKKKKKKKKKKk",
        ".wLlLlLlLwwLlLlLlLw.",
        ".wLlLlLlLFFLlLlLlLw.",
        ".wLlLlLlLwwLlLlLlLw.",
        ".wwwwwwwwwwwwwwwwww.",
        ".wLlLwwwwwwwwwwLlLw.",
        ".wLlLwwllllllwwLlLw.",
        ".wLlLwlwllllwlwLlLw.",
        ".wLlLwllwllwllwLlLw.",
        ".wLlLwlllwwlllwLlLw.",
        ".wLlLwllwllwllwLlLw.",
        ".wLlLwlwllllwlwLlLw.",
        ".wLlLwwllllllwwLlLw.",
        "kkkkkkkkkkkkkkkkkkkk"
    ],
    heu: [
        ".yYyyYy.",
        "yYeYyeYy",
        "KKKKKKKK",
        "yeYyYeYy",
        "yYyeYyYy",
        ".yyyyyy."
    ],
    vogelscheuche: [
        "....kkkk....",
        "...kKKKKk...",
        ".kkkkkkkkkk.",
        "....aaaa....",
        "....akak....",
        "....aaaa....",
        ".....aa.....",
        "YyUUUUUUUUyY",
        "...UUUUUU...",
        "...UUwUUU...",
        "...UUUUUU...",
        "....nnnn....",
        ".....KK.....",
        ".....KK.....",
        ".....KK.....",
        "....kkkk...."
    ],
    gartenzwerg: [
        "...UU...",
        "..UUUU..",
        "..UUUU..",
        ".UUUUUU.",
        "..PPPP..",
        "..kPPk..",
        ".wwwwww.",
        ".wwwwww.",
        "..wwww..",
        ".qqqqqq.",
        ".qQQQQq.",
        ".kk..kk."
    ],
    brunnen: [
        "......TT......",
        "....TTUUTT....",
        "..TTUUUUUUTT..",
        ".TUUUUUUUUUUT.",
        "..K........K..",
        "..K....n...K..",
        "..K...AA...K..",
        ".898989898989.",
        ".9QQQQQQQQQQ9.",
        ".898989898989.",
        ".989898989898.",
        ".898989898989.",
        "..9999999999.."
    ],
    haus: [
        "......TTTT......",
        ".....TUUUUT.....",
        "....TUUUUUUT....",
        "...TUUUUUUUUT...",
        "..TUUUUUUUUUUT..",
        ".TUUUUUUUUUUUUT.",
        "TTTTTTTTTTTTTTTT",
        ".WWWWWWWWWWWWWW.",
        ".WFFWWWDDWWWFFW.",
        ".WFFWWWDDWWWFFW.",
        ".WWWWWWDDWWWWWW.",
        ".VWWWWWDDWWWWWV.",
        ".VVVVVVDDVVVVVV."
    ],
    baum: [
        "...GGGG...",
        "..GGGggG..",
        ".GGgGGggg.",
        "GGGGGgGggg",
        "GgGGGGgggg",
        "GGGgGggggg",
        ".gGGgggggd",
        "..gggggdd.",
        "....KK....",
        "....KK....",
        "...KKKK..."
    ]
};

// Abwandlungen eines Sprites mit anderen Farben
const SPRITE_ABWANDLUNGEN = {
    erde_nass: { basis: "erde", farben: { B: "#5e3d24", b: "#43291a", c: "#6f4a2c" } },
    // Alle Muenzen sind aus Gold, die Raritaet zeigt ein farbiger Edelstein in der Mitte (plus Leuchten per CSS)
    muenze_0: { basis: "muenze", farben: {} },
    muenze_1: { basis: "muenze", farben: { Z: "#3fbf3f" } },
    muenze_2: { basis: "muenze", farben: { Z: "#2f8fe0" } },
    muenze_3: { basis: "muenze", farben: { Z: "#9a4fe0" } },
    muenze_4: { basis: "muenze_stern", farben: {} },
    // Baeume, Buesche und Gras fuer die Hof-Themen
    baum_herbst: { basis: "baum", farben: { G: "#f0a030", g: "#d0602a", d: "#8f3326" } },
    busch_herbst: { basis: "busch", farben: { G: "#e8902a", g: "#c0602a", d: "#7a3a1a" } },
    baum_fruehling: { basis: "baum", farben: { G: "#ffc2da", g: "#ff94be", d: "#e06a9a" } },
    busch_fruehling: { basis: "busch", farben: { G: "#9fe07a", g: "#ff94be", d: "#3f8a32" } },
    baum_winter: { basis: "baum", farben: { G: "#f4f8ff", g: "#c9d6e6", d: "#8a9ab4" } },
    busch_winter: { basis: "busch", farben: { G: "#f4f8ff", g: "#d6e2ee", d: "#9aa8bc" } },
    gras_herbst: { basis: "gras", farben: { h: "#a8a84a", H: "#bcb858", j: "#96963e", J: "#d0a84a" } },
    gras_fruehling: { basis: "gras", farben: { h: "#8fd06a", H: "#a4e07c", j: "#7cbf58", J: "#ffc2da" } },
    gras_winter: { basis: "gras", farben: { h: "#e8f0f8", H: "#ffffff", j: "#d6e2ee", J: "#c9d6e6" } },
    baum_wueste: { basis: "baum", farben: { G: "#8ab83a", g: "#5a8a2a", d: "#3a5a1a", K: "#a8784a" } },
    busch_wueste: { basis: "busch", farben: { G: "#a8b060", g: "#7a8a3a", d: "#5a6a2a" } },
    gras_wueste: { basis: "gras", farben: { h: "#d8b878", H: "#e0c488", j: "#c8a868", J: "#b8984a" } },
    baum_tropen: { basis: "baum", farben: { G: "#5ad05a", g: "#2fa04a", d: "#1a6a3a" } },
    busch_tropen: { basis: "busch", farben: { G: "#6ae06a", g: "#ff5a8a", d: "#1a7a3a" } },
    gras_tropen: { basis: "gras", farben: { h: "#5fc05a", H: "#72d06a", j: "#55b050", J: "#ffb030" } },
    baum_zauberwald: { basis: "baum", farben: { G: "#7ad0c0", g: "#3a8a9a", d: "#2a4a7a" } },
    busch_zauberwald: { basis: "busch", farben: { G: "#b48cff", g: "#7a5ad0", d: "#3a2a7a" } },
    gras_zauberwald: { basis: "gras", farben: { h: "#3f8a7a", H: "#4f9a8a", j: "#357a6c", J: "#c9b0f5" } },
    baum_kosmos: { basis: "baum", farben: { G: "#7a6ae0", g: "#4a3aa0", d: "#2a1d68", K: "#3a2a4a" } },
    busch_kosmos: { basis: "busch", farben: { G: "#4a7ad0", g: "#fff6a0", d: "#1d2a6a" } },
    gras_kosmos: { basis: "gras", farben: { h: "#2a4070", H: "#304a80", j: "#263c68", J: "#6a7ac0" } },
    baum_sommer: { basis: "baum", farben: { G: "#5cc03a", g: "#3a9a2a", d: "#1f6a1a" } },
    busch_sommer: { basis: "busch", farben: { G: "#6ccc4a", g: "#e8434a", d: "#2f7a2a" } },
    gras_sommer: { basis: "gras", farben: { h: "#7cc84a", H: "#90d85a", j: "#6ab43e", J: "#ffd84a" } },
    baum_feuerwerk: { basis: "baum", farben: { G: "#ff8a9a", g: "#e8435a", d: "#a82a3a", K: "#4a2a1a" } },
    busch_feuerwerk: { basis: "busch", farben: { G: "#5aa84a", g: "#e8434a", d: "#2f6a2a" } },
    gras_feuerwerk: { basis: "gras", farben: { h: "#6aae4a", H: "#7cbf58", j: "#5a9a3e", J: "#e8434a" } }
};

// Muenzen mit unterschiedlicher Form in der Mitte (Farbenblind-Modus): Dreieck, Raute, Quadrat
(() => {
    const formen = {
        1: [".ZZ.", ".ZZ.", "ZZZZ", "ZZZZ"],
        2: [".ZZ.", "ZZZZ", "ZZZZ", ".ZZ."],
        3: ["ZZZZ", "ZZZZ", "ZZZZ", "ZZZZ"]
    };
    Object.entries(formen).forEach(([nummer, form]) => {
        SPRITE_PIXEL["muenze_form_" + nummer] = SPRITE_PIXEL.muenze.map((zeile, y) => {
            if (y < 4 || y > 7) return zeile;
            const mitte = form[y - 4].replace(/\./g, "Y");
            return zeile.slice(0, 4) + mitte + zeile.slice(8);
        });
    });
    // gewoehnlich im Farbenblind-Modus: ohne Zeichen in der Mitte
    SPRITE_PIXEL.muenze_form_0 = SPRITE_PIXEL.muenze.map(zeile => zeile.replace(/Z/g, "Y"));
})();

// Unreife Stufe einer Pflanze: gleiche Form, aber Fruechte und Blueten sind noch gruen (Blaetter und Stiele bleiben)
const BLATT_BUCHSTABEN = new Set(["G", "g", "d", "h", "H", "j", "J", "k", "K", "n", "."]);

function mischeHex(a, b, anteil) {
    const na = parseInt(a.slice(1), 16);
    const nb = parseInt(b.slice(1), 16);
    return "#" + [16, 8, 0].map(s => {
        const wa = (na >> s) & 255;
        const wb = (nb >> s) & 255;
        return Math.round(wa + (wb - wa) * anteil).toString(16).padStart(2, "0");
    }).join("");
}

function unreifSprite(name) {
    const schluessel = "unreif_" + name;
    if (!SPRITE_ABWANDLUNGEN[schluessel]) {
        const farben = {};
        new Set(SPRITE_PIXEL[name].join("")).forEach(buchstabe => {
            if (BLATT_BUCHSTABEN.has(buchstabe) || !SPRITE_FARBEN[buchstabe]) return;
            farben[buchstabe] = mischeHex(SPRITE_FARBEN[buchstabe], "#8fcf5c", 0.7);
        });
        SPRITE_ABWANDLUNGEN[schluessel] = { basis: name, farben };
    }
    return schluessel;
}

// Legt bei Bedarf eine Farbvariante an und gibt ihren Namen zurueck (fuer Kosmetik: Muenzen, Felder ...)
function spriteVariante(name, basis, farben) {
    if (!SPRITE_ABWANDLUNGEN[name]) SPRITE_ABWANDLUNGEN[name] = { basis, farben };
    return name;
}

// Sonne und Mond fuer den Himmel ueber dem Hof, aus Kreisen berechnet
SPRITE_PIXEL.sonne = Array.from({ length: 15 }, (_, y) => Array.from({ length: 15 }, (_, x) => {
    const d = Math.hypot(x - 7, y - 7);
    return d <= 4.6 ? "w" : d <= 6.1 ? "v" : d <= 7.3 ? "Y" : ".";
}).join(""));
// Grosser Stern (statt der Sonne in der Kosmischen Nacht): heller Kern, vier lange Strahlen, kurze Strahlen dazwischen
SPRITE_PIXEL.grosserstern = Array.from({ length: 15 }, (_, y) => Array.from({ length: 15 }, (_, x) => {
    const dx = Math.abs(x - 7);
    const dy = Math.abs(y - 7);
    const d = Math.hypot(dx, dy);
    if (d <= 2.2) return "w";
    if (d <= 3.4) return "z";
    if ((dx === 0 && dy <= 7) || (dy === 0 && dx <= 7)) return dx + dy > 5 ? "F" : "z";
    if (dx === dy && dx <= 4) return "F";
    return ".";
}).join(""));
// Sense (Sternenfall-Shop "Sense"): gebogenes Stahlblatt am Holzstiel
SPRITE_PIXEL.sense_basis = [
    "................",
    "......111111....",
    "....1122222213..",
    "..11222111113...",
    ".12211.....33...",
    ".121.......3....",
    ".11.......33....",
    "..........3.....",
    ".........33.....",
    ".........3......",
    "........44......",
    "........4.......",
    ".......33.......",
    ".......3........",
    "......33........",
    "......3........."
];
SPRITE_ABWANDLUNGEN.sense = { basis: "sense_basis", farben: { 1: "#4f5866", 2: "#dfe6ef", 3: "#9a6634", 4: "#5b3a22" } };

// Mondbluete: eine einzelne Kirschbluete in Lavendel (5 Bluetenblaetter mit Kerbe, gelbe Staubblaetter)
SPRITE_PIXEL.mondbluete = (() => {
    const g = 15;
    const m = 7.5;
    const fuenftel = (Math.PI * 2) / 5;
    const voll = (x, y) => {
        if (x < 0 || y < 0 || x >= g || y >= g) return false;
        const dx = x + 0.5 - m;
        const dy = y + 0.5 - m;
        const r = Math.hypot(dx, dy);
        const phi = Math.atan2(dy, dx) + Math.PI / 2;
        const rMax = 2.4 + 4.6 * Math.pow(Math.abs(Math.cos(2.5 * phi)), 0.32);
        const zumBlatt = ((phi % fuenftel) + fuenftel) % fuenftel;
        const kerbe = Math.min(zumBlatt, fuenftel - zumBlatt) < 0.12 && r > rMax - 1.2;
        return r <= rMax && !kerbe;
    };
    return Array.from({ length: g }, (_, y) => Array.from({ length: g }, (_, x) => {
        if (!voll(x, y)) return ".";
        if (!voll(x - 1, y) || !voll(x + 1, y) || !voll(x, y - 1) || !voll(x, y + 1)) return "S";
        const r = Math.hypot(x + 0.5 - m, y + 0.5 - m);
        if (r < 1.2) return "Y";
        if (r < 2.6) return "f";
        return "C";
    }).join(""));
})();

// Windmuehlen-Fluegel: vier Arme aus Holz (D) mit Segeltuch (w), die Nabe (k) ist genau in der Mitte
SPRITE_PIXEL.muehlenfluegel = (() => {
    const n = 17;
    const c = 8;
    return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => {
        if (x === c && y === c) return "k";
        if (Math.abs(x - c) <= 1 && y !== c) return x === c ? "D" : (y % 2 === 0 ? "D" : "w");
        if (Math.abs(y - c) <= 1 && x !== c) return y === c ? "D" : (x % 2 === 0 ? "D" : "w");
        return ".";
    }).join(""));
})();

// Koi-Teich (legendaere Deko): 8 Bilder. Zwei Koi schwimmen im Kreis, das Schilf wiegt sich, der Rand bleibt stehen
for (let n = 0; n < 8; n++) {
    const B = 22;
    const H = 12;
    const raster = Array.from({ length: H }, () => Array(B).fill("."));
    const setze = (x, y, c, nurWasser) => {
        const px = Math.round(x);
        const py = Math.round(y);
        if (px < 0 || px >= B || py < 0 || py >= H) return;
        if (nurWasser && !"qQx".includes(raster[py][px])) return;
        raster[py][px] = c;
    };
    // Steinrand und Wasser (innen tiefer)
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < B; x++) {
            const d = Math.hypot((x - 10.5) / 10.6, (y - 7) / 4.7);
            if (d > 1) continue;
            if (d > 0.8) raster[y][x] = y > 8 ? "0" : (x + y) % 3 === 0 ? "9" : "8";
            else raster[y][x] = d > 0.64 ? "q" : "Q";
        }
    }
    // Schilf links und rechts, die Spitzen wiegen sich
    const wiegen = n % 4 < 2 ? 0 : 1;
    [[1, 1], [3, 0], [20, 2]].forEach(([x, oben]) => {
        for (let y = oben + 2; y < 8; y++) setze(x, y, "g");
        setze(x + wiegen, oben, "k");
        setze(x + wiegen, oben + 1, "k");
    });
    // Seerose
    setze(15, 5, "g", true); setze(16, 5, "G", true); setze(17, 6, "g", true); setze(15, 6, "G", true); setze(16, 6, "g", true);
    setze(16, 5, "t");
    // Zwei Koi: Kopf, Koerper, Fleck, Schwanz
    const winkel = (n / 8) * Math.PI * 2;
    [[0, ["O", "O", "w", "o"]], [Math.PI, ["w", "w", "R", "w"]]].forEach(([versatz, farben]) => {
        farben.forEach((farbe, i) => {
            const a = winkel + versatz - i * 0.22;
            setze(10.5 + Math.cos(a) * 6.4, 7 + Math.sin(a) * 2.4, farbe, true);
        });
    });
    // Lichtfunkeln auf dem Wasser
    setze(6 + ((n * 3) % 9), 5, "z", true);
    setze(14 - ((n * 2) % 7), 9, "z", true);
    SPRITE_PIXEL["koiteich_" + n] = raster.map(z => z.join(""));
}

// Windspiel (legendaere Deko): Pfosten mit Arm, drei Klangstaebe schwingen hin und her
for (let n = 0; n < 4; n++) {
    const B = 12;
    const H = 16;
    const r = Array.from({ length: H }, () => Array(B).fill("."));
    const setze = (x, y, c) => { if (x >= 0 && x < B && y >= 0 && y < H) r[y][x] = c; };
    for (let y = 1; y < H - 1; y++) setze(2, y, "D");
    for (let x = 1; x < 4; x++) setze(x, H - 1, "D");
    for (let x = 2; x < 11; x++) setze(x, 1, "D");
    setze(10, 0, "Y");
    const schwung = [0, 1, 0, -1][n];
    [[5, 5, "z"], [7, 7, "Q"], [9, 6, "z"]].forEach(([x, laenge, farbe], i) => {
        const s = i === 1 ? -schwung : schwung;
        setze(x, 2, "k");
        setze(x + (s > 0 ? 1 : s < 0 ? -1 : 0) * 0, 3, "k");
        for (let y = 4; y < 4 + laenge; y++) setze(x + (y > 5 ? s : 0), y, farbe);
        setze(x + s, 4 + laenge, "8");
    });
    // Kleines Glitzern am unteren Ende, wenn die Staebe aneinanderstossen
    if (n === 1) setze(8, 10, "w");
    if (n === 3) setze(6, 9, "w");
    SPRITE_PIXEL["windspiel_" + n] = r.map(z => z.join(""));
}

// Sternenteleskop (legendaere Deko): Fernrohr auf einem Dreibein, darueber funkeln Sterne
for (let n = 0; n < 4; n++) {
    const B = 14;
    const H = 16;
    const r = Array.from({ length: H }, () => Array(B).fill("."));
    const setze = (x, y, c) => { if (x >= 0 && x < B && y >= 0 && y < H) r[y][x] = c; };
    // Rohr schraeg nach oben rechts
    for (let i = 0; i < 9; i++) {
        const x = 2 + i;
        const y = 11 - Math.round(i * 0.7);
        setze(x, y, i > 6 ? "z" : "q");
        setze(x, y + 1, i > 6 ? "Q" : "x");
    }
    setze(6, 8, "Y"); setze(6, 9, "Y");
    setze(11, 4, "z"); setze(11, 5, "w");
    // Dreibein
    for (let i = 0; i < 4; i++) {
        setze(6 - i, 11 + i, "D");
        setze(6, 11 + i, "D");
        setze(6 + i, 11 + i, "D");
    }
    // Funkelnde Sterne (wechseln je Bild)
    [[[12, 1], [9, 0]], [[13, 3], [10, 1]], [[12, 0], [8, 2]], [[13, 2], [11, 0]]][n].forEach(([x, y], i) => {
        setze(x, y, i === 0 ? "v" : "w");
    });
    if (n % 2 === 0) { setze(12, 2, "Y"); }
    SPRITE_PIXEL["sternteleskop_" + n] = r.map(z => z.join(""));
}

SPRITE_PIXEL.mond = Array.from({ length: 13 }, (_, y) => Array.from({ length: 13 }, (_, x) => {
    const aussen = Math.hypot(x - 6, y - 6);
    const schnitt = Math.hypot(x - 9, y - 4);
    if (aussen > 5.8 || schnitt < 4.8) return ".";
    return schnitt < 6 ? "E" : "w";
}).join(""));

const spriteLeinwandCache = {};
const spriteUrlCache = {};

function zeichneSprite(zeilen, farbenExtra) {
    const farben = { ...SPRITE_FARBEN, ...farbenExtra };
    const hoehe = zeilen.length;
    const breite = Math.max(...zeilen.map(z => z.length));
    const leinwand = document.createElement("canvas");
    leinwand.width = breite;
    leinwand.height = hoehe;
    const stift = leinwand.getContext("2d");

    for (let y = 0; y < hoehe; y++) {
        for (let x = 0; x < breite; x++) {
            const farbe = farben[zeilen[y][x]];
            if (!farbe) continue;
            stift.fillStyle = farbe;
            stift.fillRect(x, y, 1, 1);
        }
    }
    return leinwand;
}

// Pflanzen (auch ihre Farbvarianten) bekommen automatisch eine dunkle Kontur wie Deko und Haustiere
const KONTUR_SPRITES = new Set(["samen", "keimling", "jungpflanze", "weizen", "karotte", "kartoffel", "erdbeere", "tomate",
    "mais", "kuerbis", "sonnenblume", "blaubeere", "melone", "reis", "kaffee", "riesenpilz", "eisblume", "mondlilie"]);

// Jedes leere Pixel neben einer Farbe wird zur Kontur: eine stark abgedunkelte Version der Nachbarfarbe
function zeichneKontur(leinwand) {
    const stift = leinwand.getContext("2d");
    const b = leinwand.width;
    const h = leinwand.height;
    const bild = stift.getImageData(0, 0, b, h);
    const d = bild.data;
    const vorher = new Uint8ClampedArray(d);
    const nachbarn = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < b; x++) {
            const i = (y * b + x) * 4;
            if (vorher[i + 3] > 0) continue;
            for (const [dx, dy] of nachbarn) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= b || ny >= h) continue;
                const n = (ny * b + nx) * 4;
                if (vorher[n + 3] === 0) continue;
                d[i] = vorher[n] * 0.32;
                d[i + 1] = vorher[n + 1] * 0.3;
                d[i + 2] = vorher[n + 2] * 0.34;
                d[i + 3] = 255;
                break;
            }
        }
    }
    stift.putImageData(bild, 0, 0);
    return leinwand;
}

function spriteLeinwand(name) {
    if (!spriteLeinwandCache[name]) {
        const abwandlung = SPRITE_ABWANDLUNGEN[name];
        const basis = abwandlung ? abwandlung.basis : name;
        const leinwand = zeichneSprite(SPRITE_PIXEL[basis], abwandlung ? abwandlung.farben : {});
        spriteLeinwandCache[name] = KONTUR_SPRITES.has(basis) ? zeichneKontur(leinwand) : leinwand;
    }
    return spriteLeinwandCache[name];
}

function spriteUrl(name) {
    if (SPRITE_DATEIEN[name]) return SPRITE_DATEIEN[name];
    if (!spriteUrlCache[name]) spriteUrlCache[name] = spriteLeinwand(name).toDataURL();
    return spriteUrlCache[name];
}

// ============================================================
// HAUSTIERE: aus einfachen Formen Pixel fuer Pixel berechnet, damit alle Posen zusammenpassen.
// Katze von der Seite mit 4 Beinen, Mantarochen schwebt knapp ueber dem Boden. Beide schauen nach rechts,
// nach links wird das Bild im Spiel gespiegelt.
// Posen (Anzahl Bilder): stehen 2, laufen 4, sitzen 2, liegen 2, schlafen 2.
// Ziffern: 1 hell, 2 Fell/Haut, 3 dunkel, 4 Bauch/Pfoten, 5 Augen, 6 rosa, 7 Umriss, w Glanz, s Schatten
// ============================================================

const HAUSTIER_BILDER = { stehen: 2, laufen: 4, sitzen: 2, liegen: 2, schlafen: 2 };
const HAUSTIER_BREITE = 22;
const HAUSTIER_HOEHE = 16;

function pixelRaster() {
    const raster = Array.from({ length: HAUSTIER_HOEHE }, () => Array(HAUSTIER_BREITE).fill(null));
    const setze = (x, y, farbe) => {
        const px = Math.round(x);
        const py = Math.round(y);
        if (px >= 0 && py >= 0 && px < HAUSTIER_BREITE && py < HAUSTIER_HOEHE) raster[py][px] = farbe;
    };
    const jedesPixel = pruefe => {
        for (let y = 0; y < HAUSTIER_HOEHE; y++) {
            for (let x = 0; x < HAUSTIER_BREITE; x++) pruefe(x, y);
        }
    };
    return {
        raster,
        punkt: setze,
        rechteck(x, y, b, h, farbe) {
            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < b; dx++) setze(x + dx, y + dy, farbe);
            }
        },
        ellipse(cx, cy, rx, ry, farbe, nurWenn) {
            jedesPixel((x, y) => {
                const dx = (x + 0.5 - cx) / rx;
                const dy = (y + 0.5 - cy) / ry;
                if (dx * dx + dy * dy <= 1 && (!nurWenn || nurWenn(x, y))) raster[y][x] = farbe;
            });
        },
        // Dicke Linie entlang einer Kurve (quadratische Bezierkurve), farbe(t) mit t von 0 bis 1
        kurve(p0, p1, p2, radius, farbe) {
            for (let t = 0; t <= 1.0001; t += 0.02) {
                const u = 1 - t;
                const kx = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
                const ky = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
                for (let y = Math.floor(ky - radius); y <= Math.ceil(ky + radius); y++) {
                    for (let x = Math.floor(kx - radius); x <= Math.ceil(kx + radius); x++) {
                        if (Math.hypot(x + 0.5 - kx, y + 0.5 - ky) <= radius) setze(x, y, farbe(t));
                    }
                }
            }
        },
        vieleck(punkte, farbe) {
            jedesPixel((x, y) => {
                const px = x + 0.5;
                const py = y + 0.5;
                let innen = false;
                for (let i = 0, j = punkte.length - 1; i < punkte.length; j = i++) {
                    const [xi, yi] = punkte[i];
                    const [xj, yj] = punkte[j];
                    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) innen = !innen;
                }
                if (innen) raster[y][x] = farbe;
            });
        },
        // Unterkante jeder Form hell faerben (Bauch-Rand)
        unterkante(farbe, nurWenn) {
            const kopie = raster.map(zeile => [...zeile]);
            jedesPixel((x, y) => {
                const hier = kopie[y][x];
                const drunter = y + 1 < HAUSTIER_HOEHE ? kopie[y + 1][x] : null;
                if (hier && hier !== "s" && (!drunter || drunter === "s") && (!nurWenn || nurWenn(x, y))) raster[y][x] = farbe;
            });
        },
        // Umriss um alle gefuellten Pixel (Schatten zaehlt nicht)
        umriss(farbe) {
            const kopie = raster.map(zeile => [...zeile]);
            const voll = (x, y) => x >= 0 && y >= 0 && x < HAUSTIER_BREITE && y < HAUSTIER_HOEHE &&
                kopie[y][x] && kopie[y][x] !== "s";
            jedesPixel((x, y) => {
                if (voll(x, y)) return;
                if (voll(x - 1, y) || voll(x + 1, y) || voll(x, y - 1) || voll(x, y + 1)) raster[y][x] = farbe;
            });
        }
    };
}

// Kopf der Tier-Figur im Profil (Katze und alle Stile): Ohren, runder Kopf, Auge, Schnauze, Baeckchen.
// cx/cy = Mitte des Kopfes. Grosser runder Kopf (Chibi-Stil), Auge vorne.
// stil: fuchs, hund, hase, panda, axolotl, drache, teufel, engel, muetze, kuerbishut, keineStreifen
function katzenKopf(p, cx, cy, blinzelt, schlaeft, stil = {}) {
    const mx = Math.round(cx);
    const oben = Math.round(cy - 3.1);

    // Ohren (vor dem Kopf zeichnen, der Kopf ueberdeckt den Ansatz)
    if (stil.hase) {
        [mx - 2, mx + 1].forEach(x0 => {
            p.rechteck(x0, oben - 3, 2, 4, "2");
            p.punkt(x0 + 1, oben - 2, "6");
            p.punkt(x0 + 1, oben - 1, "6");
        });
    } else if (stil.panda) {
        p.ellipse(cx - 2.4, cy - 2.6, 1.4, 1.3, "3");
        p.ellipse(cx + 1.6, cy - 2.9, 1.4, 1.3, "3");
    } else if (stil.teufel || stil.drache) {
        [mx - 3, mx + 1].forEach(x0 => {
            p.rechteck(x0 + 1, oben - 1, 2, 2, "3");
            p.punkt(x0 + (x0 < mx ? 1 : 2), oben - 2, "3");
        });
    } else if ((!stil.hund || stil.einhorn) && !stil.axolotl && !stil.muetze) {
        [mx - 3, mx + 1].forEach(x0 => {
            p.rechteck(x0, oben - 1, 3, 2, "2");
            p.punkt(x0 + 1, oben - 2, stil.fuchs ? "3" : "2");
            p.punkt(x0 + 1, oben - 1, stil.fuchs ? "4" : "6");
        });
    }

    // Axolotl: drei rosa Kiemen-Wedel hinten am Kopf
    if (stil.axolotl) {
        const wedel = (x1, y1, x2, y2) => p.kurve([x1, y1], [(x1 + x2) / 2, (y1 + y2) / 2 - 0.4], [x2, y2], 0.55, () => "3");
        wedel(cx - 1.6, cy - 2.6, cx - 3.2, cy - 4.4);
        wedel(cx - 2.6, cy - 1.4, cx - 4.8, cy - 2.4);
        wedel(cx - 2.8, cy + 0.4, cx - 5, cy + 0.4);
    }

    p.ellipse(cx, cy, 3.7, 3.3, "2");
    if (!stil.keineStreifen) {
        p.punkt(mx - 1, oben + 1, "3");
        p.punkt(mx - 1, oben + 2, "3");
        p.punkt(mx - 3, oben + 2, "3");
    }

    // Hund: haengendes Schlappohr an der Seite des Kopfes
    if (stil.hund && !stil.einhorn) p.ellipse(cx - 1.6, cy - 0.2, stil.dackel ? 1.3 : 1.2, stil.dackel ? 2.6 : 2.2, "3");
    // Einhorn: bunte Maehne am Hinterkopf
    if (stil.einhorn) {
        ["R", "Y", "Q", "M"].forEach((farbe, i) => p.punkt(mx - 3, oben + 1 + i, farbe));
        p.punkt(mx - 2, oben, "R");
    }

    const ax = mx + 1;
    const ay = Math.round(cy);
    if (stil.panda) {
        p.rechteck(ax - 1, ay - 1, 2, 2, "3");
    }
    if (schlaeft || blinzelt) {
        p.punkt(ax - 1, ay, "7");
        p.punkt(ax, ay, "7");
    } else {
        p.punkt(ax, ay - 1, "5");
        p.punkt(ax, ay, "5");
    }

    if (stil.fuchs) {
        // spitze, helle Schnauze mit dunkler Nase
        p.punkt(ax + 1, ay + 1, "4");
        p.punkt(ax + 2, ay + 1, "4");
        p.punkt(ax + 3, ay + 1, "4");
        p.punkt(ax + 2, ay, "2");
        p.punkt(ax + 3, ay, "3");
        p.punkt(ax - 1, ay + 1, "4");
    } else if (stil.hund) {
        // runde Hundeschnauze, dunkle Nase, rosa Zunge
        p.rechteck(ax + 1, ay, 2, 2, "4");
        p.punkt(ax + 3, ay, "7");
        p.punkt(ax + 3, ay + 1, "4");
        if (!schlaeft) p.punkt(ax + 2, ay + 2, "6");
    } else if (stil.axolotl) {
        p.punkt(ax + 1, ay + 1, "7");
        p.punkt(ax + 2, ay + 1, "7");
        p.punkt(ax - 1, ay + 1, "6");
    } else if (stil.drache) {
        p.rechteck(ax + 1, ay, 2, 2, "2");
        p.punkt(ax + 3, ay + 1, "2");
        p.punkt(ax + 2, ay, "7");
        p.punkt(ax - 1, ay + 1, "4");
    } else {
        p.punkt(ax + 1, ay + 1, "4");
        p.punkt(ax + 2, ay + 1, "4");
        p.punkt(ax + 2, ay, "6");
        p.punkt(ax - 1, ay + 1, "6");
    }

    // Weihnachtsmuetze und Kuerbishut sitzen auf dem Kopf (bekommen den Umriss mit)
    if (stil.muetze) {
        p.rechteck(mx - 3, oben, 6, 1, "w");
        p.rechteck(mx - 2, oben - 1, 4, 1, "R");
        p.rechteck(mx - 1, oben - 2, 3, 1, "R");
        p.punkt(mx + 2, oben - 2, "w");
    }
    // Einhorn: goldenes Horn auf der Stirn (schraeg nach vorn)
    if (stil.einhorn) {
        p.punkt(mx + 1, oben, "y");
        p.punkt(mx + 1, oben - 1, "Y");
        p.punkt(mx + 2, oben - 2, "Y");
        p.punkt(mx + 2, oben - 3, "v");
    }
    // Rote Schleife am vorderen Ohr (Kitty)
    if (stil.schleife) {
        p.punkt(mx + 1, oben - 3, "R");
        p.punkt(mx + 1, oben - 2, "R");
        p.punkt(mx + 3, oben - 3, "R");
        p.punkt(mx + 3, oben - 2, "R");
        p.punkt(mx + 2, oben - 2, "r");
    }
    if (stil.kuerbishut) {
        p.ellipse(cx - 0.4, oben - 0.2, 2.4, 1.4, "O");
        p.punkt(mx - 1, oben - 1, "o");
        p.punkt(mx + 1, oben - 1, "o");
        p.punkt(mx, oben - 2, "d");
    }
}

// Extras, die nach dem Umriss gezeichnet werden (ohne eigenen Umriss): Heiligenschein
function katzenExtrasOben(p, kopfX, kopfY, stil) {
    if (!stil.engel) return;
    const mx = Math.round(kopfX);
    const y = Math.round(kopfY - 3.1) - 3;
    p.rechteck(mx - 2, y, 4, 1, "Y");
    p.punkt(mx - 3, y + 1, "y");
    p.punkt(mx + 2, y + 1, "y");
}

// Kleine Fluegel auf dem Ruecken: Engel hellblau, Drache gruen
function katzenFluegel(p, x, y, stil) {
    if (stil.engel) {
        p.ellipse(x, y - 0.6, 2.6, 1.8, "z");
        p.punkt(x - 1, y - 1, "w");
        p.punkt(x, y - 1, "w");
        p.punkt(x - 1, y + 0.2, "Q");
        p.punkt(x + 1, y + 0.2, "Q");
    } else if (stil.drache) {
        p.vieleck([[x - 2.5, y + 0.6], [x - 1, y - 2.6], [x + 0.4, y - 1], [x + 1.8, y - 2.8], [x + 2.4, y + 0.6]], "3");
        p.punkt(x, y - 0.4, "1");
    }
}

// Rueckenstacheln (Drache)
function katzenStacheln(p, xs, y, stil) {
    if (!stil.drache) return;
    xs.forEach(x => p.punkt(x, y, "3"));
}

// Schwanz: normal, buschig mit weisser Spitze (Fuchs), Pfeilspitze (Teufel/Drache), Puschel (Hase),
// dick und nach oben (Hund), lang und flach (Axolotl), kurz (Panda)
function katzenSchwanz(p, p0, p1, p2, stil) {
    if (stil.hase) {
        p.ellipse(p0[0] - 0.6, p0[1] - 0.4, 1.4, 1.3, "4");
        return;
    }
    if (stil.panda) {
        p.ellipse(p0[0] - 0.4, p0[1], 1.1, 1, "2");
        return;
    }
    if (stil.axolotl) {
        p.kurve(p0, [p0[0] - 2.5, p0[1] + 1.4], [p0[0] - 5, p0[1] + 1.2], 1.1, t => (t > 0.3 && t < 0.9 ? "3" : "2"));
        return;
    }
    if (stil.fuchs) {
        p.kurve(p0, p1, p2, 1.35, t => (t > 0.72 ? "4" : "2"));
        return;
    }
    if (stil.hund) {
        p.kurve(p0, p1, p2, 1, t => (t > 0.8 ? "4" : "2"));
        return;
    }
    const pfeil = stil.teufel || stil.drache;
    p.kurve(p0, p1, p2, pfeil ? 0.6 : 0.9, t => (t > 0.8 && !pfeil ? "3" : "2"));
    if (pfeil) {
        const [x, y] = p2;
        p.punkt(x, y - 1, "3");
        p.rechteck(x - 1, y, 3, 1, "3");
        p.punkt(x, y + 1, "3");
    }
}

function katzenRaster(pose, bild, blinzelt, stil = {}) {
    const p = pixelRaster();
    const dunkleBeine = stil.fuchs || stil.panda;
    const beinFarbe = dunkleBeine ? "3" : "2";
    const pfotenFarbe = dunkleBeine ? "3" : "4";
    // Dackel: laenger und tiefer, Hase: Kopf etwas tiefer (lange Ohren), Axolotl: kurze Beine
    const tief = stil.dackel ? 1.4 : stil.axolotl ? 1.6 : 0;
    const kopfTiefer = stil.hase ? 1.4 : 0;
    const lang = stil.dackel ? 1.4 : stil.axolotl ? 1 : 0;
    let kopf;

    if (pose === "stehen" || pose === "laufen") {
        // Trab: vorne-nah + hinten-fern bewegen sich zusammen (A), die anderen beiden gegengleich (B)
        const schritt = pose === "laufen" ? bild : -1;
        const versatzA = schritt < 0 ? 0 : [1, 0, -1, 0][schritt];
        const hebenA = schritt === 1 ? 1 : 0;
        const hebenB = schritt === 3 ? 1 : 0;
        // Hasen huepfen staerker
        const wippen = schritt === 1 || schritt === 3 ? (stil.hase ? -2 : -1) : 0;
        const beinOben = 10 + tief;
        const bein = (x, farbe, heben, pfote) => {
            p.rechteck(x, beinOben + wippen, 2, 15 - beinOben - heben - wippen, farbe);
            if (pfote) p.rechteck(x, 14 - heben, 2, 1, pfotenFarbe);
        };
        const wedeln = pose === "stehen" ? bild : (bild % 2);
        const hinten = 5.5 - lang;
        katzenSchwanz(p, [hinten, 8.5 + wippen + tief], [hinten - 4, 8 + wippen + tief], [hinten - 3.3 + wedeln, 3.2 + wippen + tief * 0.6], stil);
        bein(5 + versatzA - lang, "3", hebenA, false);
        bein(11 - versatzA, "3", hebenB, false);
        p.ellipse(9.5 - lang / 2, 9.2 + wippen + tief, 5.2 + lang, stil.axolotl ? 2.2 : 2.8, "2");
        if (stil.panda) p.ellipse(12.5, 9.2 + wippen, 1.6, 2.6, "3");
        if (stil.drache || stil.axolotl) p.ellipse(10, 10.4 + wippen + tief, 4, 1, "4");
        else if (!stil.panda) p.rechteck(13, 9 + wippen + tief, 2, 2, "4");
        bein(7 - versatzA - lang, beinFarbe, hebenB, true);
        bein(13 + versatzA, beinFarbe, hebenA, true);
        if (!stil.keineStreifen) {
            [7, 9, 11].forEach(x => {
                p.punkt(x, 7 + wippen, "3");
                p.punkt(x, 8 + wippen, "3");
            });
        }
        katzenStacheln(p, [6, 8, 10], 6 + wippen + tief, stil);
        katzenFluegel(p, 9 - lang / 2, 6.2 + wippen + tief, stil);
        if (stil.hund) p.rechteck(13, 7 + wippen + tief, 2, 1, "R");
        kopf = [15.6, 6.4 + wippen + tief * 0.7 + kopfTiefer];
    } else if (pose === "sitzen") {
        katzenSchwanz(p, [5.5, 14.2], [9, 15.6], [15.2 + bild * 0.6, 14.2 - bild * 0.6], stil);
        p.ellipse(8.6, 11.4, 4.2, 3.5, "2");
        if (!stil.keineStreifen) {
            [6, 8].forEach(x => {
                p.punkt(x, 9, "3");
                p.punkt(x, 10, "3");
            });
        }
        p.rechteck(10, 11, 2, 4, "3");
        p.ellipse(11.6, 9.4, 2.9, 4.2, "2");
        if (stil.panda) p.ellipse(11.6, 8.2, 2.9, 1.6, "3");
        else p.ellipse(11.6, 9.4, 2.9, 4.2, "4", (x, y) => x >= 12 && y >= 8);
        p.rechteck(12, 10, 2, 5, beinFarbe);
        p.rechteck(12, 14, 2, 1, pfotenFarbe);
        if (stil.hase || stil.panda || stil.axolotl) katzenSchwanz(p, [5.2, 13.6], [0, 0], [0, 0], stil);
        katzenStacheln(p, [6, 8], 7.8, stil);
        katzenFluegel(p, 7.6, 8.2, stil);
        if (stil.hund) p.rechteck(11, 6.8, 3, 1, "R");
        kopf = [12.8, 6.1 + kopfTiefer];
    } else {
        // liegen und schlafen: gemuetlich zusammengerollt ("Brotlaib"), beim Schlafen atmet sie
        const schlaeft = pose === "schlafen";
        const atmen = schlaeft ? bild * 0.3 : 0;
        katzenSchwanz(p, [4.5, 13.4], [1, 15], [1.4 + (schlaeft ? 0 : bild * 0.8), 11.6 + (schlaeft ? 1.5 : 0)], stil);
        p.ellipse(10, 12.3 - atmen, 6.4, 2.8 + atmen, "2");
        if (stil.panda) p.ellipse(13, 12.3, 1.6, 2.4, "3");
        if (!stil.keineStreifen) [7, 9, 11].forEach(x => p.punkt(x, 10.4 - atmen, "3"));
        katzenStacheln(p, [6, 8, 10], 9.4 - atmen, stil);
        p.rechteck(15, 14, 3, 1, pfotenFarbe);
        katzenFluegel(p, 9, 9.6 - atmen, stil);
        kopf = [16.4, (schlaeft ? 11.4 : 10.4) + kopfTiefer * 0.4];
    }

    katzenKopf(p, kopf[0], kopf[1], blinzelt, pose === "schlafen", stil);
    p.umriss("7");
    katzenExtrasOben(p, kopf[0], kopf[1], stil);
    return p.raster;
}

// Pinguin von der Seite: aufrecht, watschelt beim Laufen, rutscht zum Liegen auf dem Bauch.
// Farben: 2 schwarz, 3 dunkel (Fluegel), 4 weisser Bauch, 5 Auge, 6 orange (Schnabel, Fuesse), 7 Umriss
function pinguinRaster(pose, bild, blinzelt) {
    const p = pixelRaster();
    const geschlossen = blinzelt || pose === "schlafen";

    if (pose === "liegen") {
        // Bauchrutscher
        p.ellipse(10.5, 12.2, 6.8, 2.6, "2");
        p.ellipse(11, 13, 6, 1.6, "4", (x, y) => y >= 12);
        p.ellipse(8, 11.4, 2.4, 0.9, "3");
        p.rechteck(3, 13, 2, 1, "6");
        p.punkt(15, 11, geschlossen ? "7" : "4");
        if (!geschlossen) p.punkt(16, 11, "5");
        p.rechteck(17, 12, 2, 1, "6");
        p.umriss("7");
        return p.raster;
    }

    const sitzt = pose === "sitzen" || pose === "schlafen";
    const schritt = pose === "laufen" ? bild : -1;
    const neigen = schritt < 0 ? 0 : [0.6, 0, -0.6, 0][schritt];
    const cy = sitzt ? 10 : 8.8;
    const oben = cy - 5.2;
    // Koerper: oben leicht zur Seite geneigt (Watscheln)
    p.ellipse(11 + neigen, cy, 3.9, 5.2, "2");
    p.ellipse(12.3 + neigen, cy + 1, 2.6, 4, "4", (x, y) => x >= 11 + neigen);
    // Fluegel schlagen beim Stehen leicht
    const fluegel = pose === "stehen" ? bild * 0.6 : 0;
    p.ellipse(9.6 + neigen, cy + 0.6 - fluegel, 1.1, 2.6, "3");
    // Kopf: Auge mit weissem Fleck, Schnabel
    const ay = Math.round(oben + 2.6);
    p.rechteck(Math.round(12.6 + neigen), ay - 1, 2, 2, "4");
    if (geschlossen) p.punkt(Math.round(13 + neigen), ay, "7");
    else p.punkt(Math.round(13 + neigen), ay - 1, "5");
    p.rechteck(Math.round(15 + neigen), ay, 2, 1, "6");
    // Fuesse
    if (sitzt) {
        p.rechteck(12, 14, 3, 1, "6");
    } else {
        const fussA = schritt === 1 ? 13 : 14;
        const fussB = schritt === 3 ? 13 : 14;
        p.rechteck(9, fussA, 2, 1, "6");
        p.rechteck(12, fussB, 2, 1, "6");
    }
    p.umriss("7");
    return p.raster;
}

// Katzenmaedchen (Chibi-Stil, von der Seite): Katzenohren, lange Haare, Kleid mit Schuerze, Glocke, Schwanz.
// Farben: 1 Schuerze, 2 Haare/Ohren/Schwanz, 3 Kleid/Schuhe, 4 Haut, 5 Augen, 6 rosa, 7 Umriss
function maedchenKopf(p, cx, cy, geschlossen) {
    const mx = Math.round(cx);
    const oben = Math.round(cy - 3.2);
    // lange Haare hinten
    p.ellipse(cx - 2.2, cy + 1.6, 2.4, 3.4, "2");
    // Katzenohren
    [mx - 3, mx + 1].forEach(x0 => {
        p.rechteck(x0, oben - 1, 3, 2, "2");
        p.punkt(x0 + 1, oben - 2, "2");
        p.punkt(x0 + 1, oben - 1, "6");
    });
    // Gesicht, darueber Haare (oben und hinten), vorne ein Pony
    p.ellipse(cx, cy, 3.5, 3.2, "4");
    p.ellipse(cx, cy, 3.6, 3.3, "2", (x, y) => y + 0.5 < cy - 0.6 || x + 0.5 < cx - 1.2);
    p.punkt(mx + 2, Math.round(cy - 1), "2");
    const ax = mx + 1;
    const ay = Math.round(cy);
    if (geschlossen) {
        p.punkt(ax, ay, "7");
        p.punkt(ax + 1, ay, "7");
    } else {
        // grosse Anime-Augen mit Glanzpunkt
        p.punkt(ax, ay - 1, "w");
        p.punkt(ax + 1, ay - 1, "5");
        p.punkt(ax, ay, "5");
        p.punkt(ax + 1, ay, "5");
    }
    p.punkt(ax - 1, ay + 1, "6");
    p.punkt(ax + 2, ay + 1, "6");
}

function maedchenRaster(pose, bild, blinzelt) {
    const p = pixelRaster();
    const schwanz = (p0, p1, p2) => p.kurve(p0, p1, p2, 0.7, () => "2");
    let kopf;

    if (pose === "stehen" || pose === "laufen") {
        const schritt = pose === "laufen" ? bild : -1;
        const versatz = schritt < 0 ? 0 : [1, 0, -1, 0][schritt];
        const wippen = schritt === 1 || schritt === 3 ? -1 : 0;
        const wedeln = pose === "stehen" ? bild : bild % 2;
        schwanz([8.5, 11.5], [4, 12], [4.5 + wedeln, 7 + wippen]);
        // Beine mit Schuhen
        [[10 + versatz, schritt === 1], [12 - versatz, schritt === 3]].forEach(([x, gehoben]) => {
            p.rechteck(x, 12 + wippen, 1, gehoben ? 2 : 3 - wippen, "4");
            p.punkt(x, gehoben ? 13 : 14, "3");
            p.punkt(x + 1, gehoben ? 13 : 14, "3");
        });
        // Kleid mit Schuerze und Glocke
        p.vieleck([[9.2, 8.6 + wippen], [13.6, 8.6 + wippen], [15.2, 12.6 + wippen], [7.8, 12.6 + wippen]], "3");
        p.vieleck([[12, 9.6 + wippen], [14.1, 9.6 + wippen], [14.9, 12.4 + wippen], [12.3, 12.4 + wippen]], "1");
        p.punkt(13, 9 + wippen, "Y");
        p.punkt(15, 10.6 + wippen, "4");
        kopf = [12, 5.4 + wippen];
    } else if (pose === "sitzen") {
        schwanz([8, 13.5], [3.5, 15], [3.2 + bild, 10.5]);
        p.vieleck([[9, 9.8], [13.2, 9.8], [15, 13.6], [7.4, 13.6]], "3");
        p.vieleck([[11.8, 10.6], [13.6, 10.6], [14.4, 13.4], [12, 13.4]], "1");
        // Beine nach vorne ausgestreckt
        p.rechteck(13, 14, 4, 1, "4");
        p.rechteck(17, 13, 1, 2, "3");
        p.punkt(13, 10.2, "Y");
        p.punkt(14.6, 12, "4");
        kopf = [11.6, 6.6];
    } else {
        // auf dem Bauch liegen und mit den Fuessen wackeln, beim Schlafen liegt sie ruhig
        const schlaeft = pose === "schlafen";
        schwanz([7, 12.5], [4, 12], [3.4 + (schlaeft ? 0 : bild), 9.4 + (schlaeft ? 3 : 0)]);
        p.ellipse(10, 13.2, 4.6, 1.8, "3");
        if (schlaeft) {
            p.rechteck(2, 14, 4, 1, "4");
        } else {
            p.rechteck(5, 11 - bild, 1, 3 + bild, "4");
            p.punkt(5, 10 - bild, "3");
            p.rechteck(6, 12, 1, 2, "4");
        }
        p.rechteck(16, 14, 3, 1, "4");
        kopf = [15.2, schlaeft ? 11.6 : 10.8];
    }

    maedchenKopf(p, kopf[0], kopf[1], blinzelt || pose === "schlafen");
    p.umriss("7");
    return p.raster;
}

// Mantarochen von vorne: breite Fluegel, heller Bauch, zwei Augen und ein Laecheln.
// Er schwebt ueber dem Boden (Schatten) und schlaegt mit den Fluegeln, zum Schlafen legt er sich flach hin.
function mantaRaster(pose, bild, blinzelt) {
    const p = pixelRaster();
    const liegt = pose === "liegen" || pose === "schlafen";
    const laeuft = pose === "laufen";
    const schlag = liegt ? 1.2 : [0, -2, 0, 2][bild % 4] * (laeuft ? 1 : 0.6);
    const cy = liegt ? 11.4 : 7.2 - (laeuft ? 0 : bild % 2) * 0.6;

    if (!liegt) p.ellipse(11, 14.7, 6.5, 1, "s");
    p.vieleck([
        [0.4, cy - 1.6 + schlag], [4, cy - 2.4 + schlag * 0.5], [7.4, cy - 3.8], [14.6, cy - 3.8],
        [18, cy - 2.4 + schlag * 0.5], [21.6, cy - 1.6 + schlag], [17, cy + 0.8], [14, cy + 2.6],
        [8, cy + 2.6], [5, cy + 0.8]
    ], "2");
    // Bauch und Unterseite der Fluegel hell
    p.vieleck([[4, cy + 0.2], [8, cy + 1.2], [14, cy + 1.2], [18, cy + 0.2], [14, cy + 2.6], [8, cy + 2.6]], "4");
    p.unterkante("4");
    // Kopfflossen links und rechts vom Maul
    p.punkt(8, cy + 2.8, "3");
    p.punkt(14, cy + 2.8, "3");
    // helle Punkte auf dem Ruecken
    [[5, cy - 1], [9, cy - 2.6], [13, cy - 2.6], [17, cy - 1]].forEach(([x, y]) => p.punkt(x, y, "1"));
    const ay = Math.round(cy - 1);
    if (pose === "schlafen" || blinzelt) {
        p.punkt(8, ay, "7");
        p.punkt(14, ay, "7");
    } else {
        p.punkt(8, ay, "5");
        p.punkt(8, ay - 1, "w");
        p.punkt(14, ay, "5");
        p.punkt(14, ay - 1, "w");
    }
    p.punkt(7, ay + 1, "6");
    p.punkt(15, ay + 1, "6");
    // Laecheln
    p.punkt(10, ay + 1, "7");
    p.punkt(11, ay + 2, "7");
    p.punkt(12, ay + 1, "7");
    p.umriss("7");
    return p.raster;
}

const haustierUrlCache = {};

function haustierUrl(skin, pose, bild, blinzelt) {
    const anzahl = HAUSTIER_BILDER[pose] || 1;
    const nummer = bild % anzahl;
    const schluessel = [skin.id, pose, nummer, blinzelt ? 1 : 0].join("_");
    if (!haustierUrlCache[schluessel]) {
        const raster = skin.art === "manta" ? mantaRaster(pose, nummer, blinzelt)
            : skin.art === "maedchen" ? maedchenRaster(pose, nummer, blinzelt)
            : skin.art === "pinguin" ? pinguinRaster(pose, nummer, blinzelt)
                : katzenRaster(pose, nummer, blinzelt, skin.stil);
        const zeilen = raster.map(zeile => zeile.map(farbe => farbe || ".").join(""));
        haustierUrlCache[schluessel] = zeichneSprite(zeilen, { ...skin.farben, s: "rgba(0, 0, 0, 0.22)" }).toDataURL();
    }
    return haustierUrlCache[schluessel];
}

// ============================================================
// TAL-LANDSCHAFT: prozedural gezeichnete Pixel-Szene (Himmel, Berge, Huegel, Fluss, Wiese, Hof)
// breite/hoehe in Pixeln der Szene (wird spaeter mit image-rendering: pixelated hochskaliert)
// ============================================================

function zufallsGenerator(startwert) {
    let zustand = startwert;
    return () => {
        zustand = (zustand + 0x6D2B79F5) | 0;
        let t = Math.imul(zustand ^ (zustand >>> 15), 1 | zustand);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function zeichneTal(breite, hoehe) {
    const W = Math.max(64, Math.round(breite));
    const H = Math.max(32, Math.round(hoehe));
    const leinwand = document.createElement("canvas");
    leinwand.width = W;
    leinwand.height = H;
    const stift = leinwand.getContext("2d");
    const zufallsZahl = zufallsGenerator(20240917);
    const pixel = (x, y, farbe, b = 1, h = 1) => {
        stift.fillStyle = farbe;
        stift.fillRect(Math.round(x), Math.round(y), b, h);
    };

    // Talform: 0 in der Mitte, 1 am Rand -> Berge links und rechts hoch, in der Mitte offen
    const tal = x => Math.pow(Math.abs((x - W / 2) / (W / 2)), 1.25);
    const wellen = (x, staerke, versatz) =>
        (Math.sin(x * 0.07 + versatz) + Math.sin(x * 0.023 + versatz * 2.1) * 1.6 + Math.sin(x * 0.19 + versatz * 0.7) * 0.4) * staerke;

    // Himmel in Streifen (Pixel-Look)
    const himmel = ["#62b6ea", "#72bfee", "#83c8f1", "#95d1f3", "#a8daf5", "#bce3f8", "#d0ecfa"];
    const horizont = Math.round(H * 0.7);
    for (let y = 0; y < horizont; y++) {
        pixel(0, y, himmel[Math.min(himmel.length - 1, Math.floor((y / horizont) * himmel.length))], W, 1);
    }

    // Sonne
    const sonneX = Math.round(W * 0.84);
    const sonneY = Math.round(H * 0.3);
    for (let dy = -6; dy <= 6; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
            const d = Math.hypot(dx, dy);
            if (d <= 4.5) pixel(sonneX + dx, sonneY + dy, "#fff6c2");
            else if (d <= 6) pixel(sonneX + dx, sonneY + dy, "#ffe68a");
        }
    }

    // Wolken
    for (let i = 0; i < Math.max(3, Math.round(W / 90)); i++) {
        const wx = zufallsZahl() * W;
        const wy = H * 0.2 + zufallsZahl() * H * 0.25;
        const laenge = 10 + zufallsZahl() * 14;
        for (let k = 0; k < laenge; k += 2) {
            const r = 2 + Math.sin((k / laenge) * Math.PI) * 3;
            for (let dy = -r; dy <= r * 0.6; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy <= r * r) pixel(wx + k + dx, wy + dy, dy > r * 0.2 ? "#e6f3fb" : "#ffffff");
                }
            }
        }
    }

    // Ferne Berge mit Schneekappen
    const bergRoh = [];
    for (let x = 0; x < W; x++) {
        bergRoh.push(H * 0.62 - H * 0.42 * (0.22 + 0.78 * tal(x)) + wellen(x, H * 0.035, 1.3));
    }
    // geglaettet, damit die Silhouette ruhig wirkt und keine Streifen entstehen
    const bergHoehe = bergRoh.map((_, x) => {
        let summe = 0;
        let anzahl = 0;
        for (let i = Math.max(0, x - 4); i <= Math.min(W - 1, x + 4); i++) {
            summe += bergRoh[i];
            anzahl += 1;
        }
        return Math.round(summe / anzahl);
    });
    for (let x = 0; x < W; x++) {
        const y = bergHoehe[x];
        // Haenge, die nach rechts ansteigen, zeigen von der Sonne (rechts oben) weg und liegen im Schatten
        const schatten = bergHoehe[Math.min(W - 1, x + 6)] < bergHoehe[Math.max(0, x - 6)];
        pixel(x, y, schatten ? "#8294c2" : "#9aabd4", 1, H - y);
        if (y < H * 0.36) pixel(x, y, "#f4f8ff", 1, Math.max(1, Math.round((H * 0.36 - y) * 0.45)));
    }

    // Huegel mit Nadelbaeumen
    const huegelHoehe = [];
    for (let x = 0; x < W; x++) {
        huegelHoehe.push(Math.round(H * 0.8 - H * 0.3 * Math.pow(tal(x), 1.1) + wellen(x, H * 0.02, 4.2)));
    }
    for (let x = 0; x < W; x++) {
        const y = huegelHoehe[x];
        pixel(x, y, "#4f8f3e", 1, H - y);
        pixel(x, y, "#63a64b", 1, 1);
    }
    for (let x = 2; x < W - 2; x += 2 + Math.floor(zufallsZahl() * 5)) {
        if (tal(x) < 0.18 || zufallsZahl() < 0.25) continue;
        const basis = huegelHoehe[x] + 1;
        const hoeheBaum = 4 + Math.floor(zufallsZahl() * 4);
        for (let i = 0; i < hoeheBaum; i++) {
            const halb = Math.floor((i / hoeheBaum) * 2.2);
            pixel(x - halb, basis - hoeheBaum + i, i % 2 ? "#2f6b3a" : "#3b7d44", halb * 2 + 1, 1);
        }
        pixel(x, basis, "#5b3a22");
    }

    // Wiese vorne
    const wiesenHoehe = [];
    for (let x = 0; x < W; x++) {
        wiesenHoehe.push(Math.round(H * 0.9 - H * 0.12 * tal(x) + wellen(x, H * 0.01, 7.7)));
    }
    for (let x = 0; x < W; x++) {
        const y = wiesenHoehe[x];
        pixel(x, y, "#86c457", 1, H - y);
        pixel(x, y, "#9bd66a", 1, 1);
    }

    // Fluss: kommt aus dem Tal zwischen den Bergen und schlaengelt sich nach vorne
    const flussStart = huegelHoehe[Math.round(W / 2)];
    for (let y = flussStart; y < H; y++) {
        const fortschritt = (y - flussStart) / (H - flussStart);
        const mitte = W / 2 + Math.sin(y * 0.35) * (1 + fortschritt * 5);
        const halbeBreite = 0.6 + fortschritt * 4;
        for (let x = Math.floor(mitte - halbeBreite); x <= Math.ceil(mitte + halbeBreite); x++) {
            const rand = x <= mitte - halbeBreite + 0.8 || x >= mitte + halbeBreite - 0.8;
            pixel(x, y, rand ? "#3f8fcf" : "#5aa9e6");
        }
        if (zufallsZahl() < 0.25) pixel(mitte + (zufallsZahl() - 0.5) * halbeBreite, y, "#cdefff");
    }

    // Blumen und Grasbueschel auf der Wiese
    const blumen = ["#ffffff", "#ffd84a", "#ff8fb1", "#b48cff", "#ff6a5a"];
    for (let i = 0; i < W * 0.6; i++) {
        const x = Math.floor(zufallsZahl() * W);
        const yMin = wiesenHoehe[x] + 1;
        if (yMin >= H - 2) continue;
        const y = yMin + Math.floor(zufallsZahl() * (H - yMin - 1));
        if (Math.abs(x - W / 2) < 7) continue;
        if (zufallsZahl() < 0.4) pixel(x, y, blumen[Math.floor(zufallsZahl() * blumen.length)]);
        else pixel(x, y, "#6fae45", 1, 2);
    }

    // Bauernhaus links, Baeume daneben
    const haus = spriteLeinwand("haus");
    const hausX = Math.round(W * 0.2);
    stift.drawImage(haus, hausX, wiesenHoehe[hausX + 8] - haus.height + 3);
    const baum = spriteLeinwand("baum");
    [W * 0.12, W * 0.27, W * 0.7, W * 0.76].forEach(bx => {
        const x = Math.round(bx);
        stift.drawImage(baum, x, wiesenHoehe[Math.min(W - 1, x + 5)] - baum.height + 2);
    });

    return leinwand.toDataURL();
}

// ============================================================
// HOF-SZENE: Kopfbereich im Spiel. Himmel, Sonne, Wolken und Tag/Nacht kommen aus script.js,
// darum ist der Himmel hier durchsichtig. Gezeichnet werden Tal, Wiese, Gebaeude, Weg und Zaun.
// Rueckgabe: Bild + Positionen der Fenster (fuer das Nachtlicht), in Szenen-Pixeln.
// ============================================================

// Farben der Hof-Themen (Kosmetik im Haus). baum/busch = Sprite-Namen.
const HOF_FARBEN = {
    standard: {
        berge: ["#8294c2", "#9aabd4"], schnee: "#f4f8ff", huegel: ["#4f8f3e", "#63a64b"], nadel: ["#2f6b3a", "#3b7d44"],
        wiese: ["#86c457", "#9bd66a", "#8ccb5c"], halm: "#6fae45", weg: ["#b08a55", "#c9a46a"],
        blumen: ["#ffffff", "#ffd84a", "#ff8fb1", "#b48cff", "#ff6a5a"], baum: "baum", busch: "busch", sonnenblumen: true
    },
    kosmos: {
        berge: ["#2a1d5a", "#35257a"], schnee: "#c9b0f5", huegel: ["#1d2a5a", "#27366e"], nadel: ["#141a42", "#1d2560"],
        wiese: ["#233a6a", "#2b4478", "#26406f"], halm: "#1d3060", weg: ["#3a3f7a", "#4a4f8a"],
        blumen: ["#fff6a0", "#9fe8ff", "#ff9ad5", "#ffffff", "#c9b0f5"], baum: "baum_kosmos", busch: "busch_kosmos",
        kosmos: true
    },
    sommer: {
        berge: ["#7aa8e0", "#92bcec"], schnee: "#ffffff", huegel: ["#4f9f3a", "#66b84a"], nadel: ["#2f7a34", "#3b8a40"],
        wiese: ["#7cc84a", "#90d85a", "#84ce50"], halm: "#5aa83a", weg: ["#c09a60", "#d8b478"],
        blumen: ["#e8342a", "#ffd84a", "#5a8aff", "#ffffff", "#e8342a", "#ff8a2a"], baum: "baum_sommer", busch: "busch_sommer",
        sonnenblumen: true, weizenfeld: true
    },
    herbst: {
        berge: ["#8a8ab8", "#a3a3cc"], schnee: "#f4f8ff", huegel: ["#8f7a2e", "#a8903a"], nadel: ["#4a5a2a", "#5a6b30"],
        wiese: ["#a8ac4a", "#bcc05a", "#aeb452"], halm: "#8a8a3a", weg: ["#a8804a", "#c09a60"],
        blumen: ["#e8742a", "#d0402a", "#f0b030", "#8f3326", "#e8902a"], baum: "baum_herbst", busch: "busch_herbst", kuerbisse: true
    },
    fruehling: {
        berge: ["#8aa0d0", "#a6b8e0"], schnee: "#ffffff", huegel: ["#5fa84a", "#78c05c"], nadel: ["#2f7a3a", "#3b8a48"],
        wiese: ["#8fd06a", "#a4e07c", "#96d470"], halm: "#76ba50", weg: ["#c09a6a", "#d8b484"],
        blumen: ["#ffffff", "#ffc2da", "#ff94be", "#fff3b0", "#ffc2da"], baum: "baum_fruehling", busch: "busch_fruehling", sonnenblumen: true
    },
    wueste: {
        berge: ["#d8a060", "#e8b878"], schnee: "#fff0d0", huegel: ["#c8904a", "#d8a058"], nadel: ["#5a8a3a", "#6a9a4a"],
        wiese: ["#e8c890", "#f0d8a0", "#e0c080"], halm: "#b8904a", weg: ["#c89a5a", "#dab070"],
        blumen: ["#ff6a5a", "#ffd84a", "#ff8fb1"], baum: "baum_wueste", busch: "busch_wueste"
    },
    tropen: {
        berge: ["#5a9a8a", "#6aaa9a"], schnee: "#e8fff8", huegel: ["#2f8a4a", "#3a9a5a"], nadel: ["#1f6a3a", "#2a7a4a"],
        wiese: ["#5fc05a", "#72d06a", "#66c860"], halm: "#3f9a3a", weg: ["#e8d8a0", "#f5e8b8"],
        blumen: ["#ff5a8a", "#ffb030", "#ff6aff", "#ffffff"], baum: "baum_tropen", busch: "busch_tropen", sonnenblumen: true
    },
    zauberwald: {
        berge: ["#5a4a9a", "#6a5aaa"], schnee: "#c9b0f5", huegel: ["#2f6a6a", "#3a7a7a"], nadel: ["#1f4a5a", "#2a5a6a"],
        wiese: ["#3f8a7a", "#4f9a8a", "#45907f"], halm: "#2f6a5a", weg: ["#8a7ac0", "#a898d8"],
        blumen: ["#9fe8ff", "#ff9ad5", "#c9b0f5", "#fff6a0"], baum: "baum_zauberwald", busch: "busch_zauberwald", pilze: true
    },
    feuerwerk: {
        berge: ["#7a6aa8", "#8a7ab8"], schnee: "#ffe0ea", huegel: ["#3f7a3a", "#4f8a42"], nadel: ["#24503a", "#2f6044"],
        wiese: ["#7cbf58", "#8ccb66", "#80c45c"], halm: "#5a9a3e", weg: ["#a8603a", "#c87a4a"],
        blumen: ["#e8434a", "#ffd84a", "#ff8fb1", "#ffffff", "#e8434a"], baum: "baum_feuerwerk", busch: "busch_feuerwerk",
        chinesisch: true
    },
    winter: {
        berge: ["#9aa8c8", "#b8c4dc"], schnee: "#ffffff", huegel: ["#c9d6e6", "#dde8f4"], nadel: ["#2f5a4a", "#3b6b58"],
        wiese: ["#e8f0f8", "#ffffff", "#dde8f2"], halm: "#c9d6e6", weg: ["#b8c4d0", "#d0dae4"],
        blumen: ["#ffffff", "#cdefff", "#ffffff"], baum: "baum_winter", busch: "busch_winter", schneeDaecher: true
    }
};

function zeichneHof(breite, hoehe, thema = "standard") {
    const F = HOF_FARBEN[thema] || HOF_FARBEN.standard;
    const W = Math.max(64, Math.round(breite));
    const H = Math.max(32, Math.round(hoehe));
    const leinwand = document.createElement("canvas");
    leinwand.width = W;
    leinwand.height = H;
    const stift = leinwand.getContext("2d");
    const zufallsZahl = zufallsGenerator(777);
    const pixel = (x, y, farbe, b = 1, h = 1) => {
        stift.fillStyle = farbe;
        stift.fillRect(Math.round(x), Math.round(y), b, h);
    };
    const bild = (name, x, unten) => {
        const sprite = spriteLeinwand(name);
        const px = Math.round(x);
        const py = Math.round(unten - sprite.height);
        stift.drawImage(sprite, px, py);
        return { x: px, y: py, sprite };
    };
    const tal = x => Math.pow(Math.abs((x - W / 2) / (W / 2)), 1.3);
    const wellen = (x, staerke, versatz) =>
        (Math.sin(x * 0.05 + versatz) + Math.sin(x * 0.017 + versatz * 2.1) * 1.5) * staerke;

    const bodenY = Math.round(H * 0.5);
    const zaunOben = H - 7;

    // Tal im Hintergrund: Berge an den Seiten mit Schnee, Huegel mit Nadelbaeumen davor
    for (let x = 0; x < W; x++) {
        const y = Math.round(bodenY - 3 - H * 0.17 * tal(x) + wellen(x, H * 0.01, 1.3));
        pixel(x, y, x < W / 2 ? F.berge[0] : F.berge[1], 1, H - y);
        if (y < bodenY - H * 0.12) pixel(x, y, F.schnee, 1, 2);
    }
    const huegel = [];
    for (let x = 0; x < W; x++) {
        huegel.push(Math.round(bodenY - 1 - H * 0.06 * tal(x) + wellen(x, H * 0.008, 4.2)));
        pixel(x, huegel[x], F.huegel[0], 1, H - huegel[x]);
        pixel(x, huegel[x], F.huegel[1], 1, 1);
    }
    for (let x = 3; x < W - 3; x += 3 + Math.floor(zufallsZahl() * 6)) {
        if (zufallsZahl() < 0.3) continue;
        const basis = huegel[x] + 1;
        const hoeheBaum = 3 + Math.floor(zufallsZahl() * 3);
        for (let i = 0; i < hoeheBaum; i++) {
            const halb = Math.floor((i / hoeheBaum) * 2);
            pixel(x - halb, basis - hoeheBaum + i, i % 2 ? F.nadel[0] : F.nadel[1], halb * 2 + 1, 1);
        }
        if (thema === "winter") pixel(x, basis - hoeheBaum, "#ffffff");
    }

    // Grosse Hofwiese mit leichten Maehstreifen
    pixel(0, bodenY, F.wiese[0], W, H - bodenY);
    pixel(0, bodenY, F.wiese[1], W, 1);
    for (let y = bodenY + 3; y < zaunOben; y += 4) pixel(0, y, F.wiese[2], W, 2);

    const hausX = Math.round(W * 0.05);

    // Sommerhof: goldene Weizenfelder auf den Huegeln hinter der Wiese
    if (F.weizenfeld) {
        [[0.34, 0.5], [0.6, 0.9]].forEach(([a, b]) => {
            for (let x = Math.round(W * a); x < Math.round(W * b); x++) {
                for (let y = huegel[x] + 1; y < bodenY; y++) pixel(x, y, (x + 2 * y) % 5 === 0 ? "#d4a830" : "#ecc850");
                pixel(x, huegel[x], x % 2 ? "#f5dc70" : "#e0b440");
            }
        });
    }

    // Blumen und Grasbueschel (im Winter Schneeglitzer)
    for (let i = 0; i < W * 0.6; i++) {
        const x = Math.floor(zufallsZahl() * W);
        const y = bodenY + 2 + Math.floor(zufallsZahl() * (zaunOben - bodenY - 3));
        if (zufallsZahl() < 0.45) pixel(x, y, F.blumen[Math.floor(zufallsZahl() * F.blumen.length)]);
        else pixel(x, y, F.halm, 1, 2);
    }

    // Leuchtende Stellen (Laternen, Pilze): werden im Spiel als sanft pulsierender Schein darueber gelegt
    const leuchten = [];

    // Feuerwerksfest: Pagode mit geschwungenen Daechern am Wiesenrand
    if (F.chinesisch) {
        const cx = Math.round(W * 0.41);
        let y = bodenY + 3;
        [13, 9, 5].forEach(bw => {
            const links = cx - Math.floor(bw / 2);
            y -= 4;
            pixel(links, y, "#c42a30", bw, 4);
            pixel(links, y, "#8f1f2a", 1, 4);
            pixel(links + bw - 1, y, "#8f1f2a", 1, 4);
            pixel(links, y + 3, "#8f1f2a", bw, 1);
            pixel(cx, y + 1, "#ffd84a", 1, 2);
            leuchten.push({ x: cx, y: y + 1, b: 1, h: 2, farbe: "rgba(255, 210, 90, 0.9)" });
            // Dach mit hochgezogenen Ecken
            const rw = bw + 6;
            const rl = cx - Math.floor(rw / 2);
            y -= 2;
            pixel(rl + 1, y + 1, "#1f4a4a", rw - 2, 1);
            pixel(rl + 2, y, "#2f6a66", rw - 4, 1);
            pixel(rl, y, "#1f4a4a");
            pixel(rl + rw - 1, y, "#1f4a4a");
            pixel(rl + 1, y + 2, "#ffd84a", rw - 2, 1);
        });
        pixel(cx, y - 3, "#ffd84a", 1, 3);
        pixel(cx - 1, y - 1, "#ffd84a", 3, 1);
    }

    // Kosmische Nacht: Planet mit Ring am Himmel
    if (F.kosmos) {
        const px = Math.round(W * 0.86);
        const py = Math.round(bodenY * 0.62);
        for (let y = -4; y <= 4; y++) {
            for (let x = -4; x <= 4; x++) {
                const d = Math.hypot(x, y);
                if (d <= 4.2) pixel(px + x, py + y, d > 3.3 ? "#6a4aa0" : (x + y < -2 ? "#c9a0f0" : "#9a70d0"));
            }
        }
        for (let x = -7; x <= 7; x++) {
            const y = Math.round(x * 0.18);
            if (Math.abs(x) > 3 || y > 0) pixel(px + x, py + y + 1, Math.abs(x) > 5 ? "#e0b060" : "#ffd88a");
        }
        leuchten.push({ x: px - 4, y: py - 4, b: 9, h: 9, farbe: "rgba(200, 160, 255, 0.6)" });

    }

    // Hintere Reihe: Baeume und Buesche am Wiesenrand
    [0.17, 0.3, 0.52, 0.64, 0.73, 0.93].forEach(bx => bild(F.baum, W * bx, bodenY + 6));
    [0.12, 0.25, 0.36, 0.47, 0.58, 0.69, 0.88, 0.98].forEach(bx => bild(F.busch, W * bx, bodenY + 8));

    // Gebaeude
    const haus = bild("bauernhaus", hausX, H - 8);
    if (F.sonnenblumen) {
        bild("sonnenblume", hausX + 25, H - 7);
        bild("sonnenblume", hausX + 34, H - 8);
    }
    if (F.kuerbisse) {
        bild("kuerbis", hausX + 25, H - 6);
        bild("kuerbis", hausX + 33, H - 7);
    }
    const scheune = bild("scheune", W * 0.8, H - 8);
    bild("heu", scheune.x - 10, H - 8);
    bild("heu", scheune.x - 6, H - 13);
    bild("heu", scheune.x + scheune.sprite.width + 2, H - 8);
    bild(F.busch, W * 0.46, H - 7);
    bild(F.busch, W * 0.55, H - 7);
    if (F.schneeDaecher) {
        // Schnee auf den Daechern
        for (let x = 1; x < 23; x++) pixel(haus.x + x, haus.y + Math.max(1, 8 - Math.min(x, 22 - x)) - 1, "#ffffff");
        for (let x = 0; x < 20; x++) pixel(scheune.x + x, scheune.y + Math.max(0, 5 - Math.min(x, 19 - x) / 2), "#ffffff");
    }

    // Feuerwerksfest: rote Laternen an Schnueren zwischen roten Pfaehlen
    if (F.chinesisch) {
        [[0.29, 0.45], [0.55, 0.73]].forEach(([a, b]) => {
            const x1 = Math.round(W * a);
            const x2 = Math.round(W * b);
            const unten = bodenY + 10;
            const oben = unten - 13;
            [x1, x2].forEach(x => {
                pixel(x, oben, "#b8232a", 1, 13);
                pixel(x, oben - 1, "#ffd84a");
            });
            for (let x = x1 + 1; x < x2; x++) {
                const t = (x - x1) / (x2 - x1);
                pixel(x, oben + Math.round(Math.sin(t * Math.PI) * 3), "#3a2a2a");
            }
            for (let x = x1 + 4; x < x2 - 2; x += 5) {
                const t = (x - x1) / (x2 - x1);
                const ly = oben + Math.round(Math.sin(t * Math.PI) * 3) + 1;
                pixel(x, ly, "#ffd84a");
                pixel(x - 1, ly + 1, "#e8342a", 3, 3);
                pixel(x - 1, ly + 1, "#ff7a5a", 1, 2);
                pixel(x + 1, ly + 2, "#a81f1f", 1, 2);
                pixel(x, ly + 4, "#ffd84a");
                leuchten.push({ x: x - 1, y: ly + 1, b: 3, h: 3, farbe: "rgba(255, 90, 60, 0.85)" });
            }
        });
        // Boellerketten am Bauernhaus
        for (let i = 0; i < 6; i++) {
            pixel(haus.x - 1, haus.y + 9 + i, i % 2 ? "#e8342a" : "#b8232a");
            pixel(haus.x + haus.sprite.width, haus.y + 9 + i, i % 2 ? "#b8232a" : "#e8342a");
        }
        pixel(haus.x - 1, haus.y + 8, "#ffd84a");
        pixel(haus.x + haus.sprite.width, haus.y + 8, "#ffd84a");
    }

    // Zauberwald: leuchtende Pilze auf der Wiese
    if (F.pilze) {
        const hut = ["#9fe8ff", "#ff9ad5", "#c9b0f5", "#b8f07a"];
        [0.08, 0.34, 0.39, 0.61, 0.67, 0.86, 0.95].forEach((px, i) => {
            const x = Math.round(W * px);
            const y = bodenY + 9 + (i * 5) % Math.max(4, zaunOben - bodenY - 12);
            const farbe = hut[i % hut.length];
            pixel(x, y + 1, "#f4f0ff", 1, 2);
            pixel(x - 1, y - 1, farbe, 3, 2);
            pixel(x - 2, y, farbe, 5, 1);
            pixel(x - 1, y - 1, "#ffffff");
            leuchten.push({ x: x - 2, y: y - 1, b: 5, h: 2, farbe });
        });
    }

    // Zaun unten als Grenze zu den Feldern (beim Feuerwerksfest rot mit goldenen Kappen)
    const zaunDunkel = F.chinesisch ? "#7a1a1f" : "#6b3f1d";
    const zaunHell = F.chinesisch ? "#b8232a" : "#9a6a3a";
    pixel(0, H - 5, zaunDunkel, W, 1);
    pixel(0, H - 4, zaunHell, W, 1);
    pixel(0, H - 2, zaunDunkel, W, 1);
    for (let x = 1; x < W; x += 7) {
        pixel(x, H - 7, zaunHell, 2, 7);
        pixel(x, H - 7, thema === "winter" ? "#ffffff" : F.chinesisch ? "#ffd84a" : "#c08a50", 2, 1);
    }

    return {
        url: leinwand.toDataURL(),
        breite: W,
        hoehe: H,
        // Oberkante des Schornsteins (Spalten 16-17 im Bauernhaus-Sprite), dort steigt Rauch auf
        schornstein: { x: haus.x + 17, y: haus.y },
        // Fensterglas im Bauernhaus-Sprite (Spalten 4-5 und 18-19, Zeilen 11-12) und das Scheunenfenster
        lichter: [
            { x: haus.x + 4, y: haus.y + 11, b: 2, h: 2 },
            { x: haus.x + 18, y: haus.y + 11, b: 2, h: 2 },
            { x: scheune.x + 9, y: scheune.y + 7, b: 2, h: 1 }
        ],
        // Klickbereich des Hauses (fuer das Haus-Inventar), in Szenen-Pixeln
        haus: { x: haus.x, y: haus.y, b: haus.sprite.width, h: haus.sprite.height },
        leuchten
    };
}

// ---------- SAAT IN ANDEREN FORMEN (Kosmetik "Saat") ----------
// k = Rand, Y = Farbe, y = Schatten, w = Glanz, Z = Kern in der Farbe der Seltenheit
// Neue Formen: Klee, Pilz (Punkte in der Farbe der Seltenheit), Muschel, Laterne (E = Gold), Planet (E/e = Ring)
SPRITE_PIXEL.form_klee = [
    "..kkk..kkk..",
    ".kYwYkkYYyk.",
    ".kYYYYYYYyk.",
    "..kYYZZYyk..",
    ".kYYYZZYYyk.",
    ".kYwYYYYYyk.",
    ".kYYYkkYYyk.",
    "..kkk.kkkk..",
    "......kk....",
    ".......kk...",
    "........k...",
    "............"
];
SPRITE_PIXEL.form_pilz = [
    "...kkkkkk...",
    "..kYYwYYYk..",
    ".kYwwYYZYYk.",
    "kYYYYYZZZYyk",
    "kYZYYYYZYyyk",
    "kyyyyyyyyyyk",
    ".kkkkkkkkkk.",
    "....kwwk....",
    "....kwwk....",
    "....kwyk....",
    "...kkkkkk...",
    "............"
];
SPRITE_PIXEL.form_muschel = [
    "....kkkk....",
    "..kkYwYYkk..",
    ".kYwYyYYyYk.",
    "kYwYyYZYyYyk",
    "kYYyYZZZyYyk",
    "kYYyYZZZyYyk",
    ".kYyYYZYyYk.",
    "..kyYYYYyk..",
    "...kkyykk...",
    "....kyyk....",
    "....kkkk....",
    "............"
];
SPRITE_PIXEL.form_laterne = [
    ".....kk.....",
    "...kEEEEk...",
    "..kYYwYYYk..",
    ".kYwYYYYYyk.",
    ".kYYYZZYYyk.",
    ".kYYZZZZYyk.",
    ".kYYYZZYYyk.",
    ".kYYYYYYYyk.",
    "..kYYYYYyk..",
    "...kEEEEk...",
    ".....EE.....",
    "....E..E...."
];
SPRITE_PIXEL.form_planet = [
    "....kkkk....",
    "..kkYwYYkk..",
    ".kYwYYYYYyk.",
    ".kYYYZZYYyk.",
    "EkYYZZZZYykE",
    "eEEEEEEEEEEe",
    ".keeeeeeeek.",
    ".kYYYYYYyyk.",
    "..kkyyyykk..",
    "....kkkk....",
    "............",
    "............"
];
SPRITE_PIXEL.form_schneeflocke = [
    ".....kk.....",
    ".kk..YY..kk.",
    ".kYk.YY.kYk.",
    "..kYkYYkYk..",
    "...kYZZYk...",
    "kYYYZZZZYYYk",
    "kyyyZZZZyyyk",
    "...kyZZyk...",
    "..kykyykyk..",
    ".kyk.yy.kyk.",
    ".kk..yy..kk.",
    ".....kk....."
];
SPRITE_PIXEL.form_bonbon = [
    "............",
    "............",
    "kk........kk",
    "kYk.kkkk.kYk",
    "kYYkYwYYkYYk",
    ".kYkYZZYkYk.",
    ".kYkZZZZkYk.",
    "kyykyZZykyyk",
    "kyk.kkkk.kyk",
    "kk........kk",
    "............",
    "............"
];
SPRITE_PIXEL.form_mondsichel = [
    "...kkkk.....",
    ".kkYYYYk....",
    "kYwYYkk.....",
    "kYwYk...kk..",
    "kYYk...kZZk.",
    "kYYk...kZZk.",
    "kYYk....kk..",
    "kYyYk.......",
    "kyYyYkk.....",
    ".kkyyyyk....",
    "...kkkk.....",
    "............"
];
SPRITE_PIXEL.form_blitz = [
    "......kkkk..",
    ".....kYYk...",
    "....kYwk....",
    "...kYwk.....",
    "..kYZZkkkk..",
    ".kYZZZZZYk..",
    ".kkkkZZYk...",
    "....kYYk....",
    "...kYyk.....",
    "..kYyk......",
    ".kyk........",
    ".kk........."
];
SPRITE_PIXEL.form_blatt = [
    "........kkk.",
    "......kkYYk.",
    "....kkYYYYk.",
    "...kYYYwYyk.",
    "..kYYwYZYyk.",
    "..kYwYZZYyk.",
    ".kYYYZZYyk..",
    ".kYYZZYyk...",
    ".kYZYyyk....",
    ".kZkkkk.....",
    "kZk.........",
    "kk.........."
];
SPRITE_PIXEL.form_herz = [
    "..kk....kk..",
    ".kYYk..kYYk.",
    "kYwYYkkYYYyk",
    "kYwYYYYYYYyk",
    "kYYYYZZYYYyk",
    "kYYYZZZZYYyk",
    ".kYYZZZZYyk.",
    "..kYYZZYyk..",
    "...kYYYyk...",
    "....kYyk....",
    ".....kk.....",
    "............"
];
SPRITE_PIXEL.form_eichel = [
    ".....kk.....",
    "..kkkyykkk..",
    ".kyYyYyYyyk.",
    ".kyyyyyyyyk.",
    ".kkkkkkkkkk.",
    "..kYwYYYYk..",
    "..kwYZZYyk..",
    "..kYZZZZyk..",
    "..kYYZZYyk..",
    "...kYYYyk...",
    "....kyyk....",
    ".....kk....."
];
SPRITE_PIXEL.form_kristall = [
    "...kkkkkk...",
    "..kwwYYYyk..",
    ".kwwYYYYyyk.",
    "kkkkkkkkkkkk",
    "kYwYYZZYYyyk",
    ".kYwYZZYyyk.",
    "..kYYZZYyk..",
    "...kYYYyk...",
    "....kYyk....",
    ".....kk.....",
    "............",
    "............"
];
