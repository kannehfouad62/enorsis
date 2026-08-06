import { createApprovalRouteAction, decideApprovalAction } from "@/modules/requisition-to-order/approval-actions";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export function ApprovalPanel({
  journeyId,
  currencyCode,
  estimatedAmount,
  routes,
}: {
  journeyId: string;
  currencyCode: string;
  estimatedAmount: string | null;
  routes: Array<{
    id: string;
    name: string;
    status: string;
    steps: Array<{
      id: string;
      name: string;
      decisions: Array<{
        id: string;
        approverUserId: string;
        status: string;
      }>;
    }>;
  }>;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="font-black">Approval orchestration</h4>
      <form action={createApprovalRouteAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="journeyId" value={journeyId} />
        <input type="hidden" name="currencyCode" value={currencyCode} />
        <input type="hidden" name="amount" value={estimatedAmount ?? ""} />
        <Field name="name" label="Route name" value="Standard requisition approval" />
        <Field name="stepName" label="Step name" value="Manager approval" />
        <Field name="approverUserIds" label="Approver user IDs (comma separated)" required />
        <Field name="requiredApprovals" label="Required approvals" type="number" value="1" />
        <label><span className="text-sm font-bold">Mode</span><select className={input} name="mode"><option>SEQUENTIAL</option><option>PARALLEL</option></select></label>
        <Field name="dueAt" label="Due date" type="date" />
        <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Start approval</button>
      </form>

      <div className="mt-5 space-y-4">
        {routes.map((route) => (
          <div key={route.id} className="rounded-xl bg-slate-50 p-4">
            <p className="font-black">{route.name} · {route.status}</p>
            {route.steps.flatMap((step) => step.decisions).map((decision) => (
              <form key={decision.id} action={decideApprovalAction} className="mt-3 grid gap-2 md:grid-cols-4">
                <input type="hidden" name="decisionId" value={decision.id} />
                <span className="text-sm">{decision.approverUserId} · {decision.status}</span>
                <input className={input} name="comments" placeholder="Comments" />
                <button name="action" value="APPROVED" className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-black text-white">Approve</button>
                <button name="action" value="REJECTED" className="rounded-xl bg-red-700 px-3 py-2 text-sm font-black text-white">Reject</button>
              </form>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ name, label, value, type = "text", required = false }: { name: string; label: string; value?: string; type?: string; required?: boolean }) {
  return <label><span className="text-sm font-bold">{label}</span><input className={input} name={name} type={type} defaultValue={value} required={required} /></label>;
}
