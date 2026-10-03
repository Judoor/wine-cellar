"use client";

import { Heart, Pencil, Plus, ShoppingBag, Trash } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { Alert, Button, buttonClass, Card, Field, Input, Select, Textarea } from "@/components/ui";
import type { WineColor } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { WINE_COLOR_ORDER, WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { useI18n } from "@/i18n/client";
import { QuickFill, type FillData } from "../wines/quick-fill";
import { removeWishlistItem, saveWishlistItem } from "./actions";

type Item = {
  id: string;
  producer: string;
  name: string | null;
  vintage: number | null;
  color: WineColor | null;
  appellation: string | null;
  targetPrice: number | null;
  notes: string | null;
};

export function WishlistBoard({ items, currency, catalogSize }: { items: Item[]; currency: string; catalogSize: number }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <WishlistForm catalogSize={catalogSize} onDone={() => setEditing(null)} />
      ) : (
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> {t("wishlist.add")}
        </Button>
      )}

      {items.length === 0 && editing !== "new" && (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <Heart className="size-10 text-muted" aria-hidden />
          <h2 className="font-serif text-2xl">{t("wishlist.empty")}</h2>
          <p className="max-w-sm text-sm text-muted">{t("wishlist.emptyText")}</p>
        </Card>
      )}

      <ul className="grid gap-3 lg:grid-cols-2">
        {items.map((item) =>
          editing === item.id ? (
            <li key={item.id} className="lg:col-span-2">
              <WishlistForm item={item} catalogSize={0} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={item.id}>
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 size-3.5 shrink-0 rounded-full border border-black/10"
                    style={{ background: item.color ? WINE_COLOR_STYLES[item.color].fill : "transparent" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {item.producer} {item.vintage && <span className="font-normal text-muted">{item.vintage}</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{[item.name, item.appellation].filter(Boolean).join(" · ")}</p>
                    {item.notes && <p className="mt-1.5 text-sm whitespace-pre-line">{item.notes}</p>}
                  </div>
                  {item.targetPrice != null && <span className="font-serif text-lg">{formatMoney(item.targetPrice, currency, locale)}</span>}
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <Link href={`/wines/new?wishlist=${item.id}`} className={buttonClass("primary", "flex-1 sm:flex-none")} title={t("wishlist.boughtHint")}>
                    <ShoppingBag className="size-4" aria-hidden /> {t("wishlist.bought")}
                  </Link>
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

function WishlistForm({ item, catalogSize, onDone }: { item?: Item; catalogSize: number; onDone: () => void }) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveWishlistItem>>, fd: FormData) => {
    const result = await saveWishlistItem(item?.id ?? null, prev, fd);
    if (result?.ok) onDone();
    return result;
  }, undefined);
  const id = item?.id ?? "new";

  function fill(d: FillData) {
    const form = formRef.current;
    if (!form) return;
    for (const k of ["producer", "name", "appellation", "color"] as const) {
      const el = form.elements.namedItem(k) as HTMLInputElement | HTMLSelectElement | null;
      if (el && d[k]) el.value = String(d[k]);
    }
  }

  return (
    <Card>
      {catalogSize > 0 && (
        <div className="mb-4">
          <QuickFill catalogSize={catalogSize} barcodeEnabled={false} onFill={fill} />
        </div>
      )}
      <form ref={formRef} action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label={t("wines.notes")} htmlFor={`w-notes-${id}`}>
          <Textarea id={`w-notes-${id}`} name="notes" rows={3} defaultValue={item?.notes ?? ""} />
        </Field>
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
    </Card>
  );
}
