"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { addWishlistItem, deleteWishlistItem, updateWishlistItem, wishlistInputSchema } from "@/lib/services/wishlist";
import type { MessageKey } from "@/i18n/config";

export type WishlistState = { error?: MessageKey; ok?: boolean } | undefined;

export async function saveWishlistItem(id: string | null, _: WishlistState, formData: FormData): Promise<WishlistState> {
  const user = await requireUser();
  const parsed = wishlistInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "";
    return { error: msg.includes(".") ? (msg as MessageKey) : "wines.invalidForm" };
  }
  if (id) updateWishlistItem(user.id, id, parsed.data);
  else addWishlistItem(user.id, parsed.data);
  revalidatePath("/wishlist");
  return { ok: true };
}

export async function removeWishlistItem(id: string) {
  const user = await requireUser();
  deleteWishlistItem(user.id, id);
  revalidatePath("/wishlist");
}
