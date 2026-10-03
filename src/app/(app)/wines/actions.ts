"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  addBottles,
  createWine,
  deleteImage,
  deleteWine,
  getWine,
  movementSchema,
  removeBottles,
  saveImage,
  updateWine,
  wineInputSchema,
} from "@/lib/services/wines";
import { addTastingNote, deleteTastingNote, tastingInputSchema, updateTastingNote } from "@/lib/services/tasting";
import { deleteWishlistItem, getWishlistItem } from "@/lib/services/wishlist";
import type { MessageKey } from "@/i18n/config";

export type WineFormState = { error?: MessageKey; fieldErrors?: Record<string, MessageKey> } | undefined;

export async function saveWine(wineId: string | null, _: WineFormState, formData: FormData): Promise<WineFormState> {
  const user = await requireUser();
  const parsed = wineInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, MessageKey> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message.includes(".") ? (issue.message as MessageKey) : "wines.invalidForm";
    }
    return { error: "wines.invalidForm", fieldErrors };
  }

  const photo = formData.get("photo");
  const newImage = photo instanceof File && photo.size > 0 ? await saveImage(photo) : null;

  if (wineId) {
    const existing = getWine(user.id, wineId);
    if (!existing) return { error: "common.unexpectedError" };
    const removePhoto = formData.get("removePhoto") === "1";
    const imageFile = newImage ?? (removePhoto ? null : existing.imageFile);
    updateWine(user.id, wineId, { ...parsed.data, imageFile });
    if (existing.imageFile && existing.imageFile !== imageFile) await deleteImage(existing.imageFile);
  } else {
    const quantity = Math.max(0, Math.min(500, Number(formData.get("quantity")) || 0));
    // Created from a wishlist entry ("Bought it"): photo and tasting move to the new wine.
    const wishlistId = formData.get("wishlistId");
    const wish = typeof wishlistId === "string" && wishlistId ? getWishlistItem(user.id, wishlistId) : undefined;
    // The wish is gone: this form was already saved (e.g. browser "back" then "Save" again).
    if (typeof wishlistId === "string" && wishlistId && !wish) {
      if (newImage) await deleteImage(newImage);
      return { error: "wishlist.alreadyBought" };
    }
    const imageFile = newImage ?? (formData.get("removePhoto") === "1" ? null : (wish?.imageFile ?? null));
    wineId = createWine(user.id, parsed.data, quantity, imageFile).id;
    if (wish) {
      if (wish.rating != null || wish.tastedWhere || wish.tastedOn) {
        addTastingNote(user.id, wineId, {
          date: wish.tastedOn ?? wish.createdAt,
          rating: wish.rating,
          occasion: wish.tastedWhere,
          notes: null,
          companions: null,
        });
      }
      deleteWishlistItem(user.id, wish.id);
      // The photo now belongs to the wine; drop it only if it wasn't kept.
      if (wish.imageFile && wish.imageFile !== imageFile) await deleteImage(wish.imageFile);
    }
  }

  revalidatePath("/", "layout");
  redirect(`/wines/${wineId}`);
}

export async function removeWine(wineId: string) {
  const user = await requireUser();
  await deleteWine(user.id, wineId);
  revalidatePath("/", "layout");
  redirect("/wines");
}

/* ---------- Tasting notes ---------- */

export type TastingState = { error?: MessageKey; ok?: boolean } | undefined;

export async function saveTastingNote(wineId: string, noteId: string | null, _: TastingState, formData: FormData): Promise<TastingState> {
  const user = await requireUser();
  const parsed = tastingInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "wines.invalidForm" };
  if (noteId) updateTastingNote(user.id, noteId, parsed.data);
  else if (!addTastingNote(user.id, wineId, parsed.data)) return { error: "common.unexpectedError" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeTastingNote(noteId: string) {
  const user = await requireUser();
  deleteTastingNote(user.id, noteId);
  revalidatePath("/", "layout");
}

/** Takes one bottle out as "drunk" (unplaced bottles first). */
export async function drinkOne(wineId: string) {
  const user = await requireUser();
  const result = removeBottles(user.id, wineId, { quantity: 1, reason: "drunk", date: new Date(), note: null });
  revalidatePath("/", "layout");
  return result.ok;
}

export type MoveState = { error?: MessageKey; ok?: boolean } | undefined;

export async function moveBottles(
  wineId: string,
  direction: "in" | "out",
  _: MoveState,
  formData: FormData,
): Promise<MoveState> {
  const user = await requireUser();
  const parsed = movementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "wines.invalidForm" };

  if (direction === "in") {
    if (!addBottles(user.id, wineId, parsed.data)) return { error: "common.unexpectedError" };
  } else {
    const result = removeBottles(user.id, wineId, parsed.data);
    if (!result.ok) return { error: result.error === "notEnough" ? "wines.notEnoughBottles" : "common.unexpectedError" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
