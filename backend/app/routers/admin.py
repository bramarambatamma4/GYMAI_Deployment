from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import require_admin
from app.routers.progress import calculate_current_streak, calculate_longest_streak
from app.services.reminders import local_tz, today_local

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


@router.get("/users", response_model=schemas.AdminSummaryOut)
def list_users(db: Session = Depends(get_db)):
    """Every registered user with goal, today's workout status and streaks. Admin only."""
    today = today_local()
    tz = local_tz()

    sessions_by_user: dict[str, list[datetime]] = defaultdict(list)
    for user_id, completed_at in db.query(models.WorkoutSession.user_id, models.WorkoutSession.completed_at).all():
        if completed_at:
            sessions_by_user[user_id].append(_aware(completed_at))

    daily_today = {d.user_id: d for d in db.query(models.DailyWorkout).filter(models.DailyWorkout.day == today).all()}

    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    rows: list[schemas.AdminUserOut] = []
    for u in users:
        stamps = sessions_by_user.get(u.id, [])
        utc_days = {s.astimezone(timezone.utc).date() for s in stamps}  # same basis as the Progress page
        done_today = any(s.astimezone(tz).date() == today for s in stamps)
        daily = daily_today.get(u.id)
        if done_today or (daily and daily.completed):
            status = "Completed today"
        elif daily:
            status = "Pending today"
        else:
            status = "Not generated today"
        rows.append(schemas.AdminUserOut(
            id=u.id, full_name=u.full_name, email=u.email, goal=u.goal, fitness_level=u.fitness_level,
            training_frequency=u.training_frequency, created_at=u.created_at, workout_status=status,
            total_workouts=len(stamps), last_workout_at=max(stamps) if stamps else None,
            current_streak=calculate_current_streak(utc_days), longest_streak=calculate_longest_streak(utc_days),
            is_admin=bool(u.is_admin),
        ))

    return schemas.AdminSummaryOut(
        total_users=len(rows),
        new_this_week=sum(1 for u in users if u.created_at and _aware(u.created_at) >= week_ago),
        completed_today=sum(1 for r in rows if r.workout_status == "Completed today"),
        pending_today=sum(1 for r in rows if r.workout_status == "Pending today"),
        active_streaks=sum(1 for r in rows if r.current_streak > 0),
        users=rows,
    )
