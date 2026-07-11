export type KnowledgeDocumentScope = "personal" | "team" | "org";
export type KnowledgeDocumentSourceType = "pdf" | "txt" | "docx" | "slack";

export interface KnowledgeDocument {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  source_type: KnowledgeDocumentSourceType;
  scope: KnowledgeDocumentScope;
  tags: string[];
  uploaded_by: string | null;
  chunk: {
    parent_document_id: string | null;
    chunk_index: number | null;
    chunk_total: number | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeFileUploadResponse {
  document_title: string;
  chunks_created: number;
  tags: string[];
  status: "success";
}

export interface KnowledgeQuerySource {
  title: string;
  source_type: KnowledgeDocumentSourceType;
  similarity_score: number;
}

export interface KnowledgeQueryResponse {
  answer: string;
  sources: KnowledgeQuerySource[];
}

export interface PaginatedKnowledgeDocuments {
  items: KnowledgeDocument[];
  total: number;
  page: number;
  page_size: number;
}
