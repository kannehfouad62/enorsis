"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const REFRESH_INTERVAL_MS = 10_000;

export function SupplierDocumentStatusRefresh() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const refresh = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      setRefreshing(true);
      router.refresh();

      window.setTimeout(() => {
        if (mounted.current) {
          setRefreshing(false);
        }
      }, 800);
    };

    const interval = window.setInterval(
      refresh,
      REFRESH_INTERVAL_MS,
    );

    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [router]);

  return (
    <div
      aria-live="polite"
      className="mb-4 flex min-h-5 items-center justify-end text-xs font-semibold text-slate-400"
    >
      {refreshing
        ? "Checking for verification updates…"
        : "Verification status updates automatically"}
    </div>
  );
}
