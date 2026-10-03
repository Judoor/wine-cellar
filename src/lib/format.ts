export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD"] as const;

export function formatMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
