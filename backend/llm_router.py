# llm_router.py - Routing and priority abstraction for LLMs in Vakya-Bhed 2026

import logging
import time
from typing import List, Optional, Tuple

from backend.config import settings
from backend.llm_provider import (
    GeminiLLMProvider,
    GroqLLMProvider,
    OpenRouterLLMProvider,
    LevelContext,
    LLMProvider,
    MockLLMProvider,
)

logger = logging.getLogger("vakyabhed.llm_router")

# How long a provider is skipped after it fails. Without this, a dead upstream
# costs every single submission a full connect/read timeout before the fallback
# is even attempted, which is what makes the arena feel frozen under load.
PROVIDER_COOLDOWN_SECONDS = 30.0

_mock_provider = MockLLMProvider()

# Providers are instantiated once so the shared HTTP pool is actually shared
_provider_chain: Optional[List[LLMProvider]] = None

# provider name -> unix timestamp until which it is considered unhealthy
_cooldowns: dict = {}

def get_provider_chain() -> List[LLMProvider]:
    """Three-tier Cloud Fallback: Gemini (5 keys) -> Groq (LPU) -> OpenRouter (Free OSS)"""
    global _provider_chain
    if _provider_chain is None:
        gemini = GeminiLLMProvider()
        groq = GroqLLMProvider()
        openrouter = OpenRouterLLMProvider()
        
        pref = (settings.PRIMARY_PROVIDER or "gemini").lower().strip()
        if pref == "groq":
            _provider_chain = [groq, gemini, openrouter]
        elif pref in ("openrouter", "nvidia"):
            _provider_chain = [openrouter, gemini, groq]
        else:
            # Default: Gemini (5 keys) -> Groq -> OpenRouter
            _provider_chain = [gemini, groq, openrouter]
    return _provider_chain


def _is_cooling_down(provider: LLMProvider) -> bool:
    until = _cooldowns.get(provider.name)
    return until is not None and time.monotonic() < until


def _mark_failed(provider: LLMProvider) -> None:
    _cooldowns[provider.name] = time.monotonic() + PROVIDER_COOLDOWN_SECONDS


def _mark_healthy(provider: LLMProvider) -> None:
    _cooldowns.pop(provider.name, None)


async def generate_response(
    level: LevelContext,
    user_prompt: str,
) -> Tuple[Optional[str], Optional[str], float, bool, Optional[str]]:
    """
    Route one LLM request through the fallback chain.

    Returns ``(response_text, provider_name, latency_seconds, success, error)``.
    In DEV_MODE every request is served by MockLLMProvider.
    """
    start_time = time.monotonic()

    if settings.DEV_MODE:
        try:
            resp = await _mock_provider.generate(level, user_prompt)
            return resp, _mock_provider.name, time.monotonic() - start_time, True, None
        except Exception as e:  # pragma: no cover - mock should not fail
            return None, _mock_provider.name, time.monotonic() - start_time, False, str(e)

    chain = get_provider_chain()
    skipped: List[str] = []
    last_error = "No LLM provider is configured."

    for attempt_round in (1, 2):
        # First pass honours the cooldowns; if every provider is cooling down we
        # do a second pass anyway rather than failing the submission outright.
        for provider in chain:
            if not provider.is_configured():
                if attempt_round == 1:
                    skipped.append(f"{provider.name} (not configured)")
                continue
            if attempt_round == 1 and _is_cooling_down(provider):
                skipped.append(f"{provider.name} (cooling down)")
                continue

            provider_start = time.monotonic()
            try:
                logger.info("LLM router: trying %s for level %s", provider.name, level.level_id)
                response_text = await provider.generate(level, user_prompt)
                if not response_text:
                    raise RuntimeError("Provider returned an empty response.")
                _mark_healthy(provider)
                logger.info(
                    "LLM router: %s succeeded in %.2fs", provider.name, time.monotonic() - provider_start
                )
                return response_text, provider.name, time.monotonic() - start_time, True, None
            except Exception as e:
                last_error = str(e)
                _mark_failed(provider)
                logger.warning("LLM router: %s failed: %s", provider.name, last_error)

        if skipped:
            logger.info("LLM router: skipped providers: %s", ", ".join(skipped))
        # Only retry the cooling-down providers if nothing usable was tried.
        if not skipped:
            break
        skipped = []

    latency = time.monotonic() - start_time
    logger.error("LLM router: all providers failed. Last error: %s", last_error)
    return None, None, latency, False, f"All LLM providers failed. Last error: {last_error}"
