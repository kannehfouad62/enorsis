import { runOpenAiExecutiveSynthesisAction } from "@/modules/governed-executive-ai/synthesis-actions";
import { getExecutiveSynthesisWorkspace } from "@/modules/governed-executive-ai/synthesis-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export default async function ExecutiveAiSynthesisPage() {
  const data = await getExecutiveSynthesisWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.8.5.5
          </p>
          <h1 className="mt-3 text-4xl font-black">
            OpenAI Executive Synthesis
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Board-ready narrative synthesis generated only from governed
            Enorsis insights and evidence. Human approval remains authoritative.
          </p>
        </div>

        <form action={runOpenAiExecutiveSynthesisAction}>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Generate governed synthesis
          </button>
        </form>
      </div>

      <section className="mt-8 space-y-6">
        {data.syntheses.length === 0 ? (
          <article className={card}>
            <p className="text-sm text-slate-500">
              No executive synthesis has been generated yet.
            </p>
          </article>
        ) : (
          data.syntheses.map((synthesis) => {
            const risks = asArray(synthesis.keyRisks);
            const opportunities = asArray(synthesis.keyOpportunities);
            const priorities = asArray(synthesis.recommendedPriorities);
            const governance = asArray(synthesis.governanceNotes);

            return (
              <article key={synthesis.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase text-blue-700">
                      {synthesis.synthesisRun.model} ·{" "}
                      {synthesis.synthesisRun.promptVersion}
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      {synthesis.title}
                    </h2>
                    <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
                      {synthesis.executiveSummary}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                    <p className="font-black">
                      {synthesis.synthesisRun.sourceInsightCount} source insights
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {synthesis.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <section>
                    <h3 className="font-black">Key risks</h3>
                    <div className="mt-3 space-y-3">
                      {risks.map((item, index) => (
                        <div key={index} className="rounded-2xl bg-slate-50 p-4">
                          <pre className="whitespace-pre-wrap font-sans text-sm">
                            {JSON.stringify(item, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="font-black">Key opportunities</h3>
                    <div className="mt-3 space-y-3">
                      {opportunities.map((item, index) => (
                        <div key={index} className="rounded-2xl bg-slate-50 p-4">
                          <pre className="whitespace-pre-wrap font-sans text-sm">
                            {JSON.stringify(item, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="mt-6">
                  <h3 className="font-black">Recommended priorities</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {priorities.map((item, index) => (
                      <div key={index} className="rounded-2xl bg-slate-50 p-4">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {JSON.stringify(item, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-6">
                  <h3 className="font-black">Governance notes</h3>
                  <div className="mt-3 space-y-3">
                    {governance.map((item, index) => (
                      <div key={index} className="rounded-2xl bg-amber-50 p-4">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {JSON.stringify(item, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Confidence statement
                  </p>
                  <p className="mt-2 text-sm leading-6">
                    {synthesis.confidenceStatement}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Synthesis run history</h2>
        <div className="mt-5 space-y-3">
          {data.runs.map((run) => (
            <article key={run.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black">{run.runNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {run.provider} · {run.model} · {run.promptVersion}
                  </p>
                </div>
                <span className="text-xs font-black">{run.status}</span>
              </div>
              {run.errorMessage ? (
                <p className="mt-3 text-xs text-red-700">{run.errorMessage}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
