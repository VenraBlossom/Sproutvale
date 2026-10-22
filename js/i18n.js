"use strict";


const SPRACHEN = [
    { id: "en", name: "English" },
    { id: "de", name: "Deutsch" },
    { id: "es", name: "Español" },
    { id: "fr", name: "Français" },
    { id: "it", name: "Italiano" },
    { id: "pt", name: "Português (Brasil)" },
    { id: "nl", name: "Nederlands" },
    { id: "pl", name: "Polski" },
    { id: "tr", name: "Türkçe" },
    { id: "ru", name: "Русский" },
    { id: "uk", name: "Українська" },
    { id: "ja", name: "日本語" },
    { id: "zh", name: "简体中文" },
    { id: "ko", name: "한국어" }
];
const SPRACHEN_BALD = [];

const SPRACHE = (() => {
    try {
        const gespeichert = JSON.parse(localStorage.getItem("sproutvale_einstellungen"));
        if (gespeichert && SPRACHEN.some(s => s.id === gespeichert.sprache)) return gespeichert.sprache;
        if (gespeichert) return "de";
    } catch (fehler) {
        console.warn("Sprache nicht lesbar", fehler);
    }
    const system = (navigator.languages || [navigator.language || ""]).map(l => String(l).toLowerCase().slice(0, 2));
    return system.find(id => SPRACHEN.some(s => s.id === id)) || "en";
})();

const SPRACH_LOCALE = { en: "en-US", de: "de-DE", es: "es-ES", fr: "fr-FR", it: "it-IT", pt: "pt-BR", nl: "nl-NL", pl: "pl-PL",
    tr: "tr-TR", ru: "ru-RU", uk: "uk-UA", ja: "ja-JP", zh: "zh-CN", ko: "ko-KR" }[SPRACHE] || "en-US";
document.documentElement.lang = SPRACHE;

const UEBERSETZUNG = {};

const TOUCH_GERAET = Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
document.documentElement.classList.toggle("touch", TOUCH_GERAET);
const TOUCH_WOERTER = {
    de: [[/Fahr über die Jahreszeiten-Uhr/g, "Tippe auf die Jahreszeiten-Uhr"], [/Fahr mit der Maus über/g, "Wisch mit dem Finger über"], [/Halte die Maus auf dem Samenladen gedrückt/g, "Halte den Finger auf dem Samenladen"],
        [/Maus auf dem Samenladen gedrückt halten/g, "Finger auf dem Samenladen halten"],
        [/Rechtsklick/g, "Lange tippen"], [/Linksklick/g, "Tippen"], [/Mausrad/g, "zwei Finger"]],
    en: [[/Hover over the season clock/g, "Tap the season clock"], [/Move the mouse over/g, "Swipe your finger over"], [/Hold the mouse button on the seed stall/g, "Hold your finger on the seed stall"],
        [/hold the mouse on the seed stall/g, "hold your finger on the seed stall"], [/Right-click/g, "Long-press"], [/right-click/g, "long-press"], [/right click/g, "long press"], [/Left-click/g, "Tap"],
        [/left-click/g, "tap"], [/left click/g, "tap"], [/mouse wheel/g, "two fingers"]],
    es: [[/Pasa el ratón sobre el reloj de estaciones/g, "Toca el reloj de estaciones"], [/Pasa el ratón sobre/g, "Desliza el dedo sobre"], [/Mantén pulsado el botón del ratón sobre/g, "Mantén el dedo sobre"],
        [/mantén el ratón sobre/g, "mantén el dedo sobre"], [/Clic derecho/g, "Pulsación larga"], [/clic derecho/g, "pulsación larga"], [/Clic izquierdo/g, "Toque"], [/clic izquierdo/g, "toque"],
        [/rueda del ratón/g, "dos dedos"]],
    fr: [[/Survole l'horloge des saisons/g, "Touche l'horloge des saisons"], [/Passe la souris sur/g, "Glisse le doigt sur"], [/Maintiens le bouton de la souris sur/g, "Garde le doigt sur"],
        [/maintiens la souris sur/g, "garde le doigt sur"], [/Clic droit/g, "Appui long"], [/clic droit/g, "appui long"], [/Clic gauche/g, "Toucher"], [/clic gauche/g, "toucher"], [/molette/g, "deux doigts"]],
    it: [[/Passa sopra l'orologio delle stagioni/g, "Tocca l'orologio delle stagioni"], [/Passa il mouse sulle/g, "Scorri il dito sulle"], [/Tieni premuto il mouse sulla/g, "Tieni il dito sulla"],
        [/tieni premuto il mouse sulla/g, "tieni il dito sulla"], [/Clic destro/g, "Pressione lunga"], [/clic destro/g, "pressione lunga"], [/clic sinistro/g, "tocco"], [/la rotella/g, "due dita"]],
    pt: [[/Passe o mouse sobre o relógio das estações/g, "Toque no relógio das estações"], [/Passe o mouse sobre/g, "Deslize o dedo sobre"], [/Segure o mouse na/g, "Segure o dedo na"],
        [/segure o mouse na/g, "segure o dedo na"], [/Clique direito/g, "Toque longo"], [/clique direito/g, "toque longo"], [/clique esquerdo/g, "toque"], [/a roda do mouse/g, "dois dedos"]],
    nl: [[/Ga over de seizoensklok/g, "Tik op de seizoensklok"], [/Ga met de muis over/g, "Veeg met je vinger over"], [/Houd de muis ingedrukt op/g, "Houd je vinger op"],
        [/houd de muis ingedrukt op/g, "houd je vinger op"], [/Rechtsklik/g, "Lang tikken"], [/rechtsklik/g, "lang tikken"], [/linksklik/g, "tikken"], [/het muiswiel/g, "twee vingers"]],
    pl: [[/Najedź na zegar pór roku/g, "Dotknij zegara pór roku"], [/Najedź myszą na/g, "Przesuń palcem po"], [/Przytrzymaj mysz na/g, "Przytrzymaj palec na"],
        [/przytrzymaj mysz na/g, "przytrzymaj palec na"], [/Prawy klik/g, "Długie dotknięcie"], [/prawy klik/g, "długie dotknięcie"], [/lewy klik/g, "dotknięcie"], [/kółko myszy/g, "dwa palce"]],
    tr: [[/fareyi damlaların ve yıldız damlalarının üzerinden geçir/g, "parmağını damlaların ve yıldız damlalarının üzerinden kaydır"], [/Fareyi tohum tezgâhında basılı tut/g, "Parmağını tohum tezgâhında basılı tut"],
        [/fareyi tohum tezgâhında basılı tut/g, "parmağını tohum tezgâhında basılı tut"], [/Sağ tık/g, "Uzun dokunuş"], [/sağ tık/g, "uzun dokunuş"], [/sol tık/g, "dokunuş"], [/fare tekerleği/g, "iki parmak"]],
    ru: [[/Наведи на часы сезонов/g, "Нажми на часы сезонов"], [/Проведи мышью над/g, "Проведи пальцем над"], [/Зажми мышь на/g, "Зажми палец на"],
        [/зажми мышь на/g, "зажми палец на"], [/Правый клик/g, "Долгое нажатие"], [/правый клик/g, "долгое нажатие"], [/левый клик/g, "касание"], [/колесо мыши/g, "два пальца"]],
    uk: [[/Наведи на годинник сезонів/g, "Натисни на годинник сезонів"], [/Проведи мишею над/g, "Проведи пальцем над"], [/Затисни мишу на/g, "Затисни палець на"],
        [/затисни мишу на/g, "затисни палець на"], [/Правий клац/g, "Довге натискання"], [/правий клац/g, "довге натискання"], [/лівий клац/g, "дотик"], [/колесо миші/g, "два пальці"]],
    ja: [[/カーソルを合わせると/g, "タップすると"], [/の上にマウスを動かして/g, "の上を指でなぞって"], [/でマウスを押したままにすると/g, "を指で押したままにすると"],
        [/でマウスを押し続けると/g, "を指で押し続けると"], [/右クリック/g, "長押し"], [/左クリック/g, "タップ"], [/マウスホイール/g, "2本指"]],
    zh: [[/将鼠标悬停在/g, "点按"], [/将鼠标移到/g, "用手指划过"], [/按住鼠标/g, "按住手指"], [/右键/g, "长按"], [/左键/g, "点按"], [/鼠标滚轮/g, "双指"]],
    ko: [[/에 마우스를 올리면/g, "을 누르면"], [/위로 마우스를 움직여서/g, "위로 손가락을 쓸어서"], [/에서 마우스를 누르고 있으면/g, "을 손가락으로 누르고 있으면"],
        [/우클릭/g, "길게 누르기"], [/좌클릭/g, "탭"], [/마우스 휠/g, "두 손가락"]]
};
function touchText(text) {
    if (!TOUCH_GERAET || typeof text !== "string") return text;
    return (TOUCH_WOERTER[SPRACHE] || []).reduce((s, [muster, ersatz]) => s.replace(muster, ersatz), text);
}

function t(text) {
    if (SPRACHE === "de") return touchText(text);
    const uebersetzt = UEBERSETZUNG[text];
    return touchText(uebersetzt !== undefined ? uebersetzt : text);
}

function tf(text, ...werte) {
    return t(text).replace(/\{(\d+)\}/g, (_, i) => werte[Number(i)]);
}

function uebersetzeDokument(wurzel) {
    if (SPRACHE === "de" && !TOUCH_GERAET) return;
    const laeufer = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
    const knoten = [];
    while (laeufer.nextNode()) knoten.push(laeufer.currentNode);
    knoten.forEach(k => {
        const roh = k.nodeValue;
        const text = roh.split(/\s+/).join(" ").trim();
        if (!text) return;
        const neu = t(text);
        if (neu === text) return;
        const vorne = roh.match(/^\s*/)[0].length ? " " : "";
        const hinten = roh.match(/\s*$/)[0].length ? " " : "";
        k.nodeValue = vorne + neu + hinten;
    });
    ["data-tipp", "placeholder", "title", "alt"].forEach(attribut => {
        wurzel.querySelectorAll("[" + attribut + "]").forEach(el => {
            const wert = el.getAttribute(attribut);
            const neu = t(wert);
            if (neu !== wert) el.setAttribute(attribut, neu);
        });
    });
}
