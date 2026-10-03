import { Plus, Wine as WineIcon } from "lucide-react";
import Link from "next/link";
import { buttonClass, Card, PageTitle } from "@/components/ui";
import { WindowBadge } from "@/components/window-badge";
import { requireUser } from "@/lib/auth";
import { windowStatus } from "@/lib/drinking-window";
import { listRegions, listWines, type WineListFilters } from "@/lib/services/wines";
import { WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { getT } from "@/i18n/server";
import { WineFilters } from "./wine-filters";

const SORTS = ["recent", "producer", "vintage", "window"] as const;

export default async function WinesPage(props: PageProps<"/wines">) {
  const user = await requireUser();
  const t = await getT();
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const filters: WineListFilters = {
    q: str("q"),
    color: str("color"),
    region: str("region"),
    includeFinished: str("all") === "1",
    sort: SORTS.find((s) => s === str("sort")) ?? "recent",
  };
  const wines = listWines(user.id, filters);
  const isFiltered = !!(filters.q || filters.color || filters.region);

  return (
    <>
      <PageTitle
        subtitle={t("wines.subtitle", { count: wines.length })}
        actions={
          <Link href="/wines/new" className={buttonClass("primary")}>
            <Plus className="size-4" aria-hidden />
            {t("wines.add")}
          </Link>
        }
      >
        {t("wines.title")}
      </PageTitle>

      <WineFilters regions={listRegions(user.id)} />

      {wines.length === 0 ? (
        <Card className="mt-4 flex flex-col items-center gap-3 py-14 text-center">
          <WineIcon className="size-10 text-muted" aria-hidden />
          <p className="text-muted">{isFiltered ? t("wines.noResults") : t("wines.empty")}</p>
        </Card>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {wines.map((w) => {
            const status = windowStatus(w);
            return (
              <li key={w.id}>
                <Link
                  href={`/wines/${w.id}`}
                  className="flex h-full gap-3 rounded-md border border-border bg-surface/85 p-3 shadow-[0_8px_24px_-18px_rgb(58_37_23/0.5)] transition-colors hover:border-accent"
                >
                  <div className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2">
                    {w.imageFile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/uploads/${w.imageFile}`} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <span className="size-6 rounded-full border border-black/10" style={{ background: WINE_COLOR_STYLES[w.color].fill }} />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate font-semibold">{w.producer}</p>
                    <p className="truncate text-sm text-muted">{[w.name, w.vintage ?? t("wines.nonVintage")].filter(Boolean).join(" · ")}</p>
                    <p className="truncate text-xs uppercase tracking-wider text-muted">{w.appellation ?? w.region}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <WindowBadge status={status} label={t(`window.${status}`)} />
                      <span className={w.stock > 0 ? "font-serif text-lg" : "text-xs text-muted"}>
                        {w.stock > 0 ? t("wines.bottlesCount", { count: w.stock }) : t("wines.finished")}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
