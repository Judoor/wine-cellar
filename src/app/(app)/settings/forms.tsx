"use client";

import { useActionState } from "react";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { LOCALES } from "@/i18n/config";
import { CURRENCIES } from "@/lib/format";
import { changePassword, updateProfile, type SettingsState } from "./actions";

function Feedback({ state }: { state: SettingsState }) {
  const { t } = useI18n();
  if (state?.error) return <Alert>{t(state.error)}</Alert>;
  if (state?.success) return <Alert kind="success">{t(state.success)}</Alert>;
  return null;
}

export function ProfileForm({ name, locale, currency }: { name: string; locale: string; currency: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <Card>
      <h2 className="mb-4 font-serif text-xl font-semibold">{t("settings.profile")}</h2>
      <form action={action} className="space-y-4">
        <Field label={t("auth.name")} htmlFor="name">
          <Input id="name" name="name" defaultValue={name} required />
        </Field>
        <Field label={t("settings.language")} htmlFor="locale">
          <Select id="locale" name="locale" defaultValue={locale}>
            {Object.entries(LOCALES).map(([code, { label }]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("settings.currency")} htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={currency}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>
          {t("common.save")}
        </Button>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <Card>
      <h2 className="mb-4 font-serif text-xl font-semibold">{t("settings.changePassword")}</h2>
      <form action={action} className="space-y-4">
        <Field label={t("settings.currentPassword")} htmlFor="currentPassword">
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label={t("settings.newPassword")} htmlFor="newPassword">
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Feedback state={state} />
        <Button type="submit" disabled={pending}>
          {t("common.save")}
        </Button>
      </form>
    </Card>
  );
}
