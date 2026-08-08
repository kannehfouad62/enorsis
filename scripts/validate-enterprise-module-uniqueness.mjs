#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

const source = fs.readFileSync(file, "utf8");

const modules = [
  ...source.matchAll(
    /title:\s*"([^"]+)"[\s\S]*?href:\s*"([^"]+)"/g,
  ),
].map((match) => ({
  title: match[1],
  href: match[2],
}));

const byHref = new Map();

for (const module of modules) {
  const existing = byHref.get(module.href) ?? [];
  existing.push(module.title);
  byHref.set(module.href, existing);
}

const duplicates = [...byHref.entries()].filter(
  ([, titles]) => titles.length > 1,
);

if (duplicates.length > 0) {
  console.error("Duplicate Enterprise Module hrefs detected:");

  for (const [href, titles] of duplicates) {
    console.error(`  ${href}: ${titles.join(", ")}`);
  }

  process.exit(1);
}

console.log(
  `Enterprise Module uniqueness passed (${modules.length} unique module hrefs).`,
);
