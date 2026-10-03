import { redirect } from "next/navigation";
import { GlassShelf } from "@/components/glass";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { WINE_COLOR_ORDER, WINE_COLOR_STYLES } from "@/lib/wine-colors";
import { getLocale, getT } from "@/i18n/server";
import { GuestLocaleSwitcher } from "./guest-locale-switcher";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/");
  const t = await getT();
  return (
    <main className="stone flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Logo name={t("app.name")} className="text-4xl" />
        <p className="text-sm text-muted">{t("app.tagline")}</p>
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <GlassShelf fills={WINE_COLOR_ORDER.map((c) => WINE_COLOR_STYLES[c].fill)} height={64} />
        </div>
        {children}
      </div>
      <div className="mt-6">
        <GuestLocaleSwitcher current={await getLocale()} />
      </div>
    </main>
  );
}
