from __future__ import annotations

import hashlib
import logging
import json
import os
import random
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.services.recommendation import GOAL_MUSCLES, FOCUS, _equipment_allowed


log = logging.getLogger("gymai.ai")


@dataclass
class AIPlanResult:
    exercises: list[models.Exercise]
    sets: list[int]
    reps: list[str]
    rest_seconds: list[int]
    focus: str
    source: str
    ai_note: str = ""  # why the built-in planner was used (empty when Gemini answered)


# CHANGE: the old default "gemini-3.8-flash" is not a real model name, so every call failed and the
# same local plan was returned. gemini-2.5-flash is a stable model; others are tried if it is unavailable.
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MODEL_FALLBACKS = ("gemini-2.5-flash", "gemini-2.0-flash")
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/{model}:generateContent"


BODYWEIGHT = {"None", "Bodyweight"}


LEVEL_ORDER = {"Beginner": 0, "Intermediate": 1, "Advanced": 2}


def _allowed(rows: list[models.Exercise], equipment: list[str], level: str) -> list[models.Exercise]:
    """Selected equipment PLUS no-equipment (bodyweight) exercises at the user's level.

    The catalog only has bodyweight moves at Beginner level, so when too few exercises match (for example an
    Advanced user with no equipment) bodyweight moves from the nearest easier levels are added; _scheme_for
    then prescribes more reps and sets for them."""
    chosen = [e for e in equipment if e not in BODYWEIGHT]
    result = [
        row
        for row in rows
        if row.difficulty == level
        and (row.equipment in BODYWEIGHT or (chosen and _equipment_allowed(row, chosen)))
    ]
    if len(result) < 8:
        want = LEVEL_ORDER.get(level, 0)
        extra = [r for r in rows if r.equipment in BODYWEIGHT and r not in result]
        extra.sort(key=lambda r: abs(LEVEL_ORDER.get(r.difficulty, 0) - want))
        result += extra
    return result


def _mix(ranked: list[models.Exercise], target: int, equipment: list[str]) -> list[models.Exercise]:
    """Pick a varied set; when equipment is selected, reserve ~1/3 of slots for bodyweight moves."""
    bodyweight = [r for r in ranked if r.equipment in BODYWEIGHT]
    geared = [r for r in ranked if r.equipment not in BODYWEIGHT]
    want_bw = min(len(bodyweight), target // 3) if geared else target
    picked: list[models.Exercise] = []
    seen: set[str] = set()
    for pool, limit in ((geared, target - want_bw), (bodyweight, want_bw)):
        count = 0
        for row in pool:  # first pass: one per muscle group
            if count >= limit:
                break
            if row.muscle_group not in seen:
                picked.append(row); seen.add(row.muscle_group); count += 1
        for row in pool:  # second pass: fill remaining
            if count >= limit:
                break
            if row not in picked:
                picked.append(row); count += 1
    for row in ranked:  # top up if a pool ran short
        if len(picked) >= target:
            break
        if row not in picked:
            picked.append(row)
    return picked



# ---- Programming rules per goal: (sets, reps, rest seconds) ----
SCHEME = {
    "Build Muscle": (4, "8-12", 75),
    "Gain Strength": (5, "4-6", 150),
    "Lose Fat": (3, "12-15", 40),
    "Improve Endurance": (3, "15-20", 30),
    "General Fitness": (3, "10-12", 60),
}
LEVEL_SET_DELTA = {"Beginner": -1, "Intermediate": 0, "Advanced": 1}

# Session split by training days per week; one entry is used per calendar day, so plans rotate.
SPLITS: dict[str, list[tuple[str, list[str]]]] = {
    "low": [("Full body A", ["Legs", "Chest", "Back", "Core"]), ("Full body B", ["Legs", "Shoulders", "Back", "Core"])],
    "mid": [("Upper body", ["Chest", "Back", "Shoulders", "Arms"]), ("Lower body + core", ["Legs", "Core"])],
    "high": [("Push", ["Chest", "Shoulders", "Arms"]), ("Pull", ["Back", "Arms", "Core"]), ("Legs", ["Legs", "Core"]),
             ("Upper body", ["Chest", "Back", "Shoulders"]), ("Lower body", ["Legs", "Core"])],
}
FULL_BODY_GOALS = {"Lose Fat", "Improve Endurance", "General Fitness"}  # circuits hit the whole body every time


def _today_focus(goal: str, frequency: int | None) -> tuple[str, list[str]]:
    """Which part of the body today's session targets (rotates daily, depends on goal and days per week)."""
    day = datetime.now(timezone.utc).toordinal()
    if goal in FULL_BODY_GOALS:
        rotation = [("Full-body circuit", ["Full Body", "Legs", "Core", "Back", "Chest"]),
                    ("Lower-body + core circuit", ["Legs", "Core", "Full Body"]),
                    ("Upper-body + core circuit", ["Chest", "Back", "Shoulders", "Core", "Full Body"])]
        return rotation[day % len(rotation)]
    key = "low" if (frequency or 3) <= 2 else "high" if (frequency or 3) >= 5 else "mid"
    options = SPLITS[key]
    return options[day % len(options)]


def _scheme_for(goal: str, level: str, minutes: int, exercise: models.Exercise) -> tuple[int, str, int]:
    sets, reps, rest = SCHEME.get(goal, SCHEME["General Fitness"])
    sets = max(2, min(5, sets + LEVEL_SET_DELTA.get(level, 0)))
    if minutes <= 20:
        sets = max(2, sets - 1)
    if exercise.equipment in BODYWEIGHT and goal == "Gain Strength":
        reps, rest = "8-12", 90  # heavy low-rep work needs load; bodyweight moves use moderate reps
    if exercise.difficulty != level and LEVEL_ORDER.get(level, 0) > LEVEL_ORDER.get(exercise.difficulty, 0):
        # An easier move used for a more advanced user: make it harder with volume instead of load.
        sets = min(5, sets + 1)
        reps = "15-20" if level == "Intermediate" else "20-25"
        rest = min(rest, 45)
    return sets, reps, rest


def _seed(user_key: str, goal: str, level: str) -> int:
    day = datetime.now(timezone.utc).toordinal()
    return int(hashlib.sha256(f"{user_key}|{goal}|{level}|{day}".encode()).hexdigest()[:8], 16)


def _target_count(minutes: int) -> int:
    if minutes <= 20:
        return 3
    if minutes <= 30:
        return 4
    if minutes <= 45:
        return 5
    if minutes <= 60:
        return 6
    if minutes <= 90:
        return 7
    return 8


def _fallback_plan(
    rows: list[models.Exercise],
    *,
    goal: str,
    level: str,
    equipment: list[str],
    minutes: int,
    frequency: int | None = None,
    user_key: str = "",
    recent_names: set[str] | None = None,
    note: str = "",
) -> AIPlanResult:
    """Rule-based planner. Output depends on goal, level, days/week, time, equipment and the day."""
    usable = _allowed(rows, equipment, level)
    target = min(_target_count(minutes), len(usable))
    split_name, muscles = _today_focus(goal, frequency)
    rng = random.Random(_seed(user_key, goal, level))
    recent = recent_names or set()

    def score(row: models.Exercise) -> float:
        value = 0.0
        if row.muscle_group in muscles:
            value += 12 - muscles.index(row.muscle_group)  # earlier muscle groups matter more
        if goal in (row.goal_tags or []):
            value += 6
        if row.muscle_group == "Full Body":
            value += 2
        if row.name in recent:
            value -= 8  # avoid repeating the previous sessions
        return value + rng.random() * 3  # small daily variation between similar exercises

    ranked = sorted(usable, key=lambda r: -score(r))
    # Stay on today's body parts; only borrow other exercises when the catalog has too few of them.
    on_focus = [r for r in ranked if r.muscle_group in muscles]
    pool = on_focus + [r for r in ranked if r not in on_focus] if len(on_focus) < target else on_focus
    selected = _mix(pool, target, equipment)
    order = {m: i for i, m in enumerate(muscles)}
    selected.sort(key=lambda r: order.get(r.muscle_group, 99))  # follow the session's body-part order

    schemes = [_scheme_for(goal, level, minutes, row) for row in selected]
    return AIPlanResult(
        exercises=selected,
        sets=[x[0] for x in schemes],
        reps=[x[1] for x in schemes],
        rest_seconds=[x[2] for x in schemes],
        focus=f"{split_name} - {FOCUS.get(goal, 'General fitness')}",
        source="local_fallback",
        ai_note=note,
    )


def _extract_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.I)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("Gemini did not return a JSON object.")
    return json.loads(cleaned[start : end + 1])


def _call_gemini(prompt: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")

    configured = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    models_to_try = list(dict.fromkeys([configured, *MODEL_FALLBACKS]))
    last_error = "unknown error"
    for model in models_to_try:
        config: dict = {"temperature": 0.8, "responseMimeType": "application/json"}
        if model.startswith("gemini-2.5"):
            config["thinkingConfig"] = {"thinkingBudget": 0}  # faster, plain JSON answer
        payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": config}
        request = urllib.request.Request(
            GEMINI_ENDPOINT.format(model=f"models/{model}"),
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:200].replace("\n", " ")
            last_error = f"{model}: HTTP {exc.code} {detail}"
            if exc.code in (400, 404):  # bad/unknown model -> try the next one
                continue
            raise RuntimeError(f"Gemini request failed ({last_error})") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise RuntimeError("Gemini could not be reached (check internet access)") from exc

        data = json.loads(body)
        candidates = data.get("candidates") or []
        if not candidates:
            last_error = f"{model}: no candidates returned"
            continue
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
        return _extract_json(text)
    raise RuntimeError(f"Gemini request failed ({last_error})")


def _generate_with_gemini(
    rows: list[models.Exercise],
    *,
    height_cm: float,
    weight_kg: float,
    goal: str,
    level: str,
    equipment: list[str],
    minutes: int,
    age: int | None = None,
    gender: str | None = None,
    frequency: int | None = None,
    recent_names: set[str] | None = None,
) -> AIPlanResult:
    usable = _allowed(rows, equipment, level)
    target = min(_target_count(minutes), len(usable))
    split_name, muscles = _today_focus(goal, frequency)
    sets_hint, reps_hint, rest_hint = SCHEME.get(goal, SCHEME["General Fitness"])
    bmi = round(weight_kg / ((height_cm / 100) ** 2), 1)
    if not usable or target == 0:
        raise ValueError("No exercises match the selected level and equipment.")

    catalog = [
        {
            "slug": row.slug,
            "name": row.name,
            "muscle_group": row.muscle_group,
            "equipment": row.equipment,
            "difficulty": row.difficulty,
            "goal_tags": row.goal_tags or [],
        }
        for row in usable
    ]

    prompt = f"""
You are GymAI's workout-planning model. Create a practical gym workout plan using ONLY exercises from the supplied catalog.

User inputs:
- Age: {age if age else 'not given'}, gender: {gender or 'not given'}
- Height: {height_cm} cm, weight: {weight_kg} kg (BMI {bmi})
- Training days per week: {frequency or 'not given'}
- Today's session: {split_name} (prioritise: {', '.join(muscles)})
- Goal: {goal}
- Fitness level: {level}
- Available equipment: {', '.join(equipment)}
- Available workout time: {minutes} minutes

Rules:
1. Select exactly {target} exercises where possible.
2. Use only the supplied exercise slugs; never invent an exercise.
3. Respect the user's fitness level. Mix exercises that use the user's selected equipment with no-equipment (bodyweight) exercises; roughly one in three should be bodyweight when any are available.
4. Use the available time to keep the session realistic; do not exceed it substantially.
5. Height and weight are context for personalization only. Do not diagnose medical conditions or make medical claims.
6. Build today's session around the priority muscle groups above, ordered large muscles first, and fit the GOAL: typical prescription for {goal} is about {sets_hint} sets of {reps_hint} reps with ~{rest_hint}s rest. Adjust sets down for Beginners and up for Advanced users, and use age and BMI to choose gentler or more demanding options.
6b. Avoid repeating these exercises from the user's recent sessions where alternatives exist: {', '.join(sorted(recent_names or [])) or 'none'}.
7. Return strict JSON only, with this shape:
{{
  "focus": "short focus phrase",
  "exercises": [
    {{"slug": "catalog-slug", "sets": 3, "reps": "8-12", "rest_seconds": 90}}
  ]
}}
8. sets must be an integer from 2 to 5, rest_seconds from 30 to 180, and reps must be a short string such as "8-12", "10-15", or "30 sec".

Exercise catalog:
{json.dumps(catalog, ensure_ascii=False)}
"""

    result = _call_gemini(prompt)
    requested = result.get("exercises")
    if not isinstance(requested, list):
        raise ValueError("Gemini returned an invalid exercise list")

    by_slug = {row.slug: row for row in usable}
    selected: list[models.Exercise] = []
    sets: list[int] = []
    reps: list[str] = []
    rest: list[int] = []
    seen: set[str] = set()

    for item in requested:
        if not isinstance(item, dict):
            continue
        slug = str(item.get("slug", "")).strip()
        row = by_slug.get(slug)
        if not row or slug in seen:
            continue
        selected.append(row)
        seen.add(slug)
        raw_sets = item.get("sets", row.sets)
        raw_rest = item.get("rest_seconds", row.rest_seconds)
        sets.append(max(2, min(5, int(raw_sets))))
        reps_value = str(item.get("reps", row.reps)).strip()[:30]
        reps.append(reps_value or row.reps)
        rest.append(max(30, min(180, int(raw_rest))))
        if len(selected) >= target:
            break

    if not selected:
        raise ValueError("Gemini did not choose valid catalog exercises")

    return AIPlanResult(
        exercises=selected,
        sets=sets,
        reps=reps,
        rest_seconds=rest,
        focus=str(result.get("focus") or FOCUS.get(goal, "General fitness"))[:100],
        source="gemini",
        ai_note="",
    )


def generate_plan(
    db: Session,
    *,
    height_cm: float,
    weight_kg: float,
    goal: str,
    level: str,
    equipment: list[str],
    minutes: int,
    age: int | None = None,
    gender: str | None = None,
    frequency: int | None = None,
    user_key: str = "",
    recent_names: set[str] | None = None,
) -> AIPlanResult:
    rows = db.execute(select(models.Exercise).order_by(models.Exercise.name)).scalars().all()
    try:
        return _generate_with_gemini(
            rows, height_cm=height_cm, weight_kg=weight_kg, goal=goal, level=level, equipment=equipment,
            minutes=minutes, age=age, gender=gender, frequency=frequency, recent_names=recent_names,
        )
    except Exception as exc:
        # The rule-based planner keeps the feature working. The reason goes to the server log only.
        log.warning("Gemini not used, built-in planner answered: %s", exc)
        return _fallback_plan(
            rows, goal=goal, level=level, equipment=equipment, minutes=minutes, frequency=frequency,
            user_key=user_key, recent_names=recent_names, note=str(exc)[:220],
        )
