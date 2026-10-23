const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const FFMPEG = "H:/!Desktop/Venray Studios/Coding/Tools/ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe";
const FFPROBE = FFMPEG.replace("ffmpeg.exe", "ffprobe.exe");
const ordner = path.join(__dirname, "clips");
fs.mkdirSync(path.join(__dirname, "blatt"), { recursive: true });
const nur = process.argv.slice(2);
for (const datei of fs.readdirSync(ordner).filter(d => d.endsWith(".mp4"))) {
  const name = datei.replace(".mp4", "");
  if (nur.length && !nur.includes(name)) continue;
  const dauer = Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(ordner, datei)]).toString());
  const rate = (9 / dauer).toFixed(3);
  execFileSync(FFMPEG, ["-v", "error", "-y", "-i", path.join(ordner, datei), "-vf",
    `fps=${rate},scale=640:-1,drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.6:fontfile='C\\:/Windows/Fonts/arial.ttf',tile=3x3`,
    "-frames:v", "1", path.join(__dirname, "blatt", name + ".png")]);
  console.log(name + " " + dauer.toFixed(2) + " s");
}
