import { requestPasswordResetAction } from "@/modules/security/actions";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-3xl font-black">Reset your password</h1>
      <p className="mt-3 text-slate-600">Enter your account email. Development reset tokens are written to the server console.</p>
      <form action={requestPasswordResetAction} className="mt-8">
        <input className="w-full rounded-xl border border-slate-200 px-4 py-3" name="email" type="email" required />
        <button className="mt-4 w-full rounded-xl bg-slate-950 px-5 py-3 font-black text-white" type="submit">Request reset</button>
      </form>
    </main>
  );
}
