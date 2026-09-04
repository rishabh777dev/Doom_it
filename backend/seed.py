import logging
import os
import secrets

from dotenv import load_dotenv
from backend.config import ENV_FILE, settings
from backend.database import engine, Base, SessionLocal, apply_lightweight_migrations
from backend.models import Team, Progress, Level, Round, CompetitionState, Score
from backend.auth import hash_password

load_dotenv(ENV_FILE)

logger = logging.getLogger("vakyabhed.seed")


def _get_or_generate_password(env_var: str, label: str) -> str:
    """Return the password from an env var, or generate and log a secure random one."""
    pw = os.environ.get(env_var, "").strip()
    if pw:
        return pw
    pw = secrets.token_urlsafe(16)
    logger.warning(
        "%s password not set via %s env var. "
        "A random password has been generated for this run: %s  "
        "(set %s in your .env to make it persistent)",
        label, env_var, pw, env_var
    )
    return pw


def seed_database():
    # 1. Create tables if they do not exist, then reconcile additive columns
    Base.metadata.create_all(bind=engine)
    apply_lightweight_migrations()

    db = SessionLocal()
    try:
        # 2. Seed Rounds
        rounds_data = [
            {
                "round_id": 1,
                "title": "Round 1 — Password Extraction",
                "description": "Extract a single-word password from the Vault Guardian models (5 levels).",
                "duration_minutes": 50,
                "enabled": True
            },
            {
                "round_id": 2,
                "title": "Round 2 — Secret Phrase Extraction",
                "description": "Extract a hidden secret phrase consisting of approximately 3–9 words (4 levels).",
                "duration_minutes": 40,
                "enabled": True
            },
            {
                "round_id": 3,
                "title": "Round 3 — System Prompt Extraction",
                "description": "Extract the protected system prompt or its designated contents (3 levels).",
                "duration_minutes": 30,
                "enabled": True
            }
        ]

        for r_info in rounds_data:
            existing_round = db.query(Round).filter(Round.round_id == r_info["round_id"]).first()
            if not existing_round:
                db.add(Round(**r_info))
            else:
                for k, v in r_info.items():
                    setattr(existing_round, k, v)

        db.commit()

        # 3. Seed Levels 1-12 from backend.challenges (the source of truth).
        #    This is an upsert rather than delete-then-insert: `levels.level_id`
        #    is referenced by participant_hints ON DELETE CASCADE, so wiping the
        #    table on every startup silently refunded every hint penalty.
        from backend.challenges import CHALLENGES

        existing_levels = {lvl.level_id: lvl for lvl in db.query(Level).all()}
        for lvl_id, lvl_info in CHALLENGES.items():
            existing = existing_levels.get(lvl_info["level_id"])
            if existing is None:
                db.add(Level(**lvl_info))
            else:
                for k, v in lvl_info.items():
                    setattr(existing, k, v)

        # Retire levels that are no longer defined instead of dropping the row,
        # so their history and hint records survive.
        defined_ids = {info["level_id"] for info in CHALLENGES.values()}
        for level_id, lvl in existing_levels.items():
            if level_id not in defined_ids and lvl.enabled:
                lvl.enabled = False
                logger.info("Level %s is no longer defined; disabling it.", level_id)

        db.commit()

        # 4. Seed Competition State (if not existing)
        existing_state = db.query(CompetitionState).first()
        if not existing_state:
            db.add(CompetitionState(
                status="not_started",
                start_time=None,
                end_time=None,
                current_round_id=1,
                emergency_disable_submissions=False
            ))
            db.commit()

        # 5. Seed Admin User in Teams table
        admin_username = "admin"
        existing_admin = db.query(Team).filter(Team.team_name == admin_username).first()
        if not existing_admin:
            admin_password = _get_or_generate_password("ADMIN_PASSWORD", "Admin")
            admin_team = Team(
                team_name=admin_username,
                password=hash_password(admin_password)
            )
            db.add(admin_team)
            db.commit()

            admin_progress = Progress(
                team_id=admin_team.id,
                current_level=1,
                total_score=0,
                unlocked_levels=[1],
                completed_levels=[],
                attempts={}
            )
            db.add(admin_progress)

            admin_score = Score(
                team_id=admin_team.id,
                round1_score=0,
                total_score=0
            )
            db.add(admin_score)
            db.commit()
            logger.info("Default admin user created in teams table (username: admin).")
        else:
            logger.info("Admin user already exists in teams table.")

        # 6. Seed Test Participant User in Teams / Progress / Score
        test_username = "test_team"
        existing_test = db.query(Team).filter(Team.team_name == test_username).first()
        if not existing_test:
            test_password = _get_or_generate_password("TEST_TEAM_PASSWORD", "Test team")
            test_team = Team(
                team_name=test_username,
                password=hash_password(test_password)
            )
            db.add(test_team)
            db.commit()

            test_progress = Progress(
                team_id=test_team.id,
                current_level=1,
                total_score=0,
                unlocked_levels=[1],
                completed_levels=[],
                attempts={}
            )
            db.add(test_progress)

            test_score = Score(
                team_id=test_team.id,
                round1_score=0,
                total_score=0
            )
            db.add(test_score)
            db.commit()
            logger.info("Default test team created (username: test_team).")
        else:
            logger.info("Test team user already exists in teams table.")

        # 7. Self-healing check: Ensure every team has valid Progress and Score records
        for team in db.query(Team).all():
            if not team.progress:
                db.add(Progress(
                    team_id=team.id,
                    current_level=1,
                    total_score=0,
                    unlocked_levels=[1],
                    completed_levels=[],
                    attempts={}
                ))
                logger.info("Healed missing progress record for team %s", team.team_name)
            if not team.score_summary:
                db.add(Score(
                    team_id=team.id,
                    round1_score=0,
                    round2_score=0,
                    round3_score=0,
                    total_score=0
                ))
                logger.info("Healed missing score record for team %s", team.team_name)
        db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
    print("Database seeding completed successfully.")

