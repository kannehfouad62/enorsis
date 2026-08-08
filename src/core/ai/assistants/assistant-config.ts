import type { AiCapability } from "@/generated/prisma/enums";

export type ProcurementAssistantKey =
  | "PROCUREMENT"
  | "SUPPLIER"
  | "INVENTORY"
  | "CONTRACT"
  | "EXECUTIVE";

export type ProcurementAssistantDefinition = {
  key: ProcurementAssistantKey;
  name: string;
  capability: AiCapability;
  description: string;
  evidenceGuidance: string;
  outputGuidance: string[];
  roles: string[];
};

export const procurementAssistants: Record<
  ProcurementAssistantKey,
  ProcurementAssistantDefinition
> = {
  PROCUREMENT: {
    key: "PROCUREMENT",
    name: "Procurement Assistant",
    capability: "PROCUREMENT_COPILOT",
    description:
      "Cross-functional procurement guidance across sourcing, policy, suppliers, contracts and workflow.",
    evidenceGuidance:
      "Prioritize procurement policies, procedures, contract commitments and relevant supplier evidence.",
    outputGuidance: [
      "Direct answer",
      "Procurement implications",
      "Relevant policy, contract or supplier evidence",
      "Risks and exceptions",
      "Recommended next actions",
      "Human approvals required",
    ],
    roles: [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "PROCUREMENT_EXECUTIVE",
      "PROCUREMENT_MANAGER",
      "BUYER",
      "REQUESTER",
      "APPROVER",
      "RISK_COMPLIANCE",
      "LEGAL",
      "FINANCE",
      "AUDITOR",
    ],
  },
  SUPPLIER: {
    key: "SUPPLIER",
    name: "Supplier Assistant",
    capability: "SUPPLIER_ANALYSIS",
    description:
      "Supplier due diligence, performance, risk, evidence and sourcing decision support.",
    evidenceGuidance:
      "Prioritize supplier documents, supplier master data, contract evidence, performance and risk-related knowledge.",
    outputGuidance: [
      "Supplier assessment",
      "Evidence supporting the assessment",
      "Risk and due-diligence gaps",
      "Commercial or operational considerations",
      "Recommended supplier actions",
      "Human decision required",
    ],
    roles: [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "PROCUREMENT_EXECUTIVE",
      "PROCUREMENT_MANAGER",
      "BUYER",
      "SUPPLIER_MANAGER",
      "RISK_COMPLIANCE",
      "AUDITOR",
    ],
  },
  INVENTORY: {
    key: "INVENTORY",
    name: "Inventory Assistant",
    capability: "PROCUREMENT_COPILOT",
    description:
      "Inventory, replenishment, warehouse and procurement planning decision support.",
    evidenceGuidance:
      "Use retrieved company procedures and procurement knowledge, and clearly identify when live inventory metrics are not present in the evidence.",
    outputGuidance: [
      "Inventory or replenishment assessment",
      "Demand and supply considerations",
      "Supplier and procurement dependencies",
      "Operational risks",
      "Recommended planning actions",
      "Human approvals required",
    ],
    roles: [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "PROCUREMENT_EXECUTIVE",
      "PROCUREMENT_MANAGER",
      "BUYER",
      "FINANCE",
      "RISK_COMPLIANCE",
    ],
  },
  CONTRACT: {
    key: "CONTRACT",
    name: "Contract Assistant",
    capability: "CONTRACT_REVIEW",
    description:
      "Contract obligations, commercial terms, renewals, compliance and negotiation support.",
    evidenceGuidance:
      "Prioritize contract documents, contract metadata, policy requirements and supplier evidence.",
    outputGuidance: [
      "Contract answer",
      "Relevant clauses or retrieved evidence",
      "Commercial and procurement implications",
      "Compliance or renewal risks",
      "Recommended follow-up",
      "Legal or human review required",
    ],
    roles: [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "PROCUREMENT_EXECUTIVE",
      "PROCUREMENT_MANAGER",
      "BUYER",
      "LEGAL",
      "RISK_COMPLIANCE",
      "AUDITOR",
    ],
  },
  EXECUTIVE: {
    key: "EXECUTIVE",
    name: "Executive Assistant",
    capability: "EXECUTIVE_BRIEF",
    description:
      "Executive procurement synthesis for value, risk, decisions, dependencies and priorities.",
    evidenceGuidance:
      "Use the strongest retrieved enterprise evidence and distinguish operational detail from executive decision points.",
    outputGuidance: [
      "Executive answer",
      "Decision or issue requiring attention",
      "Value and financial implications",
      "Risk and governance implications",
      "Dependencies and deadlines",
      "Recommended executive action",
    ],
    roles: [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "PROCUREMENT_EXECUTIVE",
      "PROCUREMENT_MANAGER",
      "FINANCE",
      "RISK_COMPLIANCE",
      "AUDITOR",
    ],
  },
};

export function isProcurementAssistantKey(
  value: string,
): value is ProcurementAssistantKey {
  return value in procurementAssistants;
}
