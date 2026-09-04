from pydantic import BaseModel, Field
from typing import List, Optional, Union
from datetime import datetime
import uuid

# Auth Schemas
class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class UserResponse(BaseModel):
    id: Union[int, uuid.UUID]
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Participant Schemas (Admin actions)
class ParticipantCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)
    team_name: str = Field(..., min_length=3, max_length=100)

class ParticipantUpdate(BaseModel):
    password: Optional[str] = None
    team_name: Optional[str] = None
    current_level_id: Optional[int] = None

class ParticipantResponse(BaseModel):
    id: Union[int, uuid.UUID]
    username: str
    team_name: str
    current_level_id: int
    total_score: int
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Level Schemas (For Participants - NEVER expose secrets or system prompts)
class LevelInfo(BaseModel):
    level_id: int
    round_id: int
    title: str
    description: str
    objective: str
    base_score: int
    attempt_limit: int
    attempt_penalty: int
    validation_type: str
    enabled: bool
    hint_released: bool
    hint_revealed: Optional[bool] = False
    hint_penalty: Optional[int] = 25

    class Config:
        from_attributes = True

class AdminLevelInfo(LevelInfo):
    hint_text: Optional[str] = None
    hint_text_2: Optional[str] = None
    secret: Optional[str] = None
    system_prompt: Optional[str] = None
    target_phrase: Optional[str] = None

# Hint Schemas
class HintStatusResponse(BaseModel):
    released: bool
    revealed: bool
    hint_tier: Optional[int] = 0
    hint_text: Optional[str] = None
    hint_text_2: Optional[str] = None
    penalty_tier_1: Optional[int] = 15
    penalty_tier_2: Optional[int] = 30
    penalty: Optional[int] = 15

class HintRevealRequest(BaseModel):
    tier: Optional[int] = None

class HintRevealResponse(BaseModel):
    success: bool
    hint_tier: Optional[int] = 1
    hint_text: str
    message: str
    penalty_applied: Optional[int] = 15

# Submission Schemas
class PromptSubmit(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)

class ScoreBreakdown(BaseModel):
    level_id: int
    round_id: int
    base_score: int = 100
    attempts_used: int = 1
    attempt_penalty_rate: int = 2
    attempt_deduction: int = 0
    hint_tier_used: int = 0
    hint_deduction: int = 0
    final_score: int = 100

class SubmissionResponse(BaseModel):
    success: bool
    llm_response: str
    score_awarded: int
    attempts_used: int
    attempts_remaining: int
    level_solved: bool
    current_level_id: int
    total_score: int
    latency_ms: int = 0
    score_breakdown: Optional[ScoreBreakdown] = None

class SubmissionDetail(BaseModel):
    id: int
    level_id: int
    round_id: int
    prompt: str
    response: str
    success: bool
    score_awarded: int
    attempt_number: int
    latency_ms: int
    model_name: str
    created_at: datetime

    class Config:
        from_attributes = True

# Participant Dashboard / Stats
class LevelProgressDetail(BaseModel):
    level_id: int
    title: str
    round_id: int
    attempts_used: int
    solved: bool
    score_earned: int
    score_breakdown: Optional[ScoreBreakdown] = None

class ParticipantStatsResponse(BaseModel):
    username: str
    team_name: str
    total_score: int
    current_level_id: int
    levels_solved_count: int
    total_attempts: int
    average_latency_ms: float
    level_details: List[LevelProgressDetail]
    recent_submissions: List[SubmissionDetail]

# Leaderboard Schemas
class LeaderboardEntry(BaseModel):
    rank: int
    team_name: str
    total_score: int
    levels_solved: int
    current_round: int

class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    status: str
    time_remaining_seconds: int

# Timer / State Schemas
class TimerResponse(BaseModel):
    status: str  # 'not_started', 'live', 'paused', 'ended'
    time_remaining_seconds: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    current_round_id: int
    emergency_disable_submissions: bool

class CompetitionStateUpdate(BaseModel):
    status: Optional[str] = None
    duration_minutes: Optional[int] = None
    current_round_id: Optional[int] = None
    emergency_disable_submissions: Optional[bool] = None

# Admin Dashboard Audit / Submissions Log View
class AdminSubmissionLog(BaseModel):
    id: int
    team_id: Optional[Union[uuid.UUID, str]] = None
    username: str
    team_name: str
    level_id: int
    round_id: int
    prompt: str
    response: str
    success: bool
    score_awarded: int
    attempt_number: int
    latency_ms: int
    model_name: str
    created_at: datetime

    class Config:
        from_attributes = True

# Health Check Schemas
class SystemHealthResponse(BaseModel):
    status: str  # 'healthy' or 'unhealthy'
    backend: str
    database: str
    ollama: str
    configured_model: str
    queue_size: int
    cpu_usage_percent: float
    ram_usage_percent: float

# Password Verification Schema
class PasswordVerify(BaseModel):
    captured_password: str = Field(..., min_length=1, max_length=255)

# Admin Level Secret Editor Schema
class LevelSecretUpdate(BaseModel):
    """Allows admin to update a level's title, objective, hidden secret,
    target phrase, system prompt, and hint text live — no server restart required."""
    title: Optional[str] = Field(None, max_length=255)
    objective: Optional[str] = Field(None, max_length=1000)
    secret: Optional[str] = Field(None, max_length=255)
    target_phrase: Optional[str] = Field(None, max_length=500)
    system_prompt: Optional[str] = Field(None, max_length=12000)
    hint_text: Optional[str] = Field(None, max_length=2000)
    hint_text_2: Optional[str] = Field(None, max_length=2000)
