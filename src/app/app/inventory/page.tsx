import {
  createCycleCountAction,
  createInventoryItemAction,
  createInventoryLocationAction,
  postInventoryTransactionAction,
} from "@/modules/inventory/actions";
import { getInventoryWorkspace } from "@/modules/inventory/queries";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function InventoryPage() {
  const data = await getInventoryWorkspace();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Materials operations</p>
      <h1 className="mt-3 text-4xl font-black">Inventory & Materials</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Active locations" value={data.metrics.activeLocations} />
        <Metric label="Active items" value={data.metrics.activeItems} />
        <Metric label="Inventory value" value={data.metrics.inventoryValue} money />
        <Metric label="Low-stock balances" value={data.metrics.lowStockItems} />
        <Metric label="Negative balances" value={data.metrics.negativeBalances} />
        <Metric label="Open counts" value={data.metrics.openCounts} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className={card}>
          <h2 className="text-xl font-black">Create location</h2>
          <form action={createInventoryLocationAction} className="mt-5 grid gap-3">
            <input className={input} name="code" placeholder="Location code" required />
            <input className={input} name="name" placeholder="Location name" required />
            <textarea className={`${input} min-h-20`} name="description" placeholder="Description" />
            <input className={input} name="siteId" placeholder="Site ID" />
            <textarea className={`${input} min-h-20`} name="address" placeholder="Address" />
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Create location</button>
          </form>
        </section>
        <section className={card}>
          <h2 className="text-xl font-black">Create stock item</h2>
          <form action={createInventoryItemAction} className="mt-5 grid gap-3">
            <input className={input} name="sku" placeholder="SKU" required />
            <input className={input} name="name" placeholder="Item name" required />
            <input className={input} name="category" placeholder="Category" required />
            <input className={input} name="unitOfMeasure" placeholder="Unit of measure" required />
            <input className={input} name="standardCost" type="number" step="0.0001" placeholder="Standard cost" />
            <input className={input} name="reorderPoint" type="number" step="0.0001" defaultValue="0" />
            <input className={input} name="reorderQuantity" type="number" step="0.0001" defaultValue="0" />
            <input className={input} name="safetyStock" type="number" step="0.0001" defaultValue="0" />
            <input className={input} name="leadTimeDays" type="number" placeholder="Lead-time days" />
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="lotControlled" /> Lot controlled</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="serialControlled" /> Serial controlled</label>
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">Create item</button>
          </form>
        </section>
        <section className={card}>
          <h2 className="text-xl font-black">Post stock movement</h2>
          <form action={postInventoryTransactionAction} className="mt-5 grid gap-3">
            <select className={input} name="inventoryItemId" required><option value="">Select item</option>{data.items.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}</select>
            <select className={input} name="inventoryLocationId" required><option value="">Select location</option>{data.locations.map((location) => <option key={location.id} value={location.id}>{location.code} — {location.name}</option>)}</select>
            <select className={input} name="destinationLocationId"><option value="">No destination</option>{data.locations.map((location) => <option key={location.id} value={location.id}>{location.code} — {location.name}</option>)}</select>
            <select className={input} name="type"><option>RECEIPT</option><option>ISSUE</option><option>TRANSFER_IN</option><option>TRANSFER_OUT</option><option>ADJUSTMENT_IN</option><option>ADJUSTMENT_OUT</option><option>RETURN_TO_STOCK</option><option>RETURN_TO_SUPPLIER</option></select>
            <input className={input} name="quantity" type="number" step="0.0001" placeholder="Quantity" required />
            <input className={input} name="unitCost" type="number" step="0.0001" placeholder="Unit cost" />
            <input className={input} name="referenceType" placeholder="Reference type" />
            <input className={input} name="referenceId" placeholder="Reference ID" />
            <textarea className={`${input} min-h-20`} name="reason" placeholder="Reason" />
            <button className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">Post movement</button>
          </form>
        </section>
      </div>
      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Stock balances</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.balances.map((balance) => <article key={balance.id} className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black text-blue-700">{balance.location.code} · {balance.item.category}</p><h3 className="mt-2 font-black">{balance.item.sku} — {balance.item.name}</h3><p className="mt-3 text-3xl font-black">{balance.quantityAvailable.toString()}</p><p className="mt-1 text-sm text-slate-500">On hand {balance.quantityOnHand.toString()} · Reserved {balance.quantityReserved.toString()}</p></article>)}
        </div>
      </section>
      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Schedule cycle count</h2>
        <form action={createCycleCountAction} className="mt-5 grid gap-3 md:grid-cols-4">
          <select className={input} name="inventoryLocationId" required><option value="">Select location</option>{data.locations.map((location) => <option key={location.id} value={location.id}>{location.code} — {location.name}</option>)}</select>
          <input className={input} name="scheduledAt" type="datetime-local" required />
          <textarea className={`${input} min-h-20`} name="notes" placeholder="Count notes" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Schedule count</button>
        </form>
      </section>
    </div>
  );
}

function Metric({ label, value, money = false }: { label: string; value: number; money?: boolean }) {
  return <article className={card}><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{money ? `$${value.toLocaleString()}` : value}</p></article>;
}
