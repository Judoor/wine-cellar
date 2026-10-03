import en, { type Messages } from "./messages/en";
import fr from "./messages/fr";

// To add a language: create messages/<code>.ts and register it here.
export const LOCALES = {
  en: { label: "English", messages: en },
  fr: { label: "Français", messages: fr },
} satisfies Record<string, { label: string; messages: Messages }>;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "wc_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in LOCALES;
}

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];
export type MessageKey = Paths<Messages>;
export type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function createT(messages: Messages): TFunction {
  return (key, vars) => {
    let node: unknown = messages;
    for (const part of key.split(".")) node = (node as Record<string, unknown>)?.[part];
    let text = typeof node === "string" ? node : key;
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  };
}
