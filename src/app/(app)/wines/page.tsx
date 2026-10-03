import { Heart, Plus, Wine as WineIcon } from "lucide-react";
import { listTastedWishlist } from "@/lib/services/wishlist";
import Link from "next/link";
import { buttonClass, Card, PageTitle } from "@/components/ui";
import { Stars } from "@/components/stars";
import { WindowBadge } from "@/components/window-badge";
import { requireUser } from "@/lib/auth";
import { windowStatus } from "@/lib/drinking-window";
import { listRegions, listWines, type WineListFilters } from "@/lib/services/wines";
import { WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { getLocale, getT } from "@/i18n/server";
import { formatBottleSize } from "@/lib/format";
import { WineFilters } from "./wine-filters";

const SORTS = ["recent", "producer", "vintage", "window", "rating"] as const;
const STATUSES = ["stock", "tasted", "all"] as const;
const WINDOWS = ["peak", "ready", "declining", "past", "tooYoung", "unknown"] as const;

export default async function WinesPage(props: PageProps<"/wines">) {
  const user = await requireUser();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const filters: WineListFilters = {
    q: str("q"),
    color: str("color"),
    region: str("region"),
    status: STATUSES.find((s) => s === str("status")) ?? "stock",
    minRating: Number(str("rating")) || undefined,
    pairing: str("pairing"),
    window: WINDOWS.find((w) => w === str("window")),
    sort: SORTS.find((s) => s === str("sort")) ?? "recent",
  };
  const wines = listWines(user.id, filters);
  // "Already tasted" also lists wishlist wines tasted elsewhere (filters that only make sense for owned wines exclude them).
  const tastedElsewhere =
    filters.status === "tasted" && !filters.region && !filters.pairing && !filters.window
      ? listTastedWishlist(user.id, { q: filters.q, color: filters.color, minRating: filters.minRating, sort: filters.sort })
      : [];
  const total = wines.length + tastedElsewhere.length;
  const isFiltered = !!(filters.q || filters.color || filters.region || filters.minRating || filters.pairing || filters.window || filters.status !== "stock");

  return (
    <>
      <PageTitle
        subtitle={total === 1 ? t("wines.subtitleOne") : t("wines.subtitle", { count: total })}
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

      {total === 0 ? (
        <Card className="mt-4 flex flex-col items-center gap-3 py-14 text-center">
          <WineIcon className="size-10 text-muted" aria-hidden />
          <p className="text-muted">{isFiltered ? t("wines.noResults") : t("wines.empty")}</p>
        </Card>
      ) : (
        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                    <p className="truncate text-sm text-muted">
                      {[w.name, w.vintage ?? t("wines.nonVintage")].filter(Boolean).join(" · ")}
                    </p>
                    <p className="truncate text-xs uppercase tracking-wider text-muted">{w.appellation ?? w.region}</p>
                    {w.rating != null && (
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        <Stars value={w.rating} /> {Number(w.rating).toFixed(1)}
                      </span>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <WindowBadge status={status} label={t(`window.${status}`)} />
                      <span className="flex shrink-0 items-baseline gap-1.5">
                        <span className="text-xs text-muted">{formatBottleSize(w.bottleSizeMl, locale)}</span>
                        <span className={w.stock > 0 ? "font-serif text-lg" : "text-xs text-muted"}>
                          {w.stock > 0 ? t("wines.bottlesCount", { count: w.stock }) : t("wines.finished")}
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {tastedElsewhere.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">{t("wines.tastedElsewhere")}</h2>
          <p className="mb-3 text-sm text-muted">{t("wines.tastedElsewhereHint")}</p>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tastedElsewhere.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/wishlist#wish-${w.id}`}
                  className="flex h-full gap-3 rounded-md border border-dashed border-border bg-surface/60 p-3 transition-colors hover:border-accent"
                >
                  <div className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2">
                    {w.imageFile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/uploads/${w.imageFile}`} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <span
                        className="size-6 rounded-full border border-black/10"
                        style={{ background: w.color ? WINE_COLOR_STYLES[w.color].fill : "transparent" }}
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate font-semibold">{w.producer}</p>
                    <p className="truncate text-sm text-muted">{[w.name, w.vintage].filter(Boolean).join(" · ")}</p>
                    <p className="truncate text-xs uppercase tracking-wider text-muted">{w.appellation}</p>
                    {w.rating != null && (
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        <Stars value={w.rating} /> {w.rating.toFixed(1)}
                      </span>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted">
                      <span className="flex min-w-0 items-center gap-1 truncate">
                        <Heart className="size-3.5 shrink-0 text-primary" aria-hidden />
                        {t("wines.inWishlist")}
                      </span>
                      {(w.tastedWhere || w.tastedOn) && (
                        <span className="truncate">{[w.tastedWhere, w.tastedOn?.toLocaleDateString(locale)].filter(Boolean).join(" · ")}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
