import json

from trend_analysis import analyze_trend


def detect_paradox(data):
    """
    EarthShift - Earth Paradox.

    Detecta divergencia preliminar entre:
    - NDVI
    - precipitacion

    Regla DEMO principal:
    NDVI disminuye mientras precipitacion aumenta.

    Incluye evidencia y contraevidencia.
    """

    years = data.get("years")
    ndvi_values = data.get("ndvi_values")
    precipitation_values = data.get("precipitation_values")

    # 1. Validar datos
    if (
        not isinstance(years, (list, tuple))
        or not isinstance(ndvi_values, (list, tuple))
        or not isinstance(precipitation_values, (list, tuple))
        or len(years) < 4
        or len(years) != len(ndvi_values)
        or len(years) != len(precipitation_values)
    ):
        return {
            "level": "sin datos",
            "explanation": (
                "No hay suficientes datos para "
                "analizar Earth Paradox."
            ),
            "evidence": {},
            "counterevidence": [],
            "limitations": [
                "Datos insuficientes o incompatibles."
            ]
        }

    # 2. Analizar tendencias
    ndvi_trend = analyze_trend(
        years,
        ndvi_values,
        "ndvi",
        "NDVI"
    )

    precipitation_trend = analyze_trend(
        years,
        precipitation_values,
        "precipitation",
        "mm"
    )

    # 3. Verificar analisis
    if (
        ndvi_trend.get("status") != "calculado"
        or precipitation_trend.get("status") != "calculado"
    ):
        return {
            "level": "sin datos",
            "explanation": (
                "No fue posible calcular "
                "las tendencias requeridas."
            ),
            "evidence": {
                "ndvi_trend": ndvi_trend,
                "precipitation_trend": precipitation_trend
            },
            "counterevidence": [],
            "limitations": [
                "Analisis estadistico incompleto."
            ]
        }

    ndvi_slope = ndvi_trend["trend"]
    precipitation_slope = precipitation_trend["trend"]

    # 4. Evidencia a favor
    evidence_for = []

    if ndvi_slope < 0:
        evidence_for.append(
            "El NDVI presenta tendencia decreciente."
        )

    if precipitation_slope > 0:
        evidence_for.append(
            "La precipitacion presenta tendencia creciente."
        )

    # 5. Contraevidencia
    counterevidence = []

    if ndvi_trend["p_value"] >= 0.05:
        counterevidence.append(
            "La tendencia del NDVI no alcanza "
            "significancia estadistica preliminar."
        )

    if precipitation_trend["p_value"] >= 0.05:
        counterevidence.append(
            "La tendencia de precipitacion no alcanza "
            "significancia estadistica preliminar."
        )

    if len(years) < 10:
        counterevidence.append(
            "La serie temporal es corta para "
            "establecer una conclusion robusta."
        )

    counterevidence.extend([
        "No se ha evaluado estacionalidad.",
        "No se ha evaluado autocorrelacion.",
        "La divergencia no demuestra causalidad.",
        "Pueden existir variables ambientales no incluidas."
    ])

    # 6. Clasificacion
    if (
        ndvi_slope < 0
        and precipitation_slope > 0
        and ndvi_trend["p_value"] < 0.05
        and precipitation_trend["p_value"] < 0.05
    ):
        level = "investigar"

        explanation = (
            "Se detecto una divergencia preliminar: "
            "el NDVI disminuye mientras la precipitacion "
            "aumenta. La relacion debe investigarse "
            "con variables adicionales."
        )

    elif (
        ndvi_slope < 0
        and precipitation_slope > 0
    ):
        level = "observar"

        explanation = (
            "Existe una divergencia entre NDVI "
            "y precipitacion, pero no cumple todos "
            "los criterios estadisticos preliminares."
        )

    else:
        level = "normal"

        explanation = (
            "No se detecto la divergencia definida "
            "por Earth Paradox con las reglas actuales."
        )

    # 7. Evidencia numerica
    evidence = {
        "ndvi_trend": ndvi_trend,
        "precipitation_trend": precipitation_trend,
        "supporting_evidence": evidence_for,
        "ndvi_initial": ndvi_values[0],
        "ndvi_final": ndvi_values[-1],
        "precipitation_initial": precipitation_values[0],
        "precipitation_final": precipitation_values[-1]
    }

    # 8. Resultado
    return {
        "level": level,
        "explanation": explanation,
        "evidence": evidence,
        "counterevidence": counterevidence,
        "limitations": [
            "Los datos utilizados son simulados.",
            "Las reglas son preliminares.",
            "La divergencia entre variables no demuestra causalidad.",
            "No se ha evaluado estacionalidad.",
            "No se ha evaluado autocorrelacion.",
            "No se han corregido pruebas multiples.",
            "No se consideran variables ambientales adicionales.",
            "La clasificacion normal no garantiza ausencia de problemas."
        ]
    }


if __name__ == "__main__":
    from scientific_data import get_scientific_data

    df = get_scientific_data()

    data = {
        "years": df["year"].tolist(),
        "ndvi_values": df["ndvi"].tolist(),
        "precipitation_values":
            df["precipitation_mm"].tolist()
    }

    result = detect_paradox(data)

    print("\nEARTHSHIFT - EARTH PARADOX")

    print(
        json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        )
    )

    print("\nANALISIS FINALIZADO")