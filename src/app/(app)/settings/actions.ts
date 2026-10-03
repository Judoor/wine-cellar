"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { isLocale, type MessageKey } from "@/i18n/config";
import { CURRENCIES } from "@/lib/format";

export type SettingsState = { error?: MessageKey; success?: MessageKey } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(1, "auth.nameRequired"),
  locale: z.string().refine(isLocale),
  currency: z.enum(CURRENCIES),
});

export async function updateProfile(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "common.unexpectedError" };
  getDb().update(schema.users).set(parsed.data).where(eq(schema.users.id, user.id)).run();
  revalidatePath("/", "layout");
  return { success: "common.saved" };
}

const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "auth.passwordTooShort"),
});

export async function changePassword(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message as MessageKey };
  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return { error: "settings.wrongPassword" };
  }
  getDb()
    .update(schema.users)
    .set({ passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) })
    .where(eq(schema.users.id, user.id))
    .run();
  return { success: "settings.passwordChanged" };
}
