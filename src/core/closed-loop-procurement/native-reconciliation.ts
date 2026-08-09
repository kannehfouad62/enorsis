import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Observation = {
  metricKey: string;
  metricLabel: string;
  unit: string;
  actualValue: number;
  evidence: Prisma.InputJsonValue;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function variance(
  predictedValue: number | null,
  actualValue: number,
) {
  if (predictedValue === null) {
    return {
      varianceValue: null,
      variancePercent: null,
    };
  }

  const varianceValue =
    actualValue - predictedValue;

  const variancePercent =
    predictedValue === 0
      ? null
      : (varianceValue /
          Math.abs(predictedValue)) *
        100;

  return {
    varianceValue,
    variancePercent,
  };
}

async function purchaseRequestObservations(
  tenantId: string,
  nativeReferenceId: string,
): Promise<Observation[]> {
  const record = await prisma.purchaseRequest.findFirst({
    where: {
      id: nativeReferenceId,
      tenantId,
    },
    select: {
      id: true,
      requestNumber: true,
      status: true,
      totalAmount: true,
      usdEquivalent: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!record) return [];

  return [
    {
      metricKey: "NATIVE_PR_CREATED",
      metricLabel: "Purchase Request created",
      unit: "BOOLEAN",
      actualValue: 1,
      evidence: json({
        nativeType: "PurchaseRequest",
        nativeId: record.id,
        requestNumber: record.requestNumber,
        status: record.status,
        updatedAt: record.updatedAt,
      }),
    },
    {
      metricKey: "NATIVE_PR_TOTAL_USD",
      metricLabel: "Native Purchase Request total",
      unit: "USD",
      actualValue: Number(record.usdEquivalent),
      evidence: json({
        totalAmount: Number(record.totalAmount),
        usdEquivalent: Number(record.usdEquivalent),
        status: record.status,
      }),
    },
    {
      metricKey: "NATIVE_PR_APPROVED",
      metricLabel: "Purchase Request approved",
      unit: "BOOLEAN",
      actualValue:
        record.status === "APPROVED" ? 1 : 0,
      evidence: json({
        status: record.status,
        observedAt: new Date().toISOString(),
      }),
    },
  ];
}

async function sourcingObservations(
  tenantId: string,
  nativeReferenceId: string,
): Promise<Observation[]> {
  const record = await prisma.sourcingEvent.findFirst({
    where: {
      id: nativeReferenceId,
      tenantId,
    },
    select: {
      id: true,
      eventNumber: true,
      status: true,
      type: true,
      estimatedValue: true,
      currencyCode: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!record) return [];

  const terminal = [
    "AWARDED",
    "CLOSED",
  ].includes(record.status);

  return [
    {
      metricKey:
        "NATIVE_SOURCING_EVENT_CREATED",
      metricLabel: "Sourcing event created",
      unit: "BOOLEAN",
      actualValue: 1,
      evidence: json({
        nativeType: "SourcingEvent",
        nativeId: record.id,
        eventNumber: record.eventNumber,
        type: record.type,
        status: record.status,
      }),
    },
    {
      metricKey:
        "NATIVE_SOURCING_EVENT_TERMINAL",
      metricLabel:
        "Sourcing event reached award/closure",
      unit: "BOOLEAN",
      actualValue: terminal ? 1 : 0,
      evidence: json({
        status: record.status,
        updatedAt: record.updatedAt,
      }),
    },
    ...(record.estimatedValue === null
      ? []
      : [
          {
            metricKey:
              "NATIVE_SOURCING_ESTIMATED_VALUE",
            metricLabel:
              "Native sourcing estimated value",
            unit: record.currencyCode,
            actualValue: Number(
              record.estimatedValue,
            ),
            evidence: json({
              status: record.status,
              currencyCode:
                record.currencyCode,
            }),
          },
        ]),
  ];
}

async function resilienceObservations(
  tenantId: string,
  nativeReferenceId: string,
): Promise<Observation[]> {
  const record = await prisma.resiliencePlan.findFirst({
    where: {
      id: nativeReferenceId,
      tenantId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      minimumServicePercent: true,
      recoveryTimeHours: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!record) return [];

  return [
    {
      metricKey: "MITIGATION_PLAN_CREATED",
      metricLabel:
        "Risk mitigation plan created",
      unit: "BOOLEAN",
      actualValue: 1,
      evidence: json({
        nativeType: "ResiliencePlan",
        nativeId: record.id,
        name: record.name,
        status: record.status,
      }),
    },
    {
      metricKey:
        "RESILIENCE_PLAN_ACTIVATED",
      metricLabel:
        "Resilience plan activated",
      unit: "BOOLEAN",
      actualValue: [
        "ACTIVATED",
        "COMPLETED",
      ].includes(record.status)
        ? 1
        : 0,
      evidence: json({
        status: record.status,
        minimumServicePercent:
          record.minimumServicePercent,
        recoveryTimeHours:
          record.recoveryTimeHours,
        updatedAt: record.updatedAt,
      }),
    },
  ];
}

async function valueObservations(
  tenantId: string,
  nativeReferenceId: string,
): Promise<Observation[]> {
  const record =
    await prisma.procurementValueInitiative.findFirst({
      where: {
        id: nativeReferenceId,
        tenantId,
      },
      select: {
        id: true,
        initiativeNumber: true,
        status: true,
        targetBenefitAmount: true,
        forecastBenefitAmount: true,
        realizedBenefitAmount: true,
        probabilityPercent: true,
        currencyCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  if (!record) return [];

  return [
    {
      metricKey: "VALUE_INITIATIVE_CREATED",
      metricLabel: "Value initiative created",
      unit: "BOOLEAN",
      actualValue: 1,
      evidence: json({
        nativeType:
          "ProcurementValueInitiative",
        nativeId: record.id,
        initiativeNumber:
          record.initiativeNumber,
        status: record.status,
      }),
    },
    {
      metricKey: "REALIZED_VALUE",
      metricLabel: "Realized procurement value",
      unit: record.currencyCode,
      actualValue: Number(
        record.realizedBenefitAmount,
      ),
      evidence: json({
        targetBenefitAmount: Number(
          record.targetBenefitAmount,
        ),
        forecastBenefitAmount: Number(
          record.forecastBenefitAmount,
        ),
        realizedBenefitAmount: Number(
          record.realizedBenefitAmount,
        ),
        probabilityPercent: Number(
          record.probabilityPercent,
        ),
        status: record.status,
        updatedAt: record.updatedAt,
      }),
    },
  ];
}

async function inventoryObservations(
  tenantId: string,
  nativeReferenceId: string,
): Promise<Observation[]> {
  const record =
    await prisma.inventoryMovementLedger.findFirst({
      where: {
        id: nativeReferenceId,
        tenantId,
      },
      select: {
        id: true,
        movementNumber: true,
        movementType: true,
        status: true,
        quantity: true,
        unitOfMeasure: true,
        fromLocationId: true,
        toLocationId: true,
        createdAt: true,
        postedAt: true,
        updatedAt: true,
      },
    });

  if (!record) return [];

  return [
    {
      metricKey: "TRANSFER_DRAFT_CREATED",
      metricLabel:
        "Inventory transfer draft created",
      unit: "BOOLEAN",
      actualValue: 1,
      evidence: json({
        nativeType:
          "InventoryMovementLedger",
        nativeId: record.id,
        movementNumber:
          record.movementNumber,
        movementType:
          record.movementType,
        status: record.status,
      }),
    },
    {
      metricKey: "TRANSFER_POSTED",
      metricLabel: "Inventory transfer posted",
      unit: "BOOLEAN",
      actualValue:
        record.status === "POSTED" ? 1 : 0,
      evidence: json({
        status: record.status,
        postedAt: record.postedAt,
        fromLocationId:
          record.fromLocationId,
        toLocationId: record.toLocationId,
      }),
    },
    {
      metricKey: "TRANSFER_QUANTITY",
      metricLabel:
        "Native inventory transfer quantity",
      unit: record.unitOfMeasure,
      actualValue: Number(record.quantity),
      evidence: json({
        movementNumber:
          record.movementNumber,
        status: record.status,
      }),
    },
  ];
}

async function observationsForOutcome(input: {
  tenantId: string;
  targetWorkflow: string;
  nativeReferenceId: string;
}) {
  switch (input.targetWorkflow) {
    case "PURCHASE_REQUEST":
      return purchaseRequestObservations(
        input.tenantId,
        input.nativeReferenceId,
      );
    case "STRATEGIC_SOURCING":
      return sourcingObservations(
        input.tenantId,
        input.nativeReferenceId,
      );
    case "RISK_MITIGATION":
      return resilienceObservations(
        input.tenantId,
        input.nativeReferenceId,
      );
    case "VALUE_REALIZATION":
      return valueObservations(
        input.tenantId,
        input.nativeReferenceId,
      );
    case "INVENTORY_REBALANCE":
      return inventoryObservations(
        input.tenantId,
        input.nativeReferenceId,
      );
    default:
      return [];
  }
}

export async function reconcileClosedLoopOutcome(
  outcomeId: string,
) {
  const outcome =
    await prisma.closedLoopProcurementOutcome.findUniqueOrThrow({
      where: { id: outcomeId },
    });

  if (!outcome.nativeReferenceId) {
    return {
      outcomeId,
      reconciled: 0,
      reason:
        "Outcome has no native reference.",
    };
  }

  const observations =
    await observationsForOutcome({
      tenantId: outcome.tenantId,
      targetWorkflow:
        outcome.targetWorkflow,
      nativeReferenceId:
        outcome.nativeReferenceId,
    });

  if (observations.length === 0) {
    return {
      outcomeId,
      reconciled: 0,
      reason:
        "No supported native observations were available.",
    };
  }

  let reconciled = 0;

  for (const observation of observations) {
    const existing =
      await prisma.closedLoopProcurementOutcomeMetric.findFirst({
        where: {
          tenantId: outcome.tenantId,
          outcomeId: outcome.id,
          metricKey:
            observation.metricKey,
        },
      });

    if (existing) {
      const calculated = variance(
        existing.predictedValue,
        observation.actualValue,
      );

      await prisma.closedLoopProcurementOutcomeMetric.update({
        where: { id: existing.id },
        data: {
          actualValue:
            observation.actualValue,
          varianceValue:
            calculated.varianceValue,
          variancePercent:
            calculated.variancePercent,
          status:
            existing.status === "VALIDATED"
              ? "VALIDATED"
              : "OBSERVED",
          evidence: observation.evidence,
          observedAt: new Date(),
        },
      });
    } else {
      await prisma.closedLoopProcurementOutcomeMetric.create({
        data: {
          tenantId: outcome.tenantId,
          outcomeId: outcome.id,
          metricKey:
            observation.metricKey,
          metricLabel:
            observation.metricLabel,
          unit: observation.unit,
          predictedValue: null,
          actualValue:
            observation.actualValue,
          varianceValue: null,
          variancePercent: null,
          confidence: null,
          status: "OBSERVED",
          evidence: observation.evidence,
          observedAt: new Date(),
        },
      });
    }

    reconciled += 1;
  }

  if (
    !["VALIDATED", "REJECTED"].includes(
      outcome.status,
    )
  ) {
    await prisma.closedLoopProcurementOutcome.update({
      where: { id: outcome.id },
      data: {
        status: "OBSERVED",
        observedAt: new Date(),
        outcomeQuality:
          outcome.outcomeQuality ===
          "UNVERIFIED"
            ? "OBSERVED"
            : outcome.outcomeQuality,
      },
    });
  }

  return {
    outcomeId,
    reconciled,
    reason: null,
  };
}

export async function reconcileClosedLoopOutcomes() {
  const outcomes =
    await prisma.closedLoopProcurementOutcome.findMany({
      where: {
        nativeReferenceId: {
          not: null,
        },
        status: {
          in: [
            "OPEN",
            "OBSERVED",
            "VALIDATED",
          ],
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 250,
    });

  let reconciledOutcomes = 0;
  let reconciledMetrics = 0;

  for (const outcome of outcomes) {
    const result =
      await reconcileClosedLoopOutcome(
        outcome.id,
      );

    if (result.reconciled > 0) {
      reconciledOutcomes += 1;
      reconciledMetrics +=
        result.reconciled;
    }
  }

  return {
    scanned: outcomes.length,
    reconciledOutcomes,
    reconciledMetrics,
  };
}
