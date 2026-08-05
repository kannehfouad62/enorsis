import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSustainableProcurementWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [profiles, suppliers, members] = await Promise.all([
    prisma.supplierEsgProfile.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        assessments: {
          orderBy: { createdAt: "desc" },
        },
        improvementPlans: {
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        },
      },
      orderBy: [
        { riskLevel: "desc" },
        { updatedAt: "desc" },
      ],
      take: 250,
    }),
    prisma.supplier.findMany({
      where: {
        tenantId,
        esgProfile: null,
      },
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
    profiles,
    suppliers,
    members,
    metrics: {
      assessedSuppliers: profiles.filter(
        (profile) => profile.status === "ASSESSED",
      ).length,
      highRiskSuppliers: profiles.filter((profile) =>
        ["HIGH", "CRITICAL"].includes(profile.riskLevel),
      ).length,
      diversitySuppliers: profiles.filter(
        (profile) =>
          profile.diversityClassification !== "NONE",
      ).length,
      assessmentsDue: profiles.filter(
        (profile) =>
          profile.nextAssessmentDueAt &&
          profile.nextAssessmentDueAt <= now,
      ).length,
      openImprovements: profiles.reduce(
        (sum, profile) =>
          sum +
          profile.improvementPlans.filter((plan) =>
            ["OPEN", "IN_PROGRESS", "BLOCKED"].includes(
              plan.status,
            ),
          ).length,
        0,
      ),
      reportedEmissions: profiles.reduce(
        (sum, profile) =>
          sum +
          Number(profile.scope1Emissions ?? 0) +
          Number(profile.scope2Emissions ?? 0) +
          Number(profile.scope3Emissions ?? 0),
        0,
      ),
    },
  };
}
