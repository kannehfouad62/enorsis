#!/usr/bin/env node
import fs from "node:fs";

const path = "prisma/schema.prisma";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("searchText   String")) {
  source = source.replace(
    `  metadata     Json?
  occurredAt   DateTime       @default(now())`,
    `  metadata     Json?
  searchText   String         @default("") @db.Text
  occurredAt   DateTime       @default(now())`,
  );
}

if (
  !source.includes(
    "@@index([tenantId, action, occurredAt])",
  )
) {
  source = source.replace(
    `  @@index([action, occurredAt])
}`,
    `  @@index([action, occurredAt])
  @@index([tenantId, action, occurredAt])
}`,
  );
}

fs.writeFileSync(path, source);
console.log("Added AuditEvent.searchText.");
console.log("Added tenant/action/time audit index.");
console.log("B13.10.12 activity-log schema integration complete.");
