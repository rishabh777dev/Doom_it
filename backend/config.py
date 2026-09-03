import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

# Base directory containing this config file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")

_DEFAULT_SECRET_KEY = "super_secret_vakyabhed_key_2026_change_me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Base Configuration
    PROJECT_NAME: str = "Vakya-Bhed 2026 API"
    DEV_MODE: bool = False  # True uses MockLLMProvider, False uses OllamaLLMProvider

    # Supabase Database Configuration
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # Security & Auth
    SECRET_KEY: str = _DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 240  # 4 hours
    SINGLE_DEVICE_LOGIN: bool = True  # If True, new login invalidates older session tokens

    # Database
    # Default to local SQLite file for development
    DATABASE_URL: str = "sqlite:///./vakya_bhed.db"

    # LLM Routing Priority (Options: "ollama_only", "ollama", "nvidia", "gemini")
    PRIMARY_PROVIDER: str = "ollama_only"

    # Ollama LLM Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_MAX_CONCURRENT_REQUESTS: int = 2

    # NVIDIA Nemotron Settings
    NVIDIA_API_KEY: str = ""
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "nvidia/nemotron-3-ultra-550b-a55b:free"

    # Google Gemini Settings (Multi-Key Pool PK1, PK2, PK3 with instant failover)
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEY_1: str = ""
    GEMINI_API_KEY_2: str = ""
    GEMINI_API_KEY_3: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"

    # Ollama Cluster Nodes (round-robin load balanced by OllamaLLMProvider).
    # Set LLAMA_NODE_1..5 to the base URLs of each Ollama worker machine.
    # Any node left blank is skipped.  If ALL are blank, falls back to OLLAMA_BASE_URL.
    LLAMA_NODE_1: str = "http://127.0.0.1:11434"
    LLAMA_NODE_2: str = ""
    LLAMA_NODE_3: str = ""
    LLAMA_NODE_4: str = ""
    LLAMA_NODE_5: str = ""

    # Rate Limiting
    SUBMISSION_COOLDOWN_SECONDS: int = 0
    MAX_RPM_PER_USER: int = 10  # Balanced 10 requests per minute

    # CORS
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()

# Fail fast in production if the default placeholder key is still in use.
# An attacker who has read access to the repository could forge valid JWTs
# against any deployment that skips this step.
if not settings.DEV_MODE and settings.SECRET_KEY == _DEFAULT_SECRET_KEY:
    raise ValueError(
        "SECRET_KEY is still set to the default placeholder value. "
        "Set a strong, unique SECRET_KEY in your .env file before running in production."
    )

