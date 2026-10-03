"use client";

import { GlassWater } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { drinkOne } from "../wines/actions";

/** Takes one bottle out as "drunk", then opens the wine sheet with the tasting note form. */
export function DrinkOneButton({ wineId }: { wineId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (await drinkOne(wineId)) router.push(`/wines/${wineId}?note=1#tasting`);
        })
      }
      title={t("drink.drinkOne")}
      aria-label={t("drink.drinkOne")}
      className="flex size-10 shrink-0 items-center justify-center rounded border border-border bg-surface text-primary hover:border-accent hover:bg-accent-soft disabled:opacity-50"
    >
      <GlassWater className="size-4" />
    </button>
  );
}
