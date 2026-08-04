import { prisma } from "@/lib/prisma";

export async function resolveActiveWorkflowDelegate({
  tenantId,
  assigneeUserId,
  at = new Date(),
}: {
  tenantId: string;
  assigneeUserId: string;
  at?: Date;
}) {
  const delegation = await prisma.workflowDelegation.findFirst({
    where: {
      tenantId,
      delegatorUserId: assigneeUserId,
      isActive: true,
      startsAt: { lte: at },
      endsAt: { gte: at },
    },
    orderBy: { createdAt: "desc" },
  });

  return delegation?.delegateUserId ?? assigneeUserId;
}

export async function applyActiveWorkflowDelegations(
  tenantId: string,
) {
  const now = new Date();

  const delegations = await prisma.workflowDelegation.findMany({
    where: {
      tenantId,
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
  });

  let reassigned = 0;

  for (const delegation of delegations) {
    const result = await prisma.workflowTask.updateMany({
      where: {
        assigneeUserId: delegation.delegatorUserId,
        delegatedFromUserId: null,
        status: {
          in: ["PENDING", "AVAILABLE", "IN_PROGRESS", "ESCALATED"],
        },
        workflowInstance: { tenantId },
        workflowStep: { allowDelegation: true },
      },
      data: {
        assigneeUserId: delegation.delegateUserId,
        delegatedFromUserId: delegation.delegatorUserId,
      },
    });

    reassigned += result.count;
  }

  return { reassigned };
}

export async function expireWorkflowDelegations(tenantId: string) {
  const result = await prisma.workflowDelegation.updateMany({
    where: {
      tenantId,
      isActive: true,
      endsAt: { lt: new Date() },
    },
    data: { isActive: false },
  });

  return { expired: result.count };
}
