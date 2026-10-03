"use client";

import { Camera, Crop, Image as ImageIcon, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/client";
import { PhotoEditor } from "./photo-editor";

export type PhotoChange = { blob: Blob | null; removed: boolean };

/**
 * Label photo: camera or gallery, then rotate/crop in the editor before it is kept.
 * The parent receives the edited JPEG (or `removed: true`).
 */
export function PhotoPicker({ initialSrc, onChange, className }: { initialSrc?: string | null; onChange: (c: PhotoChange) => void; className?: string }) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<string | null>(initialSrc ?? null);
  const [editing, setEditing] = useState<string | null>(null);

  function open(file: File | undefined) {
    if (file) setEditing(URL.createObjectURL(file));
  }

  const btn = "flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-surface px-2 py-2 text-xs font-semibold hover:bg-surface-2";

  return (
    <div className={className}>
      <div className={cn("relative flex items-center justify-center overflow-hidden rounded border-2 border-dashed border-border bg-surface-2", preview && "border-solid")}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted">
            <Camera className="size-8" aria-hidden />
            {t("wines.photo")}
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <label className={cn(btn, "cursor-pointer")}>
          <Camera className="size-4" aria-hidden /> {t("wines.photoCamera")}
          {/* capture → opens the camera directly on phones */}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => (open(e.target.files?.[0]), (e.target.value = ""))} />
        </label>
        <label className={cn(btn, "cursor-pointer")}>
          <ImageIcon className="size-4" aria-hidden /> {t("wines.photoGallery")}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => (open(e.target.files?.[0]), (e.target.value = ""))} />
        </label>
      </div>

      {preview && (
        <div className="mt-2 flex gap-3 text-xs">
          <button type="button" onClick={() => setEditing(preview)} className="flex items-center gap-1 text-muted hover:text-foreground">
            <Crop className="size-3.5" aria-hidden /> {t("wines.photoEdit")}
          </button>
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              onChange({ blob: null, removed: true });
            }}
            className="flex items-center gap-1 text-muted hover:text-danger"
          >
            <X className="size-3.5" aria-hidden /> {t("wines.photoRemove")}
          </button>
        </div>
      )}

      {editing && (
        <PhotoEditor
          src={editing}
          onCancel={() => setEditing(null)}
          onDone={(blob) => {
            setPreview(URL.createObjectURL(blob));
            setEditing(null);
            onChange({ blob, removed: false });
          }}
        />
      )}
    </div>
  );
}
