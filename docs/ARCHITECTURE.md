# Architecture

```
 Browser (React SPA)                         FastAPI modular monolith                    Data
 ───────────────────                         ────────────────────────                    ────
 pages/{public,buyer,seller,admin,shared} ─▶ api/        (routers, HTTP only)       ─▶  PostgreSQL (prod)
 TanStack Query  ── axios + JWT ───────────▶ core/       (config, security, deps,       SQLite (local dev)
 i18n (uz/ru/en)                             │            rate limit)
 Recharts · Leaflet · motion                 services/   (business rules, transactions)
                                             repositories/ (query building)
                                             analytics/  (pandas/numpy: stats, index,
                                             │            scoring, forecast, supply/demand)
                                             ai/         (tools + Claude loop + deterministic
                                                          fallback)  ──▶ Anthropic API (optional)
```

## Key decisions

1. **Modular monolith.** One deployable FastAPI app; modules separated by responsibility. Route handlers stay thin: validation (Pydantic) → service → repository.
2. **Money is `Numeric(16,2)` / `Decimal`.** Totals and savings are computed in Decimal server-side and only serialised to JSON numbers at the edge.
3. **Append-only price history.** Every create and every price/stock change writes an `offer_price_history` row; nothing updates or deletes history. Offers are soft-deleted (`status=removed`) so history and requests stay intact.
4. **Daily price index.** For each product, every offer's last known price is carried forward day by day and averaged across offers. This avoids biasing the index toward sellers who update often.
5. **Outlier protection.** Offers priced above 2.5× or below 0.4× the product's *national* median are excluded from statistics (also in regional slices) and surface in the admin moderation queue.
6. **Recommendation, not just cheapest.** `score = 0.45·cost + 0.20·reliability + 0.15·quality + 0.10·delivery + 0.10·availability`, each normalised to 0–1. Offers that can't fill the quantity or whose MOQ is above it are not recommended. Reason codes are returned and translated in the UI.
7. **Grounded AI.** The model never sees the database. It may only call nine backend tools (`search_products`, `compare_offers`, `get_price_history`, `get_market_statistics`, `analyze_supply_demand`, `recommend_suppliers`, `calculate_purchase_cost`, `get_regional_comparison`, `get_price_forecast`). Tool outputs are stored with the message and rendered as evidence cards. Without an API key, or on any API error, a deterministic intent router calls the same tools — the platform stays useful and the UI labels the mode honestly.
8. **Observed vs estimated.** Supply/demand responses separate `observed` counts from an `estimated` interest index with an explicit disclaimer; views are never presented as market demand.
9. **Forecasts know their limits.** < 14 daily points → no forecast, `confidence: insufficient`. ≥ 14 → damped Holt; ≥ 30 → blended with an OLS trend, agreement feeding a confidence score; ~80 % bands are returned.

## Security

- bcrypt password hashing; JWT (HS256) with expiry; secret from environment (startup refuses a weak key in production).
- Role checks via dependencies (`require_buyer/seller/admin`); ownership checks return 404 so other sellers' offers aren't even confirmed to exist.
- Admin self-registration rejected at the schema level.
- SQLAlchemy parameterised queries only; Pydantic validation on every input; consistent JSON errors; generic 500 handler (no stack traces).
- Rate limits: login 20/5 min, register 10/h, forgot 5/h, AI 30/5 min per IP.
- Uploads: size cap, magic-byte signature check (JPEG/PNG/WEBP), server-generated filenames.
- Security headers (nosniff, frame-deny, referrer policy); CORS allow-list from env.

## Frontend

- Routes and role guards in `src/App.tsx`; `/app` shell with role-specific sidebars; public pages share the explorer, analytics and map components (read-only when logged out).
- `src/api/endpoints.ts` is the single typed API surface; `src/api/types.ts` mirrors backend schemas.
- UI kit in shadcn/ui style (Radix primitives + CVA) under `src/components/ui`; domain components (price tags, freshness and verification badges, sparklines) under `src/components/market`.
- i18n: one JSON file per namespace per language under `src/i18n/locales/{uz,ru,en}`, auto-discovered.
