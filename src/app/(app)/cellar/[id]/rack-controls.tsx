"use client";

import clsx from "clsx";
import { Pencil, Trash } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { Rack } from "@/lib/db/schema";
import { rackCapacity } from "@/lib/slots";
import { useI18n } from "@/i18n/client";
import { removeRack, saveRack } from "../actions";

export function RackHeader({ locationId, rack, filled }: { locationId: string; rack: Rack; filled: number }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const shape = rack.layout === "pyramid" ? t("cellar.pyramidSummary", { base: rack.cols, rows: rack.rows }) : `${rack.rows} × ${rack.cols}`;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-xl">{rack.name}</h2>
          <p className="text-xs text-muted">
            {shape} · {filled}/{rackCapacity(rack)}
          </p>
        </div>
        <button onClick={() => setEditing(!editing)} aria-label={t("cellar.editRack")} className="rounded p-2 text-muted hover:bg-surface-2">
          <Pencil className="size-4" />
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm(t("cellar.deleteRackConfirm"))) startTransition(() => removeRack(locationId, rack.id));
          }}
          aria-label={t("common.delete")}
          className="rounded p-2 text-muted hover:bg-surface-2 hover:text-danger"
        >
          <Trash className="size-4" />
        </button>
      </div>
      {editing && (
        <div className="mt-3 rounded border border-dashed border-border p-3">
          <RackForm locationId={locationId} rack={rack} onDone={() => setEditing(false)} />
        </div>
      )}
    </div>
  );
}

export function RackForm({ locationId, rack, onDone }: { locationId: string; rack?: Rack; onDone?: () => void }) {
  const { t } = useI18n();
  const [formKey, setFormKey] = useState(0);
  const [layout, setLayout] = useState<"grid" | "pyramid">(rack?.layout ?? "grid");
  const [rows, setRows] = useState(rack?.rows ?? (layout === "pyramid" ? 3 : 4));
  const [cols, setCols] = useState(rack?.cols ?? 6);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveRack>>, fd: FormData) => {
    const result = await saveRack(locationId, rack?.id ?? null, prev, fd);
    if (result?.ok) {
      onDone?.();
      if (!rack) setFormKey((k) => k + 1); // reset the creation form
    }
    return result;
  }, undefined);
  const id = rack?.id ?? "new";
  const pyramid = layout === "pyramid";
  const valid = !pyramid || rows <= cols;

  return (
    <form key={formKey} action={action} className="space-y-3">
      <input type="hidden" name="layout" value={layout} />
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("cellar.layout")}</p>
        <div className="inline-flex rounded border border-border bg-surface p-1">
          {(["grid", "pyramid"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={layout === l}
              onClick={() => setLayout(l)}
              className={clsx("flex items-center gap-2 rounded px-3 py-1.5 text-sm", layout === l ? "bg-oak text-oak-foreground" : "text-muted hover:text-foreground")}
            >
              <LayoutIcon layout={l} />
              {t(l === "grid" ? "cellar.layoutGrid" : "cellar.layoutPyramid")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end">
        <div className="col-span-2 sm:col-span-1">
          <Field label={t("cellar.rackName")} htmlFor={`rack-name-${id}`}>
            <Input id={`rack-name-${id}`} name="name" defaultValue={rack?.name} placeholder={t("cellar.rackNamePlaceholder")} required />
          </Field>
        </div>
        <Field label={pyramid ? t("cellar.pyramidBase") : t("cellar.cols")} htmlFor={`rack-cols-${id}`}>
          <Input
            id={`rack-cols-${id}`}
            name="cols"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
            required
          />
        </Field>
        <Field label={pyramid ? t("cellar.pyramidHeight") : t("cellar.rows")} htmlFor={`rack-rows-${id}`}>
          <Input
            id={`rack-rows-${id}`}
            name="rows"
            type="number"
            inputMode="numeric"
            min={1}
            max={pyramid ? cols : 50}
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            aria-invalid={!valid}
            required
          />
        </Field>
        <Button type="submit" disabled={pending || !valid} className="col-span-2 sm:col-span-1">
          {rack ? t("common.save") : t("common.add")}
        </Button>
      </div>

      <p className={clsx("text-sm", valid ? "text-muted" : "text-danger")}>
        {!valid
          ? t("cellar.pyramidTooTall")
          : [pyramid && t("cellar.pyramidHint"), rows > 0 && cols > 0 && t("cellar.capacityPreview", { count: rackCapacity({ rows, cols, layout }) })]
              .filter(Boolean)
              .join(" ")}
      </p>
      {state?.error && <Alert>{t(state.error)}</Alert>}
    </form>
  );
}

/** Tiny pictogram of each layout. */
function LayoutIcon({ layout }: { layout: "grid" | "pyramid" }) {
  const dots =
    layout === "grid"
      ? [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => [3 + c * 5, 3 + r * 5]))
      : [
          [3, 13], [8, 13], [13, 13],
          [5.5, 8.5], [10.5, 8.5],
          [8, 4],
        ];
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.1" fill="currentColor" />
      ))}
    </svg>
  );
}
