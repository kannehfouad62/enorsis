#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const href = "/app/settings/tenants";

if (source.includes(`href: "${href}"`)) {
  console.log("Platform Tenant Administration already registered.");
  process.exit(0);
}

const entry = `  {
    title: "Platform Tenant Administration",
    description:
      "Provision, activate, suspend and govern independent Enorsis customer tenants and their initial tenant-owner memberships.",
    href: "${href}",
    icon: Building2,
    group: "Platform",
  },

`;

const markers = [
  `  {
    title: "Platform Readiness",`,
  `  {
    title: "Module Registry",`,
  `  {
    title: "Organization Configuration",`,
];

const marker = markers.find((candidate) => source.includes(candidate));

if (!marker) {
  const arrayMarker = "export const enterpriseModules: EnterpriseModuleLink[] = [";
  if (!source.includes(arrayMarker)) {
    throw new Error("Could not locate enterpriseModules array.");
  }
  source = source.replace(arrayMarker, `${arrayMarker}\n${entry}`);
} else {
  source = source.replace(marker, `${entry}${marker}`);
}

fs.writeFileSync(file, source);
console.log("Registered Platform Tenant Administration under Platform.");
