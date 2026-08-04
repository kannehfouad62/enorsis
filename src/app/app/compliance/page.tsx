import {
  activateProcurementPolicyAction,
  addProcurementPolicyRuleAction,
  createComplianceTestAction,
  createProcurementPolicyAction,
  createProcurementRemediationAction,
} from "@/modules/procurement-policy/actions";
import { getProcurementComplianceWorkspace } from "@/modules/procurement-policy/queries";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ProcurementCompliancePage() {
  const data = await getProcurementComplianceWorkspace();
  return <div className="mx-auto max-w-7xl px-4 py-10">
    <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Procurement governance</p>
    <h1 className="mt-3 text-4xl font-black">Policy & Compliance</h1>
    <p className="mt-3 max-w-3xl text-slate-600">Govern policies, controls, compliance tests and remediation.</p>
    <div className="mt-8 grid gap-6 xl:grid-cols-3">
      <section className={card}><h2 className="text-xl font-black">Create policy</h2><form action={createProcurementPolicyAction} className="mt-5 grid gap-3">
        <input className={input} name="code" placeholder="Policy code" required/><input className={input} name="title" placeholder="Policy title" required/>
        <textarea className={`${input} min-h-24`} name="description" placeholder="Description" required/><input className={input} name="version" type="number" min="1" defaultValue="1"/>
        <input className={input} name="effectiveAt" type="date"/><input className={input} name="expiresAt" type="date"/><button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Create policy</button>
      </form></section>
      <section className={card}><h2 className="text-xl font-black">Compliance test</h2><form action={createComplianceTestAction} className="mt-5 grid gap-3">
        <input className={input} name="name" placeholder="Test name" required/><textarea className={`${input} min-h-20`} name="description" placeholder="Objective"/>
        <input className={input} name="periodStart" type="date" required/><input className={input} name="periodEnd" type="date" required/>
        <input className={input} name="sampleSize" type="number" min="0" placeholder="Sample size"/><textarea className={`${input} min-h-24`} name="methodology" placeholder="Methodology" required/>
        <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">Start test</button>
      </form></section>
      <section className={card}><h2 className="text-xl font-black">Create remediation</h2><form action={createProcurementRemediationAction} className="mt-5 grid gap-3">
        <select className={input} name="complianceTestId"><option value="">No linked test</option>{data.tests.map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}</select>
        <input className={input} name="title" placeholder="Title" required/><textarea className={`${input} min-h-24`} name="description" placeholder="Corrective action" required/>
        <input className={input} name="severity" type="number" min="1" max="5" defaultValue="3"/><select className={input} name="ownerUserId"><option value="">Assign to me</option>{data.members.map((membership) => <option key={membership.id} value={membership.userId}>{membership.user.name ?? membership.user.email}</option>)}</select>
        <input className={input} name="dueAt" type="date" required/><button className="rounded-xl bg-red-700 px-5 py-3 font-black text-white">Create remediation</button>
      </form></section>
    </div>
    <section className={`${card} mt-6`}><h2 className="text-xl font-black">Policy library</h2><div className="mt-5 grid gap-5 xl:grid-cols-2">{data.policies.map((policy) => <article key={policy.id} className="rounded-2xl bg-slate-50 p-5">
      <p className="text-xs font-black text-blue-700">{policy.code} · v{policy.version} · {policy.status}</p><h3 className="mt-2 text-lg font-black">{policy.title}</h3><p className="mt-2 text-sm text-slate-500">{policy.rules.length} rules</p>
      {policy.status === "DRAFT" ? <form action={activateProcurementPolicyAction} className="mt-4"><input type="hidden" name="policyId" value={policy.id}/><button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">Activate</button></form> : null}
      <form action={addProcurementPolicyRuleAction} className="mt-4 grid gap-2"><input type="hidden" name="policyId" value={policy.id}/><input className={input} name="key" placeholder="Rule key" required/><input className={input} name="name" placeholder="Rule name" required/>
        <select className={input} name="type"><option>APPROVAL_LIMIT</option><option>COMPETITIVE_BIDDING</option><option>CONTRACT_REQUIRED</option><option>PREFERRED_SUPPLIER</option><option>DOCUMENT_REQUIRED</option><option>SEGREGATION_OF_DUTIES</option><option>SPEND_THRESHOLD</option><option>COUNTRY_RESTRICTION</option><option>CATEGORY_RESTRICTION</option><option>CUSTOM</option></select>
        <label className="flex gap-2 text-sm"><input type="checkbox" name="isBlocking"/>Blocking control</label><input className={input} name="severity" type="number" min="1" max="5" defaultValue="3"/><input className={input} name="resourceType" placeholder="Resource type"/><input className={input} name="requiredEvidence" placeholder="Evidence, comma separated"/><button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">Add rule</button>
      </form>
    </article>)}</div></section>
    <section className={`${card} mt-6`}><h2 className="text-xl font-black">Remediation register</h2><div className="mt-5 space-y-3">{data.remediations.map((item) => <article key={item.id} className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black text-red-700">Severity {item.severity} · {item.status} · Due {item.dueAt.toLocaleDateString()}</p><h3 className="mt-2 font-black">{item.title}</h3><p className="mt-2 text-sm text-slate-600">{item.description}</p></article>)}</div></section>
  </div>;
}
