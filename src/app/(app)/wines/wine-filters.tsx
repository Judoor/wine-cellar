"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { PAIRING_KEYS } from "@/lib/pairings";
import { WINE_COLOR_ORDER, WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { useI18n } from "@/i18n/client";

const WINDOWS = ["peak", "ready", "declining", "past", "tooYoung", "unknown"] as const;
const ADVANCED = ["region", "rating", "pairing", "window"];

export function WineFilters({ regions }: { regions: string[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const activeAdvanced = ADVANCED.filter((k) => params.get(k)).length;
  const [open, setOpen] = useState(activeAdvanced > 0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  }

  // Debounced search-as-you-type.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update("q", q.trim()), 300);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const color = params.get("color") ?? "";
  const status = params.get("status") ?? "stock";
  const hasFilters = [...params.keys()].some((k) => k !== "sort");

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("wines.searchPlaceholder")}
          aria-label={t("common.search")}
          className="pl-9"
        />
      </div>

      {/* Stock status: segmented control */}
      <div className="flex rounded border border-border bg-surface p-1 text-sm">
        {(["stock", "tasted", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => update("status", s === "stock" ? "" : s)}
            className={cn("flex-1 rounded px-2 py-1.5 font-medium", status === s ? "bg-oak text-oak-foreground" : "text-muted hover:text-foreground")}
          >
            {t(s === "stock" ? "wines.statusStock" : s === "tasted" ? "wines.statusTasted" : "wines.statusAll")}
          </button>
        ))}
      </div>

      {/* Color chips */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {WINE_COLOR_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={color === c}
            onClick={() => update("color", color === c ? "" : c)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
              color === c ? "border-accent bg-accent-soft font-semibold" : "border-border bg-surface text-muted hover:border-accent",
            )}
          >
            <span className="size-3 rounded-full border border-black/10" style={{ background: WINE_COLOR_STYLES[c].fill }} />
            {t(`colors.${c}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="inline-flex min-h-10 items-center gap-2 rounded border border-border bg-surface px-3 text-sm font-medium hover:bg-surface-2"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {t("wines.moreFilters")}
          {activeAdvanced > 0 && <span className="rounded-full bg-oak px-1.5 text-xs text-oak-foreground">{activeAdvanced}</span>}
        </button>
        <Select value={params.get("sort") ?? "recent"} onChange={(e) => update("sort", e.target.value === "recent" ? "" : e.target.value)} className="w-auto flex-1 sm:flex-none">
          <option value="recent">{t("wines.sortRecent")}</option>
          <option value="rating">{t("wines.sortRating")}</option>
          <option value="producer">{t("wines.sortProducer")}</option>
          <option value="vintage">{t("wines.sortVintage")}</option>
          <option value="window">{t("wines.sortWindow")}</option>
        </Select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="inline-flex min-h-10 items-center gap-1 px-2 text-sm text-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden /> {t("wines.resetFilters")}
          </button>
        )}
      </div>

      {open && (
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 lg:grid-cols-4">
          <Select value={params.get("region") ?? ""} onChange={(e) => update("region", e.target.value)} aria-label={t("wines.region")}>
            <option value="">{t("wines.allRegions")}</option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
          <Select value={params.get("rating") ?? ""} onChange={(e) => update("rating", e.target.value)} aria-label={t("tasting.rating")}>
            <option value="">{t("wines.anyRating")}</option>
            {["3", "3.5", "4", "4.5"].map((r) => (
              <option key={r} value={r}>
                {t("wines.minRating", { rating: r })}
              </option>
            ))}
          </Select>
          <Select value={params.get("pairing") ?? ""} onChange={(e) => update("pairing", e.target.value)} aria-label={t("quickFill.pairings")}>
            <option value="">{t("wines.anyPairing")}</option>
            {PAIRING_KEYS.map((p) => (
              <option key={p} value={p}>
                {t(`pairings.${p}`)}
              </option>
            ))}
          </Select>
          <Select value={params.get("window") ?? ""} onChange={(e) => update("window", e.target.value)} aria-label={t("wines.sectionWindow")}>
            <option value="">{t("wines.anyWindow")}</option>
            {WINDOWS.map((w) => (
              <option key={w} value={w}>
                {t(`window.${w}`)}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
