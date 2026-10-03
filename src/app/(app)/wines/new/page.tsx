import { PageTitle } from "@/components/ui";
import { estimateWindow } from "@/lib/aging";
import { requireUser } from "@/lib/auth";
import { catalogSize, findAppellation } from "@/lib/catalog";
import { externalLookupsEnabled } from "@/lib/services/barcode";
import { getWishlistItem } from "@/lib/services/wishlist";
import { getT } from "@/i18n/server";
import { WineForm } from "../wine-form";

export default async function NewWinePage(props: PageProps<"/wines/new">) {
  const user = await requireUser();
  const t = await getT();
  const { wishlist } = await props.searchParams;
  const wish = typeof wishlist === "string" ? getWishlistItem(user.id, wishlist) : undefined;
  const app = wish?.appellation ? findAppellation(wish.appellation) : undefined;

  return (
    <>
      <PageTitle>{t("wines.new")}</PageTitle>
      <WineForm
        key={wish?.id ?? "blank"}
        catalogSize={catalogSize()}
        barcodeEnabled={externalLookupsEnabled()}
        wishlistId={wish?.id}
        initial={
          wish && {
            producer: wish.producer,
            name: wish.name,
            vintage: wish.vintage,
            color: wish.color ?? undefined,
            appellation: wish.appellation,
            region: app?.region ?? null,
            purchasePrice: wish.targetPrice,
            notes: wish.notes,
            barcode: wish.barcode,
            imageFile: wish.imageFile,
            ...(wish.color &&
              estimateWindow({ color: wish.color, vintage: wish.vintage, appellation: wish.appellation, region: app?.region, name: wish.name })),
          }
        }
      />
    </>
  );
}
