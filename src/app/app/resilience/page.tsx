import {
  addSupplyRiskExposureAction,
  createResiliencePlanAction,
  createSupplyRiskEventAction,
} from "@/modules/supply-resilience/actions";
import { getSupplyResilienceWorkspace } from "@/modules/supply-resilience/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SupplyResiliencePage() {
  const data = await getSupplyResilienceWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Supply continuity
      </p>
      <h1 className="mt-3 text-4xl font-black">Risk & Resilience</h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Open events" value={data.metrics.openEvents} />
        <Metric label="Critical events" value={data.metrics.criticalEvents} />
        <Metric label="Spend at risk" value={data.metrics.spendAtRisk} money />
        <Metric label="Active plans" value={data.metrics.activePlans} />
        <Metric label="Single-source exposure" value={data.metrics.singleSourceExposures} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Register disruption event</h2>
          <form action={createSupplyRiskEventAction} className="mt-5 grid gap-3">
            <input className={input} name="title" placeholder="Event title" required />
            <textarea className={`${input} min-h-24`} name="description" placeholder="Description" required />
            <select className={input} name="type">
              <option>SUPPLIER_FAILURE</option>
              <option>LOGISTICS_DISRUPTION</option>
              <option>GEOPOLITICAL</option>
              <option>CYBER</option>
              <option>QUALITY</option>
              <option>FINANCIAL</option>
              <option>NATURAL_HAZARD</option>
              <option>REGULATORY</option>
              <option>LABOR</option>
              <option>CAPACITY</option>
              <option>OTHER</option>
            </select>
            <select className={input} name="severity" defaultValue="MODERATE">
              <option>LOW</option><option>MODERATE</option><option>HIGH</option><option>CRITICAL</option>
            </select>
            <input className={input} name="countryCode" placeholder="Country code" />
            <input className={input} name="region" placeholder="Region" />
            <input className={input} name="detectedAt" type="datetime-local" required />
            <input className={input} name="probabilityPercent" type="number" min="0" max="100" defaultValue="50" />
            <input className={input} name="financialImpact" type="number" step="0.01" placeholder="Financial impact" />
            <input className={input} name="operationalImpact" type="number" min="1" max="5" defaultValue="3" />
            <textarea className={`${input} min-h-20`} name="executiveSummary" placeholder="Executive summary" />
            <button className="rounded-xl bg-red-700 px-5 py-3 font-black text-white">
              Register event
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Create resilience plan</h2>
          <form action={createResiliencePlanAction} className="mt-5 grid gap-3">
            <select className={input} name="supplyRiskEventId">
              <option value="">General continuity plan</option>
              {data.events.map((event) => (
                <option key={event.id} value={event.id}>{event.eventNumber} — {event.title}</option>
              ))}
            </select>
            <input className={input} name="name" placeholder="Plan name" required />
            <textarea className={`${input} min-h-24`} name="description" placeholder="Description" required />
            <textarea className={`${input} min-h-20`} name="activationCriteria" placeholder="Activation criteria" required />
            <textarea className={`${input} min-h-20`} name="recoveryObjective" placeholder="Recovery objective" required />
            <input className={input} name="recoveryTimeHours" type="number" placeholder="Recovery time hours" />
            <input className={input} name="minimumServicePercent" type="number" min="0" max="100" defaultValue="50" />
            <input className={input} name="alternateSuppliers" placeholder="Alternate suppliers, comma separated" />
            <input className={input} name="alternateSites" placeholder="Alternate sites, comma separated" />
            <textarea className={`${input} min-h-20`} name="inventoryStrategy" placeholder="Inventory strategy" />
            <textarea className={`${input} min-h-20`} name="logisticsStrategy" placeholder="Logistics strategy" />
            <textarea className={`${input} min-h-20`} name="communicationsPlan" placeholder="Communications plan" />
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Create plan
            </button>
          </form>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Disruption register</h2>
        <div className="mt-5 space-y-5">
          {data.events.map((event) => (
            <article key={event.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-red-700">
                {event.eventNumber} · {event.severity} · {event.status}
              </p>
              <h3 className="mt-2 text-lg font-black">{event.title}</h3>
              <p className="mt-2 text-sm text-slate-500">
                Risk score {event.overallRiskScore.toString()} · {event.exposures.length} exposures · {event.resiliencePlans.length} plans
              </p>
              <form action={addSupplyRiskExposureAction} className="mt-4 grid gap-3 md:grid-cols-4">
                <input type="hidden" name="eventId" value={event.id} />
                <select className={input} name="type">
                  <option>SUPPLIER</option><option>CATEGORY</option><option>COUNTRY</option>
                  <option>SITE</option><option>CONTRACT</option><option>PURCHASE_ORDER</option>
                </select>
                <input className={input} name="referenceId" placeholder="Reference ID" />
                <input className={input} name="referenceLabel" placeholder="Reference label" required />
                <input className={input} name="criticality" type="number" min="1" max="5" defaultValue="3" />
                <input className={input} name="spendAtRisk" type="number" step="0.01" placeholder="Spend at risk" />
                <input className={input} name="daysOfSupply" type="number" placeholder="Days of supply" />
                <input className={input} name="alternateSourceCount" type="number" min="0" defaultValue="0" />
                <input className={input} name="dependencyPercent" type="number" min="0" max="100" defaultValue="0" />
                <input className={input} name="impactSummary" placeholder="Impact summary" />
                <input className={input} name="mitigationSummary" placeholder="Mitigation summary" />
                <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                  Add exposure
                </button>
              </form>
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
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{money ? `$${value.toLocaleString()}` : value}</p>
    </article>
  );
}
