"""Organizational knowledge base API endpoints."""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from app.config import Settings
from app.dependencies import get_app_settings, get_company_id, get_cache_service, get_embedding_service
from app.models.knowledge_document import KnowledgeDocumentScope, KnowledgeDocumentSourceType
from app.models.schema import (
    KnowledgeDocumentCreate,
    KnowledgeDocumentResponse,
    KnowledgeFileUploadResponse,
    KnowledgeQueryRequest,
    KnowledgeQueryResponse,
    KnowledgeQuerySourceResponse,
    PaginatedKnowledgeDocumentsResponse,
)
from app.services.knowledge_service import KnowledgeService
from app.utils.exceptions import BadRequestError, NotFoundError
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


def _build_knowledge_service(settings: Settings) -> KnowledgeService:
    """Build knowledge service with shared embedding dependencies."""
    _ = settings
    return KnowledgeService(
        embedding_service=get_embedding_service(),
        cache_service=get_cache_service(),
    )


@router.post(
    "/upload",
    response_model=KnowledgeDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a knowledge document",
    description="Create and index a knowledge document with a semantic embedding for the current tenant.",
)
async def upload_knowledge_document(
    payload: KnowledgeDocumentCreate,
    tenant_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> KnowledgeDocumentResponse:
    """Upload and index a knowledge document.

    Example:
        POST /api/knowledge/upload
    """
    started_at = time.perf_counter()
    service = _build_knowledge_service(settings)
    result = await service.create_document(
        tenant_id=tenant_id,
        title=payload.title,
        content=payload.content,
        source_type=payload.source_type,
        scope=payload.scope,
        tags=payload.tags,
        uploaded_by=payload.uploaded_by,
        chunk=payload.chunk,
    )
    logger.info(
        "knowledge_upload_completed",
        extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)},
    )
    return result


@router.post(
    "/upload-file",
    response_model=KnowledgeFileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF or TXT knowledge file",
    description="Extract text from PDF/TXT uploads, chunk PDFs, embed, and store tenant-scoped knowledge documents.",
)
async def upload_knowledge_file(
    file: UploadFile = File(..., description="PDF or TXT file to ingest"),
    scope: KnowledgeDocumentScope = Form(..., description="Visibility scope for ingested content"),
    title: str | None = Form(default=None, description="Optional document title (defaults to filename)"),
    tags: str | None = Form(default=None, description="Optional comma-separated tags"),
    uploaded_by: str | None = Form(default=None, description="Optional uploader identifier"),
    tenant_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> KnowledgeFileUploadResponse:
    """Upload and ingest a PDF or TXT file into the knowledge base.

    Example:
        POST /api/knowledge/upload-file (multipart/form-data)
    """
    started_at = time.perf_counter()
    filename = file.filename or "upload.txt"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in {"pdf", "txt"}:
        raise BadRequestError("Only PDF and TXT uploads are supported.")

    file_bytes = await file.read()
    parsed_tags = [tag.strip() for tag in (tags or "").split(",") if tag.strip()]
    service = _build_knowledge_service(settings)
    result = await service.upload_file(
        tenant_id=tenant_id,
        filename=filename,
        file_bytes=file_bytes,
        scope=scope,
        title=title,
        tags=parsed_tags,
        uploaded_by=uploaded_by,
    )
    logger.info(
        "knowledge_upload_file_completed",
        extra={
            "tenant_id": tenant_id,
            "uploaded_filename": filename,
            "chunks_created": result.chunks_created,
            "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
        },
    )
    return KnowledgeFileUploadResponse(
        document_title=result.document_title,
        chunks_created=result.chunks_created,
        tags=result.tags,
        status=result.status,
    )


@router.post(
    "/query",
    response_model=KnowledgeQueryResponse,
    summary="Query the knowledge base",
    description="Return the best matching answer and supporting sources using semantic similarity.",
)
async def query_knowledge_base(
    payload: KnowledgeQueryRequest,
    tenant_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> KnowledgeQueryResponse:
    """Query organizational knowledge with semantic search.

    Example:
        POST /api/knowledge/query
    """
    started_at = time.perf_counter()
    service = _build_knowledge_service(settings)
    result = await service.query_knowledge(
        tenant_id=tenant_id,
        query=payload.query,
        scope=payload.scope,
        min_similarity=payload.min_similarity,
        limit=payload.limit,
    )
    logger.info(
        "knowledge_query_completed",
        extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)},
    )
    return KnowledgeQueryResponse(
        answer=result.answer,
        sources=[
            KnowledgeQuerySourceResponse(
                title=source.title,
                source_type=source.source_type,  # type: ignore[arg-type]
                similarity_score=source.similarity_score,
            )
            for source in result.sources
        ],
    )


@router.get(
    "",
    response_model=PaginatedKnowledgeDocumentsResponse,
    summary="List knowledge documents",
    description="List tenant-scoped knowledge documents with optional scope and source_type filters.",
)
async def list_knowledge_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    scope: KnowledgeDocumentScope | None = Query(default=None),
    source_type: KnowledgeDocumentSourceType | None = Query(default=None),
    tenant_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> PaginatedKnowledgeDocumentsResponse:
    """List knowledge documents with pagination.

    Example:
        GET /api/knowledge?page=1&page_size=20&scope=org
    """
    started_at = time.perf_counter()
    service = _build_knowledge_service(settings)
    data = await service.list_documents(
        tenant_id=tenant_id,
        page=page,
        page_size=page_size,
        scope=scope,
        source_type=source_type,
    )
    logger.info(
        "knowledge_list_completed",
        extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)},
    )
    return PaginatedKnowledgeDocumentsResponse(
        items=data.items,
        total=data.total,
        page=data.page,
        page_size=data.page_size,
    )


@router.get(
    "/{document_id}",
    response_model=KnowledgeDocumentResponse,
    summary="Get a knowledge document",
    description="Fetch a single knowledge document by identifier within the current tenant.",
)
async def get_knowledge_document(
    document_id: str,
    tenant_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> KnowledgeDocumentResponse:
    """Fetch knowledge document details by identifier.

    Example:
        GET /api/knowledge/{document_id}
    """
    started_at = time.perf_counter()
    service = _build_knowledge_service(settings)
    document = await service.get_document(document_id, tenant_id=tenant_id)
    if document is None:
        raise NotFoundError(f"Knowledge document '{document_id}' not found.")
    logger.info(
        "knowledge_get_completed",
        extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)},
    )
    return document
