import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { catalogSize } from "@/lib/catalog";
import { externalLookupsEnabled } from "@/lib/services/barcode";
import { getT } from "@/i18n/server";
import { WineForm } from "../wine-form";

export default async function NewWinePage() {
  await requireUser();
  const t = await getT();
  return (
    <>
      <PageTitle>{t("wines.new")}</PageTitle>
      <WineForm catalogSize={catalogSize()} barcodeEnabled={externalLookupsEnabled()} />
    </>
  );
}
