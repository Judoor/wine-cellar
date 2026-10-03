import { Plus } from "lucide-react";
import Link from "next/link";
import { GlassShelf } from "@/components/glass";
import { buttonClass, Card, PageTitle, Pill, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getDashboard } from "@/lib/queries/dashboard";
import { WINE_COLOR_ORDER, WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { getLocale, getT } from "@/i18n/server";

export default async function DashboardPage() {
  const user = await requireUser();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const d = getDashboard(user.id);
  const date = new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  const colors = WINE_COLOR_ORDER.map((color) => ({
    color,
    n: d.byColor.find((c) => c.color === color)?.n ?? 0,
  })).filter((c) => c.n > 0);

  return (
    <>
      <PageTitle
        kicker={t("dashboard.kicker", { date })}
        subtitle={
          d.bottles === 0
            ? t("dashboard.subtitleEmpty", { name: user.name })
            : d.locations > 1
              ? t("dashboard.subtitle", { bottles: d.bottles, locations: d.locations })
              : t("dashboard.subtitleSingle", { bottles: d.bottles })
        }
        actions={
          <Link href="/wines/new" className={buttonClass("primary")}>
            <Plus className="size-4" aria-hidden />
            {t("dashboard.addWine")}
          </Link>
        }
      >
        {t("dashboard.title")} <em className="text-primary">{t("dashboard.titleEm")}</em>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Stat label={t("dashboard.bottles")} value={d.bottles} />
        <Stat label={t("dashboard.wines")} value={d.wines} />
        <Stat label={t("dashboard.value")} value={formatMoney(d.value, user.currency, locale)} />
        <Stat label={t("dashboard.readyToDrink")} value={d.drinkThisYear} />
      </div>

      <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionTitle>{t("dashboard.atPeak")}</SectionTitle>
          {d.atPeak.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{t("dashboard.atPeakEmpty")}</p>
          ) : (
            <ul className="divide-y divide-dashed divide-border">
              {d.atPeak.map((w) => (
                <li key={w.id} className="flex items-center gap-3 py-3">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: WINE_COLOR_STYLES[w.color].fill }} />
                  <Link href={`/wines/${w.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{w.producer}</p>
                    <p className="truncate text-xs uppercase tracking-wider text-muted">
                      {[w.name ?? w.appellation, w.vintage].filter(Boolean).join(" · ")}
                    </p>
                  </Link>
                  <Pill>×{w.stock}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>{t("dashboard.breakdown")}</SectionTitle>
          <GlassShelf fills={(colors.length ? colors : WINE_COLOR_ORDER.map((color) => ({ color }))).map((c) => WINE_COLOR_STYLES[c.color].fill)} />
          {colors.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted">{t("dashboard.breakdownEmpty")}</p>
          ) : (
            <>
              <div className="mt-4 flex h-3.5 overflow-hidden rounded-full">
                {colors.map((c) => (
                  <span key={c.color} style={{ flex: c.n, background: WINE_COLOR_STYLES[c.color].fill }} />
                ))}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {colors.map((c) => (
                  <li key={c.color} className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ background: WINE_COLOR_STYLES[c.color].fill }} />
                    {t(`colors.${c.color}`)}
                    <b className="ml-auto">{Math.round((c.n / d.bottles) * 100)}%</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4 md:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 truncate font-serif text-3xl md:text-4xl">{value}</p>
    </Card>
  );
}
