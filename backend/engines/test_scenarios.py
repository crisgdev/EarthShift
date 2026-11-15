
from alerts import generate_findings


def build_data(ndvi, precipitation, coverage=0.90):
    return {
        "cell_id": "piura-test",
        "period": "2021-2025",
        "years": [2021, 2022, 2023, 2024, 2025],
        "ndvi_values": ndvi,
        "precipitation_values": precipitation,
        "quality": {
            "status": "demo",
            "valid_fraction": coverage
        }
    }


# CASO 1: Divergencia ambiental
data = build_data(
    [0.62, 0.59, 0.55, 0.52, 0.48],
    [450, 480, 510, 530, 550]
)

results = generate_findings(data)

assert results[0]["level"] == "investigar"
assert results[1]["level"] == "investigar"
assert results[2]["reversal_detected"] is True

print("CASO 1: CORRECTO")


# CASO 2: Vegetacion creciente
data = build_data(
    [0.40, 0.43, 0.46, 0.49, 0.52],
    [450, 480, 510, 530, 550]
)

results = generate_findings(data)

assert results[0]["level"] == "normal"
assert results[1]["level"] == "observar"
assert results[2]["reversal_detected"] is False

print("CASO 2: CORRECTO")


# CASO 3: Cobertura insuficiente
data = build_data(
    [0.62, 0.59, 0.55, 0.52, 0.48],
    [450, 480, 510, 530, 550],
    coverage=0.30
)

results = generate_findings(data)

assert all(
    result["level"] == "sin datos"
    for result in results
)

print("CASO 3: CORRECTO")


# CASO 4: Serie demasiado corta
data = build_data(
    [0.62, 0.59],
    [450, 480]
)

data["years"] = [2021, 2022]

results = generate_findings(data)

assert all(
    result["level"] == "sin datos"
    for result in results
)

print("CASO 4: CORRECTO")


print("\nTODOS LOS ESCENARIOS PASARON")
