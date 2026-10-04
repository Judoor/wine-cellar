"use client";

import { Pencil, Trash, Users } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { ActionMenu, AddButton, Modal } from "@/components/menu";
import { Stars, StarInput } from "@/components/stars";
import { Alert, Button, Card, Field, Input, SectionTitle, Textarea } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { removeTastingNote, saveTastingNote } from "../actions";

export type TastingNote = {
  id: string;
  date: string; // ISO
  rating: number | null;
  notes: string | null;
  occasion: string | null;
  companions: string | null;
};

export function TastingSection({ wineId, notes, autoOpen }: { wineId: string; notes: TastingNote[]; autoOpen?: boolean }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState<string | "new" | null>(autoOpen ? "new" : null);
  const [pending, startTransition] = useTransition();

  const editedNote = notes.find((n) => n.id === editing);

  return (
    <Card id="tasting" className="scroll-mt-20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <SectionTitle className="mb-0">{t("tasting.title")}</SectionTitle>
        <AddButton label={t("tasting.add")} onClick={() => setEditing("new")} className="-mr-2" />
      </div>

      {editing && (editing === "new" || editedNote) && (
        <Modal title={editedNote ? t("tasting.edit") : t("tasting.add")} onClose={() => setEditing(null)}>
          <TastingForm wineId={wineId} note={editedNote} onDone={() => setEditing(null)} />
        </Modal>
      )}

      {notes.length === 0 && <p className="text-sm text-muted">{t("tasting.empty")}</p>}

      <ul className="divide-y divide-dashed divide-border">
        {notes.map((n) => (
          <li key={n.id} className="py-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {n.rating != null && <Stars value={n.rating} />}
                  <span className="text-sm text-muted">{new Date(n.date).toLocaleDateString(locale, { dateStyle: "long" })}</span>
                  {n.occasion && <span className="text-sm font-medium">· {n.occasion}</span>}
                </div>
                {n.notes && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{n.notes}</p>}
                {n.companions && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Users className="size-3.5" aria-hidden /> {n.companions}
                  </p>
                )}
              </div>
              <ActionMenu
                label={t("tasting.menu")}
                className="-mt-2 -mr-2"
                items={[
                  { label: t("common.edit"), icon: Pencil, onSelect: () => setEditing(n.id) },
                  {
                    label: t("common.delete"),
                    icon: Trash,
                    danger: true,
                    disabled: pending,
                    onSelect: () => confirm(t("tasting.deleteConfirm")) && startTransition(() => removeTastingNote(n.id)),
                  },
                ]}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TastingForm({ wineId, note, onDone }: { wineId: string; note?: TastingNote; onDone: () => void }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveTastingNote>>, fd: FormData) => {
    const result = await saveTastingNote(wineId, note?.id ?? null, prev, fd);
    if (result?.ok) onDone();
    return result;
  }, undefined);
  const today = new Date().toISOString().slice(0, 10);
  const id = note?.id ?? "new";

  return (
    <form action={action} className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{t("tasting.rating")}</p>
        <StarInput name="rating" defaultValue={note?.rating} label={t("tasting.rating")} clearLabel={t("tasting.noRating")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("tasting.date")} htmlFor={`t-date-${id}`}>
          <Input id={`t-date-${id}`} name="date" type="date" defaultValue={note?.date.slice(0, 10) ?? today} max={today} required />
        </Field>
        <Field label={t("tasting.occasion")} htmlFor={`t-occasion-${id}`}>
          <Input id={`t-occasion-${id}`} name="occasion" defaultValue={note?.occasion ?? ""} placeholder={t("tasting.occasionPlaceholder")} />
        </Field>
      </div>
      <Field label={t("tasting.notes")} htmlFor={`t-notes-${id}`}>
        <Textarea id={`t-notes-${id}`} name="notes" rows={4} defaultValue={note?.notes ?? ""} placeholder={t("tasting.notesPlaceholder")} />
      </Field>
      <Field label={t("tasting.companions")} htmlFor={`t-companions-${id}`}>
        <Input id={`t-companions-${id}`} name="companions" defaultValue={note?.companions ?? ""} placeholder={t("tasting.companionsPlaceholder")} />
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
  );
}
