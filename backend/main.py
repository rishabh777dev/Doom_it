import os
import csv
import json
import logging
import psutil
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from io import StringIO
from typing import List, Dict, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Response, Request, BackgroundTasks
import time
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, text

from backend import database
from backend.config import settings
from backend.database import get_db, engine, SessionLocal
from backend.models import Team, Progress, Level, PromptLog, Score, CompetitionState, AuditLog, ParticipantHint, Session as UserSession
from backend.schemas import (
    UserLogin, TokenResponse, UserResponse, ParticipantCreate, ParticipantUpdate, ParticipantResponse,
    LevelInfo, PromptSubmit, SubmissionResponse, SubmissionDetail, ParticipantStatsResponse, LevelProgressDetail,
    LeaderboardResponse, LeaderboardEntry, TimerResponse, CompetitionStateUpdate, AdminSubmissionLog, SystemHealthResponse,
    HintStatusResponse, HintRevealResponse, HintRevealRequest, PasswordVerify, AdminLevelInfo, LevelSecretUpdate,
    ScoreBreakdown
)
from backend.auth import (
    hash_password, verify_password, create_access_token, get_current_user,
    get_current_participant, get_current_admin, init_user_session
)
from backend.evaluator import evaluate_submission
from backend.llm_provider import LevelContext, close_http_client
from backend.scoring import calculate_score, get_hint_penalty, get_score_breakdown
from backend.queue_manager import QueueFullError, queue_manager
from backend.seed import seed_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# Sentinel used to encode "seconds left on a paused clock" inside end_time.
PAUSE_EPOCH = datetime(1970, 1, 1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    seed_database()
    logger.info("Starting LLM request queue...")
    await queue_manager.start()
    try:
        yield
    finally:
        logger.info("Stopping LLM request queue...")
        await queue_manager.stop()
        await close_http_client()


app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url="/docs" if settings.DEV_MODE else None,
    redoc_url="/redoc" if settings.DEV_MODE else None,
    lifespan=lifespan,
)

# CORS. Browsers reject credentialed requests against a literal "*" origin, so
# use regex matching for the wildcard case instead of silently breaking cookies.
_cors_origins = settings.cors_origins_list
_cors_kwargs = (
    {"allow_origin_regex": ".*"} if _cors_origins == ["*"] else {"allow_origins": _cors_origins}
)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    **_cors_kwargs,
)

@app.get("/")
async def root_welcome():
    return {
        "status": "online",
        "name": "Vakya-Bhed 2026 Competition Platform API",
        "health_checks": {
            "server": "/api/health",
            "database": "/api/health/database"
        }
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok", 
        "message": "FastAPI server is running"
    }

@app.get("/api/health/database")
async def database_health_check():
    if database.verify_connection():
        return {
            "status": "ok",
            "message": "Successfully connected to Supabase"
        }
    raise HTTPException(status_code=503, detail="Failed to connect to Supabase")

@app.get("/api/health/providers")
async def get_providers_health():
    """Probe every active LLM cloud upstream (Gemini, Groq, OpenRouter, Supabase) concurrently."""
    import asyncio
    import httpx

    async def probe(client: httpx.AsyncClient, url: str, headers: Optional[dict] = None) -> str:
        try:
            r = await client.get(url, headers=headers or {})
            return "UP" if r.status_code < 400 else f"DOWN (HTTP {r.status_code})"
        except Exception as e:
            return f"DOWN ({type(e).__name__})"

    checks: List[tuple] = []
    results: Dict[str, str] = {}

    gemini_key = (
        settings.GEMINI_API_KEY_1 or settings.GEMINI_API_KEY_2 or settings.GEMINI_API_KEY_3 or
        settings.GEMINI_API_KEY_4 or settings.GEMINI_API_KEY_5 or settings.GEMINI_API_KEY
    )
    openrouter_key = settings.OPENROUTER_API_KEY or settings.NVIDIA_API_KEY
    groq_key = settings.GROQ_API_KEY

    async with httpx.AsyncClient(timeout=3.0) as client:
        # 1. Gemini
        if not gemini_key or "YOUR-" in gemini_key.upper():
            results["Gemini (Primary 5-Keys)"] = "DOWN (API key missing)"
        else:
            checks.append((
                "Gemini (Primary 5-Keys)",
                probe(client, f"{settings.GEMINI_BASE_URL.rstrip('/')}/models/{settings.GEMINI_MODEL}",
                      {"x-goog-api-key": gemini_key}),
            ))

        # 2. Groq
        if not groq_key or "YOUR-" in groq_key.upper():
            results["Groq (Secondary LPU)"] = "STANDBY (API key optional)"
        else:
            checks.append((
                "Groq (Secondary LPU)",
                probe(client, f"{settings.GROQ_BASE_URL.rstrip('/')}/models",
                      {"Authorization": f"Bearer {groq_key}"}),
            ))

        # 3. OpenRouter
        if not openrouter_key or "YOUR-" in openrouter_key.upper():
            results["OpenRouter (Tertiary Free OSS)"] = "STANDBY (API key optional)"
        else:
            checks.append((
                "OpenRouter (Tertiary Free OSS)",
                probe(client, f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/models",
                      {"Authorization": f"Bearer {openrouter_key}"}),
            ))

        # Supabase check is blocking, so keep it off the event loop.
        db_task = asyncio.to_thread(database.verify_connection)
        probe_results = await asyncio.gather(db_task, *[c[1] for c in checks])

    results["Supabase Database"] = "UP" if probe_results[0] else "DOWN"
    for (name, _), outcome in zip(checks, probe_results[1:]):
        results[name] = outcome
    return results

# In-memory rate limiting dictionaries keyed by participant id
last_submission_times: Dict[str, datetime] = {}
submission_history_times: Dict[str, List[datetime]] = {}

# Helper: Log audit events
def log_audit(db: Session, user_id: Optional[str], action: str, details: str, request: Optional[Request]):
    ip = "unknown"
    if request is not None and request.client:
        ip = request.client.host
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip
    ))
    db.commit()

# Helper: Seconds left on the clock for any competition state
def time_remaining_for(state: CompetitionState) -> int:
    if not state.end_time:
        return 0
    if state.status == "live":
        return max(0, int((state.end_time - datetime.utcnow()).total_seconds()))
    if state.status == "paused":
        # While paused, end_time holds the remaining duration offset from PAUSE_EPOCH.
        return max(0, int((state.end_time - PAUSE_EPOCH).total_seconds()))
    return 0


# ==============================================================================
# HIGH-PERFORMANCE IN-MEMORY CACHING (Zero DB Bottleneck Architecture)
# ==============================================================================

_TIMER_CACHE = {
    "data": None,
    "last_fetched": 0.0,
    "ttl": 3.0  # 3 seconds cache TTL
}

_LEADERBOARD_CACHE = {
    "data": None,
    "last_fetched": 0.0,
    "ttl": 5.0  # 5 seconds cache TTL
}

_LEVELS_CACHE: Dict[int, Level] = {}

def invalidate_timer_cache():
    _TIMER_CACHE["last_fetched"] = 0.0

def invalidate_leaderboard_cache():
    _LEADERBOARD_CACHE["last_fetched"] = 0.0

def get_cached_timer(db: Session) -> dict:
    now_mono = time.monotonic()
    if _TIMER_CACHE["data"] and (now_mono - _TIMER_CACHE["last_fetched"]) < _TIMER_CACHE["ttl"]:
        payload = dict(_TIMER_CACHE["data"])
        # If live and has end_time, compute real-time ticking down seconds in RAM (0ms latency)
        if payload.get("status") == "live" and payload.get("end_time"):
            remaining = max(0, int((payload["end_time"] - datetime.utcnow()).total_seconds()))
            payload["time_remaining_seconds"] = remaining
        return payload

    state = check_competition_timer(db)
    payload = timer_payload(state)
    _TIMER_CACHE["data"] = payload
    _TIMER_CACHE["last_fetched"] = now_mono
    return payload

def _async_record_prompt_submission(
    team_id,
    level_id: int,
    prompt_text: str,
    llm_response: str,
    provider_name: str,
    attempt_number: int,
    success: bool,
    latency_ms: int,
    new_attempts: dict,
    level_round_id: int,
    score_awarded: int,
    already_solved: bool
):
    try:
        with SessionLocal() as db:
            log = PromptLog(
                team_id=team_id,
                level=level_id,
                prompt=prompt_text,
                response=llm_response,
                provider=provider_name,
                attempt_number=attempt_number,
                success=success,
                latency_ms=latency_ms
            )
            db.add(log)
            p = db.query(Progress).filter(Progress.team_id == team_id).first()
            if p:
                p.attempts = new_attempts
                if success and level_round_id == 3 and not already_solved:
                    p_team = db.query(Team).filter(Team.id == team_id).first()
                    if p_team:
                        award_level_completion(db, p_team, level_id, score_awarded, round_id=level_round_id)
            db.commit()
            invalidate_leaderboard_cache()
    except Exception as e:
        logger.error("Async write-behind prompt log failed: %s", e)

def timer_payload(state: CompetitionState) -> dict:
    return {
        "status": state.status,
        "time_remaining_seconds": time_remaining_for(state),
        "start_time": state.start_time,
        "end_time": state.end_time,
        "current_round_id": state.current_round_id,
        "emergency_disable_submissions": state.emergency_disable_submissions
    }

# Helper: Check competition timer and update state
def check_competition_timer(db: Session) -> CompetitionState:
    state = db.query(CompetitionState).first()
    if not state:
        state = CompetitionState(status="not_started")
        db.add(state)
        db.commit()
        db.refresh(state)

    if state.status == "live" and state.end_time:
        if datetime.utcnow() > state.end_time:
            state.status = "ended"
            db.commit()
            db.refresh(state)

    return state

# Helper: level ids and max tier this participant has revealed a hint for
def revealed_hint_levels(db: Session, participant_id) -> dict:
    rows = db.query(ParticipantHint.level_id, ParticipantHint.hint_tier).filter(
        ParticipantHint.participant_id == participant_id
    ).all()
    res = {}
    for r in rows:
        lvl = r[0]
        tier = r[1] or 1
        if lvl not in res or tier > res[lvl]:
            res[lvl] = tier
    return res

# Helper: has this participant revealed the hint for a single level?
def _hint_revealed_for(db: Session, participant_id, level_id: int) -> bool:
    return db.query(ParticipantHint).filter(
        ParticipantHint.participant_id == participant_id,
        ParticipantHint.level_id == level_id
    ).first() is not None

# Helper: build a safe LevelInfo dict from an ORM Level row
def _level_to_info(lvl: Level, hint_revealed: bool) -> dict:
    return {
        "level_id": lvl.level_id,
        "round_id": lvl.round_id,
        "title": lvl.title,
        "description": lvl.description,
        "objective": lvl.objective,
        "base_score": lvl.base_score,
        "attempt_limit": lvl.attempt_limit,
        "attempt_penalty": lvl.attempt_penalty,
        "validation_type": lvl.validation_type,
        "enabled": lvl.enabled,
        "hint_released": lvl.hint_released,
        "hint_revealed": hint_revealed,
        "hint_penalty": get_hint_penalty(lvl.level_id, 1),
    }


# ==============================================================================
# AUTHENTICATION ENDPOINTS
# ==============================================================================

@app.post("/api/auth/login", response_model=TokenResponse)
def login(login_data: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(Team).filter(Team.team_name == login_data.username).first()
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
        
    # Generate stateless token session (admins exempt from single-device eviction)
    is_admin = (user.team_name == "admin")
    session_token = init_user_session(db, user.id, is_admin=is_admin)
    
    # Generate JWT access token containing username and session token
    access_token = create_access_token(
        data={"sub": user.team_name, "session_token": session_token}
    )
    
    # Set JWT in secure HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=not settings.DEV_MODE,  # HTTPS-only in production
        samesite="lax",
        path="/"
    )
    
    role = "ADMIN" if user.team_name == "admin" else "PARTICIPANT"
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "username": user.team_name
    }

@app.post("/api/auth/logout")
def logout(response: Response, current_user: Team = Depends(get_current_user), db: Session = Depends(get_db)):
    # Deactivate active sessions in database
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).update({"is_active": False})
    db.commit()
    # Clear HTTP-only cookie
    response.delete_cookie("access_token")
    return {"detail": "Logged out successfully"}

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: Team = Depends(get_current_user)):
    role = "ADMIN" if current_user.team_name == "admin" else "PARTICIPANT"
    return {
        "id": current_user.id,
        "username": current_user.team_name,
        "role": role,
        "created_at": current_user.created_at
    }

# ==============================================================================
# PARTICIPANT ARENA ENDPOINTS
# ==============================================================================

@app.get("/api/arena/level", response_model=LevelInfo)
def get_current_level(
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    level = db.query(Level).filter(
        Level.level_id == current_participant.progress.current_level,
        Level.enabled == True
    ).first()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current level not found or disabled by administrator."
        )

    # Check if this team revealed the hint for this level
    revealed = _hint_revealed_for(db, current_participant.id, level.level_id)

    return _level_to_info(level, revealed)

async def run_submission(
    level: Level,
    prompt_text: str,
    current_participant: Team,
    db: Session,
    background_tasks: Optional[BackgroundTasks] = None
) -> dict:
    """
    Shared submission pipeline for both /api/arena/submit and
    /api/levels/{id}/submit. The target level is passed in explicitly so no
    endpoint has to temporarily rewrite progress.current_level.
    """
    # 1. Verify competition state
    state = check_competition_timer(db)
    if state.emergency_disable_submissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Submissions are temporarily disabled by the administrator."
        )
    if state.status != "live":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Submissions rejected. Competition is currently {state.status.upper()}."
        )
    if level.round_id > state.current_round_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Level {level.level_id} belongs to Round {level.round_id}, which has not started yet."
        )

    # 2. Check Submission Cooldown and Requests Per Minute (RPM) Rate Limiting
    participant_id = str(current_participant.id)
    now = datetime.utcnow()

    # 2a. Check submission cooldown & anti-automation typing cadence
    if participant_id in last_submission_times:
        elapsed = (now - last_submission_times[participant_id]).total_seconds()
        if elapsed < 1.5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Anti-automation active: Minimum 2-second typing cadence required between prompts.",
                headers={"Retry-After": "2"}
            )
        if elapsed < settings.SUBMISSION_COOLDOWN_SECONDS:
            remaining = max(1, int(settings.SUBMISSION_COOLDOWN_SECONDS - elapsed))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Cooldown active. Please wait {remaining} more second(s) before submitting again.",
                headers={"Retry-After": str(remaining)}
            )

    # 2b. Check RPM limit
    history = submission_history_times.get(participant_id, [])
    one_minute_ago = now - timedelta(seconds=60)
    history = [t for t in history if t > one_minute_ago]

    if len(history) >= settings.MAX_RPM_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {settings.MAX_RPM_PER_USER} submissions per minute allowed.",
            headers={"Retry-After": "60"}
        )

    # Reserve the slot immediately so concurrent requests cannot both pass.
    history.append(now)
    submission_history_times[participant_id] = history
    last_submission_times[participant_id] = now

    # 3. Enforce attempt limits server-side using the JSONB attempts dictionary
    attempts_dict = current_participant.progress.attempts or {}
    attempts_used = attempts_dict.get(str(level.level_id), 0)

    if attempts_used >= level.attempt_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attempt limit reached for this level."
        )

    current_attempt = attempts_used + 1

    # 4. Snapshot the level before handing it to a worker task: the ORM row
    #    belongs to this request's Session and must not be read from another task.
    level_ctx = LevelContext.from_level(level)

    def release_reservation():
        """Give the attempt slot back when the failure was ours, not theirs."""
        last_submission_times.pop(participant_id, None)
        if submission_history_times.get(participant_id):
            submission_history_times[participant_id].pop()

    try:
        llm_response, provider_name, latency = await queue_manager.submit(level_ctx, prompt_text)
    except QueueFullError as e:
        release_reservation()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error("Error during LLM query for level %s: %s", level.level_id, e)
        release_reservation()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The model backend could not be reached. Your attempt was not recorded — please retry."
        )

    # 5. Evaluate the response for leak detection (purely analytical)
    success = evaluate_submission(
        validation_type=level.validation_type,
        llm_response=llm_response,
        secret=level.secret,
        target_phrase=level.target_phrase
    )

    # 6. Record the attempt against this level
    new_attempts = dict(attempts_dict)
    new_attempts[str(level.level_id)] = current_attempt
    current_participant.progress.attempts = new_attempts

    completed_list = list(current_participant.progress.completed_levels or [])
    already_solved = level.level_id in completed_list
    score_awarded = 0
    score_breakdown = None

    if success and level_ctx.round_id == 3 and not already_solved:
        hint_tier = revealed_hint_levels(db, current_participant.id).get(level_ctx.level_id, 0)
        score_breakdown = get_score_breakdown(level_ctx.level_id, current_attempt, hint_tier)
        score_awarded = score_breakdown["final_score"]
        already_solved = True
    elif already_solved:
        hint_tier = revealed_hint_levels(db, current_participant.id).get(level_ctx.level_id, 0)
        score_breakdown = get_score_breakdown(level_ctx.level_id, current_attempt, hint_tier)

    # Async Write-Behind: Return response immediately without waiting for database!
    if background_tasks:
        background_tasks.add_task(
            _async_record_prompt_submission,
            current_participant.id,
            level.level_id,
            prompt_text,
            llm_response,
            provider_name,
            current_attempt,
            success,
            int(latency * 1000),
            new_attempts,
            level_ctx.round_id,
            score_awarded,
            level.level_id in completed_list
        )
    else:
        _async_record_prompt_submission(
            current_participant.id,
            level.level_id,
            prompt_text,
            llm_response,
            provider_name,
            current_attempt,
            success,
            int(latency * 1000),
            new_attempts,
            level_ctx.round_id,
            score_awarded,
            level.level_id in completed_list
        )

    return {
        "success": success,
        "llm_response": llm_response,
        "score_awarded": score_awarded,
        "attempts_used": current_attempt,
        "attempts_remaining": max(0, level.attempt_limit - current_attempt),
        "level_solved": already_solved,
        "current_level_id": current_participant.progress.current_level,
        "total_score": current_participant.progress.total_score,
        "latency_ms": int(latency * 1000),
        "score_breakdown": score_breakdown
    }


def award_level_completion(db: Session, participant: Team, level_id: int, score_awarded: int, round_id: int = 1) -> None:
    """Credit a solved level, roll the score summary and unlock the next node."""
    progress = participant.progress
    progress.total_score += score_awarded

    completed_list = list(progress.completed_levels or [])
    if level_id not in completed_list:
        completed_list.append(level_id)
    progress.completed_levels = completed_list

    score_entry = db.query(Score).filter(Score.team_id == participant.id).first()
    if not score_entry:
        score_entry = Score(team_id=participant.id, round1_score=0, total_score=0)
        db.add(score_entry)
    # Credit the per-round column using the actual round from the level definition.
    if round_id == 1:
        score_entry.round1_score += score_awarded
    score_entry.total_score += score_awarded

    # Check competition state for cross-round progression limits
    state = db.query(CompetitionState).first()
    current_round = state.current_round_id if state else 1

    # Round level boundaries:
    # Round 1: Levels 1-5 (Level 5 completion must not unlock Level 6 unless Round 2 is started)
    # Round 2: Levels 6-9 (Level 9 completion must not unlock Level 10 unless Round 3 is started)
    # Round 3: Levels 10-12 (Final level 12)
    can_unlock_next = True
    if level_id == 5 and current_round < 2:
        can_unlock_next = False
    elif level_id == 9 and current_round < 3:
        can_unlock_next = False
    elif level_id >= 12:
        can_unlock_next = False

    if can_unlock_next:
        next_lvl = db.query(Level).filter(
            Level.level_id == level_id + 1,
            Level.enabled == True
        ).first()
        if next_lvl:
            # Never move a team backwards if they solved an earlier level late.
            progress.current_level = max(progress.current_level, next_lvl.level_id)
            unlocked_list = list(progress.unlocked_levels or [])
            if next_lvl.level_id not in unlocked_list:
                unlocked_list.append(next_lvl.level_id)
            progress.unlocked_levels = unlocked_list

    db.commit()


@app.post("/api/arena/submit", response_model=SubmissionResponse)
async def submit_prompt(
    submission: PromptSubmit,
    request: Request,
    background_tasks: BackgroundTasks,
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    level = db.query(Level).filter(
        Level.level_id == current_participant.progress.current_level,
        Level.enabled == True
    ).first()

    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current level config not found or disabled."
        )

    return await run_submission(level, submission.prompt, current_participant, db, background_tasks)

@app.get("/api/arena/history", response_model=List[SubmissionDetail])
def get_submission_history(
    limit: int = 200,
    level_id: Optional[int] = None,
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    limit = max(1, min(limit, 1000))
    query = db.query(PromptLog).filter(
        PromptLog.team_id == current_participant.id
    )
    if level_id is not None:
        query = query.filter(PromptLog.level == level_id)

    logs = query.order_by(desc(PromptLog.created_at)).limit(limit).all()

    levels = {l.level_id: l for l in db.query(Level).all()}
    hints_revealed = revealed_hint_levels(db, current_participant.id)

    # Fallback attempt numbering for rows written before attempt_number existed.
    logs_by_level: Dict[int, list] = {}
    for log in reversed(logs):
        logs_by_level.setdefault(log.level, []).append(log)

    details = []
    for log in logs:
        attempt_number = log.attempt_number
        if attempt_number is None:
            level_logs = logs_by_level.get(log.level, [])
            attempt_number = level_logs.index(log) + 1 if log in level_logs else 1

        lvl = levels.get(log.level)
        success = log.success
        score_awarded = 0
        if success and lvl:
            score_awarded = calculate_score(
                log.level, attempt_number, hints_revealed.get(log.level, 0)
            )

        details.append(SubmissionDetail(
            id=log.id,
            level_id=log.level,
            round_id=lvl.round_id if lvl else 1,
            prompt=log.prompt,
            response=log.response,
            success=success,
            score_awarded=score_awarded,
            attempt_number=attempt_number,
            latency_ms=log.latency_ms or 0,
            model_name=log.provider or "unknown",
            created_at=log.created_at
        ))
    return details

@app.get("/api/arena/level/hint", response_model=HintStatusResponse)
def get_level_hint(
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    level = db.query(Level).filter(
        Level.level_id == current_participant.progress.current_level,
        Level.enabled == True
    ).first()
    
    if not level:
        raise HTTPException(status_code=404, detail="Level not found")

    hints = db.query(ParticipantHint).filter(
        ParticipantHint.participant_id == current_participant.id,
        ParticipantHint.level_id == level.level_id
    ).all()
    unlocked_tiers = {h.hint_tier for h in hints}
    max_tier = max(unlocked_tiers) if unlocked_tiers else 0
    revealed = max_tier > 0

    p1 = get_hint_penalty(level.level_id, 1)
    p2 = get_hint_penalty(level.level_id, 2)

    return {
        "released": level.hint_released,
        "revealed": revealed,
        "hint_tier": max_tier,
        "hint_text": level.hint_text if (level.hint_released and 1 in unlocked_tiers) else None,
        "hint_text_2": level.hint_text_2 if (level.hint_released and 2 in unlocked_tiers) else None,
        "penalty_tier_1": p1,
        "penalty_tier_2": p2,
        "penalty": get_hint_penalty(level.level_id, max_tier) if max_tier > 0 else p1,
    }

@app.post("/api/arena/level/hint/reveal", response_model=HintRevealResponse)
def reveal_level_hint(
    payload: Optional[HintRevealRequest] = None,
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    level = db.query(Level).filter(
        Level.level_id == current_participant.progress.current_level,
        Level.enabled == True
    ).first()
    
    if not level:
        raise HTTPException(status_code=404, detail="Level not found")

    if not level.hint_released:
        raise HTTPException(status_code=400, detail="No hint has been released by organizers for this level yet.")

    existing_hints = db.query(ParticipantHint).filter(
        ParticipantHint.participant_id == current_participant.id,
        ParticipantHint.level_id == level.level_id
    ).all()
    existing_tiers = {h.hint_tier for h in existing_hints}

    # If payload specified a tier (1 or 2), use it. Otherwise, advance to next tier: 1 then 2.
    if payload and payload.tier in (1, 2):
        target_tier = payload.tier
    else:
        target_tier = 2 if 1 in existing_tiers else 1

    if target_tier not in existing_tiers:
        db.add(ParticipantHint(
            participant_id=current_participant.id,
            level_id=level.level_id,
            hint_tier=target_tier
        ))
        db.commit()

    penalty = get_hint_penalty(level.level_id, target_tier)
    chosen_text = level.hint_text_2 if target_tier == 2 else level.hint_text
    if not chosen_text:
        chosen_text = level.hint_text or "No hint description defined."

    return {
        "success": True,
        "hint_tier": target_tier,
        "hint_text": chosen_text,
        "penalty_applied": penalty,
        "message": f"Hint Tier {target_tier} revealed. {penalty} points penalty will be deducted from your score upon solving."
    }

@app.get("/api/arena/stats", response_model=ParticipantStatsResponse)
def get_participant_stats(
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    levels = db.query(Level).filter(Level.enabled == True).all()

    level_details: List[LevelProgressDetail] = []
    total_attempts = 0

    completed_levels = set(current_participant.progress.completed_levels or [])
    attempts_dict = current_participant.progress.attempts or {}
    # One query for every revealed hint rather than one per level.
    hints_revealed = revealed_hint_levels(db, current_participant.id)

    for lvl in levels:
        attempts_count = attempts_dict.get(str(lvl.level_id), 0)
        total_attempts += attempts_count

        solved = lvl.level_id in completed_levels
        score_earned = 0
        score_breakdown = None
        if solved:
            h_tier = hints_revealed.get(lvl.level_id, 0)
            score_earned = calculate_score(
                lvl.level_id, attempts_count, h_tier
            )
            score_breakdown = get_score_breakdown(
                lvl.level_id, attempts_count, h_tier
            )

        level_details.append(LevelProgressDetail(
            level_id=lvl.level_id,
            title=lvl.title,
            round_id=lvl.round_id,
            attempts_used=attempts_count,
            solved=solved,
            score_earned=score_earned,
            score_breakdown=score_breakdown
        ))

    recent_submissions = get_submission_history(
        limit=10, current_participant=current_participant, db=db
    )

    avg_latency = db.query(func.avg(PromptLog.latency_ms)).filter(
        PromptLog.team_id == current_participant.id,
        PromptLog.latency_ms.isnot(None)
    ).scalar()

    return {
        "username": current_participant.team_name,
        "team_name": current_participant.team_name,
        "total_score": current_participant.progress.total_score,
        "current_level_id": current_participant.progress.current_level,
        "levels_solved_count": len(completed_levels),
        "total_attempts": total_attempts,
        "average_latency_ms": round(float(avg_latency), 1) if avg_latency else 0.0,
        "level_details": level_details,
        "recent_submissions": recent_submissions
    }

# ==============================================================================
# LEADERBOARD ENDPOINT
# ==============================================================================

@app.get("/api/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(db: Session = Depends(get_db)):
    state = check_competition_timer(db)
    time_remaining = time_remaining_for(state)

    # joinedload keeps this to one query instead of one per team for p.team.
    progress_records = (
        db.query(Progress)
        .options(joinedload(Progress.team))
        .order_by(desc(Progress.total_score))
        .all()
    )

    entries = []
    rank = 1
    for p in progress_records:
        if not p.team or p.team.team_name == "admin":
            continue

        solved = len(p.completed_levels or [])
        curr_round = 1
        if p.current_level > 9:
            curr_round = 3
        elif p.current_level > 5:
            curr_round = 2

        entries.append(LeaderboardEntry(
            rank=rank,
            team_name=p.team.team_name,
            total_score=p.total_score,
            levels_solved=solved,
            current_round=curr_round
        ))
        rank += 1

    return {
        "entries": entries,
        "status": state.status,
        "time_remaining_seconds": time_remaining
    }

# ==============================================================================
# TIMER & GENERAL STATE ENDPOINT
# ==============================================================================

@app.get("/api/timer", response_model=TimerResponse)
def get_timer(db: Session = Depends(get_db)):
    return get_cached_timer(db)

@app.get("/health")
def root_health_check(db: Session = Depends(get_db)):
    # Named distinctly from the /api/health handler: two functions sharing one
    # name broke reverse URL lookup by endpoint name.
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connectivity failed: {str(e)}")

# ==============================================================================
# ADMIN ENDPOINTS (Protected by get_current_admin)
# ==============================================================================

@app.get("/api/admin/health", response_model=SystemHealthResponse)
def get_admin_health(
    request: Request,
    current_admin: Team = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    # Check LLM status
    gemini_key = (
        settings.GEMINI_API_KEY_1 or settings.GEMINI_API_KEY_2 or settings.GEMINI_API_KEY_3 or
        settings.GEMINI_API_KEY_4 or settings.GEMINI_API_KEY_5 or settings.GEMINI_API_KEY
    )
    llm_status = "healthy" if (gemini_key or settings.DEV_MODE) else "unconfigured"

    cpu = psutil.cpu_percent()
    ram = psutil.virtual_memory().percent

    return {
        "status": "healthy" if db_status == "healthy" and llm_status == "healthy" else "unhealthy",
        "backend": "healthy",
        "database": db_status,
        "ollama": "healthy (cloud)",
        "configured_model": settings.GEMINI_MODEL if not settings.DEV_MODE else "mock-provider-active",
        "queue_size": queue_manager.queue.qsize(),
        "cpu_usage_percent": cpu,
        "ram_usage_percent": ram
    }

@app.get("/api/admin/levels", response_model=List[AdminLevelInfo])
def admin_list_levels(
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    levels = db.query(Level).all()
    return [
        {
            "level_id": l.level_id,
            "round_id": l.round_id,
            "title": l.title,
            "description": l.description,
            "objective": l.objective,
            "base_score": l.base_score,
            "attempt_limit": l.attempt_limit,
            "attempt_penalty": l.attempt_penalty,
            "validation_type": l.validation_type,
            "enabled": l.enabled,
            "hint_released": l.hint_released,
            "hint_revealed": False,
            "hint_text": l.hint_text,
            "hint_text_2": l.hint_text_2,
            "secret": l.secret,
            "system_prompt": l.system_prompt,
            "target_phrase": l.target_phrase
        } for l in levels
    ]

@app.put("/api/admin/levels/{level_id}/secret")
def admin_update_level_secret(
    level_id: int,
    data: LevelSecretUpdate,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Live-update a level's title, objective, hidden secret, target phrase, system prompt, and/or
    hint text. Changes take effect on the next submission — no restart needed.
    Only fields that are explicitly provided (non-None) are updated.
    """
    lvl = db.query(Level).filter(Level.level_id == level_id).first()
    if not lvl:
        raise HTTPException(status_code=404, detail=f"Level {level_id} not found.")

    changed_fields = []
    if data.title is not None:
        lvl.title = data.title
        changed_fields.append("title")
    if data.objective is not None:
        lvl.objective = data.objective
        changed_fields.append("objective")
    if data.secret is not None:
        lvl.secret = data.secret
        changed_fields.append("secret")
    if data.target_phrase is not None:
        lvl.target_phrase = data.target_phrase
        changed_fields.append("target_phrase")
    if data.system_prompt is not None:
        lvl.system_prompt = data.system_prompt
        changed_fields.append("system_prompt")
    if data.hint_text is not None:
        lvl.hint_text = data.hint_text
        changed_fields.append("hint_text")
    if data.hint_text_2 is not None:
        lvl.hint_text_2 = data.hint_text_2
        changed_fields.append("hint_text_2")

    if not changed_fields:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    db.commit()
    log_audit(
        db, current_admin.id, "UPDATE_LEVEL_SECRET",
        f"Updated fields {changed_fields} for Level {level_id}", request
    )
    return {"detail": f"Level {level_id} updated successfully.", "updated_fields": changed_fields}

@app.get("/api/admin/participants", response_model=List[ParticipantResponse])
def admin_list_participants(
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    progress_records = db.query(Progress).all()
    # Exclude admin itself from standard participant response list
    return [
        ParticipantResponse(
            id=p.team_id,
            username=p.team.team_name,
            team_name=p.team.team_name,
            current_level_id=p.current_level,
            total_score=p.total_score,
            last_login_at=p.updated_at,
            created_at=p.team.created_at
        ) for p in progress_records if p.team.team_name != "admin"
    ]

@app.post("/api/admin/participants", response_model=ParticipantResponse)
def admin_create_participant(
    p_data: ParticipantCreate,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Verify team uniqueness
    existing_team = db.query(Team).filter(Team.team_name == p_data.team_name).first()
    if existing_team:
        raise HTTPException(status_code=400, detail="Team name already exists.")

    new_team = Team(
        team_name=p_data.team_name,
        password=hash_password(p_data.password)
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    new_progress = Progress(
        team_id=new_team.id,
        current_level=1,
        total_score=0,
        unlocked_levels=[1],
        completed_levels=[],
        attempts={}
    )
    db.add(new_progress)
    
    new_score = Score(
        team_id=new_team.id,
        round1_score=0,
        total_score=0
    )
    db.add(new_score)
    db.commit()
    db.refresh(new_progress)

    log_audit(db, current_admin.id, "CREATE_PARTICIPANT", f"Created participant team {new_team.team_name}", request)
    
    return ParticipantResponse(
        id=new_team.id,
        username=new_team.team_name,
        team_name=new_team.team_name,
        current_level_id=new_progress.current_level,
        total_score=new_progress.total_score,
        last_login_at=None,
        created_at=new_team.created_at
    )

@app.put("/api/admin/participants/{id}", response_model=ParticipantResponse)
def admin_update_participant(
    id: str,
    p_data: ParticipantUpdate,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Participant team not found.")

    if p_data.password:
        team.password = hash_password(p_data.password)
    if p_data.team_name:
        team.team_name = p_data.team_name
    if p_data.current_level_id is not None:
        team.progress.current_level = p_data.current_level_id
        # Sync unlocked levels list to match up to current level index
        unlocked = list(team.progress.unlocked_levels or [])
        for lvl in range(1, p_data.current_level_id + 1):
            if lvl not in unlocked:
                unlocked.append(lvl)
        team.progress.unlocked_levels = unlocked

    db.commit()
    db.refresh(team.progress)
    
    log_audit(db, current_admin.id, "UPDATE_PARTICIPANT", f"Updated participant ID {id}", request)
    
    return ParticipantResponse(
        id=team.id,
        username=team.team_name,
        team_name=team.team_name,
        current_level_id=team.progress.current_level,
        total_score=team.progress.total_score,
        last_login_at=team.progress.updated_at,
        created_at=team.created_at
    )

@app.post("/api/admin/participants/{id}/reset-progress")
def admin_reset_participant_progress(
    id: str,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Participant team not found.")

    # Reset score and level
    team.progress.total_score = 0
    team.progress.current_level = 1
    team.progress.unlocked_levels = [1]
    team.progress.completed_levels = []
    team.progress.attempts = {}
    
    # Update score summary
    score_sum = db.query(Score).filter(Score.team_id == team.id).first()
    if score_sum:
        score_sum.round1_score = 0
        score_sum.total_score = 0
        
    # Delete participant log rows from prompt_logs
    db.query(PromptLog).filter(PromptLog.team_id == team.id).delete()
    db.query(ParticipantHint).filter(ParticipantHint.participant_id == team.id).delete()
    db.commit()

    # Clear rate limit cooldowns for this participant
    p_id_str = str(team.id)
    last_submission_times.pop(p_id_str, None)
    submission_history_times.pop(p_id_str, None)

    log_audit(db, current_admin.id, "RESET_PARTICIPANT_PROGRESS", f"Reset progress for team {team.team_name}", request)
    return {"detail": f"Progress successfully reset for team {team.team_name}."}

@app.delete("/api/admin/participants/{id}")
def admin_delete_participant(
    id: str,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Participant team not found.")

    if team.team_name == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete administrator account.")

    team_name = team.team_name
    p_id_str = str(team.id)

    # Clean up dependent records explicitly
    db.query(PromptLog).filter(PromptLog.team_id == team.id).delete()
    db.query(ParticipantHint).filter(ParticipantHint.participant_id == team.id).delete()
    db.query(UserSession).filter(UserSession.user_id == team.id).delete()
    db.query(Progress).filter(Progress.team_id == team.id).delete()
    db.query(Score).filter(Score.team_id == team.id).delete()
    
    db.delete(team)
    db.commit()

    # Clear rate limiting and session in-memory state
    last_submission_times.pop(p_id_str, None)
    submission_history_times.pop(p_id_str, None)

    log_audit(db, current_admin.id, "DELETE_PARTICIPANT", f"Deleted participant team {team_name} (ID {id})", request)
    return {"detail": f"Team '{team_name}' has been permanently deleted."}

@app.post("/api/admin/participants/{id}/unlock-level")
def admin_unlock_level(
    id: str,
    level_id: int,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Participant team not found.")
        
    if not (1 <= level_id <= 12):
        raise HTTPException(status_code=400, detail="Invalid level index. Must be between 1 and 12.")

    team.progress.current_level = level_id
    
    unlocked = list(team.progress.unlocked_levels or [])
    for lvl in range(1, level_id + 1):
        if lvl not in unlocked:
            unlocked.append(lvl)
    team.progress.unlocked_levels = unlocked
    
    db.commit()

    log_audit(db, current_admin.id, "UNLOCK_LEVEL", f"Manually set level {level_id} for team {team.team_name}", request)
    return {"detail": f"Level {level_id} unlocked for team {team.team_name}."}

@app.put("/api/admin/levels/{id}/hint")
def admin_toggle_hint_release(
    id: int,
    released: bool,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    level = db.query(Level).filter(Level.level_id == id).first()
    if not level:
        raise HTTPException(status_code=404, detail="Level not found.")
        
    level.hint_released = released
    db.commit()
    db.refresh(level)
    
    status_str = "released" if released else "hidden"
    log_audit(db, current_admin.id, "TOGGLE_HINT_RELEASE", f"Set hint for level {id} to {status_str}", request)
    return {"level_id": id, "hint_released": level.hint_released}

@app.get("/api/admin/submissions", response_model=List[AdminSubmissionLog])
def admin_list_submissions(
    limit: int = 2000,
    team_id: Optional[str] = None,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    limit = max(1, min(limit, 10000))

    query = db.query(PromptLog).options(joinedload(PromptLog.team))
    if team_id:
        query = query.filter(PromptLog.team_id == team_id)

    logs = (
        query
        .order_by(desc(PromptLog.created_at))
        .limit(limit)
        .all()
    )

    levels = {l.level_id: l for l in db.query(Level).all()}

    # All the hint reveals in one query instead of one per submission row.
    revealed = {
        (h.participant_id, h.level_id) for h in db.query(ParticipantHint).all()
    }

    submissions_details = []
    for log in logs:
        lvl = levels.get(log.level)
        round_id = lvl.round_id if lvl else 1

        # Prefer the values recorded at submission time; only recompute for rows
        # written before those columns existed.
        success = log.success
        attempt_number = log.attempt_number
        if attempt_number is None:
            attempt_number = db.query(PromptLog).filter(
                PromptLog.team_id == log.team_id,
                PromptLog.level == log.level,
                PromptLog.created_at <= log.created_at
            ).count()

        score_awarded = 0
        if success and lvl:
            hint_used = (log.team_id, log.level) in revealed
            try:
                score_awarded = calculate_score(log.level, attempt_number, hint_used)
            except Exception:
                score_awarded = 0

        submissions_details.append(AdminSubmissionLog(
            id=log.id,
            team_id=str(log.team_id) if log.team_id else None,
            username=log.team.team_name if log.team else "deleted",
            team_name=log.team.team_name if log.team else "deleted",
            level_id=log.level,
            round_id=round_id,
            prompt=log.prompt,
            response=log.response,
            success=success,
            score_awarded=score_awarded,
            attempt_number=attempt_number,
            latency_ms=log.latency_ms or 0,
            model_name=log.provider or "unknown",
            created_at=log.created_at
        ))

    return submissions_details

@app.put("/api/admin/competition", response_model=TimerResponse)
def admin_update_competition_state(
    update_data: CompetitionStateUpdate,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    state = db.query(CompetitionState).first()
    if not state:
        state = CompetitionState()
        db.add(state)
        db.commit()

    if update_data.status is not None:
        new_status = update_data.status.lower()
        if new_status not in ["not_started", "live", "paused", "ended"]:
            raise HTTPException(status_code=400, detail="Invalid status option.")
            
        if new_status == "live":
            # Check if resuming from paused
            if state.status == "paused" and state.end_time:
                remaining_seconds = max(0, int((state.end_time - PAUSE_EPOCH).total_seconds()))
                state.end_time = datetime.utcnow() + timedelta(seconds=remaining_seconds)
            else:
                dur = update_data.duration_minutes if update_data.duration_minutes else 60
                state.end_time = datetime.utcnow() + timedelta(minutes=dur)
            state.start_time = datetime.utcnow()
        elif new_status == "paused":
            if state.status == "live" and state.end_time:
                remaining_seconds = max(0, int((state.end_time - datetime.utcnow()).total_seconds()))
                state.end_time = PAUSE_EPOCH + timedelta(seconds=remaining_seconds)
            state.start_time = None
        elif new_status == "ended":
            state.end_time = datetime.utcnow()

        state.status = new_status

    if update_data.current_round_id is not None:
        new_round = update_data.current_round_id
        state.current_round_id = new_round

        # When admin advances round, unlock starting level for teams who finished previous round
        if new_round >= 2:
            progress_list = db.query(Progress).all()
            for p in progress_list:
                compl = p.completed_levels or []
                unl = list(p.unlocked_levels or [])
                # Round 2: Teams who completed Level 5 unlock Level 6
                if 5 in compl and 6 not in unl:
                    unl.append(6)
                    p.unlocked_levels = unl
                    if p.current_level < 6:
                        p.current_level = 6
                # Round 3: Teams who completed Level 9 unlock Level 10
                if new_round >= 3 and 9 in compl and 10 not in unl:
                    unl.append(10)
                    p.unlocked_levels = unl
                    if p.current_level < 10:
                        p.current_level = 10

    if update_data.emergency_disable_submissions is not None:
        state.emergency_disable_submissions = update_data.emergency_disable_submissions

    db.commit()
    db.refresh(state)

    log_audit(db, current_admin.id, "COMPETITION_STATE_CHANGE", f"Changed status to {state.status}", request)

    return timer_payload(state)

@app.get("/api/admin/logs/export")
def admin_export_logs(
    format: str = "csv",
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    logs = (
        db.query(PromptLog)
        .options(joinedload(PromptLog.team))
        .order_by(PromptLog.created_at)
        .all()
    )
    levels = {l.level_id: l for l in db.query(Level).all()}
    revealed = {
        (h.participant_id, h.level_id) for h in db.query(ParticipantHint).all()
    }

    def build_row(log) -> dict:
        """One shared projection so the CSV and JSON exports cannot drift apart."""
        lvl = levels.get(log.level)
        attempt_number = log.attempt_number
        if attempt_number is None:
            attempt_number = db.query(PromptLog).filter(
                PromptLog.team_id == log.team_id,
                PromptLog.level == log.level,
                PromptLog.created_at <= log.created_at
            ).count()

        success = log.success
        score_awarded = 0
        if success and lvl:
            hint_used = (log.team_id, log.level) in revealed
            score_awarded = calculate_score(log.level, attempt_number, hint_used)

        team_name = log.team.team_name if log.team else "deleted"
        return {
            "submission_id": log.id,
            "username": team_name,
            "team_name": team_name,
            "level_id": log.level,
            "round": lvl.round_id if lvl else 1,
            "prompt": log.prompt,
            "response": log.response,
            "success": success,
            "score_awarded": score_awarded,
            "attempt_number": attempt_number,
            "latency_ms": log.latency_ms or 0,
            "model": log.provider or "unknown",
            "timestamp": log.created_at.isoformat()
        }

    rows = [build_row(log) for log in logs]

    if format.lower() == "json":
        return StreamingResponse(
            iter([json.dumps(rows, indent=2)]),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=competition_submissions_export.json"}
        )

    # Default to CSV export format
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Submission ID", "Username", "Team Name", "Level ID", "Round",
        "Prompt", "Model Response", "Success", "Score Awarded",
        "Attempt Number", "Latency (ms)", "Model", "Timestamp"
    ])
    for row in rows:
        writer.writerow(list(row.values()))

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=competition_submissions_export.csv"}
    )


# ==============================================================================
# SECTION 4: COMPLIANT API ALIAS ENDPOINTS
# ==============================================================================

# Alias /api/competition/state to get_timer
@app.get("/api/competition/state", response_model=TimerResponse)
def get_competition_state(db: Session = Depends(get_db)):
    return get_timer(db)

# GET /api/levels -> return list of safe level configuration metadata
@app.get("/api/levels", response_model=List[LevelInfo])
def get_all_levels(
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    levels = db.query(Level).filter(Level.enabled == True).all()
    unlocked_levels = current_participant.progress.unlocked_levels or [1]

    # One query for all revealed hints instead of one per level.
    hints_revealed = revealed_hint_levels(db, current_participant.id)

    results = []
    for lvl in levels:
        is_unlocked = lvl.level_id in unlocked_levels
        if is_unlocked:
            results.append(_level_to_info(lvl, lvl.level_id in hints_revealed))
        else:
            results.append({
                "level_id": lvl.level_id,
                "round_id": lvl.round_id,
                "title": f"Locked Level {lvl.level_id}",
                "description": "Exploit previous levels to unlock this node.",
                "objective": "Locked",
                "base_score": lvl.base_score,
                "attempt_limit": lvl.attempt_limit,
                "attempt_penalty": lvl.attempt_penalty,
                "validation_type": "locked",
                "enabled": lvl.enabled,
                "hint_released": False,
                "hint_revealed": False,
            })
    return results

# GET /api/levels/{level_id} -> return specific level safe metadata
@app.get("/api/levels/{level_id}", response_model=LevelInfo)
def get_level_by_id(
    level_id: int,
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    unlocked_levels = current_participant.progress.unlocked_levels or [1]
    if level_id not in unlocked_levels:
        raise HTTPException(status_code=403, detail="Cannot access details for a locked level.")
        
    lvl = db.query(Level).filter(Level.level_id == level_id, Level.enabled == True).first()
    if not lvl:
        raise HTTPException(status_code=404, detail="Level not found")

    revealed = _hint_revealed_for(db, current_participant.id, lvl.level_id)
    return _level_to_info(lvl, revealed)

# POST /api/levels/{level_id}/submit -> submit prompt exploit for a specific level
@app.post("/api/levels/{level_id}/submit", response_model=SubmissionResponse)
async def submit_prompt_for_level(
    level_id: int,
    submission: PromptSubmit,
    request: Request,
    background_tasks: BackgroundTasks,
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    unlocked_levels = current_participant.progress.unlocked_levels or [1]
    if level_id not in unlocked_levels:
        raise HTTPException(status_code=403, detail="Cannot submit to a locked level.")

    level = db.query(Level).filter(
        Level.level_id == level_id,
        Level.enabled == True
    ).first()
    if not level:
        raise HTTPException(status_code=404, detail="Level not found or disabled.")

    # The target level is passed through explicitly. The previous version
    # temporarily overwrote progress.current_level, which leaked the wrong level
    # to any concurrent request and got persisted whenever the inner handler
    # committed mid-flight.
    return await run_submission(level, submission.prompt, current_participant, db, background_tasks)

# POST /api/levels/{level_id}/verify -> verify extracted password and complete level
@app.post("/api/levels/{level_id}/verify", response_model=SubmissionResponse)
def verify_level_password(
    level_id: int,
    verify_data: PasswordVerify,
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    # 1. Check if level is unlocked
    unlocked_levels = current_participant.progress.unlocked_levels or [1]
    if level_id not in unlocked_levels:
        raise HTTPException(status_code=403, detail="Cannot access details for a locked level.")

    # 1b. Flag verification awards points, so it must respect the clock and the
    #     emergency freeze exactly like prompt submission does.
    state = check_competition_timer(db)
    if state.emergency_disable_submissions:
        raise HTTPException(status_code=403, detail="Submissions are temporarily disabled by the administrator.")
    if state.status != "live":
        raise HTTPException(
            status_code=403,
            detail=f"Verification rejected. Competition is currently {state.status.upper()}."
        )

    # 2. Get Level Config
    level = db.query(Level).filter(Level.level_id == level_id, Level.enabled == True).first()
    if not level:
        raise HTTPException(status_code=404, detail="Level configuration not found.")
    if level.round_id > state.current_round_id:
        raise HTTPException(
            status_code=403,
            detail=f"Level {level.level_id} belongs to Round {level.round_id}, which has not started yet."
        )

    # 3. Normalize and compare passwords (case-insensitive for robustness)
    submitted_pwd = verify_data.captured_password.strip()
    correct_pwd = (level.secret or "").strip()

    attempts_dict = current_participant.progress.attempts or {}
    attempts_used = attempts_dict.get(str(level_id), 0)
    attempts_remaining = max(0, level.attempt_limit - attempts_used)

    if not correct_pwd or submitted_pwd.lower() != correct_pwd.lower():
        # Incorrect password: do not increment attempt count, do not reveal correct password
        return {
            "success": False,
            "llm_response": "Incorrect password.",
            "score_awarded": 0,
            "attempts_used": attempts_used,
            "attempts_remaining": attempts_remaining,
            "level_solved": False,
            "current_level_id": current_participant.progress.current_level,
            "total_score": current_participant.progress.total_score
        }

    # 4. Correct Password: mark level solved and calculate score
    already_solved = level_id in (current_participant.progress.completed_levels or [])

    score_awarded = 0
    hint_tier = revealed_hint_levels(db, current_participant.id).get(level_id, 0)
    effective_attempts = max(1, attempts_used + 1)
    score_breakdown = get_score_breakdown(level_id, effective_attempts, hint_tier)

    if not already_solved:
        score_awarded = score_breakdown["final_score"]
        award_level_completion(db, current_participant, level_id, score_awarded, round_id=level.round_id)

    return {
        "success": True,
        "llm_response": "Correct password. Level completed. Next level unlocked.",
        "score_awarded": score_awarded,
        "attempts_used": attempts_used,
        "attempts_remaining": attempts_remaining,
        "level_solved": True,
        "current_level_id": current_participant.progress.current_level,
        "total_score": current_participant.progress.total_score,
        "score_breakdown": score_breakdown
    }

# GET /api/progress -> return participant progress
@app.get("/api/progress")
def get_progress_data(current_participant: Team = Depends(get_current_participant)):
    return {
        "current_level": current_participant.progress.current_level,
        "total_score": current_participant.progress.total_score,
        "unlocked_levels": current_participant.progress.unlocked_levels,
        "completed_levels": current_participant.progress.completed_levels,
        "attempts": current_participant.progress.attempts
    }

# GET /api/stats -> return stats
@app.get("/api/stats", response_model=ParticipantStatsResponse)
def get_stats_data(
    current_participant: Team = Depends(get_current_participant),
    db: Session = Depends(get_db)
):
    return get_participant_stats(current_participant, db)

# Admin Aliases
@app.get("/api/admin/teams", response_model=List[ParticipantResponse])
def get_admin_teams(
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return admin_list_participants(current_admin, db)

@app.post("/api/admin/team/{team_id}/reset")
def admin_reset_team(
    team_id: str,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return admin_reset_participant_progress(id=team_id, request=request, current_admin=current_admin, db=db)

@app.post("/api/admin/team/{team_id}/unlock")
def admin_unlock_team_level(
    team_id: str,
    level_id: int,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return admin_unlock_level(id=team_id, level_id=level_id, request=request, current_admin=current_admin, db=db)

@app.post("/api/admin/team/{team_id}/score")
def admin_modify_team_score(
    team_id: str,
    score_increment: int,
    request: Request,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
    team.progress.total_score += score_increment
    score_entry = db.query(Score).filter(Score.team_id == team.id).first()
    if score_entry:
        score_entry.total_score += score_increment
    db.commit()
    log_audit(db, current_admin.id, "MANUAL_SCORE_UPDATE", f"Modified team score by {score_increment}", request)
    return {"detail": "Score updated successfully"}

@app.get("/api/admin/logs", response_model=List[AdminSubmissionLog])
def get_admin_logs(
    limit: int = 2000,
    team_id: Optional[str] = None,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Alias of /api/admin/submissions.
    return admin_list_submissions(limit=limit, team_id=team_id, current_admin=current_admin, db=db)

@app.post("/api/admin/competition/start", response_model=TimerResponse)
def admin_start_competition(
    duration_minutes: Optional[int] = 60,
    request: Request = None,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    update_data = CompetitionStateUpdate(status="live", duration_minutes=duration_minutes)
    return admin_update_competition_state(update_data, request, current_admin, db)

@app.post("/api/admin/competition/pause", response_model=TimerResponse)
def admin_pause_competition(
    request: Request = None,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    update_data = CompetitionStateUpdate(status="paused")
    return admin_update_competition_state(update_data, request, current_admin, db)

@app.post("/api/admin/competition/resume", response_model=TimerResponse)
def admin_resume_competition(
    request: Request = None,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    update_data = CompetitionStateUpdate(status="live")
    return admin_update_competition_state(update_data, request, current_admin, db)

@app.post("/api/admin/competition/end", response_model=TimerResponse)
def admin_end_competition(
    request: Request = None,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    update_data = CompetitionStateUpdate(status="ended")
    return admin_update_competition_state(update_data, request, current_admin, db)

@app.post("/api/admin/submissions/freeze")
def admin_freeze_submissions(
    request: Request = None,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    state = db.query(CompetitionState).first()
    if not state:
        state = CompetitionState(status="not_started")
        db.add(state)
    state.emergency_disable_submissions = True
    db.commit()
    log_audit(db, current_admin.id, "SUBMISSIONS_FREEZE", "Froze submissions", request)
    return {"detail": "Submissions frozen successfully"}

@app.post("/api/admin/submissions/unfreeze")
def admin_unfreeze_submissions(
    request: Request = None,
    current_admin: Team = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    state = db.query(CompetitionState).first()
    if not state:
        state = CompetitionState(status="not_started")
        db.add(state)
    state.emergency_disable_submissions = False
    db.commit()
    log_audit(db, current_admin.id, "SUBMISSIONS_UNFREEZE", "Unfroze submissions", request)
    return {"detail": "Submissions unfrozen successfully"}

# ==============================================================================
# STATIC FILES SERVING (Production deployment single container helper)
# ==============================================================================

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
if os.path.exists(frontend_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/") or full_path == "health" or full_path == "docs" or full_path == "redoc":
            raise HTTPException(status_code=404, detail="API endpoint not found.")
            
        index_file = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        else:
            return {"detail": "Vakya-Bhed 2026 platform backend running. Frontend assets compiling."}
else:
    # No fallback root definition is required since the welcome root GET / is defined at the top.
    pass
