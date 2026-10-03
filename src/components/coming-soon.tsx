import { Card, PageTitle } from "@/components/ui";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n/config";

/** Temporary page body for sections built in later steps. */
export async function ComingSoon({ title }: { title: MessageKey }) {
  const t = await getT();
  return (
    <>
      <PageTitle>{t(title)}</PageTitle>
      <Card className="py-12 text-center text-muted">{t("common.comingSoon")}</Card>
    </>
  );
}
