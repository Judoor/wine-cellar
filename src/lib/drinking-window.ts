import type { Wine } from "@/lib/db/schema";

export type WindowStatus = "unknown" | "tooYoung" | "ready" | "peak" | "declining" | "past";

type WindowFields = Pick<Wine, "drinkFrom" | "peakFrom" | "peakUntil" | "drinkUntil">;

export function windowStatus(w: WindowFields, year = new Date().getFullYear()): WindowStatus {
  const { drinkFrom, peakFrom, peakUntil, drinkUntil } = w;
  if (drinkFrom == null && peakFrom == null && peakUntil == null && drinkUntil == null) return "unknown";
  if (drinkUntil != null && year > drinkUntil) return "past";
  const start = drinkFrom ?? peakFrom;
  if (start != null && year < start) return "tooYoung";
  if (peakFrom != null && year >= peakFrom && (peakUntil == null || year <= peakUntil)) return "peak";
  if (peakUntil != null && year > peakUntil) return "declining";
  if (drinkUntil != null && year === drinkUntil) return "declining";
  return "ready";
}

export const WINDOW_STATUS_STYLES: Record<WindowStatus, string> = {
  unknown: "border-border bg-surface-2 text-muted",
  tooYoung: "border-[#9bb0c9]/50 bg-[#e5ecf4] text-[#3d5674]",
  ready: "border-success/30 bg-success/10 text-success",
  peak: "border-accent/40 bg-accent-soft text-[#8a5a1c]",
  declining: "border-[#d9863a]/40 bg-[#fbe5cf] text-[#9a4d12]",
  past: "border-danger/30 bg-danger/10 text-danger",
};
