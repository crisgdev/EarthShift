from alerts import generate_findings


def test_complete_integration():
    data = {
        "cell_id": "piura_demo_001",
        "period": "2021-2025",

        "years": [
            2021,
            2022,
            2023,
            2024,
            2025
        ],

        "ndvi_values": [
            0.62,
            0.59,
            0.55,
            0.52,
            0.48
        ],

        "precipitation_values": [
            450,
            480,
            510,
            530,
            550
        ],

        "ndvi_reference": 0.60,

        "quality": {
            "variables": {
                "ndvi": {
                    "valid_fraction": 0.95
                },
                "precipitation": {
                    "valid_fraction": 0.95
                }
            }
        }
    }

    findings = generate_findings(data)

    assert isinstance(findings, list)

    assert len(findings) == 3

    engines = {
        finding["engine"]:
        finding
        for finding in findings
    }

    assert "earth_paradox" in engines
    assert "silent_collapse" in engines
    assert "decision_reversal" in engines

    assert (
        engines["earth_paradox"]["level"]
        == "investigar"
    )

    assert (
        engines["silent_collapse"]["level"]
        == "investigar"
    )

    assert (
        engines["decision_reversal"]["level"]
        == "investigar"
    )

    for finding in findings:

        assert "finding_id" in finding
        assert "cell_id" in finding
        assert "period" in finding
        assert "engine" in finding
        assert "level" in finding
        assert "variables" in finding
        assert "evidence" in finding
        assert "explanation" in finding
        assert "limitations" in finding

    print("PRUEBA FINAL 1: CORRECTA")


def test_quality_protection():
    data = {
        "cell_id": "piura_demo_002",
        "period": "2021-2025",

        "years": [
            2021,
            2022,
            2023,
            2024,
            2025
        ],

        "ndvi_values": [
            0.62,
            0.59,
            0.55,
            0.52,
            0.48
        ],

        "precipitation_values": [
            450,
            480,
            510,
            530,
            550
        ],

        "ndvi_reference": 0.60,

        "quality": {
            "variables": {
                "ndvi": {
                    "valid_fraction": 0.95
                },
                "precipitation": {
                    "valid_fraction": 0.50
                }
            }
        }
    }

    findings = generate_findings(data)

    engines = {
        finding["engine"]:
        finding
        for finding in findings
    }

    assert (
        engines["earth_paradox"]["level"]
        == "sin datos"
    )

    assert (
        engines["decision_reversal"]["level"]
        == "sin datos"
    )

    assert (
        engines["silent_collapse"]["level"]
        == "investigar"
    )

    print("PRUEBA FINAL 2: CORRECTA")


if __name__ == "__main__":

    test_complete_integration()
    test_quality_protection()

    print(
        "\nINTEGRACION FINAL "
        "DE EARTHSHIFT CORRECTA"
    )