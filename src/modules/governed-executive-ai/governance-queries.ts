import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getGovernedExecutiveAiGovernanceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [approvals, reviewableInsights] = await Promise.all([
    prisma.governedExecutiveInsightApproval.findMany({
      where: { tenantId },
      include: {
        insight: {
          include: {
            evidence: true,
          },
        },
        decisions: {
          orderBy: { decidedAt: "desc" },
        },
        auditEvents: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
      orderBy: [
        { status: "asc" },
        { dueAt: "asc" },
        { createdAt: "desc" },
      ],
      take: 200,
    }),
    prisma.governedExecutiveInsight.findMany({
      where: {
        tenantId,
        requiresHumanReview: true,
        approval: null,
        status: {
          in: ["PUBLISHED", "ACKNOWLEDGED"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    approvals,
    reviewableInsights,
  };
}
