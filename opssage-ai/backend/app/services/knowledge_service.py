"""Knowledge base CRUD and semantic retrieval service."""

from __future__ import annotations

import asyncio
import hashlib
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List

import numpy as np

from beanie import PydanticObjectId

from app.models.knowledge_document import (
    KnowledgeDocument,
    KnowledgeDocumentScope,
    KnowledgeDocumentSourceType,
)
from app.models.schema import KnowledgeDocumentChunkMeta, KnowledgeDocumentResponse
from app.services.cache_service import CacheService
from app.services.embedding_service import EmbeddingService
from app.utils.exceptions import BadRequestError, ServiceUnavailableError
from app.utils.keyword_extraction import extract_document_tags, merge_document_tags
from app.utils.logger import get_logger
from app.utils.tenant_scope import (
    knowledge_document_belongs_to_tenant,
    knowledge_document_scope_filter,
    scoped_and,
)

logger = get_logger(__name__)

DEFAULT_MIN_SIMILARITY = 0.5
QUERY_EMBEDDING_CACHE_TTL_SECONDS = 300
CHUNK_SIZE_CHARACTERS = 800
CHUNK_OVERLAP_CHARACTERS = 100
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_PDF_CHUNKS = 500
SUPPORTED_UPLOAD_EXTENSIONS = {".pdf", ".txt"}


@dataclass(slots=True)
class KnowledgeSearchHit:
    """Single semantic search result for a knowledge document."""

    document_id: str
    title: str
    content: str
    similarity_score: float
    source_type: str
    scope: str


@dataclass(slots=True)
class KnowledgeQuerySource:
    """Source attribution for a knowledge query answer."""

    title: str
    source_type: str
    similarity_score: float


@dataclass(slots=True)
class KnowledgeQueryResult:
    """Best-effort answer derived from stored organizational knowledge."""

    answer: str
    sources: list[KnowledgeQuerySource]


@dataclass(slots=True)
class PaginatedKnowledgeDocuments:
    """Container for paginated knowledge document listings."""

    items: list[KnowledgeDocumentResponse]
    total: int
    page: int
    page_size: int


@dataclass(slots=True)
class KnowledgeFileUploadResult:
    """Result of ingesting an uploaded knowledge file."""

    document_title: str
    chunks_created: int
    tags: list[str]
    status: str = "success"


class KnowledgeService:
    """Service for organizational knowledge document lifecycle and retrieval."""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        cache_service: CacheService | None = None,
    ) -> None:
        """Initialize service with embedding and optional cache dependencies."""
        self._embedding_service = embedding_service
        self._cache_service = cache_service or CacheService()

    async def create_document(
        self,
        tenant_id: str,
        title: str,
        content: str,
        source_type: KnowledgeDocumentSourceType,
        scope: KnowledgeDocumentScope,
        tags: list[str] | None = None,
        uploaded_by: str | None = None,
        chunk: KnowledgeDocumentChunkMeta | None = None,
    ) -> KnowledgeDocumentResponse:
        """Create and persist a knowledge document with a semantic embedding."""
        normalized_title = title.strip()
        normalized_content = content.strip()
        if not normalized_title:
            raise BadRequestError("Knowledge document title cannot be empty.")
        if not normalized_content:
            raise BadRequestError("Knowledge document content cannot be empty.")

        text_payload = f"{normalized_title}. {normalized_content}"
        embedding = await self._embedding_service.generate_embedding(text_payload)

        document = KnowledgeDocument(
            tenant_id=tenant_id,
            title=normalized_title,
            content=normalized_content,
            source_type=source_type,
            scope=scope,
            tags=tags or [],
            embedding=embedding,
            uploaded_by=uploaded_by,
            parent_document_id=chunk.parent_document_id if chunk else None,
            chunk_index=chunk.chunk_index if chunk else None,
            chunk_total=chunk.chunk_total if chunk else None,
        )
        await document.insert()
        logger.info(
            "knowledge_document_created",
            extra={
                "tenant_id": tenant_id,
                "document_id": str(document.id),
                "source_type": source_type,
                "scope": scope,
            },
        )
        return self._to_response(document)

    async def upload_file(
        self,
        tenant_id: str,
        filename: str,
        file_bytes: bytes,
        scope: KnowledgeDocumentScope,
        title: str | None = None,
        tags: list[str] | None = None,
        uploaded_by: str | None = None,
    ) -> KnowledgeFileUploadResult:
        """Ingest a PDF or TXT upload, chunk when needed, and persist with embeddings."""
        if not file_bytes:
            raise BadRequestError("Uploaded file is empty.")
        if len(file_bytes) > MAX_UPLOAD_BYTES:
            raise BadRequestError(f"Uploaded file exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit.")

        extension = Path(filename or "").suffix.lower()
        if extension not in SUPPORTED_UPLOAD_EXTENSIONS:
            raise BadRequestError("Only PDF and TXT uploads are supported.")

        document_title = (title or Path(filename).stem or "Untitled").strip()
        if not document_title:
            raise BadRequestError("Document title cannot be empty.")

        started_at = time.perf_counter()
        source_type: KnowledgeDocumentSourceType = "pdf" if extension == ".pdf" else "txt"

        if source_type == "txt":
            text = self._decode_txt(file_bytes)
        else:
            text = await self._extract_pdf_text(file_bytes)
            if not text:
                raise BadRequestError("PDF contains no extractable text.")

        auto_tags = await asyncio.to_thread(extract_document_tags, text, document_title)
        merged_tags = merge_document_tags(tags, auto_tags)
        logger.info(
            "knowledge_tags_generated",
            extra={
                "tenant_id": tenant_id,
                "document_title": document_title,
                "auto_tags": auto_tags,
                "merged_tags": merged_tags,
            },
        )

        if source_type == "txt":
            chunks_created = await self._ingest_text_chunks(
                tenant_id=tenant_id,
                document_title=document_title,
                chunks=[text],
                source_type=source_type,
                scope=scope,
                tags=merged_tags,
                uploaded_by=uploaded_by,
            )
        else:
            chunks = self._chunk_text(text)
            if not chunks:
                raise BadRequestError("PDF contains no extractable text.")
            if len(chunks) > MAX_PDF_CHUNKS:
                raise BadRequestError(f"PDF exceeds maximum supported chunk count ({MAX_PDF_CHUNKS}).")
            chunks_created = await self._ingest_text_chunks(
                tenant_id=tenant_id,
                document_title=document_title,
                chunks=chunks,
                source_type=source_type,
                scope=scope,
                tags=merged_tags,
                uploaded_by=uploaded_by,
            )

        logger.info(
            "knowledge_file_upload_completed",
            extra={
                "tenant_id": tenant_id,
                "document_title": document_title,
                "source_type": source_type,
                "scope": scope,
                "chunks_created": chunks_created,
                "tags": merged_tags,
                "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
            },
        )
        return KnowledgeFileUploadResult(
            document_title=document_title,
            chunks_created=chunks_created,
            tags=merged_tags,
            status="success",
        )

    async def search_documents(
        self,
        tenant_id: str,
        query: str,
        scope: KnowledgeDocumentScope,
        limit: int = 5,
    ) -> list[KnowledgeSearchHit]:
        """Find semantically similar knowledge documents for a tenant and scope."""
        normalized_query = query.strip()
        if not normalized_query:
            raise BadRequestError("Search query cannot be empty.")
        if limit < 1:
            raise BadRequestError("Limit must be >= 1.")

        started_at = time.perf_counter()
        query_embedding = await self._get_cached_query_embedding(normalized_query)
        query_vec = np.asarray(query_embedding, dtype=np.float32)
        query_norm = float(np.linalg.norm(query_vec))
        if query_norm == 0:
            raise BadRequestError("Embedding norm cannot be zero.")

        tenant_scope = knowledge_document_scope_filter(tenant_id)
        mongo_filter = scoped_and(tenant_scope, {"scope": scope})
        candidates = await KnowledgeDocument.find(
            scoped_and(mongo_filter, {"embedding": {"$ne": None}}),
        ).to_list()
        if not candidates:
            candidates = await KnowledgeDocument.find(mongo_filter).to_list()
        if not candidates:
            logger.info(
                "knowledge_search_no_candidates",
                extra={"tenant_id": tenant_id, "scope": scope},
            )
            return []

        scored: list[KnowledgeSearchHit] = []
        for document in candidates:
            score = await self._score_document(document, query_vec, query_norm)
            scored.append(
                KnowledgeSearchHit(
                    document_id=str(document.id),
                    title=document.title,
                    content=document.content,
                    similarity_score=round(score, 4),
                    source_type=document.source_type,
                    scope=document.scope,
                )
            )

        scored.sort(key=lambda hit: hit.similarity_score, reverse=True)
        results = scored[:limit]
        self._log_search_duration(started_at, tenant_id, len(results))
        logger.info(
            "knowledge_search_complete",
            extra={
                "tenant_id": tenant_id,
                "scope": scope,
                "query_length": len(normalized_query),
                "top_scores": [hit.similarity_score for hit in results[:3]],
            },
        )
        return results

    async def query_knowledge(
        self,
        tenant_id: str,
        query: str,
        scope: KnowledgeDocumentScope,
        min_similarity: float = DEFAULT_MIN_SIMILARITY,
        limit: int = 5,
    ) -> KnowledgeQueryResult:
        """Return the best answer from stored knowledge using semantic search."""
        import re

        max_unique_sources = 3
        max_answer_sentences = 3
        min_answer_sentences = 2
        search_pool_size = max(limit, 20)

        if not 0.0 <= min_similarity <= 1.0:
            raise BadRequestError("min_similarity must be between 0.0 and 1.0.")

        normalized_query = query.strip()
        if not normalized_query:
            raise BadRequestError("Search query cannot be empty.")

        def dedupe_hits_by_title(hits: list[KnowledgeSearchHit]) -> list[KnowledgeSearchHit]:
            """Keep the highest-scoring hit per document title."""
            best_by_title: dict[str, KnowledgeSearchHit] = {}
            for hit in hits:
                title_key = hit.title.strip().lower()
                existing = best_by_title.get(title_key)
                if existing is None or hit.similarity_score > existing.similarity_score:
                    best_by_title[title_key] = hit
            return sorted(best_by_title.values(), key=lambda item: item.similarity_score, reverse=True)

        def split_sentences(text: str) -> list[str]:
            """Split chunk text into candidate sentences."""
            parts = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
            sentences: list[str] = []
            for part in parts:
                cleaned = " ".join(part.split())
                if len(cleaned) >= 15:
                    sentences.append(cleaned)
            if not sentences and text.strip():
                sentences.append(" ".join(text.split()))
            return sentences

        async def compose_answer(primary_hit: KnowledgeSearchHit) -> str:
            """Pick the 2-3 most query-relevant sentences from the best matching chunk."""
            sentences = split_sentences(primary_hit.content)
            if not sentences:
                return "No relevant knowledge found."

            if len(sentences) <= max_answer_sentences:
                return " ".join(sentences)

            query_embedding = await self._get_cached_query_embedding(normalized_query)
            query_vec = np.asarray(query_embedding, dtype=np.float32)
            query_norm = float(np.linalg.norm(query_vec))
            if query_norm == 0:
                return " ".join(sentences[:max_answer_sentences])

            sentence_embeddings = await self._embedding_service.generate_batch(sentences)
            scored: list[tuple[float, int]] = []
            for index, embedding in enumerate(sentence_embeddings):
                sentence_vec = np.asarray(embedding, dtype=np.float32)
                score = self._cosine_similarity_np(query_vec, query_norm, sentence_vec)
                scored.append((score, index))

            scored.sort(key=lambda item: item[0], reverse=True)
            pick_count = min(max_answer_sentences, max(min_answer_sentences, len(scored)))
            top_indices = sorted(index for _, index in scored[:pick_count])
            return " ".join(sentences[index] for index in top_indices)

        hits = await self.search_documents(
            tenant_id=tenant_id,
            query=normalized_query,
            scope=scope,
            limit=search_pool_size,
        )
        qualified = [hit for hit in hits if hit.similarity_score >= min_similarity]
        if not qualified:
            logger.info(
                "knowledge_query_no_match",
                extra={
                    "tenant_id": tenant_id,
                    "scope": scope,
                    "min_similarity": min_similarity,
                },
            )
            return KnowledgeQueryResult(answer="No relevant knowledge found.", sources=[])

        unique_hits = dedupe_hits_by_title(qualified)[:max_unique_sources]
        best = unique_hits[0]
        answer = await compose_answer(best)
        sources = [
            KnowledgeQuerySource(
                title=hit.title,
                source_type=hit.source_type,
                similarity_score=hit.similarity_score,
            )
            for hit in unique_hits
        ]
        logger.info(
            "knowledge_query_answered",
            extra={
                "tenant_id": tenant_id,
                "scope": scope,
                "document_id": best.document_id,
                "similarity_score": best.similarity_score,
                "source_count": len(sources),
            },
        )
        return KnowledgeQueryResult(answer=answer, sources=sources)

    async def get_document(self, document_id: str, tenant_id: str) -> KnowledgeDocumentResponse | None:
        """Fetch a knowledge document by id scoped to tenant."""
        document = await self._get_document_in_tenant(document_id, tenant_id)
        if document is None:
            return None
        return self._to_response(document)

    async def list_documents(
        self,
        tenant_id: str,
        page: int = 1,
        page_size: int = 20,
        scope: KnowledgeDocumentScope | None = None,
        source_type: KnowledgeDocumentSourceType | None = None,
    ) -> PaginatedKnowledgeDocuments:
        """List tenant knowledge documents with optional filters."""
        page, page_size = self._validate_pagination(page, page_size)
        filters: list[dict] = [knowledge_document_scope_filter(tenant_id)]
        if scope is not None:
            filters.append({"scope": scope})
        if source_type is not None:
            filters.append({"source_type": source_type})

        mongo_filter = scoped_and(*filters)
        query = KnowledgeDocument.find(mongo_filter)
        total = await query.count()
        rows = await (
            KnowledgeDocument.find(mongo_filter)
            .sort("-created_at")
            .skip((page - 1) * page_size)
            .limit(page_size)
            .to_list()
        )
        return PaginatedKnowledgeDocuments(
            items=[self._to_response(row) for row in rows],
            total=int(total),
            page=page,
            page_size=page_size,
        )

    async def _get_document_in_tenant(self, document_id: str, tenant_id: str) -> KnowledgeDocument | None:
        """Load document by id scoped to tenant (invalid ids yield ``None``)."""
        try:
            oid = PydanticObjectId(document_id)
        except Exception:
            return None
        query = scoped_and(knowledge_document_scope_filter(tenant_id), {"_id": oid})
        document = await KnowledgeDocument.find(query).first_or_none()
        if document is None:
            return None
        if not knowledge_document_belongs_to_tenant(document, tenant_id):
            return None
        return document

    async def _ingest_text_chunks(
        self,
        tenant_id: str,
        document_title: str,
        chunks: list[str],
        source_type: KnowledgeDocumentSourceType,
        scope: KnowledgeDocumentScope,
        tags: list[str] | None,
        uploaded_by: str | None,
    ) -> int:
        """Persist one or more text chunks with embeddings."""
        normalized_chunks = [chunk.strip() for chunk in chunks if chunk.strip()]
        if not normalized_chunks:
            raise BadRequestError("Document contains no usable text.")

        chunk_total = len(normalized_chunks)
        embedding_inputs = [f"{document_title}. {chunk}" for chunk in normalized_chunks]
        embeddings = await self._embedding_service.generate_batch(embedding_inputs)

        created = 0
        for index, (chunk, embedding) in enumerate(zip(normalized_chunks, embeddings, strict=True)):
            document = KnowledgeDocument(
                tenant_id=tenant_id,
                title=document_title,
                content=chunk,
                source_type=source_type,
                scope=scope,
                tags=tags or [],
                embedding=embedding,
                uploaded_by=uploaded_by,
                chunk_index=index if chunk_total > 1 else None,
                chunk_total=chunk_total if chunk_total > 1 else None,
            )
            await document.insert()
            created += 1

        logger.info(
            "knowledge_file_chunks_persisted",
            extra={
                "tenant_id": tenant_id,
                "document_title": document_title,
                "chunks_created": created,
                "source_type": source_type,
                "tags": tags or [],
            },
        )
        return created

    @staticmethod
    def _decode_txt(file_bytes: bytes) -> str:
        """Decode TXT bytes as UTF-8 with graceful fallback."""
        for encoding in ("utf-8", "utf-8-sig", "latin-1"):
            try:
                text = file_bytes.decode(encoding).strip()
                if text:
                    return text
            except UnicodeDecodeError:
                continue
        raise BadRequestError("Unable to decode TXT file as text.")

    @staticmethod
    async def _extract_pdf_text(file_bytes: bytes) -> str:
        """Extract text from a PDF using PyMuPDF in a worker thread."""
        def _extract() -> str:
            try:
                import fitz
            except ImportError as exc:
                raise ServiceUnavailableError(
                    "PyMuPDF is unavailable. Install pymupdf to ingest PDF files.",
                ) from exc

            document = None
            try:
                document = fitz.open(stream=file_bytes, filetype="pdf")
            except Exception as exc:
                raise BadRequestError("Unable to parse PDF file.") from exc

            parts: list[str] = []
            try:
                for page in document:
                    page_text = page.get_text("text").strip()
                    if page_text:
                        parts.append(page_text)
            except Exception as exc:
                raise BadRequestError("Unable to extract text from PDF pages.") from exc
            finally:
                if document is not None:
                    document.close()

            return "\n".join(parts).strip()

        return await asyncio.to_thread(_extract)

    @staticmethod
    def _chunk_text(
        text: str,
        chunk_size: int = CHUNK_SIZE_CHARACTERS,
        overlap: int = CHUNK_OVERLAP_CHARACTERS,
    ) -> list[str]:
        """Split text into overlapping fixed-size chunks."""
        normalized = " ".join(text.split())
        if not normalized:
            return []
        if len(normalized) <= chunk_size:
            return [normalized]
        if overlap >= chunk_size:
            raise BadRequestError("Chunk overlap must be smaller than chunk size.")

        chunks: list[str] = []
        start = 0
        while start < len(normalized):
            end = start + chunk_size
            piece = normalized[start:end].strip()
            if piece:
                chunks.append(piece)
            if end >= len(normalized):
                break
            start = end - overlap
        return chunks

    async def _get_cached_query_embedding(self, query: str) -> List[float]:
        """Return query embedding, using Redis cache when available."""
        cache_key = f"knowledge:query_emb:{hashlib.sha256(query.encode('utf-8')).hexdigest()}"
        cached = await self._cache_service.get(cache_key)
        if cached is not None:
            logger.info("knowledge_query_embedding_cache_hit", extra={"cache_key": cache_key})
            return cached

        embedding = await self._embedding_service.generate_query_embedding(query)
        await self._cache_service.set(cache_key, embedding, ttl=QUERY_EMBEDDING_CACHE_TTL_SECONDS)
        return embedding

    async def _score_document(
        self,
        document: KnowledgeDocument,
        query_vec: np.ndarray,
        query_norm: float,
    ) -> float:
        """Score a document against a query vector, generating embeddings when missing."""
        if document.embedding is not None:
            candidate_vec = np.asarray(document.embedding, dtype=np.float32)
        else:
            text_payload = f"{document.title}. {document.content}"
            candidate_embedding = await self._embedding_service.generate_embedding(text_payload)
            candidate_vec = np.asarray(candidate_embedding, dtype=np.float32)
            logger.info(
                "knowledge_document_embedding_generated_on_search",
                extra={"document_id": str(document.id)},
            )
        return self._cosine_similarity_np(query_vec, query_norm, candidate_vec)

    @staticmethod
    def _cosine_similarity_np(left: np.ndarray, left_norm: float, right: np.ndarray) -> float:
        """Compute normalized cosine similarity and clamp to [0, 1]."""
        if left.shape != right.shape:
            return 0.0
        right_norm = float(np.linalg.norm(right))
        if right_norm == 0:
            return 0.0
        raw = float(np.dot(left, right) / (left_norm * right_norm))
        return max(0.0, min(1.0, (raw + 1.0) / 2.0))

    def _log_search_duration(self, started_at: float, tenant_id: str, result_count: int) -> None:
        """Log search duration and warn when over target latency."""
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        extra = {"tenant_id": tenant_id, "duration_ms": duration_ms, "result_count": result_count}
        if duration_ms > 500:
            logger.warning("knowledge_search_slow", extra=extra)
        else:
            logger.info("knowledge_search_duration", extra=extra)

    @staticmethod
    def _validate_pagination(page: int, page_size: int) -> tuple[int, int]:
        """Validate and normalize pagination args."""
        if page < 1:
            raise BadRequestError("Page must be >= 1.")
        if page_size < 1 or page_size > 100:
            raise BadRequestError("Page size must be between 1 and 100.")
        return page, page_size

    @staticmethod
    def _to_response(document: KnowledgeDocument) -> KnowledgeDocumentResponse:
        """Map KnowledgeDocument to API response schema."""
        chunk: KnowledgeDocumentChunkMeta | None = None
        if (
            document.parent_document_id is not None
            or document.chunk_index is not None
            or document.chunk_total is not None
        ):
            chunk = KnowledgeDocumentChunkMeta(
                parent_document_id=document.parent_document_id,
                chunk_index=document.chunk_index,
                chunk_total=document.chunk_total,
            )
        return KnowledgeDocumentResponse(
            id=str(document.id),
            tenant_id=document.tenant_id,
            title=document.title,
            content=document.content,
            source_type=document.source_type,
            scope=document.scope,
            tags=document.tags,
            uploaded_by=document.uploaded_by,
            chunk=chunk,
            created_at=document.created_at,
            updated_at=document.updated_at,
        )

    # Example usage:
    #
    # cache_service = CacheService()
    # embedding_service = EmbeddingService(cache_service=cache_service)
    # knowledge_service = KnowledgeService(embedding_service, cache_service)
    #
    # doc = await knowledge_service.create_document(
    #     tenant_id="acme-corp",
    #     title="Payment gateway runbook",
    #     content="When Stripe webhooks lag, check the retry queue...",
    #     source_type="slack",
    #     scope="team",
    #     tags=["payments", "on-call"],
    #     uploaded_by="U01234567",
    # )
    #
    # hits = await knowledge_service.search_documents(
    #     tenant_id="acme-corp",
    #     query="stripe webhook delay",
    #     scope="team",
    #     limit=5,
    # )
    #
    # answer = await knowledge_service.query_knowledge(
    #     tenant_id="acme-corp",
    #     query="how do I fix payment timeouts?",
    #     scope="team",
    #     min_similarity=0.55,
    # )
