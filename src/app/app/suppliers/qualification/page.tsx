import Link from "next/link";
import {
  ClipboardList,
  ListChecks,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  createBuyerSupplierQualificationTaskAction,
  createBuyerSupplierQuestionnaireAction,
} from "@/modules/supplier-qualification-admin/actions";
import { getBuyerSupplierQualificationWorkspace } from "@/modules/supplier-qualification-admin/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function BuyerSupplierQualificationPage() {
  const data = await getBuyerSupplierQualificationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Buyer supplier governance
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Qualification & Onboarding Administration
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Issue supplier qualification questionnaires, assign onboarding tasks
            and monitor completion across your governed supplier portfolio.
          </p>
        </div>

        <Link
          href="/app/suppliers"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800"
        >
          Supplier Intelligence
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={UsersRound}
          label="Suppliers"
          value={data.metrics.totalSuppliers}
        />
        <Metric
          icon={ClipboardList}
          label="Active questionnaires"
          value={data.metrics.activeQuestionnaires}
        />
        <Metric
          icon={ShieldCheck}
          label="Overdue questionnaires"
          value={data.metrics.overdueQuestionnaires}
        />
        <Metric
          icon={ListChecks}
          label="Open tasks"
          value={data.metrics.openTasks}
        />
        <Metric
          icon={ListChecks}
          label="Overdue tasks"
          value={data.metrics.overdueTasks}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <ClipboardList className="h-6 w-6 text-blue-700" />
          <h2 className="mt-4 text-xl font-black">
            Issue qualification questionnaire
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Send a buyer-governed questionnaire to one supplier. The supplier
            will see it as a received qualification request in its own portal.
          </p>

          <form
            action={createBuyerSupplierQuestionnaireAction}
            className="mt-5 grid gap-4"
          >
            <SupplierSelect suppliers={data.suppliers} />
            <input
              className={input}
              name="title"
              placeholder="Questionnaire title"
              required
            />
            <textarea
              className={`${input} min-h-24`}
              name="description"
              placeholder="Purpose and instructions"
            />
            <textarea
              className={`${input} min-h-44`}
              name="questions"
              placeholder={"Legal entity confirmation\nInsurance coverage\nQuality certification\nESG policy"}
              required
            />
            <p className="text-xs text-slate-500">
              Enter one question per line.
            </p>
            <label className="text-sm font-bold">
              Due date
              <input className={input} name="dueAt" type="date" />
            </label>
            <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
              Send questionnaire
            </button>
          </form>
        </div>

        <div className={card}>
          <ListChecks className="h-6 w-6 text-blue-700" />
          <h2 className="mt-4 text-xl font-black">
            Assign qualification task
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Assign a structured onboarding or qualification requirement to a
            supplier without exposing buyer administration controls in the
            supplier workspace.
          </p>

          <form
            action={createBuyerSupplierQualificationTaskAction}
            className="mt-5 grid gap-4"
          >
            <SupplierSelect suppliers={data.suppliers} />
            <input
              className={input}
              name="title"
              placeholder="Task title"
              required
            />
            <textarea
              className={`${input} min-h-32`}
              name="description"
              placeholder="Requirement and acceptance criteria"
            />
            <input
              className={input}
              name="supplierOwnerEmail"
              type="email"
              placeholder="Supplier owner email"
            />
            <label className="text-sm font-bold">
              Due date
              <input className={input} name="dueAt" type="date" />
            </label>
            <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              Assign task
            </button>
          </form>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Qualification questionnaires</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Questionnaire</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.questionnaires.length > 0 ? (
                data.questionnaires.map((questionnaire) => (
                  <tr key={questionnaire.id}>
                    <td className="px-4 py-3">
                      {questionnaire.supplier?.tradingName ??
                        questionnaire.supplier?.legalName ??
                        questionnaire.supplierId}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {questionnaire.title}
                    </td>
                    <td className="px-4 py-3">
                      {questionnaire.dueAt?.toLocaleDateString() ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatStatus(questionnaire.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                    No qualification questionnaires have been issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Qualification tasks</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Supplier owner</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.tasks.length > 0 ? (
                data.tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-3">
                      {task.supplier?.tradingName ??
                        task.supplier?.legalName ??
                        task.supplierId}
                    </td>
                    <td className="px-4 py-3 font-bold">{task.title}</td>
                    <td className="px-4 py-3">{task.supplierOwnerEmail ?? "—"}</td>
                    <td className="px-4 py-3">
                      {task.dueAt?.toLocaleDateString() ?? "—"}
                    </td>
                    <td className="px-4 py-3">{formatStatus(task.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    No qualification tasks have been assigned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SupplierSelect({
  suppliers,
}: {
  suppliers: Array<{
    id: string;
    supplierNumber: string;
    legalName: string;
    tradingName: string | null;
  }>;
}) {
  return (
    <select className={input} name="supplierId" required>
      <option value="">Select supplier</option>
      {suppliers.map((supplier) => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.tradingName ?? supplier.legalName} · {supplier.supplierNumber}
        </option>
      ))}
    </select>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
}) {
  return (
    <article className={card}>
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-4 text-xs font-black uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value.toLocaleString()}</p>
    </article>
  );
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
