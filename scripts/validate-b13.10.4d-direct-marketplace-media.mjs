#!/usr/bin/env node
import fs from "node:fs";

const failures = [];

const required = [
  "src/components/marketplace/MarketplaceDirectImageUpload.tsx",
  "src/app/api/marketplace/catalog/media/upload/route.ts",
  "src/app/api/marketplace/catalog/media/register/route.ts",
];

for (const path of required) {
  if (!fs.existsSync(path)) {
    failures.push(`Missing ${path}`);
  }
}

const actions = fs.readFileSync(
  "src/modules/marketplace-catalog/actions.ts",
  "utf8",
);
const page = fs.readFileSync(
  "src/app/app/marketplace/catalog/page.tsx",
  "utf8",
);
const media = fs.readFileSync(
  "src/modules/marketplace-catalog/media.ts",
  "utf8",
);

if (
  actions.includes(
    'data.getAll("images")',
  )
) {
  failures.push(
    "Marketplace Server Action still reads image files.",
  );
}

if (
  actions.includes(
    "uploadMarketplaceImage",
  )
) {
  failures.push(
    "Marketplace Server Action still performs Blob uploads.",
  );
}

if (
  page.includes(
    'name="images" type="file"',
  )
) {
  failures.push(
    "Marketplace page still submits image files through a form action.",
  );
}

if (
  !page.includes(
    "MarketplaceDirectImageUpload",
  )
) {
  failures.push(
    "Direct marketplace image uploader is not rendered.",
  );
}

if (
  media.includes(
    'put(',
  )
) {
  failures.push(
    "Marketplace media helper still performs server-side put().",
  );
}

if (failures.length) {
  console.error("B13.10.4D validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.4D direct marketplace media upload validation passed.",
);
