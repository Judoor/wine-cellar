import { Heart, Shield } from "lucide-react";
import Link from "next/link";
import { PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { PasswordForm, ProfileForm } from "./forms";

export default async function SettingsPage() {
  const user = await requireUser();
  const t = await getT();
  return (
    <>
      <PageTitle>{t("settings.title")}</PageTitle>

      {/* Sections that don't fit in the mobile bottom bar. */}
      <div className="mb-6 grid gap-2 md:hidden">
        <Link href="/wishlist" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm font-medium">
          <Heart className="size-4 text-primary" aria-hidden /> {t("nav.wishlist")}
        </Link>
        {user.role === "admin" && (
          <Link href="/admin" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm font-medium">
            <Shield className="size-4 text-primary" aria-hidden /> {t("nav.admin")}
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm name={user.name} locale={user.locale} currency={user.currency} />
        <PasswordForm />
      </div>
    </>
  );
}
