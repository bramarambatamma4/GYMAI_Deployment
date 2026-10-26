from pydantic_settings import BaseSettings, SettingsConfigDict


INSECURE_SECRET_VALUES = {
    "dev-secret-change-me",
    "dev-only-secret-key-change-me",
    "change-me",
    "your-secret-key",
    "secret",
}


class Settings(BaseSettings):
    """Application settings for local development and production deployment."""

    environment: str = "development"
    database_url: str = "sqlite:///./gymai.db"
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200  # 30 days
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cors_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    # SMTP compatibility kept for older deployments; not used by the Resend integration.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True

    resend_api_key: str = ""
    email_from: str = ""

    password_reset_expire_minutes: int = 10
    admin_api_key: str = ""
    scheduler_api_key: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    registration_code_expire_minutes: int = 10
    registration_resend_seconds: int = 60
    frontend_url: str = "http://localhost:5173"
    scheduler_timezone: str = "Asia/Kolkata"
    reminder_hour: int = 21
    reminder_minute: int = 0
    reminder_enabled: bool = False
    password_reset_resend_seconds: int = 60

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()


def validate_database_url_for_runtime() -> None:
    """Production must use a real PostgreSQL URL and never fall back to SQLite."""
    if not settings.is_production:
        return

    db_url = (settings.database_url or "").strip()
    if not db_url:
        raise RuntimeError("DATABASE_URL must be set in production.")

    if db_url.startswith("sqlite"):
        raise RuntimeError("Production requires a PostgreSQL DATABASE_URL; SQLite is not allowed in Render/Neon deployments.")

    scheme = db_url.split(":", 1)[0].lower()
    if scheme not in {"postgres", "postgresql"}:
        raise RuntimeError("Production DATABASE_URL must use PostgreSQL. SQLite is not permitted.")


def validate_runtime_settings() -> None:
    """Fail fast only in production when required secrets are missing."""
    if not settings.is_production:
        return

    if not settings.secret_key or settings.secret_key.strip() == "":
        raise RuntimeError("SECRET_KEY must be set to a secure value in production.")

    if settings.secret_key in INSECURE_SECRET_VALUES:
        raise RuntimeError("SECRET_KEY must not use the default or placeholder value in production.")

    validate_database_url_for_runtime()


__all__ = ["settings", "validate_runtime_settings", "validate_database_url_for_runtime"]
