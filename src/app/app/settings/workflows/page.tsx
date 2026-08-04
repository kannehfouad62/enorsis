import Link from "next/link";
import { createWorkflowDefinitionAction } from "@/modules/workflows/actions";
import { getWorkflowDefinitions } from "@/modules/workflows/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function WorkflowDefinitionsPage() {
  const { definitions } = await getWorkflowDefinitions();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Business process automation
      </p>
      <h1 className="mt-3 text-4xl font-black">Workflow Designer</h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create workflow definition</h2>
        <form action={createWorkflowDefinitionAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className={input} name="key" placeholder="Unique workflow key" required />
          <input className={input} name="name" placeholder="Workflow name" required />
          <input className={input} name="resourceType" placeholder="Resource type" required />
          <input className={input} name="triggerEvent" placeholder="Trigger event" required />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="description" placeholder="Description" />
          <textarea className={`${input} min-h-24 font-mono text-xs md:col-span-2`} name="conditionExpression" placeholder='{"field":"amount","operator":"gte","value":10000}' />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create workflow
          </button>
        </form>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {definitions.map((definition: (typeof definitions)[number]) => (
          <article key={definition.id} className={card}>
            <p className="text-xs font-black text-blue-700">
              {definition.resourceType} · {definition.status} · v{definition.version}
            </p>
            <h2 className="mt-2 text-xl font-black">{definition.name}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {definition.triggerEvent} · {definition.steps.length} steps
            </p>
            <Link href={`/app/settings/workflows/${definition.id}`} className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
              Configure workflow
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
