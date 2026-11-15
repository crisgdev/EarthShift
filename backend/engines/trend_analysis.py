
import json
import numpy as np
import pandas as pd
from scipy.stats import linregress


def analyze_trend(years, values, variable, unit):
    """
    Analisis preliminar de tendencias.
    Requiere datos anuales comparables.
    No corrige autocorrelacion ni pruebas multiples.
    """

    df = pd.DataFrame({
        "year": years,
        "value": values
    })

    df["year"] = pd.to_numeric(
        df["year"], errors="coerce"
    )
    df["value"] = pd.to_numeric(
        df["value"], errors="coerce"
    )

    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna().sort_values("year")

    # Exigir al menos cuatro observaciones
    # y fechas diferentes
    if len(df) < 4 or df["year"].nunique() != len(df):
        return {
            "variable": variable,
            "status": "sin datos",
            "explanation": "Observaciones insuficientes o fechas repetidas."
        }

    result = linregress(
        df["year"].to_numpy(),
        df["value"].to_numpy()
    )

    slope = float(result.slope)
    p_value = float(result.pvalue)

    if slope < 0:
        direction = "decreciente"
    elif slope > 0:
        direction = "creciente"
    else:
        direction = "estable"

    return {
        "variable": variable,
        "status": "calculado",
        "trend": round(slope, 6),
        "trend_unit": f"{unit}/año",
        "direction": direction,
        "p_value": round(p_value, 6),
        "r_squared": round(float(result.rvalue ** 2), 6),
        "observations": len(df),
        "method": "regresion_lineal",
        "demo": True,
        "limitations": [
            "Datos anuales simulados.",
            "No se ha evaluado autocorrelacion.",
            "No se ha corregido por pruebas multiples.",
            "No demuestra causalidad."
        ]
    }


if __name__ == "__main__":
    from scientific_data import get_scientific_data

    df = get_scientific_data()

    ndvi_result = analyze_trend(
        df["year"].tolist(),
        df["ndvi"].tolist(),
        "ndvi",
        "NDVI"
    )

    precipitation_result = analyze_trend(
        df["year"].tolist(),
        df["precipitation_mm"].tolist(),
        "precipitation",
        "mm"
    )

    print("\nEARTHSHIFT - ANALISIS ESTADISTICO DEMO")

    print(json.dumps(
        [ndvi_result, precipitation_result],
        indent=4,
        ensure_ascii=False
    ))
