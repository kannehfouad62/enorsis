"use server";

import { revalidatePath } from "next/cache";
import {
  ApprovalDecision,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getAuditRequestContext } from "@/core/audit/request-context";
import { createEnterpriseNotification } from "@/core/notifications";
import {
  assertApprovalAuthority,
  hasResourceScope,
  requireAnyRole,
} from "@/core/auth/authorization";
import { handleMarketplacePurchaseRequestDecision } from "@/core/marketplace-commerce/orchestration";
import {
  approvalDecisionSchema,
  cancelRequestSchema,
  purchaseRequestInputSchema,
} from "./schemas";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function linesFromForm(formData: FormData) {
  const descriptions = formData.getAll("lineDescription").map(String);
  const categories = formData.getAll("lineCategory").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);
  const units = formData.getAll("lineUnitOfMeasure").map(String);
  const prices = formData.getAll("lineUnitPrice").map(String);
  const suppliers = formData.getAll("lineSupplierSuggestion").map(String);

  return descriptions.map((description, index) => ({
    description,
    category: categories[index] ?? "",
    quantity: quantities[index] ?? "0",
    unitOfMeasure: units[index] ?? "EA",
    unitPrice: prices[index] ?? "0",
    supplierSuggestion: suppliers[index] ?? "",
  }));
}

async function buildApprovalChain(tenantId: string, requesterId: string, amountUsd: number) {
  const approvers = await prisma.membership.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      roles: { has: "APPROVER" },
      userId: { not: requesterId },
      approvalLimitUsd: { not: null },
    },
    orderBy: { approvalLimitUsd: "asc" },
  });

  const eligible = approvers.filter(
    (membership) => Number(membership.approvalLimitUsd) >= amountUsd,
  );

  if (eligible.length === 0) return [];

  const first = approvers.find(
    (membership) => Number(membership.approvalLimitUsd) < amountUsd,
  );
  const chain = first ? [first, eligible[0]] : [eligible[0]];

  return Array.from(new Map(chain.map((item) => [item.userId, item])).values())
    .slice(0, 3);
}

export async function savePurchaseRequestAction(formData: FormData) {
  const user = await requireAnyRole([
    "REQUESTER",
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);
  const saveAuditContext = await getAuditRequestContext();

  const input = purchaseRequestInputSchema.parse({
    purchaseRequestId: value(formData, "purchaseRequestId") || undefined,
    intent: value(formData, "intent"),
    title: value(formData, "title"),
    businessJustification: value(formData, "businessJustification"),
    priority: value(formData, "priority"),
    neededByDate: value(formData, "neededByDate"),
    originalCurrency: value(formData, "originalCurrency"),
    exchangeRateToUsd: value(formData, "exchangeRateToUsd"),
    exchangeRateSource: value(formData, "exchangeRateSource"),
    legalEntityId: value(formData, "legalEntityId"),
    siteId: value(formData, "siteId"),
    departmentId: value(formData, "departmentId"),
    lines: linesFromForm(formData),
  });

  if (!hasResourceScope(user.legalEntityScopeIds, input.legalEntityId || null)) {
    throw new Error("The selected legal entity is outside your assigned scope.");
  }
  if (!hasResourceScope(user.siteScopeIds, input.siteId || null)) {
    throw new Error("The selected site is outside your assigned scope.");
  }
  if (!hasResourceScope(user.departmentScopeIds, input.departmentId || null)) {
    throw new Error("The selected department is outside your assigned scope.");
  }

  const totalAmount = input.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const usdEquivalent = totalAmount * input.exchangeRateToUsd;
  const isSubmit = input.intent === "SUBMIT";

  let existing = null;
  if (input.purchaseRequestId) {
    existing = await prisma.purchaseRequest.findFirstOrThrow({
      where: {
        id: input.purchaseRequestId,
        tenantId: user.tenantId,
        requesterId: user.id,
        status: { in: ["DRAFT", "REJECTED"] },
      },
    });
  }

  const requestNumber = existing
    ? existing.requestNumber
    : `PR-${new Date().getFullYear()}-${String(
        (await prisma.purchaseRequest.count({ where: { tenantId: user.tenantId } })) + 1,
      ).padStart(6, "0")}`;

  const approvalChain = isSubmit
    ? await buildApprovalChain(user.tenantId, user.id, usdEquivalent)
    : [];

  const status = isSubmit
    ? approvalChain.length > 0
      ? PurchaseRequestStatus.SUBMITTED
      : PurchaseRequestStatus.UNDER_REVIEW
    : PurchaseRequestStatus.DRAFT;

  const request = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.purchaseRequestLine.deleteMany({
        where: { purchaseRequestId: existing.id },
      });
      await tx.purchaseRequestApproval.deleteMany({
        where: { purchaseRequestId: existing.id },
      });
    }

    const data = {
      tenantId: user.tenantId,
      requesterId: user.id,
      legalEntityId: input.legalEntityId || null,
      siteId: input.siteId || null,
      departmentId: input.departmentId || null,
      requestNumber,
      title: input.title,
      businessJustification: input.businessJustification,
      priority: input.priority as PurchaseRequestPriority,
      neededByDate: input.neededByDate ? new Date(input.neededByDate) : null,
      originalCurrency: input.originalCurrency,
      totalAmount,
      usdEquivalent,
      exchangeRateToUsd: input.exchangeRateToUsd,
      exchangeRateSource: input.exchangeRateSource,
      exchangeRateDate: new Date(),
      status,
      submittedAt: isSubmit ? new Date() : null,
      approvedAt: null,
      rejectedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      lines: {
        create: input.lines.map((line, index) => ({
          lineNumber: index + 1,
          description: line.description,
          category: line.category || null,
          quantity: line.quantity,
          unitOfMeasure: line.unitOfMeasure,
          unitPrice: line.unitPrice,
          lineTotal: line.quantity * line.unitPrice,
          supplierSuggestion: line.supplierSuggestion || null,
        })),
      },
      approvals: isSubmit && approvalChain.length
        ? {
            create: approvalChain.map((approver, index) => ({
              approverId: approver.userId,
              sequence: index + 1,
            })),
          }
        : undefined,
    };

    const saved = existing
      ? await tx.purchaseRequest.update({
          where: { id: existing.id },
          data: { ...data, revision: { increment: 1 } },
        })
      : await tx.purchaseRequest.create({ data });

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        ...saveAuditContext,
        action: isSubmit ? "purchase_request.submit" : "purchase_request.save_draft",
        resourceType: "PurchaseRequest",
        resourceId: saved.id,
        before: existing ? { status: existing.status, revision: existing.revision } : undefined,
        after: { status, requestNumber, totalAmount, usdEquivalent },
      },
    });

    return saved;
  });

  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${request.id}`);
}

export async function decidePurchaseRequestAction(formData: FormData) {
  const user = await requireAnyRole(["APPROVER", "TENANT_ADMIN", "TENANT_OWNER"]);
  const decisionAuditContext = await getAuditRequestContext();
  const input = approvalDecisionSchema.parse({
    purchaseRequestId: value(formData, "purchaseRequestId"),
    decision: value(formData, "decision"),
    comments: value(formData, "comments"),
  });

  const request = await prisma.purchaseRequest.findFirstOrThrow({
    where: { id: input.purchaseRequestId, tenantId: user.tenantId },
    include: { approvals: { orderBy: { sequence: "asc" } } },
  });

  const pending = request.approvals.find(
    (item) => item.decision === ApprovalDecision.PENDING,
  );
  const isAdmin = user.roles.some((role) => ["TENANT_ADMIN", "TENANT_OWNER"].includes(role));

  if (!pending || (pending.approverId !== user.id && !isAdmin)) {
    throw new Error("This approval step is not assigned to the current user.");
  }

  if (input.decision === "APPROVED") {
    assertApprovalAuthority(
      user.approvalLimitUsd,
      Number(request.usdEquivalent),
    );
  }

  const laterApproval = request.approvals.find(
    (item) => item.sequence > pending.sequence && item.decision === ApprovalDecision.PENDING,
  );

  const nextStatus =
    input.decision === "APPROVED"
      ? laterApproval
        ? PurchaseRequestStatus.UNDER_REVIEW
        : PurchaseRequestStatus.APPROVED
      : input.decision === "REJECTED"
        ? PurchaseRequestStatus.REJECTED
        : PurchaseRequestStatus.DRAFT;

  await prisma.$transaction(async (tx) => {
    await tx.purchaseRequestApproval.update({
      where: { id: pending.id },
      data: {
        decision: input.decision as ApprovalDecision,
        comments: input.comments || null,
        decidedAt: new Date(),
      },
    });

    if (input.decision !== "APPROVED") {
      await tx.purchaseRequestApproval.updateMany({
        where: {
          purchaseRequestId: request.id,
          sequence: { gt: pending.sequence },
          decision: ApprovalDecision.PENDING,
        },
        data: { decision: ApprovalDecision.RETURNED, decidedAt: new Date() },
      });
    }

    await tx.purchaseRequest.update({
      where: { id: request.id },
      data: {
        status: nextStatus,
        approvedAt: nextStatus === PurchaseRequestStatus.APPROVED ? new Date() : null,
        rejectedAt: nextStatus === PurchaseRequestStatus.REJECTED ? new Date() : null,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        ...decisionAuditContext,
        action: `purchase_request.${input.decision.toLowerCase()}`,
        resourceType: "PurchaseRequest",
        resourceId: request.id,
        before: { status: request.status, sequence: pending.sequence },
        after: { status: nextStatus, comments: input.comments },
      },
    });
  });

  await handleMarketplacePurchaseRequestDecision({
    purchaseRequestId: request.id,
    nextStatus,
    decision: input.decision,
    comments: input.comments,
    actorUserId: user.id,
  });

  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${request.id}`);
}

export async function escalatePurchaseRequestApprovalAction(
  formData: FormData,
) {
  const user = await requireAnyRole(["APPROVER"]);
  const auditContext = await getAuditRequestContext();

  const purchaseRequestId = value(formData, "purchaseRequestId");
  const escalationApproverId = value(formData, "escalationApproverId");
  const comments = value(formData, "escalationComments");

  if (!purchaseRequestId || !escalationApproverId) {
    throw new Error("Purchase Request and escalation approver are required.");
  }

  const request = await prisma.purchaseRequest.findFirstOrThrow({
    where: {
      id: purchaseRequestId,
      tenantId: user.tenantId,
    },
    include: {
      approvals: {
        orderBy: { sequence: "asc" },
      },
    },
  });

  const pending = request.approvals.find(
    (item) => item.decision === ApprovalDecision.PENDING,
  );

  if (!pending || pending.approverId !== user.id) {
    throw new Error(
      "Only the currently assigned approver may escalate this approval.",
    );
  }

  const currentMembership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: user.tenantId,
        userId: user.id,
      },
    },
    select: { approvalLimitUsd: true },
  });

  const requiredAmount = Number(request.usdEquivalent);
  const currentLimit =
    currentMembership?.approvalLimitUsd == null
      ? null
      : Number(currentMembership.approvalLimitUsd);

  if (currentLimit != null && currentLimit >= requiredAmount) {
    throw new Error(
      "Your approval authority covers this request. Approve, return, or reject it directly.",
    );
  }

  const target = await prisma.membership.findFirst({
    where: {
      tenantId: user.tenantId,
      userId: escalationApproverId,
      status: "ACTIVE",
      roles: { has: "APPROVER" },
      approvalLimitUsd: {
        gte: request.usdEquivalent,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!target) {
    throw new Error(
      "The selected escalation approver does not have sufficient approval authority.",
    );
  }

  const nextSequence =
    Math.max(0, ...request.approvals.map((item) => item.sequence)) + 1;

  await prisma.$transaction(async (tx) => {
    await tx.purchaseRequestApproval.update({
      where: { id: pending.id },
      data: {
        decision: ApprovalDecision.RETURNED,
        comments:
          comments ||
          `Escalated to ${target.user.email} because the assigned approval limit was insufficient.`,
        decidedAt: new Date(),
      },
    });

    await tx.purchaseRequestApproval.create({
      data: {
        purchaseRequestId: request.id,
        approverId: target.userId,
        sequence: nextSequence,
      },
    });

    await tx.purchaseRequest.update({
      where: { id: request.id },
      data: {
        status: PurchaseRequestStatus.UNDER_REVIEW,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        ...auditContext,
        action: "purchase_request.approval_escalated",
        resourceType: "PurchaseRequest",
        resourceId: request.id,
        before: {
          status: request.status,
          approverId: user.id,
          approverEmail: user.email,
          approvalLimitUsd: currentLimit,
          requiredAmountUsd: requiredAmount,
          approvalSequence: pending.sequence,
        },
        after: {
          status: "UNDER_REVIEW",
          escalatedToUserId: target.userId,
          escalatedToEmail: target.user.email,
          escalatedToLimitUsd: Number(target.approvalLimitUsd),
          newApprovalSequence: nextSequence,
          comments: comments || null,
        },
      },
    });
  });

  await createEnterpriseNotification({
    tenantId: user.tenantId,
    eventType: "PurchaseRequest.ApprovalEscalated",
    recipientUserId: target.user.id,
    recipientAddress: target.user.email ?? undefined,
    title: "Escalated purchase request approval",
    message:
      `${request.requestNumber} was escalated to you because the prior approver's authority was below the required USD ${requiredAmount.toLocaleString()}.`,
    actionUrl: `/app/requests/${request.id}`,
    channels: target.user.email ? ["IN_APP", "EMAIL"] : ["IN_APP"],
    priority: "HIGH",
  });

  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${request.id}`);
}

export async function cancelPurchaseRequestAction(formData: FormData) {
  const user = await requireAnyRole([
    "REQUESTER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);
  const input = cancelRequestSchema.parse({
    purchaseRequestId: value(formData, "purchaseRequestId"),
    cancellationReason: value(formData, "cancellationReason"),
  });

  const request = await prisma.purchaseRequest.findFirstOrThrow({
    where: { id: input.purchaseRequestId, tenantId: user.tenantId },
  });

  const isOwner = request.requesterId === user.id;
  const isAdmin = user.roles.some((role) =>
    ["PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"].includes(role),
  );
  if (!isOwner && !isAdmin) throw new Error("Cancellation is not authorized.");
  if (request.status === "APPROVED") throw new Error("Approved requests cannot be cancelled here.");

  await prisma.purchaseRequest.update({
    where: { id: request.id },
    data: {
      status: PurchaseRequestStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: input.cancellationReason,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "purchase_request.cancel",
      resourceType: "PurchaseRequest",
      resourceId: request.id,
      before: { status: request.status },
      after: { status: "CANCELLED", reason: input.cancellationReason },
    },
  });

  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${request.id}`);
}
