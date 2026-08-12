#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");

const core = read(
  "src/core/access-governance/tenant-role-audit.ts",
);
const page = read(
  "src/app/app/settings/tenants/[id]/page.tsx",
);
const actions = read(
  "src/modules/platform-tenants/actions.ts",
);

if (!core.includes("auditTenantAccess")) {
  failures.push("Tenant access audit engine is missing.");
}

if (!core.includes("NO_ROLES")) {
  failures.push("Missing-role audit scenario is absent.");
}

if (!core.includes("PLATFORM_ROLE_IN_TENANT")) {
  failures.push("Platform-role tenant audit scenario is absent.");
}

if (!core.includes("SUPPLIER_PERSONA_BUYER_ROLE")) {
  failures.push("Supplier persona mismatch audit is absent.");
}

if (!core.includes("BUYER_PERSONA_SUPPLIER_ROLE")) {
  failures.push("Buyer persona mismatch audit is absent.");
}

if (!page.includes("User access & role audit")) {
  failures.push("Tenant detail access audit UI is missing.");
}

if (!page.includes("Record access audit")) {
  failures.push("Audit evidence action is missing.");
}

if (
  !actions.includes(
    "platform.tenant.access-role.audit",
  )
) {
  failures.push("Access audit evidence is not written to AuditEvent.");
}

if (failures.length) {
  console.error("B13.10.8 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.8 tenant user access and role audit validation passed.",
);
