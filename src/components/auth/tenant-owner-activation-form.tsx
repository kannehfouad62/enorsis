"use client";

import { useActionState } from "react";
import {
  activateTenantOwnerAction,
  type TenantOwnerActivationState,
} from "@/modules/tenant-owner-activation/actions";

const initialState: TenantOwnerActivationState = {};

export function TenantOwnerActivationForm({
  token,
}: {
  token: string;
}) {
  const [state, action, pending] = useActionState(
    activateTenantOwnerAction,
    initialState,
  );

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="token" value={token} />

      <label className="block text-sm font-bold text-slate-700">
        Create password
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
        />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Confirm password
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={12}
          required
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"
        />
      </label>

      <p className="text-xs text-slate-500">
        Use at least 12 characters with uppercase,
        lowercase and a number.
      </p>

      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
      >
        {pending ? "Activating…" : "Activate account"}
      </button>
    </form>
  );
}
