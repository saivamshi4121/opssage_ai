import React from "react";

type Props = React.PropsWithChildren;

type State = {
  hasError: boolean;
  errorMessage?: string;
};

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { hasError: true, errorMessage: message };
  }

  public render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto max-w-xl rounded-lg border border-rose-500/30 bg-rose-500/10 p-6 text-slate-100">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-rose-200">{this.state.errorMessage ?? "Please try again."}</p>
        <button
          type="button"
          className="mt-4 rounded bg-opssage-500 px-4 py-2 text-sm font-medium text-white hover:bg-opssage-500/90"
          onClick={() => this.setState({ hasError: false, errorMessage: undefined })}
        >
          Retry
        </button>
      </div>
    );
  }
}

