"""AGENT 4 - Xazinachi opa, the finance advisor.

1) Is the cash enough for the plan?  2) If not, what would the missing amount cost at real bank rates
(Central Bank of Uzbekistan comparison, loan_rates.csv)?  3) Borrow now, wait and save, or buy part now?
Compares the expected monthly price rise (Market Analyst forecast, weighted by line totals) with one month
of loan interest.  4) A one-line tax reminder (business_rules.csv, 2026 rules).
This is a comparison, not an offer: the bank sets the final rate.
"""
from __future__ import annotations

from app.agents import common as C

LOAN_TYPE = "working_capital"   # wholesale buyers are businesses: working-capital loans
NEAR_DEADLINE_DAYS = 7


def loan_info(shortfall: float) -> dict:
    t = C.loan_types()[LOAN_TYPE]
    banks = [r for r in C.loan_rates() if r["loan_type"] == LOAN_TYPE]
    best = banks[0] if banks else None
    avg = float(t["average_rate"])
    return {
        "type": LOAN_TYPE,
        "annual_rate_pct": avg,
        "best_bank": best["bank"] if best else "",
        "best_bank_rate_pct": float(best["rate_pct"]) if best else avg,
        "monthly_interest": round(shortfall * avg / 100 / 12, 0),
        "as_of": t["as_of"],
        "source": "cbu.uz",
    }


TAX = {
    "uz": "Soliq ({year}): aylanmadan olinadigan soliq {std}; yillik aylanmasi 1 mlrd so'mgacha bo'lgan yakka tartibdagi tadbirkorlar uchun {ip}.",
    "ru": "Налоги ({year}): налог с оборота {std}; для ИП с годовым оборотом до 1 млрд сум — {ip}.",
    "en": "Tax ({year}): turnover tax {std}; {ip} for individual entrepreneurs with annual turnover up to 1 bn so'm.",
}


def tax_note(lang: str) -> str:
    rules = C.business_rules()
    std = rules.get("turnover_tax_standard", {}).get("value_text", "4%")
    ip = rules.get("turnover_tax_ip_small", {}).get("value_text", "1%")
    s = TAX.get(lang, TAX["uz"]).format(year=2026, std=std, ip=ip)
    return C.uz_typo(s) if lang == "uz" else s


def advise(lines: list[dict], cash: float | None, deadline_days: int | None, horizon_days: int, lang: str) -> dict:
    """lines: [{total, expected_change_pct}] for products that have a best offer."""
    total = round(sum(l["total"] for l in lines), 2)
    weighted = [(l["total"], l["expected_change_pct"]) for l in lines if l["expected_change_pct"] is not None]
    wsum = sum(w for w, _ in weighted)
    exp = round(sum(w * p for w, p in weighted) / wsum, 2) if weighted and wsum else None

    shortfall, loan = None, None
    if cash is None:
        verdict = "unknown_cash"
    elif cash >= total:
        verdict, shortfall = "enough", 0.0
    else:
        shortfall = round(total - cash, 2)
        loan = loan_info(shortfall)
        monthly_rise_pct = exp * 30 / max(horizon_days, 1) if exp is not None else None
        monthly_interest_pct = loan["annual_rate_pct"] / 12
        near = deadline_days is None or deadline_days <= NEAR_DEADLINE_DAYS
        if monthly_rise_pct is not None and monthly_rise_pct > monthly_interest_pct and near:
            verdict = "borrow"          # waiting costs more than the loan, and the goods are needed soon
        elif (exp is None or exp < 1.5) and not (deadline_days is not None and deadline_days <= 3):
            verdict = "wait_and_save"   # prices flat or falling: save up the difference
        else:
            verdict = "partial"         # buy what the cash covers now (rising items first)
    return {
        "total": total,
        "cash": cash,
        "shortfall": shortfall,
        "verdict": verdict,
        "loan": loan,
        "expected_price_change_pct": exp,
        "tax_note": tax_note(lang),
    }
