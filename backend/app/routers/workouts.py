from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import models, schemas
from app.services.reminders import today_local
from app.database import get_db
from app.deps import get_current_user
from app.services.recommendation import build_recommendation
from app.services.ai_planner import generate_plan
from app.routers.exercises import serialize as serialize_exercise

router = APIRouter(
    prefix="/api/workouts",
    tags=["workouts"],
)


@router.get("/today", response_model=schemas.PersonalizedWorkoutOut)
def get_today_workout(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recommendation = build_recommendation(db, current_user)
    if not recommendation:
        raise HTTPException(status_code=422, detail="Complete your profile and choose equipment before starting a workout.")

    serialized = [serialize_exercise(row, request) for row in recommendation.exercises]
    difficulty = current_user.fitness_level or "Beginner"
    frequency = current_user.training_frequency or 3
    duration = max(20, len(serialized) * (6 if frequency >= 5 else 7))

    return schemas.PersonalizedWorkoutOut(
        id=f"profile-{current_user.id}-{current_user.goal}-{current_user.fitness_level}",
        name="Today's Personalized Training",
        focus=recommendation.focus,
        duration_minutes=duration,
        difficulty=difficulty,
        exercises=[schemas.WorkoutExerciseOut(**item.model_dump()) for item in serialized],
        profile_summary={
            "goal": current_user.goal or "General Fitness",
            "fitness_level": current_user.fitness_level or "Beginner",
            "equipment": ", ".join(current_user.equipment or []),
            "training_frequency": f"{frequency} days/week",
        },
    )


@router.post("/generate-ai", response_model=schemas.PersonalizedWorkoutOut)
def generate_ai_workout(
    payload: schemas.AIWorkoutGenerateIn,
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Exercises from the user's last few generated workouts, so the AI varies the session.
    recent_rows = (
        db.query(models.DailyWorkout)
        .filter(models.DailyWorkout.user_id == current_user.id)
        .order_by(models.DailyWorkout.day.desc())
        .limit(3)
        .all()
    )
    recent_names = {e.get("name") for r in recent_rows for e in (r.plan or {}).get("exercises", []) if e.get("name")}

    plan = generate_plan(
        db,
        height_cm=payload.height_cm,
        weight_kg=payload.weight_kg,
        goal=payload.goal,
        level=payload.fitness_level,
        equipment=payload.equipment,
        minutes=payload.workout_time_minutes,
        age=payload.age or current_user.age,
        gender=payload.gender or current_user.gender,
        frequency=payload.training_frequency or current_user.training_frequency,
        user_key=current_user.id,
        recent_names=recent_names,
    )
    if not plan.exercises:
        raise HTTPException(status_code=422, detail="No exercises match your level and equipment. Update your profile and try again.")

    items = []
    for row, sets, reps, rest in zip(plan.exercises, plan.sets, plan.reps, plan.rest_seconds):
        data = serialize_exercise(row, request).model_dump()
        data.update(sets=sets, reps=reps, rest_seconds=rest)
        items.append(schemas.WorkoutExerciseOut(**data))

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    result = schemas.PersonalizedWorkoutOut(
        id=f"ai-{current_user.id}-{stamp}",
        name=plan.focus.split(" - ")[0] + " workout" if plan.focus else "AI Workout Plan",
        focus=plan.focus,
        duration_minutes=payload.workout_time_minutes,
        difficulty=payload.fitness_level,
        exercises=items,
        profile_summary={"goal": payload.goal, "fitness_level": payload.fitness_level,
                         "equipment": ", ".join(payload.equipment), "source": plan.source, "ai_note": plan.ai_note},
    )

    # CHANGE 4: remember today's generated workout (one row per user per day).
    # A regeneration replaces the plan but never un-completes a finished day.
    daily = db.query(models.DailyWorkout).filter_by(user_id=current_user.id, day=today_local()).first()
    if daily is None:
        daily = models.DailyWorkout(user_id=current_user.id, day=today_local())
        db.add(daily)
    daily.workout_id = result.id
    daily.workout_name = result.name
    daily.plan = result.model_dump(mode="json")
    db.commit()
    return result


@router.get("/active", response_model=schemas.PersonalizedWorkoutOut | None)
def get_active_workout(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """CHANGE 4: today's generated-but-unfinished plan; the reminder email links to the page that loads this."""
    daily = db.query(models.DailyWorkout).filter_by(user_id=current_user.id, day=today_local()).first()
    if daily is None or daily.completed:
        return None
    return schemas.PersonalizedWorkoutOut(**daily.plan)


@router.post(
    "/complete",
    response_model=schemas.WorkoutSessionOut,
)
def complete_workout(
    payload: schemas.WorkoutSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = models.WorkoutSession(
        user_id=current_user.id,
        workout_id=payload.workout_id,
        workout_name=payload.workout_name,
        focus=payload.focus,
        duration_minutes=payload.duration_minutes,
        exercise_count=payload.exercise_count,
        total_sets=payload.total_sets,
        completed_sets=payload.completed_sets,
        completed_exercises=[item.model_dump() for item in payload.completed_exercises],
    )

    db.add(session)

    # CHANGE 4: finishing a session today satisfies today's generated workout.
    daily = db.query(models.DailyWorkout).filter_by(user_id=current_user.id, day=today_local()).first()
    if daily is not None:
        daily.completed = True

    db.commit()
    db.refresh(session)

    return session


@router.post("/pose-session", response_model=schemas.PoseSessionOut)
def save_pose_session(
    payload: schemas.PoseSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Pose analysis is intentionally available only to beginner users.
    if current_user.fitness_level != "Beginner":
        raise HTTPException(status_code=403, detail="Pose analysis is available for Beginner training only.")

    exercise = db.query(models.Exercise).filter(models.Exercise.id == payload.exercise_id).first()
    if not exercise or not exercise.pose_supported:
        raise HTTPException(status_code=422, detail="This exercise does not support pose analysis.")

    session = models.PoseSession(
        user_id=current_user.id,
        exercise_id=payload.exercise_id,
        exercise_name=payload.exercise_name,
        pose_type=payload.pose_type,
        reps=payload.reps,
        form_score=payload.form_score,
        feedback=payload.feedback,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
