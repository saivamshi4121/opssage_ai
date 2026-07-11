import { useMutation, useQuery } from "@tanstack/react-query";

import { analyzeIncident, generateRunbook, getTrending } from "../api/analysis";
import type { AnalysisResponse, RunbookResponse } from "../types";

export function useAnalyzeIncident() {
  return useMutation<AnalysisResponse, unknown, { title?: string; description: string }>({
    mutationFn: (payload) => analyzeIncident(payload),
    retry: 1,
  });
}

export function useGenerateRunbook() {
  return useMutation<RunbookResponse, unknown, { incident_description: string; root_cause?: string; similar_incident_ids?: string[] }>({
    mutationFn: (payload) => generateRunbook(payload),
    retry: 1,
  });
}

export function useTrending() {
  return useQuery({
    queryKey: ["analysis", "trending"],
    queryFn: getTrending,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

// Legacy aliases kept so existing UI can compile.
export const useAnalyzeRootCause = useAnalyzeIncident;
export const useGenerateRunbookLegacy = useGenerateRunbook;
export const useTrendingRootCauses = useTrending;
