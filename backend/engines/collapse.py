import json

from trend_analysis import analyze_trend
from persistence import analyze_persistence
from cumulative_change import analyze_cumulative_change
from temporal_windows import analyze_temporal_windows
from anomaly_accumulation import analyze_anomaly_accumulation


def detect_collapse(data):
    """
    EarthShift - Silent Collapse.

    Analisis DEMO basado en:
    1. Tendencia estadistica.
    2. Persistencia temporal.
    3. Cambio entre extremos.
    4. Ventanas temporales.
    5. Acumulacion de anomalias.

    Las anomalias se usan como evidencia complementaria
    y no determinan por si solas la clasificacion.
    """

    years = data.get("years")
    ndvi_values = data.get("ndvi_values")

    # Referencia DEMO.
    # Mas adelante debera venir de una climatologia
    # o linea base historica apropiada.
    ndvi_reference = data.get(
        "ndvi_reference",
        0.60
    )

    # 1. Verificar datos basicos
    if (
        not isinstance(years, (list, tuple))
        or not isinstance(ndvi_values, (list, tuple))
        or len(years) < 4
        or len(years) != len(ndvi_values)
    ):
        return {
            "level": "sin datos",
            "explanation": (
                "No hay suficientes observaciones "
                "para analizar Silent Collapse."
            ),
            "evidence": {},
            "limitations": [
                "Datos insuficientes o incompatibles."
            ]
        }

    # 2. Tendencia
    trend = analyze_trend(
        years,
        ndvi_values,
        "ndvi",
        "NDVI"
    )

    # 3. Persistencia
    persistence = analyze_persistence(
        ndvi_values
    )

    # 4. Cambio entre extremos
    cumulative = analyze_cumulative_change(
        ndvi_values
    )

    # 5. Ventanas temporales
    temporal = analyze_temporal_windows(
        years,
        ndvi_values,
        window_size=3
    )

    # 6. Anomalias
    anomalies = analyze_anomaly_accumulation(
        years,
        ndvi_values,
        ndvi_reference
    )

    # 7. Comprobar que todos los analisis
    # pudieron ejecutarse
    analyses = [
        trend,
        persistence,
        cumulative,
        temporal,
        anomalies
    ]

    if any(
        result.get("status") != "calculado"
        for result in analyses
    ):
        return {
            "level": "sin datos",
            "explanation": (
                "No fue posible completar "
                "todos los analisis de Silent Collapse."
            ),
            "evidence": {
                "trend_analysis": trend,
                "persistence_analysis": persistence,
                "cumulative_change": cumulative,
                "temporal_windows": temporal,
                "anomaly_accumulation": anomalies
            },
            "limitations": [
                "Uno o mas analisis no estan disponibles."
            ]
        }

    # 8. Extraer indicadores principales
    slope = trend["trend"]
    p_value = trend["p_value"]

    persistent_decline = persistence[
        "persistent_decline"
    ]

    negative_change = (
        cumulative["absolute_change"] < 0
    )

    all_windows_decreasing = temporal[
        "all_windows_decreasing"
    ]

    # Las anomalias se guardan como evidencia,
    # pero NO son una condicion obligatoria
    # para clasificar como investigar.
    negative_anomaly_fraction = anomalies[
        "negative_fraction"
    ]

    cumulative_deficit = anomalies[
        "cumulative_negative_deficit"
    ]

    # 9. Clasificacion preliminar
    if (
        slope < 0
        and p_value < 0.05
        and persistent_decline
        and negative_change
        and all_windows_decreasing
    ):
        level = "investigar"

        explanation = (
            "Se detecto una tendencia negativa del NDVI "
            "con significancia estadistica preliminar, "
            "disminuciones persistentes, cambio total "
            "negativo y ventanas temporales decrecientes. "
            "Tambien se reportan anomalias respecto a una "
            "referencia DEMO como evidencia complementaria."
        )

    elif slope < 0:
        level = "observar"

        explanation = (
            "Se detecto una tendencia negativa del NDVI, "
            "pero no se cumplen todos los criterios "
            "preliminares de Silent Collapse."
        )

    else:
        level = "normal"

        explanation = (
            "No se detecto una tendencia negativa "
            "del NDVI con las reglas actuales. "
            "Esto no garantiza ausencia de problemas ambientales."
        )

    # 10. Evidencia completa
    evidence = {
        "trend_analysis": trend,
        "persistence_analysis": persistence,
        "cumulative_change": cumulative,
        "temporal_windows": temporal,
        "anomaly_accumulation": anomalies,

        "summary": {
            "initial_ndvi": cumulative["initial_ndvi"],
            "final_ndvi": cumulative["final_ndvi"],
            "total_change": cumulative["absolute_change"],
            "persistent_decline": persistent_decline,
            "decreasing_windows": temporal[
                "decreasing_windows"
            ],
            "total_windows": temporal[
                "total_windows"
            ],
            "negative_anomaly_fraction":
                negative_anomaly_fraction,
            "cumulative_negative_deficit":
                cumulative_deficit
        }
    }

    # 11. Resultado final
    return {
        "level": level,
        "explanation": explanation,
        "evidence": evidence,
        "limitations": [
            "Los datos utilizados son simulados.",
            "Las reglas y umbrales son provisionales.",
            "La referencia NDVI 0.60 es DEMO.",
            "La referencia no proviene de climatologia historica real.",
            "Una anomalia negativa no implica por si sola deterioro.",
            "Las ventanas temporales se superponen.",
            "Las ventanas no son observaciones independientes.",
            "No se ha evaluado estacionalidad.",
            "No se ha evaluado autocorrelacion.",
            "No se han corregido pruebas multiples.",
            "La clasificacion normal no garantiza salud ambiental.",
            "No demuestra causalidad.",
            "No predice desastres."
        ]
    }


if __name__ == "__main__":
    from scientific_data import get_scientific_data

    df = get_scientific_data()

    data = {
        "years": df["year"].tolist(),
        "ndvi_values": df["ndvi"].tolist(),

        # Referencia solamente para la demostracion.
        "ndvi_reference": 0.60
    }

    result = detect_collapse(data)

    print("\nEARTHSHIFT - SILENT COLLAPSE")

    print(
        json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        )
    )

    print("\nANALISIS FINALIZADO")