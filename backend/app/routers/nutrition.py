from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.services.nutrition import UserBody, build_day_plan, calculate_water_need_ml
from app.services.reminders import today_local

router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])

MISSING_WORKOUT = "Generate today's workout first - your meal plan is built around it."


def _today_workout(db: Session, user: models.User) -> models.DailyWorkout | None:
    return db.query(models.DailyWorkout).filter_by(user_id=user.id, day=today_local()).first()


def _saved_location(db: Session, user: models.User) -> str | None:
    pref = db.get(models.UserPreference, user.id)
    return f"{pref.state}, {pref.country}" if pref else None


@router.get("/inputs", response_model=schemas.NutritionInputsOut)
def get_inputs(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Read-only preview of the three generator inputs. Never generates a plan."""
    daily = _today_workout(db, user)
    location = _saved_location(db, user)
    if daily is None:
        return schemas.NutritionInputsOut(ready=False, location=location, message=MISSING_WORKOUT)
    if not user.weight_kg:
        return schemas.NutritionInputsOut(ready=False, location=location, message="Add your weight in your profile first.")
    plan = daily.plan
    minutes = int(plan.get("duration_minutes") or 30)
    return schemas.NutritionInputsOut(
        workout_name=plan.get("name"), workout_focus=plan.get("focus"), workout_duration_minutes=minutes,
        workout_exercise_count=len(plan.get("exercises") or []),
        water_need_ml=calculate_water_need_ml(user.weight_kg, minutes, plan.get("difficulty")),
        location=location, ready=True,
    )


@router.post("/plan", response_model=schemas.NutritionPlanOut)
def generate_plan(payload: schemas.NutritionPlanIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Only runs when the user presses Generate Plan."""
    daily = _today_workout(db, user)
    if daily is None:
        raise HTTPException(status_code=409, detail=MISSING_WORKOUT)
    missing = [n for n, v in (("weight", user.weight_kg), ("height", user.height_cm), ("age", user.age), ("goal", user.goal),
                              ("training days", user.training_frequency)) if not v]
    if missing:
        raise HTTPException(status_code=422, detail="Complete your profile first: " + ", ".join(missing) + ".")

    minutes = int(daily.plan.get("duration_minutes") or 30)
    water = calculate_water_need_ml(user.weight_kg, minutes, daily.plan.get("difficulty"))
    result = build_day_plan(
        workout_plan=daily.plan, location=payload.location, water_need_ml=water, diet=payload.diet, today=today_local(),
        user=UserBody(weight_kg=user.weight_kg, height_cm=user.height_cm, age=user.age, gender=user.gender,
                      goal=user.goal, training_frequency=user.training_frequency),
    )
    return schemas.NutritionPlanOut(**result)
