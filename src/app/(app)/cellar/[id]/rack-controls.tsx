"use client";

import { Pencil, Trash } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { Rack } from "@/lib/db/schema";
import { useI18n } from "@/i18n/client";
import { removeRack, saveRack } from "../actions";

export function RackHeader({ locationId, rack, filled }: { locationId: string; rack: Rack; filled: number }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-serif text-xl">{rack.name}</h2>
          <p className="text-xs text-muted">
            {rack.rows} × {rack.cols} · {filled}/{rack.rows * rack.cols}
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
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveRack>>, fd: FormData) => {
    const result = await saveRack(locationId, rack?.id ?? null, prev, fd);
    if (result?.ok) {
      onDone?.();
      if (!rack) setFormKey((k) => k + 1); // reset the creation form
    }
    return result;
  }, undefined);
  const id = rack?.id ?? "new";

  return (
    <form key={formKey} action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_6rem_6rem_auto] sm:items-end">
      <div className="col-span-2 sm:col-span-1">
        <Field label={t("cellar.rackName")} htmlFor={`rack-name-${id}`}>
          <Input id={`rack-name-${id}`} name="name" defaultValue={rack?.name} placeholder={t("cellar.rackNamePlaceholder")} required />
        </Field>
      </div>
      <Field label={t("cellar.rows")} htmlFor={`rack-rows-${id}`}>
        <Input id={`rack-rows-${id}`} name="rows" type="number" inputMode="numeric" min={1} max={50} defaultValue={rack?.rows ?? 4} required />
      </Field>
      <Field label={t("cellar.cols")} htmlFor={`rack-cols-${id}`}>
        <Input id={`rack-cols-${id}`} name="cols" type="number" inputMode="numeric" min={1} max={50} defaultValue={rack?.cols ?? 6} required />
      </Field>
      <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
        {rack ? t("common.save") : t("common.add")}
      </Button>
      {state?.error && (
        <div className="col-span-2 sm:col-span-4">
          <Alert>{t(state.error)}</Alert>
        </div>
      )}
    </form>
  );
}
