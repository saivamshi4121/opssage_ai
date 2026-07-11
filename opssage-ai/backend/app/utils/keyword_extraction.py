"""Lightweight local keyword extraction for knowledge document tagging."""

from __future__ import annotations

import re
from collections import Counter

MIN_AUTO_TAGS = 5
MAX_AUTO_TAGS = 10
MIN_TOKEN_LENGTH = 3
MAX_TOKEN_LENGTH = 32
TITLE_TOKEN_WEIGHT = 3

# Common English stop words (local list; no external NLP APIs).
ENGLISH_STOP_WORDS = frozenset(
    {
        "a",
        "about",
        "above",
        "after",
        "again",
        "against",
        "all",
        "am",
        "an",
        "and",
        "any",
        "are",
        "as",
        "at",
        "be",
        "because",
        "been",
        "before",
        "being",
        "below",
        "between",
        "both",
        "but",
        "by",
        "can",
        "could",
        "did",
        "do",
        "does",
        "doing",
        "down",
        "during",
        "each",
        "few",
        "for",
        "from",
        "further",
        "had",
        "has",
        "have",
        "having",
        "he",
        "her",
        "here",
        "hers",
        "herself",
        "him",
        "himself",
        "his",
        "how",
        "i",
        "if",
        "in",
        "into",
        "is",
        "it",
        "its",
        "itself",
        "just",
        "me",
        "more",
        "most",
        "my",
        "myself",
        "no",
        "nor",
        "not",
        "now",
        "of",
        "off",
        "on",
        "once",
        "only",
        "or",
        "other",
        "our",
        "ours",
        "ourselves",
        "out",
        "over",
        "own",
        "same",
        "she",
        "should",
        "so",
        "some",
        "such",
        "than",
        "that",
        "the",
        "their",
        "theirs",
        "them",
        "themselves",
        "then",
        "there",
        "these",
        "they",
        "this",
        "those",
        "through",
        "to",
        "too",
        "under",
        "until",
        "up",
        "very",
        "was",
        "we",
        "were",
        "what",
        "when",
        "where",
        "which",
        "while",
        "who",
        "whom",
        "why",
        "will",
        "with",
        "would",
        "you",
        "your",
        "yours",
        "yourself",
        "yourselves",
        # Document boilerplate frequently found in PDFs.
        "page",
        "section",
        "chapter",
        "document",
        "table",
        "figure",
        "appendix",
        "version",
        "copyright",
        "reserved",
        "rights",
    }
)

_TOKEN_PATTERN = re.compile(r"\b[a-z][a-z0-9'-]{2,}\b")


def _tokenize(text: str) -> list[str]:
    """Extract lowercase alphanumeric tokens from text."""
    tokens: list[str] = []
    for match in _TOKEN_PATTERN.finditer(text.lower()):
        token = match.group(0).strip("-'")
        if MIN_TOKEN_LENGTH <= len(token) <= MAX_TOKEN_LENGTH and token not in ENGLISH_STOP_WORDS:
            if not token.isdigit():
                tokens.append(token)
    return tokens


def extract_document_tags(
    content: str,
    title: str | None = None,
    min_tags: int = MIN_AUTO_TAGS,
    max_tags: int = MAX_AUTO_TAGS,
) -> list[str]:
    """Extract top meaningful tags from document content using local keyword scoring."""
    if max_tags < 1:
        return []
    min_tags = max(1, min(min_tags, max_tags))

    scores: Counter[str] = Counter()
    for token in _tokenize(content):
        scores[token] += 1
    for token in _tokenize(title or ""):
        scores[token] += TITLE_TOKEN_WEIGHT

    if not scores:
        return []

    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    selected = [token for token, _ in ranked[:max_tags]]

    if len(selected) < min_tags:
        return selected
    return selected[:max(min_tags, min(len(selected), max_tags))]


def merge_document_tags(
    user_tags: list[str] | None,
    auto_tags: list[str],
    max_tags: int = MAX_AUTO_TAGS,
) -> list[str]:
    """Merge user-provided tags with auto-generated tags, preserving order and deduplicating."""
    merged: list[str] = []
    seen: set[str] = set()

    for raw_tag in (user_tags or []) + auto_tags:
        tag = raw_tag.strip().lower()
        if not tag or tag in seen:
            continue
        seen.add(tag)
        merged.append(tag)
        if len(merged) >= max_tags:
            break
    return merged
