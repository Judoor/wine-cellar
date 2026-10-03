import clsx from "clsx";
import { WINDOW_STATUS_STYLES, type WindowStatus } from "@/lib/drinking-window";

export function WindowBadge({ status, label, className }: { status: WindowStatus; label: string; className?: string }) {
  return (
    <span className={clsx("inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold", WINDOW_STATUS_STYLES[status], className)}>
      {label}
    </span>
  );
}
