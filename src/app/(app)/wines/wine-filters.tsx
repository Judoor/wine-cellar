"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui";
import { WINE_COLOR_ORDER } from "@/lib/wine-colors";
import { useI18n } from "@/i18n/client";

export function WineFilters({ regions }: { regions: string[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
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
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 md:flex md:flex-wrap md:items-center">
        <Select value={params.get("color") ?? ""} onChange={(e) => update("color", e.target.value)} className="md:w-48">
          <option value="">{t("wines.allColors")}</option>
          {WINE_COLOR_ORDER.map((c) => (
            <option key={c} value={c}>
              {t(`colors.${c}`)}
            </option>
          ))}
        </Select>
        <Select value={params.get("region") ?? ""} onChange={(e) => update("region", e.target.value)} className="md:w-48">
          <option value="">{t("wines.allRegions")}</option>
          {regions.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
        <Select value={params.get("sort") ?? "recent"} onChange={(e) => update("sort", e.target.value === "recent" ? "" : e.target.value)} className="col-span-2 md:w-56">
          <option value="recent">{t("wines.sortRecent")}</option>
          <option value="producer">{t("wines.sortProducer")}</option>
          <option value="vintage">{t("wines.sortVintage")}</option>
          <option value="window">{t("wines.sortWindow")}</option>
        </Select>
        <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm md:ml-2">
          <input
            type="checkbox"
            checked={params.get("all") === "1"}
            onChange={(e) => update("all", e.target.checked ? "1" : "")}
            className="size-4 accent-primary"
          />
          {t("wines.showFinished")}
        </label>
      </div>
    </div>
  );
}
