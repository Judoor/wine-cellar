"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES } from "@/i18n/config";
import { setGuestLocale } from "./actions";

export function GuestLocaleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-1 text-sm">
      {Object.entries(LOCALES).map(([code, { label }]) => (
        <button
          key={code}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setGuestLocale(code);
              router.refresh();
            })
          }
          className={code === current ? "rounded px-2 py-1 font-semibold text-primary" : "rounded px-2 py-1 text-muted hover:text-foreground"}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
