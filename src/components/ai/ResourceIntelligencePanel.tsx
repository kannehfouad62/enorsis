import type { AiExecution } from "@/generated/prisma/client";

export function ResourceIntelligencePanel({
  executions,
}: {
  executions: AiExecution[];
}) {
  return (
    <div className="space-y-5">
      {executions.map((execution) => (
        <article
          key={execution.id}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">
                {execution.capability.replaceAll("_", " ")}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {execution.model} · Prompt v{execution.promptVersion ?? 1} ·{" "}
                {execution.createdAt.toLocaleString()}
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {execution.reviewStatus.replaceAll("_", " ")}
            </span>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {execution.outputText ??
                execution.errorMessage ??
                "Processing analysis"}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="font-black">
              Confidence: {execution.confidence ?? 0}%
            </span>
            <span>Tokens: {execution.totalTokens ?? 0}</span>
            <span>Latency: {execution.latencyMs ?? 0} ms</span>
          </div>
        </article>
      ))}

      {executions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No governed AI analyses have been created for this record.
        </div>
      ) : null}
    </div>
  );
}
