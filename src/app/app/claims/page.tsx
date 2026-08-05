import {
  addClaimEvidenceAction,
  createRecoveryAction,
  createSupplierClaimAction,
  submitSupplierClaimAction,
  updateClaimAction,
} from "@/modules/supplier-claims/actions";
import { getSupplierClaimsWorkspace } from "@/modules/supplier-claims/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SupplierClaimsPage() {
  const data = await getSupplierClaimsWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Post-delivery recovery
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Returns, Claims & Recovery
      </h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Open claims" value={data.metrics.open} />
        <Metric label="Overdue claims" value={data.metrics.overdue} />
        <Metric label="Claimed value" value={data.metrics.claimed} money />
        <Metric label="Accepted value" value={data.metrics.accepted} money />
        <Metric label="Settled value" value={data.metrics.settled} money />
        <Metric label="Pending recovery" value={data.metrics.pendingRecovery} money />
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Register claim</h2>
        <form action={createSupplierClaimAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <select className={input} name="supplierId" required>
            <option value="">Select supplier</option>
            {data.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.tradingName ?? supplier.legalName}
              </option>
            ))}
          </select>
          <select className={input} name="type">
            <option>DAMAGED_GOODS</option>
            <option>SHORT_SHIPMENT</option>
            <option>OVER_SHIPMENT</option>
            <option>WRONG_ITEM</option>
            <option>QUALITY_DEFECT</option>
            <option>WARRANTY</option>
            <option>LATE_DELIVERY</option>
            <option>PRICING_ERROR</option>
            <option>FREIGHT_DAMAGE</option>
            <option>OTHER</option>
          </select>
          <input className={input} name="title" placeholder="Claim title" required />
          <input className={input} name="purchaseOrderId" placeholder="Purchase order ID" />
          <input className={input} name="receiptId" placeholder="Receipt ID" />
          <input className={input} name="shipmentId" placeholder="Shipment ID" />
          <input className={input} name="invoiceId" placeholder="Invoice ID" />
          <input className={input} name="currencyCode" defaultValue="USD" />
          <input className={input} name="claimedAmount" type="number" step="0.01" placeholder="Claimed amount" />
          <input className={input} name="quantityAffected" type="number" step="0.0001" placeholder="Quantity affected" />
          <input className={input} name="unitOfMeasure" placeholder="Unit" />
          <input className={input} name="detectedAt" type="datetime-local" required />
          <input className={input} name="dueAt" type="date" />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="description" placeholder="Description" required />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="internalAssessment" placeholder="Internal assessment" />
          <button className="rounded-xl bg-red-700 px-5 py-3 font-black text-white">
            Register claim
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Claims register</h2>
        <div className="mt-5 space-y-6">
          {data.claims.map((claim) => (
            <article key={claim.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-red-700">
                {claim.claimNumber} · {claim.type.replaceAll("_", " ")} ·{" "}
                {claim.status}
              </p>
              <h3 className="mt-2 text-lg font-black">{claim.title}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {claim.supplier.tradingName ?? claim.supplier.legalName} ·
                Claimed ${Number(claim.claimedAmount).toLocaleString()}
              </p>

              {claim.status === "DRAFT" ? (
                <form action={submitSupplierClaimAction} className="mt-4">
                  <input type="hidden" name="claimId" value={claim.id} />
                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
                    Submit claim
                  </button>
                </form>
              ) : null}

              <div className="mt-5 grid gap-5 xl:grid-cols-3">
                <form action={addClaimEvidenceAction} className="grid gap-3">
                  <input type="hidden" name="supplierClaimId" value={claim.id} />
                  <input className={input} name="fileName" placeholder="File name" required />
                  <input className={input} name="fileUrl" type="url" placeholder="Evidence URL" required />
                  <input className={input} name="mimeType" placeholder="MIME type" />
                  <input className={input} name="description" placeholder="Description" />
                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
                    Add evidence
                  </button>
                </form>

                <form action={updateClaimAction} className="grid gap-3">
                  <input type="hidden" name="claimId" value={claim.id} />
                  <select className={input} name="status">
                    <option>UNDER_REVIEW</option>
                    <option>ACCEPTED</option>
                    <option>PARTIALLY_ACCEPTED</option>
                    <option>REJECTED</option>
                    <option>SETTLED</option>
                    <option>CLOSED</option>
                  </select>
                  <input className={input} name="acceptedAmount" type="number" step="0.01" placeholder="Accepted amount" />
                  <input className={input} name="settledAmount" type="number" step="0.01" placeholder="Settled amount" />
                  <select className={input} name="disposition">
                    <option value="">No disposition</option>
                    <option>RETURN_TO_SUPPLIER</option>
                    <option>REPLACE</option>
                    <option>REPAIR</option>
                    <option>SCRAP</option>
                    <option>USE_AS_IS</option>
                    <option>CREDIT_ONLY</option>
                  </select>
                  <input className={input} name="supplierResponse" placeholder="Supplier response" />
                  <input className={input} name="rootCause" placeholder="Root cause" />
                  <input className={input} name="correctiveAction" placeholder="Corrective action" />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 font-black text-white">
                    Update claim
                  </button>
                </form>

                <form action={createRecoveryAction} className="grid gap-3">
                  <input type="hidden" name="supplierClaimId" value={claim.id} />
                  <select className={input} name="type">
                    <option>CREDIT_NOTE</option>
                    <option>DEBIT_MEMO</option>
                    <option>CASH_REFUND</option>
                    <option>REPLACEMENT</option>
                    <option>SERVICE_CREDIT</option>
                    <option>PRICE_ADJUSTMENT</option>
                    <option>OTHER</option>
                  </select>
                  <input className={input} name="amount" type="number" step="0.01" placeholder="Recovery amount" required />
                  <input className={input} name="currencyCode" defaultValue={claim.currencyCode} />
                  <input className={input} name="referenceNumber" placeholder="Reference number" />
                  <input className={input} name="notes" placeholder="Notes" />
                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                    Add recovery
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  money = false,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">
        {money ? `$${value.toLocaleString()}` : value}
      </p>
    </article>
  );
}
