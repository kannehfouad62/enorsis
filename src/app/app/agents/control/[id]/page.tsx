import Link from "next/link";
import {
  assignAgentTaskApproversAction,
  decideAgentTaskApprovalAction,
  runAgentTaskAction,
} from "@/modules/agents/actions";
import { getAgentTaskDetail } from "@/modules/agents/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AgentTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, task, members } = await getAgentTaskDetail(id);

  const pending = task.approvals.find(
    (approval) => approval.decision === "PENDING",
  );
  const canDecide =
    pending &&
    (pending.approverUserId === session.user.id ||
      session.user.roles.some((role) =>
        ["TENANT_ADMIN", "TENANT_OWNER"].includes(role),
      ));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/app/agents/control" className="font-black text-blue-700">
        ← Agent control
      </Link>
      <h1 className="mt-5 text-4xl font-black">{task.title}</h1>
      <p className="mt-2 text-slate-600">
        {task.agent.name} · {task.type.replaceAll("_", " ")} · {task.status}
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Policy boundary</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
          {task.instruction}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <Summary label="Autonomy" value={task.agent.autonomyLevel} />
          <Summary label="Approval required" value={task.requiresApproval ? "Yes" : "No"} />
          <Summary label="Priority" value={String(task.priority)} />
          <Summary label="Attempts" value={String(task.executionCount)} />
        </div>
      </section>

      {task.requiresApproval && task.approvals.length === 0 ? (
        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-black">Assign approvers</h2>
          <form action={assignAgentTaskApproversAction} className="mt-4">
            <input type="hidden" name="taskId" value={task.id} />
            <select className={input} name="approverUserIds" multiple required>
              {members.map((membership) => (
                <option key={membership.id} value={membership.userId}>
                  {membership.user.name ?? membership.user.email}
                </option>
              ))}
            </select>
            <button className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 font-black text-white">
              Save approval chain
            </button>
          </form>
        </section>
      ) : null}

      {task.approvals.length > 0 ? (
        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-black">Human approvals</h2>
          <div className="mt-4 space-y-3">
            {task.approvals.map((approval) => {
              const member = members.find(
                (item) => item.userId === approval.approverUserId,
              );
              return (
                <div key={approval.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">
                    Step {approval.sequence}:{" "}
                    {member?.user.name ??
                      member?.user.email ??
                      approval.approverUserId}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {approval.decision}
                  </p>
                </div>
              );
            })}
          </div>

          {canDecide ? (
            <form action={decideAgentTaskApprovalAction} className="mt-5 flex flex-wrap gap-3">
              <input type="hidden" name="taskId" value={task.id} />
              <input className="min-w-64 flex-1 rounded-xl border border-slate-200 px-4 py-3" name="comments" placeholder="Decision comments" />
              <button className="rounded-xl bg-emerald-700 px-4 py-3 font-black text-white" name="decision" value="APPROVED">
                Approve
              </button>
              <button className="rounded-xl bg-amber-600 px-4 py-3 font-black text-white" name="decision" value="RETURNED">
                Return
              </button>
              <button className="rounded-xl bg-red-700 px-4 py-3 font-black text-white" name="decision" value="REJECTED">
                Reject
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {["APPROVED", "QUEUED", "FAILED"].includes(task.status) ? (
        <section className={`${card} mt-6`}>
          <form action={runAgentTaskAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Run governed agent task
            </button>
          </form>
        </section>
      ) : null}

      {task.output ? (
        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-black">Agent output</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {task.output}
          </p>
          <p className="mt-4 font-black text-blue-700">
            Confidence: {task.confidence ?? 0}%
          </p>
        </section>
      ) : null}

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Execution attempts</h2>
        <div className="mt-4 space-y-3">
          {task.attempts.map((attempt) => (
            <article key={attempt.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-black">
                Attempt {attempt.attemptNumber} · {attempt.status}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {attempt.model ?? "Model not recorded"} ·{" "}
                {attempt.startedAt.toLocaleString()}
              </p>
              {attempt.errorMessage ? (
                <p className="mt-2 text-sm text-red-700">
                  {attempt.errorMessage}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-black">{value}</p>
    </div>
  );
}
