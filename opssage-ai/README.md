# OpsSage AI

Production-grade incident intelligence for faster root-cause discovery and reliable runbooks.

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue)](https://www.python.org/downloads/release/python-311/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow)](#license)

## Problem Statement

Incident response is often slowed down by inconsistent data, scattered logs, and time-consuming manual triage. Teams can spend valuable time answering questions like:

- “What is the likely root cause?”
- “Which incidents are similar to this one?”
- “What runbook steps should we follow to resolve it quickly?”

OpsSage AI provides a single workflow that combines clustering, semantic similarity search, and LLM-assisted analysis to reduce time-to-diagnosis and improve operational reliability.

## Solution Overview

OpsSage AI consists of:

- A FastAPI backend that ingests incident records, maintains cluster groupings, and performs hybrid search (keyword + embedding similarity).
- A React + TypeScript frontend that drives demo flows (analysis cards, runbook steps, and similar-incident navigation).
- Redis caching for embedding/query acceleration and analysis response caching to make demos instantly repeatable.

```
                     ┌────────────────────────────┐
                     │         Browser/Client    │
                     │ React + Router + Query     │
                     └──────────────┬─────────────┘
                                    │ REST (Axios)
                                    ▼
                     ┌────────────────────────────┐
                     │        FastAPI Backend     │
                     │  API Routes + Middleware    │
                     └───┬──────────────┬────────┘
                         │              │
                         ▼              ▼
               ┌────────────────┐  ┌────────────────┐
               │ IncidentService│  │  LLMService     │
               │ embeddings +    │  │ Claude prompts  │
               │ search + CRUD  │  │ parsing +      │
               │                │  │ confidence      │
               └───────┬────────┘  └───────┬────────┘
                       │                         │
                       ▼                         ▼
              ┌──────────────────┐     ┌──────────────────┐
              │        Redis      │     │ Vector/Embeddings│
              │ (caches + TTL)   │     │ (sentence-transformers)│
              └──────────────────┘     └──────────────────┘
                       ▲                         │
                       │                         ▼
                       │              ┌──────────────────┐
                       └────────────► │   DB (SQLite/PG)│
                                      └──────────────────┘
```

## Live Demo

Demo GIF placeholder:

> [![OpsSage demo](docs/gifs/demo-payment-timeout.gif)](docs/gifs/demo-payment-timeout.gif)

### Payment Timeout Demo Scenario Walkthrough

This is the target scenario used across the demo reliability endpoints.

1. Start the stack locally:
   - `cd opssage-ai`
   - `make dev`
2. Seed incident data:
   - `make seed`
3. (Optional but recommended) Preload embeddings + demo analysis cache:
   - `GET http://localhost:8000/api/demo/preload`
   - This is available when `DEBUG=true` in backend env.
4. In the UI, go to **Incident Search** and paste:
   - `payment processing timeout`
5. Click **Analyze** and observe:
   - **Pattern Detected** card
   - **Root Causes Ranked** card (ranked list + confidence)
   - **Recommended Runbook** card (numbered steps)
   - **Similar Incidents** panel for navigation to related postmortems

#### Expected Output (example shape)

When LLM credentials are missing (or an upstream call fails), the backend may serve a cached fallback response for the demo context. A typical response looks like:

```json
{
  "summary": "Payment requests are timing out at the upstream gateway under peak load.",
  "root_cause": "payment_gateway_timeout",
  "confidence_score": 82,
  "suggested_runbook_steps": [
    "Fail over to backup payment provider.",
    "Reduce retry concurrency and enable backoff.",
    "Coordinate with gateway status team."
  ]
}
```

Notes:
- Your exact confidence and phrasing can vary depending on model availability and runtime conditions.
- The demo preload endpoint is designed to make repeated judge runs consistent and fast.

## Quick Start

### Prerequisites

- Python 3.11
- Node.js 18
- Docker + Docker Compose

### Option A: Docker Compose

From the repo:

```bash
cd opssage-ai
make dev
```

Once containers are up:

```bash
make seed
```

### Option B: Manual Setup

#### Backend

```bash
cd opssage-ai/backend
python -m venv .venv
source .venv/bin/activate  # (Windows: .venv\\Scripts\\activate)
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd opssage-ai/frontend
npm install
npm run dev
```

### Seeding

Seed via API-first workflow:

```bash
python backend/data/seed_data.py
```

Or via Docker helper:

```bash
make seed
```

## API Reference

Base prefix: `/api`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Basic health check |
| `GET` | `/health/detailed` | DB/cache/LLM health detail |
| `POST` | `/incidents` | Create an incident |
| `GET` | `/incidents` | List incidents (pagination + optional search) |
| `GET` | `/incidents/{id}` | Incident detail |
| `PUT` | `/incidents/{id}` | Update an incident |
| `DELETE` | `/incidents/{id}` | Delete an incident (204) |
| `GET` | `/incidents/{id}/similar` | Similar incidents ranked by embedding similarity |
| `POST` | `/incidents/bulk-import` | Bulk import incidents (multipart JSON/CSV upload) |
| `GET` | `/clusters` | List clusters |
| `GET` | `/clusters/{id}` | Cluster details |
| `GET` | `/clusters/{id}/incidents` | Incidents within a cluster (pagination) |
| `POST` | `/clusters/recompute` | Trigger cluster recomputation/bootstrap |
| `POST` | `/analysis/root-causes` | Root-cause analysis (cached for demo reliability) |
| `POST` | `/analysis/runbook` | Runbook generation for an incident |
| `GET` | `/analysis/trending` | Trending root causes |
| `GET` | `/demo/preload` | Dev-only: preload embeddings + demo analysis cache |
| `GET` | `/demo/reset` | Dev-only: clear DB and reseed for repeatable judge runs |
| `GET` | `/` | Service metadata |

## Tech Stack

| Area | Technology |
|---|---|
| Backend | FastAPI (async), Pydantic, SQLAlchemy Async |
| Data | SQLite local dev; Render managed Postgres in production |
| Caching | Redis (embedding cache + analysis response caching) |
| Embeddings | sentence-transformers (lazy-load, cached) |
| LLM | Anthropic Claude integration (optional; demo fallback when unavailable) |
| Frontend | React 18, TypeScript, React Router v6 |
| Data fetching | TanStack React Query v5 |
| Visualization | Recharts (scatter/bubble chart) |
| Styling | Tailwind CSS (dark mode via class strategy) |

## Architecture Diagram

```
 React App (Vercel)
        │
        ▼
 REST API (FastAPI)
        │
        ├────────── Redis (caching + TTL)
        │
        ├────────── DB (SQLite locally / Postgres on Render)
        │
        ├────────── Embeddings (sentence-transformers)
        │
        └────────── LLM (Claude) -> root cause + runbook
```

## Performance Metrics

Targets (practical demo goals; cached flows improve repeat runs):

| Endpoint | Target Latency |
|---|---:|
| `GET /api/health` | < 50ms |
| `GET /api/health/detailed` | < 150ms |
| `GET /api/incidents/{id}` | < 150ms |
| `GET /api/incidents/{id}/similar` | < 200ms after preload |
| `POST /api/analysis/root-causes` | < 200ms after caching |
| `POST /api/analysis/runbook` | < 400ms (LLM-dependent) |
| `GET /api/clusters` | < 200ms |

## Future Roadmap

- Slack integration for automatic incident digests and runbook prompts.
- Multi-tenancy (per-team storage isolation and access control).
- ML impact prediction (blast radius + resolution time estimation).
- Improved embedding + pgvector persistence for fully scalable semantic retrieval.

## Team

OpsSage AI is an open, production-minded project. Placeholder team section—add maintainers and contributors here.

## License

MIT. See `LICENSE` for details.
