import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getAccessGovernanceWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [rules, violations, campaigns, memberships] =
    await Promise.all([
      prisma.sodRule.findMany({
        where: { tenantId },
        orderBy: [{ severity: "desc" }, { name: "asc" }],
      }),
      prisma.sodViolation.findMany({
        where: { tenantId },
        include: { sodRule: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.accessReviewCampaign.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.membership.findMany({
        where: { tenantId, status: "ACTIVE" },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  return {
    session,
    rules,
    violations,
    campaigns,
    memberships,
    metrics: {
      activeRules: rules.filter((rule) => rule.status === "ACTIVE").length,
      openViolations: violations.filter((violation) =>
        ["OPEN", "REMEDIATION_REQUIRED"].includes(violation.status),
      ).length,
      activeReviews: campaigns.filter(
        (campaign) => campaign.status === "ACTIVE",
      ).length,
      pendingReviewItems: campaigns.reduce(
        (sum, campaign) =>
          sum +
          campaign.items.filter((item) => item.status === "PENDING").length,
        0,
      ),
    },
  };
}

export async function getAccessReviewCampaign(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const campaign = await prisma.accessReviewCampaign.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      items: {
        orderBy: [{ status: "asc" }, { userEmail: "asc" }],
      },
    },
  });

  if (!campaign) redirect("/app/settings/access-governance");
  return { session, campaign };
}
