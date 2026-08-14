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

patch("src/modules/procure-to-pay/actions.ts", (source) => {
  if (!source.includes("@/core/finance-automation/receipt-finance-orchestration")) {
    source = source.replace(
      `import { evaluateThreeWayMatch } from "./matching";`,
      `import { evaluateThreeWayMatch } from "./matching";
import {
  advanceClassicProcureToPayAfterReceipt,
} from "@/core/finance-automation/receipt-finance-orchestration";`,
    );
  }

  const marker = `  revalidatePath(\`/app/purchasing/orders/\${purchaseOrder.id}\`);
  revalidatePath(\`/app/purchasing/receipts/\${receipt.id}\`);
}

export async function submitSupplierInvoiceAction`;

  if (
    source.includes(marker) &&
    !source.slice(
      source.indexOf("export async function postReceiptAction"),
      source.indexOf("export async function submitSupplierInvoiceAction"),
    ).includes("advanceClassicProcureToPayAfterReceipt")
  ) {
    source = source.replace(
      marker,
      `  await advanceClassicProcureToPayAfterReceipt({
    purchaseOrderId: purchaseOrder.id,
    actorUserId: user.id,
  });

  revalidatePath(\`/app/purchasing/orders/\${purchaseOrder.id}\`);
  revalidatePath(\`/app/purchasing/receipts/\${receipt.id}\`);
  revalidatePath("/app/purchasing/invoices");
}

export async function submitSupplierInvoiceAction`,
    );
  }

  return source;
});

patch("src/core/requisition-to-order/goods-receipt.ts", (source) => {
  if (!source.includes("@/core/finance-automation/receipt-finance-orchestration")) {
    source = source.replace(
      `import { transitionRequisitionOrderJourney } from "./service";`,
      `import { transitionRequisitionOrderJourney } from "./service";
import {
  advanceGovernedRtoAfterReceipt,
} from "@/core/finance-automation/receipt-finance-orchestration";`,
    );
  }

  const returnMarker = `  return prisma.goodsReceiptSession.findUniqueOrThrow({
    where: { id: session.id },
    include: { lines: true, exceptions: true },
  });`;

  if (
    source.includes(returnMarker) &&
    !source.includes("advanceGovernedRtoAfterReceipt({")
  ) {
    source = source.replace(
      returnMarker,
      `  if (sessionStatus === "FULLY_ACCEPTED") {
    await advanceGovernedRtoAfterReceipt({
      purchaseOrderExecutionId:
        session.purchaseOrderExecutionId,
      actorUserId,
    });
  }

${returnMarker}`,
    );
  }

  return source;
});

patch("src/modules/marketplace-catalog/queries.ts", (source) => {
  source = source.replace(
    `  availability?: string;
}) {`,
    `  availability?: string;
  vendor?: string;
}) {`,
  );

  if (!source.includes("const vendor =")) {
    source = source.replace(
      `  const availability =
    input.availability?.trim() ?? "";`,
      `  const availability =
    input.availability?.trim() ?? "";
  const vendor =
    input.vendor?.trim() ?? "";`,
    );
  }

  const groupMarker = `  const groupMap = new Map<
    string,
    typeof results
  >();`;

  if (source.includes(groupMarker) && !source.includes("const vendorDirectoryMap")) {
    source = source.replace(
      groupMarker,
      `  const vendorDirectoryMap = new Map<
    string,
    {
      supplierId: string;
      supplierName: string;
      supplierNumber: string;
      offeringCount: number;
      productCount: number;
      serviceCount: number;
      categories: Set<string>;
      countries: Set<string>;
      location: (typeof results)[number]["sellerLocation"];
    }
  >();

  for (const result of results) {
    const existing = vendorDirectoryMap.get(result.supplier.id);
    const current =
      existing ?? {
        supplierId: result.supplier.id,
        supplierName:
          result.supplier.tradingName ??
          result.supplier.legalName,
        supplierNumber:
          result.supplier.supplierNumber,
        offeringCount: 0,
        productCount: 0,
        serviceCount: 0,
        categories: new Set<string>(),
        countries: new Set<string>(),
        location: result.sellerLocation,
      };

    current.offeringCount += 1;
    if (result.offering.offeringType === "SERVICE") {
      current.serviceCount += 1;
    } else {
      current.productCount += 1;
    }

    if (result.offering.category) {
      current.categories.add(result.offering.category);
    }
    for (const country of result.countries) {
      current.countries.add(country);
    }

    vendorDirectoryMap.set(result.supplier.id, current);
  }

  const vendorDirectory = [...vendorDirectoryMap.values()]
    .map((item) => ({
      ...item,
      categories: [...item.categories].sort(),
      countries: [...item.countries].sort(),
    }))
    .sort((left, right) =>
      left.supplierName.localeCompare(right.supplierName),
    );

  const displayResults = vendor
    ? results.filter(
        (result) => result.supplier.id === vendor,
      )
    : results;

${groupMarker}`,
    );
  }

  source = source.replace(
    `  for (const result of results) {
    const key = productFamilyKey(`,
    `  for (const result of displayResults) {
    const key = productFamilyKey(`,
  );

  if (!source.includes("vendorDirectory,")) {
    source = source.replace(
      `    comparisonGroups,
  };`,
      `    comparisonGroups,
    vendorDirectory,
    selectedVendor:
      vendorDirectory.find(
        (item) => item.supplierId === vendor,
      ) ?? null,
  };`,
    );
  }

  return source;
});

patch("src/app/app/marketplace/catalog/page.tsx", (source) => {
  if (!source.includes("@/components/marketplace/MarketplaceVendorDirectory")) {
    source = source.replace(
      `import { MarketplaceCartLink } from "@/components/marketplace/MarketplaceCartLink";`,
      `import { MarketplaceCartLink } from "@/components/marketplace/MarketplaceCartLink";
import { MarketplaceVendorDirectory } from "@/components/marketplace/MarketplaceVendorDirectory";`,
    );
  }

  source = source.replace(
    `    availability?: string;
  }>;`,
    `    availability?: string;
    vendor?: string;
  }>;`,
  );

  if (!source.includes('name="vendor"')) {
    source = source.replace(
      `<form className={\`\${card} mt-8 grid gap-3 md:grid-cols-4\`}>`,
      `<form className={\`\${card} mt-8 grid gap-3 md:grid-cols-4\`}>
        {params.vendor ? (
          <input
            type="hidden"
            name="vendor"
            value={params.vendor}
          />
        ) : null}`,
    );
  }

  const old = `      ) : (
        <MarketplaceComparisonResults
          groups={
            data.comparisonGroups
          }
        />
      )}`;

  const updated = `      ) : params.vendor ? (
        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                Vendor offerings
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {data.selectedVendor?.supplierName ??
                  "Marketplace vendor"}
              </h2>
            </div>
            <Link
              href="/app/marketplace/catalog"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black"
            >
              ← All vendors
            </Link>
          </div>
          <MarketplaceComparisonResults
            groups={data.comparisonGroups}
          />
        </section>
      ) : (
        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Marketplace vendors
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Browse by supplier
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Select a vendor to view the products and services that supplier offers.
            </p>
          </div>
          <MarketplaceVendorDirectory
            vendors={data.vendorDirectory}
          />
        </section>
      )}`;

  if (source.includes(old)) {
    source = source.replace(old, updated);
  }

  return source;
});

console.log(
  "B13.10.14 receipt-driven finance automation and vendor-first marketplace integration complete.",
);
