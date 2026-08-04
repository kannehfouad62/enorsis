import { createWorkflowDelegationAction } from "@/modules/workflows/actions";
import { getWorkflowDelegations } from "@/modules/workflows/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function WorkflowDelegationsPage() {
  const { session, delegations, members } = await getWorkflowDelegations();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Approval continuity
      </p>
      <h1 className="mt-3 text-4xl font-black">Workflow Delegations</h1>

      <form action={createWorkflowDelegationAction} className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-2">
        <select className={input} name="delegateUserId" required>
          <option value="">Select delegate</option>
          {members
            .filter((membership: (typeof members)[number]) => membership.userId !== session.user.id)
            .map((membership: (typeof members)[number]) => (
              <option key={membership.id} value={membership.userId}>
                {membership.user.name ?? membership.user.email}
              </option>
            ))}
        </select>
        <input className={input} name="startsAt" type="datetime-local" required />
        <input className={input} name="endsAt" type="datetime-local" required />
        <input className={input} name="reason" placeholder="Reason" />
        <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
          Create delegation
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {delegations.map((delegation: (typeof delegations)[number]) => (
          <article key={delegation.id} className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="font-black">{delegation.isActive ? "ACTIVE" : "INACTIVE"}</p>
            <p className="mt-2 text-sm text-slate-500">
              {delegation.startsAt.toLocaleString()} – {delegation.endsAt.toLocaleString()}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
