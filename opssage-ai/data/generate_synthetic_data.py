"""Generate synthetic incidents for local development."""

from __future__ import annotations

import json
from pathlib import Path


def main() -> None:
    """Create an empty synthetic data placeholder file."""
    output_path = Path(__file__).parent / "incidents_seed.json"
    output_path.write_text(json.dumps([], indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
