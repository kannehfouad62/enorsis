from pathlib import Path

SCHEMA_PATH = Path("prisma/schema.prisma")
schema = SCHEMA_PATH.read_text()

ENUMS = """enum CategoryOpportunityType {
  SOURCING
  RENEGOTIATION
  DEMAND_MANAGEMENT
  SPECIFICATION_OPTIMIZATION
  SUPPLIER_CONSOLIDATION
  PROCESS_IMPROVEMENT
  RISK_REDUCTION
  SUSTAINABILITY
  OTHER
}

enum CategoryOpportunityStatus {
  IDENTIFIED
  QUALIFYING
  APPROVED
  IN_PROGRESS
  REALIZED
  CANCELLED
}

enum MarketSignalType {
  PRICE
  CAPACITY
  SUPPLY_RISK
  REGULATORY
  TECHNOLOGY
  GEOPOLITICAL
  SUSTAINABILITY
  LABOR
  OTHER
}

enum MarketSignalDirection {
  POSITIVE
  NEUTRAL
  NEGATIVE
}

"""

MODELS = """
model CategoryOpportunity {
  id                 String                    @id @default(cuid())
  categoryStrategyId String
  title              String
  description        String
  type               CategoryOpportunityType
  status             CategoryOpportunityStatus @default(IDENTIFIED)
  estimatedValue     Decimal                   @default(0) @db.Decimal(18, 2)
  probabilityPercent Int                       @default(50)
  complexityScore    Int                       @default(3)
  riskScore          Int                       @default(3)
  ownerUserId        String
  targetStartAt      DateTime?
  targetCompletionAt DateTime?
  sourcingEventId    String?
  contractId         String?
  valueInitiativeId  String?
  assumptions        String?
  blockers           String?
  strategy           CategoryStrategy          @relation(fields: [categoryStrategyId], references: [id], onDelete: Cascade)
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt

  @@index([categoryStrategyId, status, targetCompletionAt])
}

model CategoryMarketSignal {
  id                 String                @id @default(cuid())
  categoryStrategyId String
  type               MarketSignalType
  direction          MarketSignalDirection
  title              String
  description        String
  source             String?
  sourceUrl          String?
  confidencePercent  Int                   @default(50)
  impactScore        Int                   @default(3)
  observedAt         DateTime
  expiresAt          DateTime?
  strategy           CategoryStrategy      @relation(fields: [categoryStrategyId], references: [id], onDelete: Cascade)
  createdAt          DateTime              @default(now())
  updatedAt          DateTime              @updatedAt

  @@index([categoryStrategyId, type, observedAt])
}
"""

def bounds(text: str, model: str) -> tuple[int, int]:
    start = text.find("model " + model + " {")
    if start < 0:
        raise SystemExit("Could not locate " + model + " model.")
    opening = text.find("{", start)
    depth = 0
    for index in range(opening, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return start, index
    raise SystemExit("Could not locate end of " + model + " model.")

if "enum CategoryOpportunityType" not in schema:
    anchor = "enum AuditActorType {"
    if anchor not in schema:
        raise SystemExit("Could not locate AuditActorType enum anchor.")
    schema = schema.replace(anchor, ENUMS + anchor, 1)

start, end = bounds(schema, "CategoryStrategy")
block = schema[start:end]

fields = [
    ("categoryCode", "  categoryCode           String?"),
    ("categoryName", "  categoryName           String?"),
    ("title", "  title                  String?"),
    ("description", "  description            String?"),
    ("executiveSponsorUserId", "  executiveSponsorUserId String?"),
    ("periodStart", "  periodStart            DateTime?"),
    ("periodEnd", "  periodEnd              DateTime?"),
    ("currencyCode", '  currencyCode          String                  @default("USD")'),
    ("managedSpend", "  managedSpend          Decimal                 @default(0) @db.Decimal(18, 2)"),
    ("preferredSupplierCount", "  preferredSupplierCount Int                   @default(0)"),
    ("demandDrivers", "  demandDrivers         String?"),
    ("supplyMarketSummary", "  supplyMarketSummary   String?"),
    ("strategicObjectives", "  strategicObjectives   String?"),
    ("approvedByUserId", "  approvedByUserId      String?"),
    ("approvedAt", "  approvedAt            DateTime?"),
    ("opportunities", "  opportunities          CategoryOpportunity[]"),
    ("marketSignals", "  marketSignals          CategoryMarketSignal[]"),
]

missing = [line for name, line in fields if "\n  " + name not in block]
if missing:
    anchor = block.find("\n  tenant ")
    if anchor < 0:
        anchor = block.find("\n  createdAt")
    if anchor < 0:
        raise SystemExit("Could not locate CategoryStrategy insertion anchor.")
    block = block[:anchor] + "\n" + "\n".join(missing) + block[anchor:]
    schema = schema[:start] + block + schema[end:]

if "model CategoryOpportunity {" not in schema:
    schema += "\n" + MODELS

SCHEMA_PATH.write_text(schema)

Path("src/modules/category-management/actions.ts").write_text('"use server";\n\nimport { revalidatePath } from "next/cache";\nimport { requireAnyRole } from "@/core/auth/authorization";\nimport { prisma } from "@/lib/prisma";\n\nconst field = (data: FormData, key: string) =>\n  String(data.get(key) ?? "").trim();\n\nconst roles = [\n  "PROCUREMENT_EXECUTIVE",\n  "PROCUREMENT_MANAGER",\n  "BUYER",\n  "FINANCE",\n  "RISK_COMPLIANCE",\n  "TENANT_ADMIN",\n  "TENANT_OWNER",\n] as const;\n\nexport async function createCategoryStrategyAction(data: FormData) {\n  const user = await requireAnyRole([...roles]);\n\n  const categoryCode = field(data, "categoryCode");\n  const categoryName = field(data, "categoryName");\n  const title = field(data, "title");\n  const description = field(data, "description");\n  const periodStart = new Date(field(data, "periodStart"));\n  const periodEnd = new Date(field(data, "periodEnd"));\n  const managedSpend = Number(field(data, "managedSpend") || 0);\n\n  await prisma.categoryStrategy.create({\n    data: {\n      tenantId: user.tenantId,\n      category: categoryName,\n      name: title,\n      ownerUserId: user.id,\n      currentSpend: managedSpend,\n      addressableSpend: Number(field(data, "addressableSpend") || 0),\n      savingsTarget: Number(field(data, "savingsTarget") || 0),\n      supplierCount: Number(field(data, "supplierCount") || 0),\n      riskSummary: field(data, "riskSummary") || null,\n      marketSummary: field(data, "supplyMarketSummary") || null,\n      strategySummary: description,\n      sourcingApproach: field(data, "strategicObjectives") || null,\n      supplierApproach: field(data, "supplierApproach") || null,\n      startsAt: periodStart,\n      targetCompletionAt: periodEnd,\n      status: "UNDER_REVIEW",\n      categoryCode: categoryCode || null,\n      categoryName: categoryName || null,\n      title: title || null,\n      description: description || null,\n      executiveSponsorUserId:\n        field(data, "executiveSponsorUserId") || null,\n      periodStart,\n      periodEnd,\n      currencyCode: field(data, "currencyCode") || "USD",\n      managedSpend,\n      preferredSupplierCount: Number(\n        field(data, "preferredSupplierCount") || 0,\n      ),\n      demandDrivers: field(data, "demandDrivers") || null,\n      supplyMarketSummary:\n        field(data, "supplyMarketSummary") || null,\n      strategicObjectives:\n        field(data, "strategicObjectives") || null,\n    },\n  });\n\n  revalidatePath("/app/categories");\n}\n\nexport async function addCategoryOpportunityAction(data: FormData) {\n  const user = await requireAnyRole([...roles]);\n  const categoryStrategyId = field(data, "categoryStrategyId");\n\n  await prisma.categoryStrategy.findFirstOrThrow({\n    where: { id: categoryStrategyId, tenantId: user.tenantId },\n  });\n\n  await prisma.categoryOpportunity.create({\n    data: {\n      categoryStrategyId,\n      title: field(data, "title"),\n      description: field(data, "description"),\n      type: field(data, "type") as\n        | "SOURCING"\n        | "RENEGOTIATION"\n        | "DEMAND_MANAGEMENT"\n        | "SPECIFICATION_OPTIMIZATION"\n        | "SUPPLIER_CONSOLIDATION"\n        | "PROCESS_IMPROVEMENT"\n        | "RISK_REDUCTION"\n        | "SUSTAINABILITY"\n        | "OTHER",\n      estimatedValue: Number(field(data, "estimatedValue") || 0),\n      probabilityPercent: Number(field(data, "probabilityPercent") || 50),\n      complexityScore: Number(field(data, "complexityScore") || 3),\n      riskScore: Number(field(data, "riskScore") || 3),\n      ownerUserId: field(data, "ownerUserId") || user.id,\n      targetStartAt: field(data, "targetStartAt")\n        ? new Date(field(data, "targetStartAt"))\n        : null,\n      targetCompletionAt: field(data, "targetCompletionAt")\n        ? new Date(field(data, "targetCompletionAt"))\n        : null,\n      assumptions: field(data, "assumptions") || null,\n      blockers: field(data, "blockers") || null,\n    },\n  });\n\n  revalidatePath("/app/categories");\n}\n\nexport async function addCategoryMarketSignalAction(data: FormData) {\n  const user = await requireAnyRole([...roles]);\n  const categoryStrategyId = field(data, "categoryStrategyId");\n\n  await prisma.categoryStrategy.findFirstOrThrow({\n    where: { id: categoryStrategyId, tenantId: user.tenantId },\n  });\n\n  await prisma.categoryMarketSignal.create({\n    data: {\n      categoryStrategyId,\n      type: field(data, "type") as\n        | "PRICE"\n        | "CAPACITY"\n        | "SUPPLY_RISK"\n        | "REGULATORY"\n        | "TECHNOLOGY"\n        | "GEOPOLITICAL"\n        | "SUSTAINABILITY"\n        | "LABOR"\n        | "OTHER",\n      direction: field(data, "direction") as\n        | "POSITIVE"\n        | "NEUTRAL"\n        | "NEGATIVE",\n      title: field(data, "title"),\n      description: field(data, "description"),\n      source: field(data, "source") || null,\n      sourceUrl: field(data, "sourceUrl") || null,\n      confidencePercent: Number(field(data, "confidencePercent") || 50),\n      impactScore: Number(field(data, "impactScore") || 3),\n      observedAt: new Date(field(data, "observedAt")),\n      expiresAt: field(data, "expiresAt")\n        ? new Date(field(data, "expiresAt"))\n        : null,\n    },\n  });\n\n  revalidatePath("/app/categories");\n}\n\nexport async function approveCategoryStrategyAction(data: FormData) {\n  const user = await requireAnyRole([\n    "PROCUREMENT_EXECUTIVE",\n    "PROCUREMENT_MANAGER",\n    "TENANT_ADMIN",\n    "TENANT_OWNER",\n  ]);\n\n  const id = field(data, "strategyId");\n\n  const strategy = await prisma.categoryStrategy.findFirstOrThrow({\n    where: { id, tenantId: user.tenantId },\n  });\n\n  await prisma.categoryStrategy.update({\n    where: { id: strategy.id },\n    data: {\n      status: "ACTIVE",\n      approvedByUserId: user.id,\n      approvedAt: new Date(),\n    },\n  });\n\n  revalidatePath("/app/categories");\n}\n')
Path("src/modules/category-management/queries.ts").write_text('import { redirect } from "next/navigation";\nimport { auth } from "@/auth";\nimport { prisma } from "@/lib/prisma";\n\nexport async function getCategoryManagementWorkspace() {\n  const session = await auth();\n  if (!session?.user) redirect("/login");\n\n  const tenantId = session.user.tenantId;\n\n  const [strategies, members] = await Promise.all([\n    prisma.categoryStrategy.findMany({\n      where: { tenantId },\n      include: {\n        opportunities: {\n          orderBy: [\n            { status: "asc" },\n            { targetCompletionAt: "asc" },\n          ],\n        },\n        marketSignals: {\n          orderBy: { observedAt: "desc" },\n        },\n      },\n      orderBy: [\n        { status: "asc" },\n        { targetCompletionAt: "desc" },\n      ],\n      take: 200,\n    }),\n    prisma.membership.findMany({\n      where: { tenantId, status: "ACTIVE" },\n      include: { user: true },\n      orderBy: { createdAt: "asc" },\n    }),\n  ]);\n\n  return {\n    strategies,\n    members,\n    metrics: {\n      activeStrategies: strategies.filter(\n        (strategy) => strategy.status === "ACTIVE",\n      ).length,\n      addressableSpend: strategies.reduce(\n        (sum, strategy) => sum + Number(strategy.addressableSpend),\n        0,\n      ),\n      managedSpend: strategies.reduce(\n        (sum, strategy) =>\n          sum + Number(strategy.managedSpend ?? strategy.currentSpend),\n        0,\n      ),\n      opportunityValue: strategies.reduce(\n        (sum, strategy) =>\n          sum +\n          strategy.opportunities\n            .filter((opportunity) =>\n              [\n                "IDENTIFIED",\n                "QUALIFYING",\n                "APPROVED",\n                "IN_PROGRESS",\n              ].includes(opportunity.status),\n            )\n            .reduce(\n              (subtotal, opportunity) =>\n                subtotal + Number(opportunity.estimatedValue),\n              0,\n            ),\n        0,\n      ),\n      negativeSignals: strategies.reduce(\n        (sum, strategy) =>\n          sum +\n          strategy.marketSignals.filter(\n            (signal) => signal.direction === "NEGATIVE",\n          ).length,\n        0,\n      ),\n      supplierConcentration: strategies.filter(\n        (strategy) => strategy.supplierCount <= 2,\n      ).length,\n    },\n  };\n}\n')
Path("src/app/app/categories/page.tsx").write_text('import {\n  addCategoryMarketSignalAction,\n  addCategoryOpportunityAction,\n  approveCategoryStrategyAction,\n  createCategoryStrategyAction,\n} from "@/modules/category-management/actions";\nimport { getCategoryManagementWorkspace } from "@/modules/category-management/queries";\n\nconst input =\n  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";\nconst card =\n  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";\n\nexport default async function CategoryManagementPage() {\n  const data = await getCategoryManagementWorkspace();\n\n  return (\n    <div className="mx-auto max-w-7xl px-4 py-10">\n      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">\n        Strategic category management\n      </p>\n      <h1 className="mt-3 text-4xl font-black">\n        Categories & Market Intelligence\n      </h1>\n\n      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">\n        <Metric label="Active strategies" value={data.metrics.activeStrategies} />\n        <Metric label="Addressable spend" value={data.metrics.addressableSpend} money />\n        <Metric label="Managed spend" value={data.metrics.managedSpend} money />\n        <Metric label="Opportunity value" value={data.metrics.opportunityValue} money />\n        <Metric label="Negative signals" value={data.metrics.negativeSignals} />\n        <Metric label="Concentrated categories" value={data.metrics.supplierConcentration} />\n      </div>\n\n      <section className={`${card} mt-6`}>\n        <h2 className="text-xl font-black">Create category strategy</h2>\n        <form action={createCategoryStrategyAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">\n          <input className={input} name="categoryCode" placeholder="Category code" />\n          <input className={input} name="categoryName" placeholder="Category name" required />\n          <input className={input} name="title" placeholder="Strategy title" required />\n          <select className={input} name="executiveSponsorUserId">\n            <option value="">No executive sponsor</option>\n            {data.members.map((membership) => (\n              <option key={membership.id} value={membership.userId}>\n                {membership.user.name ?? membership.user.email}\n              </option>\n            ))}\n          </select>\n          <input className={input} name="periodStart" type="date" required />\n          <input className={input} name="periodEnd" type="date" required />\n          <input className={input} name="currencyCode" defaultValue="USD" />\n          <input className={input} name="addressableSpend" type="number" step="0.01" placeholder="Addressable spend" />\n          <input className={input} name="managedSpend" type="number" step="0.01" placeholder="Managed spend" />\n          <input className={input} name="supplierCount" type="number" min="0" defaultValue="0" />\n          <input className={input} name="preferredSupplierCount" type="number" min="0" defaultValue="0" />\n          <input className={input} name="savingsTarget" type="number" step="0.01" placeholder="Savings target" />\n          <textarea className={`${input} min-h-24 md:col-span-2`} name="description" placeholder="Strategy description" required />\n          <textarea className={`${input} min-h-20`} name="riskSummary" placeholder="Risk summary" />\n          <textarea className={`${input} min-h-20`} name="demandDrivers" placeholder="Demand drivers" />\n          <textarea className={`${input} min-h-20`} name="supplyMarketSummary" placeholder="Supply market summary" />\n          <textarea className={`${input} min-h-20`} name="strategicObjectives" placeholder="Strategic objectives" />\n          <textarea className={`${input} min-h-20`} name="supplierApproach" placeholder="Supplier approach" />\n          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">\n            Create strategy\n          </button>\n        </form>\n      </section>\n\n      <section className={`${card} mt-6`}>\n        <h2 className="text-xl font-black">Category portfolio</h2>\n        <div className="mt-5 space-y-6">\n          {data.strategies.map((strategy) => (\n            <article key={strategy.id} className="rounded-2xl bg-slate-50 p-5">\n              <p className="text-xs font-black text-blue-700">\n                {strategy.categoryCode ?? strategy.category} · {strategy.status}\n              </p>\n              <h3 className="mt-2 text-lg font-black">\n                {strategy.title ?? strategy.name}\n              </h3>\n              <p className="mt-2 text-sm text-slate-500">\n                {strategy.categoryName ?? strategy.category} · Addressable $\n                {Number(strategy.addressableSpend).toLocaleString()} ·{" "}\n                {strategy.opportunities.length} opportunities\n              </p>\n\n              {strategy.status !== "ACTIVE" ? (\n                <form action={approveCategoryStrategyAction} className="mt-4">\n                  <input type="hidden" name="strategyId" value={strategy.id} />\n                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">\n                    Approve and activate\n                  </button>\n                </form>\n              ) : null}\n\n              <div className="mt-5 grid gap-5 xl:grid-cols-2">\n                <form action={addCategoryOpportunityAction} className="grid gap-3">\n                  <input type="hidden" name="categoryStrategyId" value={strategy.id} />\n                  <input className={input} name="title" placeholder="Opportunity title" required />\n                  <textarea className={`${input} min-h-20`} name="description" placeholder="Description" required />\n                  <select className={input} name="type">\n                    <option>SOURCING</option>\n                    <option>RENEGOTIATION</option>\n                    <option>DEMAND_MANAGEMENT</option>\n                    <option>SPECIFICATION_OPTIMIZATION</option>\n                    <option>SUPPLIER_CONSOLIDATION</option>\n                    <option>PROCESS_IMPROVEMENT</option>\n                    <option>RISK_REDUCTION</option>\n                    <option>SUSTAINABILITY</option>\n                    <option>OTHER</option>\n                  </select>\n                  <input className={input} name="estimatedValue" type="number" step="0.01" placeholder="Estimated value" />\n                  <input className={input} name="probabilityPercent" type="number" min="0" max="100" defaultValue="50" />\n                  <input className={input} name="complexityScore" type="number" min="1" max="5" defaultValue="3" />\n                  <input className={input} name="riskScore" type="number" min="1" max="5" defaultValue="3" />\n                  <select className={input} name="ownerUserId">\n                    <option value="">Assign creator</option>\n                    {data.members.map((membership) => (\n                      <option key={membership.id} value={membership.userId}>\n                        {membership.user.name ?? membership.user.email}\n                      </option>\n                    ))}\n                  </select>\n                  <input className={input} name="targetStartAt" type="date" />\n                  <input className={input} name="targetCompletionAt" type="date" />\n                  <input className={input} name="assumptions" placeholder="Assumptions" />\n                  <input className={input} name="blockers" placeholder="Blockers" />\n                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">\n                    Add opportunity\n                  </button>\n                </form>\n\n                <form action={addCategoryMarketSignalAction} className="grid gap-3">\n                  <input type="hidden" name="categoryStrategyId" value={strategy.id} />\n                  <select className={input} name="type">\n                    <option>PRICE</option>\n                    <option>CAPACITY</option>\n                    <option>SUPPLY_RISK</option>\n                    <option>REGULATORY</option>\n                    <option>TECHNOLOGY</option>\n                    <option>GEOPOLITICAL</option>\n                    <option>SUSTAINABILITY</option>\n                    <option>LABOR</option>\n                    <option>OTHER</option>\n                  </select>\n                  <select className={input} name="direction">\n                    <option>POSITIVE</option>\n                    <option>NEUTRAL</option>\n                    <option>NEGATIVE</option>\n                  </select>\n                  <input className={input} name="title" placeholder="Signal title" required />\n                  <textarea className={`${input} min-h-20`} name="description" placeholder="Signal description" required />\n                  <input className={input} name="source" placeholder="Source" />\n                  <input className={input} name="sourceUrl" type="url" placeholder="Source URL" />\n                  <input className={input} name="confidencePercent" type="number" min="0" max="100" defaultValue="50" />\n                  <input className={input} name="impactScore" type="number" min="1" max="5" defaultValue="3" />\n                  <input className={input} name="observedAt" type="date" required />\n                  <input className={input} name="expiresAt" type="date" />\n                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">\n                    Add market signal\n                  </button>\n                </form>\n              </div>\n            </article>\n          ))}\n        </div>\n      </section>\n    </div>\n  );\n}\n\nfunction Metric({\n  label,\n  value,\n  money = false,\n}: {\n  label: string;\n  value: number;\n  money?: boolean;\n}) {\n  return (\n    <article className={card}>\n      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">\n        {label}\n      </p>\n      <p className="mt-2 text-3xl font-black">\n        {money ? `$${value.toLocaleString()}` : value}\n      </p>\n    </article>\n  );\n}\n')

print("Phase 28 category-management upgrade applied.")
