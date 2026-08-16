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
  LayoutGrid,
  Menu,
  Network,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { enterpriseModules } from "@/modules/navigation/enterprise-modules";
import {
  commercialPersonaLabel,
  isHrefAllowedForCommercialPersona,
  type TenantCommercialPersonaValue,
} from "@/core/tenancy/commercial-persona";
import { SignOutButton } from "./SignOutButton";

const navigation = [
  { href: "/app", label: "Command center", icon: Gauge, roles: [] },
  {
    href: "/app/marketplace/seller-profile",
    label: "Seller profile",
    icon: Store,
    roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
    sellerOnly: true,
  },
  { href: "/app/modules", label: "Enterprise modules", icon: LayoutGrid, roles: [] },
  { href: "/app/notifications", label: "Notifications", icon: Bell, roles: [] },
  { href: "/app/requests", label: "Purchase requests", icon: Boxes, roles: ["REQUESTER", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"] },
  {
    href: "/app/marketplace/orders",
    label: "Marketplace orders",
    icon: Store,
    roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
    sellerOnly: true,
  },
  {
    href: "/app/marketplace/invoices",
    label: "Supplier finance",
    icon: CircleDollarSign,
    roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER", "FINANCE"],
    sellerOnly: true,
  },
  {
    href: "/app/warehouse-operations",
    label: "Inventory & receiving",
    icon: Boxes,
    roles: ["TENANT_OWNER", "TENANT_ADMIN", "PROCUREMENT_MANAGER", "BUYER", "WAREHOUSE_OPERATOR", "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"],
  },
  {
    href: "/app/logistics",
    label: "Shipping monitor",
    icon: Globe2,
    roles: ["TENANT_OWNER", "TENANT_ADMIN", "PROCUREMENT_MANAGER", "BUYER", "LOGISTICS_MONITOR", "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"],
  },
  {
    href: "/app/purchasing/invoices",
    label: "Invoices",
    icon: CircleDollarSign,
    roles: ["TENANT_OWNER", "TENANT_ADMIN", "PROCUREMENT_MANAGER", "BUYER", "FINANCE", "ACCOUNTS_PAYABLE", "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"],
  },
  {
    href: "/app/requisition-to-order/receipts",
    label: "Goods receipts",
    icon: FileCheck2,
    roles: ["TENANT_OWNER", "TENANT_ADMIN", "PROCUREMENT_MANAGER", "BUYER", "ACCOUNTS_PAYABLE", "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"],
  },
  { href: "/app/sourcing", label: "Strategic sourcing", icon: Network, roles: ["BUYER", "PROCUREMENT_MANAGER", "PROCUREMENT_EXECUTIVE", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/suppliers", label: "Supplier intelligence", icon: UsersRound, roles: ["SUPPLIER_MANAGER", "BUYER", "PROCUREMENT_MANAGER", "RISK_COMPLIANCE", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/contracts", label: "Contracts", icon: FileCheck2, roles: ["LEGAL", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/analytics/spend", label: "Spend intelligence", icon: CircleDollarSign, roles: ["FINANCE", "PROCUREMENT_EXECUTIVE", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/agents", label: "AI agent workforce", icon: Bot, roles: ["PROCUREMENT_EXECUTIVE", "PROCUREMENT_MANAGER", "RISK_COMPLIANCE", "TENANT_ADMIN", "TENANT_OWNER"] },
  { href: "/app/resilience", label: "Risk & governance", icon: ShieldCheck, roles: ["RISK_COMPLIANCE", "AUDITOR", "PLATFORM_AUDITOR", "TENANT_ADMIN", "TENANT_OWNER"] },
];

type SearchResult = {
  id: string;
  type: "Supplier" | "Purchase request" | "Contract" | "Insight";
  title: string;
  subtitle: string;
  href: string;
};

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    tenantName: string;
    roles: string[];
    mustChangePassword: boolean;
    commercialPersona: TenantCommercialPersonaValue;
  };
  actionCounts?: Record<string, number>;
}

export function AppShell({
  children,
  user,
  actionCounts: initialActionCounts = {},
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [recordResults, setRecordResults] = useState<SearchResult[]>([]);
  const [actionCounts, setActionCounts] = useState(initialActionCounts);

  const isPlatformOperator = user.roles.some((role) =>
    role.startsWith("PLATFORM_"),
  );

  const workspaceResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (normalized.length < 2) {
      return [];
    }

    return enterpriseModules
      .filter(
        (module) =>
          isPlatformOperator ||
          isHrefAllowedForCommercialPersona(
            module.href,
            user.commercialPersona,
          ),
      )
      .filter((module) =>
        `${module.title} ${module.description} ${module.group}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 6);
  }, [isPlatformOperator, query, user.commercialPersona]);

  useEffect(() => {
    if (
      user.mustChangePassword &&
      pathname !== "/app/settings/security"
    ) {
      router.replace("/app/settings/security");
    }
  }, [pathname, router, user.mustChangePassword]);

  useEffect(() => {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setRecordResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(normalized)}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );

        if (!response.ok) {
          throw new Error("Search request failed.");
        }

        const payload = (await response.json()) as {
          results?: SearchResult[];
        };

        setRecordResults(payload.results ?? []);
      } catch (error) {
        if (
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setRecordResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const refreshActionCounts = async () => {
      try {
        const response = await fetch("/api/sidebar-action-counts", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          counts?: Record<string, number>;
        };

        if (active) {
          setActionCounts(payload.counts ?? {});
        }
      } catch {
        // Sidebar badges are supplemental. Preserve the most recent counts
        // if the lightweight refresh endpoint is temporarily unavailable.
      }
    };

    const interval = window.setInterval(refreshActionCounts, 30_000);
    const handleFocus = () => {
      void refreshActionCounts();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const hasSearchResults =
    workspaceResults.length > 0 || recordResults.length > 0;

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-white/10 bg-slate-950 text-white lg:flex">
        <SidebarContent
          pathname={pathname}
          user={user}
          actionCounts={actionCounts}
        />
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
            <SidebarContent
              pathname={pathname}
              user={user}
              actionCounts={actionCounts}
            />
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

          <div
            ref={searchRef}
            className="relative hidden max-w-xl flex-1 md:block"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search Enorsis"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchOpen(false);
                }

                if (
                  event.key === "Enter" &&
                  recordResults[0]?.href
                ) {
                  router.push(recordResults[0].href);
                  setSearchOpen(false);
                } else if (
                  event.key === "Enter" &&
                  workspaceResults[0]?.href
                ) {
                  router.push(workspaceResults[0].href);
                  setSearchOpen(false);
                }
              }}
              placeholder="Search suppliers, requests, contracts and insights"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />

            {searchOpen && query.trim().length >= 2 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[32rem] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                {searching ? (
                  <p className="px-3 py-3 text-xs font-semibold text-slate-500">
                    Searching Enorsis…
                  </p>
                ) : null}

                {recordResults.length > 0 ? (
                  <div>
                    <p className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                      Records
                    </p>
                    {recordResults.map((result) => (
                      <Link
                        key={`${result.type}:${result.id}`}
                        href={result.href}
                        onClick={() => setSearchOpen(false)}
                        className="block rounded-xl px-3 py-2.5 hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-black text-slate-900">
                            {result.title}
                          </p>
                          <span className="shrink-0 text-[10px] font-black uppercase text-blue-700">
                            {result.type}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {result.subtitle}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {workspaceResults.length > 0 ? (
                  <div className={recordResults.length > 0 ? "mt-2 border-t border-slate-100 pt-2" : ""}>
                    <p className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                      Workspaces
                    </p>
                    {workspaceResults.map((module) => (
                      <Link
                        key={module.href}
                        href={module.href}
                        onClick={() => setSearchOpen(false)}
                        className="block rounded-xl px-3 py-2.5 hover:bg-slate-50"
                      >
                        <p className="text-sm font-black text-slate-900">
                          {module.title}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {module.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : null}

                {!searching && !hasSearchResults ? (
                  <p className="px-3 py-5 text-center text-sm text-slate-500">
                    No matching records or workspaces.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/app/notifications"
              className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
              aria-label="Open notifications"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {(actionCounts["/app/notifications"] ?? 0) > 0 ? (
                <span
                  className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm"
                  aria-label={`${actionCounts["/app/notifications"] ?? 0} unread notifications`}
                >
                  {(actionCounts["/app/notifications"] ?? 0) > 99
                    ? "99+"
                    : actionCounts["/app/notifications"]}
                </span>
              ) : null}
            </Link>
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

function SidebarContent({
  pathname,
  user,
  actionCounts,
}: {
  pathname: string;
  user: AppShellProps["user"];
  actionCounts: Record<string, number>;
}) {
  const isPlatformOperator = user.roles.some((role) =>
    role.startsWith("PLATFORM_"),
  );

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
        {!isPlatformOperator &&
        ["SUPPLIER", "BUYER_SUPPLIER"].includes(
          user.commercialPersona,
        ) ? (
          <Link
            href="/app/marketplace/seller-profile"
            aria-label={`Open seller profile for ${user.tenantName}`}
            title="Open seller profile"
            className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-cyan-300/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300 transition group-hover:bg-cyan-300/20">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">
                {user.tenantName}
              </span>
              <span className="block text-xs text-slate-400">
                {commercialPersonaLabel(user.commercialPersona)} tenant
              </span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-wide text-cyan-300">
                Open seller profile
              </span>
            </span>
            <span className="text-lg font-black text-cyan-300 transition group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        ) : (
          <Link
            href="/app/settings/organization"
            aria-label={`Open organization settings for ${user.tenantName}`}
            title="Open organization settings"
            className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">
                {user.tenantName}
              </span>
              <span className="block text-xs text-slate-500">
                {commercialPersonaLabel(user.commercialPersona)} tenant
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Workspace</p>
        <div className="space-y-1">
          {navigation
            .filter((item) => {
              const sellerOnly =
                "sellerOnly" in item &&
                item.sellerOnly === true;

              if (sellerOnly) {
                return (
                  !isPlatformOperator &&
                  ["SUPPLIER", "BUYER_SUPPLIER"].includes(
                    user.commercialPersona,
                  )
                );
              }

              return (
                isPlatformOperator ||
                isHrefAllowedForCommercialPersona(
                  item.href,
                  user.commercialPersona,
                )
              );
            })
            .filter((item) =>
              item.roles.length === 0 ||
              item.roles.some((role) => user.roles.includes(role)),
            )
            .map(({ href, label, icon: Icon }) => {
            const active = href === "/app" ? pathname === href : pathname.startsWith(href);
            const actionCount = actionCounts[href] ?? 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <ActionBadge count={actionCount} active={active} />
              </Link>
            );
          })}
        </div>
        <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Organization</p>
        {user.roles.some((role) => ["PLATFORM_SUPER_ADMIN", "TENANT_OWNER", "TENANT_ADMIN"].includes(role)) ? (
          <>
            {user.roles.includes("PLATFORM_SUPER_ADMIN") ? (
              <Link
                href="/app/platform/supplier-verification"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  pathname.startsWith("/app/platform/supplier-verification")
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FileCheck2 className="h-4 w-4" />
                <span className="min-w-0 flex-1 truncate">
                  Supplier verification
                </span>
                <ActionBadge
                  count={
                    actionCounts["/app/platform/supplier-verification"] ?? 0
                  }
                  active={pathname.startsWith(
                    "/app/platform/supplier-verification",
                  )}
                />
              </Link>
            ) : null}
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

function ActionBadge({
  count,
  active = false,
}: {
  count: number;
  active?: boolean;
}) {
  if (count <= 0) {
    return null;
  }

  const label = `${count} item${count === 1 ? "" : "s"} requiring action`;

  return (
    <span
      aria-label={label}
      title={label}
      className={`ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
        active
          ? "bg-white text-blue-700"
          : "bg-rose-500 text-white shadow-sm shadow-rose-950/30"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

