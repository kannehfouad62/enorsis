import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getProcurementCertificationWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [journeys, certifications] = await Promise.all([
    prisma.requisitionOrderJourney.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: {
          in: [
            "APPROVED",
            "ORDER_PENDING",
            "ORDER_ISSUED",
            "PARTIALLY_RECEIVED",
            "RECEIVED",
            "CLOSED",
            "EXCEPTION",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.procurementProcessCertification.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        journey: true,
        checks: {
          orderBy: [
            { category: "asc" },
            { name: "asc" },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return { journeys, certifications };
}
