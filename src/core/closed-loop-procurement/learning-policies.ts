import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function policyKeyForProposal(input: {
  proposalType: string;
  scopeKey: string;
}) {
  return `${input.proposalType}:${input.scopeKey}`;
}

async function recordEvent(input: {
  tenantId: string;
  policyId: string;
  eventType: string;
  actorUserId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  message?: string | null;
  snapshot: unknown;
}) {
  await prisma.closedLoopLearningPolicyEvent.create({
    data: {
      tenantId: input.tenantId,
      policyId: input.policyId,
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      message: input.message ?? null,
      snapshot: json(input.snapshot),
    },
  });
}

export async function materializeApprovedLearningPolicies(
  tenantId: string,
) {
  const proposals =
    await prisma.closedLoopLearningProposal.findMany({
      where: {
        tenantId,
        status: "APPROVED",
      },
      orderBy: { approvedAt: "asc" },
      take: 200,
    });

  let created = 0;

  for (const proposal of proposals) {
    const existing =
      await prisma.closedLoopLearningPolicy.findFirst({
        where: {
          tenantId,
          proposalId: proposal.id,
        },
        select: { id: true },
      });

    if (existing) continue;

    const policyKey = policyKeyForProposal({
      proposalType: proposal.proposalType,
      scopeKey: proposal.scopeKey,
    });

    const latest =
      await prisma.closedLoopLearningPolicy.findFirst({
        where: {
          tenantId,
          policyKey,
        },
        orderBy: { version: "desc" },
      });

    const configuration = {
      proposalType: proposal.proposalType,
      scopeKey: proposal.scopeKey,
      scopeLabel: proposal.scopeLabel,
      currentValue: proposal.currentValue,
      proposedValue: proposal.proposedValue,
      evidenceCount: proposal.evidenceCount,
      evidenceSnapshot: proposal.evidenceSnapshot,
    };

    const policy =
      await prisma.closedLoopLearningPolicy.create({
        data: {
          tenantId,
          proposalId: proposal.id,
          policyKey,
          policyType: proposal.proposalType,
          scopeKey: proposal.scopeKey,
          scopeLabel: proposal.scopeLabel,
          version: (latest?.version ?? 0) + 1,
          status: "CANDIDATE",
          currentValue: proposal.currentValue,
          proposedValue: proposal.proposedValue,
          effectiveValue: latest?.effectiveValue ?? proposal.currentValue,
          configuration: json(configuration),
          rationale: proposal.rationale,
          supersedesPolicyId: latest?.id ?? null,
        },
      });

    await recordEvent({
      tenantId,
      policyId: policy.id,
      eventType: "POLICY_CANDIDATE_CREATED",
      toStatus: "CANDIDATE",
      message:
        "Materialized approved learning proposal into a versioned policy candidate.",
      snapshot: {
        policyKey,
        version: policy.version,
        proposalId: proposal.id,
        currentValue: policy.currentValue,
        proposedValue: policy.proposedValue,
        supersedesPolicyId:
          policy.supersedesPolicyId,
      },
    });

    created += 1;
  }

  return {
    scanned: proposals.length,
    created,
  };
}

export async function activateLearningPolicy(input: {
  tenantId: string;
  userId: string;
  policyId: string;
  note: string | null;
}) {
  const policy =
    await prisma.closedLoopLearningPolicy.findFirstOrThrow({
      where: {
        id: input.policyId,
        tenantId: input.tenantId,
      },
    });

  if (policy.status !== "CANDIDATE") {
    throw new Error(
      "Only CANDIDATE learning policies can be activated.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const activePolicies =
      await tx.closedLoopLearningPolicy.findMany({
        where: {
          tenantId: input.tenantId,
          policyKey: policy.policyKey,
          status: "ACTIVE",
        },
      });

    for (const active of activePolicies) {
      await tx.closedLoopLearningPolicy.update({
        where: { id: active.id },
        data: {
          status: "SUPERSEDED",
          deactivatedByUserId: input.userId,
          deactivatedAt: new Date(),
        },
      });

      await tx.closedLoopLearningPolicyEvent.create({
        data: {
          tenantId: input.tenantId,
          policyId: active.id,
          eventType: "POLICY_SUPERSEDED",
          actorUserId: input.userId,
          fromStatus: "ACTIVE",
          toStatus: "SUPERSEDED",
          message:
            input.note ??
            "Superseded by a newly activated learning policy version.",
          snapshot: json({
            supersededByPolicyId: policy.id,
            policyKey: policy.policyKey,
            version: active.version,
          }),
        },
      });
    }

    const updated =
      await tx.closedLoopLearningPolicy.update({
        where: { id: policy.id },
        data: {
          status: "ACTIVE",
          effectiveValue:
            policy.proposedValue ??
            policy.currentValue,
          activatedByUserId: input.userId,
          activatedAt: new Date(),
        },
      });

    await tx.closedLoopLearningPolicyEvent.create({
      data: {
        tenantId: input.tenantId,
        policyId: policy.id,
        eventType: "POLICY_ACTIVATED",
        actorUserId: input.userId,
        fromStatus: "CANDIDATE",
        toStatus: "ACTIVE",
        message:
          input.note ??
          "Authorized user activated the governed learning policy.",
        snapshot: json({
          policyKey: policy.policyKey,
          version: policy.version,
          effectiveValue:
            updated.effectiveValue,
          proposalId: policy.proposalId,
        }),
      },
    });

    return updated;
  });
}

export async function rollbackLearningPolicy(input: {
  tenantId: string;
  userId: string;
  policyId: string;
  note: string | null;
}) {
  const current =
    await prisma.closedLoopLearningPolicy.findFirstOrThrow({
      where: {
        id: input.policyId,
        tenantId: input.tenantId,
      },
    });

  if (current.status !== "ACTIVE") {
    throw new Error(
      "Only an ACTIVE learning policy can be rolled back.",
    );
  }

  const prior =
    await prisma.closedLoopLearningPolicy.findFirst({
      where: {
        tenantId: input.tenantId,
        policyKey: current.policyKey,
        version: {
          lt: current.version,
        },
        status: {
          in: ["SUPERSEDED", "INACTIVE"],
        },
      },
      orderBy: { version: "desc" },
    });

  if (!prior) {
    throw new Error(
      "No prior policy version is available for rollback.",
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.closedLoopLearningPolicy.update({
      where: { id: current.id },
      data: {
        status: "ROLLED_BACK",
        deactivatedByUserId: input.userId,
        deactivatedAt: new Date(),
      },
    });

    const restored =
      await tx.closedLoopLearningPolicy.update({
        where: { id: prior.id },
        data: {
          status: "ACTIVE",
          activatedByUserId: input.userId,
          activatedAt: new Date(),
          rollbackOfPolicyId: current.id,
        },
      });

    await tx.closedLoopLearningPolicyEvent.create({
      data: {
        tenantId: input.tenantId,
        policyId: current.id,
        eventType: "POLICY_ROLLED_BACK",
        actorUserId: input.userId,
        fromStatus: "ACTIVE",
        toStatus: "ROLLED_BACK",
        message:
          input.note ??
          "Authorized user rolled back the active learning policy.",
        snapshot: json({
          restoredPolicyId: prior.id,
          restoredVersion: prior.version,
        }),
      },
    });

    await tx.closedLoopLearningPolicyEvent.create({
      data: {
        tenantId: input.tenantId,
        policyId: prior.id,
        eventType: "POLICY_RESTORED",
        actorUserId: input.userId,
        fromStatus: prior.status,
        toStatus: "ACTIVE",
        message:
          input.note ??
          "Prior learning policy version restored through rollback.",
        snapshot: json({
          rollbackOfPolicyId: current.id,
          restoredVersion: prior.version,
          effectiveValue:
            restored.effectiveValue,
        }),
      },
    });

    return restored;
  });
}
