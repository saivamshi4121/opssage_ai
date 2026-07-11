"""Manual similarity quality and performance validation script.

Usage:
    python backend/scripts/test_similarity.py
"""

from __future__ import annotations

import asyncio
import sys
import time
from collections import Counter
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import get_settings  # noqa: E402
from app.dependencies import init_db  # noqa: E402
from app.services.cache_service import CacheService  # noqa: E402
from app.services.embedding_service import EmbeddingService  # noqa: E402
from app.services.incident_service import IncidentService  # noqa: E402

TEST_QUERIES = [
    "payment failed due to timeout",
    "database connection limit reached",
    "etl job failed after schema update",
    "redis memory full error",
]


async def run() -> None:
    """Execute similarity checks and print quality metrics."""
    _ = get_settings()
    await init_db()
    cache_service = CacheService()
    embedding_service = EmbeddingService(cache_service=cache_service)
    incident_service = IncidentService(embedding_service=embedding_service)

    for query in TEST_QUERIES:
        start = time.time()
        query_embedding = await embedding_service.generate_query_embedding(query)
        matches = await incident_service.match_by_embedding_vector(query_embedding, limit=5)
        duration_ms = (time.time() - start) * 1000

        print(f"\nQuery: {query}")
        print(f"Similarity search duration: {duration_ms:.2f}ms {'✅' if duration_ms < 200 else '⚠️'}")
        if not matches:
            print("No matches returned.")
            continue

        cluster_labels: list[str] = []
        for index, match in enumerate(matches, start=1):
            source = match.incident.root_cause or "unknown"
            cluster_labels.append(source)
            print(f"{index}. {match.incident.title}")
            print(f"   root cause: {source}")
            print(f"   similarity score: {match.similarity_score:.4f}")

        top_cluster, correct_count = Counter(cluster_labels).most_common(1)[0]
        marker = "✅" if correct_count >= 3 else "❌"
        print(f"Top cluster match: {correct_count}/5 correct {marker} ({top_cluster})")

    return None


if __name__ == "__main__":
    asyncio.run(run())
