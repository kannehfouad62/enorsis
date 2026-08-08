import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

const asArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string",
      )
    : [];

export async function getMarketplaceCatalog(input: {
  q?: string;
  category?: string;
  type?: string;
  availability?: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;
  const q = input.q?.trim().toLowerCase() ?? "";
  const category =
    input.category?.trim().toLowerCase() ?? "";
  const type = input.type?.trim() ?? "";
  const availability = input.availability?.trim() ?? "";

  const [suppliers, offerings] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId },
      select: {
        id: true,
        supplierNumber: true,
        legalName: true,
        tradingName: true,
      },
      orderBy: { legalName: "asc" },
      take: 1000,
    }),
    prisma.supplierMarketplaceOffering.findMany({
      where: {
        tenantId,
        marketplaceVisible: true,
        ...(type ? { offeringType: type } : {}),
        ...(availability
          ? { availabilityStatus: availability }
          : {}),
      },
      orderBy: [
        { featured: "desc" },
        { updatedAt: "desc" },
      ],
      take: 1000,
    }),
  ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [
      supplier.id,
      supplier,
    ]),
  );

  const results = offerings
    .map((offering) => {
      const supplier = supplierMap.get(
        offering.supplierId,
      );
      if (!supplier) return null;

      const keywords = asArray(offering.keywords);
      const countries = asArray(
        offering.countriesAvailable,
      );
      const certifications = asArray(
        offering.certifications,
      );

      const searchable = [
        offering.name,
        offering.sku ?? "",
        offering.category ?? "",
        offering.subcategory ?? "",
        offering.brand ?? "",
        offering.manufacturer ?? "",
        offering.modelNumber ?? "",
        offering.shortDescription ?? "",
        offering.description ?? "",
        supplier.legalName,
        supplier.tradingName ?? "",
        supplier.supplierNumber,
        ...keywords,
        ...countries,
        ...certifications,
      ]
        .join(" ")
        .toLowerCase();

      if (q && !searchable.includes(q)) {
        return null;
      }

      if (
        category &&
        ![
          offering.category ?? "",
          offering.subcategory ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(category)
      ) {
        return null;
      }

      return {
        offering,
        supplier,
        keywords,
        countries,
        certifications,
      };
    })
    .filter(Boolean);

  return {
    suppliers,
    results,
  };
}
