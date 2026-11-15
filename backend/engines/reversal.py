import json

from trend_analysis import analyze_trend


def detect_reversal(data):
    """
    EarthShift - Decision Reversal.

    Compara una decision basada solamente en
    precipitacion con una decision basada en
    precipitacion + NDVI.

    Version DEMO.
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
                "analizar Decision Reversal."
            ),
            "evidence": {},
            "counterevidence": [],
            "reversal_detected": False,
            "limitations": [
                "Datos insuficientes o incompatibles."
            ]
        }

    # 2. Calcular tendencias
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

    if (
        ndvi_trend.get("status") != "calculado"
        or precipitation_trend.get("status") != "calculado"
    ):
        return {
            "level": "sin datos",
            "explanation": (
                "No fue posible calcular "
                "las tendencias necesarias."
            ),
            "evidence": {
                "ndvi_trend": ndvi_trend,
                "precipitation_trend": precipitation_trend
            },
            "counterevidence": [],
            "reversal_detected": False,
            "limitations": [
                "Analisis estadistico incompleto."
            ]
        }

    ndvi_slope = ndvi_trend["trend"]
    precip_slope = precipitation_trend["trend"]

    # 3. Decision univariable:
    # solo se observa precipitacion
    if precip_slope > 0:
        univariable_level = "normal"
        univariable_reason = (
            "La precipitacion presenta una tendencia creciente."
        )

    elif precip_slope < 0:
        univariable_level = "observar"
        univariable_reason = (
            "La precipitacion presenta una tendencia decreciente."
        )

    else:
        univariable_level = "normal"
        univariable_reason = (
            "La precipitacion no presenta una tendencia definida."
        )

    # 4. Decision multivariable:
    # se incorporan precipitacion + NDVI
    if (
        precip_slope > 0
        and ndvi_slope < 0
        and ndvi_trend["p_value"] < 0.05
        and precipitation_trend["p_value"] < 0.05
    ):
        multivariable_level = "investigar"

        multivariable_reason = (
            "Aunque la precipitacion aumenta, "
            "el NDVI presenta una tendencia decreciente "
            "estadisticamente significativa bajo "
            "el modelo preliminar."
        )

    elif ndvi_slope < 0:
        multivariable_level = "observar"

        multivariable_reason = (
            "Al incorporar NDVI aparece una tendencia "
            "negativa que requiere observacion."
        )

    else:
        multivariable_level = univariable_level

        multivariable_reason = (
            "La incorporacion del NDVI no modifica "
            "la clasificacion preliminar."
        )

    # 5. Detectar cambio de decision
    reversal_detected = (
        univariable_level != multivariable_level
    )

    # 6. Nivel final
    level = multivariable_level

    if reversal_detected:
        explanation = (
            f"La clasificacion cambio de "
            f"{univariable_level} a "
            f"{multivariable_level} al incorporar NDVI."
        )
    else:
        explanation = (
            "La clasificacion no cambio al incorporar "
            "la segunda variable."
        )

    # 7. Contraevidencia
    counterevidence = []

    if len(years) < 10:
        counterevidence.append(
            "La serie temporal es corta."
        )

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

    counterevidence.extend([
        "Solo se comparan dos variables.",
        "No se ha evaluado estacionalidad.",
        "No se ha evaluado autocorrelacion.",
        "Un cambio de clasificacion no demuestra causalidad."
    ])

    # 8. Evidencia
    evidence = {
        "univariable": {
            "level": univariable_level,
            "reason": univariable_reason,
            "variable": "precipitation"
        },
        "multivariable": {
            "level": multivariable_level,
            "reason": multivariable_reason,
            "variables": [
                "precipitation",
                "ndvi"
            ]
        },
        "ndvi_trend": ndvi_trend,
        "precipitation_trend": precipitation_trend,
        "reversal_detected": reversal_detected
    }

    return {
        "level": level,
        "explanation": explanation,
        "reversal_detected": reversal_detected,
        "univariable_level": univariable_level,
        "multivariable_level": multivariable_level,
        "evidence": evidence,
        "counterevidence": counterevidence,
        "limitations": [
            "Los datos utilizados son simulados.",
            "Las reglas son preliminares.",
            "El modelo univariable es simplificado.",
            "El modelo multivariable solo usa dos variables.",
            "No se ha evaluado estacionalidad.",
            "No se ha evaluado autocorrelacion.",
            "No se han corregido pruebas multiples.",
            "El cambio de clasificacion no demuestra causalidad.",
            "No constituye una recomendacion operativa real."
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

    result = detect_reversal(data)

    print("\nEARTHSHIFT - DECISION REVERSAL")

    print(
        json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        )
    )

    print("\nANALISIS FINALIZADO")