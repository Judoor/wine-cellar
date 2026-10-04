"use client";

import { useState } from "react";
import { AddButton, Modal } from "@/components/menu";
import { useI18n } from "@/i18n/client";
import { LocationForm } from "./location-form";

export function NewLocationButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <AddButton label={t("cellar.newLocation")} onClick={() => setOpen(true)} />
      {open && (
        <Modal title={t("cellar.newLocation")} onClose={() => setOpen(false)}>
          <LocationForm onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
