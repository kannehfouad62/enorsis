import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  ClipboardList,
  FileCheck2,
  MessagesSquare,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { getSupplierPortalWorkspace } from "@/modules/supplier-portal/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SupplierPortalPage() {
  const data = await getSupplierPortalWorkspace();
  const supplier = data.supplier;

  const qualificationRequests = data.questionnaires
    .filter((questionnaire) =>
      ["SENT", "IN_PROGRESS", "SUBMITTED"].includes(questionnaire.status),
    )
    .slice(0, 6);

  const qualificationTasks = data.tasks
    .filter((task) =>
      ["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status),
    )
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Supplier identity & readiness
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Company Profile & Qualifications
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Maintain your reusable company identity, capabilities,
            qualification evidence and buyer-request readiness across Enorsis.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/marketplace/seller-profile"
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
          >
            Manage company profile
          </Link>
          <Link
            href="/app/settings/access"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Team & Access
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Profile completion"
          value={`${data.metrics.profileCompletion}%`}
        />
        <Metric
          label="Qualification status"
          value={formatStatus(data.metrics.qualificationStatus)}
        />
        <Metric
          label="Documents needing attention"
          value={data.metrics.documentsRequiringAttention}
        />
        <Metric
          label="Buyer requests"
          value={data.metrics.buyerRequests}
        />
        <Metric
          label="Open qualification tasks"
          value={data.metrics.openQualificationTasks}
        />
        <Metric
          label="Unread buyer messages"
          value={data.metrics.unreadBuyerMessages}
        />
      </div>

      <section className={`${card} mt-6`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.15em] text-slate-500">
              Company readiness
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {supplier.tradingName ?? supplier.legalName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Supplier identity {supplier.supplierNumber}
            </p>
          </div>
          <span className="text-3xl font-black text-blue-700">
            {data.metrics.profileCompletion}%
          </span>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-700"
            style={{ width: `${data.metrics.profileCompletion}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Complete the reusable company profile and qualification evidence once,
          then use it as the foundation for buyer-specific onboarding and
          qualification requests.
        </p>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className={card}>
          <Building2 className="h-6 w-6 text-blue-700" />
          <h2 className="mt-4 text-xl font-black">Company Profile</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Govern the legal and marketplace-facing identity buyers use to
            understand your organization.
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <ProfileRow label="Legal name" value={supplier.legalName} />
            <ProfileRow
              label="Trading name"
              value={supplier.tradingName ?? "Not provided"}
            />
            <ProfileRow label="Country" value={supplier.countryCode} />
            <ProfileRow
              label="Tax identification"
              value={supplier.taxIdentificationNo ?? "Not provided"}
            />
            <ProfileRow
              label="Website"
              value={supplier.website ?? "Not provided"}
            />
            <ProfileRow
              label="Business email"
              value={supplier.primaryEmail ?? "Not provided"}
            />
          </dl>
          <Link
            href="/app/marketplace/seller-profile"
            className="mt-6 inline-flex text-sm font-black text-blue-700"
          >
            Update company profile →
          </Link>
        </section>

        <section className={card}>
          <BadgeCheck className="h-6 w-6 text-blue-700" />
          <h2 className="mt-4 text-xl font-black">
            Products, Services & Capabilities
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Maintain the categories and capabilities that support supplier
            discovery, sourcing and buyer evaluation.
          </p>
          <div className="mt-5 space-y-5">
            <CapabilityGroup
              label="Products"
              items={supplier.products}
              emptyText="No products have been added yet."
            />
            <CapabilityGroup
              label="Services"
              items={supplier.services}
              emptyText="No services have been added yet."
            />
            <CapabilityGroup
              label="Capabilities"
              items={supplier.capabilities}
              emptyText="No capabilities have been added yet."
            />
          </div>
          <Link
            href="/app/marketplace/seller-profile#capabilities"
            className="mt-6 inline-flex text-sm font-black text-blue-700"
          >
            Manage capabilities →
          </Link>
        </section>

        <section className={card}>
          <FileCheck2 className="h-6 w-6 text-blue-700" />
          <h2 className="mt-4 text-xl font-black">
            Certifications & Compliance
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Track reusable qualification evidence and identify documents that
            need verification or renewal.
          </p>
          <div className="mt-5 space-y-3">
            {supplier.documents.length > 0 ? (
              supplier.documents.slice(0, 6).map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-bold">
                    {formatStatus(document.type)}
                  </span>
                  <StatusBadge value={document.status} />
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800">
                No qualification documents are currently attached to your
                supplier profile.
              </div>
            )}
          </div>
          <Link
            href="/app/supplier-portal/documents"
            className="mt-6 inline-flex text-sm font-black text-blue-700"
          >
            Manage qualification documents →
          </Link>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-blue-700" />
            <div>
              <h2 className="text-xl font-black">
                Buyer Qualification Requests
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Questionnaires and buyer-specific qualification activity for
                your company.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {qualificationRequests.length > 0 ? (
              qualificationRequests.map((questionnaire) => (
                <div
                  key={questionnaire.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"
                >
                  <div>
                    <p className="font-black">{questionnaire.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {questionnaire.dueAt
                        ? `Due ${questionnaire.dueAt.toLocaleDateString()}`
                        : "No due date"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={questionnaire.status} />
                    <Link
                      href="/app/supplier-portal/qualification"
                      className="text-xs font-black text-blue-700"
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No active buyer qualification questionnaires." />
            )}
          </div>
        </section>

        <section className={card}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-700" />
            <div>
              <h2 className="text-xl font-black">Qualification Tasks</h2>
              <p className="mt-1 text-sm text-slate-500">
                Requirements assigned to your organization for completion.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {qualificationTasks.length > 0 ? (
              qualificationTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"
                >
                  <div>
                    <p className="font-black">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.dueAt
                        ? `Due ${task.dueAt.toLocaleDateString()}`
                        : "No due date"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={task.status} />
                    <Link
                      href="/app/supplier-portal/qualification"
                      className="text-xs font-black text-blue-700"
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No open qualification tasks." />
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className={card}>
          <UsersRound className="h-6 w-6 text-blue-700" />
          <h2 className="mt-4 text-xl font-black">Team & Access</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {data.metrics.activeTeamUsers.toLocaleString()} active team member
            {data.metrics.activeTeamUsers === 1 ? "" : "s"} currently belong to
            this tenant. Invite and govern your own employees here instead of
            selecting your company as an external supplier.
          </p>
          <Link
            href="/app/settings/access"
            className="mt-6 inline-flex text-sm font-black text-blue-700"
          >
            Manage team access →
          </Link>
        </section>

        <section className={card}>
          <MessagesSquare className="h-6 w-6 text-blue-700" />
          <h2 className="mt-4 text-xl font-black">Buyer Collaboration</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            You have {data.metrics.unreadBuyerMessages.toLocaleString()} unread
            buyer message
            {data.metrics.unreadBuyerMessages === 1 ? "" : "s"}. Supplier-side
            collaboration is presented as received buyer activity rather than
            buyer administration of your own company.
          </p>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-black">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </article>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[60%] text-right font-bold text-slate-900">
        {value}
      </dd>
    </div>
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
    <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function CapabilityGroup({
  label,
  items,
  emptyText,
}: {
  label: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">
        {label}
      </p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.slice(0, 8).map((item) => (
            <span
              key={`${label}:${item}`}
              className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm font-semibold text-amber-700">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
