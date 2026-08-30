import { ArrowLeft, Bot, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { LocalizedText } from "@/components/LocalizedText";

const signals = [
  { icon: Globe2, label: "Global tenant isolation" },
  { icon: ShieldCheck, label: "Governed approvals" },
  { icon: Bot, label: "Human-controlled AI agents" },
];

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/app");
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950 lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(37,99,235,.35),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,.22),transparent_30%)]" />
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 text-xl font-black">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600">
              <Sparkles className="h-5 w-5" />
            </span>
            ENORSIS
          </Link>
        </div>

        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[.28em] text-cyan-300">
            Procurement intelligence, governed
          </p>
          <h1 className="mt-5 text-5xl font-black leading-[1.05] xl:text-6xl">
            Operate global procurement from one intelligent command center.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Coordinate sourcing, suppliers, approvals, risk, contracts and AI
            agents across every legal entity, country and currency.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {signals.map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <Icon className="h-5 w-5 text-cyan-300" />
                <p className="mt-3 text-sm font-semibold text-slate-200">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-slate-500">
          © 2026 Enorsis. Enterprise Procurement-as-a-Service.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-12 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 lg:hidden">
            <ArrowLeft className="h-4 w-4" /> Back to Enorsis
          </Link>
          <p className="text-xs font-bold uppercase tracking-[.24em] text-blue-700">
            Secure workspace
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight"><LocalizedText namespace="loginPage" messageKey="welcomeBack" /></h2>
          <p className="mt-3 leading-7 text-slate-600">
            Sign in with the development administrator credentials configured in
            your local environment.
          </p>
          <div className="mt-8">
            <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-white" />}>
              <LoginForm />
            </Suspense>
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Production identity providers and database-backed accounts will be
            enabled in the organization onboarding phase.
          </p>
        </div>
      </section>
    </main>
  );
}
