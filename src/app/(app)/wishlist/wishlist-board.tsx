"use client";

import { Camera, Heart, MapPin, Pencil, Plus, ShoppingBag, Trash, X } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import { Stars, StarInput } from "@/components/stars";
import { Alert, Button, buttonClass, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { WineColor } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { resizeImage } from "@/lib/resize-image";
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

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <WishlistForm catalogSize={catalogSize} barcodeEnabled={barcodeEnabled} onDone={() => setEditing(null)} />
      ) : (
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> {t("wishlist.add")}
        </Button>
      )}

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

      {items.length === 0 && editing !== "new" && (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <Heart className="size-10 text-muted" aria-hidden />
          <h2 className="font-serif text-2xl">{t("wishlist.empty")}</h2>
          <p className="max-w-sm text-sm text-muted">{t("wishlist.emptyText")}</p>
        </Card>
      )}

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
        {shown.map((item) =>
          editing === item.id ? (
            <li key={item.id} className="lg:col-span-2">
              <WishlistForm item={item} catalogSize={0} barcodeEnabled={false} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={item.id}>
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
                  <button onClick={() => setEditing(item.id)} aria-label={t("common.edit")} className="ml-auto rounded p-2 text-muted hover:bg-surface-2">
                    <Pencil className="size-4" />
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => confirm(t("wishlist.deleteConfirm")) && startTransition(() => removeWishlistItem(item.id))}
                    aria-label={t("common.delete")}
                    className="rounded p-2 text-muted hover:bg-surface-2 hover:text-danger"
                  >
                    <Trash className="size-4" />
                  </button>
                </div>
              </Card>
            </li>
          ),
        )}
      </ul>
    </div>
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
  const [preview, setPreview] = useState<string | null>(item?.imageFile ? `/api/uploads/${item.imageFile}` : null);
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

  // Pending resize, awaited on submit so a quick "Save" never drops the photo.
  const resizing = useRef<Promise<Blob> | null>(null);
  // Locks "Save" while a photo is being prepared (prevents double submissions).
  const [waitingPhoto, setWaitingPhoto] = useState(false);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    resizing.current = resizeImage(file).catch(() => file);
    const blob = await resizing.current;
    setPhoto(blob);
    setRemovePhoto(false);
    setPreview(URL.createObjectURL(blob));
  }

  function submit(fd: FormData) {
    fd.delete("photoInput");
    const pendingPhoto = resizing.current;
    if (removePhoto) fd.set("removePhoto", "1");
    if (!pendingPhoto) return action(fd);
    if (waitingPhoto) return;
    setWaitingPhoto(true);
    return pendingPhoto.then((blob) => {
      fd.set("photo", photo ?? blob, "label.jpg");
      startTransition(() => action(fd));
      setWaitingPhoto(false);
    });
  }

  return (
    <Card>
      {catalogSize > 0 && (
        <div className="mb-4">
          <QuickFill catalogSize={catalogSize} barcodeEnabled={barcodeEnabled} onFill={fill} />
        </div>
      )}
      <form ref={formRef} action={submit} className="space-y-4">
        <input type="hidden" name="barcode" value={barcode} />
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <div>
            <label className="relative flex aspect-[3/4] w-28 cursor-pointer items-center justify-center overflow-hidden rounded border-2 border-dashed border-border bg-surface-2 hover:border-accent sm:w-full">
              {preview && !removePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-center text-xs text-muted">
                  <Camera className="size-6" aria-hidden />
                  {t("wines.photo")}
                </span>
              )}
              <input type="file" name="photoInput" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
            {preview && !removePhoto && (
              <button
                type="button"
                onClick={() => {
                  setRemovePhoto(true);
                  setPhoto(null);
                  resizing.current = null;
                }}
                className="mt-1 flex items-center gap-1 text-xs text-muted hover:text-danger"
              >
                <X className="size-3" aria-hidden /> {t("wines.photoRemove")}
              </button>
            )}
          </div>
          <div className="grid content-start gap-4 sm:grid-cols-2">
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
          <Button type="submit" disabled={pending || waitingPhoto}>
            {t("common.save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
