import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSourcingGovernance(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [event, members] = await Promise.all([
    prisma.sourcingEvent.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        evaluators: {
          orderBy: { assignedAt: "asc" },
        },
        rounds: {
          orderBy: { roundNumber: "asc" },
        },
        responses: {
          where: { status: "SUBMITTED" },
          include: {
            supplier: true,
            scores: true,
          },
          orderBy: { submittedAt: "asc" },
        },
      },
    }),
    prisma.membership.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "ACTIVE",
        roles: {
          hasSome: [
            "BUYER",
            "PROCUREMENT_MANAGER",
            "PROCUREMENT_EXECUTIVE",
            "RISK_COMPLIANCE",
            "AUDITOR",
          ],
        },
      },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!event) redirect("/app/sourcing");

  return { session, event, members };
}
