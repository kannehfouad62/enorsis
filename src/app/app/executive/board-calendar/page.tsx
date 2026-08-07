import {
  createExecutiveBoardReportScheduleAction,
  runExecutiveBoardReportScheduleNowAction,
} from "@/modules/executive-board-reporting/schedule-actions";
import { getExecutiveBoardCalendarWorkspace } from "@/modules/executive-board-reporting/schedule-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ExecutiveBoardCalendarPage() {
  const data = await getExecutiveBoardCalendarWorkspace();

  const active = data.schedules.filter(
    (schedule) => schedule.status === "ACTIVE",
  ).length;
  const failedRuns = data.runs.filter(
    (run) => run.status === "FAILED",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          Phase B2.8.6.3
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Board Calendar & Reporting Schedule
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Monthly, quarterly and annual board-reporting schedules with
          automatic governed board-pack generation.
        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active schedules", active],
          ["Schedule definitions", data.schedules.length],
          ["Recent runs", data.runs.length],
          ["Failed runs", failedRuns],
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
        <h2 className="text-xl font-black">Configure reporting schedule</h2>
        <form
          action={createExecutiveBoardReportScheduleAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="name"
            placeholder="Schedule name"
            required
          />

          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="definitionId"
            required
          >
            <option value="">Select board pack</option>
            {data.definitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="frequency"
            defaultValue="MONTHLY"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
          </select>

          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="dayOfMonth"
            type="number"
            min="1"
            max="28"
            defaultValue="1"
          />

          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="monthOfYear"
            type="number"
            min="1"
            max="12"
            placeholder="Annual month (1-12)"
          />

          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="hourUtc"
            type="number"
            min="0"
            max="23"
            defaultValue="8"
          />

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <input name="generateFinalized" type="checkbox" />
            Auto-finalize generated pack
          </label>

          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
            Save schedule
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-5">
        {data.schedules.map((schedule) => (
          <article key={schedule.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {schedule.status} · {schedule.frequency}
                </p>
                <h2 className="mt-2 text-xl font-black">{schedule.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {schedule.definition.name}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p>
                  Next run:{" "}
                  <span className="font-black">
                    {schedule.nextRunAt.toLocaleString()}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Last run: {schedule.lastRunAt?.toLocaleString() ?? "Never"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Day</p>
                <p className="mt-1 font-black">{schedule.dayOfMonth}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Hour UTC</p>
                <p className="mt-1 font-black">{schedule.hourUtc}:00</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Auto-finalize</p>
                <p className="mt-1 font-black">
                  {schedule.generateFinalized ? "Yes" : "No"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Last board pack</p>
                <p className="mt-1 break-all font-black">
                  {schedule.lastBoardPackId ?? "—"}
                </p>
              </div>
            </div>

            <form
              action={runExecutiveBoardReportScheduleNowAction}
              className="mt-5"
            >
              <input
                type="hidden"
                name="scheduleId"
                value={schedule.id}
              />
              <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                Generate scheduled pack now
              </button>
            </form>
          </article>
        ))}
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Schedule run history</h2>
        <div className="mt-5 space-y-3">
          {data.runs.map((run) => (
            <article key={run.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-black">
                    {run.schedule.definition.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Scheduled {run.scheduledFor.toLocaleString()}
                  </p>
                </div>
                <span className="text-xs font-black">{run.status}</span>
              </div>
              {run.boardPackId ? (
                <p className="mt-2 text-xs text-slate-500">
                  Board pack {run.boardPackId}
                </p>
              ) : null}
              {run.errorMessage ? (
                <p className="mt-2 text-xs text-red-700">
                  {run.errorMessage}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
