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

// Enterprise Module
patch(
  "src/modules/navigation/enterprise-modules.ts",
  (source) => {
    if (
      !source.includes(
        'href: "/app/activity-log"',
      )
    ) {
      const marker = `export const enterpriseModules: EnterpriseModuleLink[] = [`;

      const entry = `${marker}
  {
    title: "Activity Log",
    description:
      "Search tenant-scoped governance evidence across users, products, approvals and major business actions.",
    href: "/app/activity-log",
    icon: Activity,
    group: "Governance",
  },`;

      if (!source.includes(marker)) {
        throw new Error(
          "Enterprise Modules list anchor not found.",
        );
      }

      source = source.replace(marker, entry);
    }

    return source;
  },
);

// Registry access: server page further restricts to platform super admin or tenant admin/owner.
patch("src/core/modules/registry.ts", (source) => {
  if (!source.includes('"/app/activity-log"')) {
    const marker = `const metadataByHref: Record<string, Partial<RegistryMetadata>> = {`;

    const entry = `${marker}
  "/app/activity-log": {
    id: "governed-activity-log",
    featureKey: null,
    roles: [
      "PLATFORM_SUPER_ADMIN",
      "TENANT_OWNER",
      "TENANT_ADMIN",
    ],
    mobile: false,
    api: false,
    reporting: true,
    searchable: true,
    aiEligible: false,
    active: true,
  },
`;

    if (!source.includes(marker)) {
      throw new Error(
        "Module registry metadata anchor not found.",
      );
    }

    source = source.replace(marker, entry);
  }

  return source;
});

// Marketplace events: enrich creation audit with product name and capture request metadata.
patch(
  "src/modules/marketplace-catalog/actions.ts",
  (source) => {
    if (
      !source.includes(
        "@/core/audit/request-context",
      )
    ) {
      source = source.replace(
        `import { revalidatePath } from "next/cache";`,
        `import { revalidatePath } from "next/cache";
import { getAuditRequestContext } from "@/core/audit/request-context";`,
      );
    }

    if (
      source.includes(
        "export async function createMarketplaceOfferingAction",
      ) &&
      !source.includes(
        "const auditContext = await getAuditRequestContext();\n\n  const supplier =",
      )
    ) {
      source = source.replace(
        `  const user = await requireAnyRole([...roles]);

  const supplier =`,
        `  const user = await requireAnyRole([...roles]);
  const auditContext = await getAuditRequestContext();

  const supplier =`,
      );
    }

    source = source.replace(
      `        actorLabel: user.email ?? "Marketplace administrator",
        action: "supplier_marketplace.offering.create",`,
      `        actorLabel: user.email ?? "Marketplace administrator",
        ...auditContext,
        action: "supplier_marketplace.offering.create",`,
    );

    source = source.replace(
      `        offeringType: offering.offeringType,
        sku: offering.sku,`,
      `        offeringType: offering.offeringType,
        name: offering.name,
        shortDescription: offering.shortDescription,
        sku: offering.sku,`,
    );

    // If B13.10.10 is present, add request context to full offering updates.
    if (
      source.includes(
        "export async function updateMarketplaceOfferingDetailsAction",
      ) &&
      !source.includes(
        "const updateAuditContext = await getAuditRequestContext();",
      )
    ) {
      source = source.replace(
        `export async function updateMarketplaceOfferingDetailsAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);`,
        `export async function updateMarketplaceOfferingDetailsAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const updateAuditContext = await getAuditRequestContext();`,
      );

      source = source.replace(
        `      actorLabel:
        user.email ?? "Marketplace administrator",
      action: "supplier_marketplace.offering.update",`,
        `      actorLabel:
        user.email ?? "Marketplace administrator",
      ...updateAuditContext,
      action: "supplier_marketplace.offering.update",`,
      );
    }

    return source;
  },
);

// Purchase Request save/approval/cancel actions: capture IP, UA and request ID.
patch(
  "src/modules/purchase-requests/actions.ts",
  (source) => {
    if (
      !source.includes(
        "@/core/audit/request-context",
      )
    ) {
      source = source.replace(
        `import { prisma } from "@/lib/prisma";`,
        `import { prisma } from "@/lib/prisma";
import { getAuditRequestContext } from "@/core/audit/request-context";`,
      );
    }

    if (
      !source.includes(
        "const saveAuditContext = await getAuditRequestContext();",
      )
    ) {
      source = source.replace(
        `  const user = await requireAnyRole([
    "REQUESTER",`,
        `  const user = await requireAnyRole([
    "REQUESTER",`,
      );

      const saveAnchor = `  ]);

  const input = purchaseRequestInputSchema.parse({`;

      source = source.replace(
        saveAnchor,
        `  ]);
  const saveAuditContext = await getAuditRequestContext();

  const input = purchaseRequestInputSchema.parse({`,
      );
    }

    source = source.replace(
      `        actorLabel: user.email,
        action: isSubmit ? "purchase_request.submit" : "purchase_request.save_draft",`,
      `        actorLabel: user.email,
        ...saveAuditContext,
        action: isSubmit ? "purchase_request.submit" : "purchase_request.save_draft",`,
    );

    if (
      !source.includes(
        "const decisionAuditContext = await getAuditRequestContext();",
      )
    ) {
      source = source.replace(
        `export async function decidePurchaseRequestAction(formData: FormData) {
  const user = await requireAnyRole(["APPROVER", "TENANT_ADMIN", "TENANT_OWNER"]);`,
        `export async function decidePurchaseRequestAction(formData: FormData) {
  const user = await requireAnyRole(["APPROVER", "TENANT_ADMIN", "TENANT_OWNER"]);
  const decisionAuditContext = await getAuditRequestContext();`,
      );
    }

    source = source.replace(
      `        actorLabel: user.email,
        action: \`purchase_request.\${input.decision.toLowerCase()}\`,`,
      `        actorLabel: user.email,
        ...decisionAuditContext,
        action: \`purchase_request.\${input.decision.toLowerCase()}\`,`,
    );

    return source;
  },
);

// Platform tenant role changes: capture request metadata when B13.10.6 is present.
patch(
  "src/modules/platform-tenants/actions.ts",
  (source) => {
    if (
      !source.includes(
        "@/core/audit/request-context",
      )
    ) {
      source = source.replace(
        `import { auth } from "@/auth";`,
        `import { auth } from "@/auth";
import { getAuditRequestContext } from "@/core/audit/request-context";`,
      );
    }

    if (
      source.includes(
        "updatePlatformTenantMemberRolesAction",
      ) &&
      !source.includes(
        "const roleAuditContext = await getAuditRequestContext();",
      )
    ) {
      source = source.replace(
        `export async function updatePlatformTenantMemberRolesAction(
  formData: FormData,
) {
  const actor = await requirePlatformSuperAdmin();`,
        `export async function updatePlatformTenantMemberRolesAction(
  formData: FormData,
) {
  const actor = await requirePlatformSuperAdmin();
  const roleAuditContext = await getAuditRequestContext();`,
      );

      source = source.replace(
        `      actorLabel: actor.email,
      action: "platform.tenant.member.roles.update",`,
        `      actorLabel: actor.email,
      ...roleAuditContext,
      action: "platform.tenant.member.roles.update",`,
      );
    }

    return source;
  },
);

console.log(
  "B13.10.12 governed searchable Activity Log integration complete.",
);
