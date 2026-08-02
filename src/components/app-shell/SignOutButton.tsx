"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
      title="Sign out"
    >
      <LogOut className="h-4 w-4" />
      {compact ? null : <span>Sign out</span>}
    </button>
  );
}
