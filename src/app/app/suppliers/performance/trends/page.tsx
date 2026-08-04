import Link from "next/link";
import { getSupplierPerformanceTrends } from "@/modules/supplier-performance/trends";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SupplierPerformanceTrendsPage() {
  const data = await getSupplierPerformanceTrends();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link
        href="/app/suppliers/performance"
        className="font-black text-blue-700"
      >
        ← Supplier performance
      </Link>
      <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Portfolio intelligence
      </p>
      <h1 className="mt-3 text-4xl font-black">Performance Trends</h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Improving" value={data.metrics.improving} />
        <Metric label="Declining" value={data.metrics.declining} />
        <Metric label="Stable" value={data.metrics.stable} />
        <Metric label="Critical" value={data.metrics.critical} />
      </div>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Supplier</th>
              <th className="p-3">Latest score</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Change</th>
              <th className="p-3">Trend</th>
              <th className="p-3">History</th>
            </tr>
          </thead>
          <tbody>
            {data.suppliers.map((supplier) => (
              <tr key={supplier.supplierId} className="border-t border-slate-100">
                <td className="p-3 font-black">{supplier.supplierName}</td>
                <td className="p-3">{supplier.latestScore.toFixed(2)}</td>
                <td className="p-3">{supplier.latestRating}</td>
                <td className="p-3">
                  {supplier.change > 0 ? "+" : ""}
                  {supplier.change.toFixed(2)}
                </td>
                <td className="p-3 font-black">{supplier.trend}</td>
                <td className="p-3">
                  {supplier.points
                    .slice(-4)
                    .map((point) => point.overallScore.toFixed(0))
                    .join(" → ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
