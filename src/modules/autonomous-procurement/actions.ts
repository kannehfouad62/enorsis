"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { generateAutonomousProcurementPlan } from "@/core/autonomous-procurement/planning-engine";
import { prisma } from "@/lib/prisma";

const planningRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
] as const;

const decisionRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function generateAutonomousProcurementPlanAction(
  data: FormData,
) {
  const user = await requireAnyRole([...planningRoles]);

  const horizonDays = Math.max(
    30,
    Math.min(
      365,
      Number(String(data.get("horizonDays") ?? "90")),
    ),
  );

  const result =
    await generateAutonomousProcurementPlan({
      tenantId: user.tenantId,
      userId: user.id,
      userEmail:
        user.email ?? "unknown@enorsis.local",
      horizonDays,
      title:
        field(data, "title") ||
        `Autonomous Procurement Plan · ${horizonDays} days`,
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Autonomous planning user",
      action: "autonomous_procurement.plan.generate",
      resourceType: "AutonomousProcurementPlan",
      resourceId: result.plan.id,
      after: {
        actionCount: result.actionCount,
        horizonDays,
        status: result.plan.status,
        humanApprovalRequired: true,
      },
    },
  });

  revalidatePath("/app/automation/autonomous-planning");
}

export async function decideAutonomousProcurementPlanAction(
  data: FormData,
) {
  const user = await requireAnyRole([...decisionRoles]);

  const planId = field(data, "planId");
  const decision = field(data, "decision");
  const reason = field(data, "reason") || null;

  const plan =
    await prisma.autonomousProcurementPlan.findFirstOrThrow({
      where: {
        id: planId,
        tenantId: user.tenantId,
      },
    });

  if (plan.status !== "PENDING_APPROVAL") {
    throw new Error(
      "Only procurement plans pending approval can be decided.",
    );
  }

  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw new Error("Invalid procurement plan decision.");
  }

  const approved = decision === "APPROVE";

  await prisma.$transaction([
    prisma.autonomousProcurementPlan.update({
      where: { id: plan.id },
      data: approved
        ? {
            status: "APPROVED",
            approvedByUserId: user.id,
            approvedAt: new Date(),
            rejectedByUserId: null,
            rejectedAt: null,
            rejectionReason: null,
          }
        : {
            status: "REJECTED",
            rejectedByUserId: user.id,
            rejectedAt: new Date(),
            rejectionReason: reason,
          },
    }),
    prisma.autonomousProcurementPlanDecision.create({
      data: {
        tenantId: user.tenantId,
        planId: plan.id,
        decision: approved ? "APPROVED" : "REJECTED",
        decidedByUserId: user.id,
        decisionReason: reason,
        evidence: {
          priorStatus: plan.status,
          executionTriggered: false,
          note:
            "Plan approval does not create or execute procurement transactions.",
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
          user.email ?? "Autonomous plan approver",
        action: approved
          ? "autonomous_procurement.plan.approve"
          : "autonomous_procurement.plan.reject",
        resourceType: "AutonomousProcurementPlan",
        resourceId: plan.id,
        before: {
          status: plan.status,
        },
        after: {
          status: approved ? "APPROVED" : "REJECTED",
          executionTriggered: false,
        },
      },
    }),
  ]);

  revalidatePath("/app/automation/autonomous-planning");
}
