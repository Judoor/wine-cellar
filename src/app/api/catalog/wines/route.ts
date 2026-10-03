import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { searchCatalogWines } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const q = request.nextUrl.searchParams.get("q") ?? "";
  return Response.json(q.trim().length < 2 ? [] : searchCatalogWines(q));
}
