import { getProcurementExecutiveAnalytics } from "@/modules/requisition-to-order/analytics-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const pct = (value: number) => `${value.toFixed(1)}%`;

export default async function ProcurementAnalyticsPage() {
  const data = await getProcurementExecutiveAnalytics();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Phase B1.8
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Procurement Analytics & Executive Dashboard
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Executive visibility across requisitions, approvals, purchase orders,
        receipts, three-way matching, and payment readiness.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Committed spend"
          value={money.format(data.metrics.committedSpend)}
        />
        <Metric
          label="Average approval cycle"
          value={`${data.metrics.averageApprovalHours.toFixed(1)} hrs`}
        />
        <Metric
          label="Full receipt rate"
          value={pct(data.metrics.fullyReceivedRate)}
        />
        <Metric
          label="Three-way match rate"
          value={pct(data.metrics.threeWayMatchRate)}
        />
        <Metric
          label="Payment-readiness rate"
          value={pct(data.metrics.paymentReadinessRate)}
        />
        <Metric
          label="Active payment holds"
          value={String(data.metrics.activePaymentHolds)}
        />
        <Metric
          label="Open receipt exceptions"
          value={String(data.metrics.openReceiptExceptions)}
        />
        <Metric
          label="Open match exceptions"
          value={String(data.metrics.openMatchExceptions)}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Process bottlenecks</h2>
          <div className="mt-5 space-y-3">
            {data.bottlenecks.map((item) => (
              <div
                key={item.stage}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-bold">{item.stage}</span>
                <span className="text-xl font-black">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Journey distribution</h2>
          <div className="mt-5 space-y-3">
            {data.journeyStatus
              .filter((item) => item.count > 0)
              .map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-bold">
                    {item.status.replaceAll("_", " ")}
                  </span>
                  <span className="text-xl font-black">{item.count}</span>
                </div>
              ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Recent purchase orders</h2>
          <div className="mt-5 space-y-3">
            {data.recentOrders.map((order) => (
              <div key={order.id} className="rounded-xl bg-slate-50 p-4">
                <p className="font-black">{order.orderNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {order.status} · {order.currencyCode}{" "}
                  {order.totalAmount.toString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Recent AP readiness</h2>
          <div className="mt-5 space-y-3">
            {data.recentPaymentCases.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                <p className="font-black">{item.readinessNumber}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.status} · {item.currencyCode}{" "}
                  {item.invoiceAmount.toString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={card}>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
