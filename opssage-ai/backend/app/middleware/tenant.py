"""Resolve tenant (company) scope from each request."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class TenantMiddleware(BaseHTTPMiddleware):
    """Attach ``company_id`` to ``request.state`` for downstream dependencies."""

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        raw = (
            request.headers.get("X-Company-ID")
            or request.headers.get("x-company-id")
            or request.query_params.get("company_id")
            or "default"
        )
        request.state.company_id = (raw.strip() if isinstance(raw, str) else "default") or "default"
        return await call_next(request)
