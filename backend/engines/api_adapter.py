
import json

from alerts import generate_findings
from validation import validate_payload


def analyze_cell(payload):
    """
    Punto de entrada para el backend EarthShift.

    Recibe datos ambientales procesados
    y devuelve hallazgos en formato JSON.
    """

    if not isinstance(payload, dict):
        raise ValueError(
            "La entrada debe ser un objeto JSON."
        )

    required_fields = [
        "cell_id",
        "period",
        "years",
        "ndvi_values",
        "precipitation_values",
        "quality"
    ]

    missing = [
        field for field in required_fields
        if field not in payload
    ]

    if missing:
        raise ValueError(
            "Faltan campos obligatorios: "
            + ", ".join(missing)
        )

    validate_payload(payload)
    findings = generate_findings(payload)

    return {
        "cell_id": payload["cell_id"],
        "period": payload["period"],
        "total_findings": len(findings),
        "findings": findings,
        "demo": True
    }


if __name__ == "__main__":
    from scientific_data import get_scientific_data

    df = get_scientific_data()

    example = {
        "cell_id": "piura-001",
        "period": "2021-2025",
        "years": df["year"].tolist(),
        "ndvi_values": df["ndvi"].tolist(),
        "precipitation_values":
            df["precipitation_mm"].tolist(),
        "quality": {
            "variables": {
                "ndvi": {
                    "valid_fraction": 0.90
                },
                "precipitation": {
                    "valid_fraction": 0.95
                }
            }
        }
    }

    response = analyze_cell(example)

    print("\nEARTHSHIFT - RESPUESTA PARA BACKEND")

    print(json.dumps(
        response,
        indent=4,
        ensure_ascii=False
    ))
