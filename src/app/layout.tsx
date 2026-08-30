import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  getLocale,
  getMessages,
} from "next-intl/server";

import { SiteChrome } from "@/components/SiteChrome";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default:
      "Enorsis | AI Procurement Operating System",
    template: "%s | Enorsis",
  },
  description:
    "AI-powered, multi-tenant Procurement-as-a-Service for global organizations.",
  icons: { icon: "/icon.svg" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <body>
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
        >
          <SiteChrome>
            {children}
          </SiteChrome>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}