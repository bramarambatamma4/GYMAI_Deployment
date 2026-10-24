from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central app configuration, loaded from environment variables (.env in dev).
    DATABASE_URL defaults to SQLite for local development but is written as a
    standard SQLAlchemy URL, so swapping to Postgres in production is just a
    matter of setting DATABASE_URL=postgresql://... — no code changes needed.
    """

    database_url: str = "sqlite:///./gymai.db"
    secret_key: str = "dev-only-secret-key-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200  # 30 days: stay signed in on this browser
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # CHANGE: any localhost / 127.0.0.1 port is allowed in development (Vite uses 5174, 5175... if 5173 is busy)
    cors_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True
    password_reset_expire_minutes: int = 10
    admin_api_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    registration_code_expire_minutes: int = 10
    registration_resend_seconds: int = 60
    # CHANGE 4: nightly incomplete-workout reminder
    frontend_url: str = "http://localhost:5173"   # base URL used for the email deep link
    scheduler_timezone: str = "Asia/Kolkata"      # defines "today" and the run time
    reminder_hour: int = 21                       # local hour the nightly job runs (0-23)
    reminder_minute: int = 0
    reminder_enabled: bool = True
    password_reset_resend_seconds: int = 60

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
