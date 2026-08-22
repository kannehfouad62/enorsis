"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton({
  compact = false,
  variant = "sidebar",
  onBeforeSignOut,
}: {
  compact?: boolean;
  variant?: "sidebar" | "menu";
  onBeforeSignOut?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onBeforeSignOut?.();
        void signOut({ redirectTo: "/login" });
      }}
      className={
        variant === "menu"
          ? "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
      }
      title="Sign out"
    >
      <LogOut className="h-4 w-4" />
      {compact ? null : <span>Sign out</span>}
    </button>
  );
}
