import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getClauseLibrary() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const clauses = await prisma.clauseTemplate.findMany({
    where: {
      tenantId: session.user.tenantId,
      isActive: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return { session, clauses };
}

export async function getRenewalWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const warningDate = new Date(
    Date.now() + 120 * 24 * 60 * 60 * 1000,
  );

  const contracts = await prisma.contract.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: { in: ["ACTIVE", "APPROVED"] },
      endDate: {
        not: null,
        lte: warningDate,
      },
    },
    include: {
      supplier: true,
      obligations: true,
    },
    orderBy: { endDate: "asc" },
  });

  return { session, contracts };
}
