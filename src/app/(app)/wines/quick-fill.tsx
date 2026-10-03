"use client";

import { Barcode, Loader2, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Input } from "@/components/ui";
import type { WineColor } from "@/lib/db/schema";
import { WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { useI18n } from "@/i18n/client";

export type CatalogWine = {
  id: number;
  producer: string;
  name: string | null;
  color: WineColor;
  country: string | null;
  region: string | null;
  appellation: string | null;
  grapes: string | null;
  alcohol: number | null;
  pairings: string | null;
};

export type FillData = Partial<{
  producer: string;
  name: string;
  vintage: number;
  color: WineColor;
  country: string;
  region: string;
  appellation: string;
  grapes: string;
  alcohol: number;
  bottleSizeMl: number;
  barcode: string;
  pairings: string;
}>;

type BarcodeResult = {
  barcode: string;
  existingWineId?: string;
  existingWishlistId?: string;
  found: boolean;
  product?: { producer: string | null; name: string | null; vintage: number | null; color: WineColor | null; bottleSizeMl: number | null };
  match?: CatalogWine;
};

export function countryName(code: string | null, locale: string) {
  if (!code) return undefined;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function catalogToFill(w: CatalogWine, locale: string): FillData {
  return {
    producer: w.producer,
    name: w.name ?? undefined,
    color: w.color,
    country: countryName(w.country, locale),
    region: w.region ?? undefined,
    appellation: w.appellation ?? undefined,
    grapes: w.grapes ?? undefined,
    alcohol: w.alcohol ?? undefined,
    pairings: w.pairings ?? undefined,
  };
}

/** Decodes a barcode from a photo: native BarcodeDetector when available, else zxing. */
async function decodeBarcode(file: File): Promise<string | null> {
  if ("BarcodeDetector" in window) {
    try {
      // @ts-expect-error BarcodeDetector is not in TS's DOM lib yet.
      const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      const codes = await detector.detect(await createImageBitmap(file));
      if (codes[0]?.rawValue) return codes[0].rawValue;
    } catch {
      // fall through to zxing
    }
  }
  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const url = URL.createObjectURL(file);
  try {
    return (await new BrowserMultiFormatReader().decodeFromImageUrl(url)).getText();
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function QuickFill({ catalogSize, barcodeEnabled, onFill }: { catalogSize: number; barcodeEnabled: boolean; onFill: (d: FillData, source: string) => void }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CatalogWine[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string; href?: string } | null>(null);
  const [manualCode, setManualCode] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalog/wines?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          setResults(await res.json());
          setOpen(true);
        }
      } catch {
        /* aborted */
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const shown = q.trim().length >= 2 ? results : null;

  function pick(w: CatalogWine) {
    onFill(catalogToFill(w, locale), [w.producer, w.name].filter(Boolean).join(" "));
    setMessage({ kind: "success", text: t("quickFill.filled", { source: [w.producer, w.name].filter(Boolean).join(" ") }) });
    setOpen(false);
    setQ("");
  }

  async function lookup(code: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/barcode/${code}`);
      if (!res.ok) throw new Error();
      const r = (await res.json()) as BarcodeResult;
      if (r.existingWineId) {
        setMessage({ kind: "success", text: t("quickFill.alreadyOwned"), href: `/wines/${r.existingWineId}` });
        return;
      }
      if (r.existingWishlistId) {
        setMessage({ kind: "success", text: t("quickFill.alreadyWished"), href: "/wishlist" });
        return;
      }
      const data: FillData = { barcode: r.barcode, ...(r.match ? catalogToFill(r.match, locale) : {}) };
      if (r.product) {
        const p = r.product;
        if (p.producer) data.producer = p.producer;
        if (p.name && !r.match) data.name = p.name;
        if (p.vintage) data.vintage = p.vintage;
        if (p.color) data.color = p.color;
        if (p.bottleSizeMl) data.bottleSizeMl = p.bottleSizeMl;
      }
      onFill(data, "Open Food Facts");
      setMessage(
        r.found
          ? { kind: "success", text: t("quickFill.filled", { source: [r.product?.producer, r.product?.name].filter(Boolean).join(" ") || r.barcode }) }
          : { kind: "error", text: t("quickFill.notFound") },
      );
    } catch {
      setMessage({ kind: "error", text: t("common.unexpectedError") });
    } finally {
      setBusy(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    const code = await decodeBarcode(file);
    if (!code) {
      setBusy(false);
      setMessage({ kind: "error", text: t("quickFill.barcodeNotRead") });
      return;
    }
    setManualCode(code);
    await lookup(code);
  }

  return (
    <Card className="border-accent/50 bg-accent-soft/40">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-5 text-accent" aria-hidden />
        <h2 className="font-serif text-2xl">{t("quickFill.title")}</h2>
      </div>
      <p className="mb-3 text-sm text-muted">{t("quickFill.hint", { count: catalogSize.toLocaleString(locale) })}</p>

      <div ref={boxRef} className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => shown && setOpen(true)}
          placeholder={t("quickFill.searchPlaceholder")}
          aria-label={t("quickFill.title")}
          className="pl-9"
          autoComplete="off"
        />
        {open && shown && (
          <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded border border-border bg-surface shadow-xl">
            {shown.length === 0 && <li className="px-3 py-3 text-sm text-muted">{t("quickFill.noResults")}</li>}
            {shown.map((w) => (
              <li key={w.id}>
                <button type="button" onClick={() => pick(w)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2">
                  <span className="size-3 shrink-0 rounded-full border border-black/10" style={{ background: WINE_COLOR_STYLES[w.color].fill }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {w.producer} {w.name && <span className="font-normal">· {w.name}</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {[w.appellation, w.region, countryName(w.country, locale)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {barcodeEnabled && (
        <div className="mt-3 grid gap-2 sm:flex sm:items-center">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-2">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Barcode className="size-4" aria-hidden />}
            {busy ? t("quickFill.scanning") : t("quickFill.scan")}
            <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          <div className="flex min-w-0 flex-1 gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder={t("quickFill.barcodeManual")}
              aria-label={t("quickFill.barcodeManual")}
              className="min-w-0"
            />
            <Button type="button" variant="secondary" disabled={busy || !/^\d{8,14}$/.test(manualCode)} onClick={() => lookup(manualCode)}>
              {t("quickFill.lookup")}
            </Button>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-3">
          <Alert kind={message.kind}>
            {message.text}{" "}
            {message.href && (
              <Link href={message.href} className="font-semibold underline">
                {t("quickFill.openIt")}
              </Link>
            )}
          </Alert>
        </div>
      )}
    </Card>
  );
}
