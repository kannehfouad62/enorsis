import { recordTestActivityAction } from "@/modules/activity-timeline/actions";
import { getActivityAdministration } from "@/modules/activity-timeline/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ActivityAdministrationPage() {
  const activities = await getActivityAdministration();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise Foundation 1.0
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Universal Activity Timeline
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Review governed business activity across procurement, suppliers,
        integrations, workflows, notifications, and platform services.
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Record test activity</h2>
        <form
          action={recordTestActivityAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="activityType" label="Activity type" value="Platform.Tested" required />
          <Field name="sourceModule" label="Source module" value="activity-console" />
          <Field name="title" label="Title" value="Activity stream test" required />
          <Field name="description" label="Description" />
          <label>
            <span className="text-sm font-bold">Severity</span>
            <select className={input} name="severity">
              <option>INFO</option>
              <option>SUCCESS</option>
              <option>WARNING</option>
              <option>ERROR</option>
              <option>CRITICAL</option>
            </select>
          </label>
          <label>
            <span className="text-sm font-bold">Visibility</span>
            <select className={input} name="visibility">
              <option>TENANT</option>
              <option>RESTRICTED</option>
              <option>PRIVATE</option>
              <option>PLATFORM</option>
            </select>
          </label>
          <Field name="subjectType" label="Subject type" />
          <Field name="subjectId" label="Subject ID" />
          <Field name="subjectLabel" label="Subject label" />
          <Field name="actionUrl" label="Action URL" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Record activity
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Recent activity</h2>
        <div className="mt-5 space-y-4">
          {activities.map((activity) => (
            <article
              key={activity.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    {activity.severity} · {activity.activityType}
                  </p>
                  <h3 className="mt-2 text-lg font-black">{activity.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {activity.description ?? "No description provided."}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {activity.occurredAt.toLocaleString()}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-3 py-1 font-bold">
                  {activity.sourceModule}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-bold">
                  {activity.visibility}
                </span>
                {activity.subjectLabel ? (
                  <span className="rounded-full bg-white px-3 py-1 font-bold">
                    {activity.subjectLabel}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  value,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-bold">{label}</span>
      <input
        className={input}
        name={name}
        type={type}
        defaultValue={value}
        required={required}
      />
    </label>
  );
}
