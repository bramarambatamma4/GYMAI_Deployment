"""Grant (or revoke) admin access from the command line:

    cd backend
    python -m app.make_admin you@example.com          # make admin
    python -m app.make_admin you@example.com --revoke # remove admin

The user must already have registered. Admin rights can only be given here, never through the website.
"""
import sys

import app.main  # noqa: F401  (creates missing tables/columns, e.g. users.is_admin, in an older database)
from app import models
from app.database import SessionLocal, DATABASE_URL


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 1
    email = args[0].strip().lower()
    revoke = "--revoke" in sys.argv
    with SessionLocal() as db:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"No user with email {email} in {DATABASE_URL}. Register that account first.")
            return 1
        user.is_admin = not revoke
        db.commit()
        print(f"{'Removed admin from' if revoke else 'Admin access granted to'} {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
