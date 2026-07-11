"""Domain validation helpers."""


def validate_incident_title(value: str) -> str:
    """Validate and normalize incident title input."""
    normalized = value.strip()
    if len(normalized) < 3:
        msg = "Incident title must be at least 3 characters long."
        raise ValueError(msg)
    return normalized
