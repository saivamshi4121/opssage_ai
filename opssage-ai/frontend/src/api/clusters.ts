import { api } from "./client";
import type { Cluster, Incident } from "../types";

function mapIncidentFromBackend(raw: any): Incident {
  // Keep in sync with incidents.ts mapping.
  const timestamp = raw.timestamp ?? raw.created_at;
  return {
    id: String(raw.id),
    title: String(raw.title),
    description: String(raw.description),
    timestamp: String(timestamp),
    severity: raw.severity,
    root_cause: raw.root_cause ?? raw.source ?? undefined,
    resolution: raw.resolution ?? undefined,
    resolution_steps: Array.isArray(raw.resolution_steps) ? raw.resolution_steps : [],
    time_to_resolve_minutes: raw.time_to_resolve_minutes ?? undefined,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    system_components: Array.isArray(raw.system_components) ? raw.system_components : [],
    cluster_id: raw.cluster_id ?? undefined,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export async function getClusters(): Promise<Cluster[]> {
  const res = await api.get<any>("/clusters");
  return (res?.items ?? []).map((c: any) => ({
    id: String(c.id),
    name: String(c.name),
    description: c.description ?? c.summary ?? undefined,
    root_cause_label: c.root_cause_label ?? "unknown",
    incident_count: Number(c.incident_count ?? 0),
    avg_severity_score: Number(c.avg_severity_score ?? 0),
    avg_time_to_resolve: Number(c.avg_time_to_resolve ?? 0),
    last_incident_at: c.last_incident_at ?? undefined,
    created_at: String(c.created_at ?? new Date().toISOString()),
  }));
}

export async function getCluster(id: string): Promise<Cluster> {
  const c = await api.get<any>(`/clusters/${id}`);
  return {
    id: String(c.id),
    name: String(c.name),
    description: c.description ?? c.summary ?? undefined,
    root_cause_label: c.root_cause_label ?? "unknown",
    incident_count: Number(c.incident_count ?? 0),
    avg_severity_score: Number(c.avg_severity_score ?? 0),
    avg_time_to_resolve: Number(c.avg_time_to_resolve ?? 0),
    last_incident_at: c.last_incident_at ?? undefined,
    created_at: String(c.created_at ?? new Date().toISOString()),
  };
}

export async function getClusterIncidents(id: string): Promise<Incident[]> {
  const res = await api.get<any>(`/clusters/${id}/incidents`, {
    params: { page: 1, page_size: 500 },
  });
  return (res?.items ?? []).map(mapIncidentFromBackend);
}

export async function recomputeClusters(): Promise<{ clusters_created: number }> {
  const res = await api.post<any>("/clusters/recompute", {});
  return {
    clusters_created: Number(res?.clusters_found ?? res?.clusters_created ?? 0),
  };
}

// Legacy exports (for older UI components) - kept temporarily.
export const fetchClusters = getClusters;
export const fetchCluster = getCluster;
export const fetchClusterIncidents = async (clusterId: string) => {
  const items = await getClusterIncidents(clusterId);
  return { items, total: items.length, page: 1, page_size: items.length };
};
export const recomputeClustersLegacy = recomputeClusters;
