import {
  activateCatalogAction,
  addCatalogItemAction,
  addItemToCartAction,
  createCatalogAction,
  submitGuidedCartAction,
} from "@/modules/guided-buying/actions";
import { getGuidedBuyingWorkspace } from "@/modules/guided-buying/queries";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function GuidedBuyingPage() {
  const data = await getGuidedBuyingWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Guided procurement
      </p>
      <h1 className="mt-3 text-4xl font-black">Catalog & Guided Buying</h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Active catalogs" value={data.metrics.activeCatalogs} />
        <Metric label="Active items" value={data.metrics.activeItems} />
        <Metric label="Preferred items" value={data.metrics.preferredItems} />
        <Metric label="Cart items" value={data.metrics.cartItems} />
        <Metric label="Cart total" value={data.metrics.cartTotal} money />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Create catalog</h2>
          <form action={createCatalogAction} className="mt-5 grid gap-3">
            <input className={input} name="name" placeholder="Catalog name" required />
            <textarea className={`${input} min-h-20`} name="description" placeholder="Description" />
            <select className={input} name="type">
              <option>INTERNAL</option><option>SUPPLIER</option>
              <option>CONTRACT</option><option>PUNCHOUT</option>
            </select>
            <select className={input} name="supplierId">
              <option value="">No linked supplier</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </select>
            <input className={input} name="currencyCode" defaultValue="USD" />
            <input className={input} name="validFrom" type="date" />
            <input className={input} name="validUntil" type="date" />
            <input className={input} name="contractReference" placeholder="Contract reference" />
            <input className={input} name="punchoutUrl" type="url" placeholder="Punchout URL" />
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Create catalog
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Current cart</h2>
          {data.cart ? (
            <>
              <div className="mt-5 space-y-3">
                {data.cart.items.map((line) => (
                  <article key={line.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-black">{line.catalogItem.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {line.quantity.toString()} × ${line.unitPrice.toString()}
                    </p>
                  </article>
                ))}
              </div>
              <form action={submitGuidedCartAction} className="mt-5 grid gap-3">
                <input type="hidden" name="cartId" value={data.cart.id} />
                <textarea className={`${input} min-h-20`} name="businessPurpose" placeholder="Business purpose" required />
                <input className={input} name="deliveryLocation" placeholder="Delivery location" />
                <input className={input} name="neededBy" type="date" />
                <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
                  Submit guided request
                </button>
              </form>
            </>
          ) : (
            <p className="mt-5 text-sm text-slate-500">No draft cart.</p>
          )}
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Catalog library</h2>
        <div className="mt-5 space-y-6">
          {data.catalogs.map((catalog) => (
            <article key={catalog.id} className="rounded-2xl bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black text-blue-700">
                    {catalog.type} · {catalog.status}
                  </p>
                  <h3 className="mt-2 text-lg font-black">{catalog.name}</h3>
                </div>
                {catalog.status === "DRAFT" ? (
                  <form action={activateCatalogAction}>
                    <input type="hidden" name="catalogId" value={catalog.id} />
                    <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">
                      Activate
                    </button>
                  </form>
                ) : null}
              </div>

              <form action={addCatalogItemAction} className="mt-5 grid gap-3 md:grid-cols-3">
                <input type="hidden" name="procurementCatalogId" value={catalog.id} />
                <input className={input} name="sku" placeholder="SKU" required />
                <input className={input} name="supplierSku" placeholder="Supplier SKU" />
                <input className={input} name="name" placeholder="Item name" required />
                <input className={input} name="category" placeholder="Category" required />
                <input className={input} name="unitOfMeasure" placeholder="Unit" required />
                <input className={input} name="unitPrice" type="number" step="0.0001" placeholder="Unit price" required />
                <input className={input} name="minimumQuantity" type="number" step="0.0001" defaultValue="1" />
                <input className={input} name="maximumQuantity" type="number" step="0.0001" placeholder="Max quantity" />
                <input className={input} name="leadTimeDays" type="number" placeholder="Lead-time days" />
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" name="preferred" /> Preferred
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" name="environmentallyPreferred" /> Environmental
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" name="diversityQualified" /> Diversity
                </label>
                <button className="rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
                  Add item
                </button>
              </form>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {catalog.items.map((item) => (
                  <article key={item.id} className="rounded-2xl bg-white p-5">
                    <p className="text-xs font-black text-blue-700">
                      {item.category} {item.preferred ? "· PREFERRED" : ""}
                    </p>
                    <h4 className="mt-2 font-black">{item.name}</h4>
                    <p className="mt-2 text-sm text-slate-500">
                      ${item.unitPrice.toString()} / {item.unitOfMeasure}
                    </p>
                    {catalog.status === "ACTIVE" ? (
                      <form action={addItemToCartAction} className="mt-4 flex gap-2">
                        <input type="hidden" name="catalogItemId" value={item.id} />
                        <input className="w-24 rounded-xl border border-slate-200 px-3 py-2" name="quantity" type="number" step="0.0001" defaultValue={item.minimumQuantity.toString()} />
                        <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                          Add
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, money = false }: { label: string; value: number; money?: boolean }) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{money ? `$${value.toLocaleString()}` : value}</p>
    </article>
  );
}
