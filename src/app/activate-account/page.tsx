import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { TenantOwnerActivationForm } from "@/components/auth/tenant-owner-activation-form";
import { resolveTenantOwnerActivation } from "@/core/tenant-owner-activation/service";

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const context =
    await resolveTenantOwnerActivation(token);

  if (!context) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5 py-16">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[.2em] text-red-600">
            Activation unavailable
          </p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">
            This activation link cannot be used.
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            It may be expired, already used, or the
            account may already be activated.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5 py-16">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
          <ShieldCheck className="h-6 w-6 text-blue-700" />
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-blue-700">
          Secure account activation
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Welcome to Enorsis
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          Create your password to activate your Tenant
          Owner account for{" "}
          <strong className="text-slate-950">
            {context.tenantName}
          </strong>.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
          <p>
            <span className="font-bold">Account:</span>{" "}
            {context.ownerEmail}
          </p>
          <p className="mt-1">
            <span className="font-bold">Expires:</span>{" "}
            {context.expiresAt.toLocaleString()}
          </p>
        </div>

        <TenantOwnerActivationForm token={token} />
      </section>
    </main>
  );
}
