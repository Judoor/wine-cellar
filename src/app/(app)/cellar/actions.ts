"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  createLocation,
  createRack,
  deleteLocation,
  deleteRack,
  locationInputSchema,
  placeBottle,
  rackInputSchema,
  unplaceBottle,
  updateLocation,
  updateRack,
  type Target,
} from "@/lib/services/cellar";
import { removeBottles } from "@/lib/services/wines";
import type { MessageKey } from "@/i18n/config";

export type CellarFormState = { error?: MessageKey; ok?: boolean } | undefined;

const firstError = (issues: { message: string }[]): MessageKey =>
  issues[0]?.message.includes(".") ? (issues[0].message as MessageKey) : "wines.invalidForm";

export async function saveLocation(locationId: string | null, _: CellarFormState, formData: FormData): Promise<CellarFormState> {
  const user = await requireUser();
  const parsed = locationInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  if (locationId) {
    updateLocation(user.id, locationId, parsed.data);
    revalidatePath("/cellar", "layout");
    return { ok: true };
  }
  const location = createLocation(user.id, parsed.data);
  revalidatePath("/cellar", "layout");
  redirect(`/cellar/${location.id}`);
}

export async function removeLocation(locationId: string) {
  const user = await requireUser();
  deleteLocation(user.id, locationId);
  revalidatePath("/", "layout");
  redirect("/cellar");
}

export async function saveRack(
  locationId: string,
  rackId: string | null,
  _: CellarFormState,
  formData: FormData,
): Promise<CellarFormState> {
  const user = await requireUser();
  const parsed = rackInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  if (rackId) {
    const result = updateRack(user.id, rackId, parsed.data);
    if (!result.ok) return { error: result.error === "bottlesOutside" ? "cellar.bottlesOutside" : "common.unexpectedError" };
  } else if (!createRack(user.id, locationId, parsed.data)) {
    return { error: "common.unexpectedError" };
  }
  revalidatePath(`/cellar/${locationId}`);
  return { ok: true };
}

export async function removeRack(locationId: string, rackId: string) {
  const user = await requireUser();
  deleteRack(user.id, rackId);
  revalidatePath(`/cellar/${locationId}`);
}

export async function place(source: { bottleId: string } | { wineId: string }, target: Target) {
  const user = await requireUser();
  const result = placeBottle(user.id, source, target);
  revalidatePath("/", "layout");
  return result.ok;
}

export async function unplace(bottleId: string) {
  const user = await requireUser();
  unplaceBottle(user.id, bottleId);
  revalidatePath("/", "layout");
}

export async function drinkBottle(wineId: string, bottleId: string) {
  const user = await requireUser();
  removeBottles(user.id, wineId, { quantity: 1, reason: "drunk", date: new Date(), note: null }, [bottleId]);
  revalidatePath("/", "layout");
}
