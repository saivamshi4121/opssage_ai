import React from "react";

export function ConfidenceBar({ value, label }: { value: number; label?: string }): JSX.Element {
  const clamped = Math.max(0, Math.min(1, value));
  const tone =
    clamped > 0.7 ? "bg-emerald-500" : clamped >= 0.4 ? "bg-amber-500" : "bg-rose-500";

  const pct = Math.round(clamped * 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{label ?? "Confidence"}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-800">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

