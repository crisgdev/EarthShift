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

    summary = data["summary"]

    assert (
        summary["api_verified_sources"]
        >= 2
    )

    assert (
        summary["csv_verified_sources"]
        >= 2
    )

    assert (
        summary["pending_verification"]
        == 0
    )


def test_engine_nasa_sources_are_verified():
    response = client.get(
        "/api/nasa/catalog"
    )

    assert response.status_code == 200

    summary = response.json()["summary"]

    verified = (
        summary[
            "engine_nasa_sources_verified"
        ]
    )

    assert "modis_ndvi" in verified

    assert (
        "gpm_imerg_precipitation"
        in verified
    )


def test_modis_provenance():
    response = client.get(
        "/api/nasa/catalog/modis_ndvi"
    )

    assert response.status_code == 200

    source = response.json()["source"]

    assert source["provider"] == "NASA"
    assert source["product"] == "MOD13Q1"
    assert source["version"] == "061"

    assert (
        source["provenance_verified"]
        is True
    )

    assert (
        source["verified_against_current_csv"]
        is True
    )

    assert source["used_by_engines"] is True


def test_gpm_imerg_provenance():
    response = client.get(
        "/api/nasa/catalog/gpm_imerg_precipitation"
    )

    assert response.status_code == 200

    source = response.json()["source"]

    assert source["provider"] == "NASA"
    assert source["mission"] == "GPM"

    assert (
        source["product"]
        == "GPM_3IMERGM"
    )

    assert source["version"] == "07"

    assert (
        source["provenance_verified"]
        is True
    )

    assert (
        source["verified_against_current_csv"]
        is True
    )

    assert source["used_by_engines"] is True

    assert (
        source["spatial_match"]
        == "approximate"
    )


def test_nasa_power_is_api_verified():
    response = client.get(
        "/api/nasa/catalog/nasa_power"
    )

    assert response.status_code == 200

    source = response.json()["source"]

    assert source["provider"] == "NASA"

    assert (
        source["product"]
        == "NASA POWER API"
    )

    assert source["api_verified"] is True

    assert (
        source["provenance_verified"]
        is True
    )


def test_nasa_eonet_is_api_verified():
    response = client.get(
        "/api/nasa/catalog/nasa_eonet"
    )

    assert response.status_code == 200

    source = response.json()["source"]

    assert source["provider"] == "NASA"
    assert source["product"] == "EONET API"
    assert source["version"] == "v3"

    assert source["api_verified"] is True

    assert (
        source["provenance_verified"]
        is True
    )


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