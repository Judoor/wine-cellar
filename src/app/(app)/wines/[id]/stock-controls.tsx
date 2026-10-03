"use client";

import clsx from "clsx";
import { Minus, Plus, Trash } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import type { MovementReason } from "@/lib/db/schema";
import { useI18n } from "@/i18n/client";
import { moveBottles, removeWine } from "../actions";
import { Stepper } from "../wine-form";

const REASONS: Record<"in" | "out", MovementReason[]> = {
  in: ["purchase", "gift_received", "other"],
  out: ["drunk", "gifted", "broken", "other"],
};

export function StockControls({ wineId, stock }: { wineId: string; stock: number }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"in" | "out" | null>(null);

  return (
    <Card>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t("wines.stock")}</p>
      <p className="font-serif text-5xl">{stock}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant={mode === "out" ? "primary" : "secondary"} onClick={() => setMode(mode === "out" ? null : "out")} disabled={stock === 0}>
          <Minus className="size-4" aria-hidden /> {t("wines.takeOut")}
        </Button>
        <Button variant={mode === "in" ? "primary" : "secondary"} onClick={() => setMode(mode === "in" ? null : "in")}>
          <Plus className="size-4" aria-hidden /> {t("common.add")}
        </Button>
      </div>
      {mode && <MoveForm key={mode} wineId={wineId} direction={mode} max={mode === "out" ? stock : 500} onDone={() => setMode(null)} />}
    </Card>
  );
}

function MoveForm({ wineId, direction, max, onDone }: { wineId: string; direction: "in" | "out"; max: number; onDone: () => void }) {
  const { t } = useI18n();
  const [quantity, setQuantity] = useState(1);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof moveBottles>>, fd: FormData) => {
    const result = await moveBottles(wineId, direction, prev, fd);
    if (result?.ok) onDone();
    return result;
  }, undefined);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className={clsx("mt-4 space-y-3 border-t border-dashed border-border pt-4")}>
      <p className="font-serif text-xl">{direction === "in" ? t("wines.addBottles") : t("wines.removeBottles")}</p>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("wines.quantity")}</p>
        <Stepper name="quantity" value={quantity} onChange={setQuantity} min={1} max={max} />
      </div>
      <Field label={t("wines.reason")} htmlFor="reason">
        <Select id="reason" name="reason" defaultValue={REASONS[direction][0]}>
          {REASONS[direction].map((r) => (
            <option key={r} value={r}>
              {t(`reasons.${r}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("wines.date")} htmlFor="date">
        <Input id="date" name="date" type="date" defaultValue={today} max={today} />
      </Field>
      <Field label={t("wines.note")} htmlFor="note">
        <Input id="note" name="note" />
      </Field>
      {state?.error && <Alert>{t(state.error)}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {t("common.save")}
      </Button>
    </form>
  );
}

export function DeleteWineButton({ wineId }: { wineId: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      disabled={pending}
      className="text-danger"
      onClick={() => {
        if (confirm(t("wines.deleteConfirm"))) startTransition(() => removeWine(wineId));
      }}
    >
      <Trash className="size-4" aria-hidden /> {t("common.delete")}
    </Button>
  );
}
