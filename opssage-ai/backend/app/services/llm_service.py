import asyncio
import json
import time
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from openai import AsyncOpenAI
from app.config import settings
from app.models.schema import RootCauseAnalysis
from app.utils.logger import get_logger
from app.models.analysis_cache import AnalysisCache
from app.models.usage_log import UsageLog
from app.utils.text_normalization import normalize_incident_text

logger = get_logger(__name__)

class LLMService:
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY missing")
            raise RuntimeError("OPENAI_API_KEY missing")
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            max_retries=0,
            timeout=15.0
        )
        self.model = "gpt-4o-mini"
        
    async def _process_incident(self, description: str, company_id: str = "default", context: str = "") -> dict:
        norm_desc = normalize_incident_text(description)
        desc_hash = hashlib.sha256(norm_desc.encode("utf-8")).hexdigest()
        now = datetime.utcnow()
        
        # 3. Cache TTL - Async Delete Expired
        async def _cleanup():
            await AnalysisCache.find(AnalysisCache.expires_at < now).delete()
        asyncio.create_task(_cleanup())
        
        # 1. Exact Cache Lookup
        cached = await AnalysisCache.find_one(
            AnalysisCache.company_id == company_id,
            AnalysisCache.description_hash == desc_hash,
            AnalysisCache.expires_at > now
        )
        if cached:
            age_mins = int((now - cached.created_at).total_seconds() / 60)
            logger.info("cache_hit", extra={
                "company_id": company_id,
                "analysis_mode": "cached",
                "matched_keywords": cached.matched_keywords
            })
            return {
                "root_cause": cached.root_cause,
                "confidence": cached.confidence,
                "evidence": cached.evidence,
                "runbook_steps": cached.runbook,
                "summary": cached.summary,
                "severity": cached.severity,
                "analysis_mode": "cached",
                "matched_keywords": cached.matched_keywords,
                "cache_age_minutes": age_mins
            }
            
        logger.info("cache_miss", extra={"company_id": company_id})
        
        # 4. Semantic Cache Lookup
        current_emb = None
        try:
            from app.services.embedding_service import EmbeddingService
            from app.services.cache_service import CacheService
            emb_service = EmbeddingService(cache_service=CacheService())
            current_emb = await emb_service.generate(norm_desc)
            
            recent_caches = await AnalysisCache.find(
                AnalysisCache.company_id == company_id,
                AnalysisCache.expires_at > now,
                AnalysisCache.embedding != None
            ).sort("-created_at").limit(50).to_list()
            
            best_match = None
            best_score = 0.0
            
            for c in recent_caches:
                if c.embedding:
                    score = sum(a * b for a, b in zip(current_emb, c.embedding))
                    if score > best_score:
                        best_score = score
                        best_match = c
                        
            if best_match and best_score >= 0.90:
                age_mins = int((now - best_match.created_at).total_seconds() / 60)
                logger.info("semantic_cache_hit", extra={
                    "company_id": company_id,
                    "analysis_mode": "cached",
                    "matched_keywords": best_match.matched_keywords,
                    "similarity_score": best_score
                })
                return {
                    "root_cause": best_match.root_cause,
                    "confidence": best_match.confidence,
                    "evidence": best_match.evidence,
                    "runbook_steps": best_match.runbook,
                    "summary": best_match.summary,
                    "severity": best_match.severity,
                    "analysis_mode": "cached",
                    "matched_keywords": best_match.matched_keywords,
                    "cache_age_minutes": age_mins
                }
        except Exception as e:
            logger.warning(f"Semantic cache check failed: {e}")
            
        # Token Safety Limits
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        hourly_reqs = await UsageLog.find(UsageLog.company_id == company_id, UsageLog.timestamp >= hour_ago).count()
        daily_usage = await UsageLog.find(UsageLog.company_id == company_id, UsageLog.timestamp >= day_ago).to_list()
        daily_cost = sum(log.cost_estimate_usd for log in daily_usage)
        
        MAX_REQUESTS_PER_HOUR = 100
        MAX_DAILY_LLM_COST = 5.0
        force_heuristic = hourly_reqs >= MAX_REQUESTS_PER_HOUR or daily_cost >= MAX_DAILY_LLM_COST
        
        # 2. Weighted Heuristics
        heuristics = [
            {"keywords": ["database", "db", "connection"], "weight": 3, "rc": "Database connection saturation or failure", "conf": 80, "rb": ["Restart workers", "Check DB pool size", "Inspect slow queries"]},
            {"keywords": ["timeout"], "weight": 2, "rc": "Service or upstream timeout", "conf": 75, "rb": ["Check network latency", "Review upstream service status", "Check dependencies"]},
            {"keywords": ["redis", "cache"], "weight": 3, "rc": "Redis cache eviction or connection failure", "conf": 85, "rb": ["Check Redis memory usage", "Verify Redis connection string", "Scale Redis cluster"]},
            {"keywords": ["payment", "checkout"], "weight": 3, "rc": "Payment gateway integration failure", "conf": 90, "rb": ["Check payment API status page", "Verify API keys", "Review recent webhook failures"]},
            {"keywords": ["api", "rate limit"], "weight": 2, "rc": "Upstream API saturation or rate limiting", "conf": 70, "rb": ["Implement backoff strategy", "Check rate limits dashboard", "Review API logs"]},
            {"keywords": ["memory", "oom"], "weight": 3, "rc": "Memory leak or pressure (OOM)", "conf": 85, "rb": ["Restart affected pods", "Check memory usage dashboards", "Analyze heap dump"]},
            {"keywords": ["cpu", "worker"], "weight": 3, "rc": "CPU saturation or worker exhaustion", "conf": 80, "rb": ["Scale out service", "Check for infinite loops", "Optimize computationally heavy endpoints"]},
            {"keywords": ["latency", "slow"], "weight": 1, "rc": "High network or processing latency", "conf": 65, "rb": ["Check network dashboards", "Profile slow requests", "Scale up resources"]},
            {"keywords": ["queue", "kafka", "rabbitmq"], "weight": 3, "rc": "Message queue backlog or failure", "conf": 85, "rb": ["Check consumer group lag", "Restart queue consumers", "Scale queue infrastructure"]},
            {"keywords": ["auth", "login"], "weight": 3, "rc": "Authentication service degradation", "conf": 90, "rb": ["Check Auth0/identity provider status", "Verify JWT signing keys", "Inspect auth logs"]},
            {"keywords": ["network"], "weight": 2, "rc": "Network partition or routing failure", "conf": 75, "rb": ["Check VPC flow logs", "Verify DNS resolution", "Inspect load balancer health"]}
        ]
        
        best_h = None
        best_score = 0
        all_matched_kws = []
        
        # Accumulate score across all heuristics but select highest scoring as root cause
        # Or accumulate scores specifically
        for h in heuristics:
            score = 0
            for kw in h["keywords"]:
                if kw in norm_desc:
                    score += h["weight"]
                    if kw not in all_matched_kws:
                        all_matched_kws.append(kw)
            
            if score > best_score:
                best_score = score
                best_h = h
                
        if force_heuristic or (best_h and best_h["conf"] >= 80):
            if best_h:
                res = {
                    "root_cause": best_h["rc"],
                    "confidence": best_h["conf"],
                    "evidence": f"Detected keywords: {', '.join(all_matched_kws)}",
                    "runbook_steps": best_h["rb"][:3],
                    "summary": f"{best_h['rc']} detected via pattern matching.",
                    "severity": "high",
                    "analysis_mode": "heuristic",
                    "matched_keywords": all_matched_kws,
                    "cache_age_minutes": 0
                }
                logger.info("heuristic_match", extra={"company_id": company_id, "analysis_mode": "heuristic", "matched_keywords": all_matched_kws})
            else:
                res = {
                    "root_cause": "Unknown system issue",
                    "confidence": 40,
                    "evidence": "No specific pattern detected.",
                    "runbook_steps": ["Check application logs", "Review metrics dashboards", "Escalate if unresolved"],
                    "summary": "General system degradation.",
                    "severity": "medium",
                    "analysis_mode": "heuristic",
                    "matched_keywords": [],
                    "cache_age_minutes": 0
                }
            await self._cache_response(company_id, desc_hash, res, current_emb)
            return res
            
        # OpenAI Fallback
        try:
            start_time = time.perf_counter()
            response = await self.client.chat.completions.create(
                model=self.model,
                max_tokens=300,
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an SRE incident analyst.\n"
                            "Return STRICT JSON only.\n"
                            "Schema: {\"root_cause\": \"string\", \"confidence\": number, \"evidence\": \"string\", \"runbook\": [\"step 1\", \"step 2\"], \"severity\": \"string\", \"summary\": \"string\"}\n"
                            "Rules: Max 3 runbook steps. Short explanations. Avoid long text."
                        )
                    },
                    {
                        "role": "user",
                        "content": f"Description: {description}\nContext: {context}"
                    }
                ],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            parsed = json.loads(content.replace("```json", "").replace("```", "").strip())
            
            usage = response.usage
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0
            cost = UsageLog.calculate_cost(input_tokens, output_tokens, self.model)
            
            ul = UsageLog(
                company_id=company_id,
                endpoint="llm_unified",
                tokens_input=input_tokens,
                tokens_output=output_tokens,
                total_tokens=input_tokens + output_tokens,
                cost_estimate_usd=cost,
                model=self.model,
                latency_ms=int((time.perf_counter() - start_time)*1000)
            )
            await ul.insert()
            
            res = {
                "root_cause": parsed.get("root_cause", "Unknown"),
                "confidence": int(parsed.get("confidence", 50)),
                "evidence": str(parsed.get("evidence", ""))[:200],
                "runbook_steps": list(parsed.get("runbook", []))[:3],
                "summary": str(parsed.get("summary", ""))[:150],
                "severity": parsed.get("severity", "medium"),
                "analysis_mode": "openai",
                "matched_keywords": [],
                "cache_age_minutes": 0
            }
            
            await self._cache_response(company_id, desc_hash, res, current_emb)
            return res
            
        except Exception as e:
            logger.exception("llm_unified_failed", extra={"error": str(e)})
            res = {
                "root_cause": "API Failure",
                "confidence": 0,
                "evidence": "LLM API unavailable.",
                "runbook_steps": ["Check logs manually", "Review recent deployments"],
                "summary": "Analysis unavailable.",
                "severity": "medium",
                "analysis_mode": "heuristic",
                "matched_keywords": [],
                "cache_age_minutes": 0
            }
            return res

    async def _cache_response(self, company_id: str, desc_hash: str, res: dict, embedding: Optional[list] = None):
        try:
            cache = AnalysisCache(
                company_id=company_id,
                description_hash=desc_hash,
                root_cause=res["root_cause"],
                confidence=res["confidence"],
                evidence=res["evidence"],
                runbook=res["runbook_steps"],
                severity=res.get("severity", "medium"),
                summary=res.get("summary", ""),
                matched_keywords=res.get("matched_keywords", []),
                embedding=embedding
            )
            await cache.insert()
        except Exception as e:
            logger.warning(f"Failed to cache response: {e}")

    async def analyze_root_causes(self, description: str, similar_incidents: list, company_id: str = "default") -> list:
        context = self._build_context(similar_incidents)
        res = await self._process_incident(description, company_id, context)
        
        return [{
            "root_cause": res["root_cause"],
            "confidence": res["confidence"],
            "evidence": res["evidence"],
            "recommended_action": "\n".join(res["runbook_steps"]),
            "analysis_mode": res["analysis_mode"],
            "matched_keywords": res["matched_keywords"],
            "cache_age_minutes": res["cache_age_minutes"]
        }]

    async def analyze(self, payload, company_id: str = "default", usage_log_endpoint: str = "") -> dict:
        res = await self._process_incident(payload.context, company_id)
        return {
            "summary": res["summary"],
            "root_cause": res["root_cause"],
            "confidence_score": res["confidence"],
            "suggested_runbook_steps": res["runbook_steps"],
            "analysis_mode": res["analysis_mode"],
            "matched_keywords": res["matched_keywords"],
            "cache_age_minutes": res["cache_age_minutes"]
        }

    async def generate_runbook(self, description_or_payload, root_cause: str = "", company_id: str = "default") -> dict:
        if hasattr(description_or_payload, "context"):
            desc = description_or_payload.context
            incident_id = getattr(description_or_payload, "incident_id", "unknown")
        else:
            desc = str(description_or_payload)
            incident_id = "unknown"
            
        res = await self._process_incident(desc, company_id, f"Root cause context: {root_cause}")
        return {
            "incident_id": incident_id,
            "runbook_steps": res["runbook_steps"],
            "steps": res["runbook_steps"],
            "confidence_score": res["confidence"],
            "estimated_minutes": 15,
            "analysis_mode": res["analysis_mode"],
            "matched_keywords": res["matched_keywords"],
            "cache_age_minutes": res["cache_age_minutes"]
        }

    async def generate_cluster_name(self, incident_titles: list) -> str:
        for attempt in range(2):
            try:
                titles_text = "\n".join(f"- {t}" for t in incident_titles[:5])
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "user",
                            "content": f"Given these incident titles, return a short 3-5 word cluster name describing the common pattern:\n\n{titles_text}\n\nReturn ONLY the cluster name, nothing else."
                        }
                    ],
                    temperature=0.3,
                    max_tokens=20
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                logger.exception("llm_cluster_name_failed", extra={"error": str(e)})
                if attempt == 0:
                    await asyncio.sleep(1)
                else:
                    return "Unknown Pattern"

    def _build_context(self, similar_incidents: list) -> str:
        if not similar_incidents:
            return ""

        lines = ["SIMILAR PAST INCIDENTS (use to inform analysis):"]
        for i, inc in enumerate(similar_incidents[:5], 1):
            root_cause = getattr(inc, "root_cause", None) or \
                         (inc.get("root_cause") if isinstance(inc, dict) else "unknown")
            resolution = getattr(inc, "resolution", None) or \
                         (inc.get("resolution") if isinstance(inc, dict) else "")
            title = getattr(inc, "title", None) or \
                    (inc.get("title") if isinstance(inc, dict) else "Unknown")
            helpful = getattr(inc, "helpful_count", 0) or \
                      (inc.get("helpful_count", 0) if isinstance(inc, dict) else 0)

            verified = " [VERIFIED BY ENGINEERS]" if helpful > 0 else ""
            lines.append(
                f"{i}. {title}{verified}\n"
                f"   Root cause: {root_cause}\n"
                f"   Resolution: {resolution or 'not recorded'}"
            )

        return "\n".join(lines)
