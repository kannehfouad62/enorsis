import Link from "next/link";
import { ResourceIntelligencePanel } from "@/components/ai/ResourceIntelligencePanel";
import {
  adviseNegotiationAction,
  draftRfxAction,
} from "@/modules/ai/context-actions";
import { getResourceAiExecutions } from "@/modules/ai/resource-queries";
import { getSourcingEvent } from "@/modules/sourcing/queries";

const textarea =
  "min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3";

export default async function SourcingIntelligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ event }, { executions }] = await Promise.all([
    getSourcingEvent(id),
    getResourceAiExecutions("SourcingEvent", id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href={`/app/sourcing/${id}`} className="font-black text-blue-700">
        ← Sourcing event
      </Link>
      <h1 className="mt-5 text-4xl font-black">Sourcing intelligence</h1>
      <p className="mt-2 text-slate-600">
        {event.eventNumber} · {event.title}
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <form
          action={draftRfxAction}
          className="rounded-3xl border border-slate-200 bg-white p-6"
        >
          <input type="hidden" name="sourcingEventId" value={id} />
          <h2 className="text-xl font-black">RFx drafting assistant</h2>
          <textarea
            className={`${textarea} mt-4`}
            name="instruction"
            placeholder="Optional drafting instructions"
          />
          <button className="mt-3 rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Generate governed RFx draft
          </button>
        </form>

        <form
          action={adviseNegotiationAction}
          className="rounded-3xl border border-blue-100 bg-blue-50 p-6"
        >
          <input type="hidden" name="sourcingEventId" value={id} />
          <h2 className="text-xl font-black">Negotiation advisor</h2>
          <textarea
            className={`${textarea} mt-4 bg-white`}
            name="instruction"
            placeholder="Optional negotiation objectives and constraints"
          />
          <button className="mt-3 rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
            Generate negotiation strategy
          </button>
        </form>
      </div>

      <div className="mt-6">
        <ResourceIntelligencePanel executions={executions} />
      </div>
    </div>
  );
}
