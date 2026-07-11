import React, { useCallback, useRef, useState } from "react";
import { BookOpen, FileText, Search, Upload } from "lucide-react";

import { ErrorBoundary } from "../components/Common/ErrorBoundary";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import type { NormalizedApiError } from "../api/client";
import { useKnowledgeDocuments, useQueryKnowledge, useUploadKnowledgeFile } from "../hooks/useKnowledge";
import type { KnowledgeDocumentScope, KnowledgeFileUploadResponse } from "../types/knowledge";

const ACCEPTED_EXTENSIONS = [".pdf", ".txt"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as NormalizedApiError).message);
  }
  return "Something went wrong. Please try again.";
}

export function KnowledgeBasePage(): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scope, setScope] = useState<KnowledgeDocumentScope>("org");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [lastUpload, setLastUpload] = useState<KnowledgeFileUploadResponse | null>(null);
  const [queryText, setQueryText] = useState("");
  const [queryScope, setQueryScope] = useState<KnowledgeDocumentScope>("org");

  const documentsQuery = useKnowledgeDocuments({ page: 1, page_size: 20, scope });
  const uploadMutation = useUploadKnowledgeFile();
  const queryMutation = useQueryKnowledge();

  const validateAndSetFile = useCallback((file: File | null) => {
    if (!file) {
      return;
    }
    if (!isAcceptedFile(file)) {
      window.alert("Only PDF and TXT files are supported.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      window.alert("File exceeds the 25 MB upload limit.");
      return;
    }
    setSelectedFile(file);
    setLastUpload(null);
    if (!title.trim()) {
      const stem = file.name.replace(/\.[^.]+$/, "");
      setTitle(stem);
    }
  }, [title]);

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    validateAndSetFile(file);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    validateAndSetFile(event.dataTransfer.files?.[0] ?? null);
  };

  const onUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }
    try {
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        scope,
        title: title.trim() || undefined,
        tags: tags.trim() || undefined,
      });
      setLastUpload(result);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      // Error surfaced via uploadMutation.error
    }
  };

  const onQuery = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = queryText.trim();
    if (!text) {
      return;
    }
    await queryMutation.mutateAsync({ query: text, scope: queryScope });
  };

  return (
    <ErrorBoundary>
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header>
          <div className="flex items-center gap-3">
            <BookOpen className="text-cyan-400" size={28} />
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">Knowledge Base</h1>
              <p className="text-sm text-slate-400">
                Upload PDF or TXT documents. They are chunked, embedded, and searchable via API or Slack{" "}
                <code className="rounded bg-slate-800 px-1 py-0.5 text-cyan-300">/ask</code>.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Upload size={18} className="text-cyan-400" />
              Upload Document
            </h2>

            <form onSubmit={onUpload} className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition ${
                  dragActive
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-slate-700 bg-slate-950 hover:border-slate-600"
                }`}
              >
                <FileText className="mx-auto mb-3 text-slate-400" size={36} />
                {selectedFile ? (
                  <>
                    <p className="font-medium text-slate-100">{selectedFile.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{formatFileSize(selectedFile.size)}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-slate-200">Drop a PDF or TXT file here</p>
                    <p className="mt-1 text-sm text-slate-400">or click to browse (max 25 MB)</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="hidden"
                  onChange={onFileInputChange}
                />
              </div>

              <div>
                <label htmlFor="kb-title" className="mb-1 block text-xs text-slate-400">
                  Title (optional)
                </label>
                <input
                  id="kb-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Defaults to filename"
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="kb-scope" className="mb-1 block text-xs text-slate-400">
                  Scope
                </label>
                <select
                  id="kb-scope"
                  value={scope}
                  onChange={(event) => setScope(event.target.value as KnowledgeDocumentScope)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="org">Organization</option>
                  <option value="team">Team</option>
                  <option value="personal">Personal</option>
                </select>
              </div>

              <div>
                <label htmlFor="kb-tags" className="mb-1 block text-xs text-slate-400">
                  Tags (optional, comma-separated)
                </label>
                <input
                  id="kb-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="hr, policy, onboarding"
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">Auto-tags are generated from document content if omitted.</p>
              </div>

              <button
                type="submit"
                disabled={!selectedFile || uploadMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadMutation.isPending ? (
                  <>
                    <LoadingSpinner size={18} />
                    <span>Uploading & indexing…</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Upload & Index</span>
                  </>
                )}
              </button>

              {uploadMutation.error ? (
                <p className="text-sm text-rose-400">{getErrorMessage(uploadMutation.error)}</p>
              ) : null}

              {lastUpload ? (
                <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="font-medium text-emerald-300">Upload successful</p>
                  <p className="mt-1 text-sm text-slate-300">
                    <span className="text-slate-400">Document:</span> {lastUpload.document_title}
                  </p>
                  <p className="text-sm text-slate-300">
                    <span className="text-slate-400">Chunks indexed:</span> {lastUpload.chunks_created}
                  </p>
                  {lastUpload.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lastUpload.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </form>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Search size={18} className="text-cyan-400" />
              Test Query
            </h2>

            <form onSubmit={onQuery} className="space-y-4">
              <div>
                <label htmlFor="kb-query" className="mb-1 block text-xs text-slate-400">
                  Question
                </label>
                <input
                  id="kb-query"
                  value={queryText}
                  onChange={(event) => setQueryText(event.target.value)}
                  placeholder="What is the leave policy?"
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="kb-query-scope" className="mb-1 block text-xs text-slate-400">
                  Scope
                </label>
                <select
                  id="kb-query-scope"
                  value={queryScope}
                  onChange={(event) => setQueryScope(event.target.value as KnowledgeDocumentScope)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="org">Organization</option>
                  <option value="team">Team</option>
                  <option value="personal">Personal</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!queryText.trim() || queryMutation.isPending}
                className="w-full rounded-lg bg-opssage-500 px-4 py-3 font-medium text-white transition hover:bg-opssage-500/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {queryMutation.isPending ? "Searching…" : "Ask Knowledge Base"}
              </button>

              {queryMutation.error ? (
                <p className="text-sm text-rose-400">{getErrorMessage(queryMutation.error)}</p>
              ) : null}

              {queryMutation.data ? (
                <div className="rounded border border-slate-700 bg-slate-950 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-cyan-400">Answer</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{queryMutation.data.answer}</p>
                  {queryMutation.data.sources.length > 0 ? (
                    <div className="mt-4 border-t border-slate-800 pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sources</p>
                      <ul className="mt-2 space-y-2">
                        {queryMutation.data.sources.map((source) => (
                          <li key={`${source.title}-${source.similarity_score}`} className="text-sm text-slate-300">
                            <span className="font-medium">{source.title}</span>
                            <span className="text-slate-500"> · {source.source_type}</span>
                            <span className="text-cyan-400"> · {Math.round(source.similarity_score * 100)}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </form>
          </section>
        </div>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Indexed Documents</h2>
            <span className="text-sm text-slate-400">{documentsQuery.data?.total ?? 0} total</span>
          </div>

          {documentsQuery.isLoading ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : null}

          {documentsQuery.error ? (
            <p className="text-sm text-rose-400">{getErrorMessage(documentsQuery.error)}</p>
          ) : null}

          {!documentsQuery.isLoading && !documentsQuery.error ? (
            documentsQuery.data?.items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Scope</th>
                      <th className="px-3 py-2">Tags</th>
                      <th className="px-3 py-2">Chunk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentsQuery.data.items.map((doc) => (
                      <tr key={doc.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                        <td className="px-3 py-3 font-medium text-slate-100">{doc.title}</td>
                        <td className="px-3 py-3 uppercase text-slate-400">{doc.source_type}</td>
                        <td className="px-3 py-3 capitalize text-slate-400">{doc.scope}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.slice(0, 4).map((tag) => (
                              <span
                                key={`${doc.id}-${tag}`}
                                className="rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-400">
                          {doc.chunk?.chunk_index != null && doc.chunk.chunk_total != null
                            ? `${doc.chunk.chunk_index + 1} / ${doc.chunk.chunk_total}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                No documents yet. Upload a PDF or TXT file to get started.
              </p>
            )
          ) : null}
        </section>
      </div>
    </ErrorBoundary>
  );
}
