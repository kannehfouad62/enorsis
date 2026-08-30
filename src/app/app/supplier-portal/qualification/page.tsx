import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

import {
  saveSupplierQuestionnaireAction,
  updateSupplierQualificationTaskAction,
} from "@/modules/supplier-qualification-self-service/actions";
import { getSupplierPortalWorkspace } from "@/modules/supplier-portal/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

type Question = {
  key: string;
  label: string;
  required: boolean;
  type: string;
};

export default async function SupplierQualificationResponsePage() {
  const data = await getSupplierPortalWorkspace();

  const questionnaires = data.questionnaires.filter((item) =>
    ["SENT", "IN_PROGRESS", "SUBMITTED"].includes(item.status),
  );

  const tasks = data.tasks.filter((item) =>
    ["OPEN", "IN_PROGRESS", "BLOCKED", "COMPLETED"].includes(item.status),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Supplier qualification response
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Buyer Qualification Requests
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Complete buyer-issued questionnaires and qualification tasks for{" "}
            {data.supplier.tradingName ?? data.supplier.legalName}. Buyer review
            and approval remain independently controlled.
          </p>
        </div>

        <Link
          href="/app/supplier-portal"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Qualifications overview
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric
          label="Active questionnaires"
          value={questionnaires.filter((item) => item.status !== "SUBMITTED").length}
        />
        <Metric
          label="Submitted questionnaires"
          value={questionnaires.filter((item) => item.status === "SUBMITTED").length}
        />
        <Metric
          label="Open qualification tasks"
          value={tasks.filter((item) => item.status !== "COMPLETED").length}
        />
      </section>

      <section className="mt-8">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-blue-700" />
          <div>
            <h2 className="text-2xl font-black">Questionnaires</h2>
            <p className="mt-1 text-sm text-slate-500">
              Save work in progress or submit completed responses to the buyer.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-6">
          {questionnaires.length > 0 ? (
            questionnaires.map((questionnaire) => {
              const questions = normalizeQuestions(questionnaire.questions);
              const answers = normalizeAnswers(questionnaire.answers);
              const locked = questionnaire.status === "SUBMITTED";

              return (
                <article key={questionnaire.id} className={card}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">
                        {questionnaire.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {questionnaire.description ?? "No description provided."}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Due{" "}
                        {questionnaire.dueAt?.toLocaleDateString() ??
                          "not specified"}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge value={questionnaire.status} />
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {questionnaire.completionPercent}% complete
                      </p>
                    </div>
                  </div>

                  {locked ? (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-black">Submitted to buyer</p>
                        <p className="mt-1 text-sm">
                          This response is locked while buyer review is pending.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <form
                    action={saveSupplierQuestionnaireAction}
                    className="mt-5 space-y-4"
                  >
                    <input
                      type="hidden"
                      name="questionnaireId"
                      value={questionnaire.id}
                    />

                    {questions.map((question) => (
                      <label
                        key={question.key}
                        className="block rounded-2xl bg-slate-50 p-4"
                      >
                        <span className="text-sm font-black text-slate-800">
                          {question.label}
                          {question.required ? " *" : ""}
                        </span>
                        <textarea
                          className={`${input} min-h-24`}
                          name={`answer:${question.key}`}
                          defaultValue={answers[question.key] ?? ""}
                          required={question.required}
                          disabled={locked}
                        />
                      </label>
                    ))}

                    {!locked ? (
                      <div className="flex flex-wrap gap-3">
                        <button
                          name="intent"
                          value="save"
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800"
                        >
                          Save progress
                        </button>
                        <button
                          name="intent"
                          value="submit"
                          className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white"
                        >
                          Submit questionnaire
                        </button>
                      </div>
                    ) : null}
                  </form>
                </article>
              );
            })
          ) : (
            <EmptyState text="No active buyer questionnaires." />
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-blue-700" />
          <div>
            <h2 className="text-2xl font-black">Qualification Tasks</h2>
            <p className="mt-1 text-sm text-slate-500">
              Track assigned requirements, blockers and completion evidence.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const locked = task.status === "COMPLETED";

              return (
                <article key={task.id} className={card}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black">{task.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {task.description ?? "No description provided."}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Due {task.dueAt?.toLocaleDateString() ?? "not specified"}
                      </p>
                    </div>
                    <StatusBadge value={task.status} />
                  </div>

                  {task.blocker ? (
                    <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                      <span className="font-black">Current blocker: </span>
                      {task.blocker}
                    </div>
                  ) : null}

                  {task.completionEvidence ? (
                    <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                      <span className="font-black">Completion evidence: </span>
                      {task.completionEvidence}
                    </div>
                  ) : null}

                  {!locked ? (
                    <form
                      action={updateSupplierQualificationTaskAction}
                      className="mt-5 grid gap-3"
                    >
                      <input type="hidden" name="taskId" value={task.id} />
                      <textarea
                        className={`${input} min-h-20`}
                        name="blocker"
                        defaultValue={task.blocker ?? ""}
                        placeholder="Describe a blocker, if any"
                      />
                      <textarea
                        className={`${input} min-h-20`}
                        name="completionEvidence"
                        defaultValue={task.completionEvidence ?? ""}
                        placeholder="Completion evidence or document reference"
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          name="intent"
                          value="start"
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black"
                        >
                          Mark in progress
                        </button>
                        <button
                          name="intent"
                          value="blocked"
                          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white"
                        >
                          Mark blocked
                        </button>
                        <button
                          name="intent"
                          value="complete"
                          className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white"
                        >
                          Complete task
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-4 text-sm font-semibold text-emerald-700">
                      Completed{" "}
                      {task.completedAt?.toLocaleString() ?? "successfully"}.
                    </p>
                  )}
                </article>
              );
            })
          ) : (
            <div className="xl:col-span-2">
              <EmptyState text="No qualification tasks have been assigned." />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function normalizeQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];

    const question = item as Record<string, unknown>;
    if (
      typeof question.key !== "string" ||
      typeof question.label !== "string"
    ) {
      return [];
    }

    return [
      {
        key: question.key,
        label: question.label,
        required: question.required === true,
        type: typeof question.type === "string" ? question.type : "text",
      },
    ];
  });
}

function normalizeAnswers(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, answer]) => [
      key,
      typeof answer === "string" ? answer : "",
    ]),
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className={card}>
      <p className="text-xs font-black uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value.toLocaleString()}</p>
    </article>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-700">
      {formatStatus(value)}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
