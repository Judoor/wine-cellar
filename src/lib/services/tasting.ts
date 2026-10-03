import "server-only";
import { and, avg, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";

const { tastingNotes, wines } = schema;

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .transform((v) => v || null)
  .nullish();

export const tastingInputSchema = z.object({
  date: z.coerce.date(),
  // 0–5 in half-point steps; empty = no rating.
  rating: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().min(0).max(5).multipleOf(0.5).nullable(),
  ),
  notes: optionalText,
  occasion: optionalText,
  companions: optionalText,
});
export type TastingInput = z.infer<typeof tastingInputSchema>;

function ownsWine(userId: string, wineId: string) {
  return !!getDb()
    .select({ id: wines.id })
    .from(wines)
    .where(and(eq(wines.id, wineId), eq(wines.userId, userId)))
    .get();
}

export function listTastingNotes(userId: string, wineId: string) {
  return getDb()
    .select()
    .from(tastingNotes)
    .where(and(eq(tastingNotes.userId, userId), eq(tastingNotes.wineId, wineId)))
    .orderBy(desc(tastingNotes.date), desc(tastingNotes.createdAt))
    .all();
}

export function ratingSummary(userId: string, wineId: string) {
  const row = getDb()
    .select({ avg: avg(tastingNotes.rating), n: count(tastingNotes.id) })
    .from(tastingNotes)
    .where(and(eq(tastingNotes.userId, userId), eq(tastingNotes.wineId, wineId)))
    .get();
  return { average: row?.avg != null ? Number(row.avg) : null, count: row?.n ?? 0 };
}

export function addTastingNote(userId: string, wineId: string, input: TastingInput) {
  if (!ownsWine(userId, wineId)) return null;
  return getDb().insert(tastingNotes).values({ ...input, userId, wineId }).returning().get();
}

export function updateTastingNote(userId: string, noteId: string, input: TastingInput) {
  return getDb()
    .update(tastingNotes)
    .set(input)
    .where(and(eq(tastingNotes.id, noteId), eq(tastingNotes.userId, userId)))
    .run();
}

export function deleteTastingNote(userId: string, noteId: string) {
  return getDb()
    .delete(tastingNotes)
    .where(and(eq(tastingNotes.id, noteId), eq(tastingNotes.userId, userId)))
    .run();
}

/** Latest notes across the cellar, for the dashboard. */
export function recentTastingNotes(userId: string, limit = 4) {
  return getDb()
    .select({
      id: tastingNotes.id,
      date: tastingNotes.date,
      rating: tastingNotes.rating,
      notes: tastingNotes.notes,
      wineId: wines.id,
      producer: wines.producer,
      name: wines.name,
      vintage: wines.vintage,
      color: wines.color,
    })
    .from(tastingNotes)
    .innerJoin(wines, eq(tastingNotes.wineId, wines.id))
    .where(eq(tastingNotes.userId, userId))
    .orderBy(desc(tastingNotes.date), desc(tastingNotes.createdAt))
    .limit(limit)
    .all();
}
