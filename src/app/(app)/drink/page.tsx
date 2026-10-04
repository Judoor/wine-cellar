import clsx from "clsx";
import { AlarmClock, CircleCheck, CircleX, Hourglass, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { Card, PageTitle } from "@/components/ui";
import { WindowBadge } from "@/components/window-badge";
import { requireUser } from "@/lib/auth";
import { WINDOW_STATUS_STYLES, type WindowStatus } from "@/lib/drinking-window";
import { getDrinkList } from "@/lib/queries/drink";
import { WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { getLocale, getT } from "@/i18n/server";
import { formatBottleSize } from "@/lib/format";
import type { MessageKey } from "@/i18n/config";
import { DrinkOneButton } from "./drink-one-button";
import Link from "next/link";

const SECTIONS: { status: WindowStatus; title: MessageKey; hint: MessageKey }[] = [
  { status: "past", title: "drink.sectionPast", hint: "drink.sectionPastHint" },
  { status: "declining", title: "drink.sectionDeclining", hint: "drink.sectionDecliningHint" },
  { status: "peak", title: "drink.sectionPeak", hint: "drink.sectionPeakHint" },
  { status: "ready", title: "drink.sectionReady", hint: "drink.sectionReadyHint" },
  { status: "tooYoung", title: "drink.sectionTooYoung", hint: "drink.sectionTooYoungHint" },
  { status: "unknown", title: "drink.sectionUnknown", hint: "drink.sectionUnknownHint" },
];

type WindowYears = { drinkFrom: number | null; peakFrom: number | null; peakUntil: number | null; drinkUntil: number | null };

/** The next milestone worth knowing in each section: when it opens, peaks, stops peaking, or must be drunk. */
function keyDate(status: WindowStatus, w: WindowYears): { icon: LucideIcon; label: MessageKey; year: number } | null {
  const pick = (icon: LucideIcon, label: MessageKey, year: number | null) => (year == null ? null : { icon, label, year });
  switch (status) {
    case "tooYoung":
      return pick(Hourglass, "drink.keyTooYoung", w.drinkFrom ?? w.peakFrom);
    case "ready":
      return pick(TrendingUp, "drink.keyReady", w.peakFrom);
    case "peak":
      return pick(Sparkles, "drink.keyPeak", w.peakUntil);
    case "declining":
      return pick(AlarmClock, "drink.keyDeclining", w.drinkUntil);
    case "past":
      return pick(CircleX, "drink.keyPast", w.drinkUntil);
    default:
      return null;
  }
}

export default async function DrinkPage() {
  const user = await requireUser();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const groups = getDrinkList(user.id);
  const total = Object.values(groups).reduce((s, g) => s + g.length, 0);
  const urgent = groups.past.length + groups.declining.length;

  return (
    <>
      <PageTitle subtitle={t("drink.subtitle")}>{t("drink.title")}</PageTitle>

      {total === 0 ? (
        <Card className="py-12 text-center text-muted">{t("drink.empty")}</Card>
      ) : (
        <div className="space-y-6">
          {urgent === 0 && (
            <p className="flex items-center gap-2 rounded border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              <CircleCheck className="size-4 shrink-0" aria-hidden /> {t("drink.allGood")}
            </p>
          )}
          {SECTIONS.filter((s) => groups[s.status].length > 0).map((s) => (
            <section key={s.status}>
              <div className="mb-2 flex items-baseline gap-3">
                <h2 className="font-serif text-2xl">{t(s.title)}</h2>
                <span className="text-sm text-muted">{groups[s.status].length}</span>
              </div>
              <p className="mb-3 text-sm text-muted">{t(s.hint)}</p>
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 lg:grid-cols-2">
                {groups[s.status].map((w) => {
                  const key = keyDate(s.status, w);
                  const window =
                    w.drinkFrom && w.drinkUntil
                      ? t("drink.window", { from: w.drinkFrom, until: w.drinkUntil })
                      : w.drinkUntil
                        ? t("drink.until", { year: w.drinkUntil })
                        : w.drinkFrom
                          ? t("drink.from", { year: w.drinkFrom })
                          : null;
                  return (
                    <li key={w.id} className="flex items-center gap-3 rounded-md border border-border bg-surface/85 p-3">
                      <span className="size-4 shrink-0 rounded-full border border-black/10" style={{ background: WINE_COLOR_STYLES[w.color].fill }} />
                      <Link href={`/wines/${w.id}`} className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {w.producer} {w.vintage && <span className="font-normal text-muted">{w.vintage}</span>}
                        </p>
                        {/* The date that matters for this section, color-coded like the window badges. */}
                        {key && (
                          <span
                            className={clsx(
                              "mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold",
                              WINDOW_STATUS_STYLES[s.status],
                            )}
                          >
                            <key.icon className="size-3" aria-hidden />
                            {t(key.label, { year: key.year })}
                          </span>
                        )}
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {[w.name, w.appellation ?? w.region, formatBottleSize(w.bottleSizeMl, locale), window].filter(Boolean).join(" · ")}
                        </p>
                      </Link>
                      <span className="hidden sm:inline">
                        <WindowBadge status="unknown" label={`×${w.stock}`} />
                      </span>
                      {s.status !== "tooYoung" && <DrinkOneButton wineId={w.id} />}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
