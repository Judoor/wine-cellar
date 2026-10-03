import { CircleCheck } from "lucide-react";
import { Card, PageTitle } from "@/components/ui";
import { WindowBadge } from "@/components/window-badge";
import { requireUser } from "@/lib/auth";
import type { WindowStatus } from "@/lib/drinking-window";
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
                  const years =
                    s.status === "tooYoung"
                      ? w.drinkFrom ?? w.peakFrom
                        ? t("drink.from", { year: (w.drinkFrom ?? w.peakFrom)! })
                        : null
                      : w.drinkUntil ?? w.peakUntil
                        ? t("drink.until", { year: (w.drinkUntil ?? w.peakUntil)! })
                        : null;
                  return (
                    <li key={w.id} className="flex items-center gap-3 rounded-md border border-border bg-surface/85 p-3">
                      <span className="size-4 shrink-0 rounded-full border border-black/10" style={{ background: WINE_COLOR_STYLES[w.color].fill }} />
                      <Link href={`/wines/${w.id}`} className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {w.producer} {w.vintage && <span className="font-normal text-muted">{w.vintage}</span>}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {[w.name, w.appellation ?? w.region, formatBottleSize(w.bottleSizeMl, locale)].filter(Boolean).join(" · ")}
                          {years && <> · {years}</>}
                        </p>
                      </Link>
                      <span className="hidden sm:inline">
                        <WindowBadge status={s.status} label={`×${w.stock}`} />
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
