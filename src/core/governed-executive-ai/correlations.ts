import { prisma } from "@/lib/prisma";
import type { DeterministicExecutiveInsightCandidate } from "./types";

function latestValue(
  latest: Map<string, number>,
  key: string,
) {
  return latest.get(key) ?? 0;
}

export async function evaluateCrossDomainCorrelations(input: {
  tenantId: string;
}) {
  const snapshots =
    await prisma.enterpriseAnalyticsMetricSnapshot.findMany({
      where: {
        tenantId: input.tenantId,
        dimensionKey: "ALL",
      },
      include: {
        metricDefinition: true,
      },
      orderBy: { calculatedAt: "desc" },
      take: 1000,
    });

  const latest = new Map<string, number>();
  const snapshotByKey = new Map<
    string,
    (typeof snapshots)[number]
  >();

  for (const snapshot of snapshots) {
    const key = snapshot.metricDefinition.metricKey;
    if (!latest.has(key)) {
      latest.set(key, Number(snapshot.numericValue));
      snapshotByKey.set(key, snapshot);
    }
  }

  const insights: DeterministicExecutiveInsightCandidate[] = [];

  const inventoryHealth = latestValue(
    latest,
    "inventory.intelligence.health_score",
  );
  const warehouseHealth = latestValue(
    latest,
    "warehouse.intelligence.health_score",
  );
  const procurementHealth = latestValue(
    latest,
    "procurement.intelligence.health_score",
  );
  const deadStock = latestValue(
    latest,
    "inventory.intelligence.dead_stock",
  );
  const overstock = latestValue(
    latest,
    "inventory.intelligence.overstock",
  );
  const understock = latestValue(
    latest,
    "inventory.intelligence.understock",
  );
  const fillRate = latestValue(
    latest,
    "inventory.intelligence.fill_rate",
  );
  const shortPickRate = latestValue(
    latest,
    "warehouse.intelligence.short_pick_rate",
  );
  const receivingAcceptance = latestValue(
    latest,
    "warehouse.intelligence.receiving_acceptance_rate",
  );
  const agedApprovals = latestValue(
    latest,
    "procurement.intelligence.aged_approvals",
  );
  const contractCoverage = latestValue(
    latest,
    "procurement.intelligence.contract_coverage",
  );
  const supplierConcentration = latestValue(
    latest,
    "procurement.intelligence.supplier_concentration",
  );
  const savingsRealization = latestValue(
    latest,
    "procurement.intelligence.savings_realization",
  );

  if (
    understock > 0 &&
    agedApprovals > 0 &&
    fillRate < 95
  ) {
    insights.push({
      insightKey: "correlation.procurement_delay_inventory_service",
      type: "RISK",
      severity:
        fillRate < 85 || understock >= 10 ? "CRITICAL" : "HIGH",
      title: "Approval delays may be contributing to inventory service risk",
      executiveSummary:
        "Understock, aged procurement approvals and reduced fill rate are occurring together.",
      explanation:
        `Enorsis detected ${understock} understocked items, ${agedApprovals} aged approval steps and a fill rate of ${fillRate.toFixed(1)}%. This combination indicates that procurement latency may be constraining replenishment and service performance.`,
      recommendation:
        "Prioritize aged approvals affecting replenishment-critical items and review expedited sourcing options.",
      confidenceScore: 91,
      domain: "Cross-Domain",
      category: "Procurement-to-Inventory",
      sourceModule: "governed-executive-ai",
      requiresHumanReview: true,
      evidence: [
        {
          metricKey: "inventory.intelligence.understock",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("inventory.intelligence.understock")?.id ?? null,
          label: "Understock Items",
          observedValue: String(understock),
        },
        {
          metricKey: "procurement.intelligence.aged_approvals",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("procurement.intelligence.aged_approvals")?.id ??
            null,
          label: "Aged Approval Steps",
          observedValue: String(agedApprovals),
        },
        {
          metricKey: "inventory.intelligence.fill_rate",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("inventory.intelligence.fill_rate")?.id ?? null,
          label: "Inventory Fill Rate",
          observedValue: String(fillRate),
          expectedValue: "95",
        },
      ],
    });
  }

  if (
    overstock > 0 &&
    deadStock > 0 &&
    savingsRealization < 80
  ) {
    insights.push({
      insightKey: "correlation.inventory_cash_savings",
      type: "OPPORTUNITY",
      severity: "HIGH",
      title: "Inventory rationalization could improve realized procurement value",
      executiveSummary:
        "Overstock and dead stock coexist with under-realized procurement savings.",
      explanation:
        `The platform shows ${overstock} overstocked items, ${deadStock} dead-stock items and savings realization of ${savingsRealization.toFixed(1)}%. This suggests working capital may remain trapped despite sourcing value initiatives.`,
      recommendation:
        "Prioritize excess-stock disposition, purchasing controls and demand-plan alignment for high-value inventory classes.",
      confidenceScore: 89,
      domain: "Cross-Domain",
      category: "Working Capital",
      sourceModule: "governed-executive-ai",
      evidence: [
        {
          metricKey: "inventory.intelligence.overstock",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("inventory.intelligence.overstock")?.id ?? null,
          label: "Overstock Items",
          observedValue: String(overstock),
        },
        {
          metricKey: "inventory.intelligence.dead_stock",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("inventory.intelligence.dead_stock")?.id ?? null,
          label: "Dead Stock Items",
          observedValue: String(deadStock),
        },
        {
          metricKey: "procurement.intelligence.savings_realization",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("procurement.intelligence.savings_realization")
              ?.id ?? null,
          label: "Savings Realization",
          observedValue: String(savingsRealization),
          expectedValue: "80",
        },
      ],
    });
  }

  if (
    shortPickRate >= 5 &&
    understock > 0 &&
    warehouseHealth < 80
  ) {
    insights.push({
      insightKey: "correlation.short_pick_inventory_constraint",
      type: "RISK",
      severity: shortPickRate >= 10 ? "CRITICAL" : "HIGH",
      title: "Warehouse short picks are aligned with inventory availability constraints",
      executiveSummary:
        "Short-pick activity and understock conditions are jointly degrading warehouse performance.",
      explanation:
        `Short-pick rate is ${shortPickRate.toFixed(1)}%, ${understock} items are understocked and Warehouse Health Score is ${warehouseHealth.toFixed(0)}.`,
      recommendation:
        "Review replenishment priorities, reservation conflicts and high-frequency short-pick SKUs.",
      confidenceScore: 94,
      domain: "Cross-Domain",
      category: "Inventory-to-Warehouse",
      sourceModule: "governed-executive-ai",
      requiresHumanReview: shortPickRate >= 10,
      evidence: [
        {
          metricKey: "warehouse.intelligence.short_pick_rate",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("warehouse.intelligence.short_pick_rate")?.id ??
            null,
          label: "Short Pick Rate",
          observedValue: String(shortPickRate),
        },
        {
          metricKey: "inventory.intelligence.understock",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("inventory.intelligence.understock")?.id ?? null,
          label: "Understock Items",
          observedValue: String(understock),
        },
        {
          metricKey: "warehouse.intelligence.health_score",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("warehouse.intelligence.health_score")?.id ??
            null,
          label: "Warehouse Health Score",
          observedValue: String(warehouseHealth),
          expectedValue: "80",
        },
      ],
    });
  }

  if (
    receivingAcceptance < 95 &&
    supplierConcentration > 40
  ) {
    insights.push({
      insightKey: "correlation.supplier_concentration_receiving_quality",
      type: "RISK",
      severity:
        receivingAcceptance < 90 && supplierConcentration > 60
          ? "CRITICAL"
          : "HIGH",
      title: "Supplier concentration is amplifying receiving-quality exposure",
      executiveSummary:
        "A concentrated supply base coincides with reduced receiving acceptance.",
      explanation:
        `Supplier concentration is ${supplierConcentration.toFixed(1)}% while receiving acceptance is ${receivingAcceptance.toFixed(1)}%. Dependence on a dominant supplier may increase operational exposure when inbound quality deteriorates.`,
      recommendation:
        "Review supplier performance for the dominant spend source and assess alternate-source readiness.",
      confidenceScore: 88,
      domain: "Cross-Domain",
      category: "Supplier-to-Warehouse",
      sourceModule: "governed-executive-ai",
      requiresHumanReview:
        receivingAcceptance < 90 && supplierConcentration > 60,
      evidence: [
        {
          metricKey: "procurement.intelligence.supplier_concentration",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get(
              "procurement.intelligence.supplier_concentration",
            )?.id ?? null,
          label: "Supplier Concentration",
          observedValue: String(supplierConcentration),
          expectedValue: "40",
        },
        {
          metricKey: "warehouse.intelligence.receiving_acceptance_rate",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get(
              "warehouse.intelligence.receiving_acceptance_rate",
            )?.id ?? null,
          label: "Receiving Acceptance Rate",
          observedValue: String(receivingAcceptance),
          expectedValue: "95",
        },
      ],
    });
  }

  if (
    contractCoverage < 70 &&
    supplierConcentration > 50
  ) {
    insights.push({
      insightKey: "correlation.contract_coverage_supplier_dependency",
      type: "GOVERNANCE",
      severity: "HIGH",
      title: "Supplier dependency is insufficiently protected by contract coverage",
      executiveSummary:
        "High supplier concentration is occurring alongside limited contract coverage.",
      explanation:
        `Supplier concentration is ${supplierConcentration.toFixed(1)}% and contract coverage is ${contractCoverage.toFixed(1)}%. Concentrated spend without sufficient contractual governance can increase commercial and continuity risk.`,
      recommendation:
        "Prioritize contract coverage for strategic and concentrated supplier spend.",
      confidenceScore: 90,
      domain: "Cross-Domain",
      category: "Commercial Governance",
      sourceModule: "governed-executive-ai",
      requiresHumanReview: true,
      evidence: [
        {
          metricKey: "procurement.intelligence.contract_coverage",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("procurement.intelligence.contract_coverage")
              ?.id ?? null,
          label: "Contract Coverage",
          observedValue: String(contractCoverage),
          expectedValue: "70",
        },
        {
          metricKey: "procurement.intelligence.supplier_concentration",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get(
              "procurement.intelligence.supplier_concentration",
            )?.id ?? null,
          label: "Supplier Concentration",
          observedValue: String(supplierConcentration),
          expectedValue: "50",
        },
      ],
    });
  }

  if (
    inventoryHealth >= 85 &&
    warehouseHealth >= 85 &&
    procurementHealth >= 85
  ) {
    insights.push({
      insightKey: "correlation.enterprise_operating_strength",
      type: "OPPORTUNITY",
      severity: "LOW",
      title: "Core procurement and inventory operations are performing strongly",
      executiveSummary:
        "Inventory, warehouse and procurement health scores are simultaneously strong.",
      explanation:
        `Inventory Health is ${inventoryHealth.toFixed(0)}, Warehouse Health is ${warehouseHealth.toFixed(0)} and Procurement Health is ${procurementHealth.toFixed(0)}.`,
      recommendation:
        "Capture the operating practices behind these results and consider using them as internal benchmarks.",
      confidenceScore: 93,
      domain: "Cross-Domain",
      category: "Enterprise Performance",
      sourceModule: "governed-executive-ai",
      evidence: [
        {
          metricKey: "inventory.intelligence.health_score",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("inventory.intelligence.health_score")?.id ??
            null,
          label: "Inventory Health Score",
          observedValue: String(inventoryHealth),
          expectedValue: "85",
        },
        {
          metricKey: "warehouse.intelligence.health_score",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("warehouse.intelligence.health_score")?.id ??
            null,
          label: "Warehouse Health Score",
          observedValue: String(warehouseHealth),
          expectedValue: "85",
        },
        {
          metricKey: "procurement.intelligence.health_score",
          sourceType: "EnterpriseAnalyticsMetricSnapshot",
          sourceId:
            snapshotByKey.get("procurement.intelligence.health_score")?.id ??
            null,
          label: "Procurement Health Score",
          observedValue: String(procurementHealth),
          expectedValue: "85",
        },
      ],
    });
  }

  return insights;
}
