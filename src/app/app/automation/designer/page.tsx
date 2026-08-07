import Link from "next/link";
import { RuleDesignerClient } from "@/components/automation/rule-designer-client";
import {
  applyAutomationTemplateAction,
  publishAutomationRuleVersionAction,
  simulateAutomationRuleAction,
} from "@/modules/enterprise-automation/designer-actions";
import { getAutomationDesignerWorkspace } from "@/modules/enterprise-automation/designer-queries";
import type { AutomationDesignerState } from "@/core/enterprise-automation/designer-types";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AutomationDesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ ruleId?: string }>;
}) {
  const params = await searchParams;
  const data = await getAutomationDesignerWorkspace(
    params.ruleId ?? null,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.9.2.1
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Visual Automation Rule Builder
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Build, version, simulate and publish governed automation rules
            using triggers, nested condition logic and reusable actions.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={
              data.selected
                ? `/app/automation/canvas?ruleId=${data.selected.id}`
                : "/app/automation/canvas"
            }
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
          >
            Visual Canvas
          </Link>
          <Link
            href="/app/automation"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Automation Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className={card}>
          <h2 className="font-black">Rules</h2>
          <div className="mt-4 space-y-2">
            {data.rules.map((rule) => (
              <Link
                key={rule.id}
                href={`/app/automation/designer?ruleId=${rule.id}`}
                className={`block rounded-xl px-3 py-3 text-sm ${
                  data.selected?.id === rule.id
                    ? "bg-slate-950 text-white"
                    : "bg-slate-50"
                }`}
              >
                <p className="font-black">{rule.name}</p>
                <p className="mt-1 text-xs opacity-70">
                  v{rule.publishedVersion ?? "draft"} · {rule.status}
                </p>
              </Link>
            ))}
          </div>
        </aside>

        <main className="space-y-6">
          {data.selected ? (
            <>
              <section className={card}>
                <h2 className="text-xl font-black">
                  {data.selected.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {data.selected.ruleKey}
                </p>

                <div className="mt-6">
                  <RuleDesignerClient
                    ruleId={data.selected.id}
                    initialState={
                      data.selected.designerState as unknown as AutomationDesignerState | null
                    }
                  />
                </div>
              </section>

              <section className={card}>
                <h2 className="text-xl font-black">Templates</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.templates.map((template) => (
                    <article
                      key={template.id}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <p className="text-xs font-black uppercase text-blue-700">
                        {template.category}
                      </p>
                      <h3 className="mt-1 font-black">{template.name}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {template.description}
                      </p>
                      <form
                        action={applyAutomationTemplateAction}
                        className="mt-4"
                      >
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />
                        <input
                          type="hidden"
                          name="ruleId"
                          value={data.selected.id}
                        />
                        <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                          Apply template
                        </button>
                      </form>
                    </article>
                  ))}
                </div>
              </section>

              <section className={card}>
                <h2 className="text-xl font-black">Versions</h2>
                <div className="mt-4 space-y-3">
                  {data.selected.versions.map((version) => (
                    <article
                      key={version.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-black">
                          Version {version.versionNumber} · {version.status}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {version.changeSummary ?? "No change summary"}
                        </p>
                      </div>
                      {version.status !== "PUBLISHED" ? (
                        <form action={publishAutomationRuleVersionAction}>
                          <input
                            type="hidden"
                            name="versionId"
                            value={version.id}
                          />
                          <button className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">
                            Validate & publish
                          </button>
                        </form>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>

              <section className={card}>
                <h2 className="text-xl font-black">Simulation</h2>
                <form
                  action={simulateAutomationRuleAction}
                  className="mt-4 space-y-3"
                >
                  <input
                    type="hidden"
                    name="ruleId"
                    value={data.selected.id}
                  />
                  <textarea
                    name="payload"
                    defaultValue={'{\n  "amount": 125000,\n  "riskLevel": "HIGH"\n}'}
                    className="min-h-44 w-full rounded-xl border border-slate-200 p-3 font-mono text-sm"
                  />
                  <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                    Run simulation
                  </button>
                </form>

                <div className="mt-5 space-y-3">
                  {data.simulations
                    .filter(
                      (simulation) =>
                        simulation.ruleId === data.selected?.id,
                    )
                    .slice(0, 10)
                    .map((simulation) => (
                      <article
                        key={simulation.id}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <p className="font-black">
                          {simulation.status} ·{" "}
                          {simulation.matched ? "Matched" : "Not matched"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {simulation.createdAt.toLocaleString()}
                        </p>
                      </article>
                    ))}
                </div>
              </section>
            </>
          ) : (
            <section className={card}>
              <p className="text-sm text-slate-500">
                Create an automation rule first, then return here to design it.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
