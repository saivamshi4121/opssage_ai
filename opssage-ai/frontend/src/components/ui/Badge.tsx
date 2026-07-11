import React from "react";

type BadgeProps = {
  severity?: "critical" | "high" | "medium" | "low";
  status?: string;
};

const toneByValue: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-200" },
  high: { bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-200" },
  medium: { bg: "bg-yellow-500/15", border: "border-yellow-500/40", text: "text-yellow-200" },
  low: { bg: "bg-blue-500/15", border: "border-blue-500/40", text: "text-blue-200" },
  resolved: { bg: "bg-green-500/15", border: "border-green-500/40", text: "text-green-200" },
};

export function Badge({ severity, status }: BadgeProps): JSX.Element {
  const value = severity ?? status ?? "";
  const tone = toneByValue[value] ?? {
    bg: "bg-slate-500/15",
    border: "border-slate-500/40",
    text: "text-slate-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${tone.bg} ${tone.border} ${tone.text}`}>
      {value}
    </span>
  );
}

