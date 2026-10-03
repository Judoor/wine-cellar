import "server-only";
import { count, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export function getSetting(key: string): string | undefined {
  return getDb().select().from(schema.appSettings).where(eq(schema.appSettings.key, key)).get()?.value;
}

export function setSetting(key: string, value: string) {
  getDb()
    .insert(schema.appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value } })
    .run();
}

export function countUsers(): number {
  return getDb().select({ n: count() }).from(schema.users).get()?.n ?? 0;
}

/** Registration is always open until the first (admin) account exists. */
export function isRegistrationOpen(): boolean {
  if (countUsers() === 0) return true;
  const env = process.env.ALLOW_REGISTRATION;
  if (env === "false") return false;
  return getSetting("registration_open") !== "false";
}
