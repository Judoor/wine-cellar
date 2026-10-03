"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/config";
import { deleteUser, setExternalLookups, setRegistrationOpen, setUserRole } from "./actions";

function SettingToggle({
  initial,
  disabled,
  label,
  onToggle,
}: {
  initial: boolean;
  disabled?: boolean;
  label: MessageKey;
  onToggle: (on: boolean) => Promise<void>;
}) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        defaultChecked={initial}
        disabled={disabled || pending}
        onChange={(e) => {
          const on = e.target.checked;
          startTransition(() => onToggle(on));
        }}
        className="size-4 accent-primary"
      />
      {t(label)}
    </label>
  );
}

export function RegistrationToggle({ initial, disabled }: { initial: boolean; disabled?: boolean }) {
  return <SettingToggle initial={initial} disabled={disabled} label="admin.registrationOpen" onToggle={setRegistrationOpen} />;
}

export function ExternalLookupsToggle({ initial, disabled }: { initial: boolean; disabled?: boolean }) {
  return <SettingToggle initial={initial} disabled={disabled} label="admin.externalLookups" onToggle={setExternalLookups} />;
}

export function UserActions({ userId, role }: { userId: string; role: "admin" | "user" }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        className="px-3 py-1"
        onClick={() => startTransition(() => setUserRole(userId, role === "admin" ? "user" : "admin"))}
      >
        {role === "admin" ? t("admin.roleUser") : t("admin.roleAdmin")}
      </Button>
      <Button
        variant="danger"
        disabled={pending}
        className="px-3 py-1"
        onClick={() => {
          if (confirm(t("admin.deleteUserConfirm"))) startTransition(() => deleteUser(userId));
        }}
      >
        {t("common.delete")}
      </Button>
    </div>
  );
}
