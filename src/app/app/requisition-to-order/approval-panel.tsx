import { createApprovalRouteAction, decideApprovalAction } from "@/modules/requisition-to-order/approval-actions";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export function ApprovalPanel({
  currentUserId,
  approverProfiles,
  journeyId,
  currencyCode,
  estimatedAmount,
  routes,
}: {
  currentUserId: string;
  approverProfiles: Array<{
    userId: string;
    name: string;
    email: string;
    roles: string[];
    status: string;
  }>;
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
            {route.steps.flatMap((step) => step.decisions).map((decision) => {
              const assignedToCurrentUser =
                decision.approverUserId === currentUserId;
              const actionable =
                assignedToCurrentUser &&
                decision.status === "PENDING";
              const approver =
                approverProfiles.find(
                  (profile) =>
                    profile.userId ===
                    decision.approverUserId,
                );

              return (
                <div
                  key={decision.id}
                  className="mt-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {approver?.name ?? "Assigned approver"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {approver?.email ??
                          "User profile unavailable"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(approver?.roles ?? []).map(
                          (role) => (
                            <span
                              key={role}
                              className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600"
                            >
                              {role.replaceAll("_", " ")}
                            </span>
                          ),
                        )}
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                          {decision.status}
                        </span>
                      </div>
                    </div>
                    <span
                      className={
                        assignedToCurrentUser
                          ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700"
                          : "rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500"
                      }
                    >
                      {assignedToCurrentUser ? "Assigned to you" : "View only"}
                    </span>
                  </div>

                  {actionable ? (
                    <form
                      action={decideApprovalAction}
                      className="mt-3 grid gap-2 md:grid-cols-4"
                    >
                      <input
                        type="hidden"
                        name="decisionId"
                        value={decision.id}
                      />
                      <input
                        className={input}
                        name="comments"
                        placeholder="Comments"
                      />
                      <button
                        name="action"
                        value="APPROVED"
                        className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-black text-white"
                      >
                        Approve
                      </button>
                      <button
                        name="action"
                        value="REJECTED"
                        className="rounded-xl bg-red-700 px-3 py-2 text-sm font-black text-white"
                      >
                        Reject
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ name, label, value, type = "text", required = false }: { name: string; label: string; value?: string; type?: string; required?: boolean }) {
  return <label><span className="text-sm font-bold">{label}</span><input className={input} name={name} type={type} defaultValue={value} required={required} /></label>;
}
