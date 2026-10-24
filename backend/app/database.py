import os
import shutil
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

BACKEND_DIR = Path(__file__).resolve().parent.parent
# CHANGE: local databases live in ~/.gymai (override with GYMAI_DATA_DIR), NOT inside the project folder.
# Unzipping a new version, deleting the project or starting the server from another folder can no longer
# wipe accounts, history and streaks.
DATA_DIR = Path(os.getenv("GYMAI_DATA_DIR", str(Path.home() / ".gymai")))


def _resolve_url(url: str) -> str:
    """Relative SQLite paths (sqlite:///./gymai.db) are stored in DATA_DIR. An existing backend/gymai.db is
    copied there once. Absolute SQLite paths and PostgreSQL URLs are used exactly as given."""
    prefix = "sqlite:///"
    if url.startswith(prefix) and not url.startswith("sqlite:////") and url != "sqlite://":
        raw = url[len(prefix):]
        if raw and raw != ":memory:" and not Path(raw).is_absolute():
            legacy = (BACKEND_DIR / raw).resolve()
            try:
                DATA_DIR.mkdir(parents=True, exist_ok=True)
                target = DATA_DIR / Path(raw).name
                if not target.exists() and legacy.exists():
                    shutil.copy2(legacy, target)  # one-time carry-over of an existing database
                return prefix + str(target)
            except OSError:
                return prefix + str(legacy)  # data folder not writable (some hosts): keep it beside the code
    return url


DATABASE_URL = _resolve_url(settings.database_url)

# SQLite needs this connect_arg for multi-threaded FastAPI use; Postgres ignores it
# entirely if you swap the URL, so this stays safe across both backends.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
