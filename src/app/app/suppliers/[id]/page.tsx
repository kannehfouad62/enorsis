import Link from "next/link";
import { reviewSupplierAction } from "@/modules/suppliers/actions";
import { getSupplierDetail } from "@/modules/suppliers/queries";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, supplier } = await getSupplierDetail(id);
  const canReview = session.user.roles.some((role) =>
    ["SUPPLIER_MANAGER", "RISK_COMPLIANCE", "PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"].includes(role),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
      <Link className="text-sm font-black text-blue-700" href="/app/suppliers">← Supplier intelligence</Link>
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">{supplier.supplierNumber}</p>
            <h1 className="mt-2 text-3xl font-black">{supplier.tradingName ?? supplier.legalName}</h1>
            <p className="mt-2 text-sm text-slate-500">{supplier.legalName} · {supplier.countryCode}</p>
          </div>
          <span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{supplier.status.replaceAll("_", " ")}</span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Summary label="Risk tier" value={supplier.riskTier} />
          <Summary label="Qualification" value={supplier.qualificationStatus.replaceAll("_", " ")} />
          <Summary label="ESG" value={supplier.esgCommitted ? "Committed" : "Not confirmed"} />
          <Summary label="Diversity" value={supplier.diversityOwned ? "Diversity-owned" : "Not designated"} />
        </div>

        <section className="mt-6 rounded-2xl bg-slate-50 p-5">
          <h2 className="text-lg font-black">Primary contacts</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {supplier.contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl bg-white p-4">
                <p className="font-black">{contact.name}</p>
                <p className="mt-1 text-sm text-slate-500">{contact.title ?? "Supplier contact"}</p>
                <p className="mt-2 text-sm">{contact.email ?? "No email"} · {contact.phone ?? "No phone"}</p>
              </div>
            ))}
          </div>
        </section>

        {canReview ? (
          <form action={reviewSupplierAction} className="mt-6 grid gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 md:grid-cols-2 xl:grid-cols-4">
            <input type="hidden" name="supplierId" value={supplier.id} />
            <label className="text-sm font-bold">Decision
              <select className={inputClass} name="decision" defaultValue="APPROVED">
                <option value="APPROVED">Approve</option>
                <option value="SUSPENDED">Suspend</option>
                <option value="REJECTED">Reject</option>
              </select>
            </label>
            <label className="text-sm font-bold">Qualification
              <select className={inputClass} name="qualificationStatus" defaultValue={supplier.qualificationStatus === "IN_PROGRESS" ? "QUALIFIED" : supplier.qualificationStatus}>
                <option value="QUALIFIED">Qualified</option>
                <option value="CONDITIONALLY_QUALIFIED">Conditionally qualified</option>
                <option value="DISQUALIFIED">Disqualified</option>
              </select>
            </label>
            <label className="text-sm font-bold">Risk tier
              <select className={inputClass} name="riskTier" defaultValue={supplier.riskTier}>
                <option value="LOW">Low</option><option value="MODERATE">Moderate</option>
                <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
              </select>
            </label>
            <label className="text-sm font-bold">Reason
              <input className={inputClass} name="rejectionReason" />
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white" type="submit">
                Complete supplier review
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">{label}</p><p className="mt-2 text-sm font-black">{value}</p></div>;
}
