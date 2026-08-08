#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

const marker = `  {
    title: "Spend Intelligence",`;

const entry = `  {
    title: "Predictive Procurement Forecasting",
    description:
      "Forecast spend direction, demand shifts and supplier risk using explainable procurement evidence.",
    href: "/app/analytics/predictive-procurement",
    icon: ChartSpline,
    group: "Intelligence",
  },

`;

if (source.includes('href: "/app/analytics/predictive-procurement"')) {
  console.log("Predictive Procurement Forecasting already registered.");
  process.exit(0);
}

if (!source.includes(marker)) {
  throw new Error(
    "Could not locate Spend Intelligence module anchor.",
  );
}

source = source.replace(marker, `${entry}${marker}`);
fs.writeFileSync(file, source);
console.log("Registered Predictive Procurement Forecasting under Intelligence.");
