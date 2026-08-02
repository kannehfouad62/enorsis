import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getPurchaseRequestWorkspace() {
  const session = await auth();
  if (!session?.user) throw new Error("Authentication is required.");

  const requests = await prisma.purchaseRequest.findMany({
    where: {
      tenantId: session.user.tenantId,
      OR: [
        { requesterId: session.user.id },
        { approvals: { some: { approverId: session.user.id } } },
        ...(session.user.roles.some((role) =>
          ["TENANT_OWNER", "TENANT_ADMIN", "PROCUREMENT_MANAGER", "PROCUREMENT_EXECUTIVE"].includes(role)
        )
          ? [{}]
          : []),
      ],
    },
    include: {
      requester: true,
      lines: true,
      approvals: {
        include: { approver: true },
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: {
      legalEntities: { orderBy: { name: "asc" } },
      sites: { orderBy: { name: "asc" } },
      departments: { orderBy: { name: "asc" } },
      memberships: {
        where: {
          status: "ACTIVE",
          roles: { has: "APPROVER" },
        },
        include: { user: true },
      },
    },
  });

  if (!tenant) {
    redirect("/app/settings/organization");
  }

  return { session, tenant, requests };
}
