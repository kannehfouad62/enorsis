import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getClosedLoopLearningProposalWorkspace() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !session.user.roles.some((role) =>
      roles.has(role),
    )
  ) {
    redirect("/app/unauthorized");
  }

  const proposals =
    await prisma.closedLoopLearningProposal.findMany({
      where: {
        tenantId: session.user.tenantId,
      },
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      take: 200,
    });

  return {
    proposals,
    metrics: {
      draft: proposals.filter(
        (item) => item.status === "DRAFT",
      ).length,
      approved: proposals.filter(
        (item) => item.status === "APPROVED",
      ).length,
      rejected: proposals.filter(
        (item) => item.status === "REJECTED",
      ).length,
      highPriority: proposals.filter(
        (item) =>
          item.status === "DRAFT" &&
          item.priority === "HIGH",
      ).length,
    },
  };
}
