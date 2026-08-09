import { prisma } from "../src/lib/prisma";
import type { Prisma } from "../src/generated/prisma/client";

const policies = [
  {
    key: "procurement.purchase-request.approval-required",
    name: "Purchase Request Approval Required",
    description:
      "Requires purchase requests to pass through an authorized approval workflow before procurement execution.",
    category: "Procurement Governance",
    moduleKey: "requisition-to-order",
    valueType: "BOOLEAN",
    defaultValue: true,
    status: "ACTIVE",
    managedByPlatform: false,
  },
  {
    key: "procurement.purchase-order.release-control",
    name: "Purchase Order Release Control",
    description:
      "Requires purchase orders to be formally released by an authorized procurement role before supplier execution.",
    category: "Procurement Governance",
    moduleKey: "purchasing",
    valueType: "BOOLEAN",
    defaultValue: true,
    status: "ACTIVE",
    managedByPlatform: false,
  },
  {
    key: "supplier.onboarding.qualification-required",
    name: "Supplier Qualification Required",
    description:
      "Requires suppliers to satisfy applicable onboarding and qualification controls before governed procurement activity.",
    category: "Supplier Governance",
    moduleKey: "suppliers",
    valueType: "BOOLEAN",
    defaultValue: true,
    status: "ACTIVE",
    managedByPlatform: false,
  },
  {
    key: "finance.invoice.three-way-match-required",
    name: "Three-Way Match Required",
    description:
      "Requires purchase order, goods receipt, and supplier invoice reconciliation before eligible invoice payment.",
    category: "Financial Controls",
    moduleKey: "procure-to-pay",
    valueType: "BOOLEAN",
    defaultValue: true,
    status: "ACTIVE",
    managedByPlatform: false,
  },
  {
    key: "finance.payment.release-control",
    name: "Payment Release Control",
    description:
      "Requires governed payment-readiness and authorization controls before supplier payment release.",
    category: "Financial Controls",
    moduleKey: "procure-to-pay",
    valueType: "BOOLEAN",
    defaultValue: true,
    status: "ACTIVE",
    managedByPlatform: false,
  },
  {
    key: "supplier.bank-details.change-control",
    name: "Supplier Bank Detail Change Control",
    description:
      "Requires governed authorization for changes to supplier payment and banking information.",
    category: "Supplier Governance",
    moduleKey: "suppliers",
    valueType: "BOOLEAN",
    defaultValue: true,
    status: "ACTIVE",
    managedByPlatform: true,
  },
  {
    key: "ai.autonomous-execution.governed",
    name: "Governed Autonomous AI Execution",
    description:
      "Requires autonomous AI procurement execution to remain subject to Enorsis governance, certification, runtime policy, and human-control safeguards.",
    category: "AI Governance",
    moduleKey: "automation",
    valueType: "BOOLEAN",
    defaultValue: true,
    status: "ACTIVE",
    managedByPlatform: true,
  },
  {
    key: "security.tenant-isolation.enforced",
    name: "Tenant Isolation Enforcement",
    description:
      "Establishes tenant data isolation as a mandatory platform governance requirement.",
    category: "Security Governance",
    moduleKey: "platform",
    valueType: "BOOLEAN",
    defaultValue: true,
    status: "ACTIVE",
    managedByPlatform: true,
  },
] satisfies Prisma.EnterprisePolicyDefinitionCreateInput[];

async function main() {
  console.log("Seeding foundational Enorsis enterprise policies...");

  for (const policy of policies) {
    await prisma.enterprisePolicyDefinition.upsert({
      where: {
        key: policy.key,
      },
      update: {
        name: policy.name,
        description: policy.description,
        category: policy.category,
        moduleKey: policy.moduleKey,
        valueType: policy.valueType,
        defaultValue: policy.defaultValue,
        status: policy.status,
        managedByPlatform: policy.managedByPlatform,
      },
      create: policy,
    });

    console.log(`✓ ${policy.key}`);
  }

  const activeCount = await prisma.enterprisePolicyDefinition.count({
    where: {
      status: "ACTIVE",
    },
  });

  console.log("");
  console.log(
    `Foundational enterprise policy seeding complete. ${activeCount} active policies.`,
  );
}

main().catch((error) => {
  console.error("Failed to seed foundational enterprise policies.");
  console.error(error);
  process.exitCode = 1;
});
