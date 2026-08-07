import {
  activateEnterpriseAutomationRuleAction,
  addEnterpriseAutomationActionAction,
  createEnterpriseAutomationRuleAction,
  runEnterpriseAutomationRuleNowAction,
} from "@/modules/enterprise-automation/actions";
import { getEnterpriseAutomationWorkspace } from "@/modules/enterprise-automation/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function EnterpriseAutomationPage() {
  const data = await getEnterpriseAutomationWorkspace();

  const active = data.rules.filter(
    (rule) => rule.status === "ACTIVE",
  ).length;
  const failed = data.runs.filter(
    (run) => run.status === "FAILED",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          Phase B2.9.1
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Enterprise Workflow Automation
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Governed event, schedule, condition and manual automation rules
          layered over the existing Enorsis workflow engine.
        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Automation rules", data.rules.length],
          ["Active rules", active],
          ["Recent runs", data.runs.length],
          ["Failed runs", failed],
        ].map(([label, value]) => (
          <article key={String(label)} className={card}>
            <p className="text-xs font-black uppercase text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-4xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create automation rule</h2>
        <form
          action={createEnterpriseAutomationRuleAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <input name="ruleKey" required placeholder="Rule key"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="name" required placeholder="Rule name"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="description" placeholder="Description"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="priority" type="number" defaultValue="100"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />

          <select name="triggerType" defaultValue="DOMAIN_EVENT"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="DOMAIN_EVENT">Domain Event</option>
            <option value="SCHEDULE">Schedule</option>
            <option value="RECORD_CONDITION">Record Condition</option>
            <option value="MANUAL">Manual</option>
          </select>

          <input name="eventType" placeholder="Domain event type"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="scheduleExpression" placeholder="HOURLY / DAILY / HOUR_8"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <input type="checkbox" name="stopOnFailure" defaultChecked />
            Stop on action failure
          </label>

          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
            Create rule
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-5">
        {data.rules.map((rule) => (
          <article key={rule.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {rule.status} · Priority {rule.priority}
                </p>
                <h2 className="mt-2 text-xl font-black">{rule.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {rule.ruleKey} · {rule.description ?? "No description"}
                </p>
              </div>

              <div className="flex gap-2">
                {rule.status !== "ACTIVE" ? (
                  <form action={activateEnterpriseAutomationRuleAction}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                      Activate
                    </button>
                  </form>
                ) : (
                  <form action={runEnterpriseAutomationRuleNowAction}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                      Run now
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  Triggers
                </p>
                <div className="mt-3 space-y-2">
                  {rule.triggers.map((trigger) => (
                    <div key={trigger.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                      <p className="font-black">{trigger.triggerType}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {trigger.eventType ??
                          trigger.scheduleExpression ??
                          trigger.recordType ??
                          "Manual"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  Actions
                </p>
                <div className="mt-3 space-y-2">
                  {rule.actions.map((action) => (
                    <div key={action.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                      <p className="font-black">
                        {action.sequence}. {action.actionType}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {action.actionKey}
                      </p>
                    </div>
                  ))}
                </div>

                <form action={addEnterpriseAutomationActionAction}
                  className="mt-4 grid gap-2 md:grid-cols-2">
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <select name="actionType" defaultValue="PUBLISH_EVENT"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="START_WORKFLOW">Start workflow</option>
                    <option value="CREATE_NOTIFICATION">Create notification</option>
                    <option value="CREATE_TASK">Create task</option>
                    <option value="PUBLISH_EVENT">Publish event</option>
                    <option value="LOG_ACTIVITY">Log activity</option>
                  </select>
                  <input name="workflowDefinitionId" placeholder="Workflow definition ID"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input name="outboundEventType" placeholder="Outbound event type"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input name="notificationTitle" placeholder="Notification title"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input name="taskTitle" placeholder="Task title"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input name="activityTitle" placeholder="Activity title"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">
                    Add action
                  </button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Automation run history</h2>
        <div className="mt-5 space-y-3">
          {data.runs.map((run) => (
            <article key={run.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">{run.rule.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {run.runNumber} · {run.triggerType}
                  </p>
                </div>
                <span className="text-xs font-black">{run.status}</span>
              </div>
              {run.errorMessage ? (
                <p className="mt-2 text-xs text-red-700">{run.errorMessage}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
