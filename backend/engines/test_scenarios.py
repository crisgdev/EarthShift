import pytest

from backend.app.services.engine_adapter import (
    build_engine_payload,
)

from backend.engines.alerts import (
    generate_findings,
)


REGIONS = [
    "BajoPiura",
    "BosqueSecoMorropon",
    "DesiertoSechura",
    "ValleChira",
]


@pytest.mark.parametrize(
    "region",
    REGIONS,
)
def test_all_real_regions_generate_findings(
    region,
):
    payload = build_engine_payload(
        region
    )

    findings = generate_findings(
        payload
    )

    assert len(findings) == 3

    engines = {
        finding["engine"]
        for finding in findings
    }

    assert engines == {
        "earth_paradox",
        "silent_collapse",
        "decision_reversal",
    }


@pytest.mark.parametrize(
    "region",
    REGIONS,
)
def test_all_regions_have_valid_quality(
    region,
):
    payload = build_engine_payload(
        region
    )

    assert "quality" in payload
    assert "variables" in payload["quality"]

    assert "ndvi" in (
        payload["quality"]["variables"]
    )

    assert "precipitation" in (
        payload["quality"]["variables"]
    )


@pytest.mark.parametrize(
    "region",
    REGIONS,
)
def test_all_regions_have_real_series(
    region,
):
    payload = build_engine_payload(
        region
    )

    years = payload["years"]
    ndvi = payload["ndvi_values"]
    precipitation = (
        payload["precipitation_values"]
    )

    assert len(years) >= 4

    assert len(years) == len(ndvi)

    assert (
        len(years)
        == len(precipitation)
    )


@pytest.mark.parametrize(
    "region",
    REGIONS,
)
def test_findings_have_valid_levels(
    region,
):
    payload = build_engine_payload(
        region
    )

    findings = generate_findings(
        payload
    )

    valid_levels = {
        "normal",
        "observar",
        "investigar",
        "sin datos",
    }

    for finding in findings:
        assert (
            finding["level"]
            in valid_levels
        )