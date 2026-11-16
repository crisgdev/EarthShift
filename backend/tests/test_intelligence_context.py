from backend.app.services.intelligence_context import build_intelligence_context
from backend.engines.quality import MIN_COVERAGE


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


def test_readiness_exposes_actual_engine_requirement_without_relaxing_it():
    context = build_intelligence_context("BosqueSecoMorropon")
    readiness = context["analysis_readiness"]
    assert readiness["minimum_valid_fraction"] == MIN_COVERAGE
    assert context["quality"]["variables"]["ndvi"]["valid_fraction"] < MIN_COVERAGE
    assert readiness["evaluated_engines"] == 0
    assert readiness["total_engines"] == 3
    assert all(engine["level"] == "sin datos" for engine in context["engines"].values())


def test_readiness_recognizes_evaluated_engines_for_sufficient_coverage():
    context = build_intelligence_context("BajoPiura")
    assert context["analysis_readiness"]["evaluated_engines"] == 3
