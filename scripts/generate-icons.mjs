// Generates the PWA / home-screen PNG icons from public/icon.svg.
//   node scripts/generate-icons.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "icons");
fs.mkdirSync(OUT, { recursive: true });

const icon = fs.readFileSync(path.join(ROOT, "public", "icon.svg"));

// Maskable: full-bleed oak background, glass shrunk into the 80% safe zone (Android crops to circles/squircles).
const glass = icon
  .toString()
  .replace(/<rect width="512" height="512" rx="112"[^>]*\/>/g, "")
  .replace(/<svg[^>]*>/, "")
  .replace("</svg>", "")
  .replace(/<defs>[\s\S]*<\/defs>/, "");
const maskable = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="oak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2f1c"/><stop offset="1" stop-color="#3a2416"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy="1.05" r=".7"><stop offset="0" stop-color="#e8a046" stop-opacity=".55"/><stop offset="1" stop-color="#e8a046" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#oak)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
  <g transform="translate(76.8 76.8) scale(0.7)">${glass}</g>
</svg>`);

const jobs = [
  [icon, "icon-192.png", 192],
  [icon, "icon-512.png", 512],
  [maskable, "maskable-512.png", 512],
  [maskable, "apple-touch-icon.png", 180],
];
for (const [src, name, size] of jobs) {
  await sharp(src).resize(size, size).png().toFile(path.join(OUT, name));
  console.log(name);
}
