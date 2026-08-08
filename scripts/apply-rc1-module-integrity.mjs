#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/modules/navigation/enterprise-modules.ts",
);

let source = fs.readFileSync(file, "utf8");

function replaceExact(oldText, newText, label) {
  if (source.includes(newText)) {
    console.log(`Already updated: ${label}`);
    return;
  }

  if (!source.includes(oldText)) {
    throw new Error(
      `Could not locate expected Enterprise Modules block: ${label}`,
    );
  }

  source = source.replace(oldText, newText);
  console.log(`Updated: ${label}`);
}

replaceExact(
`  {
    title: "Procure to Pay",
    description: "Manage orders, receipts, invoices and payment operations.",
    href: "/app/procure-to-pay",
    icon: ReceiptText,
    group: "Procurement",
  },`,
`  {
    title: "Procure to Pay",
    description:
      "End-to-end requisition, approval, order, receipt, match and payment readiness.",
    href: "/app/requisition-to-order",
    icon: ReceiptText,
    group: "Procurement",
  },`,
  "Procure to Pay",
);

replaceExact(
`  {
    title: "AI Procurement",
    description: "Governed AI procurement capabilities and execution.",
    href: "/app/ai",
    icon: Bot,
    group: "Intelligence",
  },`,
`  {
    title: "AI Procurement",
    description: "Governed procurement AI capabilities, analysis and human review.",
    href: "/app/agents",
    icon: Bot,
    group: "Intelligence",
  },
  {
    title: "AI Automation Copilot",
    description:
      "Turn automation intent into governed, explainable workflow designs.",
    href: "/app/automation/copilot",
    icon: Bot,
    group: "Intelligence",
  },
  {
    title: "Enterprise Process Mining",
    description:
      "Discover workflow variants, bottlenecks, cycle time and conformance.",
    href: "/app/analytics/process-mining",
    icon: ChartNetwork,
    group: "Intelligence",
  },`,
  "AI and process intelligence",
);

replaceExact(
`  {
    title: "Platform Readiness",
    description: "Release checks, evidence, blockers and certification history.",
    href: "/app/settings/platform-readiness",
    icon: BadgeCheck,
    group: "Platform",
  },`,
`  {
    title: "Platform Readiness",
    description: "Release checks, evidence, blockers and certification history.",
    href: "/app/settings/platform-readiness",
    icon: BadgeCheck,
    group: "Platform",
  },
  {
    title: "Full Enterprise RC1",
    description:
      "Enterprise release-candidate evidence, operational gates and certification readiness.",
    href: "/app/settings/platform-readiness/rc1",
    icon: BadgeCheck,
    group: "Platform",
  },`,
  "Full Enterprise RC1",
);

fs.writeFileSync(file, source);
console.log("Enterprise Modules registry upgrade complete.");
