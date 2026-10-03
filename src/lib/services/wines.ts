import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema, UPLOADS_DIR } from "@/lib/db";
import { MOVEMENT_REASONS, WINE_COLORS, type MovementReason } from "@/lib/db/schema";
import { windowStatus, type WindowStatus } from "@/lib/drinking-window";

const { wines, bottles, movements, tastingNotes } = schema;

/* ---------- Validation ---------- */

const optionalText = z
  .string()
  .trim()
  .transform((v) => v || null)
  .nullish();
const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable());
const optionalNumber = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().min(0).max(max).nullable());
const year = optionalInt(1800, 2200);

export const wineInputSchema = z.object({
  producer: z.string().trim().min(1, "wines.producerRequired"),
  name: optionalText,
  vintage: year,
  color: z.enum(WINE_COLORS),
  country: optionalText,
  region: optionalText,
  appellation: optionalText,
  grapes: optionalText,
  alcohol: optionalNumber(100),
  bottleSizeMl: z.coerce.number().int().min(50).max(30000).default(750),
  purchasePrice: optionalNumber(1_000_000),
  estimatedValue: optionalNumber(1_000_000),
  drinkFrom: year,
  peakFrom: year,
  peakUntil: year,
  drinkUntil: year,
  notes: optionalText,
  barcode: z
    .string()
    .trim()
    .regex(/^\d{8,14}$/)
    .or(z.literal(""))
    .transform((v) => v || null)
    .nullish(),
  pairings: z
    .string()
    .trim()
    .regex(/^[a-zA-Z,]*$/)
    .transform((v) => v || null)
    .nullish(),
});
export type WineInput = z.infer<typeof wineInputSchema>;

/* ---------- Queries ---------- */

export type WineListFilters = {
  q?: string;
  color?: string;
  region?: string;
  /** in stock (default), tasted (has a tasting note or a bottle drunk, stock or not), or all. */
  status?: "stock" | "tasted" | "all";
  /** Minimum average tasting rating (0–5). */
  minRating?: number;
  pairing?: string;
  window?: WindowStatus;
  sort?: "recent" | "producer" | "vintage" | "window" | "rating";
};

export function listWines(userId: string, f: WineListFilters = {}) {
  const db = getDb();
  const conditions = [eq(wines.userId, userId)];
  if (f.q) {
    const term = `%${f.q.trim()}%`;
    conditions.push(
      or(
        like(wines.producer, term),
        like(wines.name, term),
        like(wines.appellation, term),
        like(wines.region, term),
        like(wines.grapes, term),
      )!,
    );
  }
  if (f.color && (WINE_COLORS as readonly string[]).includes(f.color)) {
    conditions.push(eq(wines.color, f.color as (typeof WINE_COLORS)[number]));
  }
  if (f.region) conditions.push(eq(wines.region, f.region));
  if (f.pairing && /^[a-zA-Z]+$/.test(f.pairing)) {
    conditions.push(sql`(',' || coalesce(${wines.pairings}, '') || ',') like ${`%,${f.pairing},%`}`);
  }

  // Stock and average rating as subqueries, so finished wines keep their notes.
  const stock = db.select({ wineId: bottles.wineId, n: count().as("n") }).from(bottles).groupBy(bottles.wineId).as("stock");
  const ratings = db
    .select({ wineId: tastingNotes.wineId, avg: sql<number>`avg(${tastingNotes.rating})`.as("avg"), noteCount: count().as("note_count") })
    .from(tastingNotes)
    .groupBy(tastingNotes.wineId)
    .as("ratings");
  const stockCount = sql<number>`coalesce(${stock.n}, 0)`;

  if (f.status === "tasted") {
    conditions.push(
      sql`(exists (select 1 from ${tastingNotes} where ${tastingNotes.wineId} = ${wines.id})
        or exists (select 1 from ${movements} where ${movements.wineId} = ${wines.id} and ${movements.reason} = 'drunk'))`,
    );
  } else if (f.status !== "all") conditions.push(sql`${stockCount} > 0`);
  if (f.minRating) conditions.push(sql`${ratings.avg} >= ${f.minRating}`);

  const order = {
    recent: [desc(wines.createdAt)],
    producer: [asc(wines.producer), asc(wines.vintage)],
    vintage: [sql`${wines.vintage} is null`, asc(wines.vintage)],
    window: [sql`coalesce(${wines.drinkUntil}, ${wines.peakUntil}, 9999)`, asc(wines.producer)],
    rating: [sql`${ratings.avg} is null`, desc(ratings.avg), asc(wines.producer)],
  }[f.sort ?? "recent"];

  const rows = db
    .select({
      id: wines.id,
      producer: wines.producer,
      name: wines.name,
      vintage: wines.vintage,
      color: wines.color,
      region: wines.region,
      appellation: wines.appellation,
      imageFile: wines.imageFile,
      bottleSizeMl: wines.bottleSizeMl,
      drinkFrom: wines.drinkFrom,
      peakFrom: wines.peakFrom,
      peakUntil: wines.peakUntil,
      drinkUntil: wines.drinkUntil,
      stock: stockCount,
      rating: ratings.avg,
      noteCount: sql<number>`coalesce(${ratings.noteCount}, 0)`,
    })
    .from(wines)
    .leftJoin(stock, eq(stock.wineId, wines.id))
    .leftJoin(ratings, eq(ratings.wineId, wines.id))
    .where(and(...conditions))
    .orderBy(...order)
    .all();

  // The drinking window is computed in JS (same rules as everywhere else).
  return f.window ? rows.filter((w) => windowStatus(w) === f.window) : rows;
}
export function listRegions(userId: string) {
  return getDb()
    .selectDistinct({ region: wines.region })
    .from(wines)
    .where(and(eq(wines.userId, userId), sql`${wines.region} is not null`))
    .orderBy(asc(wines.region))
    .all()
    .map((r) => r.region as string);
}

export function getWine(userId: string, wineId: string) {
  const db = getDb();
  const wine = db
    .select()
    .from(wines)
    .where(and(eq(wines.id, wineId), eq(wines.userId, userId)))
    .get();
  if (!wine) return null;
  const stock = db.select({ n: count() }).from(bottles).where(eq(bottles.wineId, wineId)).get()?.n ?? 0;
  const history = db
    .select()
    .from(movements)
    .where(eq(movements.wineId, wineId))
    .orderBy(desc(movements.date))
    .all();
  return { ...wine, stock, history };
}

/* ---------- Mutations ---------- */

export function createWine(userId: string, input: WineInput, initialQuantity: number, imageFile?: string | null) {
  const db = getDb();
  return db.transaction((tx) => {
    const wine = tx
      .insert(wines)
      .values({ ...input, userId, imageFile: imageFile ?? null })
      .returning()
      .get();
    if (initialQuantity > 0) addBottlesTx(tx, userId, wine.id, initialQuantity, "purchase", new Date());
    return wine;
  });
}

export function updateWine(userId: string, wineId: string, input: Partial<WineInput> & { imageFile?: string | null }) {
  return getDb()
    .update(wines)
    .set(input)
    .where(and(eq(wines.id, wineId), eq(wines.userId, userId)))
    .returning()
    .get();
}

export async function deleteWine(userId: string, wineId: string) {
  const wine = getDb()
    .delete(wines)
    .where(and(eq(wines.id, wineId), eq(wines.userId, userId)))
    .returning()
    .get();
  if (wine?.imageFile) await deleteImage(wine.imageFile);
  return wine;
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function addBottlesTx(tx: Tx, userId: string, wineId: string, quantity: number, reason: MovementReason, date: Date, note?: string | null) {
  tx.insert(bottles)
    .values(Array.from({ length: quantity }, () => ({ wineId })))
    .run();
  tx.insert(movements).values({ userId, wineId, direction: "in", reason, quantity, date, note }).run();
}

export const movementSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(500),
  reason: z.enum(MOVEMENT_REASONS),
  date: z.coerce.date().default(() => new Date()),
  note: optionalText,
});

export function addBottles(userId: string, wineId: string, m: z.infer<typeof movementSchema>) {
  if (!ownsWine(userId, wineId)) return false;
  getDb().transaction((tx) => addBottlesTx(tx, userId, wineId, m.quantity, m.reason, m.date, m.note));
  return true;
}

/** Removes bottles, taking unplaced ones first (or the given bottle ids). */
export function removeBottles(userId: string, wineId: string, m: z.infer<typeof movementSchema>, bottleIds?: string[]) {
  if (!ownsWine(userId, wineId)) return { ok: false as const, error: "notFound" as const };
  const db = getDb();
  return db.transaction((tx) => {
    const ids = (
      bottleIds?.length
        ? bottleIds
        : tx
            .select({ id: bottles.id })
            .from(bottles)
            .where(eq(bottles.wineId, wineId))
            .orderBy(sql`${bottles.rackId} is not null`, asc(bottles.addedAt))
            .limit(m.quantity)
            .all()
            .map((b) => b.id)
    ).slice(0, m.quantity);
    if (ids.length < m.quantity) return { ok: false as const, error: "notEnough" as const };
    for (const id of ids) tx.delete(bottles).where(and(eq(bottles.id, id), eq(bottles.wineId, wineId))).run();
    tx.insert(movements)
      .values({ userId, wineId, direction: "out", reason: m.reason, quantity: ids.length, date: m.date, note: m.note })
      .run();
    return { ok: true as const };
  });
}

function ownsWine(userId: string, wineId: string) {
  return !!getDb()
    .select({ id: wines.id })
    .from(wines)
    .where(and(eq(wines.id, wineId), eq(wines.userId, userId)))
    .get();
}

/* ---------- Images ---------- */

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function saveImage(file: File): Promise<string | null> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext || file.size === 0 || file.size > MAX_IMAGE_BYTES) return null;
  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function deleteImage(name: string) {
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return;
  await fs.rm(path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, name), { force: true });
}

/** Returns the image file name if it belongs to one of the user's wines or wishlist entries. */
export function findUserImage(userId: string, name: string) {
  const db = getDb();
  return (
    db.select({ imageFile: wines.imageFile }).from(wines).where(and(eq(wines.userId, userId), eq(wines.imageFile, name))).get()?.imageFile ??
    db
      .select({ imageFile: schema.wishlist.imageFile })
      .from(schema.wishlist)
      .where(and(eq(schema.wishlist.userId, userId), eq(schema.wishlist.imageFile, name)))
      .get()?.imageFile
  );
}
