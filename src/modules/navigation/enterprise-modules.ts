import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  BadgeDollarSign,
  BookOpenCheck,
  Boxes,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  ChartSpline,
  ChartNetwork,
  CircleDollarSign,
  ClipboardCheck,
  FileKey2,
  FileSearch,
  FileScan,
  FileText,
  GitBranch,
  Handshake,
  KeyRound,
  Landmark,
  Leaf,
  Network,
  MessagesSquare,
  PackageCheck,
  PackageX,
  Presentation,
  ReceiptText,
  Scale,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  ShoppingCart,
  Store,
  Truck,
  Sparkles,
  Users,
  UserRoundCog,
  Workflow,
  Warehouse,
  Wrench,
  PlugZap,
  Bell,
  Clock3,
  SlidersHorizontal,
  BadgeCheck,
  FileCheck2,
  
} from "lucide-react";

export interface EnterpriseModuleLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group:
    | "Procurement"
    | "Suppliers"
    | "Governance"
    | "Intelligence"
    | "Platform";
}

export const enterpriseModules: EnterpriseModuleLink[] = [
  {
    title: "Assets & Equipment",
    description: "Asset custody, warranties, maintenance and retirement.",
    href: "/app/assets",
    icon: Wrench,
    group: "Procurement",
  },
  {
    title: "Returns, Claims & Recovery",
    description: "Returns, supplier claims, warranty cases and recovery.",
    href: "/app/claims",
    icon: PackageX,
    group: "Procurement",
  },
  {
    title: "Logistics & Freight",
    description: "Carriers, shipments, tracking, freight cost and delivery risk.",
    href: "/app/logistics",
    icon: Truck,
    group: "Procurement",
  },
  {
    title: "Demand Planning & Replenishment",
    description: "Forecast demand and generate governed replenishment proposals.",
    href: "/app/demand-planning",
    icon: ChartSpline,
    group: "Procurement",
  },
  {
    title: "Services & Workforce",
    description: "Statements of work, external workers, time and milestones.",
    href: "/app/services",
    icon: UserRoundCog,
    group: "Procurement",
  },
  {
    title: "Inventory & Materials",
    description: "Stock locations, balances, movements and cycle counts.",
    href: "/app/inventory",
    icon: Warehouse,
    group: "Procurement",
  },
  {
    title: "Catalog & Guided Buying",
    description: "Preferred catalogs, shopping carts and policy-aligned buying.",
    href: "/app/buying",
    icon: Store,
    group: "Procurement",
  },
  {
    title: "Purchase Requests",
    description: "Create, route and approve internal procurement demand.",
    href: "/app/requests",
    icon: ShoppingCart,
    group: "Procurement",
  },
  {
    title: "Strategic Sourcing",
    description: "Manage RFx events, invitations, evaluation and awards.",
    href: "/app/sourcing",
    icon: BriefcaseBusiness,
    group: "Procurement",
  },
  {
    title: "Procure to Pay",
    description:
      "End-to-end requisition, approval, order, receipt, match and payment readiness.",
    href: "/app/requisition-to-order",
    icon: ReceiptText,
    group: "Procurement",
  },
  {
    title: "Contracts",
    description: "Govern contract lifecycle, clauses, obligations and risk.",
    href: "/app/contracts",
    icon: FileText,
    group: "Procurement",
  },
  {
    title: "Planning & Savings",
    description: "Manage annual plans, category strategies and realized value.",
    href: "/app/planning",
    icon: CircleDollarSign,
    group: "Procurement",
  },
  {
    title: "Supplier Directory",
    description: "Manage supplier master data, contacts and qualification.",
    href: "/app/suppliers",
    icon: Building2,
    group: "Suppliers",
  },
  {
    title: "Supplier Collaboration Operations",
    description:
      "Supplier invoice submissions, shipment updates and persistent buyer–supplier conversations.",
    href: "/app/supplier-portal/collaboration",
    icon: MessagesSquare,
    group: "Suppliers",
  },
  {
    title: "Supplier Compliance",
    description: "Track supplier documents, expiry and compliance status.",
    href: "/app/suppliers/compliance",
    icon: ClipboardCheck,
    group: "Suppliers",
  },
  {
    title: "Supplier Performance",
    description: "Scorecards, trends, development plans and SCAR management.",
    href: "/app/suppliers/performance",
    icon: ChartNoAxesCombined,
    group: "Suppliers",
  },
  {
    title: "Supplier Performance Trends",
    description: "Compare published supplier scores and portfolio movement.",
    href: "/app/suppliers/performance/trends",
    icon: Activity,
    group: "Suppliers",
  },
  {
    title: "Workflow Inbox",
    description: "Review assigned approvals and workflow decisions.",
    href: "/app/workflows",
    icon: Workflow,
    group: "Governance",
  },
  {
    title: "Workflow Designer",
    description: "Configure conditional approval and process orchestration.",
    href: "/app/settings/workflows",
    icon: GitBranch,
    group: "Governance",
  },
  {
    title: "Workflow Automation",
    description: "Monitor triggers, instances, delegations and escalations.",
    href: "/app/settings/workflows/automation",
    icon: Network,
    group: "Governance",
  },
  {
    title: "Workflow Notifications",
    description: "Operate in-app and email workflow delivery.",
    href: "/app/settings/workflows/notifications",
    icon: PackageCheck,
    group: "Governance",
  },
  {
    title: "Categories & Market Intelligence",
    description: "Category strategies, opportunities and market signals.",
    href: "/app/categories",
    icon: ChartNetwork,
    group: "Governance",
  },
  {
    title: "Savings & Value Realization",
    description: "Initiatives, finance-validated benefits and value leakage.",
    href: "/app/value-realization",
    icon: BadgeDollarSign,
    group: "Governance",
  },
  {
    title: "Sustainable Procurement",
    description: "Supplier ESG, emissions, diversity and responsible sourcing.",
    href: "/app/sustainability",
    icon: Leaf,
    group: "Governance",
  },
  {
    title: "Risk & Resilience",
    description: "Disruptions, exposure, continuity plans and recovery.",
    href: "/app/resilience",
    icon: ShieldAlert,
    group: "Governance",
  },
  {
    title: "Policy & Compliance",
    description: "Policies, controls, testing and remediation.",
    href: "/app/compliance",
    icon: BookOpenCheck,
    group: "Governance",
  },
  {
    title: "Access Governance",
    description: "Segregation of duties and periodic access certification.",
    href: "/app/settings/access-governance",
    icon: ShieldCheck,
    group: "Governance",
  },
  {
    title: "Executive Reviews",
    description: "Operating reviews, KPI packs, decisions and action tracking.",
    href: "/app/reviews",
    icon: Presentation,
    group: "Intelligence",
  },
  {
    title: "Spend Intelligence",
    description: "Analyze procurement spend, suppliers and category exposure.",
    href: "/app/analytics/spend",
    icon: Landmark,
    group: "Intelligence",
  },
  {
    title: "Analytics Command Center",
    description: "Enterprise procurement analytics and performance views.",
    href: "/app/analytics",
    icon: Sparkles,
    group: "Intelligence",
  },
  {
    title: "Specialized AI Assistants",
    description:
      "Role-aware Procurement, Supplier, Inventory, Contract and Executive assistants grounded in Enterprise RAG.",
    href: "/app/ai/assistants",
    icon: MessagesSquare,
    group: "Intelligence",
  },
  {
    title: "Unified Procurement AI",
    description:
      "Tenant-grounded procurement intelligence across contracts, suppliers, policies and procedures.",
    href: "/app/ai/workspace",
    icon: Bot,
    group: "Intelligence",
  },
  {
    title: "Governed OCR Ingestion",
    description:
      "Extract scanned PDF and image document text through governed AI and index it into Enterprise RAG.",
    href: "/app/ai/knowledge/ocr",
    icon: FileScan,
    group: "Intelligence",
  },
  {
    title: "RAG Document Ingestion",
    description:
      "Extract and index tenant-private supplier and contract documents for governed semantic retrieval.",
    href: "/app/ai/knowledge/documents",
    icon: FileSearch,
    group: "Intelligence",
  },
  {
    title: "Enterprise Knowledge & RAG",
    description:
      "Govern tenant knowledge sources, embeddings and semantic retrieval for Enorsis AI.",
    href: "/app/ai/knowledge",
    icon: BookOpenCheck,
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
  },
  {
    title: "Organization",
    description: "Manage tenant structure, entities, sites and departments.",
    href: "/app/settings/organization",
    icon: Boxes,
    group: "Platform",
  },
  {
    title: "Access & Roles",
    description: "Manage users, memberships and role assignments.",
    href: "/app/settings/access",
    icon: Users,
    group: "Platform",
  },
  {
    title: "Security",
    description: "Review platform security and authentication controls.",
    href: "/app/settings/security",
    icon: FileKey2,
    group: "Platform",
  },
  {
    title: "API Gateway",
    description: "Issue scoped API clients and review request activity.",
    href: "/app/settings/api",
    icon: KeyRound,
    group: "Platform",
  },
  {
    title: "API Analytics",
    description: "Monitor API usage, latency, denials and credentials.",
    href: "/app/settings/api/analytics",
    icon: Scale,
    group: "Platform",
  },
  {
    title: "Integration Hub",
    description: "Manage governed ERP and external system integrations.",
    href: "/app/settings/integrations",
    icon: Handshake,
    group: "Platform",
  },
  {
    title: "Platform Settings",
    description: "Review enterprise configuration and administration.",
    href: "/app/settings",
    icon: Settings2,
    group: "Platform",
  },
  {
    title: "Supplier Portal & Onboarding",
    description: "Supplier access, questionnaires, tasks and collaboration.",
    href: "/app/supplier-portal",
    icon: Users,
    group: "Procurement",
  },

  {
    title: "Licensing & Entitlements",
    description: "Commercial editions, subscriptions and tenant feature access.",
    href: "/app/settings/licensing",
    icon: Users,
    group: "Platform",
  },

  {
    title: "Module Registry",
    description: "Central module metadata, licensing and capability catalog.",
    href: "/app/settings/modules",
    icon: Boxes,
    group: "Platform",
  },

  {
    title: "Tenant Enterprise Configuration",
    description: "Branding, locale, security, residency and operational limits.",
    href: "/app/settings/configuration",
    icon: Settings2,
    group: "Platform",
  },

  {
    title: "Background Job Platform",
    description: "Schedules, retries, executions and worker operations.",
    href: "/app/settings/jobs",
    icon: Workflow,
    group: "Platform",
  },

  {
    title: "Enterprise Event Bus",
    description: "Domain events, subscriptions, deliveries and dead letters.",
    href: "/app/settings/events",
    icon: Network,
    group: "Platform",
  },

  {
    title: "Integration Hub & Connector Framework",
    description: "Connector catalog, credentials, mappings and sync operations.",
    href: "/app/settings/integration-hub",
    icon: PlugZap,
    group: "Platform",
  },

  {
    title: "Secrets Vault",
    description: "Encrypted secrets, rotation, access policies and audit logs.",
    href: "/app/settings/secrets",
    icon: KeyRound,
    group: "Platform",
  },

  {
    title: "Unified Notification Center",
    description: "Templates, preferences, channels and delivery operations.",
    href: "/app/settings/notifications",
    icon: Bell,
    group: "Platform",
  },

  {
    title: "Universal Activity Timeline",
    description: "Tenant-safe business activity, audit context and traceability.",
    href: "/app/settings/activity",
    icon: Clock3,
    group: "Platform",
  },

  {
    title: "Enterprise Policy Framework",
    description: "Versioned policies, tenant overrides and controlled feature flags.",
    href: "/app/settings/policies",
    icon: SlidersHorizontal,
    group: "Platform",
  },

  {
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
  },

  {
    title: "Purchase Request Integration",
    description: "Submission readiness, request evidence and governed handoff to approval.",
    href: "/app/requisition-to-order/purchase-request",
    icon: ClipboardCheck,
    group: "Procurement",
  },

  {
    title: "Goods Receipt",
    description: "Receipt posting, quantity tolerances, damage and exceptions.",
    href: "/app/requisition-to-order/receipts",
    icon: PackageCheck,
    group: "Procurement",
  },

  {
    title: "Purchase Order Execution",
    description: "PO generation, validation, issue, acknowledgment and revisions.",
    href: "/app/requisition-to-order/purchase-orders",
    icon: FileCheck2,
    group: "Procurement",
  },

  {
    title: "Three-Way Match",
    description: "PO, receipt and supplier-invoice reconciliation.",
    href: "/app/requisition-to-order/three-way-match",
    icon: Scale,
    group: "Procurement",
  },

  {
    title: "Payment Readiness",
    description: "AP controls, payment holds, approvals and batch eligibility.",
    href: "/app/requisition-to-order/payment-readiness",
    icon: CircleDollarSign,
    group: "Procurement",
  },

  {
    title: "Procurement Analytics",
    description: "Executive KPIs, bottlenecks, exceptions and payment readiness.",
    href: "/app/requisition-to-order/analytics",
    icon: BadgeCheck,
    group: "Procurement",
  },

  {
    title: "Procurement Certification",
    description: "End-to-end process certification and closure controls.",
    href: "/app/requisition-to-order/certification",
    icon: BadgeCheck,
    group: "Procurement",
  },

  {
    title: "Inventory Operations",
    description: "Movement ledger, availability, reservations and exceptions.",
    href: "/app/inventory-operations",
    icon: BadgeCheck,
    group: "Procurement",
  },

  {
    title: "Warehouse Operations",
    description: "Receiving, putaway, location capacity and discrepancies.",
    href: "/app/warehouse-operations",
    icon: BadgeCheck,
    group: "Procurement",
  },

  {
    title: "Warehouse Fulfillment",
    description: "Picking, packing, issue and internal fulfillment.",
    href: "/app/warehouse-fulfillment",
    icon: BadgeCheck,
    group: "Procurement",
  },

  {
    title: "Inventory Reconciliation",
    description: "Cycle counts, reconciliation and stock adjustments.",
    href: "/app/inventory-reconciliation",
    icon: BadgeCheck,
    group: "Procurement",
  },

  {
    title: "Inventory Traceability",
    description: "Lot, serial, expiry, quarantine and recall traceability.",
    href: "/app/inventory-traceability",
    icon: BadgeCheck,
    group: "Procurement",
  },

  {
    title: "Inventory Financial Valuation",
    description: "Cost layers, inventory valuation and financial reconciliation.",
    href: "/app/inventory-financial-valuation",
    icon: BadgeCheck,
    group: "Procurement",
  },

  {
    title: "Analytics Foundation",
    description: "Governed KPI registry, snapshots and aggregation runs.",
    href: "/app/executive/analytics-foundation",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Enterprise KPI Engine",
    description: "Targets, thresholds, trends and executive health scoring.",
    href: "/app/executive/kpis",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Executive Intelligence",
    description: "Enterprise health, KPI cockpit and operational risk.",
    href: "/app/executive",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Inventory Intelligence",
    description: "Turnover, DIO, aging, ABC/XYZ and inventory health.",
    href: "/app/executive/inventory-intelligence",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Warehouse Intelligence",
    description: "Receiving, putaway, picking, utilization and warehouse health.",
    href: "/app/executive/warehouse-intelligence",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Procurement Intelligence",
    description: "Spend, approvals, contracts, savings and procurement health.",
    href: "/app/executive/procurement-intelligence",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Governed Executive AI",
    description: "Explainable executive insights, evidence and confidence scoring.",
    href: "/app/executive/ai-intelligence",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Executive AI Briefing",
    description: "Prioritized decisions, risks, opportunities and executive actions.",
    href: "/app/executive/ai-briefing",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Executive AI Governance",
    description: "Human review, approvals, escalation and AI decision audit.",
    href: "/app/executive/ai-governance",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "OpenAI Executive Synthesis",
    description: "Governed board-ready synthesis from approved enterprise evidence.",
    href: "/app/executive/ai-synthesis",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Executive Board Reporting",
    description: "Governed CEO, CFO, COO, CPO and board-pack generation.",
    href: "/app/executive/board-reporting",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Board Calendar",
    description: "Schedule monthly, quarterly and annual governed board packs.",
    href: "/app/executive/board-calendar",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Board Distribution",
    description: "Secure board recipients, committee groups and delivery audit.",
    href: "/app/executive/board-distribution",
    icon: BadgeCheck,
    group: "Intelligence",
  },

  {
    title: "Enterprise Workflow Automation",
    description: "Governed event, schedule and condition-based enterprise automation.",
    href: "/app/automation",
    icon: BadgeCheck,
    group: "Governance",
  },

];

export const enterpriseModuleGroups = [
  "Procurement",
  "Suppliers",
  "Governance",
  "Intelligence",
  "Platform",
] as const;
