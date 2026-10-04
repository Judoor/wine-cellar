"use client";

import { Heart, MapPin, Pencil, ShoppingBag, Trash } from "lucide-react";
import { ActionMenu, AddButton, Modal } from "@/components/menu";
import { PhotoPicker } from "@/components/photo-picker";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { Stars, StarInput } from "@/components/stars";
import { Alert, Button, buttonClass, Card, Field, Input, PageTitle, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { WineColor } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { WINE_COLOR_ORDER, WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { useI18n } from "@/i18n/client";
import { QuickFill, type FillData } from "../wines/quick-fill";
import { removeWishlistItem, saveWishlistItem } from "./actions";

export type WishlistItem = {
  id: string;
  producer: string;
  name: string | null;
  vintage: number | null;
  color: WineColor | null;
  appellation: string | null;
  targetPrice: number | null;
  notes: string | null;
  barcode: string | null;
  imageFile: string | null;
  rating: number | null;
  tastedOn: string | null; // ISO
  tastedWhere: string | null;
};

type Filter = "all" | "tasted" | "toBuy";
const isTasted = (i: WishlistItem) => i.rating != null || !!i.tastedOn || !!i.tastedWhere;

export function WishlistBoard({
  items,
  currency,
  catalogSize,
  barcodeEnabled,
}: {
  items: WishlistItem[];
  currency: string;
  catalogSize: number;
  barcodeEnabled: boolean;
}) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, startTransition] = useTransition();
  const shown = items.filter((i) => filter === "all" || (filter === "tasted") === isTasted(i));
  const editedItem = items.find((i) => i.id === editing);

  return (
    <>
      <PageTitle subtitle={t("wishlist.subtitle")} menu={<AddButton label={t("wishlist.add")} onClick={() => setEditing("new")} />}>
        {t("wishlist.title")}
      </PageTitle>

      {editing && (editing === "new" || editedItem) && (
        <Modal title={editedItem ? t("wishlist.edit") : t("wishlist.add")} onClose={() => setEditing(null)}>
          <WishlistForm
            item={editedItem}
            catalogSize={editedItem ? 0 : catalogSize}
            barcodeEnabled={editedItem ? false : barcodeEnabled}
            onDone={() => setEditing(null)}
          />
        </Modal>
      )}

      <div className="space-y-4">
        {items.length > 0 && (
          <div className="flex rounded border border-border bg-surface p-1 text-sm sm:w-fit">
            {(["all", "tasted", "toBuy"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn("flex-1 rounded px-3 py-1.5 font-medium", filter === f ? "bg-oak text-oak-foreground" : "text-muted hover:text-foreground")}
              >
                {t(f === "all" ? "wishlist.filterAll" : f === "tasted" ? "wishlist.filterTasted" : "wishlist.filterToBuy")}
              </button>
            ))}
          </div>
        )}
        {items.length === 0 && (
          <Card className="flex flex-col items-center gap-3 py-14 text-center">
            <Heart className="size-10 text-muted" aria-hidden />
            <h2 className="font-serif text-2xl">{t("wishlist.empty")}</h2>
            <p className="max-w-sm text-sm text-muted">{t("wishlist.emptyText")}</p>
          </Card>
        )}
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
          {shown.map((item) => (
            <li key={item.id} id={`wish-${item.id}`} className="scroll-mt-20">
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="relative flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2">
                    {item.imageFile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/uploads/${item.imageFile}`} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <span
                        className="size-5 rounded-full border border-black/10"
                        style={{ background: item.color ? WINE_COLOR_STYLES[item.color].fill : "transparent" }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {item.producer} {item.vintage && <span className="font-normal text-muted">{item.vintage}</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{[item.name, item.appellation].filter(Boolean).join(" · ")}</p>
                    {isTasted(item) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        {item.rating != null && <Stars value={item.rating} />}
                        {item.tastedOn && <span>{t("wishlist.tastedAt", { date: new Date(item.tastedOn).toLocaleDateString(locale) })}</span>}
                        {item.tastedWhere && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden /> {item.tastedWhere}
                          </span>
                        )}
                      </div>
                    )}
                    {item.notes && <p className="mt-1.5 text-sm whitespace-pre-line">{item.notes}</p>}
                  </div>
                  {item.targetPrice != null && <span className="font-serif text-lg">{formatMoney(item.targetPrice, currency, locale)}</span>}
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <Link href={`/wines/new?wishlist=${item.id}`} className={buttonClass("primary", "flex-1 sm:flex-none")} title={t("wishlist.boughtHint")}>
                    <ShoppingBag className="size-4" aria-hidden /> {t("wishlist.bought")}
                  </Link>
                  {item.barcode && <span className="hidden font-mono text-xs text-muted sm:inline">{item.barcode}</span>}
                  <ActionMenu
                    up
                    label={t("wishlist.menu")}
                    className="-mr-2 ml-auto"
                    items={[
                      { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(item.id) },
                      {
                        label: t("common.delete"),
                        icon: Trash,
                        danger: true,
                        disabled: pending,
                        onSelect: () => confirm(t("wishlist.deleteConfirm")) && startTransition(() => removeWishlistItem(item.id)),
                      },
                    ]}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function WishlistForm({
  item,
  catalogSize,
  barcodeEnabled,
  onDone,
}: {
  item?: WishlistItem;
  catalogSize: number;
  barcodeEnabled: boolean;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [barcode, setBarcode] = useState(item?.barcode ?? "");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveWishlistItem>>, fd: FormData) => {
    const result = await saveWishlistItem(item?.id ?? null, prev, fd);
    if (result?.ok) onDone();
    return result;
  }, undefined);
  const id = item?.id ?? "new";
  const today = new Date().toISOString().slice(0, 10);

  function fill(d: FillData) {
    const form = formRef.current;
    if (!form) return;
    for (const k of ["producer", "name", "appellation", "color", "vintage"] as const) {
      const el = form.elements.namedItem(k) as HTMLInputElement | HTMLSelectElement | null;
      if (el && d[k]) el.value = String(d[k]);
    }
    if (d.barcode) setBarcode(d.barcode);
  }

  function submit(fd: FormData) {
    if (photo) fd.set("photo", photo, "label.jpg");
    if (removePhoto) fd.set("removePhoto", "1");
    return action(fd);
  }
  return (
    <>
      {catalogSize > 0 && (
        <div className="mb-4">
          <QuickFill catalogSize={catalogSize} barcodeEnabled={barcodeEnabled} onFill={fill} />
        </div>
      )}
      <form ref={formRef} action={submit} className="space-y-4">
        <input type="hidden" name="barcode" value={barcode} />
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <PhotoPicker
            initialSrc={item?.imageFile ? `/api/uploads/${item.imageFile}` : null}
            className="w-full max-w-52 sm:max-w-none [&>div:first-child]:aspect-[3/4] [&>div:first-child]:max-h-48 sm:[&>div:first-child]:max-h-none"
            onChange={({ blob, removed }) => {
              setPhoto(blob);
              setRemovePhoto(removed);
            }}
          />          <div className="grid content-start gap-4 sm:grid-cols-2">
            <Field label={`${t("wines.producer")} *`} htmlFor={`w-producer-${id}`}>
              <Input id={`w-producer-${id}`} name="producer" defaultValue={item?.producer} required />
            </Field>
            <Field label={t("wines.name")} htmlFor={`w-name-${id}`}>
              <Input id={`w-name-${id}`} name="name" defaultValue={item?.name ?? ""} />
            </Field>
            <Field label={t("wines.appellation")} htmlFor={`w-appellation-${id}`}>
              <Input id={`w-appellation-${id}`} name="appellation" defaultValue={item?.appellation ?? ""} />
            </Field>
            <Field label={t("wines.color")} htmlFor={`w-color-${id}`}>
              <Select id={`w-color-${id}`} name="color" defaultValue={item?.color ?? ""}>
                <option value="">—</option>
                {WINE_COLOR_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {t(`colors.${c}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("wines.vintage")} htmlFor={`w-vintage-${id}`}>
              <Input id={`w-vintage-${id}`} name="vintage" type="number" inputMode="numeric" min={1800} max={2200} defaultValue={item?.vintage ?? ""} />
            </Field>
            <Field label={t("wishlist.targetPrice")} htmlFor={`w-price-${id}`}>
              <Input id={`w-price-${id}`} name="targetPrice" inputMode="decimal" defaultValue={item?.targetPrice ?? ""} />
            </Field>
          </div>
        </div>

        <fieldset className="rounded border border-dashed border-border p-4">
          <legend className="px-1 font-serif text-xl">{t("wishlist.tastedSection")}</legend>
          <p className="mb-3 text-sm text-muted">{t("wishlist.tastedHint")}</p>
          <div className="space-y-4">
            <StarInput name="rating" defaultValue={item?.rating} label={t("tasting.rating")} clearLabel={t("tasting.noRating")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("wishlist.tastedOn")} htmlFor={`w-tasted-on-${id}`}>
                <Input id={`w-tasted-on-${id}`} name="tastedOn" type="date" max={today} defaultValue={item?.tastedOn?.slice(0, 10) ?? ""} />
              </Field>
              <Field label={t("wishlist.tastedWhere")} htmlFor={`w-tasted-where-${id}`}>
                <Input id={`w-tasted-where-${id}`} name="tastedWhere" defaultValue={item?.tastedWhere ?? ""} placeholder={t("wishlist.tastedWherePlaceholder")} />
              </Field>
            </div>
          </div>
        </fieldset>

        <Field label={t("wines.notes")} htmlFor={`w-notes-${id}`}>
          <Textarea id={`w-notes-${id}`} name="notes" rows={3} defaultValue={item?.notes ?? ""} />
        </Field>
        {barcode && (
          <p className="text-xs text-muted">
            {t("quickFill.barcode")} : <span className="font-mono">{barcode}</span>
          </p>
        )}
        {state?.error && <Alert>{t(state.error)}</Alert>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {t("common.save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </>
  );
}
