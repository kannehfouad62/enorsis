import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  moduleRegistry,
  moduleRegistryGroups,
} from "@/core/modules";

export default async function ModuleRegistryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isPlatformOperator = session.user.roles.some((role) =>
    ["PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_AUDITOR"].includes(
      role,
    ),
  );

  if (!isPlatformOperator) redirect("/app/unauthorized");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise Foundation 1.0
      </p>
      <h1 className="mt-3 text-4xl font-black">Module Registry</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Central metadata for navigation, roles, licensing, API,
        mobile, reporting, search, and future AI eligibility.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Registered modules" value={moduleRegistry.length} />
        <Metric
          label="Licensed modules"
          value={moduleRegistry.filter((item) => item.featureKey).length}
        />
        <Metric
          label="API-enabled"
          value={moduleRegistry.filter((item) => item.api).length}
        />
        <Metric
          label="Mobile-enabled"
          value={moduleRegistry.filter((item) => item.mobile).length}
        />
        <Metric
          label="AI eligible"
          value={moduleRegistry.filter((item) => item.aiEligible).length}
        />
      </div>

      <div className="mt-10 space-y-8">
        {moduleRegistryGroups.map((group) => {
          const modules = moduleRegistry.filter(
            (module) => module.group === group,
          );

          return (
            <section key={group}>
              <h2 className="text-2xl font-black">{group}</h2>
              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Module</th>
                        <th className="px-5 py-4">Feature</th>
                        <th className="px-5 py-4">Roles</th>
                        <th className="px-5 py-4">Capabilities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modules.map((module) => (
                        <tr key={module.id}>
                          <td className="px-5 py-4">
                            <p className="font-black">{module.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {module.id} · {module.href}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {module.featureKey ?? "Platform baseline"}
                          </td>
                          <td className="px-5 py-4">{module.roles.length} roles</td>
                          <td className="px-5 py-4">
                            {[
                              module.api && "API",
                              module.mobile && "Mobile",
                              module.reporting && "Reporting",
                              module.searchable && "Search",
                              module.aiEligible && "AI",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
