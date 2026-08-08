"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { generateAutonomousRecommendations } from "@/core/autonomous-procurement/recommendation-engine";
import { prisma } from "@/lib/prisma";

const generationRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;

const reviewRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function generateAutonomousRecommendationsAction(
  data: FormData,
) {
  const user = await requireAnyRole([...generationRoles]);

  const horizonDays = Math.max(
    30,
    Math.min(
      365,
      Number(String(data.get("horizonDays") ?? "90")),
    ),
  );

  const result = await generateAutonomousRecommendations({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: user.email ?? "unknown@enorsis.local",
    title:
      field(data, "title") ||
      `Autonomous Procurement Recommendations · ${horizonDays} days`,
    horizonDays,
    sourcePlanId: field(data, "sourcePlanId") || null,
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Autonomous recommendation user",
      action:
        "autonomous_procurement.recommendations.generate",
      resourceType:
        "AutonomousProcurementRecommendationSet",
      resourceId: result.set.id,
      after: {
        recommendationCount: result.recommendationCount,
        status: result.set.status,
        estimatedSavingsUsd: Number(
          result.set.estimatedSavingsUsd,
        ),
        humanReviewRequired: true,
      },
    },
  });

  revalidatePath(
    "/app/automation/autonomous-recommendations",
  );
}

export async function decideAutonomousRecommendationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...reviewRoles]);

  const recommendationId = field(
    data,
    "recommendationId",
  );
  const decision = field(data, "decision");
  const reason = field(data, "reason") || null;

  if (!["ACCEPT", "REJECT", "DEFER"].includes(decision)) {
    throw new Error("Invalid recommendation decision.");
  }

  const recommendation =
    await prisma.autonomousProcurementRecommendation.findFirstOrThrow(
      {
        where: {
          id: recommendationId,
          tenantId: user.tenantId,
        },
      },
    );

  if (recommendation.status !== "PROPOSED") {
    throw new Error(
      "Only proposed recommendations can be dispositioned.",
    );
  }

  const status =
    decision === "ACCEPT"
      ? "ACCEPTED"
      : decision === "REJECT"
        ? "REJECTED"
        : "DEFERRED";

  await prisma.$transaction([
    prisma.autonomousProcurementRecommendation.update({
      where: { id: recommendation.id },
      data: {
        status,
        disposition: decision,
        dispositionReason: reason,
        dispositionedByUserId: user.id,
        dispositionedAt: new Date(),
      },
    }),
    prisma.autonomousProcurementRecommendationDecision.create({
      data: {
        tenantId: user.tenantId,
        recommendationId: recommendation.id,
        decision,
        decidedByUserId: user.id,
        reason,
        evidence: {
          priorStatus: recommendation.status,
          executionTriggered: false,
          note:
            "Recommendation disposition does not create or execute procurement transactions.",
        },
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel:
          user.email ?? "Autonomous recommendation reviewer",
        action:
          "autonomous_procurement.recommendation.decide",
        resourceType:
          "AutonomousProcurementRecommendation",
        resourceId: recommendation.id,
        before: {
          status: recommendation.status,
        },
        after: {
          status,
          decision,
          executionTriggered: false,
        },
      },
    }),
  ]);

  revalidatePath(
    "/app/automation/autonomous-recommendations",
  );
}
