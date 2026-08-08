import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getAutonomousExecutionWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [
    envelopes,
    approvedPlanActions,
    acceptedRecommendations,
    handoffs,
  ] = await Promise.all([
    prisma.autonomousExecutionEnvelope.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.autonomousProcurementPlanAction.findMany({
      where: {
        tenantId,
        status: "PROPOSED",
        planId: {
          in: (
            await prisma.autonomousProcurementPlan.findMany({
              where: {
                tenantId,
                status: "APPROVED",
              },
              select: { id: true },
              take: 50,
            })
          ).map((plan) => plan.id),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.autonomousProcurementRecommendation.findMany({
      where: {
        tenantId,
        status: "ACCEPTED",
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.autonomousExecutionHandoff.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const stagedSources = new Set(
    envelopes.map(
      (envelope) =>
        `${envelope.sourceType}:${envelope.sourceId}`,
    ),
  );

  const latestEnvelope = envelopes[0] ?? null;

  const checks = latestEnvelope
    ? await prisma.autonomousExecutionPolicyCheck.findMany({
        where: {
          tenantId,
          executionEnvelopeId: latestEnvelope.id,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return {
    envelopes,
    latestEnvelope,
    checks,
    handoffs,
    availablePlanActions: approvedPlanActions.filter(
      (action) =>
        !stagedSources.has(`PLAN_ACTION:${action.id}`),
    ),
    availableRecommendations:
      acceptedRecommendations.filter(
        (recommendation) =>
          !stagedSources.has(
            `RECOMMENDATION:${recommendation.id}`,
          ),
      ),
    metrics: {
      totalEnvelopes: envelopes.length,
      pendingRelease: envelopes.filter(
        (envelope) =>
          envelope.status === "PENDING_HUMAN_RELEASE",
      ).length,
      released: envelopes.filter(
        (envelope) => envelope.status === "RELEASED",
      ).length,
      blocked: envelopes.filter(
        (envelope) => envelope.status === "BLOCKED",
      ).length,
      readyHandoffs: handoffs.filter(
        (handoff) =>
          handoff.status === "READY_FOR_HANDOFF",
      ).length,
    },
  };
}
