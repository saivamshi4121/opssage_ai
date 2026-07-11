"""LLM usage persistence for cost and volume tracking."""

from __future__ import annotations

from datetime import datetime

from beanie import Document
from pydantic import Field


class UsageLog(Document):
    """Per-call LLM usage metrics."""

    company_id: str = "default"
    endpoint: str
    tokens_input: int = 0
    tokens_output: int = 0
    total_tokens: int = 0
    cost_estimate_usd: float = 0.0
    model: str = ""
    latency_ms: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "usage_logs"
        indexes = ["company_id", "timestamp", "endpoint"]

    @staticmethod
    def calculate_cost(input_tokens: int, output_tokens: int, model: str) -> float:
        """Claude Sonnet–style pricing (USD per 1M tokens). Adjust when models change."""
        rates = {
            "claude-sonnet": {"input": 3.00, "output": 15.00},
            "default": {"input": 3.00, "output": 15.00},
        }
        key = next((k for k in rates if k in model.lower()), "default")
        r = rates[key]
        return round(
            (input_tokens / 1_000_000 * r["input"]) + (output_tokens / 1_000_000 * r["output"]),
            6,
        )
