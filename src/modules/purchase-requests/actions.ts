"use server";

import { revalidatePath } from "next/cache";
import {
  ApprovalDecision,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  assertApprovalAuthority,
  hasResourceScope,
  requireAnyRole,
} from "@/core/auth/authorization";
import {
  approvalDecisionSchema,
  createPurchaseRequestSchema,
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

export async function createPurchaseRequestAction(formData: FormData) {
  const user = await requireAnyRole([
    "REQUESTER",
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const input = createPurchaseRequestSchema.parse({
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
  const requestCount = await prisma.purchaseRequest.count({
    where: { tenantId: user.tenantId },
  });
  const requestNumber = `PR-${new Date().getFullYear()}-${String(requestCount + 1).padStart(6, "0")}`;

  const approver = await prisma.membership.findFirst({
    where: {
      tenantId: user.tenantId,
      status: "ACTIVE",
      roles: { has: "APPROVER" },
      userId: { not: user.id },
      OR: [
        { approvalLimitUsd: null },
        { approvalLimitUsd: { gte: usdEquivalent } },
      ],
    },
    orderBy: { approvalLimitUsd: "asc" },
  });

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseRequest.create({
      data: {
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
        status: PurchaseRequestStatus.SUBMITTED,
        submittedAt: new Date(),
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
        approvals: approver
          ? {
              create: {
                approverId: approver.userId,
                sequence: 1,
              },
            }
          : undefined,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "purchase_request.submit",
        resourceType: "PurchaseRequest",
        resourceId: created.id,
        after: {
          requestNumber,
          totalAmount,
          originalCurrency: input.originalCurrency,
          usdEquivalent,
        },
      },
    });

    return created;
  });

  if (!approver) {
    await prisma.purchaseRequest.update({
      where: { id: request.id },
      data: { status: PurchaseRequestStatus.UNDER_REVIEW },
    });
  }

  revalidatePath("/app/requests");
}

export async function decidePurchaseRequestAction(formData: FormData) {
  const user = await requireAnyRole([
    "APPROVER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const input = approvalDecisionSchema.parse({
    purchaseRequestId: value(formData, "purchaseRequestId"),
    decision: value(formData, "decision"),
    comments: value(formData, "comments"),
  });

  const request = await prisma.purchaseRequest.findFirstOrThrow({
    where: {
      id: input.purchaseRequestId,
      tenantId: user.tenantId,
    },
    include: {
      approvals: true,
    },
  });

  const approval = request.approvals.find(
    (item) => item.approverId === user.id && item.decision === ApprovalDecision.PENDING,
  );

  if (!approval && !user.roles.some((role) => ["TENANT_ADMIN", "TENANT_OWNER"].includes(role))) {
    throw new Error("No pending approval is assigned to this user.");
  }

  assertApprovalAuthority(user.approvalLimitUsd, Number(request.usdEquivalent));

  const nextStatus =
    input.decision === "APPROVED"
      ? PurchaseRequestStatus.APPROVED
      : input.decision === "REJECTED"
        ? PurchaseRequestStatus.REJECTED
        : PurchaseRequestStatus.DRAFT;

  await prisma.$transaction(async (tx) => {
    if (approval) {
      await tx.purchaseRequestApproval.update({
        where: { id: approval.id },
        data: {
          decision: input.decision as ApprovalDecision,
          comments: input.comments || null,
          decidedAt: new Date(),
        },
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
        action: `purchase_request.${input.decision.toLowerCase()}`,
        resourceType: "PurchaseRequest",
        resourceId: request.id,
        before: { status: request.status },
        after: { status: nextStatus, comments: input.comments },
      },
    });
  });

  revalidatePath("/app/requests");
}
