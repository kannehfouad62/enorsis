#!/usr/bin/env node
import fs from "node:fs";

const failures = [];

const newPage =
  "src/app/app/marketplace/catalog/new/page.tsx";

if (!fs.existsSync(newPage)) {
  failures.push("Dedicated Publish Offering page is missing.");
}

const catalog = fs.readFileSync(
  "src/app/app/marketplace/catalog/page.tsx",
  "utf8",
);

const commandCenter = fs.readFileSync(
  "src/components/command-center/SupplierCommandCenter.tsx",
  "utf8",
);

const actions = fs.readFileSync(
  "src/modules/marketplace-catalog/actions.ts",
  "utf8",
);

if (
  catalog.includes(
    "Publish supplier offering",
  )
) {
  failures.push(
    "Embedded Publish Supplier Offering form still exists on catalog page.",
  );
}

if (
  !catalog.includes(
    'href="/app/marketplace/catalog/new"',
  )
) {
  failures.push(
    "Catalog page does not expose Publish Offering CTA.",
  );
}

if (
  !commandCenter.includes(
    'title: "Publish Offering"',
  )
) {
  failures.push(
    "Supplier Command Center does not expose Publish Offering.",
  );
}

if (
  !commandCenter.includes(
    'href: "/app/marketplace/catalog/new"',
  )
) {
  failures.push(
    "Supplier Command Center Publish Offering route is incorrect.",
  );
}

if (
  !actions.includes(
    'redirect("/app/marketplace/catalog?created=1")',
  )
) {
  failures.push(
    "Successful offering creation does not return to catalog.",
  );
}

if (failures.length) {
  console.error("B13.10.4E validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.4E supplier catalog workspace and dedicated publishing flow validation passed.",
);
