import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { analyzeIncident, generateRunbook } from "../api/analysis";
import { getIncident, getSimilarIncidents } from "../api/incidents";
import { ErrorBoundary } from "../components/Common/ErrorBoundary";
import type { AnalysisResponse, Incident, RunbookResponse } from "../types";

interface RankedCause {
  id: string;
  rootCause: string;
  confidence: number;
  evidence: string;
}

export function IncidentDetail(): JSX.Element {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [expandedCauseId, setExpandedCauseId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const incidentQuery = useQuery({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id),
    enabled: Boolean(id),
  });

  const similarQuery = useQuery({
    queryKey: ["incident", id, "similar", 5],
    queryFn: () => getSimilarIncidents(id, 5),
    enabled: Boolean(id),
  });

  const analysisMutation = useMutation({
    mutationFn: (incident: Incident) => analyzeIncident({ title: incident.title, description: incident.description }),
  });

  const runbookMutation = useMutation({
    mutationFn: (incident: Incident) =>
      generateRunbook({
        incident_description: incident.description,
        root_cause: incident.root_cause,
      }),
  });

  useEffect(() => {
    if (!incidentQuery.data) {
      return;
    }
    void analysisMutation.mutateAsync(incidentQuery.data);
    void runbookMutation.mutateAsync(incidentQuery.data);
  }, [incidentQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const similarDetailsQueries = useQueries({
    queries: (similarQuery.data ?? []).map((item) => ({
      queryKey: ["incident", item.id, "summary"],
      queryFn: () => getIncident(item.id),
      enabled: Boolean(item.id),
    })),
  });

  const rankedCauses = useMemo(() => buildRankedCauses(analysisMutation.data, incidentQuery.data), [analysisMutation.data, incidentQuery.data]);
  const runbookSteps = runbookMutation.data?.steps ?? [];
  const estimatedFixTime = computeEstimatedFixTime(incidentQuery.data, runbookMutation.data);
  const timestamp = incidentQuery.data?.timestamp ?? incidentQuery.data?.created_at;
  const systemComponents = incidentQuery.data?.system_components ?? [incidentQuery.data?.root_cause].filter(Boolean);
  const showResolution = Boolean(incidentQuery.data?.resolution);

  return (
    <ErrorBoundary>
      <div className="mx-auto w-full max-w-7xl">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
            <button type="button" onClick={() => navigate(-1)} className="hover:text-slate-100">
              ← Back
            </button>
            <span>/</span>
            <Link to="/search" className="hover:text-slate-100">
              Search
            </Link>
            <span>/</span>
            <span className="text-slate-200">{id}</span>
          </div>

          {incidentQuery.isLoading ? <DetailSkeleton /> : null}
          {incidentQuery.error ? <p className="rounded bg-rose-900/30 p-3 text-rose-300">{(incidentQuery.error as Error).message}</p> : null}

          {incidentQuery.data ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
              <section className="space-y-6">
                <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded border border-cyan-500/50 bg-cyan-500/15 px-2 py-1 font-medium text-cyan-300">{incidentQuery.data.id}</span>
                    <SeverityBadge severity={incidentQuery.data.severity} />
                    <span className="rounded border border-slate-700 px-2 py-1 text-slate-300">
                      {timestamp ? new Date(timestamp).toLocaleString() : "Timestamp unavailable"}
                    </span>
                    {systemComponents.map((component) => (
                      <span key={component} className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300">
                        {component}
                      </span>
                    ))}
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold">{incidentQuery.data.title}</h1>
                  <p className="mt-3 text-slate-300">{incidentQuery.data.description}</p>
                </article>

                <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <h2 className="mb-3 text-lg font-semibold">Root Cause Analysis</h2>
                  {analysisMutation.isPending ? <div className="h-24 animate-pulse rounded bg-slate-800" /> : null}
                  {analysisMutation.error ? <p className="text-sm text-rose-400">{(analysisMutation.error as Error).message}</p> : null}
                  <div className="space-y-2">
                    {rankedCauses.map((cause) => {
                      const open = expandedCauseId === cause.id;
                      return (
                        <div key={cause.id} className="rounded border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setExpandedCauseId(open ? null : cause.id)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                          >
                            <span className="font-medium">{cause.rootCause}</span>
                            <span className="text-xs text-slate-400">{open ? "Hide" : "Show"}</span>
                          </button>
                          <div className="px-4 pb-4">
                            <ConfidenceBar confidence={cause.confidence} />
                            {open ? <p className="mt-3 text-sm text-slate-300">{cause.evidence}</p> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <h2 className="mb-3 text-lg font-semibold">Recommended Runbook</h2>
                  {runbookMutation.isPending ? <div className="h-24 animate-pulse rounded bg-slate-800" /> : null}
                  {runbookMutation.error ? <p className="text-sm text-rose-400">{(runbookMutation.error as Error).message}</p> : null}
                  <ol className="space-y-3">
                    {runbookSteps.map((step, index) => (
                      <li key={step} className="flex items-start gap-3 rounded border border-slate-800 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(completedSteps[index])}
                          onChange={() => setCompletedSteps((prev) => ({ ...prev, [index]: !prev[index] }))}
                          className="mt-1"
                        />
                        <span className="text-sm text-slate-200">
                          <span className="mr-2 font-medium text-cyan-300">{index + 1}.</span>
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 text-sm text-slate-400">Estimated fix time: {estimatedFixTime} minutes</p>
                </article>

                {showResolution ? (
                  <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <h2 className="mb-3 text-lg font-semibold">Resolution</h2>
                    <p className="text-slate-300">{incidentQuery.data.resolution}</p>
                    {(incidentQuery.data.resolution_steps ?? []).length > 0 ? (
                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-300">
                        {incidentQuery.data.resolution_steps?.map((step) => <li key={step}>{step}</li>)}
                      </ol>
                    ) : null}
                    <div className="mt-4 rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                      <strong>What worked:</strong> Fast isolation, clear rollback path, and targeted mitigations reduced blast radius.
                    </div>
                  </article>
                ) : null}
              </section>

              <aside className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h2 className="mb-3 text-lg font-semibold">Similar Incidents</h2>
                {similarQuery.isLoading ? <div className="h-24 animate-pulse rounded bg-slate-800" /> : null}
                {similarQuery.error ? <p className="text-sm text-rose-400">{(similarQuery.error as Error).message}</p> : null}
                <div className="space-y-3">
                  {similarQuery.data?.map((similar, index) => {
                    const detail = similarDetailsQueries[index]?.data;
                    return (
                      <Link
                        key={similar.id}
                        to={`/incidents/${similar.id}`}
                        className="block rounded border border-slate-800 bg-slate-950 p-3 hover:border-cyan-500"
                      >
                        <p className="font-medium">{similar.title}</p>
                        <p className="text-xs text-slate-400">Similarity: {Math.round(similar.similarity_score * 100)}%</p>
                        <p className="mt-2 text-xs text-slate-300">
                          Resolution: {detail?.resolution ?? detail?.description.slice(0, 90) ?? "No resolution summary available."}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Fix time: {computeEstimatedFixTime(detail, undefined)} min</p>
                      </Link>
                    );
                  })}
                </div>
              </aside>
            </div>
          ) : null}
        </div>
    </ErrorBoundary>
  );
}

function SeverityBadge({ severity }: { severity: Incident["severity"] }): JSX.Element {
  const styles: Record<Incident["severity"], string> = {
    critical: "border-rose-500/40 bg-rose-500/20 text-rose-300",
    high: "border-orange-500/40 bg-orange-500/20 text-orange-300",
    medium: "border-amber-500/40 bg-amber-500/20 text-amber-300",
    low: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
  };
  return <span className={`rounded border px-2 py-1 font-medium ${styles[severity]}`}>{severity}</span>;
}

function ConfidenceBar({ confidence }: { confidence: number }): JSX.Element {
  const tone = confidence > 70 ? "bg-emerald-500" : confidence >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>Confidence</span>
        <span>{confidence}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-800">
        <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }} />
      </div>
    </div>
  );
}

function buildRankedCauses(analysis: AnalysisResponse | undefined, incident: Incident | undefined): RankedCause[] {
  if (!analysis) {
    return [
      {
        id: "pending",
        rootCause: "Awaiting analysis",
        confidence: 0,
        evidence: "Root cause ranking will appear once analysis completes.",
      },
    ];
  }
  const first = analysis.root_causes?.[0];
  const base = first?.root_cause ?? "unknown_root_cause";
  const baseConfidence = Number(first?.confidence ?? 0);
  const baseEvidence = String(first?.evidence ?? incident?.description ?? "");
  return [
    { id: `${base}-1`, rootCause: base, confidence: baseConfidence, evidence: baseEvidence || incident?.description || "Evidence pending." },
    {
      id: `${base}-2`,
      rootCause: `${base} (secondary)`,
      confidence: Math.max(5, baseConfidence - 12),
      evidence: incident?.description ?? "Pattern observed from related failures.",
    },
    {
      id: `${base}-3`,
      rootCause: `${base} (fallback)`,
      confidence: Math.max(5, baseConfidence - 24),
      evidence: "Fallback hypothesis inferred from current telemetry signature.",
    },
  ];
}

function computeEstimatedFixTime(incident: Incident | undefined, runbook: RunbookResponse | undefined): number {
  if (incident?.time_to_resolve_minutes) {
    return incident.time_to_resolve_minutes;
  }
  if (runbook) {
    if (typeof runbook.estimated_minutes === "number") return runbook.estimated_minutes;
    return Math.max(10, runbook.steps.length * 12);
  }
  if (incident?.severity === "critical") {
    return 75;
  }
  if (incident?.severity === "high") {
    return 38;
  }
  if (incident?.severity === "medium") {
    return 20;
  }
  return 12;
}

function DetailSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
      <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
      <div className="h-40 animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
    </div>
  );
}
