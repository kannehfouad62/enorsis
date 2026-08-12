#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);

  if (after === before) {
    console.log(`No change required: ${path}`);
    return;
  }

  fs.writeFileSync(path, after);
  console.log(`Updated: ${path}`);
}

patch("src/modules/marketplace-catalog/queries.ts", (source) => {
  if (!source.includes("getMarketplaceOfferingForEdit")) {
    source += `

export async function getMarketplaceOfferingForEdit(
  offeringId: string,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { commercialPersona: true },
  });

  if (
    !tenant ||
    !["SUPPLIER", "BUYER_SUPPLIER"].includes(
      tenant.commercialPersona,
    )
  ) {
    redirect("/app/unauthorized");
  }

  const offering =
    await prisma.supplierMarketplaceOffering.findFirst({
      where: {
        id: offeringId,
        tenantId: session.user.tenantId,
      },
    });

  if (!offering) {
    redirect("/app/unauthorized");
  }

  return {
    ...offering,
    countriesAvailable: asArray(
      offering.countriesAvailable,
    ),
    certifications: asArray(
      offering.certifications,
    ),
    keywords: asArray(
      offering.keywords,
    ),
  };
}
`;
  }

  return source;
});

patch("src/modules/marketplace-catalog/actions.ts", (source) => {
  if (!source.includes("updateMarketplaceOfferingDetailsAction")) {
    source += `

export async function updateMarketplaceOfferingDetailsAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const offeringId = field(data, "offeringId");

  const current =
    await prisma.supplierMarketplaceOffering.findFirst({
      where: {
        id: offeringId,
        tenantId: user.tenantId,
      },
    });

  if (!current) {
    throw new Error(
      "Marketplace offering was not found for this tenant.",
    );
  }

  const marketplaceVisible =
    field(data, "marketplaceVisible") === "true";

  const updated =
    await prisma.supplierMarketplaceOffering.update({
      where: { id: current.id },
      data: {
        offeringType:
          field(data, "offeringType") || current.offeringType,
        sku: field(data, "sku") || null,
        name: field(data, "name"),
        shortDescription:
          field(data, "shortDescription") || null,
        description:
          field(data, "description") || null,
        category:
          field(data, "category") || null,
        subcategory:
          field(data, "subcategory") || null,
        manufacturer:
          field(data, "manufacturer") || null,
        brand:
          field(data, "brand") || null,
        modelNumber:
          field(data, "modelNumber") || null,
        unitOfMeasure:
          field(data, "unitOfMeasure") || null,
        currencyCode:
          field(data, "currencyCode").toUpperCase() ||
          current.currencyCode,
        unitPrice:
          field(data, "unitPrice") || null,
        minimumOrderQty:
          field(data, "minimumOrderQty") || null,
        leadTimeDays:
          field(data, "leadTimeDays")
            ? Number(field(data, "leadTimeDays"))
            : null,
        availabilityStatus:
          field(data, "availabilityStatus") ||
          current.availabilityStatus,
        countriesAvailable: list(
          field(data, "countriesAvailable"),
        ),
        certifications: list(
          field(data, "certifications"),
        ),
        keywords: list(
          field(data, "keywords"),
        ),
        documentRef:
          field(data, "documentRef") || null,
        externalUrl:
          field(data, "externalUrl") || null,
        marketplaceVisible,
        featured:
          field(data, "featured") === "true",
        publishedAt:
          marketplaceVisible
            ? current.publishedAt ?? new Date()
            : null,
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Marketplace administrator",
      action: "supplier_marketplace.offering.update",
      resourceType: "SupplierMarketplaceOffering",
      resourceId: current.id,
      before: {
        name: current.name,
        sku: current.sku,
        unitPrice: current.unitPrice,
        currencyCode: current.currencyCode,
        availabilityStatus:
          current.availabilityStatus,
        marketplaceVisible:
          current.marketplaceVisible,
        featured: current.featured,
        countriesAvailable:
          current.countriesAvailable,
      },
      after: {
        name: updated.name,
        sku: updated.sku,
        unitPrice: updated.unitPrice,
        currencyCode: updated.currencyCode,
        availabilityStatus:
          updated.availabilityStatus,
        marketplaceVisible:
          updated.marketplaceVisible,
        featured: updated.featured,
        countriesAvailable:
          updated.countriesAvailable,
      },
    },
  });

  revalidatePath("/app/marketplace/catalog");
  revalidatePath(
    \`/app/marketplace/catalog/\${current.id}/edit\`,
  );
  redirect("/app/marketplace/catalog?updated=1");
}
`;
  }

  return source;
});

patch("src/app/app/marketplace/catalog/page.tsx", (source) => {
  const updateButton = `                <button className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                  Update listing
                </button>`;

  const enhanced = `                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={\`/app/marketplace/catalog/\${result.offering.id}/edit\`}
                    className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white"
                  >
                    Edit offering
                  </Link>
                  <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                    Update visibility
                  </button>
                </div>`;

  if (
    source.includes(updateButton) &&
    !source.includes("Edit offering")
  ) {
    source = source.replace(
      updateButton,
      enhanced,
    );
  }

  return source;
});

console.log(
  "B13.10.10 seller marketplace offering edit integration complete.",
);
