 "use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { getAuditRequestContext } from "@/core/audit/request-context";
import { prisma } from "@/lib/prisma";

const sellerProfileSchema = z.object({
  supplierId: z.string().trim().min(1),
  tradingName: z.string().trim().min(2).max(160),
  website: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine(
      (value) =>
        !value ||
        /^https?:\/\/.+/i.test(value),
      "Website must begin with http:// or https://.",
    ),
  primaryEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal("")),
  primaryPhone: z.string().trim().max(80).optional(),
  categories: z.array(z.string().trim().min(1).max(100)).max(30),
});

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

const allowedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
]);

export async function updateMarketplaceSellerProfileAction(
  formData: FormData,
) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  if (
    !session.user.roles.some((role) =>
      allowedRoles.has(role),
    )
  ) {
    redirect("/app/unauthorized");
  }

  const parsed = sellerProfileSchema.parse({
    supplierId: value(formData, "supplierId"),
    tradingName: value(formData, "tradingName"),
    website: value(formData, "website") || undefined,
    primaryEmail:
      value(formData, "primaryEmail") || undefined,
    primaryPhone:
      value(formData, "primaryPhone") || undefined,
    categories: value(formData, "categories")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  });

  const supplier = await prisma.supplier.findFirst({
    where: {
      id: parsed.supplierId,
      tenantId: session.user.tenantId,
      isTenantSelfProfile: true,
    },
  });

  if (!supplier) {
    throw new Error(
      "Marketplace seller profile was not found for this tenant.",
    );
  }

  const auditContext =
    await getAuditRequestContext();

  const updated = await prisma.supplier.update({
    where: { id: supplier.id },
    data: {
      tradingName: parsed.tradingName,
      website: parsed.website ?? null,
      primaryEmail:
        parsed.primaryEmail ?? null,
      primaryPhone:
        parsed.primaryPhone ?? null,
      categories: parsed.categories,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      actorType: "USER",
      actorId: session.user.id,
      actorLabel: session.user.email,
      ...auditContext,
      action:
        "marketplace.supplier.profile.update",
      resourceType: "Supplier",
      resourceId: supplier.id,
      before: {
        tradingName: supplier.tradingName,
        website: supplier.website,
        primaryEmail: supplier.primaryEmail,
        primaryPhone: supplier.primaryPhone,
        categories: supplier.categories,
      },
      after: {
        tradingName: updated.tradingName,
        website: updated.website,
        primaryEmail: updated.primaryEmail,
        primaryPhone: updated.primaryPhone,
        categories: updated.categories,
      },
    },
  });

  revalidatePath(
    "/app/marketplace/seller-profile",
  );
  revalidatePath("/app/marketplace/catalog");
}
