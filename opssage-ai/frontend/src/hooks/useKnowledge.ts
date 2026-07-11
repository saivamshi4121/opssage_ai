import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listKnowledgeDocuments,
  queryKnowledge,
  uploadKnowledgeFile,
  type ListKnowledgeDocumentsParams,
  type QueryKnowledgeParams,
  type UploadKnowledgeFileParams,
} from "../api/knowledge";

const KNOWLEDGE_LIST_KEY = "knowledge-documents";

export function useKnowledgeDocuments(params: ListKnowledgeDocumentsParams = {}) {
  return useQuery({
    queryKey: [KNOWLEDGE_LIST_KEY, params],
    queryFn: () => listKnowledgeDocuments(params),
  });
}

export function useUploadKnowledgeFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UploadKnowledgeFileParams) => uploadKnowledgeFile(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [KNOWLEDGE_LIST_KEY] });
    },
  });
}

export function useQueryKnowledge() {
  return useMutation({
    mutationFn: (params: QueryKnowledgeParams) => queryKnowledge(params),
  });
}
