import {
  createEventSubscriptionAction,
  publishTestEventAction,
} from "@/modules/platform-events/actions";
import { getPlatformEventsWorkspace } from "@/modules/platform-events/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PlatformEventsPage() {
  const data = await getPlatformEventsWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise Foundation 1.0
      </p>
      <h1 className="mt-3 text-4xl font-black">Enterprise Event Bus</h1>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Create subscription</h2>
          <form action={createEventSubscriptionAction} className="mt-5 grid gap-4">
            <Field name="key" label="Subscription key" required />
            <Field name="name" label="Name" required />
            <Field name="eventTypePattern" label="Event type pattern" value="*" required />
            <label>
              <span className="text-sm font-bold">Delivery type</span>
              <select className={input} name="deliveryType">
                <option>INTERNAL_HANDLER</option>
                <option>BACKGROUND_JOB</option>
                <option>WEBHOOK</option>
              </select>
            </label>
            <Field name="handlerKey" label="Internal handler key" />
            <Field name="backgroundJobKey" label="Background job key" />
            <Field name="webhookUrl" label="Webhook URL" type="url" />
            <Field name="maxAttempts" label="Maximum attempts" value="3" type="number" />
            <Field name="retryDelaySeconds" label="Retry delay seconds" value="300" type="number" />
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Create subscription
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Publish test event</h2>
          <form action={publishTestEventAction} className="mt-5 grid gap-4">
            <Field name="eventType" label="Event type" value="Platform.Tested" required />
            <Field name="aggregateType" label="Aggregate type" value="Platform" />
            <Field name="aggregateId" label="Aggregate ID" />
            <Field name="message" label="Message" value="Event bus test" />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Publish event
            </button>
          </form>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Recent events</h2>
        <div className="mt-5 space-y-3">
          {data.events.map((event) => (
            <article key={event.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black">{event.eventType}</p>
                  <p className="text-xs text-slate-500">{event.eventId}</p>
                </div>
                <span className="text-sm font-bold">{event.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {event.sourceModule} · {event.deliveries.length} deliveries
              </p>
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
