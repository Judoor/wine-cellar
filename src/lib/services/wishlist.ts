import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { WINE_COLORS } from "@/lib/db/schema";

const { wishlist } = schema;

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => v || null)
  .nullish();

export const wishlistInputSchema = z.object({
  producer: z.string().trim().min(1, "wines.producerRequired").max(200),
  name: optionalText,
  vintage: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1800).max(2200).nullable()),
  color: z.preprocess((v) => (v === "" ? null : v), z.enum(WINE_COLORS).nullish()),
  appellation: optionalText,
  targetPrice: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))),
    z.number().min(0).max(1_000_000).nullable(),
  ),
  notes: optionalText,
  barcode: z
    .string()
    .trim()
    .regex(/^\d{8,14}$/)
    .or(z.literal(""))
    .transform((v) => v || null)
    .nullish(),
  rating: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(5).multipleOf(0.5).nullable()),
  tastedOn: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date().nullable()),
  tastedWhere: optionalText,
});
export type WishlistInput = z.infer<typeof wishlistInputSchema>;

export function listWishlist(userId: string) {
  return getDb().select().from(wishlist).where(eq(wishlist.userId, userId)).orderBy(desc(wishlist.createdAt)).all();
}

export function getWishlistItem(userId: string, id: string) {
  return getDb()
    .select()
    .from(wishlist)
    .where(and(eq(wishlist.id, id), eq(wishlist.userId, userId)))
    .get();
}

export function findWishlistByBarcode(userId: string, barcode: string) {
  return getDb()
    .select({ id: wishlist.id })
    .from(wishlist)
    .where(and(eq(wishlist.userId, userId), eq(wishlist.barcode, barcode)))
    .get();
}

export function addWishlistItem(userId: string, input: WishlistInput & { imageFile?: string | null }) {
  return getDb().insert(wishlist).values({ ...input, userId }).returning().get();
}

export function updateWishlistItem(userId: string, id: string, input: WishlistInput & { imageFile?: string | null }) {
  return getDb()
    .update(wishlist)
    .set(input)
    .where(and(eq(wishlist.id, id), eq(wishlist.userId, userId)))
    .run();
}

/** Deletes the entry and returns it (the caller decides what happens to its photo). */
export function deleteWishlistItem(userId: string, id: string) {
  return getDb()
    .delete(wishlist)
    .where(and(eq(wishlist.id, id), eq(wishlist.userId, userId)))
    .returning()
    .get();
}
