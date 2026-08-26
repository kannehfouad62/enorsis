import Link from "next/link";
import {
  Building2,
  CircleCheckBig,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { createSupplierAction } from "@/modules/suppliers/actions";
import { getSupplierWorkspace } from "@/modules/suppliers/queries";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SuppliersPage() {
  const { session, suppliers } = await getSupplierWorkspace();
  const canCreate = session.user.roles.some((role) =>
    ["SUPPLIER_MANAGER", "BUYER", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"].includes(role),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Supplier lifecycle
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        Supplier intelligence
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Onboard, qualify and govern suppliers with risk, ESG and compliance context.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/app/suppliers/collaboration"
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
        >
          Collaboration operations
        </Link>
        <Link
          href="/app/suppliers/qualification"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
        >
          Qualification & onboarding
        </Link>
        <Link
          href="/app/suppliers/collaboration/requests"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
        >
          Documents & action requests
        </Link>
        <Link
          href="/app/suppliers/access"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
        >
          Supplier access
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-4">
        <Metric icon={UsersRound} label="Suppliers" value={String(suppliers.length)} />
        <Metric icon={CircleCheckBig} label="Approved" value={String(suppliers.filter((item) => item.status === "APPROVED").length)} />
        <Metric icon={ShieldAlert} label="High risk" value={String(suppliers.filter((item) => ["HIGH", "CRITICAL"].includes(item.riskTier)).length)} />
        <Metric icon={Building2} label="Countries" value={String(new Set(suppliers.map((item) => item.countryCode)).size)} />
      </div>

      {canCreate ? (
        <section className={`${cardClass} mt-6`}>
          <h2 className="text-xl font-black">Onboard supplier</h2>
          <form action={createSupplierAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Legal name"><input className={inputClass} name="legalName" required /></Field>
            <Field label="Trading name"><input className={inputClass} name="tradingName" /></Field>
            <Field label="Country code"><input className={inputClass} name="countryCode" maxLength={2} required /></Field>
            <Field label="Tax ID"><input className={inputClass} name="taxIdentificationNo" /></Field>
            <Field label="Website"><input className={inputClass} name="website" type="url" /></Field>
            <Field label="Primary email"><input className={inputClass} name="primaryEmail" type="email" /></Field>
            <Field label="Primary phone"><input className={inputClass} name="primaryPhone" /></Field>
            <Field label="Initial risk tier">
              <select className={inputClass} name="riskTier" defaultValue="MODERATE">
                <option value="LOW">Low</option><option value="MODERATE">Moderate</option>
                <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
              </select>
            </Field>
            <Field label="Categories">
              <select className={inputClass} name="categories" multiple required>
                <option value="Direct materials">Direct materials</option>
                <option value="Indirect materials">Indirect materials</option>
                <option value="Professional services">Professional services</option>
                <option value="Technology">Technology</option>
                <option value="Logistics">Logistics</option>
                <option value="Facilities">Facilities</option>
              </select>
            </Field>
            <Field label="Contact name"><input className={inputClass} name="contactName" required /></Field>
            <Field label="Contact title"><input className={inputClass} name="contactTitle" /></Field>
            <Field label="Contact email"><input className={inputClass} name="contactEmail" type="email" /></Field>
            <Field label="Contact phone"><input className={inputClass} name="contactPhone" /></Field>
            <div className="flex items-center gap-5 md:col-span-2 xl:col-span-4">
              <label className="text-sm font-bold"><input className="mr-2" type="checkbox" name="diversityOwned" />Diversity-owned</label>
              <label className="text-sm font-bold"><input className="mr-2" type="checkbox" name="esgCommitted" />ESG commitment confirmed</label>
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-700" type="submit">
                Start supplier review
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {suppliers.map((supplier) => (
          <article key={supplier.id} className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">{supplier.supplierNumber}</p>
                <h2 className="mt-2 text-xl font-black">{supplier.tradingName ?? supplier.legalName}</h2>
                <p className="mt-1 text-sm text-slate-500">{supplier.countryCode} · {supplier.categories.join(", ")}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{supplier.status.replaceAll("_", " ")}</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Summary label="Risk" value={supplier.riskTier} />
              <Summary label="Qualification" value={supplier.qualificationStatus.replaceAll("_", " ")} />
              <Summary label="ESG" value={supplier.esgCommitted ? "Committed" : "Not confirmed"} />
            </div>
            <Link className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white" href={`/app/suppliers/${supplier.id}`}>
              Open supplier
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string }) {
  return <article className={cardClass}><Icon className="h-5 w-5 text-blue-700" /><p className="mt-4 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></article>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-700">{label}{children}</label>;
}
function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">{label}</p><p className="mt-2 text-sm font-black">{value}</p></div>;
}
