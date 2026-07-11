import React, { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getClusterIncidents } from "../api/clusters";
import { useClusters } from "../hooks/useClusters";
import type { Incident } from "../types";

interface ClusterMetric {
  clusterId: string;
  clusterName: string;
  incidentCount: number;
  avgSeverity: number;
  avgMttr: number;
  topRootCause: string;
  lastIncidentTimestamp: string | null;
  trendDelta: number;
}

const CLUSTER_COLORS = ["#06b6d4", "#22c55e", "#f97316", "#eab308", "#a855f7", "#ef4444", "#3b82f6"];

const SEVERITY_SCORE: Record<Incident["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const SEVERITY_MTTR_PROXY_MINUTES: Record<Incident["severity"], number> = {
  critical: 75,
  high: 38,
  medium: 20,
  low: 10,
};

export function ClusterOverview(): JSX.Element {
  const navigate = useNavigate();
  const clustersQuery = useClusters();
  const clusterItems = clustersQuery.data ?? [];

  const incidentQueries = useQueries({
    queries: clusterItems.map((cluster) => ({
      queryKey: ["cluster", cluster.id, "incidents", "dashboard"],
      queryFn: () => getClusterIncidents(cluster.id),
      enabled: Boolean(cluster.id),
    })),
  });

  const isIncidentLoading = incidentQueries.some((query) => query.isLoading);
  const incidentsByCluster = incidentQueries.map((query) => query.data ?? []);
  const allIncidents = incidentsByCluster.flat();

  const metrics = useMemo<ClusterMetric[]>(() => {
    return clusterItems.map((cluster, index) => {
      const incidents = incidentsByCluster[index] ?? [];
      const severityAvg =
        incidents.length > 0
          ? incidents.reduce((sum, item) => sum + SEVERITY_SCORE[item.severity], 0) / incidents.length
          : 0;

      // Until true MTTR is persisted in API, use a severity-weighted proxy for dashboard trend visibility.
      const avgMttr =
        incidents.length > 0
          ? incidents.reduce((sum, item) => sum + SEVERITY_MTTR_PROXY_MINUTES[item.severity], 0) / incidents.length
          : 0;

      const rootCauseCounts: Record<string, number> = {};
      incidents.forEach((incident) => {
        const key = incident.root_cause ?? "unknown";
        rootCauseCounts[key] = (rootCauseCounts[key] ?? 0) + 1;
      });
      const topRootCause =
        Object.entries(rootCauseCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? cluster.name;

      const lastIncidentTimestamp =
        incidents
          .map((incident) => new Date(incident.created_at))
          .sort((left, right) => right.getTime() - left.getTime())[0]
          ?.toISOString() ?? null;

      const now = new Date();
      const last30Start = new Date(now);
      last30Start.setDate(now.getDate() - 30);
      const prev30Start = new Date(now);
      prev30Start.setDate(now.getDate() - 60);

      const last30Count = incidents.filter((incident) => new Date(incident.created_at) >= last30Start).length;
      const prev30Count = incidents.filter((incident) => {
        const created = new Date(incident.created_at);
        return created >= prev30Start && created < last30Start;
      }).length;

      return {
        clusterId: cluster.id,
        clusterName: cluster.name,
        incidentCount: cluster.incident_count,
        avgSeverity: Number(severityAvg.toFixed(2)),
        avgMttr: Number(avgMttr.toFixed(1)),
        topRootCause,
        lastIncidentTimestamp,
        trendDelta: last30Count - prev30Count,
      };
    });
  }, [clusterItems, incidentsByCluster]);

  const now = new Date();
  const criticalThisMonth = allIncidents.filter((incident) => {
    const created = new Date(incident.created_at);
    return incident.severity === "critical" && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const totalIncidents = clusterItems.reduce((sum, cluster) => sum + cluster.incident_count, 0);
  const activeClusters = clusterItems.length;
  const avgMttr = metrics.length > 0 ? metrics.reduce((sum, metric) => sum + metric.avgMttr, 0) / metrics.length : 0;

  const bubbleData = metrics.map((metric) => ({
    ...metric,
    x: metric.incidentCount,
    y: metric.avgSeverity,
    z: Math.max(200, metric.avgMttr * 10),
  }));

  const showLoading = clustersQuery.isLoading || isIncidentLoading;
  const showEmpty = !showLoading && clusterItems.length === 0;

  return (
    <>
      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total incidents" value={totalIncidents.toString()} loading={showLoading} />
        <StatCard title="Active clusters" value={activeClusters.toString()} loading={showLoading} />
        <StatCard title="Avg MTTR" value={`${avgMttr.toFixed(1)} min`} loading={showLoading} />
        <StatCard title="Critical this month" value={criticalThisMonth.toString()} loading={showLoading} />
      </section>

      {showEmpty ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-slate-400">
          No clusters available yet. Ingest incidents to generate clustering insights.
        </div>
      ) : null}

      {!showEmpty ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Cluster Bubble Chart</h2>
          {showLoading ? (
            <div className="h-80 animate-pulse rounded bg-slate-800" />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    stroke="#94a3b8"
                    name="Incident frequency"
                    label={{ value: "Incident frequency", position: "insideBottom", offset: -5, fill: "#94a3b8" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    stroke="#94a3b8"
                    domain={[1, 4]}
                    tickCount={4}
                    name="Average severity score"
                    label={{ value: "Avg severity", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                  />
                  <Tooltip content={<ClusterTooltip />} cursor={{ strokeDasharray: "4 4" }} />
                  <Scatter
                    data={bubbleData}
                    dataKey="z"
                    onClick={(point) =>
                      navigate(`/search?cluster=${((point as unknown as { payload?: { clusterId?: string } }).payload?.clusterId ?? "")}`)
                    }
                  >
                    {bubbleData.map((entry, index) => (
                      <Cell key={entry.clusterId} fill={CLUSTER_COLORS[index % CLUSTER_COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      ) : null}

      {!showEmpty ? (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Cluster Breakdown</h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {showLoading
              ? Array.from({ length: 4 }).map((_, index) => <ClusterCardSkeleton key={`cluster-skeleton-${index}`} />)
              : metrics.map((metric) => (
                  <button
                    key={metric.clusterId}
                    type="button"
                    onClick={() => navigate(`/search?cluster=${metric.clusterId}`)}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-cyan-500"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{metric.clusterName}</h3>
                      <span className={metric.trendDelta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {metric.trendDelta >= 0 ? "▲" : "▼"} {Math.abs(metric.trendDelta)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">Incident count: {metric.incidentCount}</p>
                    <p className="text-sm text-slate-400">Top root cause: {metric.topRootCause}</p>
                    <p className="text-sm text-slate-400">
                      Last incident: {metric.lastIncidentTimestamp ? new Date(metric.lastIncidentTimestamp).toLocaleString() : "N/A"}
                    </p>
                  </button>
                ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  loading: boolean;
}

function StatCard({ title, value, loading }: StatCardProps): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      {loading ? <div className="mt-2 h-7 w-24 animate-pulse rounded bg-slate-800" /> : <p className="mt-2 text-2xl font-semibold">{value}</p>}
    </div>
  );
}

function ClusterCardSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
      <div className="mt-3 h-4 w-24 animate-pulse rounded bg-slate-800" />
      <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-800" />
      <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-800" />
    </div>
  );
}

function ClusterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ClusterMetric }>;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const cluster = payload[0].payload;
  return (
    <div className="rounded border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200">
      <p className="font-semibold">{cluster.clusterName}</p>
      <p>Incidents: {cluster.incidentCount}</p>
      <p>Top root cause: {cluster.topRootCause}</p>
      <p>Avg MTTR: {cluster.avgMttr.toFixed(1)} min</p>
    </div>
  );
}
