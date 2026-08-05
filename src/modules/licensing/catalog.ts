import { FEATURE_KEYS } from "@/core/licensing";

export const EDITIONS = [
  ["COMMUNITY", "Community", 10],
  ["PROFESSIONAL", "Professional", 20],
  ["ENTERPRISE_SAAS", "Enterprise SaaS", 30],
  ["MANAGED_PAAS", "Managed PaaS", 40],
] as const;

export const FEATURES = [
  [FEATURE_KEYS.CORE_PROCUREMENT, "Core Procurement", "Procurement", false],
  [FEATURE_KEYS.SUPPLIER_MANAGEMENT, "Supplier Management", "Suppliers", false],
  [FEATURE_KEYS.SUPPLIER_PORTAL, "Supplier Portal", "Suppliers", false],
  [FEATURE_KEYS.STRATEGIC_SOURCING, "Strategic Sourcing", "Procurement", false],
  [FEATURE_KEYS.CONTRACT_MANAGEMENT, "Contract Management", "Procurement", false],
  [FEATURE_KEYS.INVENTORY, "Inventory", "Operations", false],
  [FEATURE_KEYS.LOGISTICS, "Logistics", "Operations", false],
  [FEATURE_KEYS.CATEGORY_MANAGEMENT, "Category Management", "Governance", false],
  [FEATURE_KEYS.SUSTAINABLE_PROCUREMENT, "Sustainable Procurement", "Governance", false],
  [FEATURE_KEYS.API_ACCESS, "API Access", "Platform", false],
  [FEATURE_KEYS.SSO, "Enterprise SSO", "Platform", false],
  [FEATURE_KEYS.ERP_CONNECTORS, "ERP Connectors", "Platform", false],
  [FEATURE_KEYS.WORKFLOW_STUDIO, "Workflow Studio", "Platform", false],
  [FEATURE_KEYS.REPORT_BUILDER, "Report Builder", "Platform", false],
  [FEATURE_KEYS.MOBILE, "Mobile Platform", "Platform", false],
  [FEATURE_KEYS.AI_PLATFORM, "AI Platform", "Intelligence", true],
] as const;

export const EDITION_FEATURES: Record<string, readonly string[]> = {
  COMMUNITY: [FEATURE_KEYS.CORE_PROCUREMENT, FEATURE_KEYS.SUPPLIER_MANAGEMENT],
  PROFESSIONAL: [
    FEATURE_KEYS.CORE_PROCUREMENT,
    FEATURE_KEYS.SUPPLIER_MANAGEMENT,
    FEATURE_KEYS.SUPPLIER_PORTAL,
    FEATURE_KEYS.STRATEGIC_SOURCING,
    FEATURE_KEYS.CONTRACT_MANAGEMENT,
    FEATURE_KEYS.INVENTORY,
    FEATURE_KEYS.LOGISTICS,
    FEATURE_KEYS.CATEGORY_MANAGEMENT,
    FEATURE_KEYS.SUSTAINABLE_PROCUREMENT,
    FEATURE_KEYS.MOBILE,
  ],
  ENTERPRISE_SAAS: Object.values(FEATURE_KEYS).filter(
    (key) => key !== FEATURE_KEYS.AI_PLATFORM,
  ),
  MANAGED_PAAS: Object.values(FEATURE_KEYS),
};
