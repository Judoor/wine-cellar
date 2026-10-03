"use client";

import { Loader2, RotateCcw, RotateCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { cropImage } from "@/lib/crop-image";
import { useI18n } from "@/i18n/client";

const FORMATS = [
  { label: "3:4", value: 3 / 4 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
];

/** Full-screen photo editor: drag to frame, pinch/slider to zoom, 90° turns + fine straightening. */
export function PhotoEditor({ src, onCancel, onDone }: { src: string; onCancel: () => void; onDone: (blob: Blob) => void }) {
  const { t } = useI18n();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [quarter, setQuarter] = useState(0);
  const [fine, setFine] = useState(0);
  const [aspect, setAspect] = useState(FORMATS[0].value);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const rotation = quarter * 90 + fine;

  // Lock page scroll while the editor is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function validate() {
    if (!area) return;
    setBusy(true);
    try {
      onDone(await cropImage(src, area, rotation));
    } finally {
      setBusy(false);
    }
  }

  // Portal to <body>: escapes the page's stacking context so it covers the app header and tab bar.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("wines.editorTitle")} className="fixed inset-0 z-50 flex flex-col bg-[#120c08] text-[#f6e9d3]">
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button type="button" onClick={onCancel} aria-label={t("common.cancel")} className="rounded-full p-2 hover:bg-white/10">
          <X className="size-5" />
        </button>
        <p className="font-serif text-lg">{t("wines.editorTitle")}</p>
        <span className="w-9" />
      </div>

      <div className="relative min-h-0 flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          minZoom={1}
          maxZoom={4}
          showGrid
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setArea(pixels)}
        />
      </div>

      <div className="space-y-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setQuarter((q) => q - 1)} aria-label={t("wines.rotateLeft")} className="rounded-full bg-white/10 p-2.5 hover:bg-white/20">
            <RotateCcw className="size-5" />
          </button>
          <label className="flex flex-1 items-center gap-2 text-xs">
            <span className="w-16 shrink-0 opacity-70">{t("wines.straighten")}</span>
            <input type="range" min={-45} max={45} step={0.5} value={fine} onChange={(e) => setFine(Number(e.target.value))} className="flex-1 accent-[#e3b36a]" />
          </label>
          <button type="button" onClick={() => setQuarter((q) => q + 1)} aria-label={t("wines.rotateRight")} className="rounded-full bg-white/10 p-2.5 hover:bg-white/20">
            <RotateCw className="size-5" />
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 opacity-70">{t("wines.zoom")}</span>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[#e3b36a]" />
        </label>
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs opacity-70">{t("wines.format")}</span>
          {FORMATS.map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={aspect === f.value}
              onClick={() => setAspect(f.value)}
              className={cn("rounded-full border px-3 py-1 text-sm", aspect === f.value ? "border-[#e3b36a] bg-[#e3b36a] text-[#2a1c13]" : "border-white/25")}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 text-[#f6e9d3] hover:bg-white/10">
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={validate} disabled={busy || !area} className="flex-1">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t("wines.validate")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
