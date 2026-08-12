#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const page = fs.readFileSync(
  "src/app/app/settings/tenants/[id]/page.tsx",
  "utf8",
);
const actions = fs.readFileSync(
  "src/modules/platform-tenants/actions.ts",
  "utf8",
);
const schemas = fs.readFileSync(
  "src/modules/platform-tenants/schemas.ts",
  "utf8",
);

if (!page.includes("Save assigned roles")) {
  failures.push("Member role assignment UI is missing.");
}
if (!actions.includes("platform.tenant.member.roles.update")) {
  failures.push("Role updates are not audited.");
}
if (!actions.includes("Assign at least one tenant role before sending")) {
  failures.push("Activation does not enforce pre-assigned roles.");
}
if (!schemas.includes("updatePlatformTenantMemberRolesSchema")) {
  failures.push("Member role validation schema is missing.");
}

if (failures.length) {
  console.error("B13.10.6 validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("B13.10.6 pre-activation tenant role assignment validation passed.");
