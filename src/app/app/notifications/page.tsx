import { markNotificationReadAction } from "@/modules/notification-center/actions";
import { getMyNotifications } from "@/modules/notification-center/queries";

export default async function MyNotificationsPage() {
  const notifications = await getMyNotifications();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enorsis inbox
      </p>
      <h1 className="mt-3 text-4xl font-black">Notifications</h1>

      <div className="mt-8 space-y-4">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`rounded-3xl border p-6 shadow-sm ${
              notification.readAt
                ? "border-slate-200 bg-white"
                : "border-blue-200 bg-blue-50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  {notification.priority} · {notification.eventType}
                </p>
                <h2 className="mt-2 text-xl font-black">
                  {notification.title}
                </h2>
                <p className="mt-3 leading-7 text-slate-600">
                  {notification.message}
                </p>
              </div>

              {!notification.readAt ? (
                <form action={markNotificationReadAction}>
                  <input
                    type="hidden"
                    name="notificationId"
                    value={notification.id}
                  />
                  <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                    Mark read
                  </button>
                </form>
              ) : null}
            </div>

            {notification.actionUrl ? (
              <a
                className="mt-5 inline-block font-black text-blue-700"
                href={notification.actionUrl}
              >
                Open related workspace →
              </a>
            ) : null}
          </article>
        ))}

        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            No notifications are available.
          </div>
        ) : null}
      </div>
    </div>
  );
}
