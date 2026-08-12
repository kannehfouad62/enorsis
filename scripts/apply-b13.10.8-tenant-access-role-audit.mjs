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

patch("src/modules/platform-tenants/actions.ts", (source) => {
  if (
    !source.includes(
      "@/core/access-governance/tenant-role-audit",
    )
  ) {
    source = source.replace(
      `import { auth } from "@/auth";`,
      `import { auth } from "@/auth";
import { auditTenantAccess } from "@/core/access-governance/tenant-role-audit";`,
    );
  }

  if (!source.includes("runPlatformTenantAccessAuditAction")) {
    source += `

export async function runPlatformTenantAccessAuditAction(
  formData: FormData,
) {
  const actor = await requirePlatformSuperAdmin();
  const tenantId = value(formData, "tenantId");

  if (!tenantId) {
    throw new Error("Tenant is required.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      commercialPersona: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              passwordHash: true,
            },
          },
        },
      },
    },
  });

  if (!tenant) {
    throw new Error("Tenant was not found.");
  }

  const audit = auditTenantAccess({
    commercialPersona: tenant.commercialPersona,
    members: tenant.memberships.map((membership) => ({
      userId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      status: membership.status,
      roles: membership.roles,
      hasPassword: Boolean(membership.user.passwordHash),
    })),
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: tenant.id,
      userId: actor.id,
      actorType: "USER",
      actorId: actor.id,
      actorLabel: actor.email,
      action: "platform.tenant.access-role.audit",
      resourceType: "Tenant",
      resourceId: tenant.id,
      after: {
        tenantName: tenant.name,
        commercialPersona: tenant.commercialPersona,
        reviewed: audit.reviewed,
        passed: audit.passed,
        warnings: audit.warnings,
        failed: audit.failed,
        results: audit.results.map((result) => ({
          userId: result.userId,
          email: result.email,
          status: result.status,
          roles: result.roles,
          severity: result.severity,
          findings: result.findings,
        })),
      },
    },
  });

  revalidatePath(\`/app/settings/tenants/\${tenant.id}\`);
}
`;
  }

  return source;
});

patch("src/app/app/settings/tenants/[id]/page.tsx", (source) => {
  if (
    !source.includes(
      "runPlatformTenantAccessAuditAction",
    )
  ) {
    source = source.replace(
      `  updatePlatformTenantCommercialPersonaAction,`,
      `  updatePlatformTenantCommercialPersonaAction,
  runPlatformTenantAccessAuditAction,`,
    );
  }

  if (
    !source.includes(
      "@/core/access-governance/tenant-role-audit",
    )
  ) {
    source = source.replace(
      `import { getPlatformTenantDetail } from "@/modules/platform-tenants/queries";`,
      `import { getPlatformTenantDetail } from "@/modules/platform-tenants/queries";
import { auditTenantAccess } from "@/core/access-governance/tenant-role-audit";`,
    );
  }

  const ownerMarker = `  const owner = tenant.memberships.find((membership) =>
    membership.roles.includes("TENANT_OWNER"),
  );`;

  const ownerReplacement = `${ownerMarker}

  const accessAudit = auditTenantAccess({
    commercialPersona: tenant.commercialPersona,
    members: tenant.memberships.map((membership) => ({
      userId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      status: membership.status,
      roles: membership.roles,
      hasPassword: Boolean(membership.user.passwordHash),
    })),
  });`;

  if (
    source.includes(ownerMarker) &&
    !source.includes("const accessAudit =")
  ) {
    source = source.replace(
      ownerMarker,
      ownerReplacement,
    );
  }

  const transactionSection = `      <section className={\`\${card} mt-8\`}>
        <h2 className="text-xl font-black">Transaction footprint</h2>`;

  const auditSection = `      <section className={\`\${card} mt-8\`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">User access & role audit</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review the access posture of all existing tenant members. This audit
              is non-destructive: findings identify role and activation risks but
              never change access automatically.
            </p>
          </div>

          <form action={runPlatformTenantAccessAuditAction}>
            <input type="hidden" name="tenantId" value={tenant.id} />
            <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
              Record access audit
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Reviewed" value={String(accessAudit.reviewed)} />
          <Metric label="Passed" value={String(accessAudit.passed)} />
          <Metric label="Warnings" value={String(accessAudit.warnings)} />
          <Metric label="Failed" value={String(accessAudit.failed)} />
        </div>

        <div className="mt-6 space-y-3">
          {accessAudit.results.map((result) => (
            <article
              key={result.userId}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">
                    {result.name ?? result.email ?? result.userId}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {result.email ?? "No email"} · {result.status}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-600">
                    {result.roles.length > 0
                      ? result.roles.join(" · ")
                      : "No roles assigned"}
                  </p>
                </div>

                <span
                  className={
                    result.severity === "PASS"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                      : result.severity === "WARN"
                        ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                        : "rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700"
                  }
                >
                  {result.severity}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {result.findings.map((finding) => (
                  <p
                    key={finding.code}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700"
                  >
                    <strong>{finding.code.replaceAll("_", " ")}:</strong>{" "}
                    {finding.message}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

${transactionSection}`;

  if (
    source.includes(transactionSection) &&
    !source.includes("User access & role audit")
  ) {
    source = source.replace(
      transactionSection,
      auditSection,
    );
  }

  return source;
});

console.log(
  "B13.10.8 tenant user access and role audit integration complete.",
);
