import { api, apiClient } from "./client";
import type {
  KnowledgeDocumentScope,
  KnowledgeDocumentSourceType,
  KnowledgeFileUploadResponse,
  KnowledgeQueryResponse,
  PaginatedKnowledgeDocuments,
} from "../types/knowledge";

export interface UploadKnowledgeFileParams {
  file: File;
  scope: KnowledgeDocumentScope;
  title?: string;
  tags?: string;
  uploaded_by?: string;
}

export interface ListKnowledgeDocumentsParams {
  page?: number;
  page_size?: number;
  scope?: KnowledgeDocumentScope;
  source_type?: KnowledgeDocumentSourceType;
}

export interface QueryKnowledgeParams {
  query: string;
  scope: KnowledgeDocumentScope;
  min_similarity?: number;
  limit?: number;
}

export async function uploadKnowledgeFile(params: UploadKnowledgeFileParams): Promise<KnowledgeFileUploadResponse> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("scope", params.scope);
  if (params.title?.trim()) {
    form.append("title", params.title.trim());
  }
  if (params.tags?.trim()) {
    form.append("tags", params.tags.trim());
  }
  if (params.uploaded_by?.trim()) {
    form.append("uploaded_by", params.uploaded_by.trim());
  }

  const response = await apiClient.post<KnowledgeFileUploadResponse>("/knowledge/upload-file", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return response.data;
}

export async function listKnowledgeDocuments(
  params: ListKnowledgeDocumentsParams = {},
): Promise<PaginatedKnowledgeDocuments> {
  return api.get<PaginatedKnowledgeDocuments>("/knowledge", { params });
}

export async function queryKnowledge(params: QueryKnowledgeParams): Promise<KnowledgeQueryResponse> {
  return api.post<KnowledgeQueryResponse>("/knowledge/query", params);
}
