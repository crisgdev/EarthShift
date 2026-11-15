
from pathlib import Path
import json
import pandas as pd

# ==================================================
# CONFIGURACION
# ==================================================

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "output" / "series_periodo_comun.csv"
OUTPUT = ROOT / "output"

OUTPUT.mkdir(exist_ok=True)

VARIABLES = [
    "precipitacion_mm",
    "humedad_suelo_kg_m2"
]

LIMITS = {
    "precipitacion_mm": {
        "min": 0,
        "max": None
    },
    "humedad_suelo_kg_m2": {
        "min": 0,
        "max": 100
    }
}

UMBRAL_ROBUSTO = 3.5


# ==================================================
# CARGA Y VALIDACION
# ==================================================

def cargar_datos():

    if not INPUT.exists():
        raise FileNotFoundError(
            f"No se encontro el archivo: {INPUT}"
        )

    df = pd.read_csv(INPUT)

    required = [
        "region_id",
        "date",
        *VARIABLES
    ]

    missing = [c for c in required if c not in df.columns]

    if missing:
        raise ValueError(f"Faltan columnas: {missing}")

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce"
    )

    for variable in VARIABLES:
        df[variable] = pd.to_numeric(
            df[variable],
            errors="coerce"
        )

    if df["date"].isna().any():
        raise ValueError("Existen fechas invalidas.")

    if df.duplicated(["region_id", "date"]).any():
        raise ValueError("Existen fechas duplicadas.")

    df = df.sort_values("date").reset_index(drop=True)

    return df


# ==================================================
# CONTROL DE RANGOS BASICOS
# ==================================================

def evaluar_calidad(df):

    resultados = []

    for variable in VARIABLES:

        limits = LIMITS[variable]

        for _, row in df.iterrows():

            value = row[variable]
            status = "VALIDO"
            reason = ""

            if pd.isna(value):
                status = "REVISAR"
                reason = "Valor nulo o no numerico"

            elif value < limits["min"]:
                status = "REVISAR"
                reason = "Valor inferior al limite configurado"

            elif (
                limits["max"] is not None
                and value > limits["max"]
            ):
                status = "REVISAR"
                reason = "Valor superior al limite configurado"

            resultados.append({
                "region_id": row["region_id"],
                "date": row["date"],
                "variable": variable,
                "value": value,
                "quality_status": status,
                "quality_reason": reason
            })

    return pd.DataFrame(resultados)


# ==================================================
# DETECCION IQR GLOBAL
# ==================================================

def detectar_atipicos_iqr(df):

    resultados = []

    for variable in VARIABLES:

        serie = df[variable].dropna()

        q1 = serie.quantile(0.25)
        q3 = serie.quantile(0.75)

        iqr = q3 - q1

        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr

        for _, row in df.iterrows():

            value = row[variable]

            if pd.isna(value):
                continue

            resultados.append({
                "region_id": row["region_id"],
                "date": row["date"],
                "variable": variable,
                "value": value,
                "outlier_iqr": bool(
                    value < lower or value > upper
                ),
                "lower_bound_iqr": lower,
                "upper_bound_iqr": upper
            })

    return pd.DataFrame(resultados)


# ==================================================
# DETECCION ESTACIONAL POR MES CALENDARIO
# ==================================================


def detectar_anomalias_estacionales(df):

    resultados = []

    datos = df.copy()
    datos["month"] = datos["date"].dt.month

    for variable in VARIABLES:

        for month in range(1, 13):

            subset = datos[
                datos["month"] == month
            ].copy()

            for index, row in subset.iterrows():

                value = row[variable]

                # Excluir el año que estamos evaluando
                referencia = subset[
                    subset["date"] != row["date"]
                ][variable].dropna()

                n = len(referencia)

                mediana = None
                mad = None
                score = None
                anomaly = None

                if pd.isna(value):

                    status = "DATO_FALTANTE"

                elif n < 10:

                    status = "REFERENCIA_INSUFICIENTE"

                else:

                    mediana = referencia.median()

                    mad = (
                        referencia - mediana
                    ).abs().median()

                    if mad > 0:

                        score = (
                            0.6745 * (value - mediana) / mad
                        )

                        anomaly = abs(score) > UMBRAL_ROBUSTO

                        status = (
                            "POSIBLE_ANOMALIA"
                            if anomaly
                            else "DENTRO_DEL_RANGO_ESTACIONAL"
                        )

                    else:

                        status = "MAD_CERO_REQUIERE_REVISION"

                resultados.append({
                    "region_id": row["region_id"],
                    "date": row["date"],
                    "variable": variable,
                    "month": month,
                    "value": value,
                    "seasonal_median": mediana,
                    "seasonal_mad": mad,
                    "robust_z_score": score,
                    "seasonal_outlier": anomaly,
                    "seasonal_status": status,
                    "reference_observations": n,
                    "reference_method": "leave_one_out_monthly_MAD",
                    "threshold": UMBRAL_ROBUSTO
                })

    return pd.DataFrame(resultados)



# ==================================================
# REPORTE GENERAL
# ==================================================

def generar_reporte(df, quality, iqr, seasonal):

    reporte = {
        "project": "EarthShift",
        "region": "Piura, Peru",
        "records": int(len(df)),
        "period_start": str(df["date"].min().date()),
        "period_end": str(df["date"].max().date()),
        "methods": {
            "global_outlier_detection": "IQR_1.5",
            "seasonal_detection": "monthly_median_MAD",
            "seasonal_threshold": UMBRAL_ROBUSTO
        },
        "variables": {}
    }

    for variable in VARIABLES:

        q = quality[
            quality["variable"] == variable
        ]

        i = iqr[
            iqr["variable"] == variable
        ]

        s = seasonal[
            seasonal["variable"] == variable
        ]

        reporte["variables"][variable] = {
            "valid_records": int(
                (q["quality_status"] == "VALIDO").sum()
            ),
            "records_to_review": int(
                (q["quality_status"] == "REVISAR").sum()
            ),
            "global_iqr_outliers": int(
                i["outlier_iqr"].sum()
            ),
            "seasonal_outliers": int(
                s["seasonal_outlier"].fillna(False).sum()
            ),
            "seasonal_not_evaluable": int(
                s["seasonal_status"].isin([
                    "MAD_CERO_REQUIERE_REVISION",
                    "DATO_FALTANTE"
                ]).sum()
            ),
            "mean": float(df[variable].mean()),
            "median": float(df[variable].median()),
            "standard_deviation": float(df[variable].std())
        }

    reporte["interpretation_warning"] = (
        "Los valores atipicos son indicadores para revision, "
        "no errores confirmados. No se eliminaron observaciones."
    )

    return reporte


# ==================================================
# EJECUCION
# ==================================================

def main():

    print("Iniciando control de calidad EarthShift...")

    df = cargar_datos()

    quality = evaluar_calidad(df)

    iqr = detectar_atipicos_iqr(df)

    seasonal = detectar_anomalias_estacionales(df)

    reporte = generar_reporte(
        df,
        quality,
        iqr,
        seasonal
    )

    quality.to_csv(
        OUTPUT / "quality_control.csv",
        index=False
    )

    iqr.to_csv(
        OUTPUT / "outliers.csv",
        index=False
    )

    seasonal.to_csv(
        OUTPUT / "seasonal_anomalies.csv",
        index=False
    )

    with open(
        OUTPUT / "quality_report.json",
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            reporte,
            file,
            indent=4,
            ensure_ascii=False
        )

    print("Control de calidad finalizado.")
    print("Registros procesados:", len(df))
    print("Archivos generados en:", OUTPUT)


if __name__ == "__main__":
    main()
