# Contract: four agents, Gemini, voice (shared by backend and frontend)

Design and agent concept come from the "BuyAI" handoff (C:\Users\sardo\OneDrive\Desktop\handoff\handoff).
Agents compute every number in code. The LLM (Gemini, free tier) only (a) parses the buyer's sentence and
(b) writes a short explanation. Everything works with no key (deterministic fallback).

## The four agents (names, roles, colours, images are fixed)

| n | id | Name (uz) | Role uz / ru / en | Colour | Image |
|---|----|-----------|-------------------|--------|-------|
| 1 | planner | Mirzo | Kotib · rejachi / Писарь · планировщик / Scribe · planner | #2f56b0 | /img/agents/mirzo.svg |
| 2 | scout | Dallol | Bozor dalloli · narx izlovchi / Базарный маклер · ищет цены / Bazaar broker · price scout | #d07a0c | /img/agents/dallol.svg |
| 3 | analyst | Tarozibon ota | Tarozi egasi · bozor tahlilchisi / Хранитель весов · аналитик рынка / Keeper of the scales · market analyst | #7b4ea3 | /img/agents/tarozibon.svg |
| 4 | finance | Xazinachi opa | Xazinachi · moliya maslahatchisi / Казначей · финансовый советник / Treasurer · finance advisor | #12855a | /img/agents/xazinachi.svg |

## POST /api/agents/run  (public, optional Bearer token, rate limited 20 / 5 min / IP)

Request: `{ "message": str (1..600), "region_ids": [uuid] (empty = all regions), "language": "uz"|"ru"|"en" }`

Response (all money = UZS JSON numbers):

```jsonc
{
  "engine": "gemini" | "deterministic",          // who parsed + explained
  "planner": {
    "items": [{ "product_id": uuid, "slug": str, "name_uz": str, "name_ru": str, "name_en": str,
                "emoji": str, "unit": str, "category_slug": str, "quantity": number }],
    "cash": number | null,                         // money the buyer says they have
    "deadline_days": number | null,                // "ertaga" = 1, "bir haftada" = 7 ...
    "regions": [{ "id": uuid, "name_uz": str, "name_ru": str, "name_en": str }],   // regions searched
    "unmatched": [str],                            // words that looked like products but are not in the catalogue
    "note": str | null                             // e.g. "No product recognised"
  },
  "scout": {
    "items": [{
      "product_id": uuid,
      "quantity": number,
      "best": Offer | null,                        // lowest total delivered cost that meets MOQ + stock,
                                                   // skipping offers flagged suspiciously cheap
      "alternatives": [Offer],                     // next 4 by total cost
      "offers_considered": int,
      "cheaper_than": int                          // how many other offers the best one beats
    }]
  },
  "analyst": {
    "items": [{
      "product_id": uuid,
      "market_avg": number | null,                 // robust average, searched regions (national if none)
      "best_vs_avg_pct": number | null,            // best unit price vs market_avg
      "change_7d_pct": number | null, "change_30d_pct": number | null,
      "spark": [number],                           // last 30 daily averages
      "forecast": { "sufficient": bool, "horizon_days": int, "expected_change_pct": number | null,
                    "confidence": "insufficient"|"low"|"medium"|"high" },
      "signal": "buy_now" | "wait" | "stable",     // wait = forecast falls >1.5% within horizon and deadline allows
      "wait_days": int | null, "expected_saving": number | null,
      "flagged": [{ "offer_id": uuid, "supplier": str, "unit_price": number, "vs_median_pct": number,
                    "kind": "overpriced" | "suspicious_cheap" }]   // >25% above / >20% below median
    }]
  },
  "finance": {
    "total": number,                               // sum of best totals
    "cash": number | null,
    "shortfall": number | null,                    // max(0, total - cash) when cash known
    "verdict": "enough" | "borrow" | "wait_and_save" | "partial" | "unknown_cash",
    "loan": { "type": "working_capital"|"microloan", "annual_rate_pct": number, "best_bank": str,
              "best_bank_rate_pct": number, "monthly_interest": number, "as_of": "2026-10-19",
              "source": "cbu.uz" } | null,         // only when shortfall > 0
    "expected_price_change_pct": number | null,    // weighted by line totals, over the horizon
    "tax_note": str                                // localized one-liner from business_rules.csv
  },
  "final": {
    "lines": [{ "product_id": uuid, "advice": "buy_now"|"wait"|"stable", "text": str }],  // localized
    "products_total": number, "delivery_total": number, "grand_total": number,
    "savings_vs_average": number | null,           // (market_avg*qty summed) - products_total
    "explanation": str,                            // Gemini prose, or the deterministic template
    "explanation_engine": "gemini" | "template"
  }
}
```

`Offer` = `{ offer_id, supplier, business_id, verified: bool, rating: number, region_name: str, market_name: str|null,
unit: str, unit_price, delivery_price, delivery_days, total_cost, available_qty, min_order_qty, quality, updated_at }`

Validation: empty or unparseable message -> 200 with `planner.items = []` and `planner.note` set (UI shows a hint).

## AI Analyst chat (existing /api/ai/chat) — engine order

`GEMINI_API_KEY` set -> Gemini with function calling over the same 9 tools; else `ANTHROPIC_API_KEY` -> Claude;
else deterministic. On any API error fall back to deterministic (never crash).
`GET /api/ai/status` -> `{ ai_available: bool, engine: "gemini"|"claude"|"deterministic", model: str|null, tools: [...] }`
(keep `mode` too, same value as engine, for compatibility).

## Voice  (VoiceLab, voicelab.uz; key VOICELAB_API_KEY, server side only)

- `GET /api/voice/status` -> `{ "stt": bool, "tts": bool }` (true when the key is set AND VoiceLab answered a cheap
  check once; cache the result for 10 min).
- `POST /api/voice/stt` multipart `audio` (<= 10 MB), `language` uz|ru|en -> `{ "text": str }`;
  502 `{detail}` on VoiceLab error. Rate limit 30 / 5 min / IP.
- `POST /api/voice/tts` JSON `{ text (<=1500 chars), language, voice_id?: "voice_..." , speed?: 0.5..2 }` -> `audio/wav`.
  Rate limit 30 / 5 min / IP. Simple in-process LRU cache keyed by (voice, lang, text).

Frontend falls back to the browser's Web Speech API (SpeechRecognition / speechSynthesis) when status says false.

Per-agent VoiceLab voice ids (from the handoff; Uzbek voices are native speakers):
planner uz voice_be56058a-8f15-48bb-904b-4fe92531d5b1 en voice_ba626fc6-18c5-408f-8376-d49b95047bd7 pitch 1.18 rate 1.08;
scout uz voice_5e592ada-eca8-42e3-98fa-469c1c8fc999 en voice_oUhQK9VMv-QO8w17IELbSGKF pitch 1.0 rate 1.12;
analyst uz voice_ba303813-3023-48aa-a454-4b5705669d35 en voice_4lA0S3282v3UoEBmpxOApz6w pitch 0.88 rate 0.88;
finance uz voice_2785aabd-21b5-4cc7-9845-2230186ef7d9 en voice_Xqxok0jKVM__CT74ptlRc_w0 pitch 1.0 rate 1.0 (female);
narrator uz voice_4ef06e6b-2229-4023-ad66-c2a7a2b736ff en voice_951965ee-7f84-4e74-b93a-1c30c03ef21a.
VoiceLab API (see handoff supabase/functions/voice/index.ts): base https://api.voicelab.uz, Bearer key, model "lison";
TTS POST /v1/tts (200 audio or 202 job -> poll status_url, then download audio_url); STT POST /v1/stt multipart
(202 {id} -> poll /v1/stt/transcriptions/{id} until status completed -> transcript); voices GET /v1/voices?language=&model_id=lison.

## Design tokens (BuyAI look)

bg #eceef1 with fixed "reeded glass" background (vertical ribs + orange glow from the bottom corners — CSS from the
handoff web/src/styles.css `.bg`), cards white / glass rgba(255,255,255,.72) with blur, ink #111317 (black primary
buttons, active pills), brand orange #ff5a1f (accent, send button), green #12855a (good/cheaper), amber #b45f00
(overpriced/wait), red #c0352b, muted #5d6370, line rgba(17,19,23,.10), radius 16px / big panels 34px, Inter-like
sans (keep Geist), mono for numbers. Listening state: Gemini-style animated multicolour glow around the viewport edge.
