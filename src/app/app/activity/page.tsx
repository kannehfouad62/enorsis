import { getMyActivityTimeline } from "@/modules/activity-timeline/queries";

export default async function ActivityTimelinePage() {
  const activities = await getMyActivityTimeline();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enorsis activity stream
      </p>
      <h1 className="mt-3 text-4xl font-black">Activity Timeline</h1>

      <div className="relative mt-10 space-y-6 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-slate-200">
        {activities.map((activity) => (
          <article key={activity.id} className="relative pl-12">
            <div className="absolute left-1.5 top-2 h-5 w-5 rounded-full border-4 border-white bg-blue-700 shadow" />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                {activity.activityType} · {activity.severity}
              </p>
              <h2 className="mt-2 text-xl font-black">{activity.title}</h2>
              <p className="mt-3 leading-7 text-slate-600">
                {activity.description ?? "No description provided."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{activity.sourceModule}</span>
                <span>{activity.occurredAt.toLocaleString()}</span>
                {activity.actorName ? <span>{activity.actorName}</span> : null}
              </div>
              {activity.actionUrl ? (
                <a
                  href={activity.actionUrl}
                  className="mt-5 inline-block font-black text-blue-700"
                >
                  Open related workspace →
                </a>
              ) : null}
            </div>
          </article>
        ))}

        {activities.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            No activity has been recorded yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
