"use client";

export function WorkflowToolbar({
  zoom,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onResetView,
  onUndo,
  onRedo,
}: {
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40"
      >
        Redo
      </button>
      <div className="mx-1 h-6 w-px bg-slate-200" />
      <button
        type="button"
        onClick={onZoomOut}
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"
      >
        −
      </button>
      <span className="min-w-14 text-center text-xs font-black">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"
      >
        +
      </button>
      <button
        type="button"
        onClick={onResetView}
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black"
      >
        Reset view
      </button>
    </div>
  );
}
