import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import Database from "better-sqlite3";
import { DATA_DIR } from "@/lib/db";
import type { WineColor } from "@/lib/db/schema";

/**
 * Offline wine catalog (X-Wines + INAO), built by scripts/catalog/build.mjs and shipped
 * gzipped in catalog/. Decompressed once into the data folder, then opened read-only.
 */

export type CatalogWine = {
  id: number;
  producer: string;
  name: string | null;
  color: WineColor;
  country: string | null;
  region: string | null;
  appellation: string | null;
  grapes: string | null;
  alcohol: number | null;
  pairings: string | null;
};

export type CatalogAppellation = {
  name: string;
  region: string | null;
  country: string | null;
  sign: string | null;
  colors: string | null;
};

const globalForCatalog = globalThis as unknown as { __catalog?: Database.Database | null };

function openCatalog(): Database.Database | null {
  const source = path.join(/*turbopackIgnore: true*/ process.cwd(), "catalog", "catalog.db.gz");
  if (!fs.existsSync(source)) return null;
  const gz = fs.readFileSync(source);
  const hash = createHash("sha1").update(gz).digest("hex").slice(0, 10);
  const target = path.join(/*turbopackIgnore: true*/ DATA_DIR, `catalog-${hash}.db`);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const old of fs.readdirSync(DATA_DIR)) {
      if (/^catalog-\w+\.db$/.test(old)) fs.rmSync(path.join(/*turbopackIgnore: true*/ DATA_DIR, old), { force: true });
    }
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, zlib.gunzipSync(gz));
    fs.renameSync(tmp, target);
  }
  return new Database(target, { readonly: true, fileMustExist: true });
}

function catalog() {
  if (globalForCatalog.__catalog === undefined) {
    try {
      globalForCatalog.__catalog = openCatalog();
    } catch (e) {
      console.error("Wine catalog unavailable:", e);
      globalForCatalog.__catalog = null;
    }
  }
  return globalForCatalog.__catalog;
}

/** "chât marg" → `"chât"* "marg"*` (every word as a prefix, all required). */
function ftsQuery(q: string) {
  const words = q
    .normalize("NFC")
    .replace(/["*^():]/g, " ")
    .split(/[\s\-'’,.]+/)
    .filter((w) => w.length > 0)
    .slice(0, 8);
  return words.length ? words.map((w) => `"${w}"*`).join(" ") : null;
}

export function searchCatalogWines(q: string, limit = 8): CatalogWine[] {
  const db = catalog();
  const match = ftsQuery(q);
  if (!db || !match) return [];
  return db
    .prepare(
      `SELECT w.id, w.producer, w.name, w.color, w.country, w.region, w.appellation, w.grapes, w.alcohol, w.pairings
       FROM wines_fts JOIN wines w ON w.id = wines_fts.rowid
       WHERE wines_fts MATCH ?
       ORDER BY bm25(wines_fts, 10, 6, 3, 1), length(w.producer) + length(coalesce(w.name, ''))
       LIMIT ?`,
    )
    .all(match, limit) as CatalogWine[];
}

export function searchAppellations(q: string, limit = 8): CatalogAppellation[] {
  const db = catalog();
  const match = ftsQuery(q);
  if (!db || !match) return [];
  return db
    .prepare(
      `SELECT a.name, a.region, a.country, a.sign, a.colors
       FROM appellations_fts JOIN appellations a ON a.id = appellations_fts.rowid
       WHERE appellations_fts MATCH ?
       ORDER BY a.country = 'FR' DESC, bm25(appellations_fts), a.wines DESC, length(a.name)
       LIMIT ?`,
    )
    .all(match, limit) as CatalogAppellation[];
}

export function findAppellation(name: string): CatalogAppellation | undefined {
  return catalog()
    ?.prepare("SELECT name, region, country, sign, colors FROM appellations WHERE name = ? COLLATE NOCASE LIMIT 1")
    .get(name) as CatalogAppellation | undefined;
}

export function catalogSize(): number {
  return (catalog()?.prepare("SELECT count(*) AS n FROM wines").get() as { n: number } | undefined)?.n ?? 0;
}

export function searchGrapes(q: string, limit = 8): string[] {
  const db = catalog();
  if (!db || !q.trim()) return [];
  return (db.prepare("SELECT name FROM grapes WHERE name LIKE ? ORDER BY wines DESC LIMIT ?").all(`${q.trim()}%`, limit) as { name: string }[]).map(
    (g) => g.name,
  );
}
