"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { deleteImage, saveImage } from "@/lib/services/wines";
import { addWishlistItem, deleteWishlistItem, getWishlistItem, updateWishlistItem, wishlistInputSchema } from "@/lib/services/wishlist";
import type { MessageKey } from "@/i18n/config";

export type WishlistState = { error?: MessageKey; ok?: boolean } | undefined;

export async function saveWishlistItem(id: string | null, _: WishlistState, formData: FormData): Promise<WishlistState> {
  const user = await requireUser();
  const parsed = wishlistInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "";
    return { error: msg.includes(".") ? (msg as MessageKey) : "wines.invalidForm" };
  }

  const photo = formData.get("photo");
  const newImage = photo instanceof File && photo.size > 0 ? await saveImage(photo) : null;

  if (id) {
    const existing = getWishlistItem(user.id, id);
    if (!existing) return { error: "common.unexpectedError" };
    const imageFile = newImage ?? (formData.get("removePhoto") === "1" ? null : existing.imageFile);
    updateWishlistItem(user.id, id, { ...parsed.data, imageFile });
    if (existing.imageFile && existing.imageFile !== imageFile) await deleteImage(existing.imageFile);
  } else {
    addWishlistItem(user.id, { ...parsed.data, imageFile: newImage });
  }
  revalidatePath("/wishlist");
  return { ok: true };
}

export async function removeWishlistItem(id: string) {
  const user = await requireUser();
  const item = deleteWishlistItem(user.id, id);
  if (item?.imageFile) await deleteImage(item.imageFile);
  revalidatePath("/wishlist");
}
