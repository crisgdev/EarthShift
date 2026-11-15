from collapse import detect_collapse


def test_persistent_decline():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.62, 0.59, 0.55, 0.52, 0.48],
        "ndvi_reference": 0.60
    }

    result = detect_collapse(data)

    assert result["level"] == "investigar"

    assert (
        result["evidence"]
        ["persistence_analysis"]
        ["persistent_decline"]
        is True
    )

    assert (
        result["evidence"]
        ["temporal_windows"]
        ["all_windows_decreasing"]
        is True
    )

    assert (
        result["evidence"]
        ["anomaly_accumulation"]
        ["negative_anomalies"]
        == 4
    )

    print("PRUEBA 1: CORRECTA")


def test_increasing_ndvi():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.40, 0.45, 0.50, 0.55, 0.60],
        "ndvi_reference": 0.60
    }

    result = detect_collapse(data)

    assert result["level"] == "normal"

    assert (
        result["evidence"]
        ["persistence_analysis"]
        ["persistent_decline"]
        is False
    )

    print("PRUEBA 2: CORRECTA")


def test_stable_ndvi():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.50, 0.50, 0.50, 0.50, 0.50],
        "ndvi_reference": 0.50
    }

    result = detect_collapse(data)

    assert result["level"] == "normal"

    assert (
        result["evidence"]
        ["cumulative_change"]
        ["absolute_change"]
        == 0
    )

    print("PRUEBA 3: CORRECTA")


def test_insufficient_data():
    data = {
        "years": [2021, 2022, 2023],
        "ndvi_values": [0.60, 0.55, 0.50],
        "ndvi_reference": 0.60
    }

    result = detect_collapse(data)

    assert result["level"] == "sin datos"

    print("PRUEBA 4: CORRECTA")


def test_variable_series():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.60, 0.55, 0.58, 0.53, 0.56],
        "ndvi_reference": 0.60
    }

    result = detect_collapse(data)

    # No exigimos "investigar".
    # Queremos evitar una falsa alarma fuerte.
    assert result["level"] in [
        "normal",
        "observar"
    ]

    assert (
        result["evidence"]
        ["persistence_analysis"]
        ["persistent_decline"]
        is False
    )

    print("PRUEBA 5: CORRECTA")


if __name__ == "__main__":

    test_persistent_decline()
    test_increasing_ndvi()
    test_stable_ndvi()
    test_insufficient_data()
    test_variable_series()

    print(
        "\nTODAS LAS PRUEBAS DE "
        "SILENT COLLAPSE PASARON"
    )