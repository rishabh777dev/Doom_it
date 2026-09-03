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
_REQUEST_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)

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

class OllamaLLMProvider(LLMProvider):
    name = "College Llama3 Cluster"

    # Shared across all instances: single semaphore, single round-robin counter.
    _semaphore: Optional[asyncio.Semaphore] = None
    _rr_counter: int = 0          # monotonically incremented; mod len(nodes) = current node
    _nodes: Optional[list] = None # cached list of base_urls, built once at first use

    def __init__(self, base_url: Optional[str] = None, default_model: Optional[str] = None):
        # base_url is only used when the caller explicitly passes one (e.g. tests).
        # Normal routing uses _get_nodes() which reads LLAMA_NODE_* from settings.
        self._override_url = (base_url or "").rstrip("/") or None
        self.default_model = default_model or settings.OLLAMA_MODEL

    # ------------------------------------------------------------------ #
    #  Class-level helpers (shared state)                                  #
    # ------------------------------------------------------------------ #
    @classmethod
    def _get_semaphore(cls) -> asyncio.Semaphore:
        if cls._semaphore is None:
            cls._semaphore = asyncio.Semaphore(max(1, settings.OLLAMA_MAX_CONCURRENT_REQUESTS))
        return cls._semaphore

    @classmethod
    def _get_nodes(cls) -> list:
        """Return the list of configured Ollama node base URLs.

        Reads LLAMA_NODE_1 … LLAMA_NODE_5 in order, collecting non-empty
        entries.  Falls back to OLLAMA_BASE_URL when none are set so that
        a single-node deployment needs no config changes.
        """
        if cls._nodes is None:
            nodes = []
            for i in range(1, 6):
                url = getattr(settings, f"LLAMA_NODE_{i}", "").strip().rstrip("/")
                if url:
                    nodes.append(url)
            if not nodes and settings.OLLAMA_BASE_URL:
                nodes.append(settings.OLLAMA_BASE_URL.rstrip("/"))
            cls._nodes = nodes
        return cls._nodes

    @classmethod
    def _next_node(cls) -> Optional[str]:
        """Pick the next node in round-robin order.  Thread-safe enough for
        asyncio (no true parallelism); fine even under concurrent requests."""
        nodes = cls._get_nodes()
        if not nodes:
            return None
        url = nodes[cls._rr_counter % len(nodes)]
        cls._rr_counter += 1
        return url

    # ------------------------------------------------------------------ #
    #  LLMProvider interface                                               #
    # ------------------------------------------------------------------ #
    def is_configured(self) -> bool:
        if self._override_url:
            return True
        return bool(self._get_nodes())

    async def generate(self, level: LevelContext, prompt: str) -> str:
        nodes = [self._override_url] if self._override_url else self._get_nodes()
        if not nodes:
            raise RuntimeError("No Ollama nodes are configured.")

        payload = {
            "model": self.default_model,
            "messages": [
                {"role": "system", "content": level.system_prompt},
                {"role": "user",   "content": prompt},
            ],
            "stream": False,
            "options": {"temperature": 0.2},
        }

        client = await get_http_client()
        last_err = None

        # Try up to len(nodes) times, cycling through round-robin with automatic failover
        for _ in range(len(nodes)):
            base_url = self._override_url or self._next_node()
            async with self._get_semaphore():
                try:
                    response = await client.post(f"{base_url}/api/chat", json=payload)
                    response.raise_for_status()
                    content = (response.json().get("message") or {}).get("content") or ""
                    return content.strip()
                except httpx.HTTPStatusError as e:
                    last_err = RuntimeError(f"Ollama node {base_url} returned HTTP {e.response.status_code}")
                    logger.warning(f"Ollama node {base_url} failed with HTTP {e.response.status_code}, trying next node...")
                except httpx.RequestError as e:
                    last_err = RuntimeError(f"Failed to connect to Ollama node {base_url}: {e}")
                    logger.warning(f"Failed to connect to Ollama node {base_url}: {e}, trying next node...")

        raise last_err or RuntimeError("All Ollama nodes failed to respond.")

def _looks_like_placeholder(key: str) -> bool:
    upper = (key or "").upper()
    return any(marker in upper for marker in ("YOUR-", "YOUR_", "CHANGE_ME", "PLACEHOLDER", "XXXX"))


class NvidiaLLMProvider(LLMProvider):
    name = "NVIDIA Nemotron 3 Ultra"

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key if api_key is not None else settings.NVIDIA_API_KEY
        self.base_url = (base_url or settings.NVIDIA_BASE_URL or "").rstrip("/")
        self.model = model or settings.NVIDIA_MODEL

    def is_configured(self) -> bool:
        return bool(self.api_key and self.base_url) and not _looks_like_placeholder(self.api_key)

    async def generate(self, level: LevelContext, prompt: str) -> str:
        if not self.is_configured():
            raise RuntimeError("NVIDIA API key is missing or is a placeholder.")

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
            raise RuntimeError(f"NVIDIA API returned HTTP {e.response.status_code}: {e.response.text[:200]}") from e
        except httpx.RequestError as e:
            raise RuntimeError(f"Failed to connect to NVIDIA API: {e}") from e

        choices = response.json().get("choices") or [{}]
        content = (choices[0].get("message") or {}).get("content") or ""
        return content.strip()

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
