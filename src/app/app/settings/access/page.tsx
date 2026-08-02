import { BadgeDollarSign, ShieldCheck, UserPlus, Users } from "lucide-react";
import { inviteMemberAction, updateMembershipAction } from "@/modules/access/actions";
import { assignableRoles } from "@/modules/access/schemas";
import { getAccessAdministrationWorkspace } from "@/modules/access/queries";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AccessAdministrationPage() {
  const { tenant } = await getAccessAdministrationWorkspace();
  const active = tenant.memberships.filter((item) => item.status === "ACTIVE").length;
  const pending = tenant.memberships.filter((item) => item.status === "INVITED").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Identity and access</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Enterprise access administration</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Govern who can request, source, approve, contract and audit procurement activity across the organization.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Metric icon={Users} label="Total members" value={String(tenant.memberships.length)} />
        <Metric icon={ShieldCheck} label="Active access" value={String(active)} />
        <Metric icon={UserPlus} label="Pending invitations" value={String(pending)} />
      </div>

      <section className={`${cardClass} mt-6`}>
        <h2 className="text-xl font-black">Invite organization member</h2>
        <form action={inviteMemberAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Full name"><input className={inputClass} name="name" required /></Field>
          <Field label="Email"><input className={inputClass} name="email" type="email" required /></Field>
          <Field label="Job title"><input className={inputClass} name="jobTitle" /></Field>
          <Field label="Employee ID"><input className={inputClass} name="employeeId" /></Field>
          <Field label="Approval limit (USD)"><input className={inputClass} name="approvalLimitUsd" type="number" min="0" step="0.01" /></Field>
          <ScopeSelect name="legalEntityScopeIds" label="Legal entity scope" options={tenant.legalEntities} />
          <ScopeSelect name="siteScopeIds" label="Site scope" options={tenant.sites} />
          <ScopeSelect name="departmentScopeIds" label="Department scope" options={tenant.departments} />
          <div className="md:col-span-2 xl:col-span-4">
            <p className="text-sm font-bold text-slate-700">Roles</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {assignableRoles.map((role) => (
                <label key={role} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold">
                  <input className="mr-2" type="checkbox" name="roles" value={role} />
                  {role.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-700" type="submit">
              Create invitation
            </button>
          </div>
        </form>
      </section>

      <div className="mt-6 space-y-5">
        {tenant.memberships.map((membership) => (
          <form key={membership.id} action={updateMembershipAction} className={cardClass}>
            <input type="hidden" name="membershipId" value={membership.id} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">{membership.user.name ?? membership.user.email}</h2>
                <p className="text-sm text-slate-500">{membership.user.email}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{membership.status}</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Field label="Status">
                <select className={inputClass} name="status" defaultValue={membership.status}>
                  <option value="INVITED">Invited</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="REVOKED">Revoked</option>
                </select>
              </Field>
              <Field label="Job title"><input className={inputClass} name="jobTitle" defaultValue={membership.jobTitle ?? ""} /></Field>
              <Field label="Employee ID"><input className={inputClass} name="employeeId" defaultValue={membership.employeeId ?? ""} /></Field>
              <Field label="Approval limit (USD)"><input className={inputClass} name="approvalLimitUsd" type="number" min="0" step="0.01" defaultValue={membership.approvalLimitUsd?.toString() ?? ""} /></Field>
              <div className="flex items-end"><button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white" type="submit">Save access</button></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {assignableRoles.map((role) => (
                <label key={role} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold">
                  <input className="mr-2" type="checkbox" name="roles" value={role} defaultChecked={membership.roles.includes(role)} />
                  {role.replaceAll("_", " ")}
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <ScopeSelect name="legalEntityScopeIds" label="Legal entity scope" options={tenant.legalEntities} selected={membership.legalEntityScopeIds} />
              <ScopeSelect name="siteScopeIds" label="Site scope" options={tenant.sites} selected={membership.siteScopeIds} />
              <ScopeSelect name="departmentScopeIds" label="Department scope" options={tenant.departments} selected={membership.departmentScopeIds} />
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return <article className={cardClass}><Icon className="h-5 w-5 text-blue-700" /><p className="mt-4 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></article>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-700">{label}{children}</label>;
}

function ScopeSelect({ name, label, options, selected = [] }: { name: string; label: string; options: Array<{ id: string; name: string }>; selected?: string[] }) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <select className={inputClass} name={name} multiple defaultValue={selected}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      <span className="mt-1 block text-xs font-normal text-slate-400">Leave empty for organization-wide access.</span>
    </label>
  );
}
