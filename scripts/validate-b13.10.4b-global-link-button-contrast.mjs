#!/usr/bin/env node

import fs from "node:fs";

const globals = fs.readFileSync("src/app/globals.css", "utf8");
const unauthorized = fs.readFileSync(
  "src/app/app/unauthorized/page.tsx",
  "utf8",
);

const failures = [];

if (
  globals.includes(
    "}a{color:inherit;text-decoration:none}button{font:inherit}",
  )
) {
  failures.push(
    "globals.css still contains an unlayered anchor/button reset that can override Tailwind utility colors.",
  );
}

if (
  !globals.includes(
    "@layer base{a{color:inherit;text-decoration:none}button{font:inherit}}",
  ) &&
  !globals.includes("@layer base {")
) {
  failures.push(
    "globals.css does not contain the anchor/button defaults in Tailwind's base layer.",
  );
}

if (!unauthorized.includes("text-white")) {
  failures.push(
    "Unauthorized command-center CTA does not explicitly declare white foreground text.",
  );
}

if (!unauthorized.includes("focus-visible:ring-2")) {
  failures.push(
    "Unauthorized command-center CTA is missing keyboard focus treatment.",
  );
}

if (failures.length) {
  console.error("B13.10.4B UI contrast validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  "B13.10.4B global link/button contrast validation passed.",
);
