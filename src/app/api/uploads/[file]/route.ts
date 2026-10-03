import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { UPLOADS_DIR } from "@/lib/db";
import { findUserImage } from "@/lib/services/wines";

const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_: Request, ctx: RouteContext<"/api/uploads/[file]">) {
  const { file } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || !findUserImage(user.id, file)) return new Response("Not found", { status: 404 });

  const data = await fs.readFile(path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, file)).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": CONTENT_TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream",
      // File names are random UUIDs and never reused.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
