import {
  assignAssetAction,
  createAssetAction,
  createMaintenancePlanAction,
  createMaintenanceRecordAction,
  retireAssetAction,
} from "@/modules/assets/actions";
import { getAssetsWorkspace } from "@/modules/assets/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AssetsPage() {
  const data = await getAssetsWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Asset lifecycle
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Assets & Equipment
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Govern procured assets from acquisition and custody through
        warranty, maintenance, retirement and disposal.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="In service" value={data.metrics.inService} />
        <Metric label="Under maintenance" value={data.metrics.maintenance} />
        <Metric label="Asset value" value={data.metrics.assetValue} money />
        <Metric label="Warranty expiring" value={data.metrics.warrantyExpiring} />
        <Metric label="Maintenance due" value={data.metrics.maintenanceDue} />
        <Metric label="Unassigned assets" value={data.metrics.unassigned} />
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Register asset</h2>
        <form action={createAssetAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className={input} name="name" placeholder="Asset name" required />
          <input className={input} name="category" placeholder="Category" required />
          <select className={input} name="criticality" defaultValue="MODERATE">
            <option>LOW</option>
            <option>MODERATE</option>
            <option>HIGH</option>
            <option>CRITICAL</option>
          </select>
          <input className={input} name="serialNumber" placeholder="Serial number" />
          <input className={input} name="manufacturer" placeholder="Manufacturer" />
          <input className={input} name="modelNumber" placeholder="Model number" />
          <input className={input} name="purchaseOrderId" placeholder="Purchase order ID" />
          <input className={input} name="supplierId" placeholder="Supplier ID" />
          <input className={input} name="inventoryItemId" placeholder="Inventory item ID" />
          <input className={input} name="siteId" placeholder="Site ID" />
          <input className={input} name="location" placeholder="Location" />
          <input className={input} name="acquisitionDate" type="date" />
          <input className={input} name="inServiceDate" type="date" />
          <input className={input} name="purchaseCost" type="number" step="0.01" placeholder="Purchase cost" />
          <input className={input} name="currencyCode" defaultValue="USD" />
          <input className={input} name="usefulLifeMonths" type="number" placeholder="Useful life months" />
          <input className={input} name="residualValue" type="number" step="0.01" placeholder="Residual value" />
          <input className={input} name="warrantyStartsAt" type="date" />
          <input className={input} name="warrantyEndsAt" type="date" />
          <input className={input} name="warrantyProvider" placeholder="Warranty provider" />
          <textarea className={`${input} min-h-20 md:col-span-2`} name="description" placeholder="Description" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Register asset
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Asset register</h2>
        <div className="mt-5 space-y-6">
          {data.assets.map((asset) => (
            <article key={asset.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {asset.assetNumber} · {asset.status} · {asset.criticality}
              </p>
              <h3 className="mt-2 text-lg font-black">{asset.name}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {asset.category} · Cost $
                {Number(asset.purchaseCost ?? 0).toLocaleString()} ·{" "}
                {asset.location ?? "No location"}
              </p>

              <div className="mt-5 grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
                <form action={assignAssetAction} className="grid gap-3">
                  <input type="hidden" name="procurementAssetId" value={asset.id} />
                  <select className={input} name="assignedToUserId" required>
                    <option value="">Select custodian</option>
                    {data.members.map((membership) => (
                      <option key={membership.id} value={membership.userId}>
                        {membership.user.name ?? membership.user.email}
                      </option>
                    ))}
                  </select>
                  <input className={input} name="expectedReturnAt" type="date" />
                  <input className={input} name="location" placeholder="Assigned location" />
                  <input className={input} name="conditionAtIssue" placeholder="Condition at issue" />
                  <input className={input} name="notes" placeholder="Assignment notes" />
                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                    Assign asset
                  </button>
                </form>

                <form action={createMaintenancePlanAction} className="grid gap-3">
                  <input type="hidden" name="procurementAssetId" value={asset.id} />
                  <input className={input} name="name" placeholder="Plan name" required />
                  <select className={input} name="type">
                    <option>PREVENTIVE</option>
                    <option>CORRECTIVE</option>
                    <option>INSPECTION</option>
                    <option>CALIBRATION</option>
                    <option>WARRANTY</option>
                    <option>UPGRADE</option>
                  </select>
                  <input className={input} name="frequencyDays" type="number" min="1" placeholder="Frequency days" required />
                  <input className={input} name="nextDueAt" type="date" required />
                  <select className={input} name="responsibleUserId">
                    <option value="">Assign creator</option>
                    {data.members.map((membership) => (
                      <option key={membership.id} value={membership.userId}>
                        {membership.user.name ?? membership.user.email}
                      </option>
                    ))}
                  </select>
                  <input className={input} name="instructions" placeholder="Instructions" />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 font-black text-white">
                    Add maintenance plan
                  </button>
                </form>

                <form action={createMaintenanceRecordAction} className="grid gap-3">
                  <input type="hidden" name="procurementAssetId" value={asset.id} />
                  <select className={input} name="maintenancePlanId">
                    <option value="">No linked plan</option>
                    {asset.maintenancePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                  <select className={input} name="type">
                    <option>PREVENTIVE</option>
                    <option>CORRECTIVE</option>
                    <option>INSPECTION</option>
                    <option>CALIBRATION</option>
                    <option>WARRANTY</option>
                    <option>UPGRADE</option>
                  </select>
                  <input className={input} name="scheduledAt" type="date" required />
                  <input className={input} name="performedBy" placeholder="Performed by" />
                  <input className={input} name="vendorName" placeholder="Vendor" />
                  <input className={input} name="cost" type="number" step="0.01" placeholder="Cost" />
                  <input className={input} name="currencyCode" defaultValue="USD" />
                  <input className={input} name="downtimeHours" type="number" step="0.01" placeholder="Downtime hours" />
                  <input className={input} name="findings" placeholder="Findings" />
                  <input className={input} name="workPerformed" placeholder="Work performed" />
                  <input className={input} name="partsUsed" placeholder="Parts used" />
                  <input className={input} name="evidenceUrl" type="url" placeholder="Evidence URL" />
                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
                    Record maintenance
                  </button>
                </form>

                <form action={retireAssetAction} className="grid gap-3">
                  <input type="hidden" name="assetId" value={asset.id} />
                  <select className={input} name="status">
                    <option>RETIRED</option>
                    <option>DISPOSED</option>
                    <option>LOST</option>
                  </select>
                  <textarea className={`${input} min-h-20`} name="retirementReason" placeholder="Retirement reason" required />
                  <button className="rounded-xl bg-red-700 px-4 py-2.5 font-black text-white">
                    Retire asset
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
