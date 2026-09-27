"use strict";

// ============================================================
// Zwei Arten zu bauen (im Ordner desktop-app):
//
// "npm run exe"      Entwickler-Version (dist/Sproutvale-win32-x64) + Verknuepfung "Sproutvale.lnk".
//                    Die .exe laedt das Spiel aus DEINEM Projektordner (Pfad in resources/spielordner.txt).
//                    Nur fuer dich: auf anderen PCs gibt es diesen Ordner nicht.
//
// "npm run release"  Version zum Weitergeben (dist-release). Alle Spieldateien stecken in resources/spiel.
//                    Dazu entsteht dist-release/Sproutvale.rar zum Hochladen (ZIP, falls WinRAR fehlt).
//                    Darin: Ordner "Sproutvale" mit Sproutvale.exe. F12 (Debug-Fenster) geht auch dort, Strg+Umschalt+F12 = Entwickler-Werkzeuge.
// ============================================================

const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { packager } = require("@electron/packager");

const HIER = __dirname;
const PROJEKT = path.resolve(HIER, "..");
const BUILD = path.join(HIER, "build");
const RELEASE = process.argv.includes("--release");

// Diese Dateien und Ordner gehoeren zum Spiel (Test-Dateien mit "_" am Anfang bleiben draussen)
function istSpielDatei(name) {
    if (name.startsWith("_") || name.startsWith(".")) return false;
    if (["js", "css", "assets"].includes(name)) return true;
    return /\.(html|js|css|png|jpg|ogg|mp3|wav|woff2?)$/i.test(name);
}

// Kopiert das Spiel nach build/spiel (wird in der Release-Version zu resources/spiel)
function kopiereSpiel() {
    const ziel = path.join(BUILD, "spiel");
    fs.rmSync(ziel, { recursive: true, force: true });
    fs.mkdirSync(ziel, { recursive: true });
    fs.readdirSync(PROJEKT).filter(istSpielDatei).forEach(name => {
        fs.cpSync(path.join(PROJEKT, name), path.join(ziel, name), { recursive: true });
    });
    if (!fs.existsSync(path.join(ziel, "index.html"))) throw new Error("index.html fehlt im Projektordner");
    return ziel;
}

// ZIP mit dem in Windows eingebauten tar.exe (ZIP oeffnet Windows ohne Zusatzprogramm, anders als RAR).
// tar schreibt Pfade mit "/", damit auch der Linux-Server von itch.io die Ordner (z.B. fonts) richtig entpackt.
// mitOrdner = true: im ZIP liegt ein Ordner (beim Entpacken entsteht nicht ein Haufen loser Dateien)
function packeZip(ordner, zipDatei, mitOrdner) {
    fs.rmSync(zipDatei, { force: true });
    const basis = mitOrdner ? path.dirname(ordner) : ordner;
    const inhalt = mitOrdner ? [path.basename(ordner)] : fs.readdirSync(ordner);
    execFileSync("tar", ["-a", "-c", "-f", zipDatei, "-C", basis, ...inhalt], { stdio: "inherit" });
}

// RAR mit WinRAR (falls installiert), sonst ZIP. Im Archiv liegt der Ordner "Sproutvale" mit allem darin.
const WINRAR = ["C:/Program Files/WinRAR/Rar.exe", "C:/Program Files (x86)/WinRAR/Rar.exe"].find(p => fs.existsSync(p));

function packeRar(ordner, rarDatei) {
    fs.rmSync(rarDatei, { force: true });
    // a = hinzufuegen, -r = mit Unterordnern, -ep1 = Pfad vor dem Ordner weglassen, -m5 = beste Kompression
    execFileSync(WINRAR, ["a", "-r", "-ep1", "-m5", "-idq", rarDatei, ordner], { stdio: "inherit" });
}

// Macht aus assets/Icon.png ein Windows-Icon mit allen ueblichen Groessen (scharf in Taskleiste, Explorer und Desktop)
function erstelleIcon() {
    const groessen = [16, 24, 32, 48, 64, 128, 256];
    const quelle = path.join(PROJEKT, "assets", "Icon.png");
    const befehl = ["Add-Type -AssemblyName System.Drawing;", `$q = [System.Drawing.Image]::FromFile('${quelle}');`];
    groessen.forEach(g => {
        const ziel = path.join(BUILD, "icon-" + g + ".png");
        befehl.push(
            `$b = New-Object System.Drawing.Bitmap ${g}, ${g};`,
            "$gr = [System.Drawing.Graphics]::FromImage($b);",
            "$gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;",
            "$gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality;",
            `$gr.DrawImage($q, 0, 0, ${g}, ${g});`,
            `$b.Save('${ziel}', [System.Drawing.Imaging.ImageFormat]::Png);`,
            "$gr.Dispose(); $b.Dispose();"
        );
    });
    befehl.push("$q.Dispose();");
    execFileSync("powershell.exe", ["-NoProfile", "-Command", befehl.join(" ")], { stdio: "inherit" });

    const bilder = groessen.map(g => fs.readFileSync(path.join(BUILD, "icon-" + g + ".png")));
    const kopf = Buffer.alloc(6 + 16 * bilder.length);
    kopf.writeUInt16LE(0, 0);                 // reserviert
    kopf.writeUInt16LE(1, 2);                 // Typ: Icon
    kopf.writeUInt16LE(bilder.length, 4);     // Anzahl Bilder
    let start = kopf.length;
    bilder.forEach((bild, i) => {
        const g = groessen[i];
        const o = 6 + 16 * i;
        kopf.writeUInt8(g >= 256 ? 0 : g, o);      // Breite (0 = 256)
        kopf.writeUInt8(g >= 256 ? 0 : g, o + 1);  // Hoehe
        kopf.writeUInt8(0, o + 2);                 // Farbpalette
        kopf.writeUInt8(0, o + 3);                 // reserviert
        kopf.writeUInt16LE(1, o + 4);              // Farbebenen
        kopf.writeUInt16LE(32, o + 6);             // Bits pro Pixel
        kopf.writeUInt32LE(bild.length, o + 8);
        kopf.writeUInt32LE(start, o + 12);
        start += bild.length;
    });
    const ico = path.join(BUILD, "icon.ico");
    fs.writeFileSync(ico, Buffer.concat([kopf, ...bilder]));
    return ico;
}

function erstelleVerknuepfung(exe) {
    const lnk = path.join(PROJEKT, "Sproutvale.lnk");
    // Windows merkt sich Icons ueber den Pfad: jede Version bekommt eine eigene Icon-Datei,
    // sonst zeigt die Verknuepfung nach einem neuen Icon.png weiter das alte Bild
    fs.readdirSync(BUILD).filter(n => /^verknuepfung-\d+\.ico$/.test(n)).forEach(n => fs.rmSync(path.join(BUILD, n)));
    const icon = path.join(BUILD, "verknuepfung-" + Date.now() + ".ico");
    fs.copyFileSync(path.join(BUILD, "icon.ico"), icon);
    fs.rmSync(lnk, { force: true });
    const befehl = [
        "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('" + lnk + "');",
        "$s.TargetPath = '" + exe + "';",
        "$s.WorkingDirectory = '" + path.dirname(exe) + "';",
        "$s.IconLocation = '" + icon + ",0';",
        "$s.Description = 'Sproutvale starten';",
        "$s.Save();"
    ].join(" ");
    execFileSync("powershell.exe", ["-NoProfile", "-Command", befehl], { stdio: "inherit" });
    return lnk;
}

async function baue() {
    fs.mkdirSync(BUILD, { recursive: true });
    const icon = erstelleIcon();
    let extra;
    if (RELEASE) {
        extra = [kopiereSpiel()];
    } else {
        fs.writeFileSync(path.join(BUILD, "spielordner.txt"), PROJEKT, "utf8");
        extra = [path.join(BUILD, "spielordner.txt")];
    }
    const ausgabe = path.join(HIER, RELEASE ? "dist-release" : "dist");

    const ordner = await packager({
        dir: HIER,
        out: ausgabe,
        name: "Sproutvale",
        executableName: "Sproutvale",
        platform: "win32",
        arch: "x64",
        icon,
        overwrite: true,
        asar: true,
        prune: true,
        ignore: [/^\/dist($|\/)/, /^\/dist-release($|\/)/, /^\/build($|\/)/, /^\/baue-exe\.js$/],
        extraResource: extra,
        appCopyright: "Venray Studios",
        win32metadata: {
            CompanyName: "Venray Studios",
            ProductName: "Sproutvale",
            FileDescription: "Sproutvale"
        }
    });

    if (RELEASE) {
        const windowsArchiv = path.join(ausgabe, WINRAR ? "Sproutvale.rar" : "Sproutvale.zip");
        // Ordner schoen benennen, damit beim Entpacken "Sproutvale" entsteht
        const schoen = path.join(ausgabe, "Sproutvale");
        fs.rmSync(schoen, { recursive: true, force: true });
        fs.renameSync(ordner[0], schoen);
        if (WINRAR) packeRar(schoen, windowsArchiv);
        else packeZip(schoen, windowsArchiv, true);
        console.log("\nFertig! Zum Hochladen (itch.io, Download):\n  " + windowsArchiv);
        return;
    }
    const exe = path.join(ordner[0], "Sproutvale.exe");
    const lnk = erstelleVerknuepfung(exe);
    console.log("\nFertig!\n  Programm:     " + exe + "\n  Verknuepfung: " + lnk);
}

baue().catch(fehler => {
    console.error("Bauen fehlgeschlagen:", fehler);
    process.exit(1);
});
