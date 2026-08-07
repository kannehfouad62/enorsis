import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getExecutiveBoardDistributionWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [groups, packs, distributions] = await Promise.all([
    prisma.executiveBoardRecipientGroup.findMany({
      where: { tenantId },
      include: {
        members: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.executiveBoardPack.findMany({
      where: {
        tenantId,
        status: "FINALIZED",
      },
      orderBy: { periodEnd: "desc" },
      take: 100,
    }),
    prisma.executiveBoardDistribution.findMany({
      where: { tenantId },
      include: {
        boardPack: true,
        recipientGroup: true,
        deliveries: {
          include: {
            recipient: true,
            accessEvents: {
              orderBy: { occurredAt: "desc" },
              take: 10,
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return { groups, packs, distributions };
}
