import {
  askSourcingQuestionAction,
  uploadSupplierResponseAttachmentAction,
} from "@/modules/sourcing/portal-actions";
import { getSupplierPortalEvent } from "@/modules/sourcing/portal-queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function SupplierSourcingPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { invitation, questions, response, attachments } =
    await getSupplierPortalEvent(token);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enorsis supplier portal
      </p>
      <h1 className="mt-3 text-4xl font-black">
        {invitation.event.title}
      </h1>
      <p className="mt-3 text-slate-600">
        {invitation.supplier.tradingName ??
          invitation.supplier.legalName}
      </p>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Scope of work</h2>
        <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">
          {invitation.event.scopeOfWork}
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Clarifications</h2>

        <form action={askSourcingQuestionAction} className="mt-4">
          <input type="hidden" name="token" value={token} />
          <textarea
            className={`${input} min-h-24`}
            name="question"
            placeholder="Ask the procurement team a question"
            required
          />
          <button className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
            Submit question
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {questions.map((question) => (
            <article key={question.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold">{question.question}</p>
              <p className="mt-2 text-sm text-slate-500">
                {question.answer ?? "Awaiting response"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Response attachments</h2>
        <form
          action={uploadSupplierResponseAttachmentAction}
          className="mt-4 flex flex-wrap gap-3"
        >
          <input type="hidden" name="token" value={token} />
          <input
            className={input}
            name="file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
            required
          />
          <button className="self-end rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
            Upload attachment
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="rounded-xl bg-slate-50 p-3 text-sm"
            >
              {attachment.name}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-xl font-black text-emerald-950">
          Submission status
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          {response?.status ?? invitation.status}
        </p>
      </section>
    </main>
  );
}
