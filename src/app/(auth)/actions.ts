"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { countUsers, isRegistrationOpen } from "@/lib/settings";
import { isLocale, LOCALE_COOKIE, type MessageKey } from "@/i18n/config";
import { getLocale } from "@/i18n/server";

export type FormState = { error?: MessageKey } | undefined;

const credentials = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "auth.invalidCredentials" };

  const user = getDb().select().from(schema.users).where(eq(schema.users.email, parsed.data.email)).get();
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "auth.invalidCredentials" };
  }
  await createSession(user.id);
  redirect("/");
}

const registration = z.object({
  name: z.string().trim().min(1, "auth.nameRequired"),
  email: z.string().trim().toLowerCase().email("auth.invalidEmail"),
  password: z.string().min(8, "auth.passwordTooShort"),
  passwordConfirm: z.string(),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  if (!isRegistrationOpen()) return { error: "auth.registrationClosed" };

  const parsed = registration.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message as MessageKey };
  const { name, email, password, passwordConfirm } = parsed.data;
  if (password !== passwordConfirm) return { error: "auth.passwordMismatch" };

  const db = getDb();
  if (db.select().from(schema.users).where(eq(schema.users.email, email)).get()) {
    return { error: "auth.emailTaken" };
  }

  const isFirstUser = countUsers() === 0;
  const user = db
    .insert(schema.users)
    .values({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: isFirstUser ? "admin" : "user",
      locale: await getLocale(),
    })
    .returning()
    .get();

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/** Language picker shown on login/register pages (before an account exists). */
export async function setGuestLocale(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
}
