"""Short-horizon price forecasting with explicit data-sufficiency checks.

- < 14 daily points: no forecast (insufficient data) - we never fabricate a trend.
- >= 14 points: Holt's linear exponential smoothing (level + damped trend).
- >= 30 points: also fit a scikit-learn linear regression on the last 30 days and
  blend it in, reporting agreement between the two models as part of confidence.
"""
from __future__ import annotations

from datetime import date, timedelta

import numpy as np

MIN_POINTS = 14


def holt(y: np.ndarray, horizon: int, alpha: float = 0.5, beta: float = 0.2, phi: float = 0.9) -> tuple[np.ndarray, np.ndarray]:
    level, trend = y[0], y[1] - y[0]
    fitted = []
    for v in y:
        fitted.append(level + phi * trend)
        prev_level = level
        level = alpha * v + (1 - alpha) * (level + phi * trend)
        trend = beta * (level - prev_level) + (1 - beta) * phi * trend
    fc = []
    damp = 0.0
    for h in range(1, horizon + 1):
        damp += phi**h
        fc.append(level + damp * trend)
    return np.array(fc), np.array(fitted)


def forecast(series: list[dict], horizon: int = 7) -> dict:
    n = len(series)
    if n < MIN_POINTS:
        return {
            "sufficient": False,
            "points": n,
            "min_points": MIN_POINTS,
            "method": None,
            "confidence": "insufficient",
            "history": series,
            "forecast": [],
        }
    y = np.array([p["avg"] for p in series], dtype=float)
    fc, fitted = holt(y, horizon)
    resid = y[1:] - fitted[1:]
    sigma = float(np.std(resid)) if len(resid) > 2 else float(np.std(y)) * 0.1
    method = "holt_damped"
    agreement = None
    if n >= 30:
        X = np.arange(30).reshape(-1, 1)
        future = np.arange(30, 30 + horizon).reshape(-1, 1)
        try:
            from sklearn.linear_model import LinearRegression

            lr_fc = LinearRegression().fit(X, y[-30:]).predict(future)
        except ImportError:  # same OLS fit without scikit-learn
            slope, intercept = np.polyfit(X.ravel(), y[-30:], 1)
            lr_fc = intercept + slope * future.ravel()
        agreement = float(1 - min(abs(lr_fc[-1] - fc[-1]) / max(abs(fc[-1]), 1), 1))
        fc = 0.6 * fc + 0.4 * lr_fc
        method = "holt_damped+linear_regression"

    rel_noise = sigma / max(float(np.mean(y)), 1)
    score = max(0.0, 1 - rel_noise * 8) * min(n / 30, 1.0)
    if agreement is not None:
        score = 0.7 * score + 0.3 * agreement
    confidence = "high" if score > 0.7 else "medium" if score > 0.45 else "low"

    last_day = date.fromisoformat(series[-1]["date"])
    out = []
    for i, v in enumerate(fc, start=1):
        band = 1.28 * sigma * np.sqrt(i)  # ~80% interval
        out.append(
            {
                "date": (last_day + timedelta(days=i)).isoformat(),
                "value": round(float(v), 0),
                "lower": round(float(v - band), 0),
                "upper": round(float(v + band), 0),
            }
        )
    direction_pct = (out[-1]["value"] - y[-1]) / y[-1] * 100 if y[-1] else 0
    return {
        "sufficient": True,
        "points": n,
        "min_points": MIN_POINTS,
        "method": method,
        "confidence": confidence,
        "confidence_score": round(score, 2),
        "expected_change_pct": round(float(direction_pct), 2),
        "history": series,
        "forecast": out,
    }
