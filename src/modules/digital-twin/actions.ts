"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { runProcurementDigitalTwin } from "@/core/digital-twin/simulation-engine";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const numberField = (
  data: FormData,
  key: string,
  fallback = 0,
) => {
  const raw = field(data, key);
  const value = raw ? Number(raw) : fallback;
  return Number.isFinite(value) ? value : fallback;
};

export async function createDigitalTwinScenarioAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const scenario =
    await prisma.procurementDigitalTwinScenario.create({
      data: {
        tenantId: user.tenantId,
        createdByUserId: user.id,
        name: field(data, "name") || "Digital Twin Scenario",
        description: field(data, "description") || null,
        scenarioType:
          field(data, "scenarioType") || "COMBINED",
        horizonDays: Math.max(
          30,
          Math.min(
            365,
            numberField(data, "horizonDays", 90),
          ),
        ),
        demandShockPct: numberField(
          data,
          "demandShockPct",
        ),
        leadTimeShockPct: numberField(
          data,
          "leadTimeShockPct",
        ),
        costInflationPct: numberField(
          data,
          "costInflationPct",
        ),
        supplierDisruptionPct: numberField(
          data,
          "supplierDisruptionPct",
        ),
        inboundReductionPct: numberField(
          data,
          "inboundReductionPct",
        ),
        safetyStockChangePct: numberField(
          data,
          "safetyStockChangePct",
        ),
        assumptions: {
          humanGoverned: true,
          liveDataMutation: false,
        },
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Digital twin user",
      action: "digital_twin.scenario.create",
      resourceType: "ProcurementDigitalTwinScenario",
      resourceId: scenario.id,
      after: {
        scenarioType: scenario.scenarioType,
        horizonDays: scenario.horizonDays,
      },
    },
  });

  revalidatePath("/app/analytics/digital-twin");
}

export async function runDigitalTwinScenarioAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const scenarioId = field(data, "scenarioId");

  const result = await runProcurementDigitalTwin({
    tenantId: user.tenantId,
    createdByUserId: user.id,
    scenarioId,
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Digital twin user",
      action: "digital_twin.scenario.run",
      resourceType: "ProcurementDigitalTwinRun",
      resourceId: result.run.id,
      after: {
        scenarioId,
        impactCount: result.impactCount,
        riskLevel: result.run.riskLevel,
        recommendation: result.run.recommendation,
      },
    },
  });

  revalidatePath("/app/analytics/digital-twin");
}
