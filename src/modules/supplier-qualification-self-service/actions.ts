"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ensureTenantSelfSupplierProfile } from "@/core/marketplace/tenant-self-supplier";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
]);

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

async function requireSupplierActor() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  if (!session.user.roles.some((role) => allowedRoles.has(role))) {
    redirect("/app/unauthorized");
  }

  const supplier = await ensureTenantSelfSupplierProfile({
    tenantId: session.user.tenantId,
    actorUserId: session.user.id,
    actorEmail: session.user.email,
  });

  return { user: session.user, supplier };
}

function revalidateQualification() {
  revalidatePath("/app/supplier-portal");
  revalidatePath("/app/supplier-portal/qualification");
}

export async function saveSupplierQuestionnaireAction(data: FormData) {
  const { user, supplier } = await requireSupplierActor();
  const questionnaireId = field(data, "questionnaireId");
  const intent = field(data, "intent");

  const questionnaire =
    await prisma.supplierOnboardingQuestionnaire.findFirstOrThrow({
      where: {
        id: questionnaireId,
        tenantId: user.tenantId,
        supplierId: supplier.id,
      },
    });

  if (["APPROVED", "REJECTED", "EXPIRED"].includes(questionnaire.status)) {
    throw new Error("This questionnaire no longer accepts supplier responses.");
  }

  const questions = Array.isArray(questionnaire.questions)
    ? questionnaire.questions
    : [];

  const answers: Record<string, string> = {};
  let answeredRequired = 0;
  let requiredCount = 0;

  for (const question of questions) {
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      continue;
    }

    const item = question as {
      key?: unknown;
      required?: unknown;
    };

    if (typeof item.key !== "string" || !item.key) {
      continue;
    }

    const answer = field(data, `answer:${item.key}`);
    answers[item.key] = answer;

    if (item.required === true) {
      requiredCount += 1;
      if (answer) answeredRequired += 1;
    }
  }

  const completionPercent =
    requiredCount > 0
      ? Math.round((answeredRequired / requiredCount) * 100)
      : 100;

  if (intent === "submit" && completionPercent < 100) {
    throw new Error(
      "Complete all required questionnaire fields before submission.",
    );
  }

  const status =
    intent === "submit"
      ? "SUBMITTED"
      : questionnaire.status === "SENT"
        ? "IN_PROGRESS"
        : questionnaire.status;

  const updated = await prisma.supplierOnboardingQuestionnaire.update({
    where: { id: questionnaire.id },
    data: {
      answers,
      completionPercent,
      status,
      submittedAt: intent === "submit" ? new Date() : questionnaire.submittedAt,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Supplier qualification user",
      action:
        intent === "submit"
          ? "supplier_qualification.questionnaire.submit"
          : "supplier_qualification.questionnaire.save",
      resourceType: "SupplierOnboardingQuestionnaire",
      resourceId: updated.id,
      after: {
        supplierId: supplier.id,
        status: updated.status,
        completionPercent: updated.completionPercent,
      },
    },
  });

  revalidateQualification();
}

export async function updateSupplierQualificationTaskAction(data: FormData) {
  const { user, supplier } = await requireSupplierActor();
  const taskId = field(data, "taskId");
  const intent = field(data, "intent");

  const task = await prisma.supplierPortalTask.findFirstOrThrow({
    where: {
      id: taskId,
      tenantId: user.tenantId,
      supplierId: supplier.id,
    },
  });

  if (["COMPLETED", "CANCELLED"].includes(task.status)) {
    throw new Error("This qualification task is no longer editable.");
  }

  const blocker = field(data, "blocker");
  const completionEvidence = field(data, "completionEvidence");

  let status = task.status;
  let completedAt = task.completedAt;

  if (intent === "start") {
    status = "IN_PROGRESS";
  } else if (intent === "blocked") {
    if (!blocker) {
      throw new Error("Provide a blocker before marking the task blocked.");
    }
    status = "BLOCKED";
  } else if (intent === "complete") {
    if (!completionEvidence) {
      throw new Error(
        "Provide completion evidence before completing the task.",
      );
    }
    status = "COMPLETED";
    completedAt = new Date();
  }

  const updated = await prisma.supplierPortalTask.update({
    where: { id: task.id },
    data: {
      status,
      blocker: blocker || null,
      completionEvidence: completionEvidence || null,
      completedAt,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Supplier qualification user",
      action: "supplier_qualification.task.update",
      resourceType: "SupplierPortalTask",
      resourceId: updated.id,
      after: {
        supplierId: supplier.id,
        status: updated.status,
        blocker: updated.blocker,
        completedAt: updated.completedAt,
      },
    },
  });

  revalidateQualification();
}
