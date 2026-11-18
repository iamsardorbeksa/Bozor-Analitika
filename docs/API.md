# API

Interactive documentation: `GET /docs` (Swagger) and `/redoc`. All amounts are UZS. Errors are JSON `{"detail": "...", "errors"?: [...]}` with proper status codes (401 unauthenticated, 403 wrong role, 404 not found / not yours, 409 invalid state transition, 422 validation, 429 rate limited).

| Group | Endpoints |
|---|---|
| `/api/auth` | `POST register`, `POST login`, `POST forgot-password`, `GET/PATCH me`, `POST change-password` |
| catalog | `GET /api/regions`, `/api/categories` (with offer counts), `/api/products?category=`, `/api/products/{id}`, `/api/markets` (with counts & top offers), `/api/suppliers/{id}` |
| `/api/offers` | `GET` (q, category, product_id, region_id, market_id, min/max_price, min_qty, quality, verified_only, delivery_only, sort, page, page_size), `GET /compare?product_id&quantity&region_id&verified_only`, `GET /{id}` (detail + market stats + history + similar), `POST /{id}/report` · seller: `GET /mine`, `POST`, `PATCH /{id}`, `POST /{id}/status`, `DELETE /{id}` |
| `/api/analytics` | `GET overview`, `movers?days=7&limit=10(≤700)&category=<slug>` (rows: product_id, slug, name_uz/ru/en, unit, emoji, category_slug, offers, current_avg, previous_avg, change_pct, spark; cached 60 s), `supply-demand`, `products/{id}/stats|history|regional|forecast|supply-demand`, `buyer-dashboard` (buyer), `seller-dashboard` (seller) |
| `/api/ai` | `GET status` → `{ai_available, engine: gemini\|claude\|deterministic, mode (= engine), model, tools}`, `POST chat {message, language, conversation_id?}` (engine order Gemini → Claude → deterministic; any API error falls back to deterministic; `message.mode` = engine used), `GET/DELETE conversations[/{id}]` |
| `/api/agents` | `POST run {message (≤600), region_ids: [uuid] (empty = all), language: uz\|ru\|en}` → `{engine, planner, scout, analyst, finance, final}` — four agents (planner Mirzo, scout Dallol, analyst Tarozibon ota, finance Xazinachi opa) + final advice; public, optional Bearer token, 20 req / 5 min / IP. Full shape: [AGENTS_CONTRACT.md](AGENTS_CONTRACT.md). Empty / unrecognised message → 200 with `planner.items = []` and `planner.note`; unknown region id → 422 |
| `/api/voice` | `GET status` → `{stt, tts}` (key set and VoiceLab reachable; cached 10 min), `POST stt` multipart `audio` (webm/ogg/mp4/mpeg/wav, ≤10 MB) + `language` → `{text}`, `POST tts {text (spoken ≤1500 chars), language, voice_id?: "voice_…", speed?: 0.5–2}` → `audio/wav` (LRU cache 100). 30 req / 5 min / IP each; 503 without `VOICELAB_API_KEY`, 502 on VoiceLab errors, 413 too large, 415 wrong type |
| buyer | `GET/POST/DELETE /api/favorites[/{offer_id}]`, `GET/POST /api/requests`, `POST /api/requests/{id}/action {accept|reject|counter|complete|cancel}`, `GET/POST/PATCH/DELETE /api/alerts`, `POST /api/alerts/check` |
| notifications | `GET /api/notifications`, `GET unread-count`, `POST {id}/read`, `POST read-all` |
| seller | `GET/PATCH /api/businesses/me`, `GET/POST /api/businesses/me/verification`, `POST /api/uploads/image` |
| `/api/admin` | `GET dashboard`, `users`, `POST users/{id}/active`, `GET verifications`, `POST verifications/{id}/approve|reject`, `GET offers?flagged`, `POST offers/{id}/remove|restore`, `GET reports`, `POST reports/{id}/resolve`, `GET/POST/PATCH categories`, `GET price-monitoring`, `GET audit-logs` |

Pagination responses: `{items, total, page, page_size, pages}`.

## Request status machine

| Actor | Action | From → To |
|---|---|---|
| seller | accept | pending, countered → accepted |
| seller | reject | pending, countered → rejected |
| seller | counter | pending → countered (requires `counter_price`) |
| seller | complete | accepted → completed |
| buyer | accept | countered → accepted |
| buyer | cancel | pending, countered, accepted → cancelled |
