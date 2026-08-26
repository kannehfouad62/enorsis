import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "PLATFORM_SUPER_ADMIN",
]);

export async function getBuyerSupplierQualificationWorkspace() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  if (!session.user.roles.some((role) => allowedRoles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [suppliers, questionnaires, tasks] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId },
      select: {
        id: true,
        supplierNumber: true,
        legalName: true,
        tradingName: true,
        qualificationStatus: true,
        status: true,
      },
      orderBy: { legalName: "asc" },
      take: 500,
    }),
    prisma.supplierOnboardingQuestionnaire.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 250,
    }),
    prisma.supplierPortalTask.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 250,
    }),
  ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );

  const now = new Date();

  const activeQuestionnaires = questionnaires.filter((questionnaire) =>
    ["SENT", "IN_PROGRESS", "SUBMITTED"].includes(questionnaire.status),
  ).length;

  const overdueQuestionnaires = questionnaires.filter(
    (questionnaire) =>
      questionnaire.dueAt &&
      questionnaire.dueAt < now &&
      !["APPROVED", "REJECTED", "EXPIRED"].includes(questionnaire.status),
  ).length;

  const openTasks = tasks.filter((task) =>
    ["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status),
  ).length;

  const overdueTasks = tasks.filter(
    (task) =>
      task.dueAt &&
      task.dueAt < now &&
      !["COMPLETED", "CANCELLED", "CLOSED"].includes(task.status),
  ).length;

  return {
    session,
    suppliers,
    questionnaires: questionnaires.map((questionnaire) => ({
      ...questionnaire,
      supplier: supplierMap.get(questionnaire.supplierId) ?? null,
    })),
    tasks: tasks.map((task) => ({
      ...task,
      supplier: supplierMap.get(task.supplierId) ?? null,
    })),
    metrics: {
      totalSuppliers: suppliers.length,
      activeQuestionnaires,
      overdueQuestionnaires,
      openTasks,
      overdueTasks,
    },
  };
}
