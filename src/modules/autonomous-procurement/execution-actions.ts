"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  createExecutionEnvelopeFromPlanAction,
  createExecutionEnvelopeFromRecommendation,
  releaseExecutionEnvelope,
} from "@/core/autonomous-procurement/execution-engine";
import { prisma } from "@/lib/prisma";

const stagingRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;

const releaseRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function stagePlanActionForExecutionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...stagingRoles]);

  const envelope =
    await createExecutionEnvelopeFromPlanAction({
      tenantId: user.tenantId,
      userId: user.id,
      planActionId: field(data, "planActionId"),
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Controlled execution user",
      action: "autonomous_execution.stage_plan_action",
      resourceType: "AutonomousExecutionEnvelope",
      resourceId: envelope.id,
      after: {
        sourceType: envelope.sourceType,
        sourceId: envelope.sourceId,
        status: envelope.status,
        targetWorkflow: envelope.targetWorkflow,
      },
    },
  });

  revalidatePath("/app/governance/autonomous-execution");
}

export async function stageRecommendationForExecutionAction(
  data: FormData,
) {
  const user = await requireAnyRole([...stagingRoles]);

  const envelope =
    await createExecutionEnvelopeFromRecommendation({
      tenantId: user.tenantId,
      userId: user.id,
      recommendationId: field(
        data,
        "recommendationId",
      ),
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Controlled execution user",
      action:
        "autonomous_execution.stage_recommendation",
      resourceType: "AutonomousExecutionEnvelope",
      resourceId: envelope.id,
      after: {
        sourceType: envelope.sourceType,
        sourceId: envelope.sourceId,
        status: envelope.status,
        targetWorkflow: envelope.targetWorkflow,
      },
    },
  });

  revalidatePath("/app/governance/autonomous-execution");
}

export async function decideExecutionEnvelopeAction(
  data: FormData,
) {
  const user = await requireAnyRole([...releaseRoles]);

  const envelopeId = field(data, "envelopeId");
  const decision = field(data, "decision");
  const reason = field(data, "reason") || null;

  if (decision === "RELEASE") {
    const handoff = await releaseExecutionEnvelope({
      tenantId: user.tenantId,
      userId: user.id,
      envelopeId,
      reason,
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel:
          user.email ?? "Controlled execution releaser",
        action: "autonomous_execution.release",
        resourceType: "AutonomousExecutionEnvelope",
        resourceId: envelopeId,
        after: {
          handoffId: handoff.id,
          targetWorkflow: handoff.targetWorkflow,
          status: handoff.status,
          liveTransactionCreated: false,
        },
      },
    });
  } else if (decision === "REJECT") {
    const envelope =
      await prisma.autonomousExecutionEnvelope.findFirstOrThrow(
        {
          where: {
            id: envelopeId,
            tenantId: user.tenantId,
          },
        },
      );

    if (
      ![
        "PENDING_HUMAN_RELEASE",
        "PENDING_POLICY_REVIEW",
        "BLOCKED",
      ].includes(envelope.status)
    ) {
      throw new Error(
        "This execution envelope can no longer be rejected.",
      );
    }

    await prisma.$transaction([
      prisma.autonomousExecutionEnvelope.update({
        where: { id: envelope.id },
        data: {
          status: "REJECTED",
          rejectedByUserId: user.id,
          rejectedAt: new Date(),
          rejectionReason: reason,
          handoffStatus: "REJECTED",
        },
      }),
      prisma.autonomousExecutionDecision.create({
        data: {
          tenantId: user.tenantId,
          executionEnvelopeId: envelope.id,
          decision: "REJECTED",
          decidedByUserId: user.id,
          reason,
          evidence: {
            priorStatus: envelope.status,
            liveTransactionCreated: false,
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
            user.email ??
            "Controlled execution reviewer",
          action: "autonomous_execution.reject",
          resourceType: "AutonomousExecutionEnvelope",
          resourceId: envelope.id,
          before: {
            status: envelope.status,
          },
          after: {
            status: "REJECTED",
            liveTransactionCreated: false,
          },
        },
      }),
    ]);
  } else {
    throw new Error("Invalid execution decision.");
  }

  revalidatePath("/app/governance/autonomous-execution");
}
