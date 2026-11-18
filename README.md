# Bozor-Analitika

**Smarter Markets. Better Decisions.** — an AI-powered B2B market-intelligence platform and wholesale marketplace for Uzbekistan (hackathon Case #19).

Buyers compare wholesale offers by *total* cost, sellers see where their price sits in the market, administrators moderate the marketplace, and an AI Market Analyst answers questions using only database figures.

> **All prices in this repository are DEMO DATA.** They are plausible but fictional, flagged `is_demo` in the database, and labelled DEMO everywhere in the UI. Nothing is presented as a live market price.

---

## Quick start (local, no Docker, no PostgreSQL needed)

Requirements: Python 3.12+, Node 20+.

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python -m scripts.seed          # creates backend/bozor.db with demo data
uvicorn app.main:app --reload --port 8000
```

API docs (Swagger): http://127.0.0.1:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to the backend.

### Demo accounts (local demonstration only)

| Role   | Email                  | Password    |
|--------|------------------------|-------------|
| Buyer  | `buyer@demo.bozor.uz`  | `Demo12345` |
| Seller | `seller@demo.bozor.uz` | `Demo12345` |
| Admin  | `admin@demo.bozor.uz`  | `Admin12345`|

The login page has one-click buttons that fill these in. They are created by the seed script only; never use them in production.

### 3. Buyer requests → producer offers → e-signed contract (main flow)

1. **Buyer posts a request** at `/app/tenders/new`: what, how much, target price, quality, payment terms, delivery region and address, the offers deadline and the date the goods are needed. Producers in that category are notified.
2. **Producers browse the request board** at `/app/seller/tenders`:
   - quick sorts: lowest budget, smallest quantity, largest deal, closing soon, fewest offers;
   - filters: category, region, quantity and budget ranges, "only my field", "hide ones I answered".
   They send an offer with unit price, delivery cost, lead time, payment terms, quality, warranty, validity, minimum quantity and their own conditions. Offers are sealed, so producers don't see each other's prices.
3. **Buyer compares offers** at `/app/tenders/:id` in a table plus cards:
   - Each offer gets a score: price 50 %, lead time 20 %, reliability 15 %, payment terms 15 %.
   - The cheapest, fastest and recommended offers are badged, and offers that miss the date or exceed the budget are flagged.
4. **Buyer chooses an offer.** An official contract is generated from both sides' data:
   - parties, subject, price, payment, delivery, quality and warranty, liability, force majeure, disputes;
   - a specification (Appendix 1), requisites, signature blocks and a QR verification block.
   The buyer signs it with the **demo e-signature** (an E-IMZO-style key dialog where any 4+ digit PIN works).
5. **Producer signs or declines** at `/app/contracts/:id`:
   - **Sign:** the contract is in force, the other offers are declined and the producer's phone becomes visible.
   - **Decline:** the request reopens. The buyer can also withdraw the contract before the producer signs.

The signatures are SHA-256 hashes over the frozen contract terms, the signer and the time. They verify inside the platform, but the document is marked "NAMUNA · DEMO" and has no legal force. Company requisites (STIR, bank account) are generated demo values.

Sample data:

```bash
python -m alembic upgrade head
python -m scripts.seed_tenders           # 7 sample requests, offers and 2 contracts; adds producers seller1-4@demo.bozor.uz
python -m scripts.seed_tenders --reset   # start the sample over
```

All demo accounts use the password `Demo12345`. Producer `seller1@demo.bozor.uz` sells stationery; `seller@demo.bozor.uz` has a contract waiting for its signature.

### 4. Real prices from korzinka.uz and olx.uz

```bash
cd backend
python -m alembic upgrade head            # adds the offer source columns
python -m scripts.scrape --purge-demo     # first run: remove the generated demo offers, then import real prices
python -m scripts.scrape                  # later runs (daily): new prices, price history, expired listings
```

What it does (`backend/app/scraping/`):

- **korzinka.uz**: the online catalogue and weekly promotion pages (prices from the page's Nuxt state). One price for the whole chain, recorded for Tashkent.
- **olx.uz**: public ads in *Food & drinks* (25 pages) and *Building materials* (10 pages). It keeps title, price, city/district, time and link. It never keeps seller names, phone numbers (stripped from titles) or descriptions.
- **uzum.uz**: not collected. The site answers automated requests with a Cloudflare bot check, and the scraper does not work around bot checks. Uzum data needs an official API or partnership.
- **Rules:** it obeys robots.txt, identifies itself as `BozorAnalitikaBot`, and waits 1.5 s between requests.
- **Matching:** each listing is matched to a catalogue product by the product word at the start of its title. The pack size is converted (g→kg, ml→l, "30 dona"→piece). Flavours, jars, ready meals and implausible unit prices (outside 0.35–3.5× the catalogue reference) are skipped, so about 40 % of Korzinka and about 25 % of OLX listings are imported.
- **Offers:** imported offers have `source = web`, `source_site` and `source_url`, and unknown stock (`available_qty = NULL`). Buyers can't send a purchase request for them. The UI links to the listing instead.
- **History:** a price point is appended whenever a price changes, so trends and forecasts get real history as the scraper runs daily.

Admins can also start a refresh from the API: `POST /api/admin/sources/refresh`. `GET /api/admin/sources` shows per-site counts and the last run.

### Optional: enable Claude for the AI Analyst

Put an Anthropic API key in `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key (or if the API fails) the analyst keeps working in **deterministic mode**: a rule-based router calls the same database tools and renders a templated answer, and the UI says so.

---

## What's inside

| Area | Highlights |
|---|---|
| **Auth & roles** | JWT, bcrypt, role-based access (buyer / seller / admin), rate-limited login & register, role-based redirects |
| **Market Explorer** | Search, category / region / price / quantity / quality / verified / delivery filters, 5 sort orders, URL-synced state, grid & table views |
| **Price Comparison** | `total_cost = quantity × unit_price + delivery_cost`, recommendation score (cost 45 %, reliability 20 %, quality 15 %, delivery 10 %, availability 10 %) with reasons — the cheapest is not automatically best |
| **Purchase requests** | pending → countered → accepted → completed (or rejected / cancelled), enforced server-side per role |
| **Seller workspace** | Offer CRUD, pause/activate, quick price & stock updates, image upload with signature validation, competitiveness vs market, incoming requests, verification requests |
| **Admin** | Users (suspend/reactivate), seller verification queue, categories, offer moderation with outlier flags, reports, price monitoring, platform analytics, audit log |
| **Price intelligence** | avg / min / max / median, 7- and 30-day change with safe division, daily price index with carried-forward prices, outlier exclusion (> 2.5× or < 0.4× national median), regional comparison |
| **Supply & demand** | Observed metrics (offers, stock, inquiries, views, searches) kept separate from an *estimated* interest index; demand gaps (searched, < 3 offers) |
| **Forecasting** | Damped Holt smoothing (≥ 14 days) blended with linear regression (≥ 30 days); refuses to forecast with insufficient history and reports confidence |
| **AI Market Analyst** | 9 backend tools; Claude tool-use loop; every number traceable to a tool result shown as evidence cards in the UI |
| **Price alerts** | below / above / % change / verified listing; evaluated on every price change and on demand; in-app notifications with cooldown |
| **Market map** | Leaflet + OpenStreetMap, market pins, regional price overlay — coordinates labelled as approximate demo locations |
| **Localization** | Uzbek (default, typographic oʻ gʻ), Russian, English; currency formatted `1 250 000 so‘m` |

## Tests

```bash
cd backend && python -m pytest -q        # API, RBAC, analytics, AI, agents and scraping tests
cd frontend && npm test                  # Vitest + React Testing Library
```

## Project layout

```
backend/   FastAPI modular monolith (api / core / models / schemas / services / repositories / analytics / ai), Alembic, seed, tests
frontend/  React + TypeScript + Vite + Tailwind; pages per role, shadcn-style UI kit, i18n namespaces
docs/      ARCHITECTURE.md, API.md, DATABASE.md, DEMO.md, DEPLOYMENT.md
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Vercel (frontend), Render or Railway (backend, Docker), managed PostgreSQL. `docker compose up --build` runs the full stack locally with PostgreSQL.

## Known limitations

- Password-reset emails need an SMTP provider; the endpoint is implemented (no user enumeration) but sends nothing locally.
- The rate limiter is in-process; use Redis for multi-instance deployments.
- On this Windows machine Smart App Control blocked some compiled wheels (SQLAlchemy 2.1, SciPy, psycopg). SQLAlchemy is pinned to 2.0.x and the forecaster falls back to NumPy if scikit-learn can't load. PostgreSQL runs in Docker / production on Linux.
