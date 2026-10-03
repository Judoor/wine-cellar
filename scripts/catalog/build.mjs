// Builds catalog/catalog.db.gz, the offline wine catalog shipped with the app.
//
//   node scripts/catalog/build.mjs
//
// Sources (downloaded to .cache/catalog on first run):
//  - X-Wines (CC0) — 100k wines: https://github.com/rogerioxavier/X-Wines
//  - INAO via data.gouv.fr (Licence Ouverte) — French AOP/IGP appellations.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import Database from "better-sqlite3";
import { FOOD_NAMES, FOOD_WORDS, PAIRINGS, regionFor, XWINES_COLORS, XWINES_FR_ALIASES, XWINES_FR_APPELLATION_REGIONS, XWINES_FR_REGIONS } from "./regions.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CACHE = path.join(ROOT, ".cache/catalog");
const OUT_DIR = path.join(ROOT, "catalog");

const SOURCES = {
  xwines: "https://drive.usercontent.google.com/download?id=1uEEipmKNxdiKUAhjH-K14JOSQ2BLRFss&export=download&confirm=t",
  inaoProducts: "https://static.data.gouv.fr/resources/aires-et-produits-aoc-aop-et-igp/20251009-122906/2025-03-10-comagri-aires-produits.csv",
  inaoCommunes: "https://static.data.gouv.fr/resources/aires-geographiques-des-aoc-aop/20251009-122320/2025-10-09-comagri-communes-aires-ao.csv",
};

async function download(name, url) {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file)) return file;
  console.log(`Downloading ${name}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

/* ---------- Parsing helpers ---------- */

function* csvRows(text, sep = ",") {
  let field = "", row = [], quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field.trim()); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "").trim()); yield row; row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field.trim()); yield row; }
}

const pyList = (s) =>
  s.replace(/^\[|\]$/g, "").split(/,\s*(?=['"])/).map((x) => x.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);

const normalize = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b1er\b/g, "premier")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* ---------- INAO appellations ---------- */

function loadAppellations(productsFile, communesFile) {
  const decode = (f) => new TextDecoder("windows-1252").decode(fs.readFileSync(f));
  const products = [...csvRows(decode(productsFile), ";")].slice(1);
  const communes = [...csvRows(decode(communesFile), ";")].slice(1);

  const departments = new Map();
  for (const [, dep, , , , ida] of communes) {
    if (!ida) continue;
    const counts = departments.get(ida) ?? {};
    counts[dep] = (counts[dep] ?? 0) + 1;
    departments.set(ida, counts);
  }

  const areas = new Map();
  for (const [ida, area, signFr, signEu, , product] of products) {
    const sign = `${signFr}/${signEu}`;
    if (!["AOC/AOP", "/IGP", "AOC/", "/AOP"].includes(sign)) continue; // excludes spirits (IG), Label Rouge, STG
    if (!areas.has(ida)) areas.set(ida, { name: area, sign: signEu || "AOP", products: [] });
    areas.get(ida).products.push(product);
  }

  const result = [];
  for (const [ida, a] of areas) {
    if (FOOD_NAMES.has(a.name) || FOOD_WORDS.test(a.name)) continue;
    const txt = a.products.join(" ").toLowerCase();
    if (a.products.every((p) => FOOD_WORDS.test(p))) continue;
    const deps = departments.get(ida) ?? {};
    const topDep = Object.entries(deps).sort((x, y) => y[1] - x[1])[0]?.[0];
    const colors = new Set();
    if (/rouge/.test(txt)) colors.add("red");
    if (/blanc/.test(txt)) colors.add("white");
    if (/rosé|gris|clairet/.test(txt)) colors.add("rose");
    if (/mousseux|crémant|pétillant|champagne/.test(txt)) colors.add("sparkling");
    if (/liquoreux|moelleux|vendanges tardives|grains nobles|vin de paille|doux/.test(txt)) colors.add("sweet");
    if (/vin doux naturel|vin de liqueur|rancio/.test(txt)) colors.add("fortified");
    // "Côtes de Bourg ou Bourg ou Bourgeais" → name "Côtes de Bourg", aliases the rest.
    const [name, ...aliases] = a.name.replace(/\s*\(.*\)\s*$/, "").split(/\s+ou\s+/).map((s) => s.trim());
    result.push({
      name,
      aliases,
      sign: a.sign.trim(),
      region: regionFor(a.name, topDep),
      country: "FR",
      colors: [...colors].join(","),
    });
  }
  // Same area name can appear twice (AOC + IGP variants): keep the first.
  const seen = new Set();
  return result.filter((a) => !seen.has(normalize(a.name)) && seen.add(normalize(a.name)));
}

/* ---------- Build ---------- */

async function main() {
  const [xwFile, prodFile, comFile] = await Promise.all([
    download("xwines.csv", SOURCES.xwines),
    download("inao-produits.csv", SOURCES.inaoProducts),
    download("inao-communes.csv", SOURCES.inaoCommunes),
  ]);

  const appellations = loadAppellations(prodFile, comFile);
  const appByName = new Map();
  for (const a of appellations) for (const n of [a.name, ...a.aliases]) if (!appByName.has(normalize(n))) appByName.set(normalize(n), a);
  // Longest names first, for "Champagne Grand Cru 'Le Mesnil'" → Champagne.
  const appPrefixes = [...appByName.entries()].sort((x, y) => y[0].length - x[0].length);
  const findApp = (name) => {
    const n = normalize(XWINES_FR_ALIASES[name] ?? name);
    return { exact: appByName.get(n), prefix: appPrefixes.find(([k]) => n.startsWith(k + " "))?.[1] };
  };
  console.log(`INAO wine appellations: ${appellations.length} (${appellations.filter((a) => !a.region).length} without region)`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const dbFile = path.join(CACHE, "catalog.db");
  fs.rmSync(dbFile, { force: true });
  const db = new Database(dbFile);
  db.pragma("journal_mode = OFF");
  db.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE wines (
      id INTEGER PRIMARY KEY, producer TEXT NOT NULL, name TEXT, color TEXT NOT NULL, country TEXT,
      region TEXT, appellation TEXT, grapes TEXT, alcohol REAL, body TEXT, acidity TEXT, pairings TEXT
    );
    CREATE VIRTUAL TABLE wines_fts USING fts5(producer, name, appellation, region, content='wines', content_rowid='id', tokenize='unicode61 remove_diacritics 2');
    CREATE TABLE appellations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, aliases TEXT, sign TEXT, region TEXT, country TEXT, colors TEXT, wines INTEGER DEFAULT 0);
    CREATE VIRTUAL TABLE appellations_fts USING fts5(name, aliases, content='appellations', content_rowid='id', tokenize='unicode61 remove_diacritics 2');
    CREATE TABLE grapes (name TEXT PRIMARY KEY, wines INTEGER);
  `);

  const insertWine = db.prepare(
    "INSERT INTO wines (id, producer, name, color, country, region, appellation, grapes, alcohol, body, acidity, pairings) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  const foreignAppellations = new Map();
  const appellationCounts = new Map();
  const grapeCounts = new Map();
  let count = 0;

  const rows = csvRows(fs.readFileSync(xwFile, "utf8"));
  rows.next(); // header
  db.transaction(() => {
    for (const r of rows) {
      if (r.length < 17) continue;
      const [id, wineName, type, , grapesRaw, harmonize, abv, body, acidity, code, , , regionName, , winery] = r;
      const color = XWINES_COLORS[type];
      if (!color || !winery) continue;

      // "Château X Grand Vin" by "Château X" → name "Grand Vin".
      let name = wineName;
      if (normalize(name).startsWith(normalize(winery))) name = name.slice(winery.length).replace(/^[\s\-–,]+/, "");

      let region = regionName || null;
      let appellation = null;
      if (code === "FR" && regionName) {
        const { exact, prefix } = findApp(regionName);
        if (exact) {
          appellation = exact.name;
          region = exact.region;
        } else if (XWINES_FR_REGIONS[regionName]) {
          region = XWINES_FR_REGIONS[regionName];
        } else {
          // "Chablis 1er Cru 'Montmains'" → "Chablis Premier Cru Montmains"
          appellation = regionName.replace(/\b1er Cru\b/, "Premier Cru").replace(/\s'([^']+)'$/, " $1");
          region = XWINES_FR_APPELLATION_REGIONS[regionName] ?? prefix?.region ?? null;
        }
      } else if (regionName) {
        appellation = regionName;
        const key = `${code}|${regionName}`;
        foreignAppellations.set(key, (foreignAppellations.get(key) ?? 0) + 1);
      }
      if (appellation) appellationCounts.set(normalize(appellation), (appellationCounts.get(normalize(appellation)) ?? 0) + 1);

      const grapes = pyList(grapesRaw);
      for (const g of grapes) grapeCounts.set(g, (grapeCounts.get(g) ?? 0) + 1);
      const pairings = [...new Set(pyList(harmonize).map((h) => PAIRINGS[h]).filter(Boolean))];

      insertWine.run(
        Number(id),
        winery,
        name || null,
        color,
        code || null,
        region,
        appellation,
        grapes.join(", ") || null,
        Number(abv) || null,
        body || null,
        acidity || null,
        pairings.join(",") || null,
      );
      count++;
    }

    const insertApp = db.prepare("INSERT INTO appellations (name, aliases, sign, region, country, colors, wines) VALUES (?,?,?,?,?,?,?)");
    for (const a of appellations) insertApp.run(a.name, a.aliases.join(" | ") || null, a.sign, a.region, a.country, a.colors, appellationCounts.get(normalize(a.name)) ?? 0);
    for (const [key, n] of foreignAppellations) {
      if (n < 3) continue;
      const [country, name] = key.split("|");
      insertApp.run(name, null, null, null, country, null, n);
    }
    const insertGrape = db.prepare("INSERT INTO grapes (name, wines) VALUES (?, ?)");
    for (const [g, n] of grapeCounts) if (n >= 2) insertGrape.run(g, n);

    db.exec("INSERT INTO wines_fts(wines_fts) VALUES('rebuild'); INSERT INTO appellations_fts(appellations_fts) VALUES('rebuild');");
    db.prepare("INSERT INTO meta VALUES ('version', ?), ('built', ?)").run("1", new Date().toISOString());
  })();

  db.exec("VACUUM");
  db.close();

  const raw = fs.readFileSync(dbFile);
  const gz = zlib.gzipSync(raw, { level: 9 });
  fs.writeFileSync(path.join(OUT_DIR, "catalog.db.gz"), gz);
  console.log(`Wines: ${count}. catalog.db ${(raw.length / 1e6).toFixed(1)} MB → catalog.db.gz ${(gz.length / 1e6).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
