import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getGovernedExecutiveAiWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [insights, runs] = await Promise.all([
    prisma.governedExecutiveInsight.findMany({
      where: {
        tenantId,
        status: {
          in: ["PUBLISHED", "ACKNOWLEDGED"],
        },
      },
      include: {
        evidence: true,
        feedback: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: [
        { requiresHumanReview: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    }),
    prisma.governedExecutiveInsightRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { insights, runs };
}
