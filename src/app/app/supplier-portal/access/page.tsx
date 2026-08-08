import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { issueSupplierSelfServiceAccessAction } from "@/modules/supplier-self-service/actions";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function SupplierAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ portalUrl?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allowed = new Set([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "BUYER",
    "SUPPLIER_MANAGER",
    "PLATFORM_SUPER_ADMIN",
  ]);

  if (!session.user.roles.some((role) => allowed.has(role))) {
    redirect("/app/unauthorized");
  }

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true,
      supplierNumber: true,
      legalName: true,
      tradingName: true,
    },
    orderBy: { legalName: "asc" },
    take: 500,
  });

  const { portalUrl } = await searchParams;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B6.2 · Supplier Self-Service
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Supplier Access Administration
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Issue secure, time-limited supplier self-service links
            scoped to one tenant, supplier and invited email.
          </p>
        </div>
        <Link
          href="/app/supplier-portal/collaboration"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Collaboration Operations
        </Link>
      </div>

      {portalUrl ? (
        <section className={`${card} mt-8 border-emerald-200 bg-emerald-50`}>
          <h2 className="text-xl font-black text-emerald-950">
            Supplier access link created
          </h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            Copy this link and deliver it to the intended supplier
            contact through an approved secure channel. The token is
            not stored in plaintext.
          </p>
          <input
            readOnly
            value={portalUrl}
            className="mt-4 w-full rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm"
          />
        </section>
      ) : null}

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Issue supplier self-service access
        </h2>
        <form
          action={issueSupplierSelfServiceAccessAction}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <label className="md:col-span-2">
            <span className="text-sm font-black">Supplier</span>
            <select className={input} name="supplierId" required>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName} ·{" "}
                  {supplier.supplierNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-black">Contact name</span>
            <input className={input} name="contactName" required />
          </label>
          <label>
            <span className="text-sm font-black">Email</span>
            <input className={input} name="email" type="email" required />
          </label>
          <label>
            <span className="text-sm font-black">Job title</span>
            <input className={input} name="jobTitle" />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
              Generate 7-day access link
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
