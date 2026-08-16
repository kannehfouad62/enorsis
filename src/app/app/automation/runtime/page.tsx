import Link from "next/link";
import {
  signalDurableAutomationExecutionAction,
  startDurableAutomationExecutionAction,
} from "@/modules/enterprise-automation/runtime-actions";
import { getDurableAutomationRuntimeWorkspace } from "@/modules/enterprise-automation/runtime-queries";
import { recoverDurableAutomationExecutionAction } from "@/modules/enterprise-automation/recovery-actions";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function DurableAutomationRuntimePage() {
  const data = await getDurableAutomationRuntimeWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="mt-3 text-4xl font-black">
            Durable Workflow Runtime
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Persisted workflow executions, resumable waits,
            approvals, retries and branch checkpoints that survive
            deployments and process restarts.
          </p>
        </div>

        <Link
          href="/app/automation/canvas"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
        >
          Visual Canvas
        </Link>
      </div>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Start durable execution
        </h2>

        <form
          action={startDurableAutomationExecutionAction}
          className="mt-4 grid gap-4 lg:grid-cols-3"
        >
          <select
            name="ruleId"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select active rule</option>
            {data.rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </select>

          <textarea
            name="payload"
            defaultValue={'{"amount":125000,"riskLevel":"HIGH"}'}
            className="min-h-24 rounded-xl border border-slate-200 p-3 font-mono text-xs"
          />

          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
            Start execution
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-5">
        {data.executions.map((execution) => {
          const waiting = execution.nodes.filter(
            (node) => node.status === "WAITING",
          );

          return (
            <article key={execution.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-blue-700">
                    {execution.status}
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {execution.rule.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {execution.executionNumber}
                  </p>
                </div>

                <div className="text-right text-xs text-slate-500">
                  <p>{execution.nodes.length} checkpoint(s)</p>
                  <p className="mt-1">
                    Wake:{" "}
                    {execution.wakeAt?.toLocaleString() ?? "—"}
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Node</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Attempts</th>
                      <th className="px-3 py-3">Wait reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {execution.nodes.map((node) => (
                      <tr key={node.id}>
                        <td className="px-3 py-3 font-black">
                          {node.nodeId}
                        </td>
                        <td className="px-3 py-3">
                          {node.nodeType}
                        </td>
                        <td className="px-3 py-3">
                          {node.status}
                        </td>
                        <td className="px-3 py-3">
                          {node.attemptCount}
                        </td>
                        <td className="px-3 py-3">
                          {node.waitReason ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {execution.actions.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Durable actions
                  </p>

                  <div className="mt-3 space-y-2">
                    {execution.actions.map((action) => (
                      <div
                        key={action.id}
                        className="rounded-xl bg-slate-50 p-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black">
                            {action.actionType}
                          </p>

                          <span>
                            {action.status}
                          </span>
                        </div>

                        <p className="mt-1 text-slate-500">
                          Dispatches:{" "}
                          {action.dispatchCount}
                          {" · "}
                          callbacks:{" "}
                          {action.callbacks.length}
                        </p>

                        <p className="mt-1 break-all font-mono text-[10px] text-slate-400">
                          {action.idempotencyKey}
                        </p>

                        {action.externalReference ? (
                          <p className="mt-1 text-slate-500">
                            External reference:{" "}
                            {action.externalReference}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {execution.status === "FAILED" ? (
                <div className="mt-5 rounded-2xl bg-red-50 p-4">
                  <p className="font-black text-red-800">
                    Execution recovery
                  </p>
                  <p className="mt-1 text-xs text-red-700">
                    Requeue the most recent failed checkpoint and
                    resume this execution.
                  </p>
                  <form
                    action={recoverDurableAutomationExecutionAction}
                    className="mt-3"
                  >
                    <input
                      type="hidden"
                      name="executionId"
                      value={execution.id}
                    />
                    <button className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white">
                      Recover execution
                    </button>
                  </form>
                </div>
              ) : null}

              {waiting.map((node) =>
                node.waitReason === "APPROVAL" ? (
                  <div
                    key={node.id}
                    className="mt-5 rounded-2xl bg-amber-50 p-4"
                  >
                    <p className="font-black">
                      Approval required
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {node.nodeId}
                    </p>

                    <div className="mt-3 flex gap-2">
                      {["APPROVED", "REJECTED"].map(
                        (decision) => (
                          <form
                            key={decision}
                            action={
                              signalDurableAutomationExecutionAction
                            }
                          >
                            <input
                              type="hidden"
                              name="executionId"
                              value={execution.id}
                            />
                            <input
                              type="hidden"
                              name="nodeId"
                              value={node.nodeId}
                            />
                            <input
                              type="hidden"
                              name="signalType"
                              value="APPROVAL"
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value={decision}
                            />
                            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black">
                              {decision}
                            </button>
                          </form>
                        ),
                      )}
                    </div>
                  </div>
                ) : null,
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
