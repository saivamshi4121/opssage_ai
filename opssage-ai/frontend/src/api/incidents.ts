import { api } from "./client";
import type { Incident, PaginatedResponse, SimilarIncident } from "../types";

function mapIncidentFromBackend(raw: any): Incident {
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

export async function getIncidents(params: {
  page?: number;
  page_size?: number;
  search?: string;
  severity?: string;
  cluster_id?: string;
} = {}): Promise<PaginatedResponse<Incident>> {
  const page = params.page ?? 1;
  const page_size = params.page_size ?? 20;

  // Backend expects `query` for keyword search.
  const res = await api.get<any>("/incidents", {
    params: {
      page,
      page_size,
      query: params.search ?? undefined,
    },
  });

  const items: Incident[] = (res?.items ?? []).map(mapIncidentFromBackend);

  // Client-side filtering for fields not currently supported by the backend list endpoint.
  const filtered = items.filter((inc) => {
    if (params.severity && inc.severity !== params.severity) return false;
    if (params.cluster_id && inc.cluster_id !== params.cluster_id) return false;
    return true;
  });

  return {
    items: filtered,
    total: filtered.length,
    page,
    page_size,
  };
}

export async function getIncident(id: string): Promise<Incident> {
  const res = await api.get<any>(`/incidents/${id}`);
  return mapIncidentFromBackend(res);
}

export async function getSimilarIncidents(id: string, limit = 5): Promise<SimilarIncident[]> {
  const res = await api.get<any>(`/incidents/${id}/similar`, { params: { limit } });
  const items: any[] = res?.items ?? [];

  // Enrich each similar item with full incident details when possible.
  const details = await Promise.all(
    items.map(async (it) => {
      try {
        return await getIncident(String(it.id));
      } catch {
        return null;
      }
    }),
  );

  return items.map((it, idx) => {
    const detail = details[idx];
    return {
      id: String(it.id),
      title: String(it.title),
      similarity_score: Number(it.similarity_score),
      severity: detail?.severity ?? "medium",
      root_cause: detail?.root_cause,
      resolution: detail?.resolution,
      time_to_resolve_minutes: detail?.time_to_resolve_minutes,
    };
  });
}

export async function createIncident(
  data: Omit<Incident, "id" | "created_at" | "updated_at">,
): Promise<Incident> {
  const body = {
    title: data.title,
    description: data.description,
    severity: data.severity,
    // Backend calls it `source` (maps from your `root_cause`).
    source: data.root_cause ?? "unknown",
    cluster_id: data.cluster_id ?? null,
    timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : undefined,
    resolution: data.resolution,
    resolution_steps: data.resolution_steps,
    time_to_resolve_minutes: data.time_to_resolve_minutes,
    tags: data.tags,
    system_components: data.system_components,
  };

  const res = await api.post<any>("/incidents", body);
  return mapIncidentFromBackend(res);
}

export async function updateIncident(id: string, data: Partial<Incident>): Promise<Incident> {
  const body: any = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.severity !== undefined) body.severity = data.severity;
  if (data.root_cause !== undefined) body.source = data.root_cause;
  if (data.cluster_id !== undefined) body.cluster_id = data.cluster_id ?? null;
  if (data.timestamp !== undefined) body.timestamp = new Date(data.timestamp).toISOString();
  if (data.resolution !== undefined) body.resolution = data.resolution;
  if (data.resolution_steps !== undefined) body.resolution_steps = data.resolution_steps;
  if (data.time_to_resolve_minutes !== undefined) body.time_to_resolve_minutes = data.time_to_resolve_minutes;
  if (data.tags !== undefined) body.tags = data.tags;
  if (data.system_components !== undefined) body.system_components = data.system_components;

  const res = await api.put<any>(`/incidents/${id}`, body);
  return mapIncidentFromBackend(res);
}

export async function deleteIncident(id: string): Promise<void> {
  await api.delete<void>(`/incidents/${id}`);
}

export async function bulkImportIncidents(
  incidents: any[],
): Promise<{ imported: number; failed: number }> {
  const file = new File([JSON.stringify(incidents)], "incidents.json", { type: "application/json" });
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<any>("/incidents/bulk-import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return {
    imported: Number(res?.imported_count ?? 0),
    failed: Number(res?.failed_count ?? 0),
  };
}
