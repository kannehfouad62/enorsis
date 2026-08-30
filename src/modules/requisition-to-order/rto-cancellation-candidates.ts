import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getRtoCancellationCandidates() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const journeys =
    await prisma.requisitionOrderJourney.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        id: true,
        journeyNumber: true,
        title: true,
        status: true,
        createdAt: true,
        requiredByDate: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

  return journeys;
}
