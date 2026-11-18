import re
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(BASE_DIR / ".env", BASE_DIR.parent / ".env"), extra="ignore")

    app_name: str = "Bozor-Analitika API"
    environment: str = "development"
    # SQLite keeps local setup dependency-free; production uses PostgreSQL:
    # postgresql+psycopg://user:pass@host:5432/bozor
    database_url: str = f"sqlite:///{(BASE_DIR / 'bozor.db').as_posix()}"
    secret_key: str = "dev-only-change-me-in-production-please-32b"
    access_token_minutes: int = 60 * 12
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-5-5"
    gemini_api_key: str | None = None
    gemini_model: str | None = None  # optional override, tried before the built-in fallback list
    voicelab_api_key: str | None = None
    elevenlabs_api_key: str | None = None
    elevenlabs_tts_model: str = "eleven_v4_turbo"  # supports Uzbek; about half the credits of eleven_v4
    elevenlabs_stt_model: str = "scribe_v3"
    upload_dir: str = str(BASE_DIR / "uploads")
    max_upload_mb: int = 4

    @field_validator("database_url")
    @classmethod
    def _driver(cls, v: str) -> str:
        # Managed Postgres providers hand out postgres:// or postgresql:// URLs; use psycopg 3.
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v

    @field_validator("anthropic_api_key", "gemini_api_key", "voicelab_api_key", "elevenlabs_api_key", "gemini_model")
    @classmethod
    def _clean_key(cls, v: str | None) -> str | None:
        # keys are plain ASCII; drop spaces, line breaks and invisible characters a copy-paste may add
        if v is None:
            return None
        v = re.sub(r"[^!-~]", "", v)
        return v or None

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.gemini_api_key or self.anthropic_api_key)

    @property
    def ai_engine(self) -> str:
        """Engine order for the AI analyst: Gemini, then Claude, then the deterministic engine."""
        if self.gemini_api_key:
            return "gemini"
        if self.anthropic_api_key:
            return "claude"
        return "deterministic"

    @property
    def voice_enabled(self) -> bool:
        return bool(self.voicelab_api_key or self.elevenlabs_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
