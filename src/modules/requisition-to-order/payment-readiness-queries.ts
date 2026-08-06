import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPaymentReadinessWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [matchCases, readinessCases] = await Promise.all([
    prisma.threeWayMatchCase.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "APPROVED_FOR_PAYMENT",
        paymentReadinessCase: null,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.apPaymentReadinessCase.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        threeWayMatchCase: true,
        checks: true,
        holds: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { matchCases, readinessCases };
}
