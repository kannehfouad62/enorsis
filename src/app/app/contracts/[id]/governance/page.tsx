import Link from "next/link";
import {
  activateContractAction,
  addContractRiskReviewAction,
  completeContractObligationAction,
  createContractAmendmentAction,
  decideContractApprovalAction,
  submitContractForApprovalAction,
} from "@/modules/contracts/governance-actions";
import { getContractDetail } from "@/modules/contracts/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function ContractGovernancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, contract, members } = await getContractDetail(id);

  const pendingApproval = contract.approvals.find(
    (approval) => approval.decision === "PENDING",
  );

  const canDecide =
    pendingApproval &&
    (pendingApproval.approverUserId === session.user.id ||
      session.user.roles.some((role) =>
        ["TENANT_ADMIN", "TENANT_OWNER"].includes(role),
      ));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link href={`/app/contracts/${contract.id}`} className="font-black text-blue-700">
        ← Contract
      </Link>
      <h1 className="mt-5 text-4xl font-black">Contract governance</h1>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Approval routing</h2>

        {contract.status !== "PENDING_APPROVAL" ? (
          <form action={submitContractForApprovalAction} className="mt-4">
            <input type="hidden" name="contractId" value={contract.id} />
            <select className={input} name="approverUserIds" multiple required>
              {members.map((membership) => (
                <option key={membership.id} value={membership.userId}>
                  {membership.user.name ?? membership.user.email}
                </option>
              ))}
            </select>
            <button className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
              Submit for approval
            </button>
          </form>
        ) : null}

        <div className="mt-5 space-y-3">
          {contract.approvals.map((approval) => {
            const membership = members.find(
              (item) => item.userId === approval.approverUserId,
            );
            return (
              <div key={approval.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">
                  Step {approval.sequence}:{" "}
                  {membership?.user.name ??
                    membership?.user.email ??
                    approval.approverUserId}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {approval.decision}
                </p>
              </div>
            );
          })}
        </div>

        {canDecide ? (
          <form action={decideContractApprovalAction} className="mt-5 flex flex-wrap gap-3">
            <input type="hidden" name="contractId" value={contract.id} />
            <input
              className="min-w-64 flex-1 rounded-xl border border-slate-200 px-4 py-3"
              name="comments"
              placeholder="Decision comments"
            />
            <button className="rounded-xl bg-emerald-700 px-4 py-3 font-black text-white" name="decision" value="APPROVED">
              Approve
            </button>
            <button className="rounded-xl bg-amber-600 px-4 py-3 font-black text-white" name="decision" value="RETURNED">
              Return
            </button>
            <button className="rounded-xl bg-red-700 px-4 py-3 font-black text-white" name="decision" value="REJECTED">
              Reject
            </button>
          </form>
        ) : null}

        {contract.status === "APPROVED" ? (
          <form action={activateContractAction} className="mt-5">
            <input type="hidden" name="contractId" value={contract.id} />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Activate contract
            </button>
          </form>
        ) : null}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Risk review</h2>
          <form action={addContractRiskReviewAction} className="mt-4 grid gap-3">
            <input type="hidden" name="contractId" value={contract.id} />
            {["legalRisk", "commercialRisk", "dataPrivacyRisk", "complianceRisk"].map((name) => (
              <input key={name} className={input} name={name} type="number" min="0" max="100" placeholder={name.replaceAll(/([A-Z])/g, " $1")} required />
            ))}
            <textarea className={`${input} min-h-24`} name="summary" placeholder="Risk summary" required />
            <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
              Save risk review
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Amendments</h2>
          <form action={createContractAmendmentAction} className="mt-4 grid gap-3">
            <input type="hidden" name="contractId" value={contract.id} />
            <input className={input} name="title" placeholder="Amendment title" required />
            <textarea className={`${input} min-h-24`} name="description" placeholder="Description" required />
            <input className={input} name="effectiveDate" type="date" />
            <input className={input} name="valueChange" type="number" step="0.01" placeholder="Value change" />
            <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
              Create amendment
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Obligation completion</h2>
        <div className="mt-4 space-y-3">
          {contract.obligations.map((obligation) => (
            <div key={obligation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="font-black">{obligation.title}</p>
                <p className="mt-1 text-sm text-slate-500">{obligation.status}</p>
              </div>
              {obligation.status !== "COMPLETED" ? (
                <form action={completeContractObligationAction}>
                  <input type="hidden" name="obligationId" value={obligation.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">
                    Mark completed
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
