# Database

PostgreSQL in production, SQLite for zero-setup local development (same SQLAlchemy models). UUID primary keys, foreign keys with explicit `ON DELETE`, timezone-aware timestamps (UTC), `Numeric(16,2)` for UZS amounts, enum columns stored as constrained strings.

Migrations: `backend/alembic` (`alembic upgrade head`). Initial revision creates all tables below; `7c1e2d9a4b10` adds `products.emoji`.

| Table | Purpose | Notes |
|---|---|---|
| `regions` | Viloyatlar with centroid lat/lng | uz/ru/en names |
| `markets` | Bazaars, wholesale centres, warehouses | `approximate_location` flag for demo coordinates |
| `users` | Accounts | `role` buyer/seller/admin, bcrypt `password_hash`, `is_active`, `is_demo`, preferred `language` |
| `businesses` | Seller profile (1:1 with user) | `verification_status`, `rating`, `completed_deals` |
| `seller_verifications` | Verification requests and reviews | reviewer + timestamps |
| `product_categories` | 13 categories (fixed slugs: vegetables, fruits, dried-fruits-nuts, grains, meat-dairy, oils-grocery, beverages, spices, construction, textiles, electronics, household, other) | localized names, icon |
| `products` | Catalogue (~600 items) | localized names, base unit (kg, l, piece, sack, m, t), `aliases` (JSON) for search/AI matching, `emoji` (String(16), not null, default 📦) shown in the UI |
| `offers` | A seller's wholesale offer | price, stock, MOQ, quality, delivery, validity, `status`, `source` (seller/demo/field), `is_demo`, `views_count`; indexes on (product, status), (region, status) |
| `offer_price_history` | **Append-only** price/stock log | index on (product, recorded_at) |
| `purchase_requests` / `purchase_request_items` | Buyer inquiries | status machine, counter price, seller message |
| `favorites` | Saved offers | unique (user, offer) |
| `notifications` | In-app notifications | kind, link, read flag |
| `price_alerts` | Buyer alert rules | condition below/above/change_pct/verified_listing, threshold, baseline, cooldown via `last_triggered_at` |
| `product_views` | Offer views | interest signal only |
| `search_logs` | Explorer & AI searches | demand-gap signal |
| `ai_conversations` / `ai_messages` | Analyst history | assistant messages store `tool_calls` (evidence) and `mode` |
| `reports` | Reported offers | open/resolved/dismissed |
| `audit_logs` | Admin actions | actor, action, entity, details JSON |

## Seed (`python -m scripts.seed [--reset]`)

7 regions · 11 markets · 13 categories · 599 products (catalogue in `scripts/catalogue.py`: base products with real variants — cultivars, grades, pack sizes — each with uz/ru/en names, unit, price, trend, aliases and its own emoji) · 140 sellers (32 long-standing + generated regional names; ≈ 68 % verified, others pending/unverified/rejected) · ~2 590 offers (every product has ≥ 2 active offers, most 3–6; `mosh`, `sariyog`, `atlas`, `quyosh-paneli` deliberately scarce for demand gaps) · ~39 000 price-history rows over 45 days (a point every 2–4 days, 1–3 days for core products) · 25 buyers · 34 purchase requests · ~7 000 views, 1 000 searches, favorites, alerts, notifications, one deliberately suspicious offer and two reports for moderation. Seeds in ≈ 3 s. Deterministic (`random.Random(19)`). Every generated offer is internally `source=demo`, `is_demo=true`; these flags are not shown as text to users.
