from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_nasa_catalog():
    response = client.get(
        "/api/nasa/catalog"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert "summary" in data
    assert "sources" in data

    assert (
        data["summary"]["api_verified_sources"]
        >= 1
    )

    assert any(
        source["id"] == "nasa_power"
        and source["api_verified"] is True
        for source in data["sources"]
    )


def test_nasa_catalog_item_power():
    response = client.get(
        "/api/nasa/catalog/nasa_power"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"

    source = data["source"]

    assert source["id"] == "nasa_power"
    assert source["provider"] == "NASA"
    assert source["api_verified"] is True


def test_nasa_catalog_item_not_found():
    response = client.get(
        "/api/nasa/catalog/fuente_inventada"
    )

    assert response.status_code == 404


def test_nasa_power_invalid_latitude():
    response = client.get(
        "/api/nasa/power",
        params={
            "latitude": 100,
            "longitude": -80.6328,
            "start": "20260101",
            "end": "20260107",
        },
    )

    assert response.status_code == 422


def test_nasa_power_invalid_longitude():
    response = client.get(
        "/api/nasa/power",
        params={
            "latitude": -5.1945,
            "longitude": -200,
            "start": "20260101",
            "end": "20260107",
        },
    )

    assert response.status_code == 422


def test_nasa_power_invalid_date_format():
    response = client.get(
        "/api/nasa/power",
        params={
            "latitude": -5.1945,
            "longitude": -80.6328,
            "start": "2026-01-01",
            "end": "20260107",
        },
    )

    assert response.status_code == 400