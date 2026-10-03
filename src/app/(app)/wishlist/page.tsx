import { requireUser } from "@/lib/auth";
import { catalogSize } from "@/lib/catalog";
import { listWishlist } from "@/lib/services/wishlist";
import { PageTitle } from "@/components/ui";
import { getT } from "@/i18n/server";
import { WishlistBoard } from "./wishlist-board";

export default async function WishlistPage() {
  const user = await requireUser();
  const t = await getT();
  return (
    <>
      <PageTitle subtitle={t("wishlist.subtitle")}>{t("wishlist.title")}</PageTitle>
      <WishlistBoard items={listWishlist(user.id)} currency={user.currency} catalogSize={catalogSize()} />
    </>
  );
}
