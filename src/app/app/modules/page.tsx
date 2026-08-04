import Link from "next/link";
import {
  enterpriseModuleGroups,
  enterpriseModules,
} from "@/modules/navigation/enterprise-modules";

export default function EnterpriseModulesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enorsis workspace directory
      </p>
      <h1 className="mt-3 text-4xl font-black">Enterprise Modules</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Access procurement, supplier, governance, intelligence and platform
        workspaces from one organized directory.
      </p>

      <div className="mt-10 space-y-10">
        {enterpriseModuleGroups.map((group) => {
          const modules = enterpriseModules.filter(
            (module) => module.group === group,
          );

          return (
            <section key={group}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black">{group}</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {modules.length} modules
                </span>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {modules.map((module) => {
                  const Icon = module.icon;

                  return (
                    <Link
                      key={module.href}
                      href={module.href}
                      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black text-slate-400 transition group-hover:text-blue-700">
                          Open →
                        </span>
                      </div>
                      <h3 className="mt-5 text-lg font-black">
                        {module.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {module.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
