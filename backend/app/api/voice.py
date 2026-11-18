"""Voice through VoiceLab (voicelab.uz): speech-to-text and text-to-speech for uz / ru / en.

The key (VOICELAB_API_KEY) stays on the server. VoiceLab jobs may finish later (HTTP 202), so we poll
until done (25 s max). Upstream errors are reported to the client as a short 502 message only.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import threading
import time
import uuid
from collections import OrderedDict

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.api import elevenlabs as eleven
from app.core.config import get_settings
from app.core.rate_limit import rate_limit

log = logging.getLogger("bozor.voice")
router = APIRouter(prefix="/api/voice", tags=["voice"])

API = "https://api.voicelab.uz"
MODEL = "lison"
MAX_WAIT_S = 25.0
MAX_AUDIO_BYTES = 10 * 1024 * 1024
AUDIO_TYPES = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"}
VOICE_RE = re.compile(r"^voice_[\w-]{4,60}$")
DEFAULT_VOICES = {"uz": "voice_4ef06e6b-2229-4023-ad66-c2a7a2b736ff", "en": "voice_951965ee-7f84-4e74-b93a-1c30c03ef21a"}  # narrator
STATUS_TTL_S = 600
TTS_CACHE_SIZE = 100

_status_cache: dict = {}
_tts_cache: OrderedDict[tuple, bytes] = OrderedDict()
_voices_cache: dict[str, str] = {}
_lock = threading.Lock()


class VoiceError(Exception):
    pass


def _key() -> str:
    key = get_settings().voicelab_api_key
    if not key:
        raise HTTPException(503, "Voice is not configured")
    return key


def _auth(key: str) -> dict:
    return {"Authorization": f"Bearer {key}"}


def _upstream_error(e: Exception) -> HTTPException:
    log.warning("VoiceLab error: %s", e)  # status codes only, never the key
    return HTTPException(502, "Voice service error, please try again")


# ------------------------------------------------------------------ status

def _provider() -> str | None:
    """VoiceLab first (built for Uzbek), then ElevenLabs, else none (the browser's own voice is used)."""
    s = get_settings()
    if s.voicelab_api_key:
        return "voicelab"
    if s.elevenlabs_api_key:
        return "elevenlabs"
    return None


@router.get("/status")
async def status():
    """{stt, tts, provider}: true when a key is set AND the provider answered a cheap check (cached 10 min)."""
    prov = _provider()
    if not prov:
        return {"stt": False, "tts": False, "provider": None}
    key = get_settings().voicelab_api_key if prov == "voicelab" else eleven.key()
    fp = hashlib.sha256(f"{prov}:{key}".encode()).hexdigest()[:16]
    with _lock:
        hit = _status_cache.get(fp)
        if hit and time.monotonic() - hit[0] < STATUS_TTL_S:
            return {"stt": hit[1], "tts": hit[1], "provider": prov}
    ok = False
    try:
        if prov == "elevenlabs":
            ok = await eleven.check(key)
        else:
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(f"{API}/v1/voices", params={"language": "uz", "model_id": MODEL}, headers=_auth(key))
                ok = r.status_code == 200
                if not ok:
                    log.warning("VoiceLab status check: HTTP %s", r.status_code)
    except httpx.HTTPError as e:
        log.warning("Voice status check failed: %s", type(e).__name__)
    with _lock:
        _status_cache.clear()
        _status_cache[fp] = (time.monotonic(), ok)
    return {"stt": ok, "tts": ok, "provider": prov}


# ------------------------------------------------------------------ speech to text

@router.post("/stt", dependencies=[Depends(rate_limit("voice_stt", 30, 300))])
async def stt(audio: UploadFile = File(...), language: str = Form("uz")):
    prov = _provider()
    if not prov:
        raise HTTPException(503, "Voice is not configured")
    lang = language if language in ("uz", "ru", "en") else "uz"
    ctype = (audio.content_type or "").split(";")[0].strip().lower()
    if ctype not in AUDIO_TYPES:
        raise HTTPException(415, "Unsupported audio type")
    data = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio too large (max 10 MB)")
    if not data:
        raise HTTPException(400, "Empty audio")
    try:
        if prov == "elevenlabs":
            text = await eleven.speech_to_text(eleven.key(), data, audio.filename or "speech.webm", ctype, lang)
        else:
            text = await _speech_to_text(_key(), data, audio.filename or "speech.webm", ctype, lang)
    except (VoiceError, eleven.ElevenError, httpx.HTTPError, ValueError) as e:
        raise _upstream_error(e) from None
    return {"text": text}


async def _speech_to_text(key: str, data: bytes, filename: str, ctype: str, lang: str) -> str:
    deadline = time.monotonic() + MAX_WAIT_S
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(f"{API}/v1/stt", headers={**_auth(key), "Idempotency-Key": str(uuid.uuid4())},
                              files={"audio": (filename[:80], data, ctype)},
                              data={"language": lang, "include_speakers": "false"})
        if r.status_code not in (200, 202):
            raise VoiceError(f"stt HTTP {r.status_code}")
        body = r.json()
        if body.get("status") == "completed" and "transcript" in body:
            return str(body.get("transcript") or "").strip()
        job = body.get("id")
        if not job or not re.fullmatch(r"[\w-]{1,100}", str(job)):
            raise VoiceError("stt: no job id")
        while time.monotonic() < deadline:
            await asyncio.sleep(0.8)
            st = (await client.get(f"{API}/v1/stt/transcriptions/{job}", headers=_auth(key))).json()
            if st.get("status") == "completed":
                return str(st.get("transcript") or "").strip()
            if st.get("status") == "failed":
                raise VoiceError("stt job failed")
    raise VoiceError("stt timeout")


# ------------------------------------------------------------------ text to speech

class TTSIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)  # spoken text is capped at 1500 chars (1 char = 1 credit)
    language: str = Field(default="uz", pattern="^(uz|ru|en)$")
    voice_id: str | None = Field(default=None, max_length=70)
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


@router.post("/tts", dependencies=[Depends(rate_limit("voice_tts", 30, 300))])
async def tts(data: TTSIn):
    prov = _provider()
    if not prov:
        raise HTTPException(503, "Voice is not configured")
    text = data.text.strip()[:1500]
    if not text:
        raise HTTPException(422, "Empty text")
    if data.voice_id is not None and not VOICE_RE.match(data.voice_id):
        raise HTTPException(422, "Invalid voice_id")
    media = "audio/mpeg" if prov == "elevenlabs" else "audio/wav"
    try:
        if prov == "elevenlabs":
            voice = eleven.voice_for(data.voice_id)
        else:
            voice = data.voice_id or await _default_voice(_key(), data.language)
        ck = (prov, voice, data.language, round(data.speed, 2), text)
        with _lock:
            if ck in _tts_cache:
                _tts_cache.move_to_end(ck)
                return Response(_tts_cache[ck], media_type=media)
        if prov == "elevenlabs":
            audio = await eleven.text_to_speech(eleven.key(), text, data.language, voice, data.speed)
        else:
            audio = await _text_to_speech(_key(), text, data.language, voice, data.speed)
    except (VoiceError, eleven.ElevenError, httpx.HTTPError, ValueError) as e:
        raise _upstream_error(e) from None
    with _lock:
        _tts_cache[ck] = audio
        _tts_cache.move_to_end(ck)
        while len(_tts_cache) > TTS_CACHE_SIZE:
            _tts_cache.popitem(last=False)
    return Response(audio, media_type=media)


async def _default_voice(key: str, lang: str) -> str:
    if lang in DEFAULT_VOICES:
        return DEFAULT_VOICES[lang]
    if lang in _voices_cache:
        return _voices_cache[lang]
    async with httpx.AsyncClient(timeout=8.0) as client:
        r = await client.get(f"{API}/v1/voices", params={"language": lang, "model_id": MODEL}, headers=_auth(key))
    if r.status_code != 200:
        raise VoiceError(f"voices HTTP {r.status_code}")
    voices = r.json().get("data") or []
    if not voices or not VOICE_RE.match(str(voices[0].get("id", ""))):
        raise VoiceError(f"no voice for {lang}")
    _voices_cache[lang] = voices[0]["id"]
    return _voices_cache[lang]


async def _text_to_speech(key: str, text: str, lang: str, voice: str, speed: float) -> bytes:
    deadline = time.monotonic() + MAX_WAIT_S
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(f"{API}/v1/tts", headers={**_auth(key), "Idempotency-Key": str(uuid.uuid4())},
                              json={"text": text, "language": lang, "voice_id": voice, "model_id": MODEL, "speed": speed})
        if r.status_code == 200:
            return r.content
        if r.status_code != 202:
            raise VoiceError(f"tts HTTP {r.status_code}")
        status_url = str(r.json().get("status_url") or "")
        if not status_url.startswith("/") or status_url.startswith("//"):
            raise VoiceError("tts: bad status url")
        while time.monotonic() < deadline:
            await asyncio.sleep(1.0)
            st = (await client.get(f"{API}{status_url}", headers=_auth(key))).json()
            if st.get("status") == "completed":
                audio_url = str(st.get("audio_url") or "")
                if not audio_url.startswith("https://"):
                    raise VoiceError("tts: bad audio url")
                a = await client.get(audio_url)  # signed URL, no key
                if a.status_code != 200:
                    raise VoiceError(f"tts download HTTP {a.status_code}")
                return a.content
            if st.get("status") == "failed":
                raise VoiceError("tts job failed")
    raise VoiceError("tts timeout")
