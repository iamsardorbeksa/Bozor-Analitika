# Demo script (≈ 4 minutes)

Before: `python -m scripts.seed --reset`, start backend and frontend, open http://localhost:5173. Language switcher is in the top bar (UZ / RU / EN).

1. **Landing (0:00).** The price board flips through real 7-day movers from the demo dataset; the stats strip is computed live. Point out the DEMO labels — nothing pretends to be a live price.
2. **Log in as buyer (0:30).** Login → "Xaridor" demo button. Dashboard: KPIs, price-movement chart, movers, recommended offers with reasons.
3. **Market Explorer (0:50).** Filter *Sabzavotlar* → region Toshkent → verified only → sort by lowest price. Every card shows freshness and DEMO.
4. **Price Comparison (1:20).** Pomidor, 500 kg. Show the formula, the recommended offer *and why*, and that the cheapest isn't automatically recommended (stock / MOQ / reliability).
5. **Send a purchase request (1:50)** from the recommended row.
6. **AI Analyst (2:10).** Ask "Which market currently has the cheapest potatoes?" then "10 million so'm byudjet bilan nima olsam bo'ladi?". Expand the evidence cards: each number comes from a tool call. Point out the mode badge.
7. **Seller (2:50).** Log out → seller demo. Incoming request from step 5 → counteroffer. Update a price → the history keeps both values; market position updates.
8. **Admin (3:20).** Verification queue → approve. Market Offers → flagged → the suspicious potato offer at ~3× median → remove. Reports & audit log show the action.
9. **Map (3:45).** Market pins and the regional price overlay; coordinates labelled as approximate demo locations.

Backup questions: *How do you stop fake prices?* outlier exclusion + moderation queue + verification + reports. *What if Claude is down?* deterministic mode with the same tools. *Is this real data?* No — clearly labelled demo data; the field-collection plan in the project brief is how real data enters (`source=field`).
