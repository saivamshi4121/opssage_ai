"""Ranking helpers for incident similarity and feedback signals."""

from __future__ import annotations

from datetime import datetime

from app.models.schema import SimilarIncident


def smart_rank_incidents(
    incidents: list[SimilarIncident],
    max_helpful: int,
    *,
    now: datetime | None = None,
) -> list[SimilarIncident]:
    """Blend embedding similarity, helpful votes, and recency into a single ranking score.

    ``similarity_score`` on each input item must be the raw semantic similarity in [0, 1].
    Output items are the same incidents with ``similarity_score`` replaced by the composite score.
    """
    reference = now or datetime.utcnow()
    helpful_denominator = max(max_helpful, 1)

    scored: list[tuple[SimilarIncident, float]] = []
    for item in incidents:
        helpful_weight = item.helpful_count / helpful_denominator

        created = item.created_at
        if created is None:
            recency_weight = 0.0
        else:
            delta_days = max(0.0, (reference - created).total_seconds() / 86400.0)
            if delta_days >= 365.0:
                recency_weight = 0.0
            else:
                recency_weight = 1.0 - (delta_days / 365.0)

        composite = (
            (0.6 * item.similarity_score)
            + (0.3 * helpful_weight)
            + (0.1 * recency_weight)
        )
        composite = max(0.0, min(1.0, composite))
        scored.append((item, composite))

    scored.sort(key=lambda pair: pair[1], reverse=True)
    return [pair[0].model_copy(update={"similarity_score": round(pair[1], 4)}) for pair in scored]
