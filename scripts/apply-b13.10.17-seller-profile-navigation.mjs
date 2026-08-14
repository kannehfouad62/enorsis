#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);

  if (after === before) {
    console.log(`No change required: ${path}`);
    return;
  }

  fs.writeFileSync(path, after);
  console.log(`Updated: ${path}`);
}

// ---------------------------------------------------------
// 1. App Shell:
//    - logged-in tenant identity block becomes clickable
//    - Seller Profile appears in sidebar workspace navigation
// ---------------------------------------------------------
patch("src/components/app-shell/AppShell.tsx", (source) => {
  // Add Storefront/UserRound icon if needed.
  if (!source.includes("Store,")) {
    source = source.replace(
      `  Sparkles,
  UsersRound,`,
      `  Sparkles,
  Store,
  UsersRound,`,
    );
  }

  const navigationAnchor = `const navigation = [
  { href: "/app", label: "Command center", icon: Gauge, roles: [] },`;

  if (
    source.includes(navigationAnchor) &&
    !source.includes('href: "/app/marketplace/seller-profile"')
  ) {
    source = source.replace(
      navigationAnchor,
      `const navigation = [
  { href: "/app", label: "Command center", icon: Gauge, roles: [] },
  {
    href: "/app/marketplace/seller-profile",
    label: "Seller profile",
    icon: Store,
    roles: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"],
    sellerOnly: true,
  },`,
    );
  }

  // Support optional sellerOnly nav metadata.
  source = source.replace(
    `                isPlatformOperator ||
                isHrefAllowedForCommercialPersona(
                  item.href,
                  user.commercialPersona,
                ),`,
    `                isPlatformOperator ||
                (
                  (!("sellerOnly" in item) ||
                    !item.sellerOnly ||
                    ["SUPPLIER", "BUYER_SUPPLIER"].includes(
                      user.commercialPersona,
                    )) &&
                  isHrefAllowedForCommercialPersona(
                    item.href,
                    user.commercialPersona,
                  )
                ),`,
  );

  const tenantButton = `        <button className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{user.tenantName}</span>
            <span className="block text-xs text-slate-500">
              {commercialPersonaLabel(user.commercialPersona)} tenant
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>`;

  const tenantLink = `        {["SUPPLIER", "BUYER_SUPPLIER"].includes(
          user.commercialPersona,
        ) ? (
          <Link
            href="/app/marketplace/seller-profile"
            aria-label={\`Open seller profile for \${user.tenantName}\`}
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
            aria-label={\`Open organization settings for \${user.tenantName}\`}
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
        )}`;

  if (source.includes(tenantButton)) {
    source = source.replace(
      tenantButton,
      tenantLink,
    );
  }

  return source;
});

// ---------------------------------------------------------
// 2. Supplier Command Center:
//    add Seller Business Profile as an explicit workspace
// ---------------------------------------------------------
patch(
  "src/components/command-center/SupplierCommandCenter.tsx",
  (source) => {
    if (!source.includes("Building2,")) {
      source = source.replace(
        `  BadgeCheck,
  Boxes,`,
        `  BadgeCheck,
  Building2,
  Boxes,`,
      );
    }

    const workspacesAnchor = `const workspaces = [
  {
    title: "Product & Service Catalog",`;

    if (
      source.includes(workspacesAnchor) &&
      !source.includes(
        'title: "Seller Business Profile"',
      )
    ) {
      source = source.replace(
        workspacesAnchor,
        `const workspaces = [
  {
    title: "Seller Business Profile",
    description:
      "Manage your marketplace business identity, logo, trading name, website, contact information and categories.",
    href: "/app/marketplace/seller-profile",
    icon: Building2,
  },
  {
    title: "Product & Service Catalog",`,
      );
    }

    return source;
  },
);

console.log(
  "B13.10.17 seller profile sidebar and command-center navigation integration complete.",
);
