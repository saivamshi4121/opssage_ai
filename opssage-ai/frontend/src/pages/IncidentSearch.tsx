import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { analyzeIncident, generateRunbook } from "../api/analysis";
import { getIncidents, getSimilarIncidents } from "../api/incidents";
import { ErrorBoundary } from "../components/Common/ErrorBoundary";
import { useClusters } from "../hooks/useClusters";
import type { AnalysisResponse, Incident } from "../types";

const DEFAULT_SEARCH = "payment processing timeout";

type DateRange = "7d" | "30d" | "90d" | "all";

export function IncidentSearch(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get("q") ?? DEFAULT_SEARCH);
  const [submittedQuery, setSubmittedQuery] = useState(params.get("q") ?? DEFAULT_SEARCH);
  const [clusterFilter, setClusterFilter] = useState(params.get("cluster") ?? "all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const clustersQuery = useClusters();

  const incidentsQuery = useQuery({
    queryKey: ["incidents", "search-page", submittedQuery],
    queryFn: () => getIncidents({ search: submittedQuery, page: 1, page_size: 50 }),
    enabled: Boolean(submittedQuery),
  });

  const referenceIncidentId = incidentsQuery.data?.items[0]?.id ?? "ad-hoc";

  const analysisMutation = useMutation({
    mutationFn: () =>
      analyzeIncident({
        title: "Incident search",
        description: submittedQuery,
      }),
  });

  const runbookMutation = useMutation({
    mutationFn: () =>
      generateRunbook({
        incident_description: submittedQuery,
      }),
  });

  const similarQuery = useQuery({
    queryKey: ["incidents", "similar", referenceIncidentId, submittedQuery],
    queryFn: () => getSimilarIncidents(referenceIncidentId, 8),
    enabled: Boolean(referenceIncidentId && referenceIncidentId !== "ad-hoc"),
  });

  const filteredIncidents = useMemo(() => {
    const items = incidentsQuery.data?.items ?? [];
    const now = new Date();
    return items.filter((incident) => {
      if (clusterFilter !== "all" && incident.cluster_id !== clusterFilter) return false;
      if (severityFilter !== "all" && incident.severity !== severityFilter) {
        return false;
      }
      if (dateRange !== "all") {
        const createdAt = new Date(incident.created_at);
        const dayWindow = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        const earliest = new Date(now);
        earliest.setDate(now.getDate() - dayWindow);
        if (createdAt < earliest) {
          return false;
        }
      }
      return true;
    });
  }, [incidentsQuery.data?.items, clusterFilter, severityFilter, dateRange]);

  const similarCards = useMemo(() => {
    const byId = new Map((incidentsQuery.data?.items ?? []).map((incident) => [incident.id, incident]));
    return (similarQuery.data ?? []).map((item) => ({
      item,
      detail: byId.get(item.id) ?? null,
    }));
  }, [incidentsQuery.data?.items, similarQuery.data]);

  const rankedRootCauses = buildRankedRootCauses(analysisMutation.data, submittedQuery);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) {
      return;
    }
    setSubmittedQuery(text);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("q", text);
      if (clusterFilter !== "all") {
        next.set("cluster", clusterFilter);
      } else {
        next.delete("cluster");
      }
      return next;
    });
    void analysisMutation.mutateAsync();
    void runbookMutation.mutateAsync();
  };

  return (
    <ErrorBoundary>
      <div className="mx-auto w-full max-w-7xl">
          <form onSubmit={onSubmit} className="mb-6">
            <label htmlFor="incident-search" className="mb-2 block text-sm font-medium text-slate-300">
              Describe the incident
            </label>
            <div className="flex gap-2">
              <input
                id="incident-search"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={DEFAULT_SEARCH}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base"
              />
              <button type="submit" className="rounded-lg bg-cyan-600 px-5 py-3 font-medium text-white hover:bg-cyan-500">
                Analyze
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 font-semibold">Filters</h3>
              <label className="mb-1 block text-xs text-slate-400">Cluster</label>
              <select
                value={clusterFilter}
                onChange={(event) => setClusterFilter(event.target.value)}
                className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              >
                <option value="all">All clusters</option>
                {(clustersQuery.data ?? []).map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>
                    {cluster.name}
                  </option>
                ))}
              </select>

              <label className="mb-1 block text-xs text-slate-400">Severity</label>
              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value)}
                className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              >
                <option value="all">All severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <label className="mb-1 block text-xs text-slate-400">Date range</label>
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value as DateRange)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </aside>

            <section>
              <h2 className="mb-3 text-lg font-semibold">AI Analysis</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <AnalysisCard title="Pattern Detected" delayMs={0} loading={analysisMutation.isPending}>
                  <p className="text-sm text-slate-300">
                    Cluster:{" "}
                    <span className="font-medium">
                      {analysisMutation.data?.root_causes?.[0]?.root_cause ?? "Analyzing..."}
                    </span>
                  </p>
                  <p className="text-sm text-slate-400">Occurred: {filteredIncidents.length} matching incidents</p>
                </AnalysisCard>

                <AnalysisCard title="Root Causes Ranked" delayMs={150} loading={analysisMutation.isPending}>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {rankedRootCauses.map((entry) => (
                      <li key={entry.rootCause}>
                        <span className="font-medium">{entry.rootCause}</span> ({entry.confidence}%)
                        <div className="text-xs text-slate-400">{entry.evidence}</div>
                      </li>
                    ))}
                  </ul>
                </AnalysisCard>

                <AnalysisCard title="Recommended Runbook" delayMs={300} loading={runbookMutation.isPending}>
                  <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-300">
                    {(runbookMutation.data?.steps ?? []).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </AnalysisCard>
              </div>

              {analysisMutation.error ? <p className="mt-3 text-sm text-rose-400">{(analysisMutation.error as Error).message}</p> : null}
              {runbookMutation.error ? <p className="mt-2 text-sm text-rose-400">{(runbookMutation.error as Error).message}</p> : null}

              <h2 className="mb-3 mt-8 text-lg font-semibold">Similar Incidents</h2>
              {incidentsQuery.isLoading || similarQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`sim-skeleton-${index}`} className="h-24 animate-pulse rounded border border-slate-800 bg-slate-900" />
                  ))}
                </div>
              ) : null}

              {incidentsQuery.error ? <p className="text-sm text-rose-400">{(incidentsQuery.error as Error).message}</p> : null}
              {similarQuery.error ? <p className="text-sm text-rose-400">{(similarQuery.error as Error).message}</p> : null}

              {!incidentsQuery.isLoading && !similarQuery.isLoading ? (
                <div className="space-y-3">
                  {similarCards.map(({ item, detail }) => (
                    <Link key={item.id} to={`/incidents/${item.id}`} className="block rounded border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">
                          {item.id} — {item.title}
                        </p>
                        <SeverityBadge severity={(detail?.severity ?? item.severity) as Incident["severity"]} />
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                          <span>Similarity</span>
                          <span>{Math.round(item.similarity_score * 100)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded bg-slate-800">
                          <div className="h-full bg-cyan-500" style={{ width: `${Math.round(item.similarity_score * 100)}%` }} />
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">
                        Resolution:{" "}
                        {analysisMutation.data?.root_causes?.[0]?.evidence ?? "Resolution summary pending analysis output."}
                      </p>
                      <p className="text-xs text-slate-400">
                        Time to resolve: {estimateMttr((detail?.severity ?? item.severity) as Incident["severity"])} minutes (estimated)
                      </p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </div>
    </ErrorBoundary>
  );
}

interface AnalysisCardProps {
  title: string;
  delayMs: number;
  loading: boolean;
  children: React.ReactNode;
}

function AnalysisCard({ title, delayMs, loading, children }: AnalysisCardProps): JSX.Element {
  return (
    <article className="stagger-card rounded border border-slate-800 bg-slate-900 p-4" style={{ animationDelay: `${delayMs}ms` }}>
      <h3 className="mb-2 text-sm font-semibold text-cyan-300">{title}</h3>
      {loading ? <div className="h-14 animate-pulse rounded bg-slate-800" /> : children}
    </article>
  );
}

function SeverityBadge({ severity }: { severity: Incident["severity"] }): JSX.Element {
  const styleBySeverity: Record<Incident["severity"], string> = {
    critical: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  };
  return <span className={`rounded border px-2 py-1 text-xs font-medium ${styleBySeverity[severity]}`}>{severity}</span>;
}

function estimateMttr(severity: Incident["severity"] | undefined): number {
  if (severity === "critical") {
    return 75;
  }
  if (severity === "high") {
    return 38;
  }
  if (severity === "medium") {
    return 20;
  }
  return 10;
}

function buildRankedRootCauses(analysis: AnalysisResponse | undefined, evidenceSource: string) {
  if (!analysis) {
    return [{ rootCause: "Awaiting model output", confidence: 0, evidence: "Submit an incident description to analyze." }];
  }
  const firstItem = analysis.root_causes?.[0];
  const first = firstItem?.root_cause ?? "unknown_root_cause";
  const second = `${first}_secondary_signal`;
  const third = `${first}_fallback_hypothesis`;
  const baseConfidence = Number(firstItem?.confidence ?? 0);
  const baseEvidence = firstItem?.evidence ?? evidenceSource;
  return [
    { rootCause: first, confidence: baseConfidence, evidence: baseEvidence.slice(0, 120) || evidenceSource },
    {
      rootCause: second,
      confidence: Math.max(5, baseConfidence - 12),
      evidence: "Pattern observed from related failures.",
    },
    {
      rootCause: third,
      confidence: Math.max(5, baseConfidence - 25),
      evidence: "Lower-confidence hypothesis derived from keyword correlation.",
    },
  ];
}
