"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export async function upsertMarketplaceProfileAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");

  const supplier = await prisma.supplier.findFirstOrThrow({
    where: {
      id: supplierId,
      tenantId: user.tenantId,
    },
    select: {
      id: true,
      supplierNumber: true,
    },
  });

  const marketplaceVisible =
    field(data, "marketplaceVisible") === "true";

  const profile = await prisma.supplierMarketplaceProfile.upsert({
    where: {
      tenantId_supplierId: {
        tenantId: user.tenantId,
        supplierId,
      },
    },
    update: {
      marketplaceVisible,
      verificationStatus:
        field(data, "verificationStatus") || "UNVERIFIED",
      headline: field(data, "headline") || null,
      description: field(data, "description") || null,
      websiteUrl: field(data, "websiteUrl") || null,
      headquartersCountry:
        field(data, "headquartersCountry") || null,
      countriesServed: list(
        field(data, "countriesServed"),
      ),
      industries: list(field(data, "industries")),
      categories: list(field(data, "categories")),
      capabilities: list(field(data, "capabilities")),
      certifications: list(field(data, "certifications")),
      keywords: list(field(data, "keywords")),
      preferredCurrency:
        field(data, "preferredCurrency").toUpperCase() || "USD",
      leadTimeDays: field(data, "leadTimeDays")
        ? Number(field(data, "leadTimeDays"))
        : null,
      employeeBand: field(data, "employeeBand") || null,
      annualRevenueBand:
        field(data, "annualRevenueBand") || null,
      sustainabilityTags: list(
        field(data, "sustainabilityTags"),
      ),
      diversityTags: list(field(data, "diversityTags")),
      publishedAt: marketplaceVisible ? new Date() : null,
    },
    create: {
      tenantId: user.tenantId,
      supplierId,
      marketplaceVisible,
      verificationStatus:
        field(data, "verificationStatus") || "UNVERIFIED",
      headline: field(data, "headline") || null,
      description: field(data, "description") || null,
      websiteUrl: field(data, "websiteUrl") || null,
      headquartersCountry:
        field(data, "headquartersCountry") || null,
      countriesServed: list(
        field(data, "countriesServed"),
      ),
      industries: list(field(data, "industries")),
      categories: list(field(data, "categories")),
      capabilities: list(field(data, "capabilities")),
      certifications: list(field(data, "certifications")),
      keywords: list(field(data, "keywords")),
      preferredCurrency:
        field(data, "preferredCurrency").toUpperCase() || "USD",
      leadTimeDays: field(data, "leadTimeDays")
        ? Number(field(data, "leadTimeDays"))
        : null,
      employeeBand: field(data, "employeeBand") || null,
      annualRevenueBand:
        field(data, "annualRevenueBand") || null,
      sustainabilityTags: list(
        field(data, "sustainabilityTags"),
      ),
      diversityTags: list(field(data, "diversityTags")),
      publishedAt: marketplaceVisible ? new Date() : null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Marketplace administrator",
      action: "supplier_marketplace.profile.upsert",
      resourceType: "SupplierMarketplaceProfile",
      resourceId: profile.id,
      after: {
        supplierId,
        supplierNumber: supplier.supplierNumber,
        marketplaceVisible,
        verificationStatus: profile.verificationStatus,
      },
    },
  });

  revalidatePath("/app/marketplace/suppliers");
}

export async function verifyMarketplaceSupplierAction(
  data: FormData,
) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "SUPPLIER_MANAGER",
    "RISK_COMPLIANCE",
  ]);

  const profileId = field(data, "profileId");
  const status = field(data, "status");

  await prisma.supplierMarketplaceProfile.updateMany({
    where: {
      id: profileId,
      tenantId: user.tenantId,
    },
    data: {
      verificationStatus: status,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      verifiedByUserId:
        status === "VERIFIED" ? user.id : null,
    },
  });

  revalidatePath("/app/marketplace/suppliers");
}
