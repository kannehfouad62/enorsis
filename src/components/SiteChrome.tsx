"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

const productRoutes = ["/app", "/login"];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProductRoute = productRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProductRoute) {
    return children;
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
