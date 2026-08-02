"use client";

import {
  Bell,
  Bot,
  Boxes,
  Building2,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  Gauge,
  Globe2,
  Menu,
  Network,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SignOutButton } from "./SignOutButton";

const navigation = [
  { href: "/app", label: "Command center", icon: Gauge, roles: [] },
  { href: "/app/requests", label: "Purchase requests", icon: Boxes, roles: ["REQUESTER", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/sourcing", label: "Strategic sourcing", icon: Network, roles: ["BUYER", "PROCUREMENT_MANAGER", "PROCUREMENT_EXECUTIVE", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/suppliers", label: "Supplier intelligence", icon: UsersRound, roles: ["SUPPLIER_MANAGER", "BUYER", "PROCUREMENT_MANAGER", "RISK_COMPLIANCE", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/contracts", label: "Contracts", icon: FileCheck2, roles: ["LEGAL", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/spend", label: "Spend intelligence", icon: CircleDollarSign, roles: ["FINANCE", "PROCUREMENT_EXECUTIVE", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/agents", label: "AI agent workforce", icon: Bot, roles: ["PROCUREMENT_EXECUTIVE", "PROCUREMENT_MANAGER", "RISK_COMPLIANCE", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/risk", label: "Risk & governance", icon: ShieldCheck, roles: ["RISK_COMPLIANCE", "AUDITOR", "PLATFORM_AUDITOR", "TENANT_ADMIN", "TENANT_OWNER"] },
];

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    tenantName: string;
    roles: string[];
    mustChangePassword: boolean;
  };
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (
      user.mustChangePassword &&
      pathname !== "/app/settings/security"
    ) {
      router.replace("/app/settings/security");
    }
  }, [pathname, router, user.mustChangePassword]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-white/10 bg-slate-950 text-white lg:flex">
        <SidebarContent pathname={pathname} user={user} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(88vw,20rem)] flex-col bg-slate-950 text-white shadow-2xl">
            <button
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent pathname={pathname} user={user} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 flex h-20 items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 xl:px-10">
          <button
            aria-label="Open navigation"
            className="rounded-xl border border-slate-200 p-2.5 text-slate-700 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative hidden max-w-xl flex-1 md:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search Enorsis"
              placeholder="Search suppliers, requests, contracts and insights"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>
            <Link
              href="/app/settings/organization"
              className="hidden rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 sm:block"
              aria-label="Settings"
            >
              <Settings2 className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-black text-white">
                {(user.name ?? user.email ?? "E").slice(0, 1).toUpperCase()}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-32 truncate text-sm font-bold">{user.name ?? "Administrator"}</p>
                <p className="max-w-32 truncate text-xs text-slate-500">{user.roles[0]?.replaceAll("_", " ")}</p>
              </div>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ pathname, user }: { pathname: string; user: AppShellProps["user"] }) {
  return (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-lg font-black tracking-wide">ENORSIS</p>
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-300">Procurement OS</p>
        </div>
      </div>

      <div className="px-4 py-4">
        <button className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{user.tenantName}</span>
            <span className="block text-xs text-slate-500">USD · Global tenant</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Workspace</p>
        <div className="space-y-1">
          {navigation
            .filter((item) =>
              item.roles.length === 0 ||
              item.roles.some((role) => user.roles.includes(role)),
            )
            .map(({ href, label, icon: Icon }) => {
            const active = href === "/app" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
        <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Organization</p>
        {user.roles.some((role) => ["PLATFORM_SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN"].includes(role)) ? (
          <>
            <Link href="/app/settings/organization" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white">
              <Globe2 className="h-4 w-4" /> Global configuration
            </Link>
            <Link href="/app/settings/access" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white">
              <UsersRound className="h-4 w-4" /> Access administration
            </Link>
          </>
        ) : null}
        <Link href="/app/settings/security" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white">
          <ShieldCheck className="h-4 w-4" /> Account security
        </Link>
      </nav>

      <div className="border-t border-white/10 p-4">
        <SignOutButton />
      </div>
    </>
  );
}
