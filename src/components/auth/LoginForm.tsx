"use client";

import { ArrowRight, KeyRound, LoaderCircle, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const data = new FormData(event.currentTarget);

    const requestedCallbackUrl =
      searchParams.get("callbackUrl");

    let callbackUrl = "/app";

    if (requestedCallbackUrl) {
      try {
        const parsed = new URL(
          requestedCallbackUrl,
          window.location.origin,
        );

        if (
          parsed.origin === window.location.origin &&
          parsed.pathname.startsWith("/app")
        ) {
          callbackUrl =
            `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
      } catch {
        callbackUrl = "/app";
      }
    }

    const result = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
      redirectTo: callbackUrl,
    });

    if (result?.error) {
      setError("The email or password is incorrect.");
      setIsPending(false);
      return;
    }

    window.location.assign(result?.url ?? callbackUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Work email
        </span>
        <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
          <Mail className="h-5 w-5 text-slate-400" />
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-slate-950 outline-none"
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Password
        </span>
        <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
          <KeyRound className="h-5 w-5 text-slate-400" />
          <input
            required
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-slate-950 outline-none"
          />
        </span>
      </label>

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <ArrowRight className="h-5 w-5" />
        )}
        Enter procurement command center
      </button>
    </form>
  );
}
