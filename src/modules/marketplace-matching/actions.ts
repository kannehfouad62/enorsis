"use server";

import { revalidatePath } from "next/cache";
import { executeGovernedAi } from "@/core/ai/gateway";
import { rankMarketplaceSuppliers } from "@/core/marketplace/supplier-matching";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export async function runAiSupplierMatchAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const title =
    field(data, "title") || "Supplier Match";
  const requirementText = field(
    data,
    "requirementText",
  );

  if (requirementText.length < 10) {
    throw new Error(
      "Provide a meaningful sourcing requirement.",
    );
  }

  const capabilities = list(
    field(data, "requiredCapabilities"),
  );

  const certifications = list(
    field(data, "requiredCertifications"),
  );

  const preferredCurrency =
    field(data, "preferredCurrency").toUpperCase() ||
    null;

  const maxLeadTimeDays = field(
    data,
    "maxLeadTimeDays",
  )
    ? Number(field(data, "maxLeadTimeDays"))
    : null;

  const verificationRequired =
    field(data, "verificationRequired") === "true";

  const ranked = await rankMarketplaceSuppliers({
    tenantId: user.tenantId,
    category: field(data, "category") || null,
    country: field(data, "country") || null,
    capabilities,
    certifications,
    preferredCurrency,
    maxLeadTimeDays,
    verificationRequired,
  });

  const run = await prisma.supplierMarketplaceMatchRun.create({
    data: {
      tenantId: user.tenantId,
      createdByUserId: user.id,
      title,
      requirementText,
      category: field(data, "category") || null,
      country: field(data, "country") || null,
      requiredCapabilities: capabilities,
      requiredCertifications: certifications,
      preferredCurrency,
      maxLeadTimeDays,
      verificationRequired,
      candidateCount: ranked.length,
      weights: {
        capability: 0.3,
        geography: 0.12,
        trust: 0.18,
        performance: 0.15,
        risk: 0.15,
        catalog: 0.1,
      },
    },
  });

  if (ranked.length > 0) {
    await prisma.supplierMarketplaceMatchResult.createMany({
      data: ranked.slice(0, 50).map((item) => ({
        tenantId: user.tenantId,
        matchRunId: run.id,
        supplierId: item.supplier.id,
        rank: item.rank,
        totalScore: item.totalScore,
        capabilityScore:
          item.capabilityScore,
        geographyScore:
          item.geographyScore,
        trustScore: item.trustScore,
        performanceScore:
          item.performanceScore,
        riskScore: item.riskScore,
        catalogScore: item.catalogScore,
        evidence: item.evidence,
      })),
    });
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Supplier matching user",
      action: "supplier_marketplace.match.run",
      resourceType:
        "SupplierMarketplaceMatchRun",
      resourceId: run.id,
      after: {
        candidateCount: ranked.length,
        verificationRequired,
      },
    },
  });

  if (ranked.length > 0) {
    const shortlist = ranked
      .slice(0, 8)
      .map((item) => ({
        rank: item.rank,
        supplier:
          item.supplier.tradingName ??
          item.supplier.legalName,
        supplierNumber:
          item.supplier.supplierNumber,
        totalScore: item.totalScore,
        capabilityScore:
          item.capabilityScore,
        geographyScore:
          item.geographyScore,
        trustScore: item.trustScore,
        performanceScore:
          item.performanceScore,
        riskScore: item.riskScore,
        catalogScore: item.catalogScore,
        evidence: item.evidence,
      }));

    try {
      const execution = await executeGovernedAi({
        tenantId: user.tenantId,
        userId: user.id,
        userEmail:
          user.email ?? "unknown@enorsis.local",
        capability: "SUPPLIER_ANALYSIS",
        resourceType:
          "SupplierMarketplaceMatchRun",
        resourceId: run.id,
        input: [
          "Analyze the following deterministic Enorsis supplier-match shortlist.",
          "Do not change the numeric ranking.",
          "Explain evidence, strengths, gaps, missing due diligence, and risks.",
          "Do not approve or select a supplier.",
          "",
          `Sourcing requirement: ${requirementText}`,
          `Category: ${field(data, "category") || "not specified"}`,
          `Country: ${field(data, "country") || "not specified"}`,
          `Required capabilities: ${capabilities.join(", ") || "not specified"}`,
          `Required certifications: ${certifications.join(", ") || "not specified"}`,
          "",
          `Deterministic shortlist: ${JSON.stringify(shortlist)}`,
        ].join("\n"),
      });

      await prisma.supplierMarketplaceMatchRun.update({
        where: { id: run.id },
        data: {
          aiExecutionId: execution.id,
          aiSummary: execution.outputText,
        },
      });
    } catch (error) {
      await prisma.supplierMarketplaceMatchRun.update({
        where: { id: run.id },
        data: {
          aiError:
            error instanceof Error
              ? error.message
              : "AI analysis failed.",
        },
      });
    }
  }

  revalidatePath("/app/marketplace/matching");
}
