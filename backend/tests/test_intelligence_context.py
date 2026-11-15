from backend.app.services.intelligence_context import build_intelligence_context


def test_intelligence_context_uses_all_three_real_engines():
    context = build_intelligence_context("BajoPiura")
    assert context["demo"] is False
    assert context["source"] == "processed_real_data"
    assert set(context["engines"]) == {"earth_paradox", "silent_collapse", "decision_reversal"}
    assert all(context["engines"].values())


def test_intelligence_anomalies_keep_annual_resolution():
    context = build_intelligence_context("BajoPiura")
    assert context["anomalies"]
    assert all(item["temporal_resolution"] == "annual" for item in context["anomalies"])
    assert all(item["start_date"].endswith("-01-01") for item in context["anomalies"])
    assert all(item["end_date"].endswith("-12-31") for item in context["anomalies"])
