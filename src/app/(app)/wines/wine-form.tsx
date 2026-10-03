"use client";

import clsx from "clsx";
import { Minus, Plus, Wand2 } from "lucide-react";
import { PhotoPicker } from "@/components/photo-picker";
import { useActionState, useRef, useState } from "react";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { estimateWindow } from "@/lib/aging";
import { formatBottleSize } from "@/lib/format";
import type { Wine, WineColor } from "@/lib/db/schema";
import { PAIRING_KEYS } from "@/lib/pairings";
import { WINE_COLOR_ORDER, WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/config";
import { saveWine } from "./actions";
import { AutocompleteInput } from "./autocomplete-input";
import { countryName, QuickFill, type FillData } from "./quick-fill";



const WINDOW_FIELDS = ["drinkFrom", "peakFrom", "peakUntil", "drinkUntil"] as const;

const BOTTLE_SIZES = [375, 500, 750, 1500, 3000, 6000];

export function WineForm({
  wine,
  initial,
  wishlistId,
  catalogSize = 0,
  barcodeEnabled = false,
}: {
  wine?: Wine;
  /** Prefilled values for a new wine (e.g. from a wishlist entry). */
  initial?: Partial<Wine>;
  wishlistId?: string;
  catalogSize?: number;
  barcodeEnabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const [state, formAction, pending] = useActionState(saveWine.bind(null, wine?.id ?? null), undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [pairings, setPairings] = useState<string[]>((wine ?? initial)?.pairings?.split(",").filter(Boolean) ?? []);
  const [barcode, setBarcode] = useState((wine ?? initial)?.barcode ?? "");
  const [windowNote, setWindowNote] = useState<MessageKey | null>(null);

  const field = (name: string) => formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
  const read = (name: string) => field(name)?.value.trim() ?? "";
  const write = (name: string, value: string | number | undefined, onlyIfEmpty = false) => {
    const el = field(name);
    if (!el || value == null || value === "" || (onlyIfEmpty && el.value)) return;
    el.value = String(value);
  };
  const currentColor = () => (formRef.current?.querySelector<HTMLInputElement>('input[name="color"]:checked')?.value ?? "red") as WineColor;

  function estimate(silent = false) {
    const vintage = Number(read("vintage")) || null;
    const result = estimateWindow({ color: currentColor(), vintage, appellation: read("appellation"), region: read("region"), name: read("name") });
    if (!result) return !silent && setWindowNote("quickFill.estimateNeedsVintage");
    for (const k of WINDOW_FIELDS) write(k, result[k]);
    setWindowNote("quickFill.estimateHint");
  }

  function fill(d: FillData) {
    for (const k of ["producer", "name", "appellation", "region", "country", "grapes", "alcohol"] as const) write(k, d[k]);
    write("vintage", d.vintage, true);
    write("bottleSizeMl", d.bottleSizeMl);
    if (d.color) {
      const radio = formRef.current?.querySelector<HTMLInputElement>(`input[name="color"][value="${d.color}"]`);
      if (radio) radio.checked = true;
    }
    if (d.pairings) setPairings(d.pairings.split(","));
    if (d.barcode) setBarcode(d.barcode);
    if (WINDOW_FIELDS.every((k) => !read(k)) && read("vintage")) estimate(true);
  }
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const err = (name: string) => state?.fieldErrors?.[name];
  const initialImage = (wine ?? initial)?.imageFile;

  function submit(formData: FormData) {
    if (photo) formData.set("photo", photo, "label.jpg");
    if (removePhoto) formData.set("removePhoto", "1");
    return formAction(formData);
  }
  const v = (k: keyof Wine) => ((wine ?? initial)?.[k] ?? "") as string | number;

  return (
    <form ref={formRef} action={submit} className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <input type="hidden" name="barcode" value={barcode} />
      <input type="hidden" name="pairings" value={pairings.join(",")} />
      {wishlistId && <input type="hidden" name="wishlistId" value={wishlistId} />}
      {!wine && catalogSize > 0 && (
        <div className="lg:col-span-2">
          <QuickFill catalogSize={catalogSize} barcodeEnabled={barcodeEnabled} onFill={fill} />
        </div>
      )}
      {/* Photo */}
      <Card className="h-fit">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{t("wines.photo")}</p>
        <PhotoPicker
          initialSrc={initialImage ? `/api/uploads/${initialImage}` : null}
          className="[&>div:first-child]:aspect-[4/3] lg:[&>div:first-child]:aspect-[3/4]"
          onChange={({ blob, removed }) => {
            setPhoto(blob);
            setRemovePhoto(removed);
          }}
        />
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
              <Input
                id="vintage"
                name="vintage"
                type="number"
                inputMode="numeric"
                min={1800}
                max={2200}
                placeholder={t("wines.nonVintage")}
                defaultValue={v("vintage")}
                onBlur={() => WINDOW_FIELDS.every((k) => !read(k)) && read("appellation") && estimate(true)}
              />
            </Field>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("wines.color")} *</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {WINE_COLOR_ORDER.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input type="radio" name="color" value={color} defaultChecked={(wine?.color ?? initial?.color ?? "red") === color} className="peer sr-only" />
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
              <AutocompleteInput<{ name: string; region: string | null; country: string | null; sign: string | null }>
                id="appellation"
                name="appellation"
                defaultValue={v("appellation")}
                url="/api/catalog/appellations?q="
                getLabel={(a) => a.name}
                renderItem={(a) => (
                  <>
                    <span className="block truncate text-sm font-semibold">{a.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {[a.sign, a.region, countryName(a.country, locale)].filter(Boolean).join(" · ")}
                    </span>
                  </>
                )}
                onPick={(a) => {
                  write("region", a.region ?? undefined, true);
                  write("country", countryName(a.country, locale), true);
                }}
              />
            </Field>
            <Field label={t("wines.grapes")} htmlFor="grapes">
              <AutocompleteInput<string>
                id="grapes"
                name="grapes"
                defaultValue={v("grapes")}
                url="/api/catalog/appellations?kind=grapes&q="
                multiple
                getLabel={(g) => g}
                renderItem={(g) => <span className="text-sm">{g}</span>}
              />
            </Field>
            <Field label={t("wines.alcohol")} htmlFor="alcohol">
              <Input id="alcohol" name="alcohol" inputMode="decimal" defaultValue={v("alcohol")} />
            </Field>
            <Field label={t("wines.bottleSize")} htmlFor="bottleSizeMl">
              <Select id="bottleSizeMl" name="bottleSizeMl" defaultValue={wine?.bottleSizeMl ?? 750}>
                {BOTTLE_SIZES.map((ml) => (
                  <option key={ml} value={ml}>
                    {formatBottleSize(ml, locale)}
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
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">{t("wines.sectionWindow")}</h2>
            <Button type="button" variant="secondary" onClick={() => estimate()} className="shrink-0">
              <Wand2 className="size-4" aria-hidden /> {t("quickFill.estimate")}
            </Button>
          </div>
          <p className="mb-4 text-sm text-muted">{windowNote ? t(windowNote) : t("wines.windowHint")}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {WINDOW_FIELDS.map((k) => (
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
          <fieldset className="mt-4">
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("quickFill.pairings")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {PAIRING_KEYS.map((k) => {
                const on = pairings.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPairings(on ? pairings.filter((p) => p !== k) : [...pairings, k])}
                    className={clsx(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      on ? "border-accent bg-accent-soft font-semibold text-[#8a5a1c]" : "border-border bg-surface text-muted hover:border-accent",
                    )}
                  >
                    {t(`pairings.${k}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {barcode && (
            <p className="mt-4 text-xs text-muted">
              {t("quickFill.barcode")} : <span className="font-mono">{barcode}</span>
            </p>
          )}
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
