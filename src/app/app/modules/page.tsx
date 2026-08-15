import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getAccessibleModules,
  moduleRegistryGroups,
} from "@/core/modules";
import {
  getActionCountForHref,
  getSidebarActionCountsForUser,
} from "@/modules/navigation/sidebar-action-counts";

export default async function EnterpriseModulesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const modules = await getAccessibleModules({
    tenantId: session.user.tenantId,
    userRoles: session.user.roles,
  });

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: session.user.tenantId,
    },
    select: {
      commercialPersona: true,
    },
  });

  const actionCounts = await getSidebarActionCountsForUser({
    id: session.user.id,
    tenantId: session.user.tenantId,
    roles: session.user.roles,
    commercialPersona:
      tenant?.commercialPersona ?? "BUYER",
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enorsis workspace directory
      </p>
      <h1 className="mt-3 text-4xl font-black">Enterprise Modules</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Only workspaces permitted by your role and enabled for your
        tenant&apos;s commercial edition are shown.
      </p>

      <div className="mt-10 space-y-10">
        {moduleRegistryGroups.map((group) => {
          const groupedModules = modules.filter(
            (module) => module.group === group,
          );

          if (groupedModules.length === 0) return null;

          return (
            <section key={group}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black">{group}</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {groupedModules.length} modules
                </span>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {groupedModules.map((module) => {
                  const Icon = module.icon;
                  const actionCount = getActionCountForHref(
                    actionCounts,
                    module.href,
                  );

                  return (
                    <Link
                      key={module.id}
                      href={module.href}
                      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          {actionCount > 0 ? (
                            <span
                              className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-[11px] font-black text-white"
                              title={`${actionCount} item${actionCount === 1 ? "" : "s"} requiring attention`}
                            >
                              {actionCount > 99 ? "99+" : actionCount}
                            </span>
                          ) : null}
                          <span className="text-sm font-black text-slate-400 transition group-hover:text-blue-700">
                            Open →
                          </span>
                        </div>
                      </div>
                      <h3 className="mt-5 text-lg font-black">{module.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {module.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {module.featureKey ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                            {module.featureKey}
                          </span>
                        ) : null}
                        {module.aiEligible ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                            AI eligible
                          </span>
                        ) : null}
                      </div>
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
