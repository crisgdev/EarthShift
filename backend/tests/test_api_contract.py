from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.cache import engine_cache


client = TestClient(app)


def test_cells_without_bbox():
    response = client.get(
        "/api/cells"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["total"] == 4
    assert len(data["cells"]) == 4


def test_cells_with_valid_bbox():
    response = client.get(
        "/api/cells",
        params={
            "bbox": "-81.3,-5.8,-80.3,-4.8"
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"

    assert data["bbox"] == {
        "west": -81.3,
        "south": -5.8,
        "east": -80.3,
        "north": -4.8,
    }


def test_cells_invalid_bbox_format():
    response = client.get(
        "/api/cells",
        params={
            "bbox": "-81.3,-5.8,-80.3"
        },
    )

    assert response.status_code == 400


def test_cells_invalid_bbox_order():
    response = client.get(
        "/api/cells",
        params={
            "bbox": "-80,-5,-81,-4"
        },
    )

    assert response.status_code == 400


def test_series_by_cell_id():
    response = client.get(
        "/api/series",
        params={
            "cell_id": "BajoPiura",
            "variables": (
                "ndvi,precipitation"
            ),
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["cell_id"] == "BajoPiura"

    assert data["variables"] == [
        "ndvi",
        "precipitation",
    ]

    assert (
        data["total_observations"]
        > 0
    )

    first = data["series"][0]

    assert "year" in first
    assert "ndvi" in first

    assert (
        "precipitation_mm"
        in first
    )


def test_series_ndvi_only():
    response = client.get(
        "/api/series",
        params={
            "cell_id": "BajoPiura",
            "variables": "ndvi",
        },
    )

    assert response.status_code == 200

    data = response.json()

    first = data["series"][0]

    assert "ndvi" in first

    assert (
        "precipitation_mm"
        not in first
    )


def test_series_precipitation_only():
    response = client.get(
        "/api/series",
        params={
            "cell_id": "BajoPiura",
            "variables": "precipitation",
        },
    )

    assert response.status_code == 200

    data = response.json()

    first = data["series"][0]

    assert "ndvi" not in first

    assert (
        "precipitation_mm"
        in first
    )


def test_series_invalid_variable():
    response = client.get(
        "/api/series",
        params={
            "cell_id": "BajoPiura",
            "variables": "inventada",
        },
    )

    assert response.status_code == 400


def test_series_invalid_cell():
    response = client.get(
        "/api/series",
        params={
            "cell_id": "ZonaInventada",
            "variables": "ndvi",
        },
    )

    assert response.status_code == 400


def test_findings_engine_filter():
    response = client.get(
        "/api/findings",
        params={
            "region": "BajoPiura",
            "engine": "silent_collapse",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["total_findings"]
        == 1
    )

    assert (
        data["findings"][0]["engine"]
        == "silent_collapse"
    )


def test_findings_invalid_engine():
    response = client.get(
        "/api/findings",
        params={
            "region": "BajoPiura",
            "engine": "inventado",
        },
    )

    assert response.status_code == 400


def test_findings_invalid_region():
    response = client.get(
        "/api/findings",
        params={
            "region": "RegionInventada"
        },
    )

    assert response.status_code == 400


def test_real_findings_are_not_demo():
    response = client.get(
        "/api/findings",
        params={
            "region": "BajoPiura"
        },
    )

    assert response.status_code == 200

    text = response.text

    assert (
        "demo_fixed_reference"
        not in text
    )

    data = response.json()

    assert data["demo"] is False

    for finding in data["findings"]:
        assert (
            finding["demo"]
            is False
        )

        assert (
            finding["data_source"]
            == "processed_real_data"
        )


def test_real_findings_have_required_fields():
    response = client.get(
        "/api/findings",
        params={
            "region": "BajoPiura"
        },
    )

    assert response.status_code == 200

    findings = (
        response.json()["findings"]
    )

    for finding in findings:
        assert "finding_id" in finding
        assert "cell_id" in finding
        assert "period" in finding
        assert "variables" in finding
        assert "evidence" in finding
        assert "quality" in finding
        assert "explanation" in finding
        assert "limitations" in finding


def test_no_missing_data_is_classified_normal():
    response = client.get(
        "/api/findings",
        params={
            "region": "BajoPiura"
        },
    )

    assert response.status_code == 200

    findings = (
        response.json()["findings"]
    )

    for finding in findings:
        quality = finding["quality"]

        if not quality["valid"]:
            assert (
                finding["level"]
                == "sin datos"
            )


def test_cache_stores_findings():
    engine_cache.clear()

    assert (
        engine_cache.get(
            "findings:BajoPiura"
        )
        is None
    )

    first = client.get(
        "/api/findings",
        params={
            "region": "BajoPiura"
        },
    )

    assert first.status_code == 200

    cached = engine_cache.get(
        "findings:BajoPiura"
    )

    assert cached is not None

    second = client.get(
        "/api/findings",
        params={
            "region": "BajoPiura"
        },
    )

    assert second.status_code == 200

    assert (
        first.json()
        == second.json()
    )