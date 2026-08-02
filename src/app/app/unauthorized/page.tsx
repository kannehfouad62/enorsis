import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-700">
        <ShieldAlert className="h-8 w-8" />
      </span>
      <h1 className="mt-6 text-4xl font-black">Access not authorized</h1>
      <p className="mt-4 leading-7 text-slate-600">
        Your current tenant role or organizational scope does not permit this action.
        Contact an organization administrator if you believe access is required.
      </p>
      <Link className="mt-8 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-black text-white" href="/app">
        Return to command center
      </Link>
    </div>
  );
}
