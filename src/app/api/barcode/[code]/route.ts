import { getCurrentUser } from "@/lib/auth";
import { lookupBarcode } from "@/lib/services/barcode";

export async function GET(_: Request, ctx: RouteContext<"/api/barcode/[code]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { code } = await ctx.params;
  if (!/^\d{8,14}$/.test(code)) return new Response("Invalid barcode", { status: 400 });
  return Response.json(await lookupBarcode(user.id, code));
}
