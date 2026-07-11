import React from "react";

export function SeverityBadge({ severity }: { severity: "critical" | "high" | "medium" | "low" | string }): JSX.Element {
  const styles: Record<string, { dot: string; bg: string; text: string; border: string }> = {
    critical: { dot: "bg-red-500", bg: "bg-red-500/15", text: "text-red-200", border: "border-red-500/40" },
    high: { dot: "bg-orange-500", bg: "bg-orange-500/15", text: "text-orange-200", border: "border-orange-500/40" },
    medium: { dot: "bg-yellow-500", bg: "bg-yellow-500/15", text: "text-yellow-200", border: "border-yellow-500/40" },
    low: { dot: "bg-blue-500", bg: "bg-blue-500/15", text: "text-blue-200", border: "border-blue-500/40" },
    resolved: { dot: "bg-emerald-500", bg: "bg-emerald-500/15", text: "text-emerald-200", border: "border-emerald-500/40" },
  };

  const style = styles[severity] ?? {
    dot: "bg-slate-400",
    bg: "bg-slate-500/15",
    text: "text-slate-200",
    border: "border-slate-500/40",
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${style.bg} ${style.border} ${style.text}`}>
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {severity}
    </span>
  );
}

