import Link from "next/link";
import {
  createAccessReviewCampaignAction,
  createSodRuleAction,
  launchAccessReviewCampaignAction,
  scanSodViolationsAction,
} from "@/modules/access-governance/actions";
import { getAccessGovernanceWorkspace } from "@/modules/access-governance/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "LEGAL",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
];

export default async function AccessGovernancePage() {
  const data = await getAccessGovernanceWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Identity governance
      </p>
      <h1 className="mt-3 text-4xl font-black">Access Governance</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Detect conflicting duties, certify user access and document
        remediation across procurement and finance roles.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active SoD rules" value={data.metrics.activeRules} />
        <Metric label="Open violations" value={data.metrics.openViolations} />
        <Metric label="Active reviews" value={data.metrics.activeReviews} />
        <Metric label="Pending decisions" value={data.metrics.pendingReviewItems} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Create segregation rule</h2>
          <form action={createSodRuleAction} className="mt-5 grid gap-3">
            <input className={input} name="key" placeholder="Unique key" required />
            <input className={input} name="name" placeholder="Rule name" required />
            <textarea className={`${input} min-h-24`} name="description" placeholder="Why these duties conflict" required />
            <select className={input} name="conflictingRoleA" required>
              {roles.map((role) => <option key={role}>{role}</option>)}
            </select>
            <select className={input} name="conflictingRoleB" required>
              {roles.map((role) => <option key={role}>{role}</option>)}
            </select>
            <input className={input} name="severity" type="number" min="1" max="5" defaultValue="3" />
            <textarea className={`${input} min-h-20`} name="remediationGuidance" placeholder="Recommended remediation" />
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Create rule
            </button>
          </form>
          <form action={scanSodViolationsAction} className="mt-4">
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Scan current memberships
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Create access review</h2>
          <form action={createAccessReviewCampaignAction} className="mt-5 grid gap-3">
            <input className={input} name="name" placeholder="Campaign name" required />
            <textarea className={`${input} min-h-24`} name="description" placeholder="Review objective" />
            <select className={input} name="reviewerUserId" required>
              <option value="">Select reviewer</option>
              {data.memberships.map((membership) => (
                <option key={membership.id} value={membership.userId}>
                  {membership.user.name ?? membership.user.email}
                </option>
              ))}
            </select>
            <input className={input} name="dueAt" type="datetime-local" required />
            <div className="grid gap-2 rounded-2xl bg-slate-50 p-4">
              {roles.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="scopeRoles" value={role} />
                  {role}
                </label>
              ))}
            </div>
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Create review
            </button>
          </form>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Access review campaigns</h2>
        <div className="mt-5 space-y-4">
          {data.campaigns.map((campaign) => (
            <article key={campaign.id} className="rounded-2xl bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-blue-700">
                    {campaign.status}
                  </p>
                  <h3 className="mt-2 text-lg font-black">{campaign.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Due {campaign.dueAt.toLocaleString()} · {campaign.items.length} items
                  </p>
                </div>
                <div className="flex gap-2">
                  {campaign.status === "DRAFT" ? (
                    <form action={launchAccessReviewCampaignAction}>
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">
                        Launch
                      </button>
                    </form>
                  ) : null}
                  <Link
                    href={`/app/settings/access-governance/reviews/${campaign.id}`}
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Segregation-of-duties violations</h2>
        <table className="mt-5 w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Rule</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Severity</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.violations.map((violation) => (
              <tr key={violation.id} className="border-t border-slate-100">
                <td className="p-3 font-black">{violation.userEmail}</td>
                <td className="p-3">{violation.sodRule.name}</td>
                <td className="p-3">{violation.detectedRoles.join(", ")}</td>
                <td className="p-3">{violation.sodRule.severity}</td>
                <td className="p-3">{violation.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
