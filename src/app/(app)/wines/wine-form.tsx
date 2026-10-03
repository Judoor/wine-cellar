"use client";

import clsx from "clsx";
import { Camera, Minus, Plus, X } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import type { Wine } from "@/lib/db/schema";
import { WINE_COLOR_ORDER, WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { useI18n } from "@/i18n/client";
import { saveWine } from "./actions";

const BOTTLE_SIZES = [375, 500, 750, 1500, 3000, 6000];

/** Downscales phone photos (often 5-10 MB) before upload. */
async function resizeImage(file: File, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.85),
  );
}

export function WineForm({ wine }: { wine?: Wine }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(saveWine.bind(null, wine?.id ?? null), undefined);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(wine?.imageFile ? `/api/uploads/${wine.imageFile}` : null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const err = (name: string) => state?.fieldErrors?.[name];

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    const blob = await resizeImage(file).catch(() => file);
    setPhoto(blob);
    setRemovePhoto(false);
    setPreview(URL.createObjectURL(blob));
  }

  function submit(formData: FormData) {
    formData.delete("photoInput");
    if (photo) formData.set("photo", photo, "label.jpg");
    if (removePhoto) formData.set("removePhoto", "1");
    return formAction(formData);
  }

  const v = (k: keyof Wine) => (wine?.[k] ?? "") as string | number;

  return (
    <form action={submit} className="grid gap-5 lg:grid-cols-[280px_1fr]">
      {/* Photo */}
      <Card className="h-fit">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{t("wines.photo")}</p>
        <label className="group relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded border-2 border-dashed border-border bg-surface-2 hover:border-accent">
          {preview && !removePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-muted">
              <Camera className="size-8" aria-hidden />
              {t("wines.photo")}
            </span>
          )}
          <input
            type="file"
            name="photoInput"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
        </label>
        {preview && !removePhoto && (
          <button
            type="button"
            onClick={() => {
              setRemovePhoto(true);
              setPhoto(null);
            }}
            className="mt-2 flex items-center gap-1 text-sm text-muted hover:text-danger"
          >
            <X className="size-4" aria-hidden /> {t("wines.photoRemove")}
          </button>
        )}
      </Card>

      <div className="space-y-5">
        <Card>
          <h2 className="mb-4 font-serif text-2xl">{t("wines.sectionIdentity")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={`${t("wines.producer")} *`} htmlFor="producer">
                <Input id="producer" name="producer" defaultValue={v("producer")} required aria-invalid={!!err("producer")} />
              </Field>
              {err("producer") && <p className="mt-1 text-sm text-danger">{t(err("producer")!)}</p>}
            </div>
            <Field label={t("wines.name")} htmlFor="name">
              <Input id="name" name="name" defaultValue={v("name")} />
            </Field>
            <Field label={t("wines.vintage")} htmlFor="vintage">
              <Input id="vintage" name="vintage" type="number" inputMode="numeric" min={1800} max={2200} placeholder={t("wines.nonVintage")} defaultValue={v("vintage")} />
            </Field>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("wines.color")} *</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {WINE_COLOR_ORDER.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input type="radio" name="color" value={color} defaultChecked={(wine?.color ?? "red") === color} className="peer sr-only" />
                  <span className="flex min-h-11 items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
                    <span className="size-4 shrink-0 rounded-full border border-black/10" style={{ background: WINE_COLOR_STYLES[color].fill }} />
                    {t(`colors.${color}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card>
          <h2 className="mb-4 font-serif text-2xl">{t("wines.sectionOrigin")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("wines.country")} htmlFor="country">
              <Input id="country" name="country" defaultValue={v("country")} />
            </Field>
            <Field label={t("wines.region")} htmlFor="region">
              <Input id="region" name="region" defaultValue={v("region")} />
            </Field>
            <Field label={t("wines.appellation")} htmlFor="appellation">
              <Input id="appellation" name="appellation" defaultValue={v("appellation")} />
            </Field>
            <Field label={t("wines.grapes")} htmlFor="grapes">
              <Input id="grapes" name="grapes" defaultValue={v("grapes")} />
            </Field>
            <Field label={t("wines.alcohol")} htmlFor="alcohol">
              <Input id="alcohol" name="alcohol" inputMode="decimal" defaultValue={v("alcohol")} />
            </Field>
            <Field label={t("wines.bottleSize")} htmlFor="bottleSizeMl">
              <Select id="bottleSizeMl" name="bottleSizeMl" defaultValue={wine?.bottleSizeMl ?? 750}>
                {BOTTLE_SIZES.map((ml) => (
                  <option key={ml} value={ml}>
                    {ml >= 1000 ? `${ml / 1000} L` : `${ml / 10} cl`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-serif text-2xl">{t("wines.sectionCellar")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("wines.purchasePrice")} htmlFor="purchasePrice">
              <Input id="purchasePrice" name="purchasePrice" inputMode="decimal" defaultValue={v("purchasePrice")} />
            </Field>
            <Field label={t("wines.estimatedValue")} htmlFor="estimatedValue">
              <Input id="estimatedValue" name="estimatedValue" inputMode="decimal" defaultValue={v("estimatedValue")} />
            </Field>
            {!wine && (
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("wines.initialQuantity")}</p>
                <Stepper value={quantity} onChange={setQuantity} name="quantity" />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 font-serif text-2xl">{t("wines.sectionWindow")}</h2>
          <p className="mb-4 text-sm text-muted">{t("wines.windowHint")}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(["drinkFrom", "peakFrom", "peakUntil", "drinkUntil"] as const).map((k) => (
              <Field key={k} label={t(`wines.${k}`)} htmlFor={k}>
                <Input id={k} name={k} type="number" inputMode="numeric" min={1800} max={2200} defaultValue={v(k)} aria-invalid={!!err(k)} />
              </Field>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-serif text-2xl">{t("wines.sectionNotes")}</h2>
          <Field label={t("wines.notes")} htmlFor="notes">
            <Textarea id="notes" name="notes" rows={4} defaultValue={v("notes")} />
          </Field>
        </Card>

        {state?.error && <Alert>{t(state.error)}</Alert>}

        <div className="sticky bottom-24 z-10 flex gap-3 md:static">
          <Button type="submit" disabled={pending} className="flex-1 shadow-lg md:flex-none md:shadow-sm">
            {t("common.save")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.history.back()}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function Stepper({
  value,
  onChange,
  name,
  min = 0,
  max = 500,
}: {
  value: number;
  onChange: (n: number) => void;
  name: string;
  min?: number;
  max?: number;
}) {
  const btn = "flex size-11 items-center justify-center rounded border border-border bg-surface hover:bg-surface-2 disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="-1">
        <Minus className="size-4" />
      </button>
      <input
        name={name}
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className={clsx("h-11 w-20 rounded border border-border bg-surface text-center font-serif text-xl")}
      />
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="+1">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
