"""ElevenLabs (elevenlabs.io) voice: Scribe speech-to-text and Eleven v4 text-to-speech.

Used when ELEVENLABS_API_KEY is set and VoiceLab is not. Both models support Uzbek, Russian and English
(ElevenLabs model docs, Nov 2026). The key stays on the server (header xi-api-key).
Credits: TTS costs per character, so the caller caps text at 1500 chars and caches results.
"""
from __future__ import annotations

import logging

import httpx

from app.core.config import get_settings

log = logging.getLogger("bozor.voice.elevenlabs")
API = "https://api.elevenlabs.io"
LANG = {"uz": "uz", "ru": "ru", "en": "en"}

# The app asks for VoiceLab voice ids per agent (see docs/AGENTS_CONTRACT.md). With ElevenLabs we map each
# of them to a stock ElevenLabs voice with a similar character. Stock voices are available on every plan.
ROLE_BY_VOICELAB_ID = {
    "voice_be56058a-8f15-48bb-904b-4fe92531d5b1": "planner", "voice_ba626fc6-18c5-408f-8376-d49b95047bd7": "planner",
    "voice_5e592ada-eca8-42e3-98fa-469c1c8fc999": "scout", "voice_oUhQK9VMv-QO8w17IELbSGKF": "scout",
    "voice_ba303813-3023-48aa-a454-4b5705669d35": "analyst", "voice_4lA0S3282v3UoEBmpxOApz6w": "analyst",
    "voice_2785aabd-21b5-4cc7-9845-2230186ef7d9": "finance", "voice_Xqxok0jKVM__CT74ptlRc_w0": "finance",
    "voice_4ef06e6b-2229-4023-ad66-c2a7a2b736ff": "narrator", "voice_951965ee-7f84-4e74-b93a-1c30c03ef21a": "narrator",
}
VOICE_BY_ROLE = {
    "planner": "TX3LPaxmHKxFdv7VOQHJ",   # Liam: young, energetic (Mirzo)
    "scout": "IKne3meq5aSn9XLyUdCD",     # Charlie: quick, casual (Dallol)
    "analyst": "pqHfZKP75CvOlQylNhV4",   # Bill: older, calm (Tarozibon ota)
    "finance": "EXAVITQu4vr4xnSDxMKL",   # Sarah: calm woman (Xazinachi opa)
    "narrator": "XrExE9yKIg1WjnnlVkGX",  # Matilda: clear narrator
}


class ElevenError(Exception):
    pass


def key() -> str | None:
    return get_settings().elevenlabs_api_key


def _h(k: str) -> dict:
    return {"xi-api-key": k}


async def check(k: str) -> bool:
    """Cheap check that the key works (lists models, costs no credits)."""
    async with httpx.AsyncClient(timeout=8.0) as client:
        r = await client.get(f"{API}/v1/models", headers=_h(k))
    if r.status_code == 200:
        return True
    # Keys restricted to speech only (TTS/STT) are valid but may not list models:
    # ElevenLabs then answers 401 "missing_permissions", which still means the key itself works.
    try:
        detail = r.json().get("detail")
    except ValueError:
        detail = None
    if r.status_code == 401 and isinstance(detail, dict) and detail.get("status") == "missing_permissions":
        return True
    log.warning("ElevenLabs status check: HTTP %s", r.status_code)
    return False


async def speech_to_text(k: str, data: bytes, filename: str, ctype: str, lang: str) -> str:
    s = get_settings()
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{API}/v1/speech-to-text", headers=_h(k),
            files={"file": (filename[:80], data, ctype)},
            data={"model_id": s.elevenlabs_stt_model, "language_code": LANG.get(lang, "uz"), "tag_audio_events": "false"},
        )
    if r.status_code != 200:
        raise ElevenError(f"stt HTTP {r.status_code}")
    return str(r.json().get("text") or "").strip()


def voice_for(requested: str | None) -> str:
    return VOICE_BY_ROLE[ROLE_BY_VOICELAB_ID.get(requested or "", "narrator")]


async def text_to_speech(k: str, text: str, lang: str, voice: str, speed: float) -> bytes:
    s = get_settings()
    body = {
        "text": text,
        "model_id": s.elevenlabs_tts_model,
        "language_code": LANG.get(lang, "uz"),
        # ElevenLabs accepts speed 0.7..1.2; the app's pitch trick sends wider values
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "speed": max(0.7, min(1.2, speed))},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(f"{API}/v1/text-to-speech/{voice}", params={"output_format": "mp3_44100_64"},
                              headers={**_h(k), "Accept": "audio/mpeg"}, json=body)
    if r.status_code != 200:
        raise ElevenError(f"tts HTTP {r.status_code}")
    return r.content
