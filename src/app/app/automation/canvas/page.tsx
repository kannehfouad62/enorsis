import Link from "next/link";
import { VisualWorkflowDesigner } from "@/components/automation/visual-workflow-designer";
import { getAutomationDesignerWorkspace } from "@/modules/enterprise-automation/designer-queries";
import type { CanvasDesignerState } from "@/core/enterprise-automation/canvas-state";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AutomationCanvasPage({
  searchParams,
}: {
  searchParams: Promise<{ ruleId?: string }>;
}) {
  const params = await searchParams;
  const data = await getAutomationDesignerWorkspace(
    params.ruleId ?? null,
  );

  return (
    <div className="mx-auto max-w-[1700px] px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.9.2.2
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Enterprise Visual Workflow Designer
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Drag workflow nodes, connect execution paths, validate the
            graph, inspect node configuration and simulate the compiled
            execution path before publishing.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/app/automation/designer"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
          >
            Rule Builder
          </Link>
          <Link
            href="/app/automation"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Automation Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[260px_1fr]">
        <aside className={card}>
          <h2 className="font-black">Automation Rules</h2>
          <div className="mt-4 space-y-2">
            {data.rules.map((rule) => (
              <Link
                key={rule.id}
                href={`/app/automation/canvas?ruleId=${rule.id}`}
                className={`block rounded-xl px-3 py-3 text-sm ${
                  data.selected?.id === rule.id
                    ? "bg-slate-950 text-white"
                    : "bg-slate-50"
                }`}
              >
                <p className="font-black">{rule.name}</p>
                <p className="mt-1 text-xs opacity-70">
                  v{rule.publishedVersion ?? "draft"} ·{" "}
                  {rule.status}
                </p>
              </Link>
            ))}
          </div>
        </aside>

        <main className={card}>
          {data.selected ? (
            <>
              <div className="mb-6">
                <p className="text-xs font-black uppercase text-blue-700">
                  {data.selected.ruleKey}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {data.selected.name}
                </h2>
              </div>

              <VisualWorkflowDesigner
                ruleId={data.selected.id}
                initialState={
                  data.selected
                    .designerState as unknown as CanvasDesignerState | null
                }
              />
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Create an automation rule before opening the visual
              workflow designer.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
