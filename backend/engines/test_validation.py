
from validation import validate_payload


def example():
    return {
        "cell_id": "piura-test",
        "period": "2021-2025",
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": [0.62, 0.59, 0.55, 0.52, 0.48],
        "precipitation_values": [450, 480, 510, 530, 550],
        "quality": {}
    }


def must_fail(data):
    try:
        validate_payload(data)
    except ValueError:
        return

    raise AssertionError(
        "Se aceptaron datos incorrectos."
    )


data = example()
assert validate_payload(data)
print("PRUEBA 1: Datos correctos")


data = example()
data["years"][1] = 2021
must_fail(data)
print("PRUEBA 2: Años repetidos")


data = example()
data["ndvi_values"][0] = 1.5
must_fail(data)
print("PRUEBA 3: NDVI fuera de rango")


data = example()
data["precipitation_values"][2] = -20
must_fail(data)
print("PRUEBA 4: Precipitacion negativa")


data = example()
data["ndvi_values"].pop()
must_fail(data)
print("PRUEBA 5: Longitudes diferentes")


data = example()
data["ndvi_values"][0] = None
must_fail(data)
print("PRUEBA 6: Valor faltante")


print("\nTODAS LAS PRUEBAS DE VALIDACION PASARON")
