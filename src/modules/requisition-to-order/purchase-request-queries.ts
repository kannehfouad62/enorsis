import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPurchaseRequestIntegrationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [journeys, assessments] = await Promise.all([
    prisma.requisitionOrderJourney.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.requisitionSubmissionAssessment.findMany({
      where: { tenantId: session.user.tenantId },
      include: { journey: true, checks: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  return { journeys, assessments };
}
