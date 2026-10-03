import "server-only";
import { and, eq } from "drizzle-orm";
import { searchCatalogWines, type CatalogWine } from "@/lib/catalog";
import { getDb, schema } from "@/lib/db";
import type { WineColor } from "@/lib/db/schema";
import { getSetting } from "@/lib/settings";
import { findWishlistByBarcode } from "@/lib/services/wishlist";

export function externalLookupsEnabled() {
  if (process.env.DISABLE_EXTERNAL_LOOKUPS === "true") return false;
  return getSetting("external_lookups") !== "false";
}

export type BarcodeResult = {
  barcode: string;
  existingWineId?: string;
  existingWishlistId?: string;
  found: boolean;
  product?: {
    producer: string | null;
    name: string | null;
    vintage: number | null;
    color: WineColor | null;
    bottleSizeMl: number | null;
    country: string | null;
  };
  match?: CatalogWine;
};

const COLOR_TAGS: [RegExp, WineColor][] = [
  [/sparkling|champagne|cremant|mousseux|prosecco|cava/, "sparkling"],
  [/fortified|port-wine|porto|vins-doux-naturels/, "fortified"],
  [/sweet-wine|dessert-wine|liquoreux|moelleux/, "sweet"],
  [/rose-wine|vins-roses/, "rose"],
  [/white-wine|vins-blancs/, "white"],
  [/red-wine|vins-rouges/, "red"],
];

function parseSize(quantity: string | undefined): number | null {
  const m = quantity?.toLowerCase().replace(",", ".").match(/([\d.]+)\s*(ml|cl|l)\b/);
  if (!m) return null;
  const n = Number(m[1]) * (m[2] === "l" ? 1000 : m[2] === "cl" ? 10 : 1);
  return Number.isFinite(n) && n >= 50 && n <= 30000 ? Math.round(n) : null;
}

export async function lookupBarcode(userId: string, barcode: string): Promise<BarcodeResult> {
  const existing = getDb()
    .select({ id: schema.wines.id })
    .from(schema.wines)
    .where(and(eq(schema.wines.userId, userId), eq(schema.wines.barcode, barcode)))
    .get();
  const result: BarcodeResult = {
    barcode,
    existingWineId: existing?.id,
    existingWishlistId: findWishlistByBarcode(userId, barcode)?.id,
    found: false,
  };
  if (!externalLookupsEnabled()) return result;

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,product_name_fr,brands,categories_tags,countries_tags,quantity`,
      {
        headers: { "User-Agent": "WineCellar/0.1 (self-hosted; https://github.com/Judoor/wine-cellar)" },
        signal: AbortSignal.timeout(6000),
      },
    );
    if (!res.ok) return result;
    const data = (await res.json()) as {
      status?: number;
      product?: { product_name?: string; product_name_fr?: string; brands?: string; categories_tags?: string[]; countries_tags?: string[]; quantity?: string };
    };
    const p = data.product;
    if (!data.status || !p) return result;

    const name = (p.product_name_fr || p.product_name || "").trim() || null;
    const producer = p.brands?.split(",")[0]?.trim() || null;
    const tags = (p.categories_tags ?? []).join(" ");
    const vintage = Number(name?.match(/\b(19[5-9]\d|20[0-4]\d)\b/)?.[1]) || null;

    result.found = true;
    result.product = {
      producer,
      name,
      vintage,
      color: COLOR_TAGS.find(([re]) => re.test(tags))?.[1] ?? null,
      bottleSizeMl: parseSize(p.quantity),
      country: null,
    };
    // Enrich with the offline catalog (grapes, appellation, region…).
    const query = [producer, name?.replace(/\b(19|20)\d{2}\b/, "")].filter(Boolean).join(" ");
    result.match = searchCatalogWines(query, 1)[0];
  } catch {
    // Offline or Open Food Facts unavailable: the user can still fill the form manually.
  }
  return result;
}
