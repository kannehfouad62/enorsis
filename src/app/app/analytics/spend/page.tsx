import { HorizontalBars } from "@/components/analytics/HorizontalBars";
import {
  formatMoney,
  getProcurementCommandCenter,
} from "@/modules/analytics/procurement";

export default async function SpendAnalysisPage() {
  const data = await getProcurementCommandCenter();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Spend intelligence
      </p>
      <h1 className="mt-3 text-4xl font-black">Spend analysis</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Purchase-request demand is normalized to USD using the historical
        exchange rate stored on each request.
      </p>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Category distribution</h2>
        <div className="mt-6">
          <HorizontalBars
            data={data.categoryBreakdown.map((item) => ({
              label: item.category,
              value: item.value,
            }))}
            valueFormatter={(value) => formatMoney(value, "USD")}
          />
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Recent demand</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3">Request</th>
                <th className="p-3">Status</th>
                <th className="p-3">Original value</th>
                <th className="p-3">USD equivalent</th>
                <th className="p-3">Department</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRequests.map((request) => (
                <tr key={request.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <p className="font-black">{request.requestNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {request.title}
                    </p>
                  </td>
                  <td className="p-3">{request.status}</td>
                  <td className="p-3">
                    {request.originalCurrency}{" "}
                    {Number(request.totalAmount).toLocaleString()}
                  </td>
                  <td className="p-3 font-black text-blue-700">
                    {formatMoney(Number(request.usdEquivalent), "USD")}
                  </td>
                  <td className="p-3">
                    {request.department?.name ?? "Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
