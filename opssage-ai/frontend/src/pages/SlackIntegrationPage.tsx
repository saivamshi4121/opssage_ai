import React, { useMemo, useState } from "react";

import { apiClient } from "../api/client";

export function SlackIntegrationPage(): JSX.Element {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const publicWebhookUrl = useMemo(() => {
    const configured = import.meta.env.VITE_SLACK_COMMAND_URL as string | undefined;
    return configured ?? "https://<your-public-domain>/integrations/slack/incident";
  }, []);

  const runConnectionTest = async (): Promise<void> => {
    setStatus("loading");
    setMessage("");
    try {
      await apiClient.get("/health");
      setStatus("ok");
      setMessage("Backend is reachable. Slack command endpoint can be configured now.");
    } catch {
      setStatus("error");
      setMessage("Backend is not reachable. Start backend before testing Slack integration.");
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Slack Integration</h1>
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm text-slate-300">Status: {status === "ok" ? "Connected" : "Not verified"}</p>
        <p className="mt-2 text-sm text-slate-400">Slash command endpoint:</p>
        <code className="mt-1 block rounded bg-slate-950 p-2 text-xs text-cyan-300">{publicWebhookUrl}</code>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-lg font-medium">Setup Instructions</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">
          <li>Create a Slack app and enable Slash Commands.</li>
          <li>Add command <code>/incident</code>.</li>
          <li>Set Request URL to the endpoint shown above.</li>
          <li>Copy Signing Secret to backend <code>SLACK_SIGNING_SECRET</code>.</li>
          <li>Install app to your workspace and test with <code>/incident payment timeout</code>.</li>
        </ol>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <button
          type="button"
          onClick={runConnectionTest}
          disabled={status === "loading"}
          className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:opacity-60"
        >
          {status === "loading" ? "Testing..." : "Run Connection Test"}
        </button>
        {message ? <p className="mt-2 text-sm text-slate-300">{message}</p> : null}
      </div>
    </section>
  );
}
