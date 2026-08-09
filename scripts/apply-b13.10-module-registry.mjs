#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/modules/registry.ts",
);

let source = fs.readFileSync(file, "utf8");

const href = "/app/settings/tenants";

if (source.includes(`"${href}"`)) {
  console.log("Platform Tenant Administration metadata already present.");
  process.exit(0);
}

const entry = `  "${href}": {
    id: "platform-tenant-administration",
    featureKey: null,
    roles: ["PLATFORM_SUPER_ADMIN"],
    mobile: false,
    api: false,
    reporting: true,
    searchable: true,
    aiEligible: false,
    active: true,
  },
`;

const anchor = "const metadataByHref: Record<string, Partial<RegistryMetadata>> = {";

if (!source.includes(anchor)) {
  throw new Error("Could not locate metadataByHref registry.");
}

source = source.replace(anchor, `${anchor}\n${entry}`);

fs.writeFileSync(file, source);
console.log("Registered Platform Tenant Administration metadata.");
