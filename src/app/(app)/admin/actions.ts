"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { setSetting } from "@/lib/settings";

export async function setRegistrationOpen(open: boolean) {
  await requireAdmin();
  setSetting("registration_open", String(open));
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: "admin" | "user") {
  const admin = await requireAdmin();
  if (userId === admin.id) return; // Admins can't demote themselves (avoids locking everyone out).
  getDb().update(schema.users).set({ role }).where(eq(schema.users.id, userId)).run();
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return;
  const db = getDb();
  const otherAdmins =
    db
      .select({ n: count() })
      .from(schema.users)
      .where(and(eq(schema.users.role, "admin"), ne(schema.users.id, userId)))
      .get()?.n ?? 0;
  if (otherAdmins === 0) return;
  db.delete(schema.users).where(eq(schema.users.id, userId)).run();
  revalidatePath("/admin");
}
