# scoring.py - Centralized scoring rules for Vakya-Bhed 2026

def calculate_score(level_id: int, attempt_number: int, hint_used: bool = False) -> int:
    """
    Calculates the score awarded for successfully solving a level based on rules:
    - Level 1 & 6: Attempts 1-5: 100 | Attempts 6-10: 75 | Attempts 11+: 50
    - Level 2 & 7: Attempts 1-8: 100 | Attempts 9+: 75
    - Level 3 & 8: Attempts 1-10: 100 | Attempts 11+: 75
    - Levels 4, 5, 9, 10, 11, 12: Flat 100 (conceptual breaks, not grindable)
    - Deducts 25 points if a hint is used.
    - Final score is never lower than 0.
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
        base = 100

    if hint_used:
        base -= 25

    return max(0, base)
