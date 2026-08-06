import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getRequisitionToOrderWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const journeys = await prisma.requisitionOrderJourney.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      milestones: {
        orderBy: { occurredAt: "desc" },
        take: 10,
      },
      exceptions: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return {
    journeys,
    totals: {
      all: journeys.length,
      awaitingApproval: journeys.filter((item) =>
        ["REQUISITION_SUBMITTED", "APPROVAL_PENDING"].includes(item.status),
      ).length,
      awaitingOrder: journeys.filter((item) =>
        ["APPROVED", "ORDER_PENDING"].includes(item.status),
      ).length,
      awaitingReceipt: journeys.filter((item) =>
        ["ORDER_ISSUED", "PARTIALLY_RECEIVED"].includes(item.status),
      ).length,
      exceptions: journeys.filter(
        (item) =>
          item.status === "EXCEPTION" ||
          item.exceptions.some((exception) =>
            ["OPEN", "INVESTIGATING"].includes(exception.status),
          ),
      ).length,
    },
  };
}
