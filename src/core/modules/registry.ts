import {
  enterpriseModuleGroups,
  enterpriseModules,
} from "@/modules/navigation/enterprise-modules";
import { hasAnyRole, type EnorsisRole } from "@/core/auth/authorization";
import {
  FEATURE_KEYS,
  hasFeature,
  type FeatureKey,
} from "@/core/licensing";
import type { ModuleRegistryEntry } from "./types";
import { prisma } from "@/lib/prisma";
import {
  isHrefAllowedForCommercialPersona,
  type TenantCommercialPersonaValue,
} from "@/core/tenancy/commercial-persona";

type RegistryMetadata = Pick<
  ModuleRegistryEntry,
  | "id"
  | "featureKey"
  | "roles"
  | "mobile"
  | "api"
  | "reporting"
  | "searchable"
  | "aiEligible"
  | "active"
>;

const allTenantRoles: readonly EnorsisRole[] = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "LEGAL",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
];

const platformRoles: readonly EnorsisRole[] = [
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
];

const procurementRoles: readonly EnorsisRole[] = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "AUDITOR",
  "VIEWER",
];

const supplierRoles: readonly EnorsisRole[] = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
];

const governanceRoles: readonly EnorsisRole[] = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "FINANCE",
  "LEGAL",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "VIEWER",
];

const metadataByHref: Record<string, Partial<RegistryMetadata>> = {
  "/app/settings/tenants": {
    id: "platform-tenant-administration",
    featureKey: null,
    roles: ["PLATFORM_SUPER_ADMIN"],
    mobile: false,
    api: false,
    reporting: true,
    searchable: true,
    aiEligible: false,
    active: true,
  },

  "/app/assets": { id: "assets-equipment", featureKey: FEATURE_KEYS.CORE_PROCUREMENT },
  "/app/claims": { id: "returns-claims-recovery", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },
  "/app/logistics": { id: "logistics-freight", featureKey: FEATURE_KEYS.LOGISTICS },
  "/app/demand-planning": { id: "demand-planning", featureKey: FEATURE_KEYS.INVENTORY },
  "/app/services": { id: "services-workforce", featureKey: FEATURE_KEYS.CORE_PROCUREMENT },
  "/app/inventory": { id: "inventory-materials", featureKey: FEATURE_KEYS.INVENTORY },
  "/app/buying": { id: "catalog-guided-buying", featureKey: FEATURE_KEYS.CORE_PROCUREMENT },
  "/app/requests": { id: "purchase-requests", featureKey: FEATURE_KEYS.CORE_PROCUREMENT },
  "/app/sourcing": { id: "strategic-sourcing", featureKey: FEATURE_KEYS.STRATEGIC_SOURCING },
  "/app/requisition-to-order": { id: "procure-to-pay", featureKey: FEATURE_KEYS.CORE_PROCUREMENT },
  "/app/contracts": { id: "contracts", featureKey: FEATURE_KEYS.CONTRACT_MANAGEMENT },
  "/app/planning": { id: "planning-savings", featureKey: FEATURE_KEYS.CATEGORY_MANAGEMENT },
  "/app/suppliers": { id: "supplier-directory", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },
  "/app/marketplace/suppliers": { id: "supplier-marketplace-discovery", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },
  "/app/marketplace/catalog": { id: "marketplace-product-catalog", featureKey: FEATURE_KEYS.CORE_PROCUREMENT, roles: procurementRoles },
  "/app/marketplace/cart": { id: "marketplace-purchase-cart", featureKey: FEATURE_KEYS.CORE_PROCUREMENT, roles: procurementRoles },
  "/app/marketplace/orders": { id: "marketplace-seller-orders", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT, roles: supplierRoles },
  "/app/marketplace/trust": { id: "verified-supplier-network-ratings", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },
  "/app/marketplace/matching": { id: "ai-supplier-matching", featureKey: FEATURE_KEYS.AI_PLATFORM, aiEligible: true },
  "/app/suppliers/compliance": { id: "supplier-compliance", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },
  "/app/suppliers/performance": { id: "supplier-performance", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },
  "/app/suppliers/performance/trends": { id: "supplier-performance-trends", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },
  "/app/categories": { id: "category-market-intelligence", featureKey: FEATURE_KEYS.CATEGORY_MANAGEMENT },
  "/app/value-realization": { id: "value-realization", featureKey: FEATURE_KEYS.CATEGORY_MANAGEMENT },
  "/app/sustainability": { id: "sustainable-procurement", featureKey: FEATURE_KEYS.SUSTAINABLE_PROCUREMENT },
  "/app/resilience": { id: "risk-resilience", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT },
  "/app/ai/workspace": {
    id: "unified-procurement-ai",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/ai/assistants": {
    id: "specialized-ai-assistants",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/ai/knowledge": {
    id: "enterprise-knowledge-rag",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/ai/knowledge/documents": {
    id: "rag-document-ingestion",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/ai/knowledge/ocr": {
    id: "governed-ocr-ingestion",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/automation/copilot": {
    id: "ai-automation-copilot",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/automation/autonomous-planning": {
    id: "autonomous-procurement-planning",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/automation/orchestrator": {
    id: "autonomous-procurement-orchestrator",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/automation/orchestrator/escalations": {
    id: "autonomous-orchestration-escalation-recovery",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/automation/orchestrator/signals": {
    id: "autonomous-orchestration-resume-signals",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/automation/orchestrator/observability": {
    id: "autonomous-orchestration-observability",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/automation/autonomous-recommendations": {
    id: "autonomous-strategy-savings-risk",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/governance/autonomous-execution": {
    id: "controlled-autonomous-execution",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/governance/autonomous-execution/adapters": {
    id: "controlled-transaction-adapters",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/governance/autonomous-execution/native-drafts": {
    id: "governed-native-workflow-drafts",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/governance/autonomous-execution/native-drafts/purchase-requests": {
    id: "native-purchase-request-adapter",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/governance/autonomous-execution/native-drafts/sourcing": {
    id: "native-strategic-sourcing-adapter",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/governance/autonomous-execution/native-drafts/resilience": {
    id: "native-risk-resilience-adapter",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/governance/autonomous-execution/native-drafts/value-realization": {
    id: "native-value-realization-adapter",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/governance/autonomous-execution/native-drafts/inventory": {
    id: "native-inventory-rebalancing-adapter",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/process-mining": {
    id: "enterprise-process-mining",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/outcome-learning": {
    id: "closed-loop-outcome-learning",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/outcome-learning/reconciliation": {
    id: "closed-loop-native-outcome-reconciliation",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/outcome-learning/calibration": {
    id: "closed-loop-prediction-calibration",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/outcome-learning/proposals": {
    id: "closed-loop-learning-proposals",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/outcome-learning/policies": {
    id: "closed-loop-learning-policy-versioning",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/outcome-learning/runtime-policy": {
    id: "closed-loop-runtime-policy-guardrails",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/outcome-learning/runtime-traces": {
    id: "closed-loop-runtime-policy-traces",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/outcome-learning/runtime-adoption": {
    id: "closed-loop-runtime-policy-adoption",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/outcome-learning/runtime-promotion": {
    id: "closed-loop-runtime-promotion-governance",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/predictive-procurement": {
    id: "predictive-procurement-forecasting",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/predictive-inventory": {
    id: "predictive-inventory-optimization",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/predictive-capacity": {
    id: "predictive-capacity-planning",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/analytics/digital-twin": {
    id: "procurement-digital-twin",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
  "/app/settings/api": { id: "api-gateway", featureKey: FEATURE_KEYS.API_ACCESS },
  "/app/settings/api/analytics": { id: "api-analytics", featureKey: FEATURE_KEYS.API_ACCESS },
  "/app/settings/integrations": { id: "integration-hub", featureKey: FEATURE_KEYS.ERP_CONNECTORS },
  "/app/settings/workflows": { id: "workflow-designer", featureKey: FEATURE_KEYS.WORKFLOW_STUDIO },
  "/app/settings/workflows/automation": { id: "workflow-automation", featureKey: FEATURE_KEYS.WORKFLOW_STUDIO },
  "/app/supplier-portal": { id: "supplier-portal", featureKey: FEATURE_KEYS.SUPPLIER_PORTAL },
  "/app/supplier-portal/collaboration": { id: "supplier-collaboration-operations", featureKey: FEATURE_KEYS.SUPPLIER_PORTAL },
  "/app/supplier-portal/collaboration/requests": { id: "supplier-documents-action-requests", featureKey: FEATURE_KEYS.SUPPLIER_PORTAL },
  "/app/supplier-portal/access": { id: "supplier-self-service-access", featureKey: FEATURE_KEYS.SUPPLIER_PORTAL },
  "/app/settings/platform-readiness/end-to-end-commerce": {
    id: "end-to-end-commerce-certification",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
  "/app/settings/platform-readiness/final-release-certification": {
    id: "final-enterprise-release-certification",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
  "/app/settings/platform-readiness/security-certification": {
    id: "security-governance-certification",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
  "/app/settings/platform-readiness/performance-certification": {
    id: "enterprise-scale-performance-certification",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
  "/app/settings/platform-readiness/ai-control-center": {
    id: "enterprise-ai-control-center",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
  "/app/settings/platform-readiness/cross-engine-governance": {
    id: "cross-engine-intelligence-governance",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
  "/app/settings/platform-readiness/ai-engine-adoption": {
    id: "governed-intelligence-engine-adoption",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
  "/app/settings/platform-readiness/ai-runtime-health": {
    id: "ai-runtime-health-monitoring",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
  "/app/settings/platform-readiness/ai-runtime-certification": {
    id: "governed-ai-runtime-certification",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: false,
  },
  "/app/settings/licensing": {
    id: "licensing-entitlements",
    featureKey: null,
    roles: platformRoles,
    mobile: false,
    api: false,
    reporting: true,
    searchable: true,
  },
};

function defaultRoles(group: ModuleRegistryEntry["group"]) {
  if (group === "Procurement") return procurementRoles;
  if (group === "Suppliers") return supplierRoles;
  if (group === "Governance") return governanceRoles;
  if (group === "Platform") {
    return [
      ...platformRoles,
      "TENANT_OWNER",
      "TENANT_ADMIN",
    ] as readonly EnorsisRole[];
  }
  return allTenantRoles;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const moduleRegistry: readonly ModuleRegistryEntry[] =
  enterpriseModules.map((module) => {
    const metadata = metadataByHref[module.href] ?? {};

    return {
      ...module,
      id: metadata.id ?? slugify(module.title),
      featureKey:
        metadata.featureKey === undefined
          ? null
          : (metadata.featureKey as FeatureKey | null),
      roles: metadata.roles ?? defaultRoles(module.group),
      mobile: metadata.mobile ?? true,
      api: metadata.api ?? true,
      reporting: metadata.reporting ?? true,
      searchable: metadata.searchable ?? true,
      aiEligible: metadata.aiEligible ?? false,
      active: metadata.active ?? true,
    };
  });

export const moduleRegistryGroups = enterpriseModuleGroups;

export function getRegisteredModuleByHref(href: string) {
  return moduleRegistry.find((module) => module.href === href) ?? null;
}

export async function getAccessibleModules({
  tenantId,
  userRoles,
}: {
  tenantId: string;
  userRoles: readonly string[];
}) {
  const isPlatformOperator = userRoles.some((role) =>
    platformRoles.includes(role as EnorsisRole),
  );

  const tenantCommercialPersona: TenantCommercialPersonaValue =
    isPlatformOperator
      ? "BUYER_SUPPLIER"
      : (((await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { commercialPersona: true },
        }))?.commercialPersona ?? "BUYER") as TenantCommercialPersonaValue);

  const decisions = await Promise.all(
    moduleRegistry.map(async (module) => {
      if (!module.active) return null;
      if (isPlatformOperator) return module;
      if (
        !isHrefAllowedForCommercialPersona(
          module.href,
          tenantCommercialPersona,
        )
      ) return null;
      if (!hasAnyRole(userRoles, module.roles)) return null;
      if (!module.featureKey) return module;

      return (await hasFeature(tenantId, module.featureKey))
        ? module
        : null;
    }),
  );

  return decisions.filter(
    (module): module is ModuleRegistryEntry => module !== null,
  );
}
