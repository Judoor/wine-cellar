import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createT, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALES, type Locale } from "./config";

/** Resolution order: user preference, cookie, browser language, default. */
export const getLocale = cache(async (): Promise<Locale> => {
  const user = await getCurrentUser();
  if (user && isLocale(user.locale)) return user.locale;

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
});

export async function getT() {
  const locale = await getLocale();
  return createT(LOCALES[locale].messages);
}
