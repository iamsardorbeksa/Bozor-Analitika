import logging
import warnings
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import exc as sa_exc

from app.api import admin, agents, ai, analytics, auth, buyer, catalog, offers, seller, tenders, voice
from app.core.config import get_settings

warnings.filterwarnings("ignore", category=sa_exc.SAWarning, message=".*Decimal objects natively.*")
logging.basicConfig(level=logging.INFO)
settings = get_settings()
if settings.environment == "production" and (settings.secret_key.startswith("dev-only") or len(settings.secret_key) < 32):
    raise RuntimeError("Set a strong SECRET_KEY (32+ chars) in production")

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="B2B market intelligence & wholesale marketplace for Uzbekistan. All money values are UZS.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept-Language"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return resp


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errors = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"].removeprefix("Value error, ")} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": errors[0]["message"] if errors else "Invalid input", "errors": errors})


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    logging.getLogger("bozor").exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


for r in (auth, catalog, offers, analytics, ai, agents, voice, buyer, seller, admin, tenders):
    app.include_router(r.router)

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.on_event("startup")
def _warm_agents() -> None:
    """Build the agents' keyword index and import the forecasting stack in the background,
    so the first /api/agents/run answers fast (cold start ~2.5 s, warm < 0.1 s)."""
    import threading

    def warm():
        try:
            from app.agents import planner
            from app.database.session import SessionLocal

            try:
                import sklearn.linear_model  # noqa: F401
            except ImportError:
                pass
            with SessionLocal() as db:
                planner.keyword_index(db)
        except Exception as e:  # noqa: BLE001 - warm-up is best effort
            logging.getLogger("bozor").info("Agents warm-up skipped: %s", e)

    threading.Thread(target=warm, daemon=True).start()


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok", "ai_available": settings.ai_enabled, "environment": settings.environment}
