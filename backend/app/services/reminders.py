"""CHANGE 4: nightly "workout not completed" reminder.

No extra dependency: a small asyncio loop (started from FastAPI's lifespan)
sleeps until the configured local time, then runs `send_incomplete_reminders`
in a worker thread. Each DailyWorkout is emailed at most once
(`reminder_sent_at`), so a restart or retry never sends duplicates.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select

from app import models
from app.config import settings
from app.database import SessionLocal
from app.services.email import send_incomplete_workout_reminder

log = logging.getLogger("gymai.reminders")


def local_tz() -> ZoneInfo:
    try:
        return ZoneInfo(settings.scheduler_timezone)
    except ZoneInfoNotFoundError:
        log.warning("Unknown SCHEDULER_TIMEZONE %r, using UTC", settings.scheduler_timezone)
        return ZoneInfo("UTC")


def today_local() -> date:
    return datetime.now(local_tz()).date()


def workout_url() -> str:
    # Deep link to the Workout page, which restores the user's active plan.
    return settings.frontend_url.rstrip("/") + "/workout"


def send_incomplete_reminders() -> int:
    """Email every user whose workout generated today is still not completed. Returns emails sent."""
    sent = 0
    with SessionLocal() as db:
        rows = db.execute(
            select(models.DailyWorkout, models.User.email)
            .join(models.User, models.User.id == models.DailyWorkout.user_id)
            .where(models.DailyWorkout.day == today_local())
            .where(models.DailyWorkout.completed.is_(False))
            .where(models.DailyWorkout.reminder_sent_at.is_(None))
        ).all()
        for daily, email in rows:
            try:
                send_incomplete_workout_reminder(email, workout_url())
            except Exception as exc:  # one failure must not block the others
                log.warning("reminder to %s failed: %s", email, exc)
                continue
            daily.reminder_sent_at = datetime.now(timezone.utc)
            db.commit()
            sent += 1
    log.info("incomplete-workout reminders sent: %d", sent)
    return sent


def _seconds_until_next_run() -> float:
    tz = local_tz()
    now = datetime.now(tz)
    target = now.replace(hour=settings.reminder_hour, minute=settings.reminder_minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


async def reminder_loop() -> None:
    while True:
        await asyncio.sleep(_seconds_until_next_run())
        try:
            await asyncio.to_thread(send_incomplete_reminders)
        except Exception:
            log.exception("nightly reminder job crashed")
