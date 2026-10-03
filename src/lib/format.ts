export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD"] as const;

/** 375 → "37,5 cl" (fr) / "37.5 cl" (en), 1500 → "1,5 L". */
export function formatBottleSize(ml: number, locale: string) {
  return ml >= 1000 ? `${(ml / 1000).toLocaleString(locale)} L` : `${(ml / 10).toLocaleString(locale)} cl`;
}

export function formatMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
