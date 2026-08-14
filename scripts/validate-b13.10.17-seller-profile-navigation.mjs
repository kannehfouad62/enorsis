#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, "utf8")
    : "";

const shell = read(
  "src/components/app-shell/AppShell.tsx",
);
const commandCenter = read(
  "src/components/command-center/SupplierCommandCenter.tsx",
);
const profile = read(
  "src/app/app/marketplace/seller-profile/page.tsx",
);

if (
  !shell.includes(
    'href="/app/marketplace/seller-profile"',
  )
) {
  failures.push(
    "Sidebar tenant identity block does not link to Seller Profile.",
  );
}

if (
  !shell.includes(
    'label: "Seller profile"',
  )
) {
  failures.push(
    "Seller Profile is not present in sidebar workspace navigation.",
  );
}

if (
  !shell.includes(
    "Open seller profile",
  )
) {
  failures.push(
    "Sidebar tenant identity block lacks a visible seller-profile affordance.",
  );
}

if (
  !commandCenter.includes(
    'title: "Seller Business Profile"',
  )
) {
  failures.push(
    "Supplier Command Center does not include Seller Business Profile.",
  );
}

if (
  !commandCenter.includes(
    'href: "/app/marketplace/seller-profile"',
  )
) {
  failures.push(
    "Supplier Command Center Seller Profile route is missing.",
  );
}

if (
  !profile.includes(
    "Marketplace-facing business information",
  )
) {
  failures.push(
    "Seller Business Profile destination page is missing or incomplete.",
  );
}

if (failures.length) {
  console.error("B13.10.17 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.17 seller profile navigation validation passed.",
);
