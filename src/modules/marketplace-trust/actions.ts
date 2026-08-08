"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { recalculateMarketplaceTrust } from "@/core/marketplace/trust";
import { prisma } from "@/lib/prisma";

const adminRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
] as const;

const ratingRoles = [
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

const rating = (data: FormData, key: string) => {
  const raw = field(data, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    throw new Error(`${key} must be between 1 and 5.`);
  }
  return value;
};

async function requireSupplier(
  tenantId: string,
  supplierId: string,
) {
  return prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId },
    select: {
      id: true,
      supplierNumber: true,
    },
  });
}

export async function requestMarketplaceVerificationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...adminRoles]);
  const supplierId = field(data, "supplierId");
  const supplier = await requireSupplier(
    user.tenantId,
    supplierId,
  );

  const profile =
    await prisma.supplierMarketplaceProfile.findFirst({
      where: {
        tenantId: user.tenantId,
        supplierId,
      },
      select: { id: true },
    });

  const verification =
    await prisma.supplierMarketplaceVerification.create({
      data: {
        tenantId: user.tenantId,
        supplierId,
        marketplaceProfileId: profile?.id ?? null,
        verificationType:
          field(data, "verificationType") || "STANDARD",
        evidenceSummary:
          field(data, "evidenceSummary") || null,
        evidenceRefs: list(field(data, "evidenceRefs")),
        requestedByUserId: user.id,
        expiresAt: field(data, "expiresAt")
          ? new Date(field(data, "expiresAt"))
          : null,
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Marketplace verifier",
      action: "supplier_marketplace.verification.request",
      resourceType: "SupplierMarketplaceVerification",
      resourceId: verification.id,
      after: {
        supplierId,
        supplierNumber: supplier.supplierNumber,
        verificationType: verification.verificationType,
        status: verification.status,
      },
    },
  });

  revalidatePath("/app/marketplace/trust");
}

export async function decideMarketplaceVerificationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...adminRoles]);
  const verificationId = field(data, "verificationId");
  const decision = field(data, "decision");

  const verification =
    await prisma.supplierMarketplaceVerification.findFirstOrThrow({
      where: {
        id: verificationId,
        tenantId: user.tenantId,
      },
    });

  const status =
    decision === "VERIFY"
      ? "VERIFIED"
      : decision === "REJECT"
        ? "REJECTED"
        : "PENDING";

  await prisma.supplierMarketplaceVerification.update({
    where: { id: verification.id },
    data: {
      status,
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      reviewerNotes:
        field(data, "reviewerNotes") || null,
      suspendedAt: null,
      suspensionReason: null,
    },
  });

  await recalculateMarketplaceTrust(
    user.tenantId,
    verification.supplierId,
  );

  revalidatePath("/app/marketplace/trust");
  revalidatePath("/app/marketplace/suppliers");
}

export async function suspendMarketplaceSupplierAction(
  data: FormData,
) {
  const user = await requireAnyRole([...adminRoles]);
  const supplierId = field(data, "supplierId");

  const verification =
    await prisma.supplierMarketplaceVerification.findFirst({
      where: {
        tenantId: user.tenantId,
        supplierId,
        status: "VERIFIED",
      },
      orderBy: { reviewedAt: "desc" },
    });

  if (verification) {
    await prisma.supplierMarketplaceVerification.update({
      where: { id: verification.id },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
        suspensionReason:
          field(data, "reason") || "Marketplace suspension",
      },
    });
  }

  await prisma.supplierMarketplaceProfile.updateMany({
    where: {
      tenantId: user.tenantId,
      supplierId,
    },
    data: {
      verificationStatus: "SUSPENDED",
      verifiedAt: null,
      verifiedByUserId: null,
    },
  });

  revalidatePath("/app/marketplace/trust");
  revalidatePath("/app/marketplace/suppliers");
}

export async function reinstateMarketplaceSupplierAction(
  data: FormData,
) {
  const user = await requireAnyRole([...adminRoles]);
  const supplierId = field(data, "supplierId");

  const verification =
    await prisma.supplierMarketplaceVerification.findFirst({
      where: {
        tenantId: user.tenantId,
        supplierId,
        status: "SUSPENDED",
      },
      orderBy: { suspendedAt: "desc" },
    });

  if (verification) {
    await prisma.supplierMarketplaceVerification.update({
      where: { id: verification.id },
      data: {
        status: "VERIFIED",
        suspendedAt: null,
        suspensionReason: null,
        reinstatedAt: new Date(),
        reinstatedByUserId: user.id,
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
      },
    });
  }

  await recalculateMarketplaceTrust(
    user.tenantId,
    supplierId,
  );

  revalidatePath("/app/marketplace/trust");
  revalidatePath("/app/marketplace/suppliers");
}

export async function createMarketplaceRatingAction(
  data: FormData,
) {
  const user = await requireAnyRole([...ratingRoles]);
  const supplierId = field(data, "supplierId");
  await requireSupplier(user.tenantId, supplierId);

  const profile =
    await prisma.supplierMarketplaceProfile.findFirst({
      where: {
        tenantId: user.tenantId,
        supplierId,
      },
      select: { id: true },
    });

  const overall = rating(data, "overallRating");

  if (overall === null) {
    throw new Error("Overall rating is required.");
  }

  const review =
    await prisma.supplierMarketplaceRating.create({
      data: {
        tenantId: user.tenantId,
        supplierId,
        marketplaceProfileId: profile?.id ?? null,
        ratingType:
          field(data, "ratingType") || "BUYER_REVIEW",
        overallRating: overall,
        qualityRating: rating(data, "qualityRating"),
        deliveryRating: rating(data, "deliveryRating"),
        serviceRating: rating(data, "serviceRating"),
        valueRating: rating(data, "valueRating"),
        complianceRating: rating(
          data,
          "complianceRating",
        ),
        reviewTitle: field(data, "reviewTitle") || null,
        reviewText: field(data, "reviewText") || null,
        contextType: field(data, "contextType") || null,
        contextReference:
          field(data, "contextReference") || null,
        reviewerUserId: user.id,
        reviewerLabel: user.email ?? null,
      },
    });

  await recalculateMarketplaceTrust(
    user.tenantId,
    supplierId,
  );

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Marketplace reviewer",
      action: "supplier_marketplace.rating.create",
      resourceType: "SupplierMarketplaceRating",
      resourceId: review.id,
      after: {
        supplierId,
        overallRating: overall,
        ratingType: review.ratingType,
      },
    },
  });

  revalidatePath("/app/marketplace/trust");
  revalidatePath("/app/marketplace/suppliers");
}
