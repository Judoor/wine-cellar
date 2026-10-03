"use client";

import { Pencil, Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { removeLocation } from "../actions";
import { LocationForm } from "../location-form";

export function LocationActions({ location }: { location: { id: string; name: string; description: string | null } }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative flex gap-2">
      <Button variant="secondary" onClick={() => setEditing(!editing)}>
        <Pencil className="size-4" aria-hidden /> {t("cellar.rename")}
      </Button>
      <Button
        variant="ghost"
        className="text-danger"
        disabled={pending}
        aria-label={t("common.delete")}
        onClick={() => {
          if (confirm(t("cellar.deleteLocationConfirm"))) startTransition(() => removeLocation(location.id));
        }}
      >
        <Trash className="size-4" aria-hidden />
      </Button>
      {editing && (
        <Card className="absolute top-full right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] shadow-xl">
          <LocationForm location={location} onDone={() => setEditing(false)} />
        </Card>
      )}
    </div>
  );
}
