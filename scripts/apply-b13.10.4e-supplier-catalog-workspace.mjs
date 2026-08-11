#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);

  if (after === before) {
    console.log(`No change required: ${path}`);
  } else {
    fs.writeFileSync(path, after);
    console.log(`Updated: ${path}`);
  }
}

// ---------------------------------------------------------
// 1. Catalog page becomes listings/management only.
// ---------------------------------------------------------
patch(
  "src/app/app/marketplace/catalog/page.tsx",
  (source) => {
    // Add Publish Offering CTA for seller personas.
    const buyerActionsStart =
      '        {data.commercialPersona !== "SUPPLIER" ? (';

    if (
      !source.includes(
        'href="/app/marketplace/catalog/new"',
      )
    ) {
      const headerTarget =
        '      </div>\n\n      <form className={`${card} mt-8 grid gap-3 md:grid-cols-4`}>';

      const insertion = `      </div>

      {data.canManageCatalog ? (
        <div className="mt-6 flex justify-end">
          <Link
            href="/app/marketplace/catalog/new"
            className="inline-flex items-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
          >
            Publish Offering
          </Link>
        </div>
      ) : null}

      <form className={\`\${card} mt-8 grid gap-3 md:grid-cols-4\`}>`;

      if (source.includes(headerTarget)) {
        source = source.replace(
          headerTarget,
          insertion,
        );
      }
    }

    // Remove the entire embedded "Publish supplier offering" section.
    const publishHeading =
      '        <h2 className="text-xl font-black">\n          Publish supplier offering\n        </h2>';

    if (source.includes(publishHeading)) {
      const sectionStart = source.lastIndexOf(
        '      <section className={`${card} mt-8`}>',
        source.indexOf(publishHeading),
      );

      const visibilityHeading =
        '        <h2 className="text-xl font-black">\n          Offering visibility controls\n        </h2>';

      const visibilityHeadingIndex =
        source.indexOf(visibilityHeading);

      const visibilitySectionStart =
        source.lastIndexOf(
          '      <section className={`${card} mt-8`}>',
          visibilityHeadingIndex,
        );

      if (
        sectionStart === -1 ||
        visibilitySectionStart === -1
      ) {
        throw new Error(
          "Could not isolate embedded publish section.",
        );
      }

      source =
        source.slice(0, sectionStart) +
        source.slice(visibilitySectionStart);
    }

    // Improve management heading to reflect broader catalog role.
    source = source.replace(
      "Offering visibility controls",
      "Manage supplier listings",
    );

    return source;
  },
);

// ---------------------------------------------------------
// 2. Supplier command center gets separate publish entry.
// ---------------------------------------------------------
patch(
  "src/components/command-center/SupplierCommandCenter.tsx",
  (source) => {
    if (!source.includes("PlusCircle")) {
      source = source.replace(
        "  PackageCheck,\n",
        "  PackageCheck,\n  PlusCircle,\n",
      );
    }

    source = source.replace(
      `    title: "Product & Service Catalog",
    description:
      "Publish and maintain marketplace offerings, commercial details and availability.",
    href: "/app/marketplace/catalog",
    icon: Store,
  },`,
      `    title: "Product & Service Catalog",
    description:
      "View and manage marketplace listings, product media, visibility and availability.",
    href: "/app/marketplace/catalog",
    icon: Store,
  },
  {
    title: "Publish Offering",
    description:
      "Create a new product or service listing for buyers across the Enorsis marketplace.",
    href: "/app/marketplace/catalog/new",
    icon: PlusCircle,
  },`,
    );

    return source;
  },
);

// ---------------------------------------------------------
// 3. Redirect successful creation back to catalog.
// ---------------------------------------------------------
patch(
  "src/modules/marketplace-catalog/actions.ts",
  (source) => {
    if (
      !source.includes(
        'import { redirect } from "next/navigation";',
      )
    ) {
      source = source.replace(
        'import { revalidatePath } from "next/cache";',
        'import { revalidatePath } from "next/cache";\nimport { redirect } from "next/navigation";',
      );
    }

    const createEnd =
      '  revalidatePath("/app/marketplace/catalog");\n}';

    const createReplacement =
      '  revalidatePath("/app/marketplace/catalog");\n  redirect("/app/marketplace/catalog?created=1");\n}';

    const firstIndex = source.indexOf(createEnd);

    if (
      firstIndex !== -1 &&
      !source
        .slice(0, firstIndex + 200)
        .includes(
          'redirect("/app/marketplace/catalog?created=1")',
        )
    ) {
      source =
        source.slice(0, firstIndex) +
        createReplacement +
        source.slice(
          firstIndex + createEnd.length,
        );
    }

    return source;
  },
);

console.log(
  "B13.10.4E supplier catalog workspace and dedicated publishing flow integration complete.",
);
