"""Minimal Gemini REST client (generativelanguage.googleapis.com, v1beta) over httpx.

- Model fallback: GEMINI_MODEL (if set) first, then a fixed list. A busy model (429/500/503) or a timeout
  moves on to the next one; any other error (bad key, bad request) stops immediately.
- Three uses: plain text with a system instruction, JSON structured output (responseSchema), and
  function calling (tools.functionDeclarations) for the AI analyst loop.
- The key is sent in the x-goog-api-key header, never in the URL, and is never logged.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx

from app.core.config import get_settings

log = logging.getLogger("bozor.gemini")

API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
FALLBACK_MODELS = ("gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash")
BUSY = {429, 500, 503}


class GeminiError(Exception):
    """Gemini could not answer (no key, all models busy, bad response). Never carries the key."""


def available() -> bool:
    return bool(get_settings().gemini_api_key)


def models() -> list[str]:
    first = get_settings().gemini_model
    out: list[str] = []
    for m in (first, *FALLBACK_MODELS):
        if m and m not in out:
            out.append(m)
    return out


# ------------------------------------------------------------------ schema conversion

_KEEP = {"type", "description", "enum", "properties", "items", "required", "nullable", "format", "minimum", "maximum",
         "minItems", "maxItems", "anyOf", "propertyOrdering"}


def to_gemini_schema(schema: Any) -> Any:
    """JSON Schema -> Gemini OpenAPI-subset schema.

    Gemini rejects `additionalProperties` (and other JSON-Schema-only keywords), and expresses
    `"type": ["number", "null"]` as `"type": "number", "nullable": true`.
    """
    if isinstance(schema, list):
        return [to_gemini_schema(s) for s in schema]
    if not isinstance(schema, dict):
        return schema
    out: dict[str, Any] = {}
    for k, v in schema.items():
        if k not in _KEEP:
            continue  # drops additionalProperties, $schema, default, title, ...
        if k == "type" and isinstance(v, list):
            types = [t for t in v if t != "null"]
            out["type"] = types[0] if types else "string"
            if "null" in v:
                out["nullable"] = True
        elif k == "properties":
            out[k] = {name: to_gemini_schema(p) for name, p in v.items()}
        elif k in ("items",):
            out[k] = to_gemini_schema(v)
        elif k == "anyOf":
            out[k] = [to_gemini_schema(x) for x in v]
        else:
            out[k] = v
    if out.get("type") == "object" and not out.get("required"):
        out.pop("required", None)
    return out


def function_declarations(claude_tools: list[dict]) -> list[dict]:
    """Our Claude tool list ({name, description, input_schema}) as Gemini functionDeclarations."""
    return [{"name": t["name"], "description": t["description"], "parameters": to_gemini_schema(t["input_schema"])} for t in claude_tools]


# ------------------------------------------------------------------ core call

def _post(client: httpx.Client, model: str, body: dict, key: str, timeout: float) -> httpx.Response:
    return client.post(API.format(model=model), json=body, timeout=timeout,
                       headers={"x-goog-api-key": key, "Content-Type": "application/json"})


def generate(body: dict, *, timeout: float = 6.0, budget: float | None = None) -> dict:
    """POST generateContent with model fallback. `body` is the request without the model.

    timeout: per-attempt limit (seconds); budget: total time for all attempts (default 2x timeout).
    Returns {"model": str, "content": candidate content dict, "raw": full response}.
    """
    key = get_settings().gemini_api_key
    if not key:
        raise GeminiError("GEMINI_API_KEY is not set")
    deadline = time.monotonic() + (budget if budget is not None else timeout * 2)
    last: Exception = GeminiError("Gemini: no time left")
    with httpx.Client() as client:
        for model in models():
            left = deadline - time.monotonic()
            if left < 1.0:
                break
            try:
                res = _post(client, model, body, key, min(timeout, left))
                if res.status_code == 400 and ("thinkingConfig" in body.get("generationConfig", {}) or "responseSchema" in body.get("generationConfig", {})):
                    # an optional setting was rejected: retry once with the plain version
                    gc = {k: v for k, v in body["generationConfig"].items() if k not in ("thinkingConfig", "responseSchema")}
                    res = _post(client, model, {**body, "generationConfig": gc}, key, max(1.0, min(timeout, deadline - time.monotonic())))
            except httpx.TimeoutException:
                log.warning("Gemini %s too slow, trying the next model", model)
                last = GeminiError(f"Gemini timeout ({model})")
                continue
            except httpx.HTTPError as e:
                raise GeminiError(f"Gemini network error: {type(e).__name__}") from None
            if res.status_code in BUSY:
                log.warning("Gemini %s busy (%s), trying the next model", model, res.status_code)
                last = GeminiError(f"Gemini {res.status_code} ({model})")
                continue
            if res.status_code != 200:
                log.warning("Gemini %s error %s", model, res.status_code)
                raise GeminiError(f"Gemini {res.status_code} ({model})")
            try:
                raw = res.json()
            except ValueError:
                raise GeminiError("Gemini returned invalid JSON") from None
            cands = raw.get("candidates") or []
            if not cands or not (cands[0].get("content") or {}).get("parts"):
                reason = (cands[0].get("finishReason") if cands else None) or (raw.get("promptFeedback") or {}).get("blockReason")
                raise GeminiError(f"Gemini returned no content ({reason})")
            return {"model": model, "content": cands[0]["content"], "raw": raw}
    raise last


def _text_of(content: dict) -> str:
    return "".join(p.get("text", "") for p in content.get("parts", []) if not p.get("thought")).strip()


def text(system: str, user: str, *, timeout: float = 6.5, budget: float | None = None, max_tokens: int = 1200) -> str:
    """Plain text generation with a system instruction."""
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"maxOutputTokens": max_tokens, "thinkingConfig": {"thinkingLevel": "LOW"}},
    }
    out = _text_of(generate(body, timeout=timeout, budget=budget)["content"])
    if not out:
        raise GeminiError("Gemini returned no text")
    return out


def structured(system: str, user: str, schema: dict, *, timeout: float = 4.5, budget: float | None = None, max_tokens: int = 1500) -> dict:
    """JSON structured output (responseMimeType application/json + responseSchema). Returns the parsed object."""
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": to_gemini_schema(schema),
                             "maxOutputTokens": max_tokens, "thinkingConfig": {"thinkingLevel": "LOW"}},
    }
    raw = _text_of(generate(body, timeout=timeout, budget=budget)["content"])
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        data = json.loads(raw)
    except ValueError:
        raise GeminiError("Gemini returned malformed JSON") from None
    if not isinstance(data, dict):
        raise GeminiError("Gemini returned a non-object")
    return data


def chat_step(system: str, contents: list[dict], declarations: list[dict], *, timeout: float = 30.0, budget: float = 45.0) -> dict:
    """One function-calling turn. Returns the candidate content ({role: "model", parts: [...]})."""
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "tools": [{"functionDeclarations": declarations}],
        "toolConfig": {"functionCallingConfig": {"mode": "AUTO"}},
        "generationConfig": {"maxOutputTokens": 4096},
    }
    content = generate(body, timeout=timeout, budget=budget)["content"]
    content.setdefault("role", "model")
    return content
