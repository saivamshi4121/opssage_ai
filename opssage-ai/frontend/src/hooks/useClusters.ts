import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCluster, getClusters, recomputeClusters } from "../api/clusters";

export function useClusters() {
  return useQuery({
    queryKey: ["clusters"],
    queryFn: getClusters,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useCluster(id: string) {
  return useQuery({
    queryKey: ["cluster", id],
    queryFn: () => getCluster(id),
    enabled: Boolean(id),
    retry: 1,
  });
}

export function useRecomputeClusters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recomputeClusters,
    retry: 1,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clusters"] });
    },
  });
}
