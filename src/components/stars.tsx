"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** Read-only 0–5 rating with half stars. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value}/5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarShape key={i} fill={Math.max(0, Math.min(1, value - i))} />
      ))}
    </span>
  );
}

function StarShape({ fill, size = "size-4" }: { fill: number; size?: string }) {
  return (
    <span className={cn("relative inline-block", size)}>
      <Star className={cn("absolute inset-0 text-border", size)} fill="currentColor" strokeWidth={0} aria-hidden />
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <Star className={cn("text-accent", size)} fill="currentColor" strokeWidth={0} aria-hidden />
      </span>
    </span>
  );
}

/**
 * Rating input: each star has a left half (x.5) and a right half (x.0).
 * Tapping the current value again clears the rating.
 */
export function StarInput({ name, defaultValue, label, clearLabel }: { name: string; defaultValue?: number | null; label: string; clearLabel: string }) {
  const [value, setValue] = useState<number | null>(defaultValue ?? null);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-3">
      <input type="hidden" name={name} value={value ?? ""} />
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="relative">
            <StarShape fill={Math.max(0, Math.min(1, shown - i))} size="size-8" />
            {[0.5, 1].map((half) => {
              const v = i + half;
              return (
                <button
                  key={half}
                  type="button"
                  role="radio"
                  aria-checked={value === v}
                  aria-label={`${v}/5`}
                  onMouseEnter={() => setHover(v)}
                  onClick={() => setValue(value === v ? null : v)}
                  className={cn("absolute top-0 h-full w-1/2", half === 0.5 ? "left-0" : "right-0")}
                />
              );
            })}
          </span>
        ))}
      </div>
      <span className="min-w-12 font-serif text-xl">{value != null ? `${value}/5` : <span className="text-sm text-muted">{clearLabel}</span>}</span>
    </div>
  );
}
