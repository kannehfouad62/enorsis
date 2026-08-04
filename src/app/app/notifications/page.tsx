import Link from "next/link";
import { getMyWorkflowNotifications } from "@/modules/workflows/notification-queries";

export default async function NotificationsPage() {
  const { notifications } = await getMyWorkflowNotifications();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        My notifications
      </p>
      <h1 className="mt-3 text-4xl font-black">Workflow Alerts</h1>

      <div className="mt-8 space-y-4">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-blue-700">
                  {notification.type.replaceAll("_", " ")}
                </p>
                <h2 className="mt-2 text-xl font-black">
                  {notification.subject}
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                {notification.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {notification.message}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              {notification.createdAt.toLocaleString()}
            </p>
            {notification.actionUrl ? (
              <Link
                href={notification.actionUrl}
                className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
              >
                Open task
              </Link>
            ) : null}
          </article>
        ))}

        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            No workflow notifications have been created for you.
          </div>
        ) : null}
      </div>
    </div>
  );
}
