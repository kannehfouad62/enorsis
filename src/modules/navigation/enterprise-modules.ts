import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BrainCircuit,
  DatabaseZap,
  Bot,
  BadgeDollarSign,
  ArrowLeftRight,
  BookOpenCheck,
  Boxes,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  ChartSpline,
  ChartNetwork,
  CircleDollarSign,
  ClipboardCheck,
  Lightbulb,
  FileKey2,
  FileSearch,
  FileScan,
  FileText,
  GitBranch,
  GitMerge,
  Handshake,
  KeyRound,
  Landmark,
  Leaf,
  Network,
  MessagesSquare,
  ListChecks,
  PackageCheck,
  PackageSearch,
  PackageX,
  Presentation,
  ReceiptText,
  Scale,
  Settings2,
  ShieldCheck,
  Cable,
  FileInput,
  FilePlus2,
  FileSearch2,
  ShieldPlus,
  ShieldAlert,
  BellRing,
  ShoppingCart,
  Store,
  Truck,
  Sparkles,
  Users,
  UserRoundCog,
  Workflow,
  Warehouse,
  Gauge,
  GitCompareArrows,
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
  group: | "Procurement"
    | "Suppliers"
    | "Governance"
    | "Intelligence"
    | "Platform"
    | "Automation";
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
    title: "AI Supplier Matching",
    description:
      "Explainable supplier ranking using capabilities, geography, trust, performance, risk and catalog evidence with governed AI analysis.",
    href: "/app/marketplace/matching",
    icon: Bot,
    group: "Suppliers",
  },

  {
    title: "Verified Supplier Network & Ratings",
    description:
      "Govern supplier verification evidence, marketplace ratings, trust scores, suspension and reinstatement.",
    href: "/app/marketplace/trust",
    icon: BadgeCheck,
    group: "Suppliers",
  },

  {
    title: "Marketplace Product Catalog",
    description:
      "Publish and discover supplier products and services with pricing, availability, category and regional metadata.",
    href: "/app/marketplace/catalog",
    icon: PackageSearch,
    group: "Suppliers",
  },

  {
    title: "Supplier Marketplace Discovery",
    description:
      "Global supplier discovery, marketplace visibility, verification, industries, categories and capability search.",
    href: "/app/marketplace/suppliers",
    icon: Store,
    group: "Suppliers",
  },

  {
    title: "Supplier Directory",
    description: "Manage supplier master data, contacts and qualification.",
    href: "/app/suppliers",
    icon: Building2,
    group: "Suppliers",
  },
  {
    title: "Supplier Self-Service Access",
    description:
      "Issue secure supplier portal access for invoice, shipment, task and conversation self-service.",
    href: "/app/supplier-portal/access",
    icon: KeyRound,
    group: "Suppliers",
  },
  {
    title: "Supplier Documents & Action Requests",
    description:
      "Govern shared document exchange, supplier acknowledgements, structured requests and supplier responses.",
    href: "/app/supplier-portal/collaboration/requests",
    icon: ListChecks,
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
    title: "Procurement Digital Twin",
    description:
      "Run governed what-if simulations across demand, supplier disruption, lead times, cost, inbound flow, inventory and capacity.",
    href: "/app/analytics/digital-twin",
    icon: GitCompareArrows,
    group: "Intelligence",
  },

  {
    title: "Predictive Capacity Planning",
    description:
      "Forecast location inventory-unit capacity pressure, projected utilization, capacity gaps and redistribution needs.",
    href: "/app/analytics/predictive-capacity",
    icon: Gauge,
    group: "Intelligence",
  },

  {
    title: "Predictive Inventory Optimization",
    description:
      "Predict stockouts, optimize reorder points and safety stock, and identify excess inventory using demand and stock evidence.",
    href: "/app/analytics/predictive-inventory",
    icon: Warehouse,
    group: "Intelligence",
  },

  {
    title: "Governed Runtime Promotion & Rollback",
    description:
      "Assess SHADOW evidence, require human approval for ENFORCED promotion, and monitor divergence, fallback and denial rollback triggers.",
    href: "/app/analytics/outcome-learning/runtime-promotion",
    icon: ShieldCheck,
    group: "Intelligence",
  },

  {
    title: "Predictive Procurement Policy Adoption",
    description:
      "Control live learning-policy adoption for predictive procurement through OFF, SHADOW and ENFORCED runtime modes.",
    href: "/app/analytics/outcome-learning/runtime-adoption",
    icon: Activity,
    group: "Intelligence",
  },

  {
    title: "Runtime Policy Decision Traceability",
    description:
      "Audit runtime learning-policy decisions with policy version, fallback source, resolved threshold, input value and decision result.",
    href: "/app/analytics/outcome-learning/runtime-traces",
    icon: Activity,
    group: "Intelligence",
  },

  {
    title: "Runtime Policy Consumption & Guardrails",
    description:
      "Resolve selected ACTIVE learning policies through bounded defaults, allowlists and audit-aware runtime guardrails.",
    href: "/app/analytics/outcome-learning/runtime-policy",
    icon: SlidersHorizontal,
    group: "Intelligence",
  },

  {
    title: "Learning Policy Activation & Versioning",
    description:
      "Materialize approved learning proposals into versioned policy candidates with explicit activation, supersession and rollback controls.",
    href: "/app/analytics/outcome-learning/policies",
    icon: GitBranch,
    group: "Intelligence",
  },

  {
    title: "Learning Recommendations & Calibration Proposals",
    description:
      "Generate evidence-backed AI calibration and recommendation-rule proposals for explicit human governance review.",
    href: "/app/analytics/outcome-learning/proposals",
    icon: Lightbulb,
    group: "Intelligence",
  },

  {
    title: "Prediction Accuracy & Calibration",
    description:
      "Measure validated prediction error, recommendation effectiveness, workflow performance and confidence calibration from closed-loop procurement outcomes.",
    href: "/app/analytics/outcome-learning/calibration",
    icon: Gauge,
    group: "Intelligence",
  },

  {
    title: "Native Outcome Reconciliation",
    description:
      "Automatically reconcile observable native procurement facts into closed-loop outcome metrics without inferring unsupported business results.",
    href: "/app/analytics/outcome-learning/reconciliation",
    icon: DatabaseZap,
    group: "Intelligence",
  },

  {
    title: "Closed-Loop Outcome Learning",
    description:
      "Compare autonomous procurement predictions with observed outcomes, calculate variance, preserve evidence and validate learning-quality results.",
    href: "/app/analytics/outcome-learning",
    icon: BrainCircuit,
    group: "Intelligence",
  },

  {
    title: "Predictive Procurement Forecasting",
    description:
      "Forecast spend direction, demand shifts and supplier risk using explainable procurement evidence.",
    href: "/app/analytics/predictive-procurement",
    icon: ChartSpline,
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
    title: "Native Inventory Rebalancing Adapter",
    description:
      "Convert approved autonomous inventory recommendations into real Enorsis TRANSFER movements in DRAFT status without changing stock until native posting.",
    href: "/app/governance/autonomous-execution/native-drafts/inventory",
    icon: ArrowLeftRight,
    group: "Governance",
  },

  {
    title: "Native Value Realization Adapter",
    description:
      "Convert approved autonomous savings opportunities into real Enorsis Procurement Value Initiatives in QUALIFYING status while preserving finance validation.",
    href: "/app/governance/autonomous-execution/native-drafts/value-realization",
    icon: BadgeDollarSign,
    group: "Governance",
  },

  {
    title: "Native Risk & Resilience Adapter",
    description:
      "Convert approved autonomous risk-mitigation recommendations into real Enorsis Resilience Plans in DRAFT status while preserving native activation controls.",
    href: "/app/governance/autonomous-execution/native-drafts/resilience",
    icon: ShieldPlus,
    group: "Governance",
  },

  {
    title: "Native Strategic Sourcing Adapter",
    description:
      "Convert approved autonomous sourcing recommendations into real Enorsis RFP events in DRAFT status while preserving native sourcing governance.",
    href: "/app/governance/autonomous-execution/native-drafts/sourcing",
    icon: FileSearch2,
    group: "Governance",
  },

  {
    title: "Native Purchase Request Adapter",
    description:
      "Convert approved autonomous procurement handoffs into real Enorsis Purchase Requests in DRAFT status while preserving native approvals.",
    href: "/app/governance/autonomous-execution/native-drafts/purchase-requests",
    icon: FilePlus2,
    group: "Governance",
  },

  {
    title: "Governed Native Workflow Drafts",
    description:
      "Materialize activated autonomous transaction adapters into governed native draft objects and bind them to confirmed Enorsis workflow records.",
    href: "/app/governance/autonomous-execution/native-drafts",
    icon: FileInput,
    group: "Governance",
  },

  {
    title: "Controlled Transaction Adapters",
    description:
      "Prepare idempotent operator-controlled handoffs from released autonomous execution envelopes into native Enorsis workflows.",
    href: "/app/governance/autonomous-execution/adapters",
    icon: Cable,
    group: "Governance",
  },

  {
    title: "Controlled Autonomous Execution",
    description:
      "Stage approved AI-driven procurement actions, evaluate policy boundaries, require human release and create controlled workflow handoffs.",
    href: "/app/governance/autonomous-execution",
    icon: ShieldCheck,
    group: "Governance",
  },

  {
    title: "Autonomous Strategy & Savings",
    description:
      "Generate human-governed strategy recommendations, savings hypotheses and risk-mitigation actions from approved plans and predictive evidence.",
    href: "/app/automation/autonomous-recommendations",
    icon: Lightbulb,
    group: "Intelligence",
  },

  {
    title: "Orchestration Observability",
    description:
      "Monitor autonomous procurement run traces, cycle time, completion rates, human-gate aging, escalations and event-driven resume performance.",
    href: "/app/automation/orchestrator/observability",
    icon: Activity,
    group: "Automation",
  },

  {
    title: "Orchestration Resume Signals",
    description:
      "Receive idempotent internal lifecycle signals and resume autonomous procurement only after persisted governance conditions are independently verified.",
    href: "/app/automation/orchestrator/signals",
    icon: BellRing,
    group: "Automation",
  },

  {
    title: "Orchestration SLA, Escalation & Recovery",
    description:
      "Detect aging autonomous-procurement runs, manage escalations, and recover failed orchestration without bypassing human governance gates.",
    href: "/app/automation/orchestrator/escalations",
    icon: ShieldAlert,
    group: "Automation",
  },

  {
    title: "Autonomous Procurement Orchestrator",
    description:
      "Coordinate human-released autonomous procurement decisions through controlled adapters and governed native draft execution with pause/resume controls.",
    href: "/app/automation/orchestrator",
    icon: Workflow,
    group: "Automation",
  },

  {
    title: "Autonomous Procurement Planning",
    description:
      "Generate evidence-backed procurement plans from predictive intelligence, supplier matching and digital-twin risk with mandatory human approval.",
    href: "/app/automation/autonomous-planning",
    icon: ClipboardCheck,
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
    title: "Final Enterprise Release Certification",
    description:
      "Aggregate AI runtime, performance, security, runtime-health and cross-engine governance evidence into a final enterprise release decision.",
    href: "/app/settings/platform-readiness/final-release-certification",
    icon: ShieldCheck,
    group: "Governance",
  },

  {
    title: "Security & Governance Certification",
    description:
      "Certify tenant isolation, human governance, runtime transition boundaries, audit provenance, secret handling and autonomous-execution controls.",
    href: "/app/settings/platform-readiness/security-certification",
    icon: ShieldCheck,
    group: "Governance",
  },

  {
    title: "Enterprise Scale & Performance Certification",
    description:
      "Certify critical database, governance, observability and AI aggregation paths with bounded read-only latency and concurrency probes.",
    href: "/app/settings/platform-readiness/performance-certification",
    icon: Activity,
    group: "Governance",
  },

  {
    title: "Enterprise AI Control Center",
    description:
      "Centralize AI provider readiness, certification, runtime health, engine adoption, policies, traces, promotion state and cross-engine governance.",
    href: "/app/settings/platform-readiness/ai-control-center",
    icon: Activity,
    group: "Governance",
  },

  {
    title: "Cross-Engine Intelligence Governance",
    description:
      "Detect and govern conflicts across predictive procurement, inventory and capacity intelligence using explicit precedence and human resolution.",
    href: "/app/settings/platform-readiness/cross-engine-governance",
    icon: GitMerge,
    group: "Governance",
  },

  {
    title: "Governed Intelligence Engine Adoption",
    description:
      "Control OFF, SHADOW and ENFORCED runtime-policy adoption independently across predictive procurement, inventory and capacity intelligence.",
    href: "/app/settings/platform-readiness/ai-engine-adoption",
    icon: Activity,
    group: "Governance",
  },

  {
    title: "AI Runtime Health & Production Monitoring",
    description:
      "Monitor governed AI runtime health, policy usage, fallback, denials, clamping, trace integrity, certification state and adoption mode.",
    href: "/app/settings/platform-readiness/ai-runtime-health",
    icon: Activity,
    group: "Governance",
  },

  {
    title: "Governed AI Runtime Certification",
    description:
      "Run formal non-destructive certification across AI runtime policies, fallbacks, traces, SHADOW behavior, promotion guardrails and human governance.",
    href: "/app/settings/platform-readiness/ai-runtime-certification",
    icon: ShieldCheck,
    group: "Governance",
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
