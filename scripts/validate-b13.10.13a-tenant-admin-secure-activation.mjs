#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");

const service = read(
  "src/core/tenant-user-activation/service.ts",
);
const accessActions = read(
  "src/modules/access/actions.ts",
);
const accessSchemas = read(
  "src/modules/access/schemas.ts",
);
const accessPage = read(
  "src/app/app/settings/access/page.tsx",
);

if (accessActions.includes('from "bcryptjs"')) {
  failures.push(
    "Legacy tenant-admin temporary-password hashing still exists.",
  );
}

if (accessSchemas.includes("temporaryPassword")) {
  failures.push(
    "Invite schema still requires a temporary password.",
  );
}

if (accessPage.includes("Temporary password")) {
  failures.push(
    "Tenant access UI still asks the administrator for a user password.",
  );
}

if (
  !accessActions.includes(
    "issueTenantUserActivationInvitation",
  )
) {
  failures.push(
    "Tenant-admin invite does not issue secure activation.",
  );
}

if (
  !accessActions.includes(
    "resetAndResendMemberActivationAction",
  )
) {
  failures.push(
    "INVITED + credentials recovery action is missing.",
  );
}

if (
  !accessPage.includes("Reset & resend activation")
) {
  failures.push(
    "Legacy inconsistent-account recovery UI is missing.",
  );
}

if (!accessPage.includes("Resend activation")) {
  failures.push(
    "Normal invitation resend UI is missing.",
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
  !service.includes("resetCredentials?: boolean")
) {
  failures.push(
    "Safe credential-reset recovery support is missing.",
  );
}

if (
  !service.includes("passwordResetToken.updateMany")
) {
  failures.push(
    "Old unused activation tokens are not invalidated before resend.",
  );
}

if (failures.length) {
  console.error("B13.10.13a validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.13a incremental tenant-admin secure activation validation passed.",
);
