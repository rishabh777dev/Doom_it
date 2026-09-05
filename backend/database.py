import logging
import re
from typing import Optional
from urllib.parse import quote_plus
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None

from backend.config import settings

logger = logging.getLogger("vakyabhed.database")

# Extract and quote password if using direct postgres to handle special characters like '@'
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
    pattern = r"^(postgresql|postgres)://([^:]+):([^@]+)@(.+)$"
    match = re.match(pattern, db_url)
    if match:
        scheme, user, password, rest = match.groups()
        # Only quote if not already quoted (contains '@' or other special chars)
        if "@" in password or ":" in password or "/" in password:
            if "%" not in password:
                password = quote_plus(password)
        db_url = f"{scheme}://{user}:{password}@{rest}"

# SQLite multithreading support for FastAPI async requests
connect_args = {}
engine_kwargs = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Every request handler holds a connection for its whole lifetime, and the
    # arena runs 15 LLM workers, so the default pool of 5 + 10 overflow is the
    # first thing to break during a live round.
    engine_kwargs = {
        "pool_size": 20,
        "max_overflow": 20,
        "pool_recycle": 1800,
        "pool_timeout": 30,
    }

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# The Supabase REST client is only a fallback health probe. Creating it eagerly
# with blank credentials raises at import time and takes the whole API down, so
# build it lazily and tolerate it being unavailable.
_supabase_client: Optional[Client] = None
_supabase_failed = False


def get_supabase() -> Optional[Client]:
    global _supabase_client, _supabase_failed
    if _supabase_client is not None or _supabase_failed:
        return _supabase_client
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.info("Supabase credentials not configured; REST fallback disabled.")
        _supabase_failed = True
        return None
    try:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    except Exception as e:
        logger.warning("Could not initialise the Supabase REST client: %s", e)
        _supabase_failed = True
    return _supabase_client


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def apply_lightweight_migrations() -> None:
    """
    Add columns that were introduced after the first deployment.

    ``create_all`` only creates missing *tables*, so a database that predates a
    new column keeps working until the first INSERT names it and then fails with
    an UndefinedColumn error. There is no Alembic setup in this project, so the
    handful of additive changes are reconciled here instead.
    """
    from sqlalchemy import inspect

    additions = {
        "prompt_logs": {"latency_ms": "INTEGER"},
        "competition_state": {
            "ceremony_active": "BOOLEAN DEFAULT FALSE",
            "global_announcement": "TEXT",
            "round_cutoffs": "TEXT",
        },
        "teams": {
            "is_disqualified": "BOOLEAN DEFAULT FALSE",
            "is_spectator": "BOOLEAN DEFAULT FALSE",
            "eliminated_in_round": "INTEGER",
            "cooldown_until": "TIMESTAMP",
            "warning_message": "TEXT",
        },
    }

    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
    except Exception as e:
        logger.warning("Could not inspect the database for migrations: %s", e)
        return

    for table, columns in additions.items():
        if table not in existing_tables:
            continue
        present = {col["name"] for col in inspector.get_columns(table)}
        for column, ddl_type in columns.items():
            if column in present:
                continue
            try:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
                logger.info("Migration: added %s.%s", table, column)
            except Exception as e:
                logger.warning("Migration: could not add %s.%s: %s", table, column, e)


def verify_connection() -> bool:
    """
    Verify database connection.
    First tries a direct connection via the SQLAlchemy engine, then falls back
    to probing through the Supabase REST client.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.warning(
            "Direct database connection via SQLAlchemy failed: %s. Trying Supabase REST fallback...", e
        )

    client = get_supabase()
    if client is None:
        return False
    try:
        res = client.table("teams").select("id").limit(1).execute()
        return res.data is not None
    except Exception as e:
        logger.error("Supabase REST client connection failed: %s", e)
        return False

