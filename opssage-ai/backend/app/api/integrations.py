"""Third-party product integrations (Slack, etc.)."""

from __future__ import annotations

import asyncio
import time
import json
from urllib.parse import parse_qs

import requests
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

import httpx
from app.config import Settings
from app.dependencies import get_app_settings, get_company_id
from app.models.knowledge_document import KnowledgeDocumentScope
from app.models.schema import IncidentCreate, SimilarIncident, IncidentFeedback
from app.services.cache_service import CacheService
from app.services.embedding_service import EmbeddingService
from app.services.incident_service import IncidentService
from app.services.knowledge_service import KnowledgeService, KnowledgeQueryResult
from app.services.llm_service import LLMService
from app.utils.logger import get_logger
from app.utils.slack_verify import is_recent_slack_timestamp, verify_slack_signature

router = APIRouter()
logger = get_logger(__name__)

_SLACK_ANALYSIS_BUDGET_SECONDS = 2.5
_DEDUP_TTL_SECONDS = 120
_slack_request_dedup: dict[str, float] = {}
_slack_delivery_guard: dict[str, float] = {}


def _build_incident_service(settings: Settings) -> IncidentService:
    _ = settings
    cache_service = CacheService()
    embedding_service = EmbeddingService(cache_service=cache_service)
    return IncidentService(embedding_service=embedding_service)


def _build_llm_service(settings: Settings) -> LLMService:
    _ = settings
    return LLMService()


def _build_knowledge_service(settings: Settings) -> KnowledgeService:
    _ = settings
    cache_service = CacheService()
    embedding_service = EmbeddingService(cache_service=cache_service)
    return KnowledgeService(embedding_service=embedding_service, cache_service=cache_service)


def _verify_slack_request(request: Request, settings: Settings, raw_body: bytes) -> None:
    """Validate Slack signing secret and request freshness."""
    slack_secret = settings.slack_signing_secret
    if not slack_secret:
        return
    ts = request.headers.get("x-slack-request-timestamp", "")
    sig = request.headers.get("x-slack-signature", "")
    if not is_recent_slack_timestamp(ts):
        raise HTTPException(status_code=403, detail="stale slack request")
    if not verify_slack_signature(slack_secret, ts, raw_body, sig):
        raise HTTPException(status_code=403, detail="invalid slack signature")


def _parse_slack_slash_form(raw_body: bytes) -> dict[str, str]:
    """Parse standard Slack slash-command form fields."""
    form = parse_qs(raw_body.decode("utf-8"), keep_blank_values=True)

    def _field(name: str) -> str:
        items = form.get(name, [])
        return items[0] if items else ""

    return {
        "text": _field("text").strip(),
        "user_id": _field("user_id").strip(),
        "team_id": _field("team_id").strip(),
        "channel_id": _field("channel_id").strip(),
        "response_url": _field("response_url"),
    }


def _slack_request_id(request: Request, team_id: str, channel_id: str, user_id: str, text: str) -> str:
    """Resolve a stable deduplication key for Slack slash commands."""
    return (
        request.headers.get("x-slack-request-id")
        or request.headers.get("X-Slack-Request-Id")
        or f"{team_id}:{channel_id}:{user_id}:{text}"
    ).strip()


def _slack_incident_label(incident_id: str) -> str:
    suffix = incident_id[-6:].upper() if len(incident_id) >= 6 else incident_id.upper()
    return f"INC-{suffix}"


def _cleanup_dedup_cache(now: float) -> None:
    expired = [key for key, expiry in _slack_request_dedup.items() if expiry <= now]
    for key in expired:
        _slack_request_dedup.pop(key, None)


def _mark_request_seen(request_id: str) -> bool:
    now = time.time()
    _cleanup_dedup_cache(now)
    key = f"slack:req:{request_id}"
    if key in _slack_request_dedup:
        return True
    _slack_request_dedup[key] = now + _DEDUP_TTL_SECONDS
    return False


def _cleanup_delivery_guard(now: float) -> None:
    expired = [key for key, expiry in _slack_delivery_guard.items() if expiry <= now]
    for key in expired:
        _slack_delivery_guard.pop(key, None)


def _mark_delivered(request_id: str) -> bool:
    now = time.time()
    _cleanup_delivery_guard(now)
    key = f"slack:deliv:{request_id}"
    if key in _slack_delivery_guard:
        return True
    _slack_delivery_guard[key] = now + 300  # 5 minutes TTL
    return False


def _build_slack_blocks(top_hypothesis: dict, runbook: dict, similar: list[SimilarIncident], incident_id: str) -> dict:
    conf_raw = top_hypothesis.get("confidence", 0)
    conf_pct = int(round(float(conf_raw) * 100 if float(conf_raw) <= 1 else float(conf_raw)))
    conf_pct = max(0, min(conf_pct, 100))
    rc_text = str(top_hypothesis.get("root_cause", "Unknown")).replace("<", "‹").replace(">", "›")
    steps_raw = runbook.get("steps") or []
    steps = [str(step).strip() for step in steps_raw[:3] if str(step).strip()]
    numbered = "\n".join(f"{i + 1}. {step}" for i, step in enumerate(steps)) if steps else "_No steps generated._"
    similar_count = len(similar)
    verified_count = sum(1 for item in similar if item.helpful_count > 0)
    success_rate = int(round((verified_count / similar_count) * 100)) if similar_count else 0
    avg_fix_minutes = int(round(runbook.get("estimated_minutes", 0))) if similar_count else 0
    pattern_frequency = runbook.get("based_on_incidents", similar_count)
    top_similar = ", ".join(_slack_incident_label(item.id) for item in similar[:3]) if similar else "none"
    
    mode = top_hypothesis.get("analysis_mode") or runbook.get("analysis_mode", "Unknown")
    mode_display = mode.capitalize()
    
    matched_keywords = top_hypothesis.get("matched_keywords") or runbook.get("matched_keywords") or []
    signals_text = f"\n🧠 *Matched Signals:* {', '.join(matched_keywords)}" if matched_keywords else ""

    return {
        "response_type": "in_channel",
        "blocks": [
            {"type": "header", "text": {"type": "plain_text", "text": "OpsSage Analysis", "emoji": True}},
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"⚡ *Analysis Mode:* {mode_display}{signals_text}\n🔥 *Root Cause:* {rc_text}\n📊 *Seen {pattern_frequency} times*\n✅ *Success Rate:* {success_rate}%\n🧠 *Confidence:* {conf_pct}%",
                },
            },
            {"type": "divider"},
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*Runbook:*\n{numbered}"}},
            {"type": "divider"},
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "✅ Correct Diagnosis"
                        },
                        "style": "primary",
                        "action_id": "feedback_correct",
                        "value": incident_id
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "❌ Incorrect Diagnosis"
                        },
                        "style": "danger",
                        "action_id": "feedback_incorrect",
                        "value": incident_id
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "🚀 Resolution Worked"
                        },
                        "action_id": "feedback_resolution_worked",
                        "value": incident_id
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "🧠 OpsSage continuously improves recommendations using historical incident outcomes and engineer feedback signals."
                    }
                ]
            },
            {"type": "divider"},
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "🤖 _Powered by OpsSage AI - Generated using heuristic + historical incident analysis_"
                    }
                ]
            }
        ],
    }


def _fallback_payload(incident_id: str = "unknown") -> dict:
    return {
        "response_type": "in_channel",
        "blocks": [
            {"type": "header", "text": {"type": "plain_text", "text": "OpsSage Analysis", "emoji": True}},
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "⚡ *Analysis Mode:* Fallback\n🔥 *Root Cause:* Potential infrastructure saturation or upstream dependency degradation.\n📊 *Seen 0 times*\n✅ *Confidence:* 45%",
                },
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": "*Runbook:*\n1. Inspect service logs for timeout patterns\n2. Check upstream dependency latency\n3. Restart affected workers if saturation persists"},
            },
            {"type": "divider"},
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "🤖 _Powered by OpsSage AI_"
                    }
                ]
            }
        ],
    }


async def _run_slack_analysis(
    text: str,
    settings: Settings,
    company_id: str,
    user_id: str,
    team_id: str,
    channel_id: str,
) -> dict:
    started_at = time.perf_counter()
    incident_service = _build_incident_service(settings)
    llm = _build_llm_service(settings)
    logger.info(
        "slack_analysis_started",
        extra={"team_id": team_id, "channel_id": channel_id, "user_id": user_id, "preview": text[:100]},
    )
    try:
        similar = await incident_service.search_by_embedding(text, limit=5, company_id=company_id)
        hypotheses = await llm.analyze_root_causes(text, similar, company_id=company_id)
        top = hypotheses[0] if hypotheses else {"root_cause": "Unknown", "confidence": 0, "evidence": "", "recommended_action": ""}
        runbook = await llm.generate_runbook(text, str(top.get("root_cause", "")), company_id=company_id)
        
        # Create an incident to record this interaction
        title = f"Slack: {text[:50]}..." if len(text) > 50 else f"Slack: {text}"
        new_inc = await incident_service.create_incident(
            IncidentCreate(
                title=title,
                description=text,
                severity="medium",
                source=str(top.get("root_cause", "Unknown")),
            ),
            company_id=company_id
        )
        incident_id = str(new_inc.id)

        return _build_slack_blocks(top, runbook, similar, incident_id)
    except Exception:
        logger.exception("slack_analysis_failed")
        return _fallback_payload()
    finally:
        logger.info("slack_analysis_finished", extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)})


async def _post_slack_response_url(response_url: str, payload: dict, started_at: float, company_id: str) -> None:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                response_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            resp.raise_for_status()
        
        duration = round((time.perf_counter() - started_at) * 1000, 2)
        logger.info("slack_followup_sent", extra={"company_id": company_id, "total_analysis_ms": duration})
    except Exception as e:
        duration = round((time.perf_counter() - started_at) * 1000, 2)
        logger.exception("slack_followup_failed", extra={"company_id": company_id, "total_analysis_ms": duration, "error": str(e)})


async def _slack_delayed_delivery(response_url: str, text: str, settings: Settings, company_id: str, started_at: float, request_id: str) -> None:
    if _mark_delivered(request_id):
        logger.info("slack_delivery_duplicate_prevented", extra={"request_id": request_id})
        return
        
    try:
        payload = await _run_slack_analysis(
            text=text,
            settings=settings,
            company_id=company_id,
            user_id="unknown",
            team_id="unknown",
            channel_id="unknown",
        )
        await _post_slack_response_url(response_url, payload, started_at, company_id)
    except Exception:
        logger.exception("slack_delayed_analysis_failed")
        fallback = _fallback_payload()
        await _post_slack_response_url(response_url, fallback, started_at, company_id)


def _sanitize_slack_text(value: str, max_length: int = 1500) -> str:
    """Escape Slack-sensitive characters and truncate long text."""
    cleaned = value.replace("<", "‹").replace(">", "›").strip()
    if len(cleaned) <= max_length:
        return cleaned
    return cleaned[: max_length - 1] + "…"


def _build_slack_knowledge_payload(result: KnowledgeQueryResult) -> dict:
    """Format knowledge query results for Slack Block Kit."""
    answer = _sanitize_slack_text(result.answer)
    source_lines: list[str] = []
    for source in result.sources[:5]:
        similarity_pct = int(round(source.similarity_score * 100))
        title = _sanitize_slack_text(source.title, max_length=200)
        source_lines.append(f"• {title}\n• Similarity: {similarity_pct}%")

    blocks: list[dict] = [
        {"type": "header", "text": {"type": "plain_text", "text": "📚 Knowledge Result", "emoji": True}},
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*Answer:* {answer}"}},
    ]
    if source_lines:
        blocks.extend(
            [
                {"type": "divider"},
                {"type": "section", "text": {"type": "mrkdwn", "text": "*Sources:*\n" + "\n".join(source_lines)}},
            ]
        )
    return {"response_type": "in_channel", "blocks": blocks}


def _knowledge_fallback_payload(message: str | None = None) -> dict:
    """Fallback Slack payload when knowledge lookup fails."""
    text = message or "⚠️ Unable to search the knowledge base right now. Please try again shortly."
    return {
        "response_type": "in_channel",
        "blocks": [
            {"type": "header", "text": {"type": "plain_text", "text": "📚 Knowledge Result", "emoji": True}},
            {"type": "section", "text": {"type": "mrkdwn", "text": text}},
        ],
    }


async def _run_slack_knowledge_query(
    query: str,
    settings: Settings,
    company_id: str,
    scope: KnowledgeDocumentScope = "org",
) -> dict:
    """Run semantic knowledge lookup without LLM calls."""
    started_at = time.perf_counter()
    service = _build_knowledge_service(settings)
    logger.info(
        "slack_knowledge_query_started",
        extra={"tenant_id": company_id, "scope": scope, "preview": query[:100]},
    )
    try:
        result = await service.query_knowledge(
            tenant_id=company_id,
            query=query,
            scope=scope,
        )
        return _build_slack_knowledge_payload(result)
    except Exception:
        logger.exception("slack_knowledge_query_failed", extra={"tenant_id": company_id, "scope": scope})
        return _knowledge_fallback_payload()
    finally:
        logger.info(
            "slack_knowledge_query_finished",
            extra={"tenant_id": company_id, "duration_ms": round((time.perf_counter() - started_at) * 1000, 2)},
        )


async def _slack_knowledge_delayed_delivery(
    response_url: str,
    query: str,
    settings: Settings,
    company_id: str,
    started_at: float,
    request_id: str,
    scope: KnowledgeDocumentScope = "org",
) -> None:
    """Process /ask asynchronously and post results to Slack response_url."""
    if _mark_delivered(request_id):
        logger.info("slack_knowledge_delivery_duplicate_prevented", extra={"request_id": request_id})
        return

    try:
        payload = await _run_slack_knowledge_query(
            query=query,
            settings=settings,
            company_id=company_id,
            scope=scope,
        )
        await _post_slack_response_url(response_url, payload, started_at, company_id)
    except Exception:
        logger.exception("slack_knowledge_delayed_delivery_failed", extra={"tenant_id": company_id})
        await _post_slack_response_url(
            response_url,
            _knowledge_fallback_payload(),
            started_at,
            company_id,
        )


@router.post("/slack/incident")
async def slack_incident_command(
    request: Request,
    background_tasks: BackgroundTasks,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> JSONResponse:
    """Slack slash command: semantic search + LLM root cause + runbook via Block Kit."""
    raw_body = await request.body()
    _verify_slack_request(request, settings, raw_body)

    form = _parse_slack_slash_form(raw_body)
    text = form["text"]
    user_id = form["user_id"]
    team_id = form["team_id"]
    channel_id = form["channel_id"]
    response_url = form["response_url"]
    request_id = _slack_request_id(request, team_id, channel_id, user_id, text)

    logger.info(
        "slack_request",
        extra={
            "request_id": request_id[:80],
            "team_id": team_id or None,
            "channel_id": channel_id or None,
            "user_id": user_id or None,
            "has_text": bool(text),
            "command": "incident",
        },
    )

    if _mark_request_seen(request_id):
        return JSONResponse({"response_type": "ephemeral", "text": "Already processing this request."})

    if not text:
        return JSONResponse(
            {
                "response_type": "ephemeral",
                "text": "Usage: /incident <description>",
            }
        )

    started = time.perf_counter()
    
    asyncio.create_task(
        _slack_delayed_delivery(response_url, text, settings, company_id, started, request_id)
    )
    
    ack_duration = round((time.perf_counter() - started) * 1000, 2)
    logger.info("ack_response_ms", extra={"company_id": company_id, "duration_ms": ack_duration})
    
    return JSONResponse(
        {
            "response_type": "ephemeral",
            "text": "⚡ OpsSage analyzing incident...\n🧠 Checking historical incidents\n📊 Evaluating infrastructure signals",
        }
    )


@router.post("/slack/ask")
async def slack_ask_command(
    request: Request,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> JSONResponse:
    """Slack slash command: semantic knowledge base Q&A without LLM calls."""
    raw_body = await request.body()
    _verify_slack_request(request, settings, raw_body)

    form = _parse_slack_slash_form(raw_body)
    query = form["text"]
    user_id = form["user_id"]
    team_id = form["team_id"]
    channel_id = form["channel_id"]
    response_url = form["response_url"]
    request_id = _slack_request_id(request, team_id, channel_id, user_id, query)

    logger.info(
        "slack_request",
        extra={
            "request_id": request_id[:80],
            "team_id": team_id or None,
            "channel_id": channel_id or None,
            "user_id": user_id or None,
            "has_text": bool(query),
            "command": "ask",
        },
    )

    if _mark_request_seen(request_id):
        return JSONResponse({"response_type": "ephemeral", "text": "Already processing this request."})

    if not query:
        return JSONResponse(
            {
                "response_type": "ephemeral",
                "text": "Usage: /ask <question>\nExample: /ask What is leave policy?",
            }
        )

    started = time.perf_counter()
    asyncio.create_task(
        _slack_knowledge_delayed_delivery(
            response_url=response_url,
            query=query,
            settings=settings,
            company_id=company_id,
            started_at=started,
            request_id=request_id,
            scope="org",
        )
    )

    ack_duration = round((time.perf_counter() - started) * 1000, 2)
    logger.info(
        "slack_ask_ack_response_ms",
        extra={"company_id": company_id, "duration_ms": ack_duration},
    )

    return JSONResponse(
        {
            "response_type": "ephemeral",
            "text": "🔍 Searching organizational knowledge...\n📚 Matching documents by semantic similarity",
        }
    )

@router.post("/slack/actions")
async def slack_actions(
    request: Request,
    company_id: str = Depends(get_company_id),
    settings: Settings = Depends(get_app_settings),
) -> JSONResponse:
    """Handle interactive Block Kit buttons."""
    raw_body = await request.body()
    _verify_slack_request(request, settings, raw_body)

    form = parse_qs(raw_body.decode("utf-8"), keep_blank_values=True)
    payload_str = form.get("payload", [""])[0]
    if not payload_str:
        return JSONResponse({"text": "⚠️ Unable to record feedback right now."})

    try:
        payload = json.loads(payload_str)
    except json.JSONDecodeError:
        return JSONResponse({"text": "⚠️ Unable to record feedback right now."})

    if payload.get("type") != "block_actions":
        return JSONResponse({"text": "⚠️ Unable to record feedback right now."})

    actions = payload.get("actions", [])
    if not actions:
        return JSONResponse({"text": "⚠️ Unable to record feedback right now."})

    action = actions[0]
    action_id = action.get("action_id")
    incident_id = action.get("value")

    if not action_id or not incident_id:
        return JSONResponse({"text": "⚠️ Unable to record feedback right now."})

    incident_service = _build_incident_service(settings)
    
    try:
        if action_id == "feedback_correct":
            logger.info("feedback_correct_received", extra={"incident_id": incident_id, "company_id": company_id, "action_id": action_id})
            await incident_service.apply_feedback(
                incident_id,
                IncidentFeedback(was_prediction_correct=True, mark_helpful=True),
                company_id=company_id
            )
        elif action_id == "feedback_incorrect":
            logger.info("feedback_incorrect_received", extra={"incident_id": incident_id, "company_id": company_id, "action_id": action_id})
            await incident_service.apply_feedback(
                incident_id,
                IncidentFeedback(was_prediction_correct=False),
                company_id=company_id
            )
        elif action_id == "feedback_resolution_worked":
            logger.info("feedback_resolution_worked_received", extra={"incident_id": incident_id, "company_id": company_id, "action_id": action_id})
            await incident_service.apply_feedback(
                incident_id,
                IncidentFeedback(resolution_quality_score=9.0),
                company_id=company_id
            )
        else:
            return JSONResponse({"text": "⚠️ Unable to record feedback right now."})
    except Exception as e:
        logger.exception("slack_feedback_processing_failed", extra={"incident_id": incident_id, "error": str(e)})
        return JSONResponse({"text": "⚠️ Unable to record feedback right now."})

    blocks = payload.get("message", {}).get("blocks", [])
    new_blocks = []
    for block in blocks:
        if block.get("type") == "actions":
            new_blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "✅ Feedback recorded successfully.\n🧠 OpsSage will use this operational signal to improve future incident recommendations."
                }
            })
        else:
            new_blocks.append(block)

    return JSONResponse({"replace_original": True, "blocks": new_blocks})

