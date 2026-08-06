import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getInventoryOperationsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [movements, availability, reservations, exceptions] =
    await Promise.all([
      prisma.inventoryMovementLedger.findMany({
        where: { tenantId },
        include: { exceptions: true },
        orderBy: { occurredAt: "desc" },
        take: 200,
      }),
      prisma.inventoryAvailabilitySnapshot.findMany({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      prisma.inventoryReservation.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.inventoryOperationException.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

  return { movements, availability, reservations, exceptions };
}
