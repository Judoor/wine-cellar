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

// Traffic-light scale: red (too young) → yellow (ready) → green (peak) → dark green (drink soon) → black (past).
export const WINDOW_STATUS_STYLES: Record<WindowStatus, string> = {
  unknown: "border-border bg-surface-2 text-muted",
  tooYoung: "border-[#c0392b]/35 bg-[#f9dcd8] text-[#a5281b]",
  ready: "border-[#c9a400]/45 bg-[#fbf1bf] text-[#7a5f00]",
  peak: "border-[#3f8f3a]/40 bg-[#d9efd3] text-[#2b6b27]",
  declining: "border-[#1f4d2b] bg-[#1f4d2b] text-white",
  past: "border-[#1c1917] bg-[#1c1917] text-[#f5f0e8]",
};
