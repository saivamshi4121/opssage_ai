import React from "react";

export function LoadingSpinner({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <div className="flex w-full items-center justify-center">
      <div
        className="animate-spin rounded-full border-2 border-slate-400 border-t-opssage-500"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

