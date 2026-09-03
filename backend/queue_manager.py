# queue_manager.py - Bounded work queue in front of the LLM providers

import asyncio
import logging
from typing import Tuple

from backend.llm_provider import LevelContext

logger = logging.getLogger("vakyabhed.queue_manager")


class QueueFullError(RuntimeError):
    """Raised when the arena is saturated, so the API can answer 503 not 500."""


class LLMQueueManager:
    def __init__(self, concurrency_limit: int = 15, max_queue_size: int = 100):
        self.concurrency_limit = concurrency_limit
        self.max_queue_size = max_queue_size
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.workers: list = []
        self.running = False

    async def start(self) -> None:
        if self.running:
            logger.debug("Queue manager already running; ignoring duplicate start().")
            return
        self.running = True
        # Recreate the queue so it is bound to the active running event loop.
        self.queue = asyncio.Queue(maxsize=self.max_queue_size)
        self.workers = [
            asyncio.create_task(self._worker_loop(i), name=f"llm-worker-{i}")
            for i in range(self.concurrency_limit)
        ]
        logger.info("Started %d LLM queue workers.", self.concurrency_limit)

    async def stop(self) -> None:
        self.running = False
        for worker in self.workers:
            worker.cancel()
        if self.workers:
            await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()
        logger.info("Stopped LLM queue workers.")

    async def submit(self, level: LevelContext, prompt: str) -> Tuple[str, str, float]:
        """
        Queue one prompt and wait for a worker to resolve it.

        Returns ``(response_text, provider_name, latency_seconds)``.
        Raises QueueFullError when the queue is saturated.
        """
        if not self.running:
            # Fall back to inline execution rather than hanging forever on a
            # future no worker will ever pick up.
            logger.warning("Queue manager is not running; serving request inline.")
            return await self._generate(level, prompt)

        if self.queue.full():
            raise QueueFullError(
                "The arena is processing peak traffic right now. Please retry in a few seconds."
            )

        future = asyncio.get_running_loop().create_future()
        await self.queue.put((level, prompt, future))
        return await future

    @staticmethod
    async def _generate(level: LevelContext, prompt: str) -> Tuple[str, str, float]:
        from backend import llm_router

        response_text, provider_name, latency, success, error = await llm_router.generate_response(
            level=level, user_prompt=prompt
        )
        if not success or not response_text:
            raise RuntimeError(error or "LLM generation failed")
        return response_text, provider_name, latency

    async def _worker_loop(self, worker_id: int) -> None:
        while self.running:
            try:
                level, prompt, future = await self.queue.get()
            except asyncio.CancelledError:
                break

            try:
                try:
                    result = await self._generate(level, prompt)
                    if not future.done():
                        future.set_result(result)
                except asyncio.CancelledError:
                    if not future.done():
                        future.cancel()
                    raise
                except Exception as e:
                    logger.error("Worker %d failed to process prompt: %s", worker_id, e)
                    if not future.done():
                        future.set_exception(e)
            finally:
                self.queue.task_done()


# Singleton instance of the queue manager
queue_manager = LLMQueueManager()
