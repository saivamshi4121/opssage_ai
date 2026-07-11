"""FastAPI application entrypoint."""

from __future__ import annotations

import time
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.api import router as api_router
from app.api import integrations, webhooks
from app.api.knowledge import router as knowledge_router
from app.config import get_settings
from app.dependencies import init_db, get_embedding_service
from app.middleware.tenant import TenantMiddleware
from app.services.clustering_service import ClusteringService
from app.utils.exceptions import AppError
from app.utils.logger import configure_logging, get_logger

settings = get_settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Middleware for request id propagation and latency logging."""

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        """Wrap each request with structured request/response logging."""
        request_id = request.headers.get("x-request-id", str(uuid4()))
        request.state.request_id = request_id
        start_time = time.perf_counter()

        logger.info(
            "request_started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": str(request.url.path),
            },
        )
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["x-request-id"] = request_id
        logger.info(
            "request_completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": str(request.url.path),
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response


app = FastAPI(title=settings.app_name, debug=settings.debug, version="0.1.0")
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TenantMiddleware)
app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(knowledge_router, prefix="/api/knowledge", tags=["Knowledge"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
app.include_router(integrations.router, prefix="/integrations", tags=["integrations"])


@app.on_event("startup")
async def on_startup() -> None:
    """Warm dependencies and ensure baseline data readiness on boot."""
    startup_started_at = time.perf_counter()
    await init_db()
    embedding_service = get_embedding_service()
    model_started_at = time.perf_counter()
    await embedding_service.get_model()
    logger.info("startup_embedding_model_loaded", extra={"duration_ms": round((time.perf_counter() - model_started_at) * 1000, 2)})

    clustering_service = ClusteringService()
    created_clusters, clustered_incidents = await clustering_service.bootstrap_clusters_if_empty("default")
    if created_clusters > 0:
        logger.info(
            "startup_clusters_bootstrapped",
            extra={"created_clusters": created_clusters, "clustered_incidents": clustered_incidents},
        )

    logger.info("startup_completed", extra={"duration_ms": round((time.perf_counter() - startup_started_at) * 1000, 2)})


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Return domain-specific exception responses."""
    logger.warning(
        "application_error",
        extra={
            "request_id": getattr(request.state, "request_id", "n/a"),
            "path": str(request.url.path),
            "error_code": exc.error_code,
            "error_message": exc.message,
        },
    )
    return JSONResponse(status_code=exc.status_code, content=exc.to_response())


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation failures with structured output."""
    logger.warning(
        "validation_error",
        extra={
            "request_id": getattr(request.state, "request_id", "n/a"),
            "path": str(request.url.path),
            "errors": exc.errors(),
        },
    )
    return JSONResponse(status_code=422, content={"error": "validation_error", "details": exc.errors()})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle uncaught exceptions with safe internal error payload."""
    logger.exception(
        "unhandled_exception",
        extra={
            "request_id": getattr(request.state, "request_id", "n/a"),
            "path": str(request.url.path),
        },
    )
    return JSONResponse(status_code=500, content={"error": "internal_error", "message": "Internal server error."})


@app.on_event("shutdown")
async def on_shutdown() -> None:
    """Release shared resources on application shutdown."""
    return None


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    """Return empty response for favicon to silence 404s in logs."""
    return Response(status_code=204)


@app.get("/", tags=["meta"])
async def root() -> dict[str, str]:
    """Root endpoint for service metadata."""
    logger.info("root_endpoint_hit")
    return {"message": settings.app_name}
