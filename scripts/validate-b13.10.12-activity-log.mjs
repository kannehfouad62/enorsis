#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, "utf8")
    : "";

const schema = read("prisma/schema.prisma");
const query = read(
  "src/modules/activity-log/queries.ts",
);
const page = read(
  "src/app/app/activity-log/page.tsx",
);
const registry = read(
  "src/core/modules/registry.ts",
);
const modules = read(
  "src/modules/navigation/enterprise-modules.ts",
);
const requestContext = read(
  "src/core/audit/request-context.ts",
);

if (!schema.includes("searchText")) {
  failures.push("AuditEvent searchable text field is missing.");
}

if (
  !query.includes(
    'roles.includes("PLATFORM_SUPER_ADMIN")',
  )
) {
  failures.push("Platform-wide audit authorization is missing.");
}

if (
  !query.includes(
    'roles.includes("TENANT_ADMIN")',
  )
) {
  failures.push("Tenant-admin audit authorization is missing.");
}

if (
  !query.includes(
    ": session.user.tenantId",
  )
) {
  failures.push("Tenant audit server-side scoping is missing.");
}

if (
  !query.includes(
    "supplierMarketplaceOffering.findMany",
  ) ||
  !query.includes(
    "purchaseRequestLine.findMany",
  )
) {
  failures.push(
    "Product-linked activity research expansion is missing.",
  );
}

if (
  !page.includes("Activity Log") ||
  !page.includes("Search activity")
) {
  failures.push("Activity Log search UI is missing.");
}

if (
  !page.includes("Advanced · IP address")
) {
  failures.push("Super-admin advanced IP display is missing.");
}

if (
  !query.includes(
    "isPlatformSuperAdmin\n      ?",
  )
) {
  failures.push(
    "IP/user-agent fields are not server-gated to platform super admin.",
  );
}

if (
  !requestContext.includes(
    'requestHeaders.get("x-forwarded-for")',
  ) ||
  !requestContext.includes(
    'requestHeaders.get("user-agent")',
  )
) {
  failures.push("Request IP/user-agent capture helper is incomplete.");
}

if (!registry.includes('"/app/activity-log"')) {
  failures.push("Activity Log registry metadata is missing.");
}

if (!modules.includes('href: "/app/activity-log"')) {
  failures.push("Activity Log Enterprise Module is missing.");
}

if (failures.length) {
  console.error("B13.10.12 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.12 governed searchable Activity Log validation passed.",
);
