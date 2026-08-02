import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const requestInclude = {
  requester: true,
  legalEntity: true,
  site: true,
  department: true,
  lines: { orderBy: { lineNumber: "asc" as const } },
  approvals: {
    include: { approver: true },
    orderBy: { sequence: "asc" as const },
  },
};

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
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: {
      legalEntities: { orderBy: { name: "asc" } },
      sites: { orderBy: { name: "asc" } },
      departments: { orderBy: { name: "asc" } },
      memberships: {
        where: { status: "ACTIVE", roles: { has: "APPROVER" } },
        include: { user: true },
      },
    },
  });

  if (!tenant) redirect("/app/settings/organization");
  return { session, tenant, requests };
}

export async function getPurchaseRequestDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const request = await prisma.purchaseRequest.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: requestInclude,
  });

  if (!request) redirect("/app/requests");

  const canView =
    request.requesterId === session.user.id ||
    request.approvals.some((approval) => approval.approverId === session.user.id) ||
    session.user.roles.some((role) =>
      ["TENANT_OWNER", "TENANT_ADMIN", "PROCUREMENT_MANAGER", "PROCUREMENT_EXECUTIVE", "AUDITOR"].includes(role),
    );

  if (!canView) redirect("/app/unauthorized");
  return { session, request };
}
