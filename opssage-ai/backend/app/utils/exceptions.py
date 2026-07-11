"""Custom application exceptions and helpers."""

from fastapi import status


class AppError(Exception):
    """Base application exception for consistent API errors."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "internal_error"

    def __init__(self, message: str) -> None:
        """Initialize app error with a user-facing message."""
        super().__init__(message)
        self.message = message

    def to_response(self) -> dict[str, str]:
        """Convert exception to API response payload."""
        return {"error": self.error_code, "message": self.message}


class NotFoundError(AppError):
    """Raised when a requested resource is not found."""

    status_code = status.HTTP_404_NOT_FOUND
    error_code = "not_found"


class BadRequestError(AppError):
    """Raised for invalid client-provided payloads."""

    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "bad_request"


class UnauthorizedError(AppError):
    """Raised when request authentication fails."""

    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "unauthorized"


class ConflictError(AppError):
    """Raised when the request conflicts with existing state."""

    status_code = status.HTTP_409_CONFLICT
    error_code = "conflict"


class ServiceUnavailableError(AppError):
    """Raised for unavailable upstream integrations."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "service_unavailable"
