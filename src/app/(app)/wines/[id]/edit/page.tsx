import { notFound } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getWine } from "@/lib/services/wines";
import { getT } from "@/i18n/server";
import { WineForm } from "../../wine-form";

export default async function EditWinePage(props: PageProps<"/wines/[id]/edit">) {
  const { id } = await props.params;
  const user = await requireUser();
  const wine = getWine(user.id, id);
  if (!wine) notFound();
  const t = await getT();
  return (
    <>
      <PageTitle kicker={wine.producer}>{t("wines.editTitle")}</PageTitle>
      <WineForm wine={wine} />
    </>
  );
}
