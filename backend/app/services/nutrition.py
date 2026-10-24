"""CHANGE 1: single-day nutrition planner.

Inputs (all three are required by `build_day_plan`):
  * workout_plan - today's stored workout (name, focus, duration, exercises)
  * location     - free-text place ("Andhra Pradesh, India") -> regional food bank
  * water_need_ml - from `calculate_water_need_ml`

Food values are approximate per-100 g figures for cooked/ready-to-eat foods.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

# name: (kcal, protein, carbs, fat) per 100 g
FOODS: dict[str, tuple[str, float, float, float, float]] = {
    "oats": ("Rolled oats (dry)", 389, 16.9, 66, 6.9),
    "milk": ("Milk", 61, 3.2, 4.8, 3.3),
    "curd": ("Curd / plain yogurt", 61, 3.5, 4.7, 3.3),
    "greek_yogurt": ("Greek yogurt", 59, 10, 3.6, 0.4),
    "egg": ("Whole egg", 143, 12.6, 0.7, 9.5),
    "banana": ("Banana", 89, 1.1, 22.8, 0.3),
    "peanut_butter": ("Peanut butter", 588, 25, 20, 50),
    "peanuts": ("Roasted peanuts", 567, 26, 16, 49),
    "almonds": ("Almonds", 579, 21, 22, 50),
    "bread": ("Whole-wheat bread", 250, 12, 43, 3),
    "chicken": ("Grilled chicken breast", 165, 31, 0, 3.6),
    "fish": ("Cooked white fish", 110, 22, 0, 2),
    "tofu": ("Tofu", 76, 8, 1.9, 4.8),
    "paneer": ("Paneer", 265, 18, 1.2, 20),
    "rice": ("Cooked rice", 130, 2.7, 28, 0.3),
    "brown_rice": ("Cooked brown rice", 123, 2.7, 26, 1),
    "quinoa": ("Cooked quinoa", 120, 4.4, 21, 1.9),
    "roti": ("Whole-wheat roti", 264, 9.6, 46, 4),
    "sweet_potato": ("Baked sweet potato", 90, 2, 21, 0.2),
    "dal": ("Cooked dal (lentils)", 116, 9, 20, 0.4),
    "chickpeas": ("Cooked chickpeas", 164, 8.9, 27, 2.6),
    "sprouts": ("Moong sprouts salad", 30, 3, 6, 0.2),
    "veg": ("Mixed vegetables", 45, 2, 8, 0.5),
    "broccoli": ("Steamed broccoli", 35, 2.8, 7, 0.4),
    "salad": ("Cucumber-tomato salad", 20, 0.8, 4, 0.2),
    "idli": ("Idli", 148, 4.5, 30, 0.7),
    "sambar": ("Sambar", 50, 2.5, 7, 1.5),
    "pesarattu": ("Pesarattu (green gram dosa)", 150, 8, 22, 3),
}
PIECE_GRAMS = {"egg": 50, "banana": 118, "idli": 39, "roti": 40}  # "2 eggs" style servings
NON_VEG = {"egg", "chicken", "fish"}

Template = list[tuple[str, int]]  # (food key, base grams)

GLOBAL: dict[str, list[Template]] = {
    "breakfast": [[("oats", 60), ("milk", 250), ("banana", 118), ("peanut_butter", 15)],
                  [("greek_yogurt", 200), ("oats", 40), ("banana", 118), ("almonds", 10)],
                  [("egg", 150), ("bread", 80), ("banana", 118)]],
    "pre": [[("banana", 118), ("peanut_butter", 15)], [("bread", 60), ("peanut_butter", 20)]],
    "post": [[("greek_yogurt", 200), ("banana", 118), ("peanuts", 15)], [("egg", 100), ("bread", 60), ("milk", 200)]],
    "lunch": [[("chicken", 150), ("rice", 200), ("veg", 120)], [("tofu", 150), ("brown_rice", 200), ("veg", 120)],
              [("chickpeas", 180), ("quinoa", 180), ("salad", 100)], [("fish", 150), ("brown_rice", 180), ("broccoli", 100)]],
    "dinner": [[("chicken", 150), ("sweet_potato", 200), ("broccoli", 120)], [("paneer", 100), ("sweet_potato", 200), ("broccoli", 120)],
               [("fish", 160), ("quinoa", 150), ("veg", 120)], [("dal", 200), ("roti", 80), ("salad", 100)]],
}
INDIA: dict[str, list[Template]] = {
    "breakfast": [[("egg", 100), ("roti", 80), ("curd", 150)], [("paneer", 80), ("roti", 80), ("curd", 150)]],
    "pre": [[("banana", 118), ("peanuts", 20)], [("banana", 118), ("almonds", 15)]],
    "post": [[("egg", 100), ("curd", 200), ("banana", 118)], [("sprouts", 100), ("curd", 200), ("banana", 118)]],
    "lunch": [[("rice", 200), ("dal", 180), ("chicken", 150), ("veg", 100)], [("rice", 200), ("fish", 150), ("sambar", 150), ("veg", 100)],
              [("rice", 200), ("dal", 180), ("paneer", 100), ("veg", 100)], [("roti", 120), ("chickpeas", 150), ("curd", 150), ("salad", 100)]],
    "dinner": [[("roti", 100), ("chicken", 150), ("veg", 120)], [("roti", 100), ("fish", 150), ("veg", 120)],
               [("roti", 100), ("paneer", 100), ("veg", 120)], [("roti", 100), ("dal", 200), ("salad", 100)]],
}
SOUTH_BREAKFAST: list[Template] = [[("idli", 156), ("sambar", 150), ("egg", 100)], [("idli", 156), ("sambar", 150), ("peanuts", 15)],
                                   [("pesarattu", 150), ("curd", 100), ("peanuts", 15)]]

SOUTH_STATES = ("andhra pradesh", "telangana", "tamil nadu", "karnataka", "kerala", "puducherry")
INDIA_STATES = SOUTH_STATES + ("maharashtra", "gujarat", "rajasthan", "delhi", "uttar pradesh", "west bengal", "punjab", "haryana",
                               "madhya pradesh", "odisha", "bihar", "assam", "goa", "himachal", "uttarakhand", "jharkhand", "chhattisgarh")
# share of the day's calories per meal: (slot title, template key, share, time hint)
SLOTS = [("Breakfast", "breakfast", 0.25, "7:00 - 9:00"), ("Pre-workout snack", "pre", 0.10, "45-60 min before training"),
         ("Post-workout meal", "post", 0.15, "within 60 min after training"), ("Lunch", "lunch", 0.27, "12:30 - 14:30"), ("Dinner", "dinner", 0.23, "19:00 - 21:00")]


def calculate_water_need_ml(weight_kg: float, workout_minutes: int, difficulty: str | None) -> int:
    """35 ml per kg body weight + 10/12/14 ml per training minute (Beginner/Intermediate/Advanced), rounded to 50 ml."""
    per_minute = {"Beginner": 10, "Intermediate": 12, "Advanced": 14}.get(difficulty or "", 12)
    return int(round((weight_kg * 35 + workout_minutes * per_minute) / 50.0) * 50)


def resolve_region(location: str) -> tuple[str, str]:
    text = location.lower()
    if any(s in text for s in SOUTH_STATES):
        return "south_india", "South Indian foods (idli, sambar, pesarattu, rice, dal) matched to your location."
    if "india" in text or any(s in text for s in INDIA_STATES):
        return "india", "Indian foods (roti, dal, rice, curd) matched to your location."
    return "global", "A balanced, widely available food selection (no regional match found for your location)."


@dataclass
class UserBody:
    weight_kg: float
    height_cm: float
    age: int
    gender: str | None
    goal: str
    training_frequency: int


def daily_targets(u: UserBody, workout_minutes: int) -> tuple[int, int]:
    """Mifflin-St Jeor BMR x activity, adjusted for goal, plus the calories of today's session."""
    sex_constant = {"Male": 5, "Female": -161}.get(u.gender or "", -78)  # -78 = midpoint when unspecified
    bmr = 10 * u.weight_kg + 6.25 * u.height_cm - 5 * u.age + sex_constant
    activity = 1.375 if u.training_frequency <= 2 else 1.55 if u.training_frequency <= 4 else 1.725
    goal_factor = {"Lose Fat": 0.85, "Build Muscle": 1.10, "Gain Strength": 1.05, "Improve Endurance": 1.05}.get(u.goal, 1.0)
    kcal = bmr * activity * goal_factor + workout_minutes * 5  # ~5 kcal/min for today's session
    protein_per_kg = {"Lose Fat": 2.0, "Build Muscle": 1.8, "Gain Strength": 1.8}.get(u.goal, 1.4)
    return int(round(kcal / 10.0) * 10), int(round(u.weight_kg * protein_per_kg))


def _pool(templates: list[Template], diet: str) -> list[Template]:
    return [t for t in templates if diet == "any" or not any(k in NON_VEG for k, _ in t)]


def _macros(key: str, grams: float) -> tuple[float, float, float, float]:
    _, kcal, p, c, f = FOODS[key]
    r = grams / 100.0
    return kcal * r, p * r, c * r, f * r


def build_day_plan(*, workout_plan: dict, location: str, water_need_ml: int, user: UserBody, diet: str, today: date) -> dict:
    """Return the one-day plan. Every meal is shaped by the three inputs:
    workout_plan -> calories (session minutes), carb-friendly options for long/leg days, pre/post meals;
    location -> cuisine; water_need_ml -> hydration schedule tips."""
    minutes = int(workout_plan.get("duration_minutes") or 30)
    focus = str(workout_plan.get("focus") or "Full Body")
    region, cuisine_note = resolve_region(location)
    target_kcal, target_protein = daily_targets(user, minutes)

    base = INDIA if region in ("india", "south_india") else GLOBAL
    day_index = today.toordinal()
    meals = []
    for slot_no, (title, key, share, hint) in enumerate(SLOTS):
        templates = SOUTH_BREAKFAST if (key == "breakfast" and region == "south_india") else base[key]
        pool = _pool(templates, diet) or _pool(GLOBAL[key], diet)
        template = pool[(day_index + slot_no) % len(pool)]  # rotates daily and across slots
        nominal = sum(_macros(k, g)[0] for k, g in template)
        # Long or lower-body sessions push a little more of the day's calories around training.
        boost = 1.15 if key in ("pre", "post") and (minutes >= 60 or focus in ("Legs", "Full Body")) else 1.0
        scale = min(2.5, max(0.5, target_kcal * share * boost / nominal))
        items, totals = [], [0.0, 0.0, 0.0, 0.0]
        for food_key, base_g in template:
            grams = max(5, int(round(base_g * scale / 5.0) * 5))
            kcal, p, c, f = _macros(food_key, grams)
            piece = PIECE_GRAMS.get(food_key)
            name = FOODS[food_key][0]
            serving = f"{max(1, round(grams / piece))} pcs ({grams} g)" if piece else f"{grams} g"
            items.append({"name": name, "serving": serving, "grams": grams, "kcal": int(round(kcal)),
                          "protein_g": round(p, 1), "carbs_g": round(c, 1), "fat_g": round(f, 1)})
            for i, v in enumerate((kcal, p, c, f)):
                totals[i] += v
        meals.append({"slot": title, "time_hint": hint, "items": items, "kcal": int(round(totals[0])),
                      "protein_g": round(totals[1], 1), "carbs_g": round(totals[2], 1), "fat_g": round(totals[3], 1)})

    glasses = max(1, int(round(water_need_ml / 250.0)))
    tips = [
        f"Drink about {water_need_ml / 1000:.1f} L of water today (~{glasses} glasses of 250 ml).",
        f"Sip 300-500 ml in the 2 hours before your {minutes}-minute {focus.lower()} session and 150-250 ml every 15-20 minutes during it.",
        "Space your meals 3-4 hours apart and keep the post-workout meal within an hour of finishing.",
    ]
    return {
        "date": today.isoformat(), "location": location.strip(), "cuisine_note": cuisine_note,
        "workout_name": str(workout_plan.get("name") or "Today's workout"), "workout_focus": focus,
        "water_need_ml": water_need_ml, "water_glasses": glasses, "target_kcal": target_kcal, "target_protein_g": target_protein,
        "meals": meals, "total_kcal": sum(m["kcal"] for m in meals),
        "total_protein_g": round(sum(m["protein_g"] for m in meals), 1),
        "total_carbs_g": round(sum(m["carbs_g"] for m in meals), 1),
        "total_fat_g": round(sum(m["fat_g"] for m in meals), 1), "tips": tips,
    }
