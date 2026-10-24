"use strict";


const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { packager } = require("@electron/packager");

const HIER = __dirname;
const PROJEKT = path.resolve(HIER, "..");
const BUILD = path.join(HIER, "build");
const STEAM = process.argv.includes("--steam");
const RELEASE = process.argv.includes("--release") || STEAM;

function istSpielDatei(name) {
    if (name.startsWith("_") || name.startsWith(".")) return false;
    if (["js", "css"].includes(name)) return true;
    return /\.(html|js|css|png|jpg|ogg|mp3|wav|woff2?)$/i.test(name);
}

function kopiereSpiel() {
    const ziel = path.join(BUILD, "spiel");
    fs.rmSync(ziel, { recursive: true, force: true });
    fs.mkdirSync(ziel, { recursive: true });
    const ohneQuellen = quelle => !/\.(psd|kra|aseprite|ase|xcf)$/i.test(quelle);
    fs.readdirSync(PROJEKT).filter(istSpielDatei).forEach(name => {
        fs.cpSync(path.join(PROJEKT, name), path.join(ziel, name), { recursive: true, filter: ohneQuellen });
    });
    if (!fs.existsSync(path.join(ziel, "index.html"))) throw new Error("index.html fehlt im Projektordner");
    return ziel;
}

function packeZip(ordner, zipDatei, mitOrdner) {
    fs.rmSync(zipDatei, { force: true });
    const basis = mitOrdner ? path.dirname(ordner) : ordner;
    const inhalt = mitOrdner ? [path.basename(ordner)] : fs.readdirSync(ordner);
    execFileSync("tar", ["-a", "-c", "-f", zipDatei, "-C", basis, ...inhalt], { stdio: "inherit" });
}

const WINRAR = ["C:/Program Files/WinRAR/Rar.exe", "C:/Program Files (x86)/WinRAR/Rar.exe"].find(p => fs.existsSync(p));

function packeRar(ordner, rarDatei) {
    fs.rmSync(rarDatei, { force: true });
    execFileSync(WINRAR, ["a", "-r", "-ep1", "-m5", "-idq", rarDatei, ordner], { stdio: "inherit" });
}

function erstelleIcon() {
    const groessen = [16, 24, 32, 48, 64, 128, 256];
    const quelle = path.join(PROJEKT, "css", "bilder", "Icon.png");
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
    kopf.writeUInt16LE(0, 0);
    kopf.writeUInt16LE(1, 2);
    kopf.writeUInt16LE(bilder.length, 4);
    let start = kopf.length;
    bilder.forEach((bild, i) => {
        const g = groessen[i];
        const o = 6 + 16 * i;
        kopf.writeUInt8(g >= 256 ? 0 : g, o);
        kopf.writeUInt8(g >= 256 ? 0 : g, o + 1);
        kopf.writeUInt8(0, o + 2);
        kopf.writeUInt8(0, o + 3);
        kopf.writeUInt16LE(1, o + 4);
        kopf.writeUInt16LE(32, o + 6);
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

async function packeSpielFuerSteam(ordner) {
    const asar = require("@electron/asar");
    const archiv = path.join(BUILD, "spiel.asar");
    fs.rmSync(archiv, { force: true });
    await asar.createPackage(ordner, archiv);
    const vertrieb = path.join(BUILD, "vertrieb.txt");
    fs.writeFileSync(vertrieb, "steam", "utf8");
    return [archiv, vertrieb];
}

async function baue() {
    fs.mkdirSync(BUILD, { recursive: true });
    if ((RELEASE || STEAM) && !fs.existsSync(path.join(HIER, "geheim.txt"))) {
        throw new Error("desktop-app/geheim.txt fehlt (Schluessel fuer die Kaeufe). Einmal die Entwickler-Version starten oder die gesicherte Datei zurueckkopieren.");
    }
    const icon = erstelleIcon();
    let extra;
    if (STEAM) {
        extra = await packeSpielFuerSteam(kopiereSpiel());
    } else if (RELEASE) {
        extra = [kopiereSpiel()];
    } else {
        fs.writeFileSync(path.join(BUILD, "spielordner.txt"), PROJEKT, "utf8");
        extra = [path.join(BUILD, "spielordner.txt")];
    }
    const ausgabe = path.join(HIER, STEAM ? "dist-steam" : RELEASE ? "dist-release" : "dist");

    const ordner = await packager({
        dir: HIER,
        out: ausgabe,
        name: "Sproutvale",
        executableName: "Sproutvale",
        platform: "win32",
        arch: "x64",
        icon,
        overwrite: true,
        asar: { unpack: "**/*.{node,dll,so,dylib}" },
        prune: true,
        ignore: [/^\/dist($|\/)/, /^\/dist-release($|\/)/, /^\/dist-steam($|\/)/, /^\/build($|\/)/, /^\/baue-exe\.js$/,
            /^\/steam_appid\.txt$/, /^\/node_modules\/steamworks\.js\/dist\/(linux64|osx)($|\/)/],
        extraResource: extra,
        appCopyright: "© 2026 Venray Studios",
        win32metadata: {
            CompanyName: "Venray Studios",
            ProductName: "Sproutvale",
            FileDescription: "Sproutvale"
        }
    });

    if (STEAM) {
        const schoen = path.join(ausgabe, "Sproutvale");
        fs.rmSync(schoen, { recursive: true, force: true });
        fs.renameSync(ordner[0], schoen);
        console.log("\nFertig! Fuer SteamPipe (Steamworks) hochladen:\n  " + schoen);
        return;
    }
    if (RELEASE) {
        const windowsArchiv = path.join(ausgabe, WINRAR ? "Sproutvale.rar" : "Sproutvale.zip");
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
