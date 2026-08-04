import {
  Bell,
  CircleCheck,
  CircleX,
  Clock3,
  Mail,
  Monitor,
} from "lucide-react";
import { getWorkflowNotificationOperations } from "@/modules/workflows/notification-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function WorkflowNotificationOperationsPage() {
  const data = await getWorkflowNotificationOperations();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Workflow communications
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Notification Operations
      </h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Clock3} label="Pending" value={data.metrics.pending} />
        <Metric
          icon={CircleCheck}
          label="Delivered"
          value={data.metrics.delivered}
        />
        <Metric icon={CircleX} label="Failed" value={data.metrics.failed} />
        <Metric icon={Mail} label="Email" value={data.metrics.email} />
        <Metric icon={Monitor} label="In app" value={data.metrics.inApp} />
      </div>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Recipient</th>
              <th className="p-3">Type</th>
              <th className="p-3">Channel</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Status</th>
              <th className="p-3">Attempts</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.notifications.map((notification) => (
              <tr
                key={notification.id}
                className="border-t border-slate-100"
              >
                <td className="p-3">
                  {notification.recipientEmail ??
                    notification.recipientUserId}
                </td>
                <td className="p-3">
                  {notification.type.replaceAll("_", " ")}
                </td>
                <td className="p-3">{notification.channel}</td>
                <td className="max-w-sm truncate p-3 font-semibold">
                  {notification.subject}
                </td>
                <td className="p-3">{notification.status}</td>
                <td className="p-3">{notification.attemptCount}</td>
                <td className="p-3">
                  {notification.createdAt.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell;
  label: string;
  value: number;
}) {
  return (
    <article className={card}>
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
