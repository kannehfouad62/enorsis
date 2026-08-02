import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSourcingEvaluation(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const event = await prisma.sourcingEvent.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      criteria: { orderBy: { sequence: "asc" } },
      responses: {
        where: { status: "SUBMITTED" },
        include: {
          supplier: true,
          scores: true,
        },
      },
      award: true,
    },
  });

  if (!event) redirect("/app/sourcing");
  return { session, event };
}
