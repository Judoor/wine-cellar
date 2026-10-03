import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { WindowBadge } from "@/components/window-badge";
import { requireUser } from "@/lib/auth";
import { windowStatus } from "@/lib/drinking-window";
import { formatMoney } from "@/lib/format";
import { getWine } from "@/lib/services/wines";
import { WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { getLocale, getT } from "@/i18n/server";
import { DeleteWineButton, StockControls } from "./stock-controls";
import { WindowTimeline } from "./window-timeline";

export default async function WinePage(props: PageProps<"/wines/[id]">) {
  const { id } = await props.params;
  const user = await requireUser();
  const wine = getWine(user.id, id);
  if (!wine) notFound();
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const status = windowStatus(wine);
  const money = (n: number | null) => (n == null ? null : formatMoney(n, user.currency, locale));

  const details: [string, React.ReactNode][] = [
    [t("wines.color"), t(`colors.${wine.color}`)],
    [t("wines.appellation"), wine.appellation],
    [t("wines.region"), wine.region],
    [t("wines.country"), wine.country],
    [t("wines.grapes"), wine.grapes],
    [t("wines.alcohol"), wine.alcohol != null ? `${wine.alcohol} %` : null],
    [t("wines.bottleSize"), wine.bottleSizeMl >= 1000 ? `${wine.bottleSizeMl / 1000} L` : `${wine.bottleSizeMl / 10} cl`],
    [t("wines.purchasePrice"), money(wine.purchasePrice)],
    [t("wines.estimatedValue"), money(wine.estimatedValue)],
  ];

  return (
    <>
      <Link href="/wines" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {t("wines.title")}
      </Link>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden p-0">
            {wine.imageFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/uploads/${wine.imageFile}`} alt="" className="aspect-[3/4] w-full object-cover" />
            ) : (
              <div
                className="flex aspect-[4/3] items-center justify-center lg:aspect-[3/4]"
                style={{ background: `radial-gradient(circle at 50% 60%, ${WINE_COLOR_STYLES[wine.color].fill}, #3d2818 75%)` }}
              />
            )}
          </Card>
          <StockControls wineId={wine.id} stock={wine.stock} />
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="size-3 rounded-full" style={{ background: WINE_COLOR_STYLES[wine.color].fill }} />
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{wine.appellation ?? wine.region}</span>
              <WindowBadge status={status} label={t(`window.${status}`)} />
            </div>
            <h1 className="font-serif text-4xl leading-tight md:text-5xl">
              {wine.producer}
              {wine.name && <em className="block text-primary">{wine.name}</em>}
            </h1>
            <p className="mt-1 font-serif text-2xl text-muted">{wine.vintage ?? t("wines.nonVintage")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/wines/${wine.id}/edit`} className={buttonClass("secondary")}>
                <Pencil className="size-4" aria-hidden /> {t("common.edit")}
              </Link>
              <DeleteWineButton wineId={wine.id} />
            </div>
          </div>

          <Card>
            <SectionTitle>{t("wines.sectionWindow")}</SectionTitle>
            <WindowTimeline wine={wine} unknownLabel={t("window.unknown")} />
          </Card>

          <Card>
            <SectionTitle>{t("wines.details")}</SectionTitle>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {details
                .filter(([, value]) => value != null && value !== "")
                .map(([label, value]) => (
                  <div key={label} className="border-b border-dashed border-border pb-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
                    <dd className="mt-0.5">{value}</dd>
                  </div>
                ))}
            </dl>
            {wine.notes && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{wine.notes}</p>}
          </Card>

          <Card>
            <SectionTitle>{t("wines.history")}</SectionTitle>
            {wine.history.length === 0 ? (
              <p className="text-sm text-muted">{t("wines.historyEmpty")}</p>
            ) : (
              <ul className="divide-y divide-dashed divide-border">
                {wine.history.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                    {m.direction === "in" ? (
                      <ArrowDownLeft className="size-4 text-success" aria-hidden />
                    ) : (
                      <ArrowUpRight className="size-4 text-primary" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{t(`reasons.${m.reason}`)}</p>
                      {m.note && <p className="truncate text-muted">{m.note}</p>}
                    </div>
                    <span className="text-muted">{m.date.toLocaleDateString(locale)}</span>
                    <span className="w-10 text-right font-serif text-lg">
                      {m.direction === "in" ? "+" : "−"}
                      {m.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
