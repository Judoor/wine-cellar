import type { Wine } from "@/lib/db/schema";

/** Horizontal bar: drinking window, peak highlighted, marker on the current year. */
export function WindowTimeline({ wine, unknownLabel }: { wine: Wine; unknownLabel: string }) {
  const { drinkFrom, peakFrom, peakUntil, drinkUntil } = wine;
  const years = [drinkFrom, peakFrom, peakUntil, drinkUntil].filter((y): y is number => y != null);
  if (years.length === 0) return <p className="text-sm text-muted">{unknownLabel}</p>;

  const now = new Date().getFullYear();
  const start = Math.min(...years, now) - 1;
  const end = Math.max(...years, now) + 1;
  const pos = (y: number) => ((y - start) / (end - start)) * 100;
  const from = drinkFrom ?? peakFrom ?? start;
  const until = drinkUntil ?? peakUntil ?? end;

  return (
    <div className="pt-6 pb-1">
      <div className="relative h-4 rounded-full bg-surface-2">
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#e9cf7a] to-[#d9a440] opacity-60"
          style={{ left: `${pos(from)}%`, width: `${pos(until) - pos(from)}%` }}
        />
        {peakFrom != null && (
          <div
            className="absolute inset-y-0 rounded-full bg-primary"
            style={{ left: `${pos(peakFrom)}%`, width: `${Math.max(pos(peakUntil ?? peakFrom) - pos(peakFrom), 1.5)}%` }}
          />
        )}
        <div className="absolute -top-6 flex -translate-x-1/2 flex-col items-center" style={{ left: `${pos(now)}%` }}>
          <span className="rounded bg-oak px-1.5 text-[11px] font-semibold text-oak-foreground">{now}</span>
          <span className="h-8 w-0.5 bg-oak" />
        </div>
      </div>
      <div className="relative mt-2 h-5 text-xs text-muted">
        {[...new Set(years)].map((y) => (
          <span key={y} className="absolute -translate-x-1/2" style={{ left: `${pos(y)}%` }}>
            {y}
          </span>
        ))}
      </div>
    </div>
  );
}
