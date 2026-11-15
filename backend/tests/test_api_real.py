from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health():
    response = client.get(
        "/api/health"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"

    print(
        "PRUEBA API 1: HEALTH CORRECTO"
    )


def test_regions():
    response = client.get(
        "/api/regions"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"

    assert data["total"] == 4

    assert "BajoPiura" in data["regions"]

    print(
        "PRUEBA API 2: REGIONES CORRECTAS"
    )


def test_variables():
    response = client.get(
        "/api/variables"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"

    variable_ids = [
        item["id"]
        for item in data["variables"]
    ]

    assert "ndvi" in variable_ids
    assert "precipitation" in variable_ids

    print(
        "PRUEBA API 3: VARIABLES CORRECTAS"
    )


def test_series():
    response = client.get(
        "/api/series",
        params={
            "region": "BajoPiura"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["source"]
        == "processed_real_data"
    )

    assert data["region"] == "BajoPiura"

    assert (
        data["total_observations"]
        >= 4
    )

    assert len(data["series"]) == (
        data["total_observations"]
    )

    print(
        "PRUEBA API 4: SERIES REALES CORRECTAS"
    )


def test_findings():
    response = client.get(
        "/api/findings",
        params={
            "region": "BajoPiura"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["source"]
        == "processed_real_data"
    )

    assert data["demo"] is False

    assert data["total_findings"] == 3

    engines = {
        finding["engine"]
        for finding
        in data["findings"]
    }

    assert "earth_paradox" in engines
    assert "silent_collapse" in engines
    assert "decision_reversal" in engines

    print(
        "PRUEBA API 5: FINDINGS CORRECTOS"
    )


def test_finding_001():
    response = client.get(
        "/api/findings/REAL-001",
        params={
            "region": "BajoPiura"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["finding"]["finding_id"]
        == "REAL-001"
    )

    assert (
        data["finding"]["engine"]
        == "earth_paradox"
    )

    print(
        "PRUEBA API 6: REAL-001 CORRECTO"
    )


def test_finding_002():
    response = client.get(
        "/api/findings/REAL-002",
        params={
            "region": "BajoPiura"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["finding"]["finding_id"]
        == "REAL-002"
    )

    assert (
        data["finding"]["engine"]
        == "silent_collapse"
    )

    print(
        "PRUEBA API 7: REAL-002 CORRECTO"
    )


def test_finding_003():
    response = client.get(
        "/api/findings/REAL-003",
        params={
            "region": "BajoPiura"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["finding"]["finding_id"]
        == "REAL-003"
    )

    assert (
        data["finding"]["engine"]
        == "decision_reversal"
    )

    print(
        "PRUEBA API 8: REAL-003 CORRECTO"
    )


def test_invalid_finding():
    response = client.get(
        "/api/findings/REAL-999",
        params={
            "region": "BajoPiura"
        }
    )

    assert response.status_code == 404

    data = response.json()

    assert (
        data["detail"]
        == "Finding no encontrado."
    )

    print(
        "PRUEBA API 9: ERROR 404 CORRECTO"
    )


def test_invalid_region():
    response = client.get(
        "/api/findings",
        params={
            "region": "RegionInexistente"
        }
    )

    assert response.status_code == 400

    print(
        "PRUEBA API 10: REGION INVALIDA CORRECTA"
    )


if __name__ == "__main__":

    test_health()
    test_regions()
    test_variables()
    test_series()
    test_findings()
    test_finding_001()
    test_finding_002()
    test_finding_003()
    test_invalid_finding()
    test_invalid_region()

    print(
        "\nTODAS LAS PRUEBAS "
        "DE LA API REAL PASARON"
    )