import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function number(value: unknown) {
  return value === null || value === undefined ? 0 : Number(value);
}

export async function getProcurementCommandCenter() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const now = new Date();
  const renewalWindow = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);

  const [
    tenant,
    purchaseRequests,
    suppliers,
    contracts,
    sourcingEvents,
    aiExecutions,
  ] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.purchaseRequest.findMany({
      where: { tenantId },
      include: {
        lines: true,
        legalEntity: true,
        department: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      include: {
        contracts: {
          select: {
            status: true,
            totalValue: true,
            currencyCode: true,
          },
        },
        documents: {
          select: {
            status: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { legalName: "asc" },
    }),
    prisma.contract.findMany({
      where: { tenantId },
      include: { supplier: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sourcingEvent.findMany({
      where: { tenantId },
      include: {
        responses: true,
        invitations: true,
        award: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aiExecution.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  if (!tenant) redirect("/app/settings/organization");

  const approvedSpendUsd = purchaseRequests
    .filter((request) => ["APPROVED", "FULFILLED"].includes(request.status))
    .reduce((sum, request) => sum + number(request.usdEquivalent), 0);

  const pipelineSpendUsd = purchaseRequests
    .filter((request) =>
      ["DRAFT", "SUBMITTED", "IN_REVIEW"].includes(request.status),
    )
    .reduce((sum, request) => sum + number(request.usdEquivalent), 0);

  const activeContractValue = contracts
    .filter((contract) => ["APPROVED", "ACTIVE"].includes(contract.status))
    .reduce((sum, contract) => sum + number(contract.totalValue), 0);

  const expiringContracts = contracts.filter(
    (contract) =>
      contract.endDate &&
      contract.endDate >= now &&
      contract.endDate <= renewalWindow &&
      ["APPROVED", "ACTIVE"].includes(contract.status),
  );

  const highRiskSuppliers = suppliers.filter((supplier) =>
    ["HIGH", "CRITICAL"].includes(supplier.riskTier),
  );

  const suppliersWithExpiredEvidence = suppliers.filter((supplier) =>
    supplier.documents.some(
      (document) =>
        document.status === "EXPIRED" ||
        (document.expiresAt && document.expiresAt < now),
    ),
  );

  const categorySpend = new Map<string, number>();
  for (const request of purchaseRequests) {
    for (const line of request.lines) {
      const category = line.category?.trim() || "Uncategorized";
      const usdLineValue =
        number(line.lineTotal) * number(request.exchangeRateToUsd);
      categorySpend.set(
        category,
        (categorySpend.get(category) ?? 0) + usdLineValue,
      );
    }
  }

  const categoryBreakdown = [...categorySpend.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 10);

  const supplierExposure = suppliers
    .map((supplier) => ({
      id: supplier.id,
      name: supplier.tradingName ?? supplier.legalName,
      riskTier: supplier.riskTier,
      value: supplier.contracts
        .filter((contract) =>
          ["APPROVED", "ACTIVE"].includes(contract.status),
        )
        .reduce((sum, contract) => sum + number(contract.totalValue), 0),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 10);

  const totalSupplierExposure = supplierExposure.reduce(
    (sum, supplier) => sum + supplier.value,
    0,
  );

  const sourcingPipeline = sourcingEvents.reduce<Record<string, number>>(
    (summary, event) => {
      summary[event.status] = (summary[event.status] ?? 0) + 1;
      return summary;
    },
    {},
  );

  const competitiveEvents = sourcingEvents.filter(
    (event) => event.responses.length >= 2,
  );
  const averageBidParticipation =
    sourcingEvents.length === 0
      ? 0
      : sourcingEvents.reduce(
          (sum, event) => sum + event.responses.length,
          0,
        ) / sourcingEvents.length;

  const acceptedAi = aiExecutions.filter(
    (execution) => execution.reviewStatus === "ACCEPTED",
  ).length;
  const completedAi = aiExecutions.filter(
    (execution) => execution.status === "COMPLETED",
  ).length;

  const savingsOpportunities = [
    ...categoryBreakdown
      .filter((item) => item.value > 0)
      .slice(0, 3)
      .map((item) => ({
        title: `Consolidate ${item.category} demand`,
        description:
          `This category represents ${formatMoney(item.value, "USD")} in recorded demand. ` +
          "Review fragmented requests, preferred suppliers and sourcing-event coverage.",
        potentialUsd: item.value * 0.05,
        type: "CATEGORY_CONSOLIDATION",
      })),
    ...supplierExposure
      .filter(
        (supplier) =>
          totalSupplierExposure > 0 &&
          supplier.value / totalSupplierExposure >= 0.25,
      )
      .slice(0, 2)
      .map((supplier) => ({
        title: `Reduce concentration with ${supplier.name}`,
        description:
          "A significant share of active contract value is concentrated with this supplier. " +
          "Evaluate dual sourcing, capacity resilience and negotiated volume tiers.",
        potentialUsd: supplier.value * 0.03,
        type: "SUPPLIER_CONCENTRATION",
      })),
  ];

  return {
    tenant,
    metrics: {
      approvedSpendUsd,
      pipelineSpendUsd,
      activeContractValue,
      activeContracts: contracts.filter((contract) => contract.status === "ACTIVE")
        .length,
      expiringContracts: expiringContracts.length,
      totalSuppliers: suppliers.length,
      approvedSuppliers: suppliers.filter(
        (supplier) => supplier.status === "APPROVED",
      ).length,
      highRiskSuppliers: highRiskSuppliers.length,
      suppliersWithExpiredEvidence: suppliersWithExpiredEvidence.length,
      sourcingEvents: sourcingEvents.length,
      competitiveEvents: competitiveEvents.length,
      averageBidParticipation,
      aiExecutions: aiExecutions.length,
      completedAi,
      acceptedAi,
    },
    categoryBreakdown,
    supplierExposure,
    totalSupplierExposure,
    sourcingPipeline,
    savingsOpportunities,
    expiringContracts,
    highRiskSuppliers,
    recentRequests: purchaseRequests.slice(0, 8),
    recentAiExecutions: aiExecutions.slice(0, 8),
  };
}

export function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
