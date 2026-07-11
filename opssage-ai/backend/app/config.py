"""Application configuration and environment settings."""

from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    app_name: str = Field(default="OpsSage API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=False, alias="DEBUG")
    api_v1_prefix: str = Field(default="/api", alias="API_V1_PREFIX")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    mongodb_url: str = Field(default="mongodb://localhost:27017", alias="MONGODB_URL")
    mongodb_db_name: str = Field(default="opssage", alias="MONGODB_DB_NAME")
    OPENAI_API_KEY: str = Field(default="", alias="OPENAI_API_KEY")
    LLM_MODEL: str = Field(default="gpt-4o-mini", alias="LLM_MODEL")
    sentry_dsn: SecretStr = Field(default=SecretStr(""), alias="SENTRY_DSN")

    allowed_origins: str = Field(default="http://localhost:3000,http://localhost:5173", alias="CORS_ORIGINS")
    request_timeout_seconds: int = Field(default=10, alias="REQUEST_TIMEOUT_SECONDS")
    cache_ttl_seconds: int = Field(default=300, alias="CACHE_TTL_SECONDS")

    datadog_webhook_secret: str | None = Field(default=None, alias="DATADOG_WEBHOOK_SECRET")
    slack_signing_secret: str | None = Field(default=None, alias="SLACK_SIGNING_SECRET")

    daily_llm_cost_limit_usd: float | None = Field(default=None, alias="DAILY_LLM_COST_LIMIT_USD")

    @property
    def cors_origins(self) -> list[str]:
        """Return parsed CORS origins from a comma-separated env var."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Create and cache application settings."""
    return Settings()


settings = get_settings()
