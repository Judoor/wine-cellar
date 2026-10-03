import "server-only";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { slotExists } from "@/lib/slots";

const { locations, racks, bottles, wines } = schema;

export const locationInputSchema = z.object({
  name: z.string().trim().min(1, "cellar.nameRequired").max(80),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || null)
    .nullish(),
});

export const rackInputSchema = z
  .object({
    name: z.string().trim().min(1, "cellar.nameRequired").max(80),
    rows: z.coerce.number().int().min(1).max(50),
    cols: z.coerce.number().int().min(1).max(50),
    layout: z.enum(["grid", "pyramid"]).default("grid"),
  })
  // A pyramid can't be taller than its base is wide.
  .refine((r) => r.layout === "grid" || r.rows <= r.cols, { message: "cellar.pyramidTooTall", path: ["rows"] });

/* ---------- Locations ---------- */

export function listLocations(userId: string) {
  const db = getDb();
  const rows = db
    .select({
      id: locations.id,
      name: locations.name,
      description: locations.description,
      racks: count(racks.id),
      capacity: sql<number>`coalesce(sum(case when ${racks.layout} = 'pyramid'
        then ${racks.rows} * ${racks.cols} - ${racks.rows} * (${racks.rows} - 1) / 2
        else ${racks.rows} * ${racks.cols} end), 0)`,
    })
    .from(locations)
    .leftJoin(racks, eq(racks.locationId, locations.id))
    .where(eq(locations.userId, userId))
    .groupBy(locations.id)
    .orderBy(asc(locations.createdAt))
    .all();
  const placed = db
    .select({ locationId: bottles.locationId, n: count() })
    .from(bottles)
    .innerJoin(wines, eq(bottles.wineId, wines.id))
    .where(and(eq(wines.userId, userId), sql`${bottles.rackId} is not null`))
    .groupBy(bottles.locationId)
    .all();
  return rows.map((l) => ({ ...l, bottles: placed.find((p) => p.locationId === l.id)?.n ?? 0 }));
}

function ownedLocation(userId: string, locationId: string) {
  return getDb()
    .select()
    .from(locations)
    .where(and(eq(locations.id, locationId), eq(locations.userId, userId)))
    .get();
}

export function createLocation(userId: string, input: z.infer<typeof locationInputSchema>) {
  return getDb().insert(locations).values({ ...input, userId }).returning().get();
}

export function updateLocation(userId: string, locationId: string, input: z.infer<typeof locationInputSchema>) {
  return getDb()
    .update(locations)
    .set(input)
    .where(and(eq(locations.id, locationId), eq(locations.userId, userId)))
    .run();
}

/** Deletes a location; its bottles stay in stock, unplaced. */
export function deleteLocation(userId: string, locationId: string) {
  if (!ownedLocation(userId, locationId)) return;
  getDb().transaction((tx) => {
    tx.update(bottles)
      .set({ locationId: null, rackId: null, row: null, col: null })
      .where(eq(bottles.locationId, locationId))
      .run();
    tx.delete(locations).where(eq(locations.id, locationId)).run();
  });
}

export type PlacedBottle = {
  id: string;
  rackId: string;
  row: number;
  col: number;
  wineId: string;
  producer: string;
  name: string | null;
  vintage: number | null;
  color: (typeof schema.WINE_COLORS)[number];
};

export function getLocation(userId: string, locationId: string) {
  const location = ownedLocation(userId, locationId);
  if (!location) return null;
  const db = getDb();
  const rackList = db.select().from(racks).where(eq(racks.locationId, locationId)).orderBy(asc(racks.sortOrder), asc(racks.name)).all();
  const placed = db
    .select({
      id: bottles.id,
      rackId: bottles.rackId,
      row: bottles.row,
      col: bottles.col,
      wineId: wines.id,
      producer: wines.producer,
      name: wines.name,
      vintage: wines.vintage,
      color: wines.color,
    })
    .from(bottles)
    .innerJoin(wines, eq(bottles.wineId, wines.id))
    .where(and(eq(bottles.locationId, locationId), sql`${bottles.rackId} is not null`))
    .all() as PlacedBottle[];
  return { ...location, racks: rackList, bottles: placed };
}

/* ---------- Racks ---------- */

function ownedRack(userId: string, rackId: string) {
  return getDb()
    .select({ rack: racks })
    .from(racks)
    .innerJoin(locations, eq(racks.locationId, locations.id))
    .where(and(eq(racks.id, rackId), eq(locations.userId, userId)))
    .get()?.rack;
}

export function createRack(userId: string, locationId: string, input: z.infer<typeof rackInputSchema>) {
  if (!ownedLocation(userId, locationId)) return null;
  const db = getDb();
  const order = db.select({ n: count() }).from(racks).where(eq(racks.locationId, locationId)).get()?.n ?? 0;
  return db.insert(racks).values({ ...input, locationId, sortOrder: order }).returning().get();
}

/** Resizing is refused if it would leave bottles outside the grid. */
export function updateRack(userId: string, rackId: string, input: z.infer<typeof rackInputSchema>) {
  if (!ownedRack(userId, rackId)) return { ok: false as const, error: "notFound" as const };
  const db = getDb();
  const placed = db.select({ row: bottles.row, col: bottles.col }).from(bottles).where(eq(bottles.rackId, rackId)).all();
  if (placed.some((b) => !slotExists(input, b.row!, b.col!))) return { ok: false as const, error: "bottlesOutside" as const };
  db.update(racks).set(input).where(eq(racks.id, rackId)).run();
  return { ok: true as const };
}

/** Deletes a rack; its bottles stay in the location, unplaced. */
export function deleteRack(userId: string, rackId: string) {
  if (!ownedRack(userId, rackId)) return;
  getDb().transaction((tx) => {
    tx.update(bottles).set({ rackId: null, row: null, col: null, locationId: null }).where(eq(bottles.rackId, rackId)).run();
    tx.delete(racks).where(eq(racks.id, rackId)).run();
  });
}

/* ---------- Placement ---------- */

export function listUnplaced(userId: string) {
  return getDb()
    .select({
      wineId: wines.id,
      producer: wines.producer,
      name: wines.name,
      vintage: wines.vintage,
      color: wines.color,
      count: count(bottles.id),
    })
    .from(bottles)
    .innerJoin(wines, eq(bottles.wineId, wines.id))
    .where(and(eq(wines.userId, userId), isNull(bottles.rackId)))
    .groupBy(wines.id)
    .orderBy(asc(wines.producer))
    .all();
}

function ownedBottle(userId: string, bottleId: string) {
  return getDb()
    .select({ bottle: bottles })
    .from(bottles)
    .innerJoin(wines, eq(bottles.wineId, wines.id))
    .where(and(eq(bottles.id, bottleId), eq(wines.userId, userId)))
    .get()?.bottle;
}

export type Target = { rackId: string; row: number; col: number };

/**
 * Puts a bottle in a slot. The source is either a specific bottle (move) or a wine
 * (an unplaced bottle of that wine is taken). If the slot is taken during a move, the two bottles swap.
 */
export function placeBottle(userId: string, source: { bottleId: string } | { wineId: string }, target: Target) {
  const rack = ownedRack(userId, target.rackId);
  if (!rack || !slotExists(rack, target.row, target.col)) return { ok: false as const };
  const db = getDb();
  return db.transaction((tx) => {
    let bottle;
    if ("bottleId" in source) {
      bottle = ownedBottle(userId, source.bottleId);
    } else {
      bottle = tx
        .select({ bottle: bottles })
        .from(bottles)
        .innerJoin(wines, eq(bottles.wineId, wines.id))
        .where(and(eq(wines.id, source.wineId), eq(wines.userId, userId), isNull(bottles.rackId)))
        .orderBy(asc(bottles.addedAt))
        .limit(1)
        .get()?.bottle;
    }
    if (!bottle) return { ok: false as const };

    const occupant = tx
      .select()
      .from(bottles)
      .where(and(eq(bottles.rackId, target.rackId), eq(bottles.row, target.row), eq(bottles.col, target.col)))
      .get();
    if (occupant?.id === bottle.id) return { ok: true as const };
    if (occupant && !("bottleId" in source)) return { ok: false as const };

    const from = { locationId: bottle.locationId, rackId: bottle.rackId, row: bottle.row, col: bottle.col };
    // Free the source slot first so the unique (rack,row,col) index never collides during a swap.
    tx.update(bottles).set({ rackId: null, row: null, col: null }).where(eq(bottles.id, bottle.id)).run();
    if (occupant) tx.update(bottles).set(from).where(eq(bottles.id, occupant.id)).run();
    tx.update(bottles)
      .set({ locationId: rack.locationId, rackId: rack.id, row: target.row, col: target.col })
      .where(eq(bottles.id, bottle.id))
      .run();
    return { ok: true as const };
  });
}

export function unplaceBottle(userId: string, bottleId: string) {
  if (!ownedBottle(userId, bottleId)) return;
  getDb().update(bottles).set({ locationId: null, rackId: null, row: null, col: null }).where(eq(bottles.id, bottleId)).run();
}

/** Where a wine's bottles are, for the wine sheet. */
export function wineLocations(userId: string, wineId: string) {
  return getDb()
    .select({ location: locations.name, locationId: locations.id, rack: racks.name, row: bottles.row, col: bottles.col })
    .from(bottles)
    .innerJoin(wines, eq(bottles.wineId, wines.id))
    .innerJoin(racks, eq(bottles.rackId, racks.id))
    .innerJoin(locations, eq(racks.locationId, locations.id))
    .where(and(eq(wines.id, wineId), eq(wines.userId, userId)))
    .orderBy(asc(locations.name), asc(racks.name), asc(bottles.row), asc(bottles.col))
    .all();
}
