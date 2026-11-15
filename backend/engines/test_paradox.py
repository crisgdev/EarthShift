from paradox import detect_paradox


def test_paradox_detected():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.62, 0.59, 0.55, 0.52, 0.48],
        "precipitation_values": [450, 480, 510, 530, 550]
    }

    result = detect_paradox(data)

    assert result["level"] == "investigar"
    assert len(result["counterevidence"]) > 0

    print("PRUEBA 1: CORRECTA")


def test_both_increase():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.40, 0.45, 0.50, 0.55, 0.60],
        "precipitation_values": [400, 420, 440, 460, 480]
    }

    result = detect_paradox(data)

    assert result["level"] == "normal"

    print("PRUEBA 2: CORRECTA")


def test_both_decrease():
    data = {
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.62, 0.59, 0.55, 0.52, 0.48],
        "precipitation_values": [550, 520, 500, 470, 440]
    }

    result = detect_paradox(data)

    assert result["level"] == "normal"

    print("PRUEBA 3: CORRECTA")


def test_insufficient_data():
    data = {
        "years": [2021, 2022, 2023],
        "ndvi_values": [0.60, 0.55, 0.50],
        "precipitation_values": [450, 470, 490]
    }

    result = detect_paradox(data)

    assert result["level"] == "sin datos"

    print("PRUEBA 4: CORRECTA")


if __name__ == "__main__":
    test_paradox_detected()
    test_both_increase()
    test_both_decrease()
    test_insufficient_data()

    print(
        "\nTODAS LAS PRUEBAS DE "
        "EARTH PARADOX PASARON"
    )