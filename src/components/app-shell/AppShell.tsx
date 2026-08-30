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
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { enterpriseModules } from "@/modules/navigation/enterprise-modules";
import {
  commercialPersonaLabel,
  isHrefAllowedForCommercialPersona,
  type TenantCommercialPersonaValue,
} from "@/core/tenancy/commercial-persona";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "./SignOutButton";

const navigationTranslationKeys: Record<string, string> = {
  "Platform": "platform",
  "Platform command center": "platformCommandCenter",
  "Tenant context": "tenantContext",
  "Tenant administration": "tenantAdministration",
  "Supplier verification": "supplierVerification",
  "Licensing & entitlements": "licensingEntitlements",
  "Integration readiness": "integrationReadiness",
  "Platform activity & audit": "platformActivityAudit",
  "Active tenant workspace": "activeTenantWorkspace",
  "Home": "home",
  "Command center": "commandCenter",
  "Supplier command center": "supplierCommandCenter",
  "My work": "myWork",
  "Notifications": "notifications",
  "Buy": "buy",
  "Guided buying": "guidedBuying",
  "Purchase requests": "purchaseRequests",
  "Strategic sourcing": "strategicSourcing",
  "Procure to pay": "procureToPay",
  "Suppliers": "suppliers",
  "Supplier directory": "supplierDirectory",
  "Supplier discovery": "supplierDiscovery",
  "Qualification & onboarding": "qualificationOnboarding",
  "Compliance & risk": "complianceRisk",
  "Supplier performance": "supplierPerformance",
  "Finance": "finance",
  "Supplier invoices": "supplierInvoices",
  "Payment readiness": "paymentReadiness",
  "Payment operations": "paymentOperations",
  "External settlements": "externalSettlements",
  "Reconciliation": "reconciliation",
  "Operations": "operations",
  "Warehouse & receiving": "warehouseReceiving",
  "Logistics & freight": "logisticsFreight",
  "Inventory & materials": "inventoryMaterials",
  "Contracts": "contracts",
  "Intelligence": "intelligence",
  "Analytics command center": "analyticsCommandCenter",
  "Spend intelligence": "spendIntelligence",
  "AI workspace": "aiWorkspace",
  "Risk & governance": "riskGovernance",
  "Seller profile": "sellerProfile",
  "Company profile": "companyProfile",
  "Products & services": "productsServices",
  "Qualifications": "qualifications",
  "Certifications & documents": "certificationsDocuments",
  "Orders & fulfillment": "ordersFulfillment",
  "Buyer orders": "buyerOrders",
  "Shipments & delivery": "shipmentsDelivery",
  "Returns & claims": "returnsClaims",
  "Payment confirmations": "paymentConfirmations",
  "Buyer collaboration": "buyerCollaboration",
  "Supplier portal": "supplierPortal",
  "Messages & activity": "messagesActivity",
  "Buyer requests & tasks": "buyerRequestsTasks",
  "Performance & compliance": "performanceCompliance",
  "ESG & sustainability": "esgSustainability"
};

type SidebarNavItem = {
  href: string;
  label: string;
  icon: typeof Gauge;
  roles: string[];
  personas?: TenantCommercialPersonaValue[];
  platformOnly?: boolean;
};

type SidebarNavGroup = {
  label: string;
  items: SidebarNavItem[];
};

const platformNavigation: SidebarNavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        href: "/app",
        label: "Platform command center",
        icon: Gauge,
        roles: [],
        platformOnly: true,
      },
      {
        href: "/app/platform/tenant-context",
        label: "Tenant context",
        icon: Building2,
        roles: ["PLATFORM_SUPER_ADMIN"],
        platformOnly: true,
      },
      {
        href: "/app/settings/tenants",
        label: "Tenant administration",
        icon: Building2,
        roles: ["PLATFORM_SUPER_ADMIN"],
        platformOnly: true,
      },
      {
        href: "/app/platform/supplier-verification",
        label: "Supplier verification",
        icon: FileCheck2,
        roles: ["PLATFORM_SUPER_ADMIN"],
        platformOnly: true,
      },
      {
        href: "/app/settings/licensing",
        label: "Licensing & entitlements",
        icon: ShieldCheck,
        roles: ["PLATFORM_SUPER_ADMIN"],
        platformOnly: true,
      },
      {
        href: "/app/settings/integration-hub/readiness",
        label: "Integration readiness",
        icon: Network,
        roles: ["PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"],
        platformOnly: true,
      },
      {
        href: "/app/activity-log",
        label: "Platform activity & audit",
        icon: ShieldCheck,
        roles: ["PLATFORM_SUPER_ADMIN", "PLATFORM_AUDITOR"],
        platformOnly: true,
      },
    ],
  },
];

const buyerNavigation: SidebarNavGroup[] = [
  {
    label: "Home",
    items: [
      { href: "/app", label: "Command center", icon: Gauge, roles: [] },
      { href: "/app/workflows", label: "My work", icon: FileCheck2, roles: [] },
      { href: "/app/notifications", label: "Notifications", icon: Bell, roles: [] },
    ],
  },
  {
    label: "Buy",
    items: [
      {
        href: "/app/buying",
        label: "Guided buying",
        icon: Store,
        roles: ["REQUESTER", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/requests",
        label: "Purchase requests",
        icon: Boxes,
        roles: ["REQUESTER", "BUYER", "PROCUREMENT_MANAGER", "APPROVER", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/sourcing",
        label: "Strategic sourcing",
        icon: Network,
        roles: ["BUYER", "PROCUREMENT_MANAGER", "PROCUREMENT_EXECUTIVE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/requisition-to-order",
        label: "Procure to pay",
        icon: FileCheck2,
        roles: ["BUYER", "PROCUREMENT_MANAGER", "PROCUREMENT_EXECUTIVE", "FINANCE", "ACCOUNTS_PAYABLE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
    ],
  },
  {
    label: "Suppliers",
    items: [
      {
        href: "/app/suppliers",
        label: "Supplier directory",
        icon: UsersRound,
        roles: ["SUPPLIER_MANAGER", "BUYER", "PROCUREMENT_MANAGER", "RISK_COMPLIANCE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/marketplace/suppliers",
        label: "Supplier discovery",
        icon: Store,
        roles: ["BUYER", "PROCUREMENT_MANAGER", "SUPPLIER_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/suppliers/qualification",
        label: "Qualification & onboarding",
        icon: FileCheck2,
        roles: ["BUYER", "PROCUREMENT_MANAGER", "SUPPLIER_MANAGER", "RISK_COMPLIANCE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/suppliers/compliance",
        label: "Compliance & risk",
        icon: ShieldCheck,
        roles: ["SUPPLIER_MANAGER", "RISK_COMPLIANCE", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/suppliers/performance",
        label: "Supplier performance",
        icon: Gauge,
        roles: ["SUPPLIER_MANAGER", "PROCUREMENT_MANAGER", "PROCUREMENT_EXECUTIVE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        href: "/app/purchasing/invoices",
        label: "Supplier invoices",
        icon: CircleDollarSign,
        roles: ["BUYER", "PROCUREMENT_MANAGER", "FINANCE", "ACCOUNTS_PAYABLE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/requisition-to-order/payment-readiness",
        label: "Payment readiness",
        icon: FileCheck2,
        roles: ["FINANCE", "ACCOUNTS_PAYABLE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/requisition-to-order/payments",
        label: "Payment operations",
        icon: CircleDollarSign,
        roles: ["FINANCE", "ACCOUNTS_PAYABLE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/requisition-to-order/settlements/external",
        label: "External settlements",
        icon: CircleDollarSign,
        roles: ["FINANCE", "ACCOUNTS_PAYABLE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/requisition-to-order/reconciliation",
        label: "Reconciliation",
        icon: FileCheck2,
        roles: ["FINANCE", "ACCOUNTS_PAYABLE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/app/warehouse-operations",
        label: "Warehouse & receiving",
        icon: Boxes,
        roles: ["WAREHOUSE_OPERATOR", "LOGISTICS_MONITOR", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/logistics",
        label: "Logistics & freight",
        icon: Globe2,
        roles: ["LOGISTICS_MONITOR", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/inventory",
        label: "Inventory & materials",
        icon: Boxes,
        roles: ["WAREHOUSE_OPERATOR", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/contracts",
        label: "Contracts",
        icon: FileCheck2,
        roles: ["LEGAL", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"],
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        href: "/app/analytics",
        label: "Analytics command center",
        icon: Sparkles,
        roles: ["PROCUREMENT_EXECUTIVE", "PROCUREMENT_MANAGER", "FINANCE", "RISK_COMPLIANCE", "TENANT_ADMIN", "TENANT_OWNER", "VIEWER"],
      },
      {
        href: "/app/analytics/spend",
        label: "Spend intelligence",
        icon: CircleDollarSign,
        roles: ["FINANCE", "PROCUREMENT_EXECUTIVE", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER", "VIEWER"],
      },
      {
        href: "/app/ai/workspace",
        label: "AI workspace",
        icon: Bot,
        roles: ["PROCUREMENT_EXECUTIVE", "PROCUREMENT_MANAGER", "RISK_COMPLIANCE", "TENANT_ADMIN", "TENANT_OWNER"],
      },
      {
        href: "/app/resilience",
        label: "Risk & governance",
        icon: ShieldCheck,
        roles: ["RISK_COMPLIANCE", "AUDITOR", "TENANT_ADMIN", "TENANT_OWNER"],
      },
    ],
  },
];

const supplierNavigation: SidebarNavGroup[] = [
  {
    label: "Home",
    items: [
      { href: "/app", label: "Supplier command center", icon: Gauge, roles: [] },
      { href: "/app/notifications", label: "Notifications", icon: Bell, roles: [] },
    ],
  },
  {
    label: "Seller profile",
    items: [
      {
        href: "/app/marketplace/seller-profile",
        label: "Company profile",
        icon: Building2,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
      },
      {
        href: "/app/marketplace/catalog",
        label: "Products & services",
        icon: Store,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
      },
      {
        href: "/app/supplier-portal/qualification",
        label: "Qualifications",
        icon: FileCheck2,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
      },
      {
        href: "/app/supplier-portal/documents",
        label: "Certifications & documents",
        icon: FileCheck2,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
      },
    ],
  },
  {
    label: "Orders & fulfillment",
    items: [
      {
        href: "/app/marketplace/orders",
        label: "Buyer orders",
        icon: Store,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
      },
      {
        href: "/app/logistics",
        label: "Shipments & delivery",
        icon: Globe2,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER", "LOGISTICS_MONITOR"],
      },
      {
        href: "/app/claims",
        label: "Returns & claims",
        icon: Boxes,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        href: "/app/marketplace/invoices",
        label: "Supplier invoices",
        icon: CircleDollarSign,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER", "FINANCE"],
      },
      {
        href: "/app/requisition-to-order/settlements/external",
        label: "Payment confirmations",
        icon: CircleDollarSign,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER", "FINANCE"],
      },
    ],
  },
  {
    label: "Buyer collaboration",
    items: [
      {
        href: "/app/supplier-portal",
        label: "Supplier portal",
        icon: UsersRound,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
      },
      {
        href: "/app/supplier-portal/collaboration",
        label: "Messages & activity",
        icon: Bell,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
      },
      {
        href: "/app/supplier-portal/collaboration/requests",
        label: "Buyer requests & tasks",
        icon: FileCheck2,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
      },
    ],
  },
  {
    label: "Performance & compliance",
    items: [
      {
        href: "/app/sustainability",
        label: "ESG & sustainability",
        icon: ShieldCheck,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER", "RISK_COMPLIANCE"],
      },
      {
        href: "/app/contracts",
        label: "Contracts",
        icon: FileCheck2,
        roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER", "LEGAL"],
      },
    ],
  },
];

function visibleGroupsForUser(
  user: AppShellProps["user"],
  isPlatformOperator: boolean,
) {
  if (isPlatformOperator) {
    return [
      ...platformNavigation,
      {
        label: "Active tenant workspace",
        items:
          user.commercialPersona === "SUPPLIER"
            ? supplierNavigation.flatMap((group) => group.items)
            : user.commercialPersona === "BUYER_SUPPLIER"
              ? [
                  ...buyerNavigation.flatMap((group) => group.items),
                  ...supplierNavigation.flatMap((group) => group.items),
                ]
              : buyerNavigation.flatMap((group) => group.items),
      },
    ];
  }

  if (user.commercialPersona === "SUPPLIER") {
    return supplierNavigation;
  }

  if (user.commercialPersona === "BUYER_SUPPLIER") {
    return [
      ...buyerNavigation.map((group) => ({
        ...group,
        label: `Buying · ${group.label}`,
      })),
      ...supplierNavigation.map((group) => ({
        ...group,
        label: `Selling · ${group.label}`,
      })),
    ];
  }

  return buyerNavigation;
}


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
  const tShell = useTranslations("shell");
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
      const target = event.target as Node;

      if (
        searchRef.current &&
        !searchRef.current.contains(target)
      ) {
        setSearchOpen(false);
      }

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
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
            aria-label={tShell("closeNavigation")}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(88vw,20rem)] flex-col bg-slate-950 text-white shadow-2xl">
            <button
              aria-label={tShell("closeNavigation")}
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
            aria-label={tShell("openNavigation")}
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
              aria-label={tShell("searchEnorsis")}
              value={query}
              onChange={(event) => {
                const nextQuery =
                  event.target.value;

                setQuery(nextQuery);
                setSearchOpen(true);

                if (
                  nextQuery.trim().length < 2
                ) {
                  setRecordResults([]);
                  setSearching(false);
                }
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
              placeholder={tShell("searchPlaceholder")}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />

            {searchOpen && query.trim().length >= 2 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[32rem] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                {searching ? (
                  <p className="px-3 py-3 text-xs font-semibold text-slate-500">
                    {tShell("searching")}
                  </p>
                ) : null}

                {recordResults.length > 0 ? (
                  <div>
                    <p className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                      {tShell("records")}
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
                      {tShell("workspaces")}
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
                    {tShell("noResults")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/app/notifications"
              className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
              aria-label={tShell("openNotifications")}
              title={tShell("notifications")}
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
              aria-label={tShell("settings")}
            >
              <Settings2 className="h-5 w-5" />
            </Link>
            <div
              ref={userMenuRef}
              className="relative"
            >
              <button
                type="button"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={tShell("openUserMenu")}
                onClick={() =>
                  setUserMenuOpen((open) => !open)
                }
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm transition hover:border-blue-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-black text-white">
                  {(user.name ?? user.email ?? "E")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-32 truncate text-sm font-bold">
                    {user.name ?? tShell("administrator")}
                  </span>
                  <span className="block max-w-32 truncate text-xs text-slate-500">
                    {user.roles[0]?.replaceAll("_", " ")}
                  </span>
                </span>
                <ChevronDown
                  className={`hidden h-4 w-4 text-slate-400 transition sm:block ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                >
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-base font-black text-white">
                        {(user.name ?? user.email ?? "E")
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {user.name ?? tShell("administrator")}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {user.email ?? tShell("noEmail")}
                        </p>
                        <p className="mt-2 text-xs font-bold text-blue-700">
                          {user.tenantName}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {user.roles.slice(0, 5).map((role) => (
                        <span
                          key={role}
                          className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600"
                        >
                          {role.replaceAll("_", " ")}
                        </span>
                      ))}
                      {user.roles.length > 5 ? (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500">
                          +{user.roles.length - 5}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    <Link
                      href="/app/settings/security"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <UserRound className="h-4 w-4 text-slate-500" />
                      {tShell("myAccount")}
                    </Link>

                    <Link
                      href="/app/settings/organization"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Building2 className="h-4 w-4 text-slate-500" />
                      {tShell("organizationSettings")}
                    </Link>

                    <Link
                      href="/app/notifications"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Bell className="h-4 w-4 text-slate-500" />
                      Notifications
                    </Link>

                    <div className="my-1 border-t border-slate-100" />

                    <SignOutButton
                      variant="menu"
                      onBeforeSignOut={() =>
                        setUserMenuOpen(false)
                      }
                    />
                  </div>
                </div>
              ) : null}
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
  const tNav = useTranslations("navigation");
  const tShell = useTranslations("shell");

  const translateNavigationLabel = (label: string) => {
    if (label.startsWith("Buying · ")) {
      const base = label.slice("Buying · ".length);
      const key = navigationTranslationKeys[base];
      return `${tNav("buying")} · ${key ? tNav(key) : base}`;
    }
    if (label.startsWith("Selling · ")) {
      const base = label.slice("Selling · ".length);
      const key = navigationTranslationKeys[base];
      return `${tNav("selling")} · ${key ? tNav(key) : base}`;
    }
    const key = navigationTranslationKeys[label];
    return key ? tNav(key) : label;
  };

  const isPlatformOperator = user.roles.some((role) =>
    role.startsWith("PLATFORM_"),
  );

  return (
    <>
      <div className="flex h-20 items-center border-b border-white/10 px-6">
        <Link
          href="/app"
          aria-label="Enorsis command center"
          className="flex items-center gap-3"
        >
          <Logo theme="dark" size="sm" />
          <span className="sr-only">Enorsis</span>
        </Link>
      </div>

      <div className="px-4 py-4">
        {!isPlatformOperator &&
        ["SUPPLIER", "BUYER_SUPPLIER"].includes(
          user.commercialPersona,
        ) ? (
          <Link
            href="/app/marketplace/seller-profile"
            aria-label={`${tShell("openSellerProfile")} · ${user.tenantName}`}
            title={tShell("openSellerProfile")}
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
                {commercialPersonaLabel(user.commercialPersona)} {tShell("tenant")}
              </span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-wide text-cyan-300">
                {tShell("openSellerProfile")}
              </span>
            </span>
            <span className="text-lg font-black text-cyan-300 transition group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        ) : (
          <Link
            href="/app/settings/organization"
            aria-label={`${tShell("openOrganizationSettings")} · ${user.tenantName}`}
            title={tShell("openOrganizationSettings")}
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
                {commercialPersonaLabel(user.commercialPersona)} {tShell("tenant")}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-6">
          {visibleGroupsForUser(user, isPlatformOperator).map((group) => {
            const visibleItems = group.items
              .filter((item) => {
                if (
                  item.platformOnly &&
                  !isPlatformOperator
                ) {
                  return false;
                }

                if (
                  item.personas &&
                  !item.personas.includes(
                    user.commercialPersona,
                  )
                ) {
                  return false;
                }

                if (
                  !isPlatformOperator &&
                  !isHrefAllowedForCommercialPersona(
                    item.href,
                    user.commercialPersona,
                  )
                ) {
                  return false;
                }

                return (
                  item.roles.length === 0 ||
                  item.roles.some((role) =>
                    user.roles.includes(role),
                  ) ||
                  isPlatformOperator
                );
              })
              .filter(
                (item, index, items) =>
                  items.findIndex(
                    (candidate) =>
                      candidate.href === item.href,
                  ) === index,
              );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div key={group.label}>
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">
                  {translateNavigationLabel(group.label)}
                </p>

                <div className="space-y-1">
                  {visibleItems.map(
                    ({ href, label, icon: Icon }) => {
                      const active =
                        href === "/app"
                          ? pathname === href
                          : pathname.startsWith(href);
                      const actionCount =
                        actionCounts[href] ?? 0;

                      return (
                        <Link
                          key={`${group.label}:${href}`}
                          href={href}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                            active
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                              : "text-slate-400 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="min-w-0 flex-1 truncate">
                            {translateNavigationLabel(label)}
                          </span>
                          <ActionBadge
                            count={actionCount}
                            active={active}
                          />
                        </Link>
                      );
                    },
                  )}
                </div>
              </div>
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

