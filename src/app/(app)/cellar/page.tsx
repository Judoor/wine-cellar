import { ChevronRight, Grid3x3 } from "lucide-react";
import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listLocations, listUnplaced } from "@/lib/services/cellar";
import { getT } from "@/i18n/server";
import { LocationForm } from "./location-form";

export default async function CellarPage() {
  const user = await requireUser();
  const t = await getT();
  const locations = listLocations(user.id);
  const unplaced = listUnplaced(user.id).reduce((s, w) => s + w.count, 0);

  return (
    <>
      <PageTitle subtitle={t("cellar.subtitle")}>{t("cellar.title")}</PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {locations.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-14 text-center">
              <Grid3x3 className="size-10 text-muted" aria-hidden />
              <h2 className="font-serif text-2xl">{t("cellar.empty")}</h2>
              <p className="max-w-sm text-sm text-muted">{t("cellar.emptyText")}</p>
            </Card>
          ) : (
            locations.map((l) => {
              const fill = l.capacity ? Math.round((l.bottles / l.capacity) * 100) : 0;
              return (
                <Link
                  key={l.id}
                  href={`/cellar/${l.id}`}
                  className="flex items-center gap-4 rounded-md border border-border bg-surface/85 p-4 shadow-[0_8px_24px_-18px_rgb(58_37_23/0.5)] transition-colors hover:border-accent"
                >
                  <div className="oak flex size-14 shrink-0 items-center justify-center rounded">
                    <Grid3x3 className="size-6" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-xl">{l.name}</p>
                    <p className="text-sm text-muted">
                      {t("cellar.racksCount", { count: l.racks })} · {t("cellar.capacity", { bottles: l.bottles, capacity: l.capacity })}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#e9cf7a] to-primary" style={{ width: `${fill}%` }} />
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              );
            })
          )}
          {unplaced > 0 && <p className="px-1 text-sm text-muted">{t("cellar.notPlaced", { count: unplaced })}</p>}
        </div>

        <Card className="h-fit">
          <h2 className="mb-4 font-serif text-2xl">{t("cellar.newLocation")}</h2>
          <LocationForm />
        </Card>
      </div>
    </>
  );
}
