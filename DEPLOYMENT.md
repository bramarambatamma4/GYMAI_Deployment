# GymAI – run the admin panel and deploy

## A. Open the admin panel (local)
1. Start the backend and frontend:
   ```
   cd backend && source .venv/bin/activate    # Windows: .venv\Scripts\activate
   uvicorn app.main:app --reload --port 8000
   cd frontend && npm install && npm run dev
   ```
2. Register your own account on the website (email + password, or Continue with Google).
3. Make that account an admin (backend folder, same virtual environment):
   ```
   cd backend
   python -m app.make_admin your@email.com
   ```
   It prints "Admin access granted to ...". Use `--revoke` to remove admin rights.
4. Log out and log in again. An **Admin** link now appears in the menu (open `/admin`).
5. You will see every registered user: email, goal, today's workout status (Completed / Pending / Not generated), current and best streak, total workouts, last workout, join date.
Non-admins are redirected away and the server also returns 403 for them.

## B. Deploy

### What you are deploying
* **Frontend**: static React build (`npm run build` creates `frontend/dist`).
* **Backend**: FastAPI app (`uvicorn app.main:app`). It also runs the nightly reminder, so run **one** worker/instance.
* **Database**: SQLite file by default. On hosts that wipe the disk on every deploy your accounts would disappear, so use a **persistent disk** or **PostgreSQL**.

### 1. Prepare secrets (never commit `.env`)
Generate a new secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
Rotate the Gmail app password and SECRET_KEY that were in `.env.example`.

### 2. Backend (Render, Railway, Fly.io or any VPS)
* Root directory: `backend`
* Build: `pip install -r requirements.txt`
* Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
* Environment variables:
  ```
  SECRET_KEY=<new long random value>
  DATABASE_URL=sqlite:////data/gymai.db      # absolute path on a persistent disk
  #   or PostgreSQL: postgresql://user:pass@host/db   (also add psycopg2-binary to requirements.txt)
  CORS_ORIGINS=https://your-frontend-domain.com
  FRONTEND_URL=https://your-frontend-domain.com
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=...  SMTP_PASSWORD=...  SMTP_FROM=...  SMTP_USE_TLS=true
  GEMINI_API_KEY=...            # optional - free key from https://aistudio.google.com/app/apikey
  GEMINI_MODEL=gemini-2.5-flash
  GOOGLE_CLIENT_ID=...          # same value as the frontend
  ADMIN_API_KEY=<long random>   # only for POST /api/notifications/events
  SCHEDULER_TIMEZONE=Asia/Kolkata
  REMINDER_HOUR=21
  ```
* Create the admin on the server: open the host's shell and run `python -m app.make_admin your@email.com` (register that account on the live site first).

### 3. Frontend (Vercel or Netlify)
* Root directory: `frontend`, build command `npm run build`, output `dist`.
* Environment variables (set before building):
  ```
  VITE_API_URL=https://your-backend-domain.com/api
  VITE_GOOGLE_CLIENT_ID=...
  ```
* Page refreshes on routes like `/workout` work because `vercel.json` / `public/_redirects` send every path to `index.html`.

### 4. Google sign-in
Google Cloud Console > Credentials > your OAuth Web client > **Authorized JavaScript origins**: add `https://your-frontend-domain.com` (keep the localhost ones for development).

### 5. After deploying – check
1. Open the site, register, log out, log in again (confirms the database persists).
2. Redeploy once and log in again. If the account is gone, the database is not on a persistent disk.
3. Generate a workout, then open `/admin` with your admin account.

---

## C. Make it live with logins and history that never disappear (free tiers)

Accounts, history and streaks are stored in the database, so a live site needs a database that is not wiped on redeploy.

1. **Database (Neon or Supabase, free PostgreSQL)**: create a project and copy the connection string, e.g. `postgresql://user:password@host/dbname?sslmode=require`.
2. **Backend (Render / Railway)**: set `DATABASE_URL` to that string. `psycopg2-binary` is already in `requirements.txt`, and the tables are created on first start. Check the log line `[GymAI] Using database: ...` and `[GymAI] users: N, saved workouts: M`: the numbers must be the same after every restart.
3. **Frontend (Vercel / Netlify)**: set `VITE_API_URL` to your backend `/api` address.
4. **Stay signed in**: login lasts 30 days on a browser (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 43200), the last used email is remembered, and an email that already has an account asks for its password on the Create account page.
5. Free Render services sleep when idle. The nightly reminder only runs while the backend is awake; use a paid instance (or an external cron hitting the site) if reminders must be reliable.
