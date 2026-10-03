"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { saveLocation } from "./actions";

export function LocationForm({ location, onDone }: { location?: { id: string; name: string; description: string | null }; onDone?: () => void }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveLocation>>, fd: FormData) => {
    const result = await saveLocation(location?.id ?? null, prev, fd);
    if (result?.ok) onDone?.();
    return result;
  }, undefined);

  return (
    <form action={action} className="space-y-4">
      <Field label={t("cellar.locationName")} htmlFor="location-name">
        <Input id="location-name" name="name" defaultValue={location?.name} placeholder={t("cellar.locationNamePlaceholder")} required />
      </Field>
      <Field label={t("cellar.description")} htmlFor="location-description">
        <Input id="location-description" name="description" defaultValue={location?.description ?? ""} />
      </Field>
      {state?.error && <Alert>{t(state.error)}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {location ? t("common.save") : t("common.add")}
      </Button>
    </form>
  );
}
