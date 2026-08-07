import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";

const definitions = [
  {
    definitionKey: "board.ceo",
    name: "CEO Executive Board Pack",
    description:
      "Enterprise performance, strategic risks, opportunities and governed executive intelligence.",
    packType: "CEO" as const,
    defaultPeriodType: "MONTHLY" as const,
    sections: [
      "Executive Summary",
      "Enterprise Health",
      "Strategic Risks",
      "Strategic Opportunities",
      "Governed AI Synthesis",
      "Human Governance Decisions",
      "Priority Actions",
    ],
  },
  {
    definitionKey: "board.cfo",
    name: "CFO Executive Board Pack",
    description:
      "Working capital, inventory value, savings realization, invoice exposure and financial procurement signals.",
    packType: "CFO" as const,
    defaultPeriodType: "MONTHLY" as const,
    sections: [
      "Executive Summary",
      "Financial Procurement KPIs",
      "Working Capital",
      "Inventory Value",
      "Savings Realization",
      "Invoice and Match Exposure",
      "Governed AI Synthesis",
    ],
  },
  {
    definitionKey: "board.coo",
    name: "COO Executive Board Pack",
    description:
      "Warehouse, inventory, fulfillment and operational-risk executive reporting.",
    packType: "COO" as const,
    defaultPeriodType: "MONTHLY" as const,
    sections: [
      "Executive Summary",
      "Warehouse Health",
      "Inventory Health",
      "Fulfillment Performance",
      "Operational Risks",
      "Cross-Domain Insights",
      "Priority Actions",
    ],
  },
  {
    definitionKey: "board.cpo",
    name: "CPO Executive Board Pack",
    description:
      "Procurement performance, suppliers, contracts, savings and sourcing-governance reporting.",
    packType: "CPO" as const,
    defaultPeriodType: "MONTHLY" as const,
    sections: [
      "Executive Summary",
      "Procurement Health",
      "Supplier Concentration",
      "Contract Coverage",
      "Savings",
      "Approval Performance",
      "Governed AI Intelligence",
    ],
  },
  {
    definitionKey: "board.cro",
    name: "CRO Executive Board Pack",
    description:
      "Enterprise procurement, supplier, inventory and governance risk reporting.",
    packType: "CRO" as const,
    defaultPeriodType: "QUARTERLY" as const,
    sections: [
      "Executive Summary",
      "Critical Risks",
      "Cross-Domain Risks",
      "Governance Exceptions",
      "Human Review Decisions",
      "Escalations",
    ],
  },
  {
    definitionKey: "board.esg",
    name: "ESG Executive Board Pack",
    description:
      "Governed sustainability and procurement ESG reporting foundation.",
    packType: "ESG" as const,
    defaultPeriodType: "QUARTERLY" as const,
    sections: [
      "Executive Summary",
      "Supplier ESG Signals",
      "Sustainable Procurement",
      "Governance",
      "Risk and Opportunity",
    ],
  },
  {
    definitionKey: "board.supply-chain",
    name: "Supply Chain Executive Board Pack",
    description:
      "Supply continuity, inventory, warehouse and supplier-performance executive reporting.",
    packType: "SUPPLY_CHAIN" as const,
    defaultPeriodType: "MONTHLY" as const,
    sections: [
      "Executive Summary",
      "Inventory",
      "Warehouse",
      "Supplier Exposure",
      "Supply Continuity Risks",
      "Cross-Domain Insights",
    ],
  },
  {
    definitionKey: "board.general",
    name: "General Board Pack",
    description:
      "Consolidated enterprise procurement operating-system board report.",
    packType: "GENERAL_BOARD" as const,
    defaultPeriodType: "QUARTERLY" as const,
    sections: [
      "Executive Summary",
      "Enterprise KPI Scorecard",
      "Procurement",
      "Inventory",
      "Warehouse",
      "Risks",
      "Opportunities",
      "AI Synthesis",
      "Human Governance",
      "Priority Actions",
    ],
  },
];

export async function ensureExecutiveBoardPackDefinitions(
  tenantId: string,
) {
  for (const definition of definitions) {
    await prisma.executiveBoardPackDefinition.upsert({
      where: {
        tenantId_definitionKey: {
          tenantId,
          definitionKey: definition.definitionKey,
        },
      },
      create: {
        tenantId,
        definitionKey: definition.definitionKey,
        name: definition.name,
        description: definition.description,
        packType: definition.packType,
        defaultPeriodType: definition.defaultPeriodType,
        includeAiSynthesis: true,
        includeGovernance: true,
        includeKpis: true,
        includeRisks: true,
        includeOpportunities: true,
        sectionConfiguration: toJson({
          sections: definition.sections,
          version: "B2.8.6.1",
        }),
      },
      update: {
        name: definition.name,
        description: definition.description,
        packType: definition.packType,
        defaultPeriodType: definition.defaultPeriodType,
        sectionConfiguration: toJson({
          sections: definition.sections,
          version: "B2.8.6.1",
        }),
        active: true,
      },
    });
  }
}
