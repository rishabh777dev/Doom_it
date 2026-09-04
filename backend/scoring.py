# scoring.py - Centralized scoring rules for Vakya-Bhed 2026

# Progressive hint penalties:
# Round 1 (Password Extraction, Levels 1 - 5):
# Level 1: 25 pts
# Level 2: 50 pts (Double of Level 1)
# Level 3: 65 pts (Gradual increase)
# Level 4: 75 pts (Gradual increase)
# Level 5: 85 pts (Supercharged penalty)
#
# Round 2 (Secret Phrase Extraction, Levels 6 - 9):
# Level 6: 30 pts
# Level 7: 55 pts
# Level 8: 70 pts
# Level 9: 85 pts
#
# Round 3 (System Prompt Extraction, Levels 10 - 12):
# Level 10: 50 pts
# Level 11: 75 pts
# Level 12: 90 pts (Boss penalty)

HINT_PENALTIES = {
    1: 25,
    2: 50,
    3: 65,
    4: 75,
    5: 85,
    6: 30,
    7: 55,
    8: 70,
    9: 85,
    10: 50,
    11: 75,
    12: 90,
}


def get_hint_penalty(level_id: int) -> int:
    """Returns the point penalty for revealing a hint on a given level."""
    return HINT_PENALTIES.get(level_id, 25)


# Round-wise attempt penalties:
# - Round 1 (Levels 1 - 5): 3 points deducted per additional attempt
# - Round 2 (Levels 6 - 9): 4 points deducted per additional attempt
# - Round 3 (Levels 10 - 12): 5 points deducted per additional attempt
ROUND_ATTEMPT_PENALTIES = {
    1: 3,
    2: 4,
    3: 5,
}


def get_level_round(level_id: int) -> int:
    """Determine which competition round a level belongs to."""
    if level_id <= 5:
        return 1
    elif level_id <= 9:
        return 2
    return 3


def calculate_score(level_id: int, attempt_number: int, hint_used: bool = False) -> int:
    """
    Calculates the score awarded for successfully solving a level based on rules:
    - Base score is 100 points.
    - Round-wise attempt penalties:
        * Round 1 (Levels 1-5): -3 pts for each attempt beyond attempt 1
        * Round 2 (Levels 6-9): -4 pts for each attempt beyond attempt 1
        * Round 3 (Levels 10-12): -5 pts for each attempt beyond attempt 1
    - Deducts level-specific progressive hint penalty if hint is revealed.
    - Final score is bounded at a minimum of 0.
    """
    round_id = get_level_round(level_id)
    penalty_per_attempt = ROUND_ATTEMPT_PENALTIES.get(round_id, 3)

    # First attempt gets full 100 base score; each subsequent attempt incurs the round penalty
    extra_attempts = max(0, attempt_number - 1)
    base = 100 - (extra_attempts * penalty_per_attempt)

    if hint_used:
        base -= get_hint_penalty(level_id)

    return max(0, base)

