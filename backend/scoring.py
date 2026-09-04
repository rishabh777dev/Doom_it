# scoring.py - Centralized scoring rules for Vakya-Bhed 2026
from typing import Union

# Round-wise attempt penalties (deducted for each attempt beyond attempt 1):
# - Round 1 (Levels 1 - 5): 2 points deducted per additional attempt
# - Round 2 (Levels 6 - 9): 3 points deducted per additional attempt
# - Round 3 (Levels 10 - 12): 4 points deducted per additional attempt
ROUND_ATTEMPT_PENALTIES = {
    1: 2,
    2: 3,
    3: 4,
}

# 2-Tier Progressive Hint Penalties per Round:
# - Round 1 (Levels 1 - 5):
#     Tier 1 (Intel Nudge): 15 pts
#     Tier 2 (Tactical Exploit): 30 pts
# - Round 2 (Levels 6 - 9):
#     Tier 1 (Intel Nudge): 25 pts
#     Tier 2 (Tactical Exploit): 40 pts
# - Round 3 (Levels 10 - 12):
#     Tier 1 (Intel Nudge): 35 pts
#     Tier 2 (Tactical Exploit): 50 pts
HINT_TIER_PENALTIES = {
    1: {1: 15, 2: 30},
    2: {1: 25, 2: 40},
    3: {1: 35, 2: 50},
}

# Flat lookup for backwards compatibility (defaults to Tier 1 penalty)
HINT_PENALTIES = {
    1: 15, 2: 15, 3: 15, 4: 15, 5: 15,
    6: 25, 7: 25, 8: 25, 9: 25,
    10: 35, 11: 35, 12: 35,
}


def get_level_round(level_id: int) -> int:
    """Determine which competition round a level belongs to."""
    if level_id <= 5:
        return 1
    elif level_id <= 9:
        return 2
    return 3


def get_hint_penalty(level_id: int, tier: int = 1) -> int:
    """Returns the point penalty for revealing a hint on a given level and tier."""
    round_id = get_level_round(level_id)
    penalties = HINT_TIER_PENALTIES.get(round_id, {1: 15, 2: 30})
    return penalties.get(tier, penalties.get(1, 15))


def calculate_score(
    level_id: int,
    attempt_number: int,
    hint_used: Union[bool, int] = False,
    hint_tier: int = 0
) -> int:
    """
    Calculates the score awarded for successfully solving a level:
    - Base score is 100 points.
    - Round-wise attempt penalties (after 1st attempt):
        * Round 1 (Levels 1-5): -2 pts per additional attempt
        * Round 2 (Levels 6-9): -3 pts per additional attempt
        * Round 3 (Levels 10-12): -4 pts per additional attempt
    - Hint penalties:
        * Round 1: Tier 1 = -15 pts, Tier 2 = -30 pts
        * Round 2: Tier 1 = -25 pts, Tier 2 = -40 pts
        * Round 3: Tier 1 = -35 pts, Tier 2 = -50 pts
    - Final score is bounded at a minimum of 0.
    """
    round_id = get_level_round(level_id)
    penalty_per_attempt = ROUND_ATTEMPT_PENALTIES.get(round_id, 2)

    # First attempt gets full 100 base score; each subsequent attempt incurs round penalty
    extra_attempts = max(0, attempt_number - 1)
    base = 100 - (extra_attempts * penalty_per_attempt)

    # Determine effective hint tier
    effective_tier = 0
    if hint_tier > 0:
        effective_tier = hint_tier
    elif isinstance(hint_used, int) and not isinstance(hint_used, bool) and hint_used > 0:
        effective_tier = hint_used
    elif hint_used is True:
        effective_tier = 1

    if effective_tier > 0:
        base -= get_hint_penalty(level_id, effective_tier)

    return max(0, base)
