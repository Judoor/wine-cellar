"use client";

import { Pencil, Trash } from "lucide-react";
import { useTransition } from "react";
import { ActionMenu } from "@/components/menu";
import { useI18n } from "@/i18n/client";
import { removeWine } from "../actions";

export function WineMenu({ wineId }: { wineId: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  return (
    <ActionMenu
      label={t("wines.menu")}
      items={[
        { label: t("common.edit"), icon: Pencil, href: `/wines/${wineId}/edit` },
        {
          label: t("common.delete"),
          icon: Trash,
          danger: true,
          disabled: pending,
          onSelect: () => {
            if (confirm(t("wines.deleteConfirm"))) startTransition(() => removeWine(wineId));
          },
        },
      ]}
    />
  );
}
