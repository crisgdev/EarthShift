
import json
import math


def analyze_anomaly_accumulation(
    years,
    ndvi_values,
    reference_ndvi
):
    """
    Calcula anomalias de NDVI respecto
    a una referencia proporcionada.

    Version DEMO.
    """

    # 1. Validar los datos
    if not isinstance(years, (list, tuple)):
        raise ValueError("Los años deben estar en una lista.")

    if not isinstance(ndvi_values, (list, tuple)):
        raise ValueError("Los valores NDVI deben estar en una lista.")

    if len(years) != len(ndvi_values):
        raise ValueError("Las listas deben tener igual longitud.")

    if len(years) < 4:
        return {
            "status": "sin datos",
            "explanation": "Observaciones insuficientes.",
            "demo": True
        }

    if (
        isinstance(reference_ndvi, bool)
        or not isinstance(reference_ndvi, (int, float))
        or not math.isfinite(reference_ndvi)
        or not -1 <= reference_ndvi <= 1
    ):
        raise ValueError("Referencia NDVI invalida.")

    for year in years:
        if isinstance(year, bool) or not isinstance(year, int):
            raise ValueError("Año invalido.")

    if any(
        years[i] <= years[i - 1]
        for i in range(1, len(years))
    ):
        raise ValueError("Los años deben estar ordenados.")

    for value in ndvi_values:
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or not -1 <= value <= 1
        ):
            raise ValueError("Valor NDVI invalido.")

    # 2. Calcular anomalias
    anomalies = []
    negative_count = 0
    cumulative_deficit = 0.0
    consecutive = 0
    max_consecutive = 0

    for year, ndvi in zip(years, ndvi_values):

        anomaly = ndvi - reference_ndvi

        if anomaly < 0:
            negative_count += 1
            cumulative_deficit += abs(anomaly)
            consecutive += 1
            max_consecutive = max(
                max_consecutive,
                consecutive
            )
        else:
            consecutive = 0

        anomalies.append({
            "year": year,
            "ndvi": ndvi,
            "anomaly": round(anomaly, 6),
            "negative_anomaly": anomaly < 0
        })

    # 3. Resultado
    return {
        "status": "calculado",
        "reference_ndvi": reference_ndvi,
        "reference_type": "demo_fixed_reference",
        "total_observations": len(ndvi_values),
        "negative_anomalies": negative_count,
        "negative_fraction": round(
            negative_count / len(ndvi_values), 4
        ),
        "cumulative_negative_deficit": round(
            cumulative_deficit, 6
        ),
        "max_consecutive_negative_anomalies": max_consecutive,
        "anomalies": anomalies,
        "method": "negative_anomaly_accumulation",
        "demo": True,
        "limitations": [
            "Referencia fija simulada.",
            "No utiliza climatologia historica real.",
            "No considera estacionalidad.",
            "La suma depende del numero de observaciones.",
            "No demuestra deterioro ambiental.",
            "No demuestra causalidad."
        ]
    }


if __name__ == "__main__":

    years = [2021, 2022, 2023, 2024, 2025]

    scenarios = {
        "Disminucion continua": [
            0.62, 0.59, 0.55, 0.52, 0.48
        ],
        "Aumento continuo": [
            0.40, 0.45, 0.50, 0.55, 0.60
        ],
        "Serie estable": [
            0.60, 0.60, 0.60, 0.60, 0.60
        ],
        "Serie variable": [
            0.60, 0.55, 0.58, 0.53, 0.56
        ]
    }

    reference = 0.60

    for name, values in scenarios.items():

        result = analyze_anomaly_accumulation(
            years,
            values,
            reference
        )

        print("\nESCENARIO:", name)

        print(json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        ))

    print("\nANALISIS DE ANOMALIAS FINALIZADO")
