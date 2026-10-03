import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchAppellations, searchGrapes } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const kind = request.nextUrl.searchParams.get("kind");
  if (q.trim().length < 2) return Response.json([]);
  return Response.json(kind === "grapes" ? searchGrapes(q) : searchAppellations(q));
}
