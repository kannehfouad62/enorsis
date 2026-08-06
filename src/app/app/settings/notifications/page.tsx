import {
  createNotificationTemplateAction,
  sendTestNotificationAction,
} from "@/modules/notification-center/actions";
import { getNotificationAdministration } from "@/modules/notification-center/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function NotificationAdministrationPage() {
  const data = await getNotificationAdministration();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise Foundation 1.0
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Unified Notification Center
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Govern templates, delivery channels, test messages, retries,
        failures, and notification history from one platform service.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Create template</h2>
          <form
            action={createNotificationTemplateAction}
            className="mt-5 grid gap-4"
          >
            <Field name="key" label="Template key" required />
            <Field name="name" label="Name" required />
            <Field name="eventType" label="Event type" />
            <label>
              <span className="text-sm font-bold">Channel</span>
              <select className={input} name="channel">
                <option>IN_APP</option>
                <option>EMAIL</option>
                <option>MOBILE_PUSH</option>
                <option>SMS</option>
                <option>MICROSOFT_TEAMS</option>
                <option>SLACK</option>
                <option>WEBHOOK</option>
              </select>
            </label>
            <Field name="subjectTemplate" label="Subject template" />
            <Field name="bodyTemplate" label="Body template" required />
            <Field name="actionUrlTemplate" label="Action URL template" />
            <Field name="locale" label="Locale" value="en-US" />
            <Field name="description" label="Description" />
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Create template
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Send test notification</h2>
          <form
            action={sendTestNotificationAction}
            className="mt-5 grid gap-4"
          >
            <Field name="recipientUserId" label="Recipient user ID" />
            <Field
              name="recipientAddress"
              label="Recipient email"
              type="email"
            />
            <Field
              name="title"
              label="Title"
              value="Enorsis notification test"
              required
            />
            <Field
              name="message"
              label="Message"
              value="The unified notification center is operational."
              required
            />
            <Field name="actionUrl" label="Action URL" />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Queue notification
            </button>
          </form>

          <div className="mt-8">
            <h3 className="font-black">Templates</h3>
            <div className="mt-3 space-y-3">
              {data.templates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <p className="font-black">{template.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {template.key} · {template.channel} · v
                    {template.version}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">
          Recent notifications
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Notification</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deliveries</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.notifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-4 py-3">
                    <p className="font-black">{notification.title}</p>
                    <p className="text-xs text-slate-500">
                      {notification.eventType}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {notification.recipientAddress ??
                      notification.recipientUserId ??
                      "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    {notification.status}
                  </td>
                  <td className="px-4 py-3">
                    {notification.deliveries.length}
                  </td>
                  <td className="px-4 py-3">
                    {notification.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
