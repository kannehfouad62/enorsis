import { resetPasswordAction } from "@/modules/security/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-3xl font-black">Choose a new password</h1>
      <form action={resetPasswordAction} className="mt-8 space-y-4">
        <input type="hidden" name="token" value={token} />
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3" name="password" type="password" minLength={12} placeholder="New password" required />
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3" name="confirmPassword" type="password" minLength={12} placeholder="Confirm password" required />
        <button className="w-full rounded-xl bg-slate-950 px-5 py-3 font-black text-white" type="submit">Reset password</button>
      </form>
    </main>
  );
}
