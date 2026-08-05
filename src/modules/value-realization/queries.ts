import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getValueRealizationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [initiatives, suppliers, members] = await Promise.all([
    prisma.procurementValueInitiative.findMany({
      where: { tenantId },
      include: {
        benefits: {
          orderBy: { createdAt: "desc" },
        },
        milestones: {
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        },
      },
      orderBy: [
        { status: "asc" },
        { targetCompletionAt: "asc" },
      ],
      take: 250,
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { legalName: "asc" },
    }),
    prisma.membership.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const now = new Date();

  return {
    initiatives,
    suppliers,
    members,
    metrics: {
      activeInitiatives: initiatives.filter((initiative) =>
        ["QUALIFYING", "APPROVED", "IN_PROGRESS", "REALIZING"].includes(
          initiative.status,
        ),
      ).length,
      targetValue: initiatives.reduce(
        (sum, initiative) =>
          sum + Number(initiative.targetBenefitAmount),
        0,
      ),
      forecastValue: initiatives.reduce(
        (sum, initiative) =>
          sum + Number(initiative.forecastBenefitAmount),
        0,
      ),
      realizedValue: initiatives.reduce(
        (sum, initiative) =>
          sum + Number(initiative.realizedBenefitAmount),
        0,
      ),
      leakageValue: initiatives.reduce(
        (sum, initiative) => sum + Number(initiative.leakageAmount),
        0,
      ),
      overdueMilestones: initiatives.reduce(
        (sum, initiative) =>
          sum +
          initiative.milestones.filter(
            (milestone) =>
              !["COMPLETED", "CANCELLED"].includes(
                milestone.status,
              ) && milestone.dueAt < now,
          ).length,
        0,
      ),
    },
  };
}
