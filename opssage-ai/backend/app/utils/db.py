"""Database utility helpers for local development workflows."""

from __future__ import annotations

from app.config import get_settings

from pymongo import MongoClient


def reset_db() -> None:
    """Drop MongoDB collections for local reset flows."""
    settings = get_settings()

    client = MongoClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]

    # Collection names must match Beanie Document.Settings.name
    for name in ("incidents", "clusters", "root_causes", "knowledge_documents"):
        db.drop_collection(name)
