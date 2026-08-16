import { refreshWarehouseIntelligenceAction } from "@/modules/warehouse-intelligence/actions";
import { getWarehouseIntelligenceWorkspace } from "@/modules/warehouse-intelligence/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function number(value: number, digits = 2) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

export default async function WarehouseIntelligencePage() {
  const data = await getWarehouseIntelligenceWorkspace();

  const metrics = [
    ["Warehouse Health", `${data.summary.warehouseHealthScore}/100`],
    ["Receiving Acceptance", `${number(data.summary.receivingAcceptanceRate)}%`],
    ["Receiving Cycle", `${number(data.summary.receivingCycleHours)} hrs`],
    ["Putaway Cycle", `${number(data.summary.putawayCycleHours)} hrs`],
    ["Pick Accuracy", `${number(data.summary.pickAccuracy)}%`],
    ["Short Pick Rate", `${number(data.summary.shortPickRate)}%`],
    ["Fulfillment Cycle", `${number(data.summary.fulfillmentCycleHours)} hrs`],
    ["Location Utilization", `${number(data.summary.averageLocationUtilization)}%`],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="mt-3 text-4xl font-black">
            Warehouse Intelligence & Performance Analytics
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Receiving, putaway, picking, fulfillment, location utilization,
            transfer accuracy, queue aging and warehouse health analytics.
          </p>
        </div>

        <form action={refreshWarehouseIntelligenceAction}>
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
          <h2 className="text-xl font-black">Operational workload</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["Receiving sessions", data.summary.receivingSessions],
              ["Received lines", data.summary.receivedLineCount],
              ["Open putaway", data.summary.openPutawayTasks],
              ["Aged putaway", data.summary.agedPutawayTasks],
              ["Completed fulfillment", data.summary.completedFulfillmentOrders],
              ["Open discrepancies", data.summary.openDiscrepancies],
              ["High-utilization locations", data.summary.highUtilizationLocations],
              ["Throughput quantity", number(data.summary.throughputQuantity)],
            ].map(([label, value]) => (
              <article key={String(label)} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Transfer performance</h2>
          <div className="mt-5 space-y-3">
            <article className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Transfer cycle time</p>
              <p className="mt-2 text-2xl font-black">
                {number(data.summary.transferCycleHours)} hrs
              </p>
            </article>
            <article className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Transfer receipt accuracy</p>
              <p className="mt-2 text-2xl font-black">
                {number(data.summary.transferReceiptAccuracy)}%
              </p>
            </article>
          </div>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Location utilization</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3">Warehouse</th>
                <th className="px-3 py-3">Zone</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Occupied</th>
                <th className="px-3 py-3">Capacity</th>
                <th className="px-3 py-3">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.locations.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-3 font-black">{row.locationId}</td>
                  <td className="px-3 py-3">{row.warehouseCode ?? "—"}</td>
                  <td className="px-3 py-3">{row.zoneCode ?? "—"}</td>
                  <td className="px-3 py-3">{row.status}</td>
                  <td className="px-3 py-3">{number(row.occupiedQuantity)}</td>
                  <td className="px-3 py-3">
                    {row.capacityQuantity !== null
                      ? number(row.capacityQuantity)
                      : "—"}
                  </td>
                  <td className="px-3 py-3 font-black">
                    {row.utilizationPercent !== null
                      ? `${number(row.utilizationPercent)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Open putaway queue</h2>
          <div className="mt-5 space-y-3">
            {data.openPutaway.map((task) => (
              <article key={task.id} className="rounded-xl bg-slate-50 p-4">
                <p className="font-black">{task.taskNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.inventoryItemId} · {task.quantity.toString()}{" "}
                  {task.unitOfMeasure} · {task.status}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Receiving discrepancies</h2>
          <div className="mt-5 space-y-3">
            {data.openDiscrepancies.map((item) => (
              <article key={item.id} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-black text-red-700">
                  {item.severity} · {item.discrepancyType}
                </p>
                <p className="mt-1 font-black">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.status}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
