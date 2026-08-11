#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);
  fs.writeFileSync(path, after);
}

patch("src/modules/marketplace-catalog/queries.ts", (source) => {
  if (!source.includes("@/core/marketplace/tenant-self-supplier")) {
    source = source.replace(
      'import { prisma } from "@/lib/prisma";',
      'import { prisma } from "@/lib/prisma";\nimport { ensureTenantSelfSupplierProfile } from "@/core/marketplace/tenant-self-supplier";',
    );
  }

  const oldBlock = `  const suppliers = await prisma.supplier.findMany({
    where: { tenantId },
    select: {
      id: true,
      supplierNumber: true,
      legalName: true,
      tradingName: true,
    },
    orderBy: { legalName: "asc" },
    take: 1000,
  });`;

  const newBlock = `  const selfSupplier = canManageCatalog
    ? await ensureTenantSelfSupplierProfile({
        tenantId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
      })
    : null;

  const suppliers = selfSupplier
    ? [{
        id: selfSupplier.id,
        supplierNumber: selfSupplier.supplierNumber,
        legalName: selfSupplier.legalName,
        tradingName: selfSupplier.tradingName,
      }]
    : [];`;

  if (source.includes(oldBlock)) {
    source = source.replace(oldBlock, newBlock);
  }

  source = source.replace(
    `        ...(isSupplierOnly
          ? { tenantId }
          : { marketplaceVisible: true }),`,
    `        ...(isSupplierOnly
          ? {
              tenantId,
              supplierId: selfSupplier?.id,
            }
          : { marketplaceVisible: true }),`,
  );

  source = source.replace(
    `    managementResults:
      results.filter(
        (result) =>
          result.offering.tenantId ===
          tenantId,
      ),
    comparisonGroups,`,
    `    managementResults:
      results.filter(
        (result) =>
          result.offering.tenantId === tenantId &&
          result.offering.supplierId === selfSupplier?.id,
      ),
    selfSupplier:
      selfSupplier
        ? {
            id: selfSupplier.id,
            supplierNumber: selfSupplier.supplierNumber,
            legalName: selfSupplier.legalName,
            tradingName: selfSupplier.tradingName,
          }
        : null,
    comparisonGroups,`,
  );

  return source;
});

patch("src/modules/marketplace-catalog/actions.ts", (source) => {
  if (!source.includes("@/core/marketplace/tenant-self-supplier")) {
    source = source.replace(
      'import { prisma } from "@/lib/prisma";',
      'import { prisma } from "@/lib/prisma";\nimport { ensureTenantSelfSupplierProfile } from "@/core/marketplace/tenant-self-supplier";',
    );
  }

  const oldBlock = `  const user = await requireAnyRole([...roles]);
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
  });`;

  const newBlock = `  const user = await requireAnyRole([...roles]);

  const supplier =
    await ensureTenantSelfSupplierProfile({
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorEmail: user.email,
    });

  const supplierId = supplier.id;`;

  if (source.includes(oldBlock)) {
    source = source.replace(oldBlock, newBlock);
  }

  return source;
});

patch("src/app/app/marketplace/catalog/page.tsx", (source) => {
  const oldHeader = `        <div className="flex gap-2">
          <Link
            href="/app/marketplace/suppliers"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Supplier Discovery
          </Link>
          <Link
            href="/app/buying"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Guided Buying
          </Link>
        </div>`;

  const newHeader = `        {data.commercialPersona !== "SUPPLIER" ? (
          <div className="flex gap-2">
            <Link
              href="/app/marketplace/suppliers"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800"
            >
              Supplier Discovery
            </Link>
            <Link
              href="/app/buying"
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Guided Buying
            </Link>
          </div>
        ) : null}`;

  if (source.includes(oldHeader)) {
    source = source.replace(oldHeader, newHeader);
  }

  source = source.replace(
    `        <p className="mt-2 text-sm text-slate-600">
          Create a marketplace product or service listing linked
          to an existing supplier.
        </p>`,
    `        <p className="mt-2 text-sm text-slate-600">
          Publish products and services under your organization's
          Enorsis marketplace supplier identity.
        </p>

        {data.selfSupplier ? (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">
              Marketplace seller
            </p>
            <p className="mt-2 font-black text-slate-950">
              {data.selfSupplier.tradingName ??
                data.selfSupplier.legalName}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Supplier identity · {data.selfSupplier.supplierNumber}
            </p>
          </div>
        ) : null}`,
  );

  const startMarker =
    '          <select className={input} name="supplierId" required>';
  const nextMarker =
    '          <select\n            className={input}\n            name="offeringType"';

  if (source.includes(startMarker)) {
    const start = source.indexOf(startMarker);
    const next = source.indexOf(nextMarker, start);
    if (next === -1) {
      throw new Error("Could not locate offering type selector.");
    }

    source =
      source.slice(0, start) +
      `          <div className={\`\${input} flex items-center font-bold text-slate-700\`}>
            Seller:{" "}
            {data.selfSupplier?.tradingName ??
              data.selfSupplier?.legalName ??
              "Supplier identity unavailable"}
          </div>
` +
      source.slice(next);
  }

  return source;
});

console.log(
  "B13.10.4C supplier self-identity and persona-aware marketplace navigation integration complete.",
);
