import React from "react";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../api/client";
import type { HealthStatus } from "../types";

type BackendHealthDetailed = {
  status: string;
  database: string;
  cache: string;
  llm: string;
};

async function fetchHealth(): Promise<HealthStatus> {
  const response = await apiClient.get<BackendHealthDetailed>("/health/detailed");
  const data = response.data;
  return {
    status: data.status,
    mongodb: data.database,
    redis: data.cache,
    llm: data.llm,
    uptime_seconds: 0,
  };
}

export function SystemHealthPage(): JSX.Element {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health", "detailed"],
    queryFn: fetchHealth,
  });

  return (
    <>
      <h2 className="mb-4 text-2xl font-semibold">System Health</h2>
      {isLoading ? <p>Checking dependencies...</p> : null}
      {error ? <p className="text-rose-400">{(error as Error).message}</p> : null}
      {data ? (
        <div className="grid max-w-2xl gap-3 md:grid-cols-2">
          <HealthCard label="Overall" status={data.status} />
          <HealthCard label="MongoDB" status={data.mongodb} />
          <HealthCard label="Redis" status={data.redis} />
          <HealthCard label="LLM" status={data.llm} />
        </div>
      ) : null}
    </>
  );
}

interface HealthCardProps {
  label: string;
  status: string;
}

function HealthCard({ label, status }: HealthCardProps): JSX.Element {
  const tone = status === "healthy" || status === "ok" ? "text-emerald-300" : "text-amber-300";
  return (
    <div className="rounded border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${tone}`}>{status}</p>
    </div>
  );
}
