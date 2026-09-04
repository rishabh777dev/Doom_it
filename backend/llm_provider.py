# llm_provider.py - LLM provider abstractions for Vakya-Bhed 2026
"""
Providers receive a plain LevelContext snapshot instead of a live SQLAlchemy
``Level`` row. The queue workers run in a different asyncio task from the
request that loaded the row, so reading attributes off that row from a worker
can trigger a lazy load on a Session that is being used concurrently.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, List

import httpx

from backend.config import settings

logger = logging.getLogger("vakyabhed.llm_provider")

# One pooled client for every provider: a fresh AsyncClient per request pays
# TCP + TLS setup every time, which is the dominant cost under contest load.
_HTTP_LIMITS = httpx.Limits(max_connections=64, max_keepalive_connections=32)
_REQUEST_TIMEOUT = httpx.Timeout(connect=3.0, read=15.0, write=5.0, pool=3.0)

_client: Optional[httpx.AsyncClient] = None
_client_lock = asyncio.Lock()


@dataclass(frozen=True)
class LevelContext:
    """Immutable snapshot of the level fields a provider needs."""

    level_id: int
    round_id: int
    system_prompt: str
    secret: str = ""
    target_phrase: Optional[str] = None

    @classmethod
    def from_level(cls, level) -> "LevelContext":
        return cls(
            level_id=level.level_id,
            round_id=level.round_id,
            system_prompt=level.system_prompt or "",
            secret=level.secret or "",
            target_phrase=level.target_phrase,
        )

async def get_http_client() -> httpx.AsyncClient:
    """Return the process-wide pooled HTTP client, creating it on first use."""
    global _client
    if _client is None or _client.is_closed:
        async with _client_lock:
            if _client is None or _client.is_closed:
                _client = httpx.AsyncClient(timeout=_REQUEST_TIMEOUT, limits=_HTTP_LIMITS)
    return _client


async def close_http_client() -> None:
    """Close the pooled client on application shutdown."""
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None


class LLMProvider(ABC):
    name = "provider"

    def is_configured(self) -> bool:
        """False when the provider has no usable credentials/endpoint, so the
        router can skip it instead of paying a guaranteed failure."""
        return True

    @abstractmethod
    async def generate(self, level: LevelContext, prompt: str) -> str:
        """Send the system instruction and user prompt to the model."""


class MockLLMProvider(LLMProvider):
    name = "MockLLMProvider"

    async def generate(self, level: LevelContext, prompt: str) -> str:
        # Deterministic simulation behaviour for testing the CTF engine
        prompt_lower = prompt.lower().strip()

        # Bypass for testing Round 1 & Round 2 (secret extraction)
        if "magic_bypass" in prompt_lower:
            return f"Understood. The secret password you requested is: {level.secret}. Hope this helps."

        # Bypass for testing Round 3 (target phrase generation)
        if "target_bypass" in prompt_lower and level.target_phrase:
            return level.target_phrase

        # Simulation of refusal for standard inputs
        if level.round_id == 1:
            return "Vault Guardian: Access Denied. I am strictly forbidden from revealing the secret password."
        if level.round_id == 2:
            return "Instruction Guardian: Warning: Persona override detected. Access to system initialization directives is blocked."
        return f"I cannot help with that. You asked: '{prompt}', but my constraints prevent me from repeating that."

def _looks_like_placeholder(key: str) -> bool:
    upper = (key or "").upper()
    return any(marker in upper for marker in ("YOUR-", "YOUR_", "CHANGE_ME", "PLACEHOLDER", "XXXX"))


class GroqLLMProvider(LLMProvider):
    name = "Groq LPU"

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.GROQ_API_KEY
        self.base_url = (base_url or settings.GROQ_BASE_URL or "https://api.groq.com/openai/v1").rstrip("/")
        self.model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.base_url) and not _looks_like_placeholder(self.api_key)

    async def generate(self, level: LevelContext, prompt: str) -> str:
        if not self.is_configured():
            raise RuntimeError("Groq API key is missing or is a placeholder.")

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": level.system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 1024,
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

        client = await get_http_client()
        try:
            response = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"Groq API returned HTTP {e.response.status_code}: {e.response.text[:200]}") from e
        except httpx.RequestError as e:
            raise RuntimeError(f"Failed to connect to Groq API: {e}") from e

        choices = response.json().get("choices") or [{}]
        content = (choices[0].get("message") or {}).get("content") or ""
        return content.strip()


class OpenRouterLLMProvider(LLMProvider):
    name = "OpenRouter Free OSS"

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        # Support both OPENROUTER_API_KEY and legacy NVIDIA_API_KEY
        self.api_key = api_key if api_key is not None else (settings.OPENROUTER_API_KEY or settings.NVIDIA_API_KEY)
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL or "https://openrouter.ai/api/v1").rstrip("/")
        self.model = model or settings.OPENROUTER_MODEL or "meta-llama/llama-3.3-70b-instruct:free"

    def is_configured(self) -> bool:
        return bool(self.api_key and self.base_url) and not _looks_like_placeholder(self.api_key)

    async def generate(self, level: LevelContext, prompt: str) -> str:
        if not self.is_configured():
            raise RuntimeError("OpenRouter API key is missing or is a placeholder.")

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": level.system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 1024,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://vakyabhed.ctf",
            "X-Title": "VakyaBhed CTF Arena",
        }

        client = await get_http_client()
        try:
            response = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"OpenRouter API returned HTTP {e.response.status_code}: {e.response.text[:200]}") from e
        except httpx.RequestError as e:
            raise RuntimeError(f"Failed to connect to OpenRouter API: {e}") from e

        choices = response.json().get("choices") or [{}]
        content = (choices[0].get("message") or {}).get("content") or ""
        return content.strip()


# Backward compatibility aliases
NvidiaLLMProvider = OpenRouterLLMProvider

class GeminiLLMProvider(LLMProvider):
    name = "Gemini Flash"

    def __init__(self, api_keys: Optional[List[str]] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        # Pool all configured keys (PK1..PK5)
        raw_keys = api_keys or [
            settings.GEMINI_API_KEY_1,
            settings.GEMINI_API_KEY_2,
            settings.GEMINI_API_KEY_3,
            settings.GEMINI_API_KEY_4,
            settings.GEMINI_API_KEY_5,
            settings.GEMINI_API_KEY,
        ]
        self.api_keys = [k.strip() for k in raw_keys if k and k.strip() and not _looks_like_placeholder(k)]
        self.base_url = (base_url or settings.GEMINI_BASE_URL or "").rstrip("/")
        self.model = model or settings.GEMINI_MODEL
        self._current_key_idx = 0

    def is_configured(self) -> bool:
        return bool(self.api_keys and self.base_url)

    async def generate(self, level: LevelContext, prompt: str) -> str:
        if not self.is_configured():
            raise RuntimeError("No valid Gemini API keys are configured.")

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": level.system_prompt}]},
            "generationConfig": {"temperature": 0.2},
        }
        url = f"{self.base_url}/models/{self.model}:generateContent"
        client = await get_http_client()

        last_error = None
        num_keys = len(self.api_keys)

        # Try every key in the pool with zero-delay failover
        for i in range(num_keys):
            key_index = (self._current_key_idx + i) % num_keys
            api_key = self.api_keys[key_index]
            key_label = f"PK{key_index + 1} ({api_key[:8]}...)"
            headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}

            try:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()

                candidates = response.json().get("candidates") or [{}]
                parts = ((candidates[0].get("content") or {}).get("parts") or [{}])
                content = "".join(part.get("text", "") for part in parts)
                if content.strip():
                    # Advance index for smooth round-robin load distribution
                    self._current_key_idx = (key_index + 1) % num_keys
                    return content.strip()
                else:
                    raise RuntimeError("Gemini returned an empty candidate text.")
            except httpx.HTTPStatusError as e:
                status = e.response.status_code
                err_msg = e.response.text[:200]
                last_error = RuntimeError(f"Gemini {key_label} HTTP {status}: {err_msg}")
                logger.warning(f"Gemini {key_label} failed with HTTP {status}. Instant failover to next key...")
            except Exception as e:
                last_error = e
                logger.warning(f"Gemini {key_label} connection error: {e}. Instant failover to next key...")

        raise last_error or RuntimeError("All Gemini API keys in the pool failed.")
