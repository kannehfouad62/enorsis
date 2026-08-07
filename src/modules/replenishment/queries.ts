import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getReplenishmentWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [policies, recommendations, transfers] = await Promise.all([
    prisma.replenishmentPolicy.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.stockReplenishmentRecommendation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.stockTransferOrder.findMany({
      where: { tenantId },
      include: { exceptions: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return { policies, recommendations, transfers };
}
