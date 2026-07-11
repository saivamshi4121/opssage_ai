import { api } from "./client";
import type { AnalysisResponse, RootCauseAnalysis, RunbookResponse } from "../types";

export async function analyzeIncident(payload: { title?: string; description: string }): Promise<AnalysisResponse> {
  const context = [payload.title, payload.description].filter(Boolean).join("\n").trim();
  const res = await api.post<any>("/analysis/root-causes", {
    incident_id: "temp-analysis",
    context,
  });

  const rootCause: RootCauseAnalysis = {
    root_cause: String(res?.root_cause ?? "unknown"),
    confidence: Number(res?.confidence_score ?? 0),
    evidence: String(res?.summary ?? ""),
    recommended_action: (res?.suggested_runbook_steps ?? []).join("\n") || "",
  };

  return {
    root_causes: [rootCause],
    similar_incidents: [],
  };
}

export async function generateRunbook(payload: {
  incident_description: string;
  root_cause?: string;
  similar_incident_ids?: string[];
}): Promise<RunbookResponse> {
  const context = payload.root_cause
    ? `${payload.incident_description}\n\nRoot cause: ${payload.root_cause}`
    : payload.incident_description;

  const res = await api.post<any>("/analysis/runbook", {
    incident_id: payload.similar_incident_ids?.[0] ?? "temp-runbook",
    context,
  });

  const steps: string[] = Array.isArray(res?.runbook_steps) ? res.runbook_steps.map(String) : [];
  return {
    steps,
    estimated_minutes: Math.max(1, steps.length * 12),
    based_on_incidents: Math.max(1, payload.similar_incident_ids?.length ?? 1),
  };
}

export async function getTrending(): Promise<{ root_cause: string; count: number; trend: "up" | "down" | "stable" }[]> {
  const res = await api.get<any>("/analysis/trending", { params: { limit: 20 } });
  const items: any[] = res?.items ?? [];
  return items.map((it) => ({
    root_cause: String(it?.summary ?? it?.root_cause ?? "unknown"),
    count: Number(it?.occurrence_count ?? 0),
    trend: "stable",
  }));
}

// Legacy exports (for older pages) - kept temporarily.
export const analyzeRootCause = analyzeIncident;
export const fetchTrendingRootCauses = async (limit = 10) => {
  const items = await getTrending();
  return { items: items.map((x) => ({ summary: x.root_cause, occurrence_count: x.count })) };
};
