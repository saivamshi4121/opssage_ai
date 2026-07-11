import React from "react";

export function SkeletonCard(): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3 h-5 w-2/3 animate-pulse rounded bg-slate-800" />
      <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-800" />
      <div className="mb-2 h-4 w-5/6 animate-pulse rounded bg-slate-800" />
      <div className="h-8 w-24 animate-pulse rounded bg-slate-800" />
    </div>
  );
}

