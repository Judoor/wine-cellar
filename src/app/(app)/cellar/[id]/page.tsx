import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLocation, listUnplaced } from "@/lib/services/cellar";
import { rackCapacity } from "@/lib/slots";
import { getT } from "@/i18n/server";
import { CellarBoard } from "./cellar-board";
import { LocationActions } from "./location-actions";

export default async function LocationPage(props: PageProps<"/cellar/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();
  const location = getLocation(user.id, id);
  if (!location) notFound();
  const t = await getT();
  const capacity = location.racks.reduce((s, r) => s + rackCapacity(r), 0);

  return (
    <>
      <Link href="/cellar" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {t("cellar.title")}
      </Link>
      <PageTitle
        subtitle={location.description ?? t("cellar.capacity", { bottles: location.bottles.length, capacity })}
        menu={<LocationActions location={location} />}
      >
        {location.name}
      </PageTitle>
      <CellarBoard locationId={location.id} racks={location.racks} bottles={location.bottles} unplaced={listUnplaced(user.id)} />
    </>
  );
}
