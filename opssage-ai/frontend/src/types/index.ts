export interface Incident {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: "critical" | "high" | "medium" | "low";
  root_cause?: string;
  resolution?: string;
  resolution_steps: string[];
  time_to_resolve_minutes?: number;
  tags: string[];
  system_components: string[];
  cluster_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SimilarIncident {
  id: string;
  title: string;
  similarity_score: number;
  severity: string;
  root_cause?: string;
  resolution?: string;
  time_to_resolve_minutes?: number;
}

export interface Cluster {
  id: string;
  name: string;
  description?: string;
  root_cause_label: string;
  incident_count: number;
  avg_severity_score: number;
  avg_time_to_resolve: number;
  last_incident_at?: string;
  created_at: string;
}

export interface RootCauseAnalysis {
  root_cause: string;
  confidence: number;
  evidence: string;
  recommended_action: string;
}

export interface AnalysisResponse {
  cluster_match?: string;
  cluster_frequency?: number;
  root_causes: RootCauseAnalysis[];
  similar_incidents: SimilarIncident[];
}

export interface RunbookResponse {
  steps: string[];
  estimated_minutes: number;
  based_on_incidents: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface HealthStatus {
  status: string;
  mongodb: string;
  redis: string;
  llm: string;
  uptime_seconds: number;
}

export type {
  KnowledgeDocument,
  KnowledgeDocumentScope,
  KnowledgeDocumentSourceType,
  KnowledgeFileUploadResponse,
  KnowledgeQueryResponse,
  KnowledgeQuerySource,
  PaginatedKnowledgeDocuments,
} from "./knowledge";
