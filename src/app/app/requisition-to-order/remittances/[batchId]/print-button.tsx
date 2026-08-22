"use client";

export function PrintRemittanceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
