import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { publishDomainEvent } from "@/core/events";
import { recordEnterpriseActivity } from "@/core/activity";
import { dailyAnalyticsPeriod } from "@/core/enterprise-analytics/periods";
import type {
  Contract,
  PurchaseOrder,
  PurchaseRequest,
  RequisitionApprovalStep,
  SavingsInitiative,
  Supplier,
  SupplierInvoice,
} from "@/generated/prisma/client";

const DAY = 86_400_000;
const HOUR = 3_600_000;

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function average(values: number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function hoursBetween(start: Date | null, end: Date | null) {
  if (!start || !end) return null;
  return Math.max(0, (end.getTime() - start.getTime()) / HOUR);
}

type ApprovalStepWithRoute = RequisitionApprovalStep & {
  route: {
    tenantId: string;
    createdAt: Date;
  };
};

type SupplierSpendRow = {
  supplierId: string;
  supplierName: string;
  spend: number;
  sharePercent: number;
};

export async function calculateProcurementIntelligence(tenantId: string) {
  const now = new Date();
  const lookback = new Date(now.getTime() - 365 * DAY);

  const [
    purchaseRequests,
    purchaseOrders,
    approvalSteps,
    suppliers,
    contracts,
    savingsInitiatives,
    invoices,
  ] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.requisitionApprovalStep.findMany({
      where: {
        route: {
          tenantId,
        },
        createdAt: { gte: lookback },
      },
      include: {
        route: {
          select: {
            tenantId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contract.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.savingsInitiative.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplierInvoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: lookback },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const requisitionCycleHours = average(
    purchaseRequests
      .map((item: PurchaseRequest) =>
        hoursBetween(
          item.createdAt,
          item.approvedAt ?? item.updatedAt,
        ),
      )
      .filter((value: number | null): value is number => value !== null),
  );

  const purchaseOrderCycleHours = average(
    purchaseOrders
      .map((item: PurchaseOrder) =>
        hoursBetween(
          item.createdAt,
          item.issuedAt ?? item.updatedAt,
        ),
      )
      .filter((value: number | null): value is number => value !== null),
  );

  const typedApprovalSteps =
    approvalSteps as ApprovalStepWithRoute[];

  const completedApprovalSteps = typedApprovalSteps.filter(
    (step: ApprovalStepWithRoute) => step.completedAt !== null,
  );

  const approvalCycleHours = average(
    completedApprovalSteps
      .map((step: ApprovalStepWithRoute) =>
        hoursBetween(step.createdAt, step.completedAt),
      )
      .filter((value: number | null): value is number => value !== null),
  );

  const pendingApprovalSteps = typedApprovalSteps.filter(
    (step: ApprovalStepWithRoute) => step.completedAt === null,
  );

  const agedApprovals = pendingApprovalSteps.filter(
    (step: ApprovalStepWithRoute) =>
      now.getTime() - step.createdAt.getTime() >= 48 * HOUR,
  );

  const totalPoValue = purchaseOrders.reduce(
    (sum: number, po: PurchaseOrder) =>
      sum + Number(po.usdEquivalent ?? po.totalAmount ?? 0),
    0,
  );

  const totalInvoiceValue = invoices.reduce(
    (sum: number, invoice: SupplierInvoice) =>
      sum + Number(invoice.usdEquivalent ?? invoice.totalAmount ?? 0),
    0,
  );

  const identifiedSavings = savingsInitiatives.reduce(
    (sum: number, initiative: SavingsInitiative) =>
      sum + Number(initiative.targetSavings ?? 0),
    0,
  );

  const validatedSavings = savingsInitiatives.reduce(
    (sum: number, initiative: SavingsInitiative) =>
      sum + Number(initiative.validatedSavings ?? 0),
    0,
  );

  const realizedSavings = savingsInitiatives.reduce(
    (sum: number, initiative: SavingsInitiative) =>
      sum + Number(initiative.realizedSavings ?? 0),
    0,
  );

  const savingsRealizationRate = percentage(
    realizedSavings,
    identifiedSavings,
  );

  const savingsValidationRate = percentage(
    validatedSavings,
    identifiedSavings,
  );

  const activeContracts = contracts.filter((contract: Contract) =>
    ["ACTIVE"].includes(contract.status),
  );

  const contractCoverage = percentage(
    purchaseOrders.filter((po: PurchaseOrder) => Boolean(po.contractId)).length,
    purchaseOrders.length,
  );

  const activeSuppliers = suppliers.filter((supplier: Supplier) =>
    ["APPROVED"].includes(supplier.status),
  );

  const spendBySupplier = new Map<string, number>();

  for (const po of purchaseOrders) {
    spendBySupplier.set(
      po.supplierId,
      (spendBySupplier.get(po.supplierId) ?? 0) +
        Number(po.usdEquivalent ?? po.totalAmount ?? 0),
    );
  }

  const maxSupplierSpend = Math.max(
    0,
    ...Array.from(spendBySupplier.values()),
  );

  const supplierConcentration = percentage(
    maxSupplierSpend,
    totalPoValue,
  );

  const priceVariance = totalInvoiceValue - totalPoValue;
  const priceVariancePercent =
    totalPoValue !== 0
      ? (priceVariance / Math.abs(totalPoValue)) * 100
      : 0;

  const matchedInvoices = invoices.filter(
    (invoice: SupplierInvoice) =>
      invoice.matchStatus === "MATCHED",
  ).length;

  const invoiceMatchRate = percentage(
    matchedInvoices,
    invoices.length,
  );

  const procurementHealthScore = Math.max(
    0,
    Math.round(
      100 -
        Math.min(agedApprovals.length * 3, 20) -
        Math.min(Math.max(0, 100 - contractCoverage) * 0.15, 15) -
        Math.min(Math.max(0, 100 - savingsRealizationRate) * 0.15, 15) -
        Math.min(Math.abs(priceVariancePercent) * 0.6, 15) -
        Math.min(Math.max(0, supplierConcentration - 40) * 0.5, 15),
    ),
  );

  const topSuppliers: SupplierSpendRow[] =
    Array.from(spendBySupplier.entries())
      .map(([supplierId, spend]) => {
        const supplier = suppliers.find(
          (row: Supplier) => row.id === supplierId,
        );

        return {
          supplierId,
          supplierName:
            supplier?.tradingName ??
            supplier?.legalName ??
            supplierId,
          spend,
          sharePercent: percentage(spend, totalPoValue),
        };
      })
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);

  return {
    calculatedAt: now,
    lookbackDays: 365,
    summary: {
      purchaseRequestCount: purchaseRequests.length,
      purchaseOrderCount: purchaseOrders.length,
      pendingApprovalSteps: pendingApprovalSteps.length,
      agedApprovalSteps: agedApprovals.length,
      requisitionCycleHours,
      approvalCycleHours,
      purchaseOrderCycleHours,
      totalPoValue,
      totalInvoiceValue,
      identifiedSavings,
      validatedSavings,
      realizedSavings,
      savingsValidationRate,
      savingsRealizationRate,
      activeContracts: activeContracts.length,
      contractCoverage,
      activeSuppliers: activeSuppliers.length,
      supplierConcentration,
      priceVariance,
      priceVariancePercent,
      invoiceMatchRate,
      procurementHealthScore,
    },
    topSuppliers,
    agedApprovals,
  };
}

const metricDefinitions = [
  {
    metricKey: "procurement.intelligence.health_score",
    name: "Procurement Health Score",
    description:
      "Composite procurement health across approvals, savings, contracts and supplier concentration.",
    metricType: "SCORE" as const,
    unit: "score",
    higherIsBetter: true,
  },
  {
    metricKey: "procurement.intelligence.requisition_cycle_hours",
    name: "Purchase Request Cycle Time",
    description:
      "Average elapsed hours from purchase-request creation through approval.",
    metricType: "DURATION" as const,
    unit: "hours",
    higherIsBetter: false,
  },
  {
    metricKey: "procurement.intelligence.approval_cycle_hours",
    name: "Approval Cycle Time",
    description:
      "Average elapsed hours for completed requisition approval steps.",
    metricType: "DURATION" as const,
    unit: "hours",
    higherIsBetter: false,
  },
  {
    metricKey: "procurement.intelligence.po_cycle_hours",
    name: "Purchase Order Cycle Time",
    description:
      "Average elapsed hours from purchase-order creation through issue.",
    metricType: "DURATION" as const,
    unit: "hours",
    higherIsBetter: false,
  },
  {
    metricKey: "procurement.intelligence.contract_coverage",
    name: "Contract Coverage",
    description:
      "Purchase orders associated with governed contracts.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: true,
  },
  {
    metricKey: "procurement.intelligence.savings_realization",
    name: "Savings Realization",
    description:
      "Realized savings divided by target savings.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: true,
  },
  {
    metricKey: "procurement.intelligence.savings_validation",
    name: "Savings Validation",
    description:
      "Validated savings divided by target savings.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: true,
  },
  {
    metricKey: "procurement.intelligence.supplier_concentration",
    name: "Supplier Concentration",
    description:
      "Share of purchase-order spend represented by the largest supplier.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: false,
  },
  {
    metricKey: "procurement.intelligence.price_variance_percent",
    name: "Invoice-to-PO Value Variance",
    description:
      "Invoice value variance against purchase-order value.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: false,
  },
  {
    metricKey: "procurement.intelligence.invoice_match_rate",
    name: "Invoice Match Rate",
    description:
      "Supplier invoices with MATCHED status divided by total invoices.",
    metricType: "PERCENTAGE" as const,
    unit: "%",
    higherIsBetter: true,
  },
  {
    metricKey: "procurement.intelligence.aged_approvals",
    name: "Aged Approval Steps",
    description:
      "Incomplete requisition approval steps older than 48 hours.",
    metricType: "COUNT" as const,
    unit: "steps",
    higherIsBetter: false,
  },
  {
    metricKey: "procurement.intelligence.total_po_value",
    name: "Purchase Order Value",
    description:
      "Total purchase-order USD equivalent value in the analysis period.",
    metricType: "CURRENCY" as const,
    unit: "currency",
    higherIsBetter: false,
  },
];

export async function publishProcurementIntelligenceMetrics(input: {
  tenantId: string;
  actorUserId: string;
}) {
  const intelligence = await calculateProcurementIntelligence(input.tenantId);
  const period = dailyAnalyticsPeriod();

  const values = new Map<string, number>([
    [
      "procurement.intelligence.health_score",
      intelligence.summary.procurementHealthScore,
    ],
    [
      "procurement.intelligence.requisition_cycle_hours",
      intelligence.summary.requisitionCycleHours,
    ],
    [
      "procurement.intelligence.approval_cycle_hours",
      intelligence.summary.approvalCycleHours,
    ],
    [
      "procurement.intelligence.po_cycle_hours",
      intelligence.summary.purchaseOrderCycleHours,
    ],
    [
      "procurement.intelligence.contract_coverage",
      intelligence.summary.contractCoverage,
    ],
    [
      "procurement.intelligence.savings_realization",
      intelligence.summary.savingsRealizationRate,
    ],
    [
      "procurement.intelligence.savings_validation",
      intelligence.summary.savingsValidationRate,
    ],
    [
      "procurement.intelligence.supplier_concentration",
      intelligence.summary.supplierConcentration,
    ],
    [
      "procurement.intelligence.price_variance_percent",
      intelligence.summary.priceVariancePercent,
    ],
    [
      "procurement.intelligence.invoice_match_rate",
      intelligence.summary.invoiceMatchRate,
    ],
    [
      "procurement.intelligence.aged_approvals",
      intelligence.summary.agedApprovalSteps,
    ],
    [
      "procurement.intelligence.total_po_value",
      intelligence.summary.totalPoValue,
    ],
  ]);

  for (const definition of metricDefinitions) {
    const metric =
      await prisma.enterpriseAnalyticsMetricDefinition.upsert({
        where: {
          tenantId_metricKey: {
            tenantId: input.tenantId,
            metricKey: definition.metricKey,
          },
        },
        create: {
          tenantId: input.tenantId,
          metricKey: definition.metricKey,
          name: definition.name,
          description: definition.description,
          domain: "Procurement",
          category: "Intelligence",
          metricType: definition.metricType,
          unit: definition.unit,
          currencyCode:
            definition.metricType === "CURRENCY" ? "USD" : null,
          higherIsBetter: definition.higherIsBetter,
          calculationVersion: "B2.8.4-R2",
          sourceModule: "procurement-intelligence",
          drilldownPath: "/app/executive/procurement-intelligence",
          metadata: toJson({
            methodology: "Procurement operational intelligence",
            lookbackDays: intelligence.lookbackDays,
          }),
        },
        update: {
          name: definition.name,
          description: definition.description,
          metricType: definition.metricType,
          unit: definition.unit,
          higherIsBetter: definition.higherIsBetter,
          calculationVersion: "B2.8.4-R2",
          active: true,
        },
      });

    const value = values.get(definition.metricKey) ?? 0;

    const previous =
      await prisma.enterpriseAnalyticsMetricSnapshot.findFirst({
        where: {
          tenantId: input.tenantId,
          metricDefinitionId: metric.id,
          dimensionKey: "ALL",
          periodStart: { lt: period.periodStart },
        },
        orderBy: { periodStart: "desc" },
      });

    const previousValue =
      previous !== null ? Number(previous.numericValue) : null;

    await prisma.enterpriseAnalyticsMetricSnapshot.upsert({
      where: {
        tenantId_metricDefinitionId_periodType_periodStart_dimensionKey: {
          tenantId: input.tenantId,
          metricDefinitionId: metric.id,
          periodType: period.periodType,
          periodStart: period.periodStart,
          dimensionKey: "ALL",
        },
      },
      create: {
        tenantId: input.tenantId,
        metricDefinitionId: metric.id,
        periodType: period.periodType,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        numericValue: value,
        previousValue,
        trendDirection:
          previousValue === null
            ? "NOT_AVAILABLE"
            : value > previousValue
              ? "UP"
              : value < previousValue
                ? "DOWN"
                : "FLAT",
        healthStatus: "NOT_AVAILABLE",
        dimensionKey: "ALL",
        dimensions: toJson({
          scope: "enterprise",
          lookbackDays: intelligence.lookbackDays,
        }),
        calculationVersion: "B2.8.4-R2",
        sourceRecordCount:
          intelligence.summary.purchaseRequestCount +
          intelligence.summary.purchaseOrderCount,
      },
      update: {
        numericValue: value,
        previousValue,
        trendDirection:
          previousValue === null
            ? "NOT_AVAILABLE"
            : value > previousValue
              ? "UP"
              : value < previousValue
                ? "DOWN"
                : "FLAT",
        dimensions: toJson({
          scope: "enterprise",
          lookbackDays: intelligence.lookbackDays,
        }),
        calculationVersion: "B2.8.4-R2",
        sourceRecordCount:
          intelligence.summary.purchaseRequestCount +
          intelligence.summary.purchaseOrderCount,
        calculatedAt: new Date(),
      },
    });
  }

  await publishDomainEvent({
    tenantId: input.tenantId,
    eventType: "ProcurementIntelligence.Published",
    aggregateType: "ProcurementIntelligence",
    aggregateId: input.tenantId,
    sourceModule: "procurement-intelligence",
    actorUserId: input.actorUserId,
    payload: {
      procurementHealthScore: intelligence.summary.procurementHealthScore,
      contractCoverage: intelligence.summary.contractCoverage,
      savingsRealizationRate: intelligence.summary.savingsRealizationRate,
      invoiceMatchRate: intelligence.summary.invoiceMatchRate,
      agedApprovalSteps: intelligence.summary.agedApprovalSteps,
    },
  });

  await recordEnterpriseActivity({
    tenantId: input.tenantId,
    activityType: "ProcurementIntelligence.Published",
    sourceModule: "procurement-intelligence",
    title: "Procurement intelligence refreshed",
    description: `Health score ${intelligence.summary.procurementHealthScore}`,
    severity: "SUCCESS",
    actorUserId: input.actorUserId,
    subjectType: "ProcurementIntelligence",
    subjectId: input.tenantId,
    subjectLabel: "Procurement Intelligence",
    actionUrl: "/app/executive/procurement-intelligence",
  });

  return intelligence;
}
