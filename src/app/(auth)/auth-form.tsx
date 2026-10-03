"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { login, register } from "./actions";

export function AuthForm({ mode, firstUser }: { mode: "login" | "register"; firstUser?: boolean }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(mode === "login" ? login : register, undefined);
  const isRegister = mode === "register";

  return (
    <Card>
      <h1 className="mb-4 font-serif text-2xl font-semibold">{isRegister ? t("auth.register") : t("auth.login")}</h1>
      {firstUser && (
        <div className="mb-4">
          <Alert kind="success">{t("auth.firstUserHint")}</Alert>
        </div>
      )}
      <form action={formAction} className="space-y-4">
        {isRegister && (
          <Field label={t("auth.name")} htmlFor="name">
            <Input id="name" name="name" autoComplete="name" required />
          </Field>
        )}
        <Field label={t("auth.email")} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t("auth.password")} htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 8 : undefined}
            required
          />
        </Field>
        {isRegister && (
          <Field label={t("auth.passwordConfirm")} htmlFor="passwordConfirm">
            <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required />
          </Field>
        )}
        {state?.error && <Alert>{t(state.error)}</Alert>}
        <Button type="submit" disabled={pending} className="w-full">
          {isRegister ? t("auth.register") : t("auth.login")}
        </Button>
      </form>
      {!firstUser && (
        <p className="mt-4 text-center text-sm text-muted">
          {isRegister ? t("auth.hasAccount") : t("auth.noAccount")}{" "}
          <Link href={isRegister ? "/login" : "/register"} className="font-medium text-primary hover:underline">
            {isRegister ? t("auth.login") : t("auth.register")}
          </Link>
        </p>
      )}
    </Card>
  );
}
