import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSupplierPortalWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [suppliers, invitations, users, questionnaires, tasks, messages] =
    await Promise.all([
      prisma.supplier.findMany({
        where: { tenantId },
        orderBy: { legalName: "asc" },
      }),
      prisma.supplierPortalInvitation.findMany({
        where: { tenantId },
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.supplierPortalUser.findMany({
        where: { tenantId },
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.supplierOnboardingQuestionnaire.findMany({
        where: { tenantId },
        include: { supplier: true },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        take: 200,
      }),
      prisma.supplierPortalTask.findMany({
        where: { tenantId },
        include: { supplier: true },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        take: 200,
      }),
      prisma.supplierPortalMessage.findMany({
        where: { tenantId },
        include: { supplier: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

  const now = new Date();

  return {
    suppliers,
    invitations,
    users,
    questionnaires,
    tasks,
    messages,
    metrics: {
      activePortalUsers: users.filter(
        (portalUser) => portalUser.status === "ACTIVE",
      ).length,
      pendingInvitations: invitations.filter(
        (invitation) =>
          invitation.status === "PENDING" &&
          invitation.expiresAt > now,
      ).length,
      questionnairesDue: questionnaires.filter(
        (questionnaire) =>
          questionnaire.dueAt &&
          questionnaire.dueAt <= now &&
          !["APPROVED", "REJECTED", "EXPIRED"].includes(
            questionnaire.status,
          ),
      ).length,
      submittedQuestionnaires: questionnaires.filter(
        (questionnaire) => questionnaire.status === "SUBMITTED",
      ).length,
      openTasks: tasks.filter((task) =>
        ["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status),
      ).length,
      unreadSupplierMessages: messages.filter(
        (message) =>
          message.direction === "SUPPLIER_TO_BUYER" &&
          !message.readAt,
      ).length,
    },
  };
}
