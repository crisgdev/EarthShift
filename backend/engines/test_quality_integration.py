
from alerts import generate_findings
from scientific_data import get_scientific_data


df = get_scientific_data()

data = {
    "cell_id": "piura-test",
    "period": "2021-2025",
    "years": df["year"].tolist(),
    "ndvi_values": df["ndvi"].tolist(),
    "precipitation_values":
        df["precipitation_mm"].tolist(),
    "quality": {
        "variables": {
            "ndvi": {"valid_fraction": 0.90},
            "precipitation": {"valid_fraction": 0.75}
        }
    }
}

results = generate_findings(data)

assert results[0]["level"] == "sin datos"
assert results[1]["level"] == "investigar"
assert results[2]["level"] == "sin datos"

print("PRUEBA 1: CORRECTA")


# Ambas variables con cobertura suficiente
data["quality"]["variables"]["precipitation"][
    "valid_fraction"
] = 0.95

results = generate_findings(data)

assert all(
    result["level"] == "investigar"
    for result in results
)

print("PRUEBA 2: CORRECTA")


# NDVI sin cobertura suficiente
data["quality"]["variables"]["ndvi"][
    "valid_fraction"
] = 0.30

results = generate_findings(data)

assert all(
    result["level"] == "sin datos"
    for result in results
)

print("PRUEBA 3: CORRECTA")

print("\nTODAS LAS PRUEBAS DE CALIDAD PASARON")
