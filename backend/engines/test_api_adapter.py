
import json

from api_adapter import analyze_cell
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
        "variables": {
            "ndvi": {"valid_fraction": 0.90},
            "precipitation": {"valid_fraction": 0.95}
        }
    }
}

# PRUEBA 1: Respuesta completa
response = analyze_cell(data)

assert response["total_findings"] == 3
assert len(response["findings"]) == 3
assert response["cell_id"] == "piura-001"

print("PRUEBA 1: CORRECTA")


# PRUEBA 2: JSON valido
json_text = json.dumps(
    response,
    ensure_ascii=False,
    allow_nan=False
)

parsed = json.loads(json_text)

assert parsed["total_findings"] == 3

print("PRUEBA 2: CORRECTA")


# PRUEBA 3: Campo obligatorio faltante
incomplete = data.copy()
incomplete.pop("cell_id")

try:
    analyze_cell(incomplete)
    raise AssertionError(
        "No se detecto el campo faltante."
    )
except ValueError:
    print("PRUEBA 3: CORRECTA")


# PRUEBA 4: Entrada incorrecta
try:
    analyze_cell("datos incorrectos")
    raise AssertionError(
        "No se rechazo la entrada incorrecta."
    )
except ValueError:
    print("PRUEBA 4: CORRECTA")


# PRUEBA 5: Cobertura insuficiente
low_quality = {
    **data,
    "quality": {
        "variables": {
            "ndvi": {"valid_fraction": 0.90},
            "precipitation": {"valid_fraction": 0.30}
        }
    }
}

response = analyze_cell(low_quality)

assert response["findings"][0]["level"] == "sin datos"
assert response["findings"][1]["level"] == "investigar"
assert response["findings"][2]["level"] == "sin datos"

print("PRUEBA 5: CORRECTA")

print("\nTODAS LAS PRUEBAS DEL ADAPTADOR PASARON")
