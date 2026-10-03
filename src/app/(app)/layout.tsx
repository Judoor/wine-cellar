import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { urgentCount } from "@/lib/queries/drink";
import { getT } from "@/i18n/server";
import { logout } from "../(auth)/actions";
import { MobileNav, SidebarNav } from "./nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const t = await getT();
  const isAdmin = user.role === "admin";
  const badges = { "/drink": urgentCount(user.id) };

  return (
    <div className="min-h-screen md:flex">
      <aside className="oak sticky top-0 hidden h-screen w-64 shrink-0 flex-col p-4 md:flex">
        <div className="mb-8 px-3 pt-2 text-[#fff3dc]">
          <Logo name={t("app.name")} />
        </div>
        <SidebarNav isAdmin={isAdmin} badges={badges} />
        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="truncate px-3 text-sm font-medium text-[#fff3dc]">{user.name}</p>
          <p className="mb-2 truncate px-3 text-xs opacity-70">{user.email}</p>
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm opacity-80 hover:bg-white/10 hover:opacity-100">
              <LogOut className="size-4" aria-hidden />
              {t("nav.logout")}
            </button>
          </form>
        </div>
      </aside>

      <header className="oak sticky top-0 z-20 flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
        <span className="text-[#fff3dc]">
          <Logo name={t("app.name")} className="text-xl" />
        </span>
        <div className="flex items-center gap-1">
          <Link href="/settings" aria-label={t("nav.settings")} className="rounded-lg p-2 opacity-80 hover:bg-white/10">
            <Settings className="size-5" />
          </Link>
          <form action={logout}>
            <button aria-label={t("nav.logout")} className="rounded-lg p-2 opacity-80 hover:bg-white/10">
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </header>

      <main className="stone min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-10 md:py-10">{children}</div>
      </main>

      <MobileNav isAdmin={isAdmin} badges={badges} />
    </div>
  );
}
