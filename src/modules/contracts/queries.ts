import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getContractWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [contracts, suppliers, awardedEvents, tenant] = await Promise.all([
    prisma.contract.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        supplier: true,
        obligations: true,
        approvals: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "APPROVED",
      },
      orderBy: { legalName: "asc" },
    }),
    prisma.sourcingEvent.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "AWARDED",
      },
      orderBy: { awardedAt: "desc" },
    }),
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
    }),
  ]);

  if (!tenant) redirect("/app/settings/organization");

  return { session, contracts, suppliers, awardedEvents, tenant };
}

export async function getContractDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [contract, members] = await Promise.all([
    prisma.contract.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        supplier: true,
        clauses: { orderBy: { sequence: "asc" } },
        approvals: { orderBy: { sequence: "asc" } },
        obligations: { orderBy: { dueDate: "asc" } },
        documents: { orderBy: { createdAt: "desc" } },
        riskReviews: { orderBy: { reviewedAt: "desc" } },
      },
    }),
    prisma.membership.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "ACTIVE",
      },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!contract) redirect("/app/contracts");
  return { session, contract, members };
}
