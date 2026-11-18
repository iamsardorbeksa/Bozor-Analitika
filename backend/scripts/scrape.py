"""Read today's prices from korzinka.uz and olx.uz into the database.

    python -m scripts.scrape                    # both sites
    python -m scripts.scrape --sites korzinka.uz
    python -m scripts.scrape --purge-demo       # first remove the generated demo offers and sellers
    python -m scripts.scrape --olx-pages 3      # fewer OLX pages (quick test)

Run it daily (Task Scheduler / cron): each run appends a price point whenever a price changed and expires
listings that are no longer on the site, so forecasts get real history over time.
"""
from __future__ import annotations

import argparse
import sys

from app.database.session import SessionLocal
from app.scraping.run import SITES, UNAVAILABLE, purge_demo, scrape_all


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sites", nargs="*", default=list(SITES), help=f"any of: {', '.join([*SITES, *UNAVAILABLE])}")
    ap.add_argument("--purge-demo", action="store_true", help="delete generated demo offers/sellers first")
    ap.add_argument("--olx-pages", type=int, default=None, help="max OLX pages per category (50 ads each)")
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    with SessionLocal() as db:
        if args.purge_demo:
            purge_demo(db)
        scrape_all(db, args.sites, args.olx_pages)


if __name__ == "__main__":
    main()
