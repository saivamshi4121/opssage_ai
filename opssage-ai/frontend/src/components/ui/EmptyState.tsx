import React from "react";

export function EmptyState(props: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}): JSX.Element {
  const { icon, title, description, actionLabel, onAction } = props;

  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
      {icon ? <div className="mx-auto mb-3 text-slate-200">{icon}</div> : null}
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded bg-opssage-500 px-4 py-2 text-sm font-medium text-white hover:bg-opssage-500/90"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

