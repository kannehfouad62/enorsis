import { refreshInventoryIntelligenceAction } from "@/modules/inventory-intelligence/actions";
import { getInventoryIntelligenceWorkspace } from "@/modules/inventory-intelligence/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function number(value: number, digits = 2) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

export default async function InventoryIntelligencePage() {
  const data = await getInventoryIntelligenceWorkspace();

  const metrics = [
    ["Inventory Health", `${data.summary.inventoryHealthScore}/100`],
    ["Inventory Value", `$${number(data.summary.totalFinancialValue)}`],
    ["Inventory Turnover", `${number(data.summary.inventoryTurnover)} turns`],
    [
      "Days Inventory Outstanding",
      data.summary.daysInventoryOutstanding !== null
        ? `${number(data.summary.daysInventoryOutstanding)} days`
        : "Not available",
    ],
    ["Fill Rate", `${number(data.summary.fillRate)}%`],
    ["Dead Stock", `${data.summary.deadStockItems} items`],
    ["Understock", `${data.summary.understockItems} items`],
    ["Overstock", `${data.summary.overstockItems} items`],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.8.2
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Inventory Intelligence
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Inventory turnover, DIO, aging, dead stock, min/max exposure,
            fill rate, ABC/XYZ classification and composite inventory health.
          </p>
        </div>

        <form action={refreshInventoryIntelligenceAction}>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Refresh & publish KPIs
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className={card}>
            <p className="text-xs font-black uppercase text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-3xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Inventory aging</h2>
          <div className="mt-5 space-y-3">
            {data.agingBuckets.map((bucket) => (
              <div key={bucket.label} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-black">{bucket.label}</p>
                  <p className="text-sm font-black">
                    {bucket.itemCount} items
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Qty {number(bucket.quantity)} · Value ${number(bucket.value)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Portfolio segmentation</h2>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {(["A", "B", "C"] as const).map((abc) => (
              <article key={abc} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">ABC {abc}</p>
                <p className="mt-2 text-2xl font-black">
                  {data.classification.filter((row) => row.abcClass === abc).length}
                </p>
              </article>
            ))}
            {(["X", "Y", "Z"] as const).map((xyz) => (
              <article key={xyz} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">XYZ {xyz}</p>
                <p className="mt-2 text-2xl font-black">
                  {data.classification.filter((row) => row.xyzClass === xyz).length}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Inventory intelligence register</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Item</th>
                <th className="px-3 py-3">On hand</th>
                <th className="px-3 py-3">Value</th>
                <th className="px-3 py-3">Turnover</th>
                <th className="px-3 py-3">DIO</th>
                <th className="px-3 py-3">Age</th>
                <th className="px-3 py-3">ABC</th>
                <th className="px-3 py-3">XYZ</th>
                <th className="px-3 py-3">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.classification.map((row) => (
                <tr key={row.inventoryItemId}>
                  <td className="px-3 py-3 font-black">{row.inventoryItemId}</td>
                  <td className="px-3 py-3">{number(row.quantityOnHand)}</td>
                  <td className="px-3 py-3">${number(row.inventoryValue)}</td>
                  <td className="px-3 py-3">{number(row.turnoverRatio)}</td>
                  <td className="px-3 py-3">
                    {row.daysInventoryOutstanding !== null
                      ? number(row.daysInventoryOutstanding)
                      : "—"}
                  </td>
                  <td className="px-3 py-3">{row.ageDays}d</td>
                  <td className="px-3 py-3 font-black">{row.abcClass}</td>
                  <td className="px-3 py-3 font-black">{row.xyzClass}</td>
                  <td className="px-3 py-3 font-black">{row.healthScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
