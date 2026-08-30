import type { Metadata } from "next";

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
return (
    <html
      lang="en"
      dir="ltr"
    >
      <body>
          <SiteChrome>
            {children}
          </SiteChrome>

      </body>
    </html>
  );
}
