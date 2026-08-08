import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const supplierRoles = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
]);

const requestRoles = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "FINANCE",
  "AUDITOR",
]);

const contractRoles = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "LEGAL",
  "FINANCE",
  "RISK_COMPLIANCE",
  "AUDITOR",
]);

const insightRoles = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "AUDITOR",
]);

function hasAnyRole(
  userRoles: readonly string[],
  allowed: Set<string>,
) {
  return userRoles.some((role) => allowed.has(role));
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const tenantId = session.user.tenantId;
  const roles = session.user.roles;

  const [suppliers, requests, contracts, insights] =
    await Promise.all([
      hasAnyRole(roles, supplierRoles)
        ? prisma.supplier.findMany({
            where: {
              tenantId,
              OR: [
                {
                  legalName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  tradingName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  supplierNumber: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            },
            select: {
              id: true,
              supplierNumber: true,
              legalName: true,
              tradingName: true,
              status: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
          })
        : [],
      hasAnyRole(roles, requestRoles)
        ? prisma.purchaseRequest.findMany({
            where: {
              tenantId,
              OR: [
                {
                  title: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  requestNumber: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  businessJustification: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            },
            select: {
              id: true,
              requestNumber: true,
              title: true,
              status: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
          })
        : [],
      hasAnyRole(roles, contractRoles)
        ? prisma.contract.findMany({
            where: {
              tenantId,
              OR: [
                {
                  title: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  contractNumber: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  summary: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            },
            select: {
              id: true,
              contractNumber: true,
              title: true,
              status: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
          })
        : [],
      hasAnyRole(roles, insightRoles)
        ? prisma.governedExecutiveInsight.findMany({
            where: {
              tenantId,
              OR: [
                {
                  title: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  executiveSummary: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  recommendation: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  category: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            },
            select: {
              id: true,
              title: true,
              status: true,
              severity: true,
              category: true,
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
          })
        : [],
    ]);

  const results = [
    ...suppliers.map((supplier) => ({
      id: supplier.id,
      type: "Supplier" as const,
      title:
        supplier.tradingName ||
        supplier.legalName ||
        supplier.supplierNumber,
      subtitle: `${supplier.supplierNumber} · ${supplier.status}`,
      href: `/app/suppliers/${supplier.id}`,
    })),
    ...requests.map((purchaseRequest) => ({
      id: purchaseRequest.id,
      type: "Purchase request" as const,
      title: purchaseRequest.title,
      subtitle: `${purchaseRequest.requestNumber} · ${purchaseRequest.status}`,
      href: `/app/requests/${purchaseRequest.id}`,
    })),
    ...contracts.map((contract) => ({
      id: contract.id,
      type: "Contract" as const,
      title: contract.title,
      subtitle: `${contract.contractNumber} · ${contract.status}`,
      href: `/app/contracts/${contract.id}`,
    })),
    ...insights.map((insight) => ({
      id: insight.id,
      type: "Insight" as const,
      title: insight.title,
      subtitle: `${insight.category ?? "Executive insight"} · ${insight.severity} · ${insight.status}`,
      href: "/app/executive/ai-intelligence",
    })),
  ];

  return NextResponse.json({
    query,
    results: results.slice(0, 16),
  });
}
