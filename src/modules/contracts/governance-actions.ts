"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

export async function submitContractForApprovalAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const contractId = value(formData, "contractId");
  const approverIds = formData
    .getAll("approverUserIds")
    .map(String)
    .filter(Boolean);

  if (approverIds.length === 0) {
    throw new Error("Assign at least one contract approver.");
  }

  const contract = await prisma.contract.findFirstOrThrow({
    where: { id: contractId, tenantId: user.tenantId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.contractApproval.deleteMany({
      where: { contractId: contract.id, decision: "PENDING" },
    });

    await tx.contractApproval.createMany({
      data: approverIds.map((approverUserId, index) => ({
        contractId: contract.id,
        approverUserId,
        sequence: index + 1,
      })),
    });

    await tx.contract.update({
      where: { id: contract.id },
      data: { status: "PENDING_APPROVAL" },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "contract.submit_for_approval",
        resourceType: "Contract",
        resourceId: contract.id,
        after: { approverUserIds: approverIds },
      },
    });
  });

  revalidatePath(`/app/contracts/${contract.id}`);
}

export async function decideContractApprovalAction(formData: FormData) {
  const user = await requireAnyRole([
    "APPROVER",
    "LEGAL",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const contractId = value(formData, "contractId");
  const decision = value(formData, "decision");
  const comments = value(formData, "comments");

  const contract = await prisma.contract.findFirstOrThrow({
    where: { id: contractId, tenantId: user.tenantId },
    include: { approvals: { orderBy: { sequence: "asc" } } },
  });

  const pending = contract.approvals.find(
    (approval) => approval.decision === "PENDING",
  );

  const isAdmin = user.roles.some((role) =>
    ["TENANT_ADMIN", "TENANT_OWNER"].includes(role),
  );

  if (!pending || (pending.approverUserId !== user.id && !isAdmin)) {
    throw new Error("This contract approval step is not assigned to you.");
  }

  const normalizedDecision =
    decision === "APPROVED"
      ? "APPROVED"
      : decision === "REJECTED"
        ? "REJECTED"
        : "RETURNED";

  const laterPending = contract.approvals.some(
    (approval) =>
      approval.sequence > pending.sequence &&
      approval.decision === "PENDING",
  );

  const nextStatus =
    normalizedDecision === "APPROVED"
      ? laterPending
        ? "PENDING_APPROVAL"
        : "APPROVED"
      : normalizedDecision === "REJECTED"
        ? "CANCELLED"
        : "IN_REVIEW";

  await prisma.$transaction([
    prisma.contractApproval.update({
      where: { id: pending.id },
      data: {
        decision: normalizedDecision,
        comments: comments || null,
        decidedAt: new Date(),
      },
    }),
    prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: nextStatus,
        approvedAt: nextStatus === "APPROVED" ? new Date() : null,
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: `contract_approval.${normalizedDecision.toLowerCase()}`,
        resourceType: "Contract",
        resourceId: contract.id,
        before: { status: contract.status },
        after: { status: nextStatus, comments },
      },
    }),
  ]);

  revalidatePath(`/app/contracts/${contract.id}`);
}

export async function activateContractAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const contractId = value(formData, "contractId");
  const contract = await prisma.contract.findFirstOrThrow({
    where: { id: contractId, tenantId: user.tenantId },
    include: {
      documents: true,
      clauses: true,
      approvals: true,
    },
  });

  if (contract.status !== "APPROVED") {
    throw new Error("Only approved contracts can be activated.");
  }

  if (!contract.documents.some((document) => document.type === "EXECUTED")) {
    throw new Error("Upload an executed contract document before activation.");
  }

  if (contract.clauses.some((clause) => clause.riskLevel === "PROHIBITED")) {
    throw new Error("Resolve prohibited clauses before activation.");
  }

  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: "ACTIVE",
      activatedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "contract.activate",
      resourceType: "Contract",
      resourceId: contract.id,
    },
  });

  revalidatePath(`/app/contracts/${contract.id}`);
}

export async function completeContractObligationAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const obligationId = value(formData, "obligationId");

  const obligation = await prisma.contractObligation.findFirstOrThrow({
    where: {
      id: obligationId,
      contract: { tenantId: user.tenantId },
    },
  });

  await prisma.contractObligation.update({
    where: { id: obligation.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  revalidatePath(`/app/contracts/${obligation.contractId}`);
}

export async function addContractRiskReviewAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "RISK_COMPLIANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const contractId = value(formData, "contractId");
  const legalRisk = Number(value(formData, "legalRisk"));
  const commercialRisk = Number(value(formData, "commercialRisk"));
  const dataPrivacyRisk = Number(value(formData, "dataPrivacyRisk"));
  const complianceRisk = Number(value(formData, "complianceRisk"));
  const summary = value(formData, "summary");

  const scores = [legalRisk, commercialRisk, dataPrivacyRisk, complianceRisk];
  if (scores.some((score) => !Number.isFinite(score) || score < 0 || score > 100)) {
    throw new Error("Risk scores must be between 0 and 100.");
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const riskLevel =
    average >= 75
      ? "CRITICAL"
      : average >= 50
        ? "HIGH"
        : average >= 25
          ? "MODERATE"
          : "LOW";

  const contract = await prisma.contract.findFirstOrThrow({
    where: { id: contractId, tenantId: user.tenantId },
  });

  await prisma.$transaction([
    prisma.contractRiskReview.create({
      data: {
        contractId: contract.id,
        reviewerUserId: user.id,
        riskLevel,
        legalRisk,
        commercialRisk,
        dataPrivacyRisk,
        complianceRisk,
        summary,
      },
    }),
    prisma.contract.update({
      where: { id: contract.id },
      data: { riskLevel },
    }),
  ]);

  revalidatePath(`/app/contracts/${contract.id}`);
}

export async function createClauseTemplateAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  await prisma.clauseTemplate.create({
    data: {
      tenantId: user.tenantId,
      key: value(formData, "key"),
      name: value(formData, "name"),
      category: value(formData, "category"),
      body: value(formData, "body"),
      riskLevel: value(formData, "riskLevel") as
        | "STANDARD"
        | "REVIEW"
        | "HIGH"
        | "PROHIBITED",
      required: formData.get("required") === "on",
    },
  });

  revalidatePath("/app/contracts/clauses");
}

export async function createContractAmendmentAction(formData: FormData) {
  const user = await requireAnyRole([
    "LEGAL",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const contractId = value(formData, "contractId");
  const contract = await prisma.contract.findFirstOrThrow({
    where: { id: contractId, tenantId: user.tenantId },
    include: { contractAmendments: true },
  });

  await prisma.contractAmendment.create({
    data: {
      contractId: contract.id,
      amendmentNumber: contract.contractAmendments.length + 1,
      title: value(formData, "title"),
      description: value(formData, "description"),
      effectiveDate: value(formData, "effectiveDate")
        ? new Date(value(formData, "effectiveDate"))
        : null,
      valueChange: value(formData, "valueChange")
        ? Number(value(formData, "valueChange"))
        : null,
      createdByUserId: user.id,
    },
  });

  revalidatePath(`/app/contracts/${contract.id}`);
}
