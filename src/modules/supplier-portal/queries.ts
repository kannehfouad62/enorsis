import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ensureTenantSelfSupplierProfile } from "@/core/marketplace/tenant-self-supplier";
import { prisma } from "@/lib/prisma";

const SELLER_PERSONAS = new Set(["SUPPLIER", "BUYER_SUPPLIER"]);

export async function getSupplierPortalWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      commercialPersona: true,
    },
  });

  if (!tenant || !SELLER_PERSONAS.has(tenant.commercialPersona)) {
    redirect("/app/unauthorized");
  }

  const selfSupplier = await ensureTenantSelfSupplierProfile({
    tenantId,
    actorUserId: session.user.id,
    actorEmail: session.user.email,
  });

  const [
    supplier,
    invitations,
    users,
    questionnaires,
    tasks,
    messages,
    activeTeamUsers,
  ] = await Promise.all([
    prisma.supplier.findUniqueOrThrow({
      where: { id: selfSupplier.id },
      include: {
        contacts: true,
        documents: true,
      },
    }),
    prisma.supplierPortalInvitation.findMany({
      where: { tenantId, supplierId: selfSupplier.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.supplierPortalUser.findMany({
      where: { tenantId, supplierId: selfSupplier.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.supplierOnboardingQuestionnaire.findMany({
      where: { tenantId, supplierId: selfSupplier.id },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 200,
    }),
    prisma.supplierPortalTask.findMany({
      where: { tenantId, supplierId: selfSupplier.id },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 200,
    }),
    prisma.supplierPortalMessage.findMany({
      where: { tenantId, supplierId: selfSupplier.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.membership.count({
      where: {
        tenantId,
        status: "ACTIVE",
      },
    }),
  ]);

  const now = new Date();
  const profileChecks = [
    Boolean(supplier.legalName),
    Boolean(supplier.tradingName),
    Boolean(supplier.countryCode),
    Boolean(supplier.taxIdentificationNo),
    Boolean(supplier.website),
    Boolean(supplier.primaryEmail),
    Boolean(supplier.primaryPhone),
    supplier.products.length > 0,
    supplier.services.length > 0,
    supplier.capabilities.length > 0,
    supplier.documents.length > 0,
  ];
  const profileCompletion = Math.round(
    (profileChecks.filter(Boolean).length / profileChecks.length) * 100,
  );

  const buyerRequests = questionnaires.filter((questionnaire) =>
    ["SENT", "IN_PROGRESS"].includes(questionnaire.status),
  ).length;
  const openTasks = tasks.filter((task) =>
    ["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status),
  ).length;
  const documentsRequiringAttention = supplier.documents.filter((document) =>
    ["PENDING_VERIFICATION", "REJECTED", "EXPIRED"].includes(
      document.status,
    ),
  ).length;
  const unreadBuyerMessages = messages.filter(
    (message) =>
      message.direction === "BUYER_TO_SUPPLIER" && !message.readAt,
  ).length;

  return {
    tenant,
    supplier,
    // Preserve the legacy shape while the page transitions away from
    // buyer-style supplier selection controls.
    suppliers: [supplier],
    invitations,
    users,
    questionnaires,
    tasks,
    messages,
    metrics: {
      profileCompletion,
      qualificationStatus: supplier.qualificationStatus,
      documentsRequiringAttention,
      buyerRequests,
      openQualificationTasks: openTasks,
      unreadBuyerMessages,
      activeTeamUsers,
      activePortalUsers: users.filter(
        (portalUser) => portalUser.status === "ACTIVE",
      ).length,
      pendingInvitations: invitations.filter(
        (invitation) =>
          invitation.status === "PENDING" && invitation.expiresAt > now,
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
      openTasks,
      unreadSupplierMessages: unreadBuyerMessages,
    },
  };
}
