import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
} from "lucide-react";

import { Logo } from "./Logo";
import {
  LanguageRegionMenu,
} from "./LanguageRegionMenu";

const links = [
  ["home", "/"],
  ["platform", "/platform"],
  ["solutions", "/solutions"],
  ["whoWeServe", "/who-we-serve"],
  ["pricing", "/pricing"],
] as const;

export function Navbar() {
  const t = useTranslations("public");

  return (
    <header className="site-header">
      <div className="wide-shell flex h-[76px] items-center justify-between gap-5">
        <Link
          href="/"
          aria-label="Enorsis home"
        >
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-semibold text-slate-700 xl:flex">
          {links.map(
            ([name, href]) => (
              <Link
                key={href}
                href={href}
                className="relative after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-blue-600 after:transition-all hover:after:w-full"
              >
                {t(name)}
              </Link>
            ),
          )}

          <div className="group relative">
            <button className="flex items-center gap-1">
              {t("resources")}
              <ChevronDown
                size={14}
              />
            </button>
            <div className="resource-menu">
              <Link href="/resources/guides">
                {t("guides")}
              </Link>
              <Link href="/resources/publications">
                {t("publications")}
              </Link>
            </div>
          </div>

          <Link href="/about">
            About Us
          </Link>
          <Link href="/careers">
            Careers
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm sm:inline-flex"
          >
            {t("login")}
          </Link>

          <Link
            href="/onboarding"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20"
          >
            {t("requestDemo")}
          </Link>

          <LanguageRegionMenu />
        </div>
      </div>
    </header>
  );
}
