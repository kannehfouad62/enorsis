import Link from "next/link";

import { Logo } from "./Logo";

const legalLinks = [
  ["Contact Us", "/contact"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Cookies", "/cookies"],
  ["Accessibility", "/accessibility"],
] as const;

export function Footer() {
return (
    <footer className="bg-[#05142f] py-14 text-white">
      <div className="wide-shell grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo theme="dark" />
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
            The AI-native global procurement operating system, combining software, intelligence and governed execution.
          </p>
        </div>

        <div>
          <h4 className="font-bold">Company</h4>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <Link href="/about">About Us</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
        </div>

        <div>
          <h4 className="font-bold">Resources</h4>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <Link href="/resources/guides">Guides & eBooks</Link>
            <Link href="/resources/publications">Publications</Link>
            <Link href="/platform">Our Platform</Link>
          </div>
        </div>
      </div>

      <div className="wide-shell mt-10 border-t border-white/10 pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
            Legal & support
          </p>
          <nav
            aria-label="Legal & support"
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1"
          >
            {legalLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
