import "server-only";
import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { WineColor } from "@/lib/db/schema";

const { wines, bottles, locations } = schema;

export function getDashboard(userId: string) {
  const db = getDb();
  const year = new Date().getFullYear();
  const owned = eq(wines.userId, userId);

  const totals = db
    .select({
      bottles: count(bottles.id),
      wines: sql<number>`count(distinct ${wines.id})`,
      value: sql<number>`coalesce(sum(coalesce(${wines.estimatedValue}, ${wines.purchasePrice}, 0)), 0)`,
      drinkThisYear: sql<number>`sum(case when ${wines.drinkFrom} <= ${year} and coalesce(${wines.drinkUntil}, 9999) >= ${year} then 1 else 0 end)`,
    })
    .from(bottles)
    .innerJoin(wines, eq(bottles.wineId, wines.id))
    .where(owned)
    .get();

  const byColor = db
    .select({ color: wines.color, n: count(bottles.id) })
    .from(bottles)
    .innerJoin(wines, eq(bottles.wineId, wines.id))
    .where(owned)
    .groupBy(wines.color)
    .all() as { color: WineColor; n: number }[];

  const atPeak = db
    .select({
      id: wines.id,
      producer: wines.producer,
      name: wines.name,
      vintage: wines.vintage,
      color: wines.color,
      appellation: wines.appellation,
      peakUntil: wines.peakUntil,
      stock: count(bottles.id),
    })
    .from(wines)
    .innerJoin(bottles, eq(bottles.wineId, wines.id))
    .where(and(owned, lte(wines.peakFrom, year), gte(wines.peakUntil, year)))
    .groupBy(wines.id)
    .orderBy(wines.peakUntil)
    .limit(5)
    .all();

  const locationCount =
    db.select({ n: count() }).from(locations).where(eq(locations.userId, userId)).get()?.n ?? 0;

  return {
    bottles: totals?.bottles ?? 0,
    wines: totals?.wines ?? 0,
    value: totals?.value ?? 0,
    drinkThisYear: totals?.drinkThisYear ?? 0,
    locations: locationCount,
    byColor,
    atPeak,
  };
}
