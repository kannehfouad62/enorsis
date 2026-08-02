import { createClauseTemplateAction } from "@/modules/contracts/governance-actions";
import { getClauseLibrary } from "@/modules/contracts/governance-queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function ClauseLibraryPage() {
  const { clauses } = await getClauseLibrary();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Contract standards
      </p>
      <h1 className="mt-3 text-4xl font-black">Clause library</h1>

      <form
        action={createClauseTemplateAction}
        className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-2 xl:grid-cols-4"
      >
        <input className={input} name="key" placeholder="Unique key" required />
        <input className={input} name="name" placeholder="Clause name" required />
        <input className={input} name="category" placeholder="Category" required />
        <select className={input} name="riskLevel" defaultValue="STANDARD">
          <option value="STANDARD">Standard</option>
          <option value="REVIEW">Review</option>
          <option value="HIGH">High</option>
          <option value="PROHIBITED">Prohibited</option>
        </select>
        <textarea
          className={`${input} min-h-40 md:col-span-2 xl:col-span-4`}
          name="body"
          placeholder="Clause text"
          required
        />
        <label className="flex items-center gap-2 text-sm font-bold">
          <input name="required" type="checkbox" />
          Required clause
        </label>
        <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
          Add clause template
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {clauses.map((clause) => (
          <article
            key={clause.id}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <p className="text-xs font-black text-blue-700">
              {clause.category} · {clause.riskLevel}
            </p>
            <h2 className="mt-2 text-xl font-black">{clause.name}</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7">
              {clause.body}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
