
import json
from scientific_data import get_scientific_data
from alerts import generate_findings


def run_integration():
    df = get_scientific_data()

    # Verificar que existan los datos necesarios
    required = [
        "year", "ndvi",
        "precipitation_mm", "valid_fraction"
    ]

    if df.empty or df[required].isna().any().any():
        print("Datos incompletos.")
        return

    # Cambios porcentuales entre extremos
    first = df.iloc[0]
    last = df.iloc[-1]

    ndvi_change = (
        (last["ndvi"] - first["ndvi"])
        / first["ndvi"] * 100
    )

    precipitation_change = (
        (last["precipitation_mm"]
         - first["precipitation_mm"])
        / first["precipitation_mm"] * 100
    )

    # Clasificaciones ilustrativas.
    # No son inferencias cientificas.
    data = {
        "cell_id": "piura-001",
        "period": "2021-2025",
        "ndvi_change": float(ndvi_change),
        "precipitation_change": float(
            precipitation_change
        ),
        "ndvi_values": df["ndvi"].tolist(),
        "single_variable_level": "normal",
        "multivariable_level": "investigar",
        "quality": {
            "status": "demo",
            "valid_fraction": float(
                df["valid_fraction"].min()
            )
        }
    }

    findings = generate_findings(data)

    print("\nEARTHSHIFT - INTEGRACION DEMO")
    print(json.dumps(
        findings, indent=4, ensure_ascii=False
    ))


if __name__ == "__main__":
    run_integration()
