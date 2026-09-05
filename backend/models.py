import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID

from backend.database import Base

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses
    CHAR(36), storing as stringified hex values.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            else:
                return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                value = uuid.UUID(value)
            return value

class Team(Base):
    __tablename__ = "teams"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    team_name = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Anti-cheat, qualification & arbiter fields
    is_disqualified = Column(Boolean, default=False, nullable=False)
    is_spectator = Column(Boolean, default=False, nullable=False)
    eliminated_in_round = Column(Integer, nullable=True)
    cooldown_until = Column(DateTime, nullable=True)
    warning_message = Column(Text, nullable=True)

    # Relationships
    progress = relationship("Progress", uselist=False, back_populates="team", cascade="all, delete-orphan")
    score_summary = relationship("Score", uselist=False, back_populates="team", cascade="all, delete-orphan")
    prompt_logs = relationship("PromptLog", back_populates="team", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="team", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="team")
    incidents = relationship("AntiCheatIncident", back_populates="team", cascade="all, delete-orphan")

class Progress(Base):
    __tablename__ = "progress"

    team_id = Column(GUID(), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    current_level = Column(Integer, default=1, nullable=False)
    total_score = Column(Integer, default=0, nullable=False)
    unlocked_levels = Column(JSON, default=lambda: [1], nullable=False)  # JSONB array of unlocked level IDs
    completed_levels = Column(JSON, default=list, nullable=False)  # JSONB array of completed level IDs
    attempts = Column(JSON, default=dict, nullable=False)  # JSONB dict tracking attempts per level, e.g. {"1": 0, "2": 0}
    level_scores = Column(JSON, default=dict, nullable=True)  # JSONB dict tracking awarded points per level, e.g. {"1": 70}
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    team = relationship("Team", back_populates="progress")

class PromptLog(Base):
    __tablename__ = "prompt_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    team_id = Column(GUID(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    level = Column(Integer, nullable=False)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    provider = Column(String(100), nullable=True)
    attempt_number = Column(Integer, nullable=True)
    success = Column(Boolean, default=False, nullable=False)
    # Round-trip time of the model call, so the review UI can show real numbers
    # instead of a hardcoded placeholder.
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    team = relationship("Team", back_populates="prompt_logs")

class Score(Base):
    __tablename__ = "scores"

    team_id = Column(GUID(), ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    round1_score = Column(Integer, default=0, nullable=False)
    total_score = Column(Integer, default=0, nullable=False)

    # Relationships
    team = relationship("Team", back_populates="score_summary")

class Level(Base):
    __tablename__ = "levels"

    level_id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("rounds.round_id"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    objective = Column(Text, nullable=False)
    system_prompt = Column(Text, nullable=False)
    secret = Column(String(255), nullable=False)  # Hidden flag/password
    target_phrase = Column(String(255), nullable=True)  # For Round 3
    base_score = Column(Integer, default=100, nullable=False)
    attempt_limit = Column(Integer, default=100, nullable=False)
    attempt_penalty = Column(Integer, default=0, nullable=False)
    unlock_requirement = Column(Integer, nullable=True)
    validation_type = Column(String(50), nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    hint_text = Column(Text, nullable=True)
    hint_text_2 = Column(Text, nullable=True)
    hint_released = Column(Boolean, default=False, nullable=False)

    # Relationships
    round = relationship("Round", back_populates="levels")

class Round(Base):
    __tablename__ = "rounds"

    round_id = Column(Integer, primary_key=True, index=True)  # 1, 2, or 3
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    duration_minutes = Column(Integer, default=60, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    levels = relationship("Level", back_populates="round")

class CompetitionState(Base):
    __tablename__ = "competition_state"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(50), default="not_started", nullable=False)  # 'not_started', 'live', 'paused', 'ended'
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    current_round_id = Column(Integer, default=1, nullable=False)
    emergency_disable_submissions = Column(Boolean, default=False, nullable=False)
    ceremony_active = Column(Boolean, default=False, nullable=False)
    global_announcement = Column(JSON, nullable=True)
    round_cutoffs = Column(JSON, default=dict, nullable=False)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(GUID(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_activity_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    team = relationship("Team", back_populates="sessions")

# Optional tables that will auto-create if missing
class ParticipantHint(Base):
    __tablename__ = "participant_hints"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(GUID(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    level_id = Column(Integer, ForeignKey("levels.level_id", ondelete="CASCADE"), nullable=False)
    hint_tier = Column(Integer, default=1, nullable=False)
    revealed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(GUID(), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    team = relationship("Team", back_populates="audit_logs")

class AntiCheatIncident(Base):
    __tablename__ = "anti_cheat_incidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    team_id = Column(GUID(), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    incident_type = Column(String(50), nullable=False)  # RAPID_BURST, CROSS_TEAM_SIMILARITY, HONEYPOT_TRIGGERED, BOT_CADENCE_ANOMALY, SUSPECTED_EXTENSION
    severity = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    details = Column(Text, nullable=False)
    prompt_snippet = Column(Text, nullable=True)
    status = Column(String(20), default="FLAGGED", nullable=False)  # FLAGGED, WARNED, PARDONED, PENALIZED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    team = relationship("Team", back_populates="incidents")

