import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSourcingWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [events, suppliers, tenant] = await Promise.all([
    prisma.sourcingEvent.findMany({
      where: { tenantId: session.user.tenantId },
      include: { invitations: true, responses: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: { tenantId: session.user.tenantId, status: "APPROVED" },
      orderBy: { legalName: "asc" },
    }),
    prisma.tenant.findUnique({ where: { id: session.user.tenantId } }),
  ]);

  if (!tenant) redirect("/app/settings/organization");
  return { session, events, suppliers, tenant };
}

export async function getSourcingEvent(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const event = await prisma.sourcingEvent.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      invitations: { include: { supplier: true } },
      responses: { include: { supplier: true } },
    },
  });

  if (!event) redirect("/app/sourcing");
  return { session, event };
}
