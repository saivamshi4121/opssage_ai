import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  bulkImportIncidents,
  createIncident,
  deleteIncident,
  getIncident,
  getIncidents,
  getSimilarIncidents,
  updateIncident,
} from "../api/incidents";
import type { Incident, PaginatedResponse } from "../types";

export function useIncidents(params: {
  page?: number;
  page_size?: number;
  search?: string;
  severity?: string;
  cluster_id?: string;
}) {
  return useQuery<PaginatedResponse<Incident>>({
    queryKey: ["incidents", params],
    queryFn: () => getIncidents(params),
    retry: 1,
    staleTime: 30000,
  });
}

export function useIncident(id: string) {
  return useQuery<Incident>({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id),
    enabled: Boolean(id),
    retry: 1,
    staleTime: 30000,
  });
}

export function useSimilarIncidents(id: string, limit = 5) {
  return useQuery({
    queryKey: ["incident", id, "similar", limit],
    queryFn: () => getSimilarIncidents(id, limit),
    enabled: Boolean(id),
    retry: 1,
    staleTime: 30000,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Incident, "id" | "created_at" | "updated_at">) => createIncident(payload),
    retry: 1,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncident(id),
    retry: 1,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}

// Not in your spec, but useful for the existing UI.
export function useUpdateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Partial<Incident> }) => updateIncident(args.id, args.data),
    retry: 1,
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      if (updated?.id) void queryClient.invalidateQueries({ queryKey: ["incident", updated.id] });
    },
  });
}

export function useBulkImportIncidents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (incidents: any[]) => bulkImportIncidents(incidents),
    retry: 1,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}
