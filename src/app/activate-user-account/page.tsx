import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { TenantUserActivationForm } from "@/components/auth/tenant-user-activation-form";
import { resolveTenantUserActivation } from "@/core/tenant-user-activation/service";

export default async function ActivateUserAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; token?: string }>;
}) {
  const { tenant: tenantId = "", token = "" } = await searchParams;
  const context = await resolveTenantUserActivation({
    tenantId,
    rawToken: token,
  });

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
          <p className="mt-4 text-slate-600">
            It may be expired, already used, replaced, or the account may already be activated.
          </p>
          <Link href="/login" className="mt-7 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
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
        <h1 className="mt-3 text-3xl font-black text-slate-950">Welcome to Enorsis</h1>
        <p className="mt-4 leading-7 text-slate-600">
          Create your password to activate your account for{" "}
          <strong className="text-slate-950">{context.tenantName}</strong>.
        </p>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
          <p><span className="font-bold">Account:</span> {context.userEmail}</p>
          <p className="mt-1"><span className="font-bold">Roles:</span> {context.roles.join(", ")}</p>
          <p className="mt-1"><span className="font-bold">Expires:</span> {context.expiresAt.toLocaleString()}</p>
        </div>
        <TenantUserActivationForm tenantId={context.tenantId} token={token} />
      </section>
    </main>
  );
}
