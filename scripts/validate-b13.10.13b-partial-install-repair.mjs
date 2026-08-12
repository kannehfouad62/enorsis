#!/usr/bin/env node
import fs from "node:fs";

const failures = [];

const schemas = fs.readFileSync(
  "src/modules/access/schemas.ts",
  "utf8",
);
const actions = fs.readFileSync(
  "src/modules/access/actions.ts",
  "utf8",
);
const service = fs.readFileSync(
  "src/core/tenant-user-activation/service.ts",
  "utf8",
);
const page = fs.readFileSync(
  "src/app/app/settings/access/page.tsx",
  "utf8",
);

if (schemas.includes("temporaryPassword")) {
  failures.push(
    "temporaryPassword still exists in access schemas.",
  );
}

if (
  !schemas.includes(
    "export const updateMembershipSchema",
  ) ||
  !schemas.includes("roles: z.array")
) {
  failures.push(
    "Access membership schemas are incomplete.",
  );
}

if (actions.includes('from "bcryptjs"')) {
  failures.push(
    "Legacy bcrypt temporary-password import still exists.",
  );
}

if (
  !actions.includes(
    "issueTenantUserActivationInvitation",
  )
) {
  failures.push(
    "New tenant-user invitation does not issue activation.",
  );
}

if (
  !actions.includes(
    "membership.access_added_existing_user",
  )
) {
  failures.push(
    "Existing credentialed identity handling is missing.",
  );
}

if (
  !actions.includes(
    "resetAndResendMemberActivationAction",
  )
) {
  failures.push(
    "Reset & resend recovery action is missing.",
  );
}

if (
  !service.includes(
    "resetCredentials?: boolean",
  )
) {
  failures.push(
    "Activation service does not support safe recovery reset.",
  );
}

if (
  !service.includes(
    "passwordResetToken.updateMany",
  )
) {
  failures.push(
    "Previous unused tokens are not invalidated.",
  );
}

if (
  !service.includes(
    "tenant.member.activation.email.sent",
  )
) {
  failures.push(
    "Activation email success evidence is missing.",
  );
}

if (
  !service.includes(
    "tenant.member.activation.email.failed",
  )
) {
  failures.push(
    "Activation email failure evidence is missing.",
  );
}

if (
  !service.includes(
    "tenant.member.activation.completed",
  )
) {
  failures.push(
    "Activation completion evidence is missing.",
  );
}

if (
  page.includes("Temporary password")
) {
  failures.push(
    "Tenant access UI still exposes temporary password.",
  );
}

if (
  !page.includes("Reset & resend activation") ||
  !page.includes("Resend activation")
) {
  failures.push(
    "Tenant access activation recovery controls are incomplete.",
  );
}

if (failures.length) {
  console.error(
    "B13.10.13b repair validation failed:",
  );
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.13b partial-install repair validation passed.",
);
