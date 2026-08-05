import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCategoryManagementWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [strategies, members] = await Promise.all([
    prisma.categoryStrategy.findMany({
      where: { tenantId },
      include: {
        opportunities: {
          orderBy: [
            { status: "asc" },
            { targetCompletionAt: "asc" },
          ],
        },
        marketSignals: {
          orderBy: { observedAt: "desc" },
        },
      },
      orderBy: [
        { status: "asc" },
        { targetCompletionAt: "desc" },
      ],
      take: 200,
    }),
    prisma.membership.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    strategies,
    members,
    metrics: {
      activeStrategies: strategies.filter(
        (strategy) => strategy.status === "ACTIVE",
      ).length,
      addressableSpend: strategies.reduce(
        (sum, strategy) => sum + Number(strategy.addressableSpend),
        0,
      ),
      managedSpend: strategies.reduce(
        (sum, strategy) =>
          sum + Number(strategy.managedSpend ?? strategy.currentSpend),
        0,
      ),
      opportunityValue: strategies.reduce(
        (sum, strategy) =>
          sum +
          strategy.opportunities
            .filter((opportunity) =>
              [
                "IDENTIFIED",
                "QUALIFYING",
                "APPROVED",
                "IN_PROGRESS",
              ].includes(opportunity.status),
            )
            .reduce(
              (subtotal, opportunity) =>
                subtotal + Number(opportunity.estimatedValue),
              0,
            ),
        0,
      ),
      negativeSignals: strategies.reduce(
        (sum, strategy) =>
          sum +
          strategy.marketSignals.filter(
            (signal) => signal.direction === "NEGATIVE",
          ).length,
        0,
      ),
      supplierConcentration: strategies.filter(
        (strategy) => strategy.supplierCount <= 2,
      ).length,
    },
  };
}
