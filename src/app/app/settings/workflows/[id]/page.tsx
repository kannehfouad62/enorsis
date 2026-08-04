import Link from "next/link";
import {
  activateWorkflowDefinitionAction,
  addWorkflowStepAction,
} from "@/modules/workflows/actions";
import { getWorkflowDefinition } from "@/modules/workflows/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function WorkflowDefinitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { definition } = await getWorkflowDefinition(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/app/settings/workflows" className="font-black text-blue-700">
        ← Workflows
      </Link>
      <h1 className="mt-5 text-4xl font-black">{definition.name}</h1>
      <p className="mt-2 text-slate-600">
        {definition.resourceType} · {definition.status} · version {definition.version}
      </p>

      {definition.status !== "ACTIVE" ? (
        <section className={`${card} mt-8`}>
          <form action={activateWorkflowDefinitionAction}>
            <input type="hidden" name="workflowDefinitionId" value={definition.id} />
            <button className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">
              Activate workflow
            </button>
          </form>
        </section>
      ) : null}

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Add workflow step</h2>
        <form action={addWorkflowStepAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input type="hidden" name="workflowDefinitionId" value={definition.id} />
          <input className={input} name="key" placeholder="Step key" required />
          <input className={input} name="name" placeholder="Step name" required />
          <input className={input} name="sequence" type="number" min="1" placeholder="Sequence" required />
          <select className={input} name="type" defaultValue="APPROVAL">
            <option value="APPROVAL">Approval</option>
            <option value="REVIEW">Review</option>
            <option value="NOTIFICATION">Notification</option>
            <option value="SYSTEM_TASK">System task</option>
            <option value="AI_REVIEW">AI review</option>
          </select>
          <select className={input} name="routingMode" defaultValue="SEQUENTIAL">
            <option value="SEQUENTIAL">Sequential</option>
            <option value="PARALLEL">Parallel</option>
            <option value="ANY_ONE">Any one</option>
          </select>
          <input className={input} name="assigneeRoles" placeholder="Roles, comma separated" />
          <input className={input} name="assigneeUserIds" placeholder="User IDs, comma separated" />
          <input className={input} name="dueInHours" type="number" min="1" placeholder="Due in hours" />
          <input className={input} name="escalationAfterHours" type="number" min="1" placeholder="Escalate after hours" />
          <input className={input} name="escalationRoles" placeholder="Escalation roles" />
          <textarea className={`${input} min-h-24 font-mono text-xs md:col-span-2`} name="conditionExpression" placeholder='{"field":"riskTier","operator":"in","value":["HIGH","CRITICAL"]}' />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="description" placeholder="Step description" />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="allowDelegation" defaultChecked />
            Allow delegation
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="requiresComment" />
            Require comments
          </label>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Add step
          </button>
        </form>
      </section>

      <div className="mt-6 space-y-4">
        {definition.steps.map((step: (typeof definition.steps)[number]) => (
          <article key={step.id} className={card}>
            <p className="text-xs font-black text-blue-700">
              Step {step.sequence} · {step.type} · {step.routingMode}
            </p>
            <h2 className="mt-2 text-xl font-black">{step.name}</h2>
            <p className="mt-2 text-sm text-slate-500">
              Roles: {step.assigneeRoles.join(", ") || "None"} · Users:{" "}
              {step.assigneeUserIds.length}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
