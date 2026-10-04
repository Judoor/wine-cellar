import { requireUser } from "@/lib/auth";
import { catalogSize } from "@/lib/catalog";
import { externalLookupsEnabled } from "@/lib/services/barcode";
import { listWishlist } from "@/lib/services/wishlist";
import { WishlistBoard } from "./wishlist-board";

export default async function WishlistPage() {
  const user = await requireUser();
  const items = listWishlist(user.id).map((i) => ({ ...i, tastedOn: i.tastedOn?.toISOString() ?? null, createdAt: undefined }));
  return (
    <WishlistBoard items={items} currency={user.currency} catalogSize={catalogSize()} barcodeEnabled={externalLookupsEnabled()} />
  );
}
