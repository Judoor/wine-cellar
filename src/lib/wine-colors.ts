import type { WineColor } from "@/lib/db/schema";

/** Glass fill per wine color, ordered pale gold → deep red (display order). */
export const WINE_COLOR_STYLES: Record<WineColor, { fill: string }> = {
  sparkling: { fill: "#f1e2a6" },
  white: { fill: "#e9cf7a" },
  sweet: { fill: "#d9a440" },
  rose: { fill: "#e59a7c" },
  red: { fill: "#7d1a28" },
  fortified: { fill: "#5c1220" },
};

export const WINE_COLOR_ORDER = Object.keys(WINE_COLOR_STYLES) as WineColor[];
