#!/usr/bin/env node
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s);

function mustReplace(source, oldValue, newValue, label) {
  if (!source.includes(oldValue)) throw new Error(`Could not locate ${label}.`);
  return source.replace(oldValue, newValue);
}

// platform tenant schemas
{
  const p = "src/modules/platform-tenants/schemas.ts";
  let s = read(p);

  if (!s.includes("updatePlatformTenantCommercialPersonaSchema")) {
    s = s.replace(
      "  legalName: z.string().trim().min(2).max(200),",
      `  legalName: z.string().trim().min(2).max(200),
  commercialPersona: z.enum(["BUYER", "SUPPLIER", "BUYER_SUPPLIER"]),`,
    );

    s += `

export const updatePlatformTenantCommercialPersonaSchema = z.object({
  tenantId: z.string().trim().min(1),
  commercialPersona: z.enum(["BUYER", "SUPPLIER", "BUYER_SUPPLIER"]),
});
`;
  }
  write(p, s);
}

// platform tenant actions
{
  const p = "src/modules/platform-tenants/actions.ts";
  let s = read(p);

  if (!s.includes("TenantCommercialPersona,")) {
    s = s.replace("  TenantStatus,", `  TenantStatus,
  TenantCommercialPersona,`);
  }

  if (!s.includes("updatePlatformTenantCommercialPersonaSchema,")) {
    s = s.replace("  updatePlatformTenantStatusSchema,", `  updatePlatformTenantStatusSchema,
  updatePlatformTenantCommercialPersonaSchema,`);
  }

  if (!s.includes('commercialPersona: value(formData, "commercialPersona")')) {
    s = s.replace('    legalName: value(formData, "legalName"),',
      `    legalName: value(formData, "legalName"),
    commercialPersona: value(formData, "commercialPersona"),`);
  }

  if (!s.includes("commercialPersona:\n          input.commercialPersona as TenantCommercialPersona")) {
    s = s.replace("        legalName: input.legalName,",
      `        legalName: input.legalName,
        commercialPersona:
          input.commercialPersona as TenantCommercialPersona,`);
  }

  if (!s.includes("updatePlatformTenantCommercialPersonaAction")) {
    s += `

export async function updatePlatformTenantCommercialPersonaAction(formData: FormData) {
  const actor = await requirePlatformSuperAdmin();

  const input = updatePlatformTenantCommercialPersonaSchema.parse({
    tenantId: value(formData, "tenantId"),
    commercialPersona: value(formData, "commercialPersona"),
  });

  const before = await prisma.tenant.findUniqueOrThrow({
    where: { id: input.tenantId },
    select: { commercialPersona: true, name: true },
  });

  const updated = await prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      commercialPersona:
        input.commercialPersona as TenantCommercialPersona,
    },
    select: { id: true, name: true, commercialPersona: true },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: updated.id,
      userId: actor.id,
      actorType: "USER",
      actorId: actor.id,
      actorLabel: actor.email,
      action: "platform.tenant.commercial-persona.update",
      resourceType: "Tenant",
      resourceId: updated.id,
      before: {
        name: before.name,
        commercialPersona: before.commercialPersona,
      },
      after: {
        name: updated.name,
        commercialPersona: updated.commercialPersona,
      },
    },
  });

  revalidatePath("/app/settings/tenants");
  revalidatePath(\`/app/settings/tenants/\${updated.id}\`);
}
`;
  }

  write(p, s);
}

// create tenant UI
{
  const p = "src/app/app/settings/tenants/page.tsx";
  let s = read(p);

  if (!s.includes('name="commercialPersona"')) {
    const anchor =
      '          <Field label="Tenant slug" name="slug" placeholder="atlas-global-industries" required />';

    const selector = `          <label className="text-sm font-bold text-slate-700">
            Commercial classification
            <select
              name="commercialPersona"
              defaultValue="BUYER"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-950"
            >
              <option value="BUYER">Buyer</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="BUYER_SUPPLIER">Buyer + Supplier</option>
            </select>
          </label>
`;
    s = mustReplace(s, anchor, selector + anchor, "tenant create slug field");
  }

  if (!s.includes(">Persona</th>")) {
    s = s.replace('<th className="px-3 py-3">Status</th>',
      `<th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Persona</th>`);
    s = s.replace('<td className="px-3 py-4">{tenant.status}</td>',
      `<td className="px-3 py-4">{tenant.status}</td>
                  <td className="px-3 py-4">
                    {tenant.commercialPersona.replaceAll("_", " + ")}
                  </td>`);
  }

  write(p, s);
}

// tenant detail UI
{
  const p = "src/app/app/settings/tenants/[id]/page.tsx";
  let s = read(p);

  if (!s.includes("updatePlatformTenantCommercialPersonaAction")) {
    s = s.replace("  updatePlatformTenantStatusAction,",
      `  updatePlatformTenantStatusAction,
  updatePlatformTenantCommercialPersonaAction,`);
  }

  if (!s.includes('label="Commercial persona"')) {
    s = s.replace('<Item label="Country" value={tenant.countryCode ?? "—"} />',
      `<Item label="Country" value={tenant.countryCode ?? "—"} />
          <Item
            label="Commercial persona"
            value={tenant.commercialPersona.replaceAll("_", " + ")}
          />`);
  }

  if (!s.includes("Update commercial classification")) {
    const anchor = `      <section className={\`\${card} mt-8\`}>
        <h2 className="text-xl font-black">Lifecycle control</h2>`;
    const section = `      <section className={\`\${card} mt-8\`}>
        <h2 className="text-xl font-black">Update commercial classification</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Classification controls the tenant's commercial workspace,
          module visibility and protected buyer/supplier route access.
        </p>
        <form
          action={updatePlatformTenantCommercialPersonaAction}
          className="mt-5 flex flex-wrap gap-3"
        >
          <input type="hidden" name="tenantId" value={tenant.id} />
          <select
            name="commercialPersona"
            defaultValue={tenant.commercialPersona}
            className="rounded-xl border border-slate-300 bg-white px-3 py-3"
          >
            <option value="BUYER">Buyer</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="BUYER_SUPPLIER">Buyer + Supplier</option>
          </select>
          <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
            Update classification
          </button>
        </form>
      </section>

`;
    s = mustReplace(s, anchor, section + anchor, "tenant lifecycle section");
  }

  write(p, s);
}

// module registry filtering
{
  const p = "src/core/modules/registry.ts";
  let s = read(p);

  if (!s.includes("@/core/tenancy/commercial-persona")) {
    s = s.replace('import type { ModuleRegistryEntry } from "./types";',
      `import type { ModuleRegistryEntry } from "./types";
import { prisma } from "@/lib/prisma";
import {
  isHrefAllowedForCommercialPersona,
  type TenantCommercialPersonaValue,
} from "@/core/tenancy/commercial-persona";`);
  }

  if (!s.includes("tenantCommercialPersona: TenantCommercialPersonaValue")) {
    const marker = `  const decisions = await Promise.all(
    moduleRegistry.map(async (module) => {`;

    s = mustReplace(s, marker,
      `  const tenantCommercialPersona: TenantCommercialPersonaValue =
    isPlatformOperator
      ? "BUYER_SUPPLIER"
      : (((await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { commercialPersona: true },
        }))?.commercialPersona ?? "BUYER") as TenantCommercialPersonaValue);

  const decisions = await Promise.all(
    moduleRegistry.map(async (module) => {`,
      "module decision block");

    s = mustReplace(s,
      `      if (isPlatformOperator) return module;
      if (!hasAnyRole(userRoles, module.roles)) return null;`,
      `      if (isPlatformOperator) return module;
      if (
        !isHrefAllowedForCommercialPersona(
          module.href,
          tenantCommercialPersona,
        )
      ) return null;
      if (!hasAnyRole(userRoles, module.roles)) return null;`,
      "module role filter");
  }

  write(p, s);
}

// app layout passes persona
{
  const p = "src/app/app/layout.tsx";
  let s = read(p);

  if (!s.includes('import { prisma } from "@/lib/prisma";')) {
    s = s.replace('import { AppShell } from "@/components/app-shell/AppShell";',
      `import { AppShell } from "@/components/app-shell/AppShell";
import { prisma } from "@/lib/prisma";`);
  }

  if (!s.includes("const tenant = session.user.tenantId")) {
    s = s.replace(
      `  if (!session?.user) {
    redirect("/login");
  }

  return (`,
      `  if (!session?.user) {
    redirect("/login");
  }

  const tenant = session.user.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: { commercialPersona: true },
      })
    : null;

  return (`);
  }

  if (!s.includes("commercialPersona:")) {
    s = s.replace("        mustChangePassword: session.user.mustChangePassword,",
      `        mustChangePassword: session.user.mustChangePassword,
        commercialPersona: tenant?.commercialPersona ?? "BUYER",`);
  }

  write(p, s);
}

// AppShell filtering
{
  const p = "src/components/app-shell/AppShell.tsx";
  let s = read(p);

  if (!s.includes("@/core/tenancy/commercial-persona")) {
    s = s.replace('import { enterpriseModules } from "@/modules/navigation/enterprise-modules";',
      `import { enterpriseModules } from "@/modules/navigation/enterprise-modules";
import {
  commercialPersonaLabel,
  isHrefAllowedForCommercialPersona,
  type TenantCommercialPersonaValue,
} from "@/core/tenancy/commercial-persona";`);
  }

  if (!s.includes("commercialPersona: TenantCommercialPersonaValue;")) {
    s = s.replace("    mustChangePassword: boolean;",
      `    mustChangePassword: boolean;
    commercialPersona: TenantCommercialPersonaValue;`);
  }

  if (!s.includes("const isPlatformOperator = user.roles.some")) {
    s = s.replace('  const [recordResults, setRecordResults] = useState<SearchResult[]>([]);',
      `  const [recordResults, setRecordResults] = useState<SearchResult[]>([]);

  const isPlatformOperator = user.roles.some((role) =>
    role.startsWith("PLATFORM_"),
  );`);
  }

  if (!s.includes("isHrefAllowedForCommercialPersona(\n            module.href")) {
    s = s.replace(
      `    return enterpriseModules
      .filter((module) =>`,
      `    return enterpriseModules
      .filter(
        (module) =>
          isPlatformOperator ||
          isHrefAllowedForCommercialPersona(
            module.href,
            user.commercialPersona,
          ),
      )
      .filter((module) =>`);
    s = s.replace("  }, [query]);",
      "  }, [isPlatformOperator, query, user.commercialPersona]);");
  }

  if (!s.includes("isHrefAllowedForCommercialPersona(\n                  item.href")) {
    s = s.replace(
      `            .filter((item) =>
              item.roles.length === 0 ||
              item.roles.some((role) => user.roles.includes(role)),
            )`,
      `            .filter(
              (item) =>
                isPlatformOperator ||
                isHrefAllowedForCommercialPersona(
                  item.href,
                  user.commercialPersona,
                ),
            )
            .filter((item) =>
              item.roles.length === 0 ||
              item.roles.some((role) => user.roles.includes(role)),
            )`);
  }

  s = s.replace(
    '<span className="block text-xs text-slate-500">USD · Global tenant</span>',
    `<span className="block text-xs text-slate-500">
              {commercialPersonaLabel(user.commercialPersona)} tenant
            </span>`,
  );

  write(p, s);
}

// supplier command center
{
  const p = "src/app/app/page.tsx";
  let s = read(p);

  if (!s.includes("@/components/command-center/SupplierCommandCenter")) {
    s = `import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SupplierCommandCenter } from "@/components/command-center/SupplierCommandCenter";
` + s;
  }

  s = s.replace(
    "export default function CommandCenterPage() {",
    "export default async function CommandCenterPage() {",
  );

  if (!s.includes('tenant?.commercialPersona === "SUPPLIER"')) {
    s = s.replace(
      `export default async function CommandCenterPage() {
  return (`,
      `export default async function CommandCenterPage() {
  const session = await auth();

  if (!session?.user?.tenantId) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true, commercialPersona: true },
  });

  if (tenant?.commercialPersona === "SUPPLIER") {
    return <SupplierCommandCenter tenantName={tenant.name} />;
  }

  return (`);
  }

  write(p, s);
}

console.log("B13.10.3 tenant commercial persona integration complete.");
