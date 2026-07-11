"""Slack request signature verification helpers."""

from __future__ import annotations

import hashlib
import hmac
import time


def is_recent_slack_timestamp(timestamp_header: str, max_age_seconds: int = 300) -> bool:
    """Return True when timestamp is valid and within allowed age window."""
    try:
        ts = int(timestamp_header)
    except (TypeError, ValueError):
        return False
    return abs(time.time() - ts) <= max_age_seconds


def verify_slack_signature(signing_secret: str, timestamp_header: str, raw_body: bytes, signature_header: str) -> bool:
    """Validate Slack v0 HMAC signature over raw request body."""
    if not signing_secret or not signature_header or not is_recent_slack_timestamp(timestamp_header):
        return False
    base = f"v0:{timestamp_header}:".encode("utf-8") + raw_body
    digest = hmac.new(signing_secret.encode("utf-8"), base, hashlib.sha256).hexdigest()
    expected = f"v0={digest}"
    return hmac.compare_digest(expected, signature_header.strip())
