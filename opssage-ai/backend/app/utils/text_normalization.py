"""Text normalization utilities."""
import re

def normalize_incident_text(text: str) -> str:
    """
    Normalize text for hashing and heuristic matching.
    - lowercase
    - strip
    - remove newlines
    - collapse repeated whitespace
    """
    if not text:
        return ""
    
    normalized = text.lower().strip()
    # Replace newlines and collapse multiple spaces into a single space
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized
