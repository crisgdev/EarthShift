from backend.app.services.engine_adapter import build_engine_payload
from backend.engines.alerts import generate_findings


def test_generate_findings_returns_three_results():
    payload = build_engine_payload("BajoPiura")

    findings = generate_findings(payload)

    assert isinstance(findings, list)
    assert len(findings) == 3


def test_findings_have_required_fields():
    payload = build_engine_payload("BajoPiura")

    findings = generate_findings(payload)

    required_fields = {
        "finding_id",
        "cell_id",
        "period",
        "engine",
        "level",
        "variables",
        "evidence",
        "quality",
        "explanation",
        "limitations",
    }

    for finding in findings:
        assert required_fields.issubset(
            finding.keys()
        )


def test_findings_have_valid_levels():
    payload = build_engine_payload("BajoPiura")

    findings = generate_findings(payload)

    valid_levels = {
        "normal",
        "observar",
        "investigar",
        "sin datos",
    }

    for finding in findings:
        assert finding["level"] in valid_levels


def test_expected_engines_are_present():
    payload = build_engine_payload("BajoPiura")

    findings = generate_findings(payload)

    engines = {
        finding["engine"]
        for finding in findings
    }

    assert engines == {
        "earth_paradox",
        "silent_collapse",
        "decision_reversal",
    }