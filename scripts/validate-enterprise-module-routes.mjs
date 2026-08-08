#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const registryPath = path.join(
  root,
  "src/modules/navigation/enterprise-modules.ts",
);
const appRoot = path.join(root, "src/app");

const source = fs.readFileSync(registryPath, "utf8");

const hrefs = [
  ...source.matchAll(/href:\s*"([^"]+)"/g),
].map((match) => match[1]);

const uniqueHrefs = [...new Set(hrefs)].filter((href) =>
  href.startsWith("/"),
);

function routeHasPage(href) {
  const segments = href.split("/").filter(Boolean);
  return (
    fs.existsSync(path.join(appRoot, ...segments, "page.tsx")) ||
    fs.existsSync(path.join(appRoot, ...segments, "page.jsx"))
  );
}

const missing = uniqueHrefs.filter((href) => !routeHasPage(href));

if (missing.length > 0) {
  console.error("Enterprise module route validation failed.");
  for (const href of missing) {
    console.error(`  missing: ${href}`);
  }
  process.exit(1);
}

console.log(
  `Enterprise module route validation passed (${uniqueHrefs.length} routes).`,
);
