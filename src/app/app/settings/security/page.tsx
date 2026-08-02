import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  changePasswordAction,
  revokeMySessionsAction,
} from "@/modules/security/actions";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default async function SecuritySettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Account security
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        Password and session controls
      </h1>

      {session.user.mustChangePassword ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          Your temporary password must be changed before continuing regular work.
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form action={changePasswordAction} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Change password</h2>
          <label className="mt-5 block text-sm font-bold">Current password
            <input className={inputClass} name="currentPassword" type="password" required />
          </label>
          <label className="mt-4 block text-sm font-bold">New password
            <input className={inputClass} name="newPassword" type="password" minLength={12} required />
          </label>
          <label className="mt-4 block text-sm font-bold">Confirm new password
            <input className={inputClass} name="confirmPassword" type="password" minLength={12} required />
          </label>
          <button className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white" type="submit">
            Update password
          </button>
        </form>

        <form action={revokeMySessionsAction} className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-xl font-black text-red-950">Revoke active sessions</h2>
          <p className="mt-3 text-sm leading-6 text-red-800">
            Invalidate your current security version and sign out. Use this after a suspected compromise.
          </p>
          <button className="mt-5 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white" type="submit">
            Revoke sessions and sign out
          </button>
        </form>
      </div>
    </div>
  );
}
