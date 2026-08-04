import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSupplierRiskPortfolio() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const now = new Date();
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      riskAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
      riskFindings: { where: { status: { in: ["OPEN", "MITIGATING"] } } },
      esgAssessments: { orderBy: { assessedAt: "desc" }, take: 1 },
      documents: true,
      contracts: { where: { status: { in: ["APPROVED", "ACTIVE"] } }, select: { totalValue: true } },
    },
    orderBy: { legalName: "asc" },
  });

  return {
    portfolio: suppliers.map((supplier) => ({
      ...supplier,
      latestAssessment: supplier.riskAssessments[0] ?? null,
      latestEsgAssessment: supplier.esgAssessments[0] ?? null,
      openFindings: supplier.riskFindings.length,
      expiredDocuments: supplier.documents.filter(
        (document) => document.status === "EXPIRED" || Boolean(document.expiresAt && document.expiresAt < now),
      ).length,
      contractExposure: supplier.contracts.reduce((sum, contract) => sum + Number(contract.totalValue ?? 0), 0),
    })),
  };
}

export async function getSupplierRiskDetail(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [supplier, members] = await Promise.all([
    prisma.supplier.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        riskAssessments: { orderBy: { createdAt: "desc" } },
        riskFindings: { orderBy: [{ status: "asc" }, { severity: "desc" }] },
        esgAssessments: { orderBy: { assessedAt: "desc" } },
        documents: { orderBy: { expiresAt: "asc" } },
        contracts: { where: { status: { in: ["APPROVED", "ACTIVE"] } } },
      },
    }),
    prisma.membership.findMany({
      where: { tenantId: session.user.tenantId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!supplier) redirect("/app/suppliers/risk");
  return { supplier, members };
}
