"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  activateAdapterJob,
  cancelAdapterJob,
  prepareAdapterJob,
} from "@/core/autonomous-procurement/transaction-adapters";
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

const activationRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function prepareAdapterJobAction(
  data: FormData,
) {
  const user = await requireAnyRole([...stagingRoles]);

  const job = await prepareAdapterJob({
    tenantId: user.tenantId,
    userId: user.id,
    handoffId: field(data, "handoffId"),
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Transaction adapter user",
      action: "autonomous_execution.adapter.prepare",
      resourceType: "AutonomousExecutionAdapterJob",
      resourceId: job.id,
      after: {
        targetWorkflow: job.targetWorkflow,
        adapterKey: job.adapterKey,
        status: job.status,
        nativeTransactionCreated: false,
      },
    },
  });

  revalidatePath(
    "/app/governance/autonomous-execution/adapters",
  );
}

export async function decideAdapterJobAction(
  data: FormData,
) {
  const user = await requireAnyRole([...activationRoles]);

  const adapterJobId = field(data, "adapterJobId");
  const decision = field(data, "decision");
  const reason = field(data, "reason") || null;

  if (decision === "ACTIVATE") {
    const job = await activateAdapterJob({
      tenantId: user.tenantId,
      userId: user.id,
      adapterJobId,
      reason,
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel:
          user.email ?? "Transaction adapter operator",
        action: "autonomous_execution.adapter.activate",
        resourceType: "AutonomousExecutionAdapterJob",
        resourceId: job.id,
        after: {
          status: job.status,
          nativeRoute: job.nativeRoute,
          nativeTransactionCreated: false,
          nativeApprovalBypass: false,
        },
      },
    });
  } else if (decision === "CANCEL") {
    await cancelAdapterJob({
      tenantId: user.tenantId,
      userId: user.id,
      adapterJobId,
      reason,
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel:
          user.email ?? "Transaction adapter operator",
        action: "autonomous_execution.adapter.cancel",
        resourceType: "AutonomousExecutionAdapterJob",
        resourceId: adapterJobId,
        after: {
          status: "CANCELLED",
          nativeTransactionCreated: false,
        },
      },
    });
  } else {
    throw new Error("Invalid adapter decision.");
  }

  revalidatePath(
    "/app/governance/autonomous-execution/adapters",
  );
}
