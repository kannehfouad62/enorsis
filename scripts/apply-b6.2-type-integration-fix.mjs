#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const accessFile = path.join(
  process.cwd(),
  "src/core/supplier-portal/access.ts",
);

let access = fs.readFileSync(accessFile, "utf8");

const invitationGuard = `  if (!invitation) notFound();

  const supplier = await prisma.supplier.findFirst({`;

const invitationGuardReplacement = `  if (!invitation?.supplierId) notFound();

  const supplierId = invitation.supplierId;

  const supplier = await prisma.supplier.findFirst({`;

if (access.includes(invitationGuard)) {
  access = access.replace(
    invitationGuard,
    invitationGuardReplacement,
  );
}

access = access.replace(
  "      id: invitation.supplierId,\n",
  "      id: supplierId,\n",
);

access = access.replace(
  "      supplierId: invitation.supplierId,\n",
  "      supplierId,\n",
);

fs.writeFileSync(accessFile, access);
console.log("Fixed nullable SupplierPortalInvitation supplier binding.");

const actionsFile = path.join(
  process.cwd(),
  "src/modules/supplier-self-service/actions.ts",
);

let actions = fs.readFileSync(actionsFile, "utf8");

actions = actions.replaceAll(
  '      actorType: "EXTERNAL",',
  '      actorType: "USER",',
);

fs.writeFileSync(actionsFile, actions);
console.log("Aligned supplier self-service audit actor type with existing enum.");
