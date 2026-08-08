import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const permittedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
]);

export async function getOcrWorkspace() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  if (
    !session.user.roles.some((role) => permittedRoles.has(role))
  ) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [supplierDocuments, contractDocuments, sources] =
    await Promise.all([
      prisma.supplierDocument.findMany({
        where: {
          supplier: { tenantId },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          supplier: {
            select: {
              supplierNumber: true,
              legalName: true,
              tradingName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.contractDocument.findMany({
        where: {
          contract: { tenantId },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          contract: {
            select: {
              contractNumber: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.enterpriseKnowledgeSource.findMany({
        where: {
          tenantId,
          sourceType: {
            in: ["SUPPLIER_DOCUMENT", "CONTRACT_DOCUMENT"],
          },
        },
        select: {
          externalReference: true,
          status: true,
          metadata: true,
          _count: { select: { chunks: true } },
        },
      }),
    ]);

  const sourceMap = new Map(
    sources
      .filter((source) => source.externalReference)
      .map((source) => [
        source.externalReference as string,
        source,
      ]),
  );

  return {
    supplierDocuments: supplierDocuments.map((document) => ({
      ...document,
      ragSource:
        sourceMap.get(`supplier-document:${document.id}`) ?? null,
    })),
    contractDocuments: contractDocuments.map((document) => ({
      ...document,
      ragSource:
        sourceMap.get(`contract-document:${document.id}`) ?? null,
    })),
  };
}
