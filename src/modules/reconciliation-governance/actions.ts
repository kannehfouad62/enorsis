"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import { createEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";

const governanceRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
] as const;

const approverRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
] as const;

const MATERIALITY_THRESHOLD = 1000;

function field(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function workspacePath(message?: string, error?: string) {
  const params = new URLSearchParams();
  if (message) params.set("message", message);
  if (error) params.set("error", error);
  const query = params.toString();
  return `/app/requisition-to-order/reconciliation${
    query ? `?${query}` : ""
  }`;
}

export async function assignReconciliationGovernanceAction(
  data: FormData,
) {
  const user = await requireAnyRole([...governanceRoles]);
  const reconciliationId = field(data, "reconciliationId");
  const ownerUserId = field(data, "ownerUserId") || user.id;
  const dueDateRaw = field(data, "dueAt");

  let errorMessage: string | null = null;

  try {
    const reconciliation =
      await prisma.bankPaymentReconciliation.findFirst({
        where: {
          id: reconciliationId,
          tenantId: user.tenantId,
          status: {
            in: ["PARTIAL", "UNMATCHED", "DUPLICATE"],
          },
        },
      });

    if (!reconciliation) {
      throw new Error(
        "The reconciliation exception is not available for governance assignment.",
      );
    }

    const dueAt = dueDateRaw
      ? new Date(`${dueDateRaw}T17:00:00`)
      : null;

    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new Error("The due date is invalid.");
    }

    await prisma.reconciliationGovernanceCase.upsert({
      where: {
        reconciliationId: reconciliation.id,
      },
      create: {
        tenantId: user.tenantId,
        reconciliationId: reconciliation.id,
        ownerUserId,
        dueAt,
        materialityAmount: MATERIALITY_THRESHOLD,
      },
      update: {
        ownerUserId,
        dueAt,
      },
    });

    revalidatePath("/app/requisition-to-order/reconciliation");
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The governance assignment could not be saved.";
  }

  if (errorMessage) {
    redirect(workspacePath(undefined, errorMessage));
  }

  redirect(workspacePath("Reconciliation owner and due date updated."));
}

export async function requestReconciliationResolutionApprovalAction(
  data: FormData,
) {
  const user = await requireAnyRole([...governanceRoles]);
  const reconciliationId = field(data, "reconciliationId");
  const resolutionRequest = field(data, "resolutionRequest");

  let errorMessage: string | null = null;

  try {
    if (resolutionRequest.length < 10) {
      throw new Error(
        "Provide a resolution request of at least 10 characters.",
      );
    }

    const reconciliation =
      await prisma.bankPaymentReconciliation.findFirst({
        where: {
          id: reconciliationId,
          tenantId: user.tenantId,
          status: {
            in: ["PARTIAL", "UNMATCHED", "DUPLICATE"],
          },
          resolutionStatus: {
            not: "RESOLVED",
          },
        },
      });

    if (!reconciliation) {
      throw new Error(
        "The reconciliation exception is not available for approval.",
      );
    }

    const variance = Math.abs(
      Number(reconciliation.expectedAmount) -
        Number(reconciliation.settledAmount),
    );

    const requiresApproval =
      reconciliation.status === "DUPLICATE" ||
      variance >= MATERIALITY_THRESHOLD;

    if (!requiresApproval) {
      throw new Error(
        "This exception is below the maker-checker materiality threshold and can be resolved through the standard exception workflow.",
      );
    }

    const governance =
      await prisma.reconciliationGovernanceCase.upsert({
        where: {
          reconciliationId: reconciliation.id,
        },
        create: {
          tenantId: user.tenantId,
          reconciliationId: reconciliation.id,
          ownerUserId: user.id,
          materialityAmount: MATERIALITY_THRESHOLD,
          status: "PENDING_APPROVAL",
          resolutionRequest,
          requestedByUserId: user.id,
          requestedAt: new Date(),
        },
        update: {
          status: "PENDING_APPROVAL",
          resolutionRequest,
          requestedByUserId: user.id,
          requestedAt: new Date(),
          approvalDecisionNote: null,
          approvedByUserId: null,
          approvedAt: null,
          rejectedByUserId: null,
          rejectedAt: null,
        },
      });

    const approvers = await prisma.membership.findMany({
      where: {
        tenantId: user.tenantId,
        status: "ACTIVE",
        userId: {
          not: user.id,
        },
        roles: {
          hasSome: [...approverRoles] as never[],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await Promise.allSettled(
      approvers.map((membership) =>
        createEnterpriseNotification({
          tenantId: user.tenantId,
          eventType:
            "PaymentReconciliation.ResolutionApprovalRequired",
          recipientUserId: membership.user.id,
          recipientAddress: membership.user.email,
          title: "Reconciliation resolution requires approval",
          message:
            `A ${reconciliation.status} reconciliation exception requires maker-checker approval. Variance: ${reconciliation.currencyCode} ${variance.toFixed(2)}.`,
          actionUrl:
            "/app/requisition-to-order/reconciliation",
          priority: "HIGH",
          channels: membership.user.email
            ? ["IN_APP", "EMAIL"]
            : ["IN_APP"],
          data: {
            governanceCaseId: governance.id,
            reconciliationId: reconciliation.id,
          },
        }),
      ),
    );

    revalidatePath("/app/requisition-to-order/reconciliation");
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The resolution approval request could not be submitted.";
  }

  if (errorMessage) {
    redirect(workspacePath(undefined, errorMessage));
  }

  redirect(
    workspacePath(
      "Resolution approval requested from an independent finance approver.",
    ),
  );
}

export async function decideReconciliationResolutionApprovalAction(
  data: FormData,
) {
  const user = await requireAnyRole([...approverRoles]);
  const governanceCaseId = field(data, "governanceCaseId");
  const decision = field(data, "decision");
  const decisionNote = field(data, "decisionNote");

  let errorMessage: string | null = null;

  try {
    if (!["APPROVE", "REJECT"].includes(decision)) {
      throw new Error("Select approve or reject.");
    }

    if (decisionNote.length < 5) {
      throw new Error("Provide a short approval decision note.");
    }

    const governance =
      await prisma.reconciliationGovernanceCase.findFirst({
        where: {
          id: governanceCaseId,
          tenantId: user.tenantId,
          status: "PENDING_APPROVAL",
        },
      });

    if (!governance) {
      throw new Error(
        "This reconciliation approval request is no longer pending.",
      );
    }

    if (governance.requestedByUserId === user.id) {
      throw new Error(
        "Maker-checker control prevents the requesting user from approving their own reconciliation resolution.",
      );
    }

    const reconciliation =
      await prisma.bankPaymentReconciliation.findFirst({
        where: {
          id: governance.reconciliationId,
          tenantId: user.tenantId,
        },
      });

    if (!reconciliation) {
      throw new Error(
        "The linked reconciliation record could not be found.",
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (decision === "APPROVE") {
        await tx.reconciliationGovernanceCase.update({
          where: {
            id: governance.id,
          },
          data: {
            status: "APPROVED",
            approvalDecisionNote: decisionNote,
            approvedByUserId: user.id,
            approvedAt: now,
            rejectedByUserId: null,
            rejectedAt: null,
          },
        });

        await tx.bankPaymentReconciliation.update({
          where: {
            id: reconciliation.id,
          },
          data: {
            resolutionStatus: "RESOLVED",
            resolutionNotes: [
              reconciliation.resolutionNotes,
              `[${now.toISOString()}] MAKER_CHECKER_APPROVED by ${user.id}: ${decisionNote}`,
              governance.resolutionRequest
                ? `Approved resolution: ${governance.resolutionRequest}`
                : null,
            ]
              .filter(Boolean)
              .join("\n"),
            resolvedByUserId: user.id,
            resolvedAt: now,
          },
        });

        await tx.reconciliationGovernanceCase.update({
          where: {
            id: governance.id,
          },
          data: {
            status: "CLOSED",
            closedAt: now,
          },
        });
      } else {
        await tx.reconciliationGovernanceCase.update({
          where: {
            id: governance.id,
          },
          data: {
            status: "REJECTED",
            approvalDecisionNote: decisionNote,
            rejectedByUserId: user.id,
            rejectedAt: now,
            approvedByUserId: null,
            approvedAt: null,
          },
        });
      }
    });

    if (governance.requestedByUserId) {
      await createEnterpriseNotification({
        tenantId: user.tenantId,
        eventType:
          decision === "APPROVE"
            ? "PaymentReconciliation.ResolutionApproved"
            : "PaymentReconciliation.ResolutionRejected",
        recipientUserId: governance.requestedByUserId,
        recipientAddress: null,
        title:
          decision === "APPROVE"
            ? "Reconciliation resolution approved"
            : "Reconciliation resolution rejected",
        message:
          `${reconciliation.statementReference}: ${decisionNote}`,
        actionUrl:
          "/app/requisition-to-order/reconciliation",
        priority:
          decision === "APPROVE" ? "NORMAL" : "HIGH",
        channels: ["IN_APP"],
        data: {
          reconciliationId: reconciliation.id,
          governanceCaseId: governance.id,
          decision,
        },
      });
    }

    revalidatePath("/app/requisition-to-order/reconciliation");
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The reconciliation approval decision could not be recorded.";
  }

  if (errorMessage) {
    redirect(workspacePath(undefined, errorMessage));
  }

  redirect(
    workspacePath(
      decision === "APPROVE"
        ? "Reconciliation resolution approved and closed."
        : "Reconciliation resolution rejected.",
    ),
  );
}

export async function closeReconciliationPeriodAction(
  data: FormData,
) {
  const user = await requireAnyRole([...approverRoles]);
  const periodStartRaw = field(data, "periodStart");
  const periodEndRaw = field(data, "periodEnd");
  const closeNote = field(data, "closeNote");

  let errorMessage: string | null = null;

  try {
    const periodStart = new Date(
      `${periodStartRaw}T00:00:00`,
    );
    const periodEnd = new Date(
      `${periodEndRaw}T23:59:59`,
    );

    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime()) ||
      periodStart > periodEnd
    ) {
      throw new Error("Enter a valid reconciliation close period.");
    }

    if (closeNote.length < 5) {
      throw new Error("Provide a short period close note.");
    }

    const reconciliations =
      await prisma.bankPaymentReconciliation.findMany({
        where: {
          tenantId: user.tenantId,
          reconciliationDate: {
            gte: periodStart,
            lte: periodEnd,
          },
          status: {
            in: ["PARTIAL", "UNMATCHED", "DUPLICATE"],
          },
          resolutionStatus: {
            not: "RESOLVED",
          },
        },
      });

    const materialOpen = reconciliations.filter((item) => {
      const variance = Math.abs(
        Number(item.expectedAmount) -
          Number(item.settledAmount),
      );

      return (
        item.status === "DUPLICATE" ||
        variance >= MATERIALITY_THRESHOLD
      );
    });

    if (materialOpen.length > 0) {
      throw new Error(
        `Period close blocked: ${materialOpen.length} material reconciliation exception(s) remain unresolved.`,
      );
    }

    await prisma.reconciliationClosePeriod.upsert({
      where: {
        tenantId_periodStart_periodEnd: {
          tenantId: user.tenantId,
          periodStart,
          periodEnd,
        },
      },
      create: {
        tenantId: user.tenantId,
        periodStart,
        periodEnd,
        status: "CLOSED",
        closeNote,
        createdByUserId: user.id,
        closedByUserId: user.id,
        closedAt: new Date(),
      },
      update: {
        status: "CLOSED",
        closeNote,
        closedByUserId: user.id,
        closedAt: new Date(),
      },
    });

    revalidatePath("/app/requisition-to-order/reconciliation");
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The reconciliation period could not be closed.";
  }

  if (errorMessage) {
    redirect(workspacePath(undefined, errorMessage));
  }

  redirect(workspacePath("Reconciliation period closed successfully."));
}
