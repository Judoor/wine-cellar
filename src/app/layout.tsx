import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { I18nProvider } from "@/i18n/client";
import { getLocale } from "@/i18n/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Wine Cellar",
  description: "Self-hosted wine cellar management",
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Wine Cellar", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#3a2416",
  // Lets the layout extend under notches / gesture bars (handled with env(safe-area-inset-*)).
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${dmSerif.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
