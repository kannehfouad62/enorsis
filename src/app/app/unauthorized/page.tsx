import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-700">
        <ShieldAlert className="h-8 w-8" />
      </span>

      <h1 className="mt-6 text-4xl font-black text-slate-950">
        Access not authorized
      </h1>

      <p className="mt-4 leading-7 text-slate-600">
        Your current tenant role or organizational scope does not permit this
        action. Contact an organization administrator if you believe access is
        required.
      </p>

      <Link
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-black text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        href="/app"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to command center</span>
      </Link>
    </div>
  );
}
