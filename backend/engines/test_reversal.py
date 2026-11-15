from reversal import detect_reversal


def test_reversal_detected():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.62, 0.59, 0.55, 0.52, 0.48],
        "precipitation_values": [450, 480, 510, 530, 550]
    }

    result = detect_reversal(data)

    assert result["level"] == "investigar"
    assert result["reversal_detected"] is True
    assert result["univariable_level"] == "normal"
    assert result["multivariable_level"] == "investigar"

    print("PRUEBA 1: CORRECTA")


def test_no_reversal_both_increase():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.40, 0.45, 0.50, 0.55, 0.60],
        "precipitation_values": [400, 420, 440, 460, 480]
    }

    result = detect_reversal(data)

    assert result["level"] == "normal"
    assert result["reversal_detected"] is False

    print("PRUEBA 2: CORRECTA")


def test_declining_ndvi_and_precipitation():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.62, 0.59, 0.55, 0.52, 0.48],
        "precipitation_values": [550, 520, 500, 470, 440]
    }

    result = detect_reversal(data)

    assert result["level"] == "observar"

    print("PRUEBA 3: CORRECTA")


def test_stable_series():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.50, 0.50, 0.50, 0.50, 0.50],
        "precipitation_values": [500, 500, 500, 500, 500]
    }

    result = detect_reversal(data)

    assert result["level"] == "normal"
    assert result["reversal_detected"] is False

    print("PRUEBA 4: CORRECTA")


def test_insufficient_data():
    data = {
        "years": [2021, 2022, 2023],
        "ndvi_values": [0.60, 0.55, 0.50],
        "precipitation_values": [450, 470, 490]
    }

    result = detect_reversal(data)

    assert result["level"] == "sin datos"

    print("PRUEBA 5: CORRECTA")


if __name__ == "__main__":

    test_reversal_detected()
    test_no_reversal_both_increase()
    test_declining_ndvi_and_precipitation()
    test_stable_series()
    test_insufficient_data()

    print(
        "\nTODAS LAS PRUEBAS DE "
        "DECISION REVERSAL PASARON"
    )