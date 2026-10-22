const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const FFMPEG = "H:/!Desktop/Venray Studios/Coding/Tools/ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe";
const B = 60 / 112 * 4;
const C = n => path.join(__dirname, "clips", n + ".mp4");

const PLAN = [
  ["intro", 1.35, 2, { verlaengern: true }],
  ["menue", 1.0, 1, { blitz: true }],
  ["iris", 0.55, 0.5],
  ["kombo", 1.5, 1, { zoom: 1.35, fx: 0.5, fy: 0.68 }],
  ["ernte", 0.3, 1, { zoom: 1.22, fx: 0.5, fy: 0.62 }],
  ["goldregen", 0.4, 1, { zoom: 1.12, fx: 0.4, fy: 0.5 }],
  ["fieber", 0.2, 1, { zoom: 1.15, fx: 0.55, fy: 0.55 }],
  ["markt", 0.4, 0.5],
  ["stellarium", 0.3, 1, { zoom: 1.15, fx: 0.45, fy: 0.5 }],
  ["gluecksspiel", 0.6, 1, { zoom: 1.45, fx: 0.42, fy: 0.3 }],
  ["segen", 0.1, 1, { zoom: 1.2, fx: 0.5, fy: 0.5 }],
  ["regenbogen", 0.2, 1],
  ["nacht", 1.0, 1, { zoom: 1.1, fx: 0.5, fy: 0.3 }],
  ["haus", 0.4, 1],
  ["profil", 0.5, 1, { zoom: 1.25, fx: 0.5, fy: 0.45 }],
  ["mondteich", 0.8, 1],
  ["stellarium", 1.2, 1, { zoom: 1.5, fx: 0.35, fy: 0.45 }],
  ["pokal", 0.3, 1, { zoom: 1.35, fx: 0.5, fy: 0.42 }],
  ["kombo", 4.0, 0.5, { zoom: 1.5, fx: 0.5, fy: 0.68, blitz: true }],
  ["goldregen", 3.0, 0.5, { zoom: 1.25, fx: 0.4, fy: 0.55 }],
  ["stellarium", 1.6, 0.5, { zoom: 1.3, fx: 0.5, fy: 0.5 }],
  ["gluecksspiel", 1.9, 0.5, { zoom: 1.6, fx: 0.42, fy: 0.3 }],
  ["haus", 2.6, 0.5, { zoom: 1.3, fx: 0.5, fy: 0.5 }],
  ["pokal", 1.3, 0.5, { zoom: 1.6, fx: 0.5, fy: 0.42 }],
  ["profil", 2.6, 0.5, { zoom: 1.4, fx: 0.4, fy: 0.45 }],
  ["nacht", 2.6, 0.5, { zoom: 1.25, fx: 0.4, fy: 0.25 }],
  ["menue", 2.0, 0.5, { zoom: 1.3, fx: 0.5, fy: 0.3 }],
  ["segen", 1.1, 0.5, { zoom: 1.3, fx: 0.5, fy: 0.5 }],
  ["ernte", 3.6, 0.5, { zoom: 1.35, fx: 0.3, fy: 0.6 }],
  ["kombo", 5.4, 0.5, { zoom: 1.6, fx: 0.5, fy: 0.68 }],
  ["ende", 0.0, 1, { blitz: true, ende: true }]
];

const args = ["-v", "error", "-y"];
const filter = [];
const namen = [];
let gesamtTakte = 0;
PLAN.forEach(([clip, start, takte, opt = {}], i) => {
  const dauer = opt.ende ? takte * B + 1.5 : takte * B;
  gesamtTakte += takte;
  args.push("-i", C(clip));
  let f = `[${i}:v]trim=start=${start}:duration=${dauer.toFixed(4)},setpts=PTS-STARTPTS,fps=30`;
  if (opt.ende || opt.verlaengern) f = `[${i}:v]trim=start=${start},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=4,trim=duration=${dauer.toFixed(4)}`;
  if (opt.zoom) {
    const n = Math.round(dauer * 30);
    f += `,scale=1920:1080,zoompan=z='1+(${opt.zoom}-1)*(0.35+0.65*on/${n})':x='(iw-iw/zoom)*${opt.fx}':y='(ih-ih/zoom)*${opt.fy}':d=1:s=1920x1080:fps=30`;
  }
  f += `,scale=1920:1080,setsar=1,format=yuv420p`;
  if (opt.blitz) f += `,fade=t=in:st=0:d=0.22:color=white`;
  f += `[v${i}]`;
  filter.push(f);
  namen.push(`[v${i}]`);
});
const textIndex = PLAN.length;
args.push("-loop", "1", "-t", "6", "-i", path.join(__dirname, "endtext.png"));
const startEnde = (gesamtTakte - 1) * B;
filter.push(`${namen.join("")}concat=n=${PLAN.length}:v=1:a=0[film]`);
filter.push(`[${textIndex}:v]format=rgba,fade=t=in:st=0:d=0.35:alpha=1,setpts=PTS-STARTPTS+${(startEnde + 0.9).toFixed(3)}/TB[text]`);
filter.push(`[film][text]overlay=0:0:enable='gte(t,${(startEnde + 0.9).toFixed(3)})':eof_action=pass,format=yuv420p[ausgang]`);
const ziel = path.join(__dirname, "trailer-ohne-ton.mp4");
args.push("-filter_complex", filter.join(";"), "-map", "[ausgang]", "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", "30", ziel);
execFileSync(FFMPEG, args, { stdio: "inherit", maxBuffer: 1 << 26 });
console.log("Takte: " + gesamtTakte + ", Laenge " + (gesamtTakte * B + 1.5).toFixed(2) + " s");
