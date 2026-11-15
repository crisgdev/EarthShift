from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_nasa_eonet_endpoint():
    response = client.get(
        "/api/nasa/eonet",
        params={
            "status": "open",
            "limit": 5,
            "days": 30,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["source"] == "NASA EONET"
    assert data["provider"] == "NASA"
    assert data["api_version"] == "v3"
    assert data["demo"] is False

    assert (
        data["metadata"]["api_verified"]
        is True
    )

    assert data["event_count"] <= 5


def test_nasa_eonet_invalid_status():
    response = client.get(
        "/api/nasa/eonet",
        params={
            "status": "inventado",
            "limit": 5,
            "days": 30,
        },
    )

    assert response.status_code == 400


def test_nasa_eonet_invalid_limit():
    response = client.get(
        "/api/nasa/eonet",
        params={
            "status": "open",
            "limit": 0,
            "days": 30,
        },
    )

    assert response.status_code == 422
    