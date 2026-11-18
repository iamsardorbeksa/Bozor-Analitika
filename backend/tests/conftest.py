import os
import sys
import tempfile
from pathlib import Path

import pytest

# Isolated database for the test session — must be set before the app is imported.
_tmp = Path(tempfile.mkdtemp()) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.as_posix()}"
os.environ["ANTHROPIC_API_KEY"] = ""  # force deterministic analyst mode
os.environ["GEMINI_API_KEY"] = ""     # no LLM calls from tests (env wins over backend/.env)
os.environ["GEMINI_MODEL"] = ""
os.environ["VOICELAB_API_KEY"] = ""   # no VoiceLab calls from tests
os.environ["ELEVENLABS_API_KEY"] = ""  # no ElevenLabs calls (or credits spent) from tests
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.core.rate_limit import reset_limits  # noqa: E402
from app.main import app  # noqa: E402
from scripts import seed  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def seeded():
    seed.run(reset=True)
    yield


@pytest.fixture()
def client():
    reset_limits()
    return TestClient(app)


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def buyer(client):
    return _login(client, "buyer@demo.bozor.uz", "Demo12345")


@pytest.fixture()
def seller(client):
    return _login(client, "seller@demo.bozor.uz", "Demo12345")


@pytest.fixture()
def seller2(client):
    return _login(client, "seller1@demo.bozor.uz", "Demo12345")


@pytest.fixture()
def admin(client):
    return _login(client, "admin@demo.bozor.uz", "Admin12345")


@pytest.fixture()
def ids(client):
    regions = client.get("/api/regions").json()
    products = client.get("/api/products").json()
    return {"region": regions[0]["id"], "products": {p["slug"]: p["id"] for p in products}}
