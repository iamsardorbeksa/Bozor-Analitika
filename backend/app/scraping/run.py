"""Scrape the public sites and import their prices (used by `python -m scripts.scrape` and the admin refresh)."""
from __future__ import annotations

import threading
from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models import Business, DataSource, Notification, Offer, PurchaseRequest, Report, SellerVerification, User
from app.scraping import korzinka, olx
from app.scraping.http import Blocked, PoliteClient
from app.scraping.importer import ImportStats, import_listings

SITES = {"korzinka.uz": korzinka.scrape, "olx.uz": olx.scrape}
# uzum.uz answers automated requests with a Cloudflare bot check; we don't work around those.
UNAVAILABLE = {"uzum.uz": "Cloudflare bot check (no public data without a browser challenge)"}
KEEP_ACCOUNTS = {"buyer@demo.bozor.uz", "seller@demo.bozor.uz", "admin@demo.bozor.uz"}

_lock = threading.Lock()
status: dict = {"running": False, "started_at": None, "finished_at": None, "results": [], "error": None}


def purge_demo(db: Session, log=print) -> None:
    """Remove generated demo data: demo offers (and their history), demo sellers and buyers.
    The three sign-in accounts stay so the platform can still be tried."""
    n_offers = db.query(Offer).filter(Offer.source == DataSource.demo).count()
    db.execute(delete(Offer).where(Offer.source == DataSource.demo))
    demo_users = db.scalars(select(User.id).where(User.is_demo.is_(True), User.email.not_in(KEEP_ACCOUNTS))).all()
    # bulk deletes: the database cascades to businesses' offers, history, requests, favourites, alerts
    db.execute(update(Report).where(Report.resolved_by.in_(demo_users)).values(resolved_by=None))
    db.execute(update(SellerVerification).where(SellerVerification.reviewed_by.in_(demo_users)).values(reviewed_by=None))
    db.execute(delete(Business).where(Business.owner_id.in_(demo_users)))
    db.execute(delete(User).where(User.id.in_(demo_users)))
    kept = db.scalars(select(User.id).where(User.email.in_(KEEP_ACCOUNTS))).all()
    kept_biz = db.scalars(select(Business.id).where(Business.owner_id.in_(kept))).all()
    db.execute(delete(PurchaseRequest).where(PurchaseRequest.business_id.in_(kept_biz)))
    db.execute(delete(PurchaseRequest).where(PurchaseRequest.buyer_id.in_(kept)))
    db.execute(delete(Notification).where(Notification.user_id.in_(kept)))
    db.commit()
    log(f"removed {n_offers} demo offers and {len(demo_users)} demo accounts")


def scrape_all(db: Session, sites: list[str] | None = None, olx_pages: int | None = None, log=print) -> list[ImportStats]:
    results = []
    with PoliteClient() as client:
        for site in sites or list(SITES):
            if site in UNAVAILABLE:
                log(f"{site}: skipped - {UNAVAILABLE[site]}")
                continue
            log(f"{site}: reading…")
            try:
                if site == "olx.uz" and olx_pages:
                    listings = olx.scrape(client, log, {p: olx_pages for p in olx.CATEGORIES})
                else:
                    listings = SITES[site](client, log)
            except Blocked as e:
                log(f"{site}: stopped - {e}")
                continue
            stats = import_listings(db, site, listings)
            log(str(stats))
            results.append(stats)
    return results


def start_background(session_factory, sites: list[str] | None = None) -> bool:
    """Run a refresh in a thread (admin button). False if one is already running."""
    if not _lock.acquire(blocking=False):
        return False
    status.update(running=True, started_at=datetime.now(timezone.utc), finished_at=None, results=[], error=None)

    def work():
        try:
            with session_factory() as db:
                res = scrape_all(db, sites, log=lambda *_: None)
            status["results"] = [s.__dict__ for s in res]
        except Exception as e:  # reported on the admin page
            status["error"] = str(e)[:300]
        finally:
            status.update(running=False, finished_at=datetime.now(timezone.utc))
            _lock.release()

    threading.Thread(target=work, daemon=True, name="price-scrape").start()
    return True
