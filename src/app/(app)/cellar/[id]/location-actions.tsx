"use client";

import { Pencil, Plus, Trash } from "lucide-react";
import { useState, useTransition } from "react";
import { ActionMenu, Modal } from "@/components/menu";
import { useI18n } from "@/i18n/client";
import { removeLocation } from "../actions";
import { LocationForm } from "../location-form";
import { RackModal } from "./rack-controls";

export function LocationActions({ location }: { location: { id: string; name: string; description: string | null } }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<"edit" | "rack" | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <ActionMenu
        label={t("cellar.locationMenu")}
        items={[
          { label: t("cellar.newRack"), icon: Plus, onSelect: () => setOpen("rack") },
          { label: t("common.edit"), icon: Pencil, onSelect: () => setOpen("edit") },
          {
            label: t("common.delete"),
            icon: Trash,
            danger: true,
            disabled: pending,
            onSelect: () => {
              if (confirm(t("cellar.deleteLocationConfirm"))) startTransition(() => removeLocation(location.id));
            },
          },
        ]}
      />
      {open === "edit" && (
        <Modal title={t("cellar.editLocation")} onClose={() => setOpen(null)}>
          <LocationForm location={location} onDone={() => setOpen(null)} />
        </Modal>
      )}
      {open === "rack" && <RackModal locationId={location.id} onClose={() => setOpen(null)} />}
    </>
  );
}
