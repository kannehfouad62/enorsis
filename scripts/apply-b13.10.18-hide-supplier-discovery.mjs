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

// Add commercial persona to Marketplace Trust workspace data.
patch("src/modules/marketplace-trust/queries.ts", (source) => {
  if (!source.includes("commercialPersona")) {
    source = source.replace(
      `  const tenantId = session.user.tenantId;

  const [`,
      `  const tenantId = session.user.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      commercialPersona: true,
    },
  });

  if (!tenant) {
    redirect("/app/unauthorized");
  }

  const [`,
    );

    source = source.replace(
      `  return {
    suppliers,`,
      `  return {
    commercialPersona: tenant.commercialPersona,
    suppliers,`,
    );
  }

  return source;
});

// Hide Supplier Discovery for supplier-only tenants.
patch("src/app/app/marketplace/trust/page.tsx", (source) => {
  const oldButton = `          <Link
            href="/app/marketplace/suppliers"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Supplier Discovery
          </Link>`;

  const guardedButton = `          {data.commercialPersona !== "SUPPLIER" ? (
            <Link
              href="/app/marketplace/suppliers"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
            >
              Supplier Discovery
            </Link>
          ) : null}`;

  if (
    source.includes(oldButton) &&
    !source.includes(
      'data.commercialPersona !== "SUPPLIER"',
    )
  ) {
    source = source.replace(
      oldButton,
      guardedButton,
    );
  }

  return source;
});

console.log(
  "B13.10.18 Supplier Discovery visibility hardening complete.",
);
