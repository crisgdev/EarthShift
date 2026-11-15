from __future__ import annotations

from typing import Any

from backend.app.routes.findings import generate_real_findings

ENGINE_IDS = (
    "earth_paradox",
    "silent_collapse",
    "decision_reversal",
)


def _annual_ndvi_anomalies(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    silent = next(
        (item for item in findings if item.get("engine") == "silent_collapse"),
        None,
    )
    if not silent:
        return []

    rows = (
        silent.get("evidence", {})
        .get("anomaly_accumulation", {})
        .get("anomalies", [])
    )
    result: list[dict[str, Any]] = []

    for row in rows:
        year = row.get("year")
        value = row.get("anomaly")
        if not isinstance(year, int) or not isinstance(value, (int, float)):
            continue
        result.append({
            "start_date": f"{year}-01-01",
            "end_date": f"{year}-12-31",
            "year": year,
            "variable": "ndvi",
            "value": float(value),
            "unit": "NDVI",
            "engine": "silent_collapse",
            "negative_anomaly": bool(row.get("negative_anomaly", False)),
            "temporal_resolution": "annual",
        })

    return result


def build_intelligence_context(region: str = "BajoPiura") -> dict[str, Any]:
    data, findings = generate_real_findings(region)

    engines: dict[str, Any] = {}
    for engine_id in ENGINE_IDS:
        engines[engine_id] = next(
            (item for item in findings if item.get("engine") == engine_id),
            None,
        )

    spatial_limitation = data.get("metadata", {}).get("spatial_limitation")
    return {
        "region": region,
        "cell_id": data["cell_id"],
        "period": data["period"],
        "source": "processed_real_data",
        "demo": False,
        "engines": engines,
        "anomalies": _annual_ndvi_anomalies(findings),
        "quality": data.get("quality", {}),
        "metadata": data.get("metadata", {}),
        "limitations": [spatial_limitation] if spatial_limitation else [],
    }
