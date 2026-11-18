# Deployment

## Backend — Render (Docker) + managed PostgreSQL

1. Push the repo to GitHub.
2. Render → *New Blueprint* → select the repo. `render.yaml` creates `bozor-db` (PostgreSQL) and the `bozor-analitika-api` web service from `backend/Dockerfile`.
3. Set `CORS_ORIGINS` to your Vercel URL and, optionally, `ANTHROPIC_API_KEY`. `SECRET_KEY` is generated.
4. On start the container runs `alembic upgrade head`, seeds demo data **only if the database is empty**, then starts uvicorn. Health check: `/api/health`.

Railway works the same way: create a PostgreSQL plugin, deploy `backend/` with its Dockerfile, set the same variables (`DATABASE_URL` may be `postgres://…`; it is normalised to `postgresql+psycopg://`).

Uploaded images go to `UPLOAD_DIR` on local disk; on ephemeral hosts mount a persistent disk or switch uploads to object storage.

## Frontend — Vercel

1. Import the repo, root directory `frontend`, framework *Vite*.
2. Environment variable `VITE_API_URL=https://<your-backend-host>`.
3. `vercel.json` rewrites all paths to `index.html` for client-side routing.

## Environment variables

See `.env.example`. Required in production: `DATABASE_URL`, `SECRET_KEY` (32+ chars — the app refuses to start otherwise), `CORS_ORIGINS`, `ENVIRONMENT=production`. Optional: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-opus-5-5`), `ACCESS_TOKEN_MINUTES`, `MAX_UPLOAD_MB`.

## Production checklist

- [ ] Strong `SECRET_KEY`, HTTPS-only frontend and backend URLs
- [ ] Remove or rotate demo accounts (`is_demo=true` users) before real users arrive
- [ ] Redis-backed rate limiting if running more than one instance
- [ ] SMTP provider wired into `/api/auth/forgot-password`
- [ ] Backups for PostgreSQL
