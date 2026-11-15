
from alerts import generate_findings
from scientific_data import get_scientific_data


df = get_scientific_data()

data = {
    "cell_id": "piura-001",
    "period": "2021-2025",
    "years": df["year"].tolist(),
    "ndvi_values": df["ndvi"].tolist(),
    "precipitation_values":
        df["precipitation_mm"].tolist(),
    "quality": {
        "status": "demo",
        "valid_fraction": 0.88
    }
}

# Prueba con cobertura suficiente
results = generate_findings(data)

assert len(results) == 3
assert all(
    item["level"] == "investigar"
    for item in results
)

print("PRUEBA 1: CORRECTA")

# Prueba con cobertura insuficiente
data["quality"]["valid_fraction"] = 0.40

results = generate_findings(data)

assert all(
    item["level"] == "sin datos"
    for item in results
)

print("PRUEBA 2: CORRECTA")

# Prueba sin informacion de cobertura
data["quality"] = {}

results = generate_findings(data)

assert all(
    item["level"] == "sin datos"
    for item in results
)

print("PRUEBA 3: CORRECTA")

print("\nTODAS LAS PRUEBAS DE ALERTAS PASARON")
