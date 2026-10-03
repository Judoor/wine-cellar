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

export function addWishlistItem(userId: string, input: WishlistInput) {
  return getDb().insert(wishlist).values({ ...input, userId }).returning().get();
}

export function updateWishlistItem(userId: string, id: string, input: WishlistInput) {
  return getDb()
    .update(wishlist)
    .set(input)
    .where(and(eq(wishlist.id, id), eq(wishlist.userId, userId)))
    .run();
}

export function deleteWishlistItem(userId: string, id: string) {
  return getDb()
    .delete(wishlist)
    .where(and(eq(wishlist.id, id), eq(wishlist.userId, userId)))
    .run();
}
