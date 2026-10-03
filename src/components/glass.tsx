/** A stemmed wine glass filled with the given color. */
export function Glass({ fill, height = 72 }: { fill: string; height?: number }) {
  return (
    <svg width={height * 0.55} height={height} viewBox="0 0 55 100" aria-hidden className="shrink-0">
      <path
        d="M8 4 H47 C49 30 45 48 27.5 52 C10 48 6 30 8 4 Z"
        fill="rgb(255 255 255 / 0.08)"
        stroke="rgb(255 255 255 / 0.55)"
        strokeWidth="1.5"
      />
      <path d="M9 22 H46 C46 38 42 48 27.5 51 C13 48 9 38 9 22 Z" fill={fill} />
      <path d="M14 8 C13 20 14 32 18 40" stroke="rgb(255 255 255 / 0.6)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="26.3" y="52" width="2.4" height="38" fill="rgb(255 255 255 / 0.55)" />
      <ellipse cx="27.5" cy="92" rx="16" ry="3.5" fill="rgb(255 255 255 / 0.45)" />
    </svg>
  );
}

/** Row of glasses on a candle-lit oak shelf. */
export function GlassShelf({ fills, height = 76 }: { fills: string[]; height?: number }) {
  return (
    <div
      className="flex items-end justify-center gap-1.5 overflow-hidden rounded-md px-3 py-4 sm:gap-2"
      style={{
        background:
          "radial-gradient(ellipse at 50% 120%, rgb(232 160 70 / 0.45), transparent 70%), linear-gradient(180deg, #2a1c13, #3d2818)",
      }}
    >
      {fills.map((fill, i) => (
        <Glass key={i} fill={fill} height={height} />
      ))}
    </div>
  );
}
