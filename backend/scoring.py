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


def calculate_score(level_id: int, attempt_number: int, hint_used: bool = False) -> int:
    """
    Calculates the score awarded for successfully solving a level based on rules:
    - Round 1 Levels 1-3 & Round 2 Levels 6-8: Attempt-based scoring brackets:
        * Level 1 & 6: Attempts 1-5: 100 | Attempts 6-10: 75 | Attempts 11+: 50
        * Level 2 & 7: Attempts 1-8: 100 | Attempts 9+: 75
        * Level 3 & 8: Attempts 1-10: 100 | Attempts 11+: 75
    - Round 1 Levels 4-5, Round 2 Level 9, Round 3 Levels 10-12: Flat 100 points
    - Deducts level-specific progressive hint penalty if hint is used.
    - Final score is bounded at a minimum of 0.
    """
    if level_id in [1, 6]:
        if attempt_number <= 5:
            base = 100
        elif attempt_number <= 10:
            base = 75
        else:
            base = 50
    elif level_id in [2, 7]:
        if attempt_number <= 8:
            base = 100
        else:
            base = 75
    elif level_id in [3, 8]:
        if attempt_number <= 10:
            base = 100
        else:
            base = 75
    else:
        # Levels 4, 5, 9, 10, 11, 12 award a flat 100 points upon solving
        base = 100

    if hint_used:
        base -= get_hint_penalty(level_id)

    return max(0, base)

