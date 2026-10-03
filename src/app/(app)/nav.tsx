"use client";

import clsx from "clsx";
import { GlassWater, Grid3x3, Heart, House, Settings, Shield, Wine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/config";

const items: {
  href: string;
  label: MessageKey;
  mobileLabel?: MessageKey;
  icon: typeof Wine;
  adminOnly?: boolean;
  mobile?: boolean;
}[] = [
  { href: "/", label: "nav.dashboard", mobileLabel: "nav.home", icon: House, mobile: true },
  { href: "/wines", label: "nav.wines", icon: Wine, mobile: true },
  { href: "/cellar", label: "nav.cellar", icon: Grid3x3, mobile: true },
  { href: "/drink", label: "nav.toDrink", icon: GlassWater, mobile: true },
  { href: "/wishlist", label: "nav.wishlist", icon: Heart },
  { href: "/settings", label: "nav.settings", icon: Settings, mobile: true },
  { href: "/admin", label: "nav.admin", icon: Shield, adminOnly: true },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useI18n();
  const isActive = useIsActive();
  return (
    <nav className="flex flex-col gap-1">
      {items
        .filter((i) => !i.adminOnly || isAdmin)
        .map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(href) ? "bg-white/15 text-[#fff3dc]" : "text-[#cdb592] hover:bg-white/10 hover:text-[#fff3dc]",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(label)}
          </Link>
        ))}
    </nav>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useI18n();
  const isActive = useIsActive();
  return (
    <nav className="oak fixed inset-x-0 bottom-0 z-20 flex justify-around px-1 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      {items
        .filter((i) => i.mobile && (!i.adminOnly || isAdmin))
        .map(({ href, label, mobileLabel, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex min-w-0 flex-1 flex-col items-center gap-1 py-1 text-[11px] font-semibold",
              isActive(href) ? "text-[#fff3dc]" : "text-[#bfa47f]",
            )}
          >
            <Icon className="size-[22px]" aria-hidden />
            <span className="max-w-full truncate">{t(mobileLabel ?? label)}</span>
          </Link>
        ))}
    </nav>
  );
}
