import { ResourceIntelligencePanel } from "@/components/ai/ResourceIntelligencePanel";
import { createExecutiveProcurementBriefAction } from "@/modules/ai/context-actions";
import { getExecutiveAiWorkspace } from "@/modules/ai/resource-queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3";

export default async function ExecutiveAiWorkspacePage() {
  const {
    suppliers,
    sourcingEvents,
    contracts,
    executions,
  } = await getExecutiveAiWorkspace();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Executive AI
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Procurement decision briefs
      </h1>

      <form
        action={createExecutiveProcurementBriefAction}
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-6"
      >
        <label className="text-sm font-bold">
          Subject type
          <select className={input} name="subjectType" defaultValue="SourcingEvent">
            <option value="SourcingEvent">Sourcing event</option>
            <option value="Supplier">Supplier</option>
            <option value="Contract">Contract</option>
          </select>
        </label>

        <label className="mt-4 block text-sm font-bold">
          Record
          <select className={input} name="resourceId" required>
            <optgroup label="Sourcing events">
              {sourcingEvents.map((event) => (
                <option key={`event-${event.id}`} value={event.id}>
                  {event.eventNumber} · {event.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Suppliers">
              {suppliers.map((supplier) => (
                <option key={`supplier-${supplier.id}`} value={supplier.id}>
                  {supplier.supplierNumber} ·{" "}
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </optgroup>
            <optgroup label="Contracts">
              {contracts.map((contract) => (
                <option key={`contract-${contract.id}`} value={contract.id}>
                  {contract.contractNumber} · {contract.title}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="mt-4 block text-sm font-bold">
          Executive decision question
          <textarea
            className={`${input} min-h-36`}
            name="instruction"
            placeholder="Describe the decision, audience, constraints and required recommendation."
          />
        </label>

        <button className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
          Generate executive brief
        </button>
      </form>

      <div className="mt-6">
        <ResourceIntelligencePanel executions={executions} />
      </div>
    </div>
  );
}
