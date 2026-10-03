import "server-only";
import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { windowStatus, type WindowStatus } from "@/lib/drinking-window";

const { wines, bottles } = schema;

/** Wines in stock, grouped by drinking-window status (most urgent first). */
export function getDrinkList(userId: string) {
  const rows = getDb()
    .select({
      id: wines.id,
      producer: wines.producer,
      name: wines.name,
      vintage: wines.vintage,
      color: wines.color,
      appellation: wines.appellation,
      region: wines.region,
      imageFile: wines.imageFile,
      drinkFrom: wines.drinkFrom,
      peakFrom: wines.peakFrom,
      peakUntil: wines.peakUntil,
      drinkUntil: wines.drinkUntil,
      stock: count(bottles.id),
    })
    .from(wines)
    .innerJoin(bottles, eq(bottles.wineId, wines.id))
    .where(eq(wines.userId, userId))
    .groupBy(wines.id)
    .all();

  const groups: Record<WindowStatus, typeof rows> = { past: [], declining: [], peak: [], ready: [], tooYoung: [], unknown: [] };
  for (const w of rows) groups[windowStatus(w)].push(w);

  // Within a group, the wine whose window closes first comes first.
  const closing = (w: (typeof rows)[number]) => w.drinkUntil ?? w.peakUntil ?? 9999;
  for (const list of Object.values(groups)) list.sort((a, b) => closing(a) - closing(b) || a.producer.localeCompare(b.producer));
  groups.tooYoung.sort((a, b) => (a.drinkFrom ?? a.peakFrom ?? 9999) - (b.drinkFrom ?? b.peakFrom ?? 9999));
  return groups;
}

/** Number of wines needing attention (past their best or to drink soon), for the nav badge. */
export function urgentCount(userId: string) {
  const g = getDrinkList(userId);
  return g.past.length + g.declining.length;
}
