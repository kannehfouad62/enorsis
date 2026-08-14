#!/usr/bin/env node
import fs from "node:fs";

const page = fs.readFileSync(
  "src/app/app/marketplace/catalog/page.tsx",
  "utf8",
);
const actions = fs.readFileSync(
  "src/modules/marketplace-catalog/actions.ts",
  "utf8",
);

const failures = [];

if (
  page.includes(
    'formAction={setMarketplaceOfferingPrimaryImageAction} name="mediaId"',
  )
) {
  failures.push(
    "Make-primary button still uses name/value with a function formAction.",
  );
}

if (
  page.includes(
    'formAction={deleteMarketplaceOfferingImageAction} name="mediaId"',
  )
) {
  failures.push(
    "Remove-image button still uses name/value with a function formAction.",
  );
}

if (
  !page.includes(
    "setMarketplaceOfferingPrimaryImageAction.bind",
  )
) {
  failures.push(
    "Make-primary action is not bound to the media ID.",
  );
}

if (
  !page.includes(
    "deleteMarketplaceOfferingImageAction.bind",
  )
) {
  failures.push(
    "Delete action is not bound to the media ID.",
  );
}

if (
  !actions.includes(
    "setMarketplaceOfferingPrimaryImageAction(\n  mediaId: string,",
  )
) {
  failures.push(
    "Make-primary Server Action does not accept a bound media ID.",
  );
}

if (
  !actions.includes(
    "deleteMarketplaceOfferingImageAction(\n  mediaId: string,",
  )
) {
  failures.push(
    "Delete Server Action does not accept a bound media ID.",
  );
}

if (failures.length) {
  console.error("B13.10.17a validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.17a marketplace media Server Action button validation passed.",
);
