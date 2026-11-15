from pathlib import Path
import pandas as pd
import numpy as np
import json
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = DATA / "processed"
OUT.mkdir(parents=True, exist_ok=True)

INICIO = "2000-03-01"
FIN = "2025-09-01"

estadisticas = []
anomalias = []
correlaciones = []
calidad = {}

def analizar_serie(df, region, variable, nivel, escenario=""):
    x = df[["fecha", variable]].copy()
    x["fecha"] = pd.to_datetime(x["fecha"])
    x[variable] = pd.to_numeric(x[variable], errors="coerce")
    x = x.dropna().sort_values("fecha")

    if len(x) < 24:
        return

    valores = x[variable].to_numpy(dtype=float)
    fechas = x["fecha"]

    # Tendencia lineal descriptiva
    tiempo = (fechas - fechas.min()).dt.days.to_numpy() / 365.25
    pendiente = stats.linregress(tiempo, valores)

    # Tendencia robusta de Sen
    sen = stats.theilslopes(valores, tiempo)

    tau, p_kendall = stats.kendalltau(tiempo, valores)

    estadisticas.append({
        "nivel": nivel,
        "region_id": region,
        "variable": variable,
        "escenario": escenario,
        "n": len(valores),
        "media": np.mean(valores),
        "mediana": np.median(valores),
        "desviacion_std": np.std(valores, ddof=1),
        "minimo": np.min(valores),
        "maximo": np.max(valores),
        "pendiente_lineal_por_anio": pendiente.slope,
        "r2_lineal": pendiente.rvalue ** 2,
        "pendiente_sen_por_anio": sen.slope,
        "kendall_tau": tau,
        "p_kendall": p_kendall
    })

    # Anomalías respecto a la climatología de cada mes calendario
    x["mes"] = x["fecha"].dt.month
    climatologia = x.groupby("mes")[variable].agg(["mean", "std"])
    x["media_mes"] = x["mes"].map(climatologia["mean"])
    x["std_mes"] = x["mes"].map(climatologia["std"])
    x["anomalia"] = x[variable] - x["media_mes"]
    x["anomalia_z"] = (
        x["anomalia"] / x["std_mes"].replace(0, np.nan)
    )

    for _, fila in x.iterrows():
        anomalias.append({
            "nivel": nivel,
            "region_id": region,
            "fecha": fila["fecha"].strftime("%Y-%m-%d"),
            "variable": variable,
            "valor": fila[variable],
            "anomalia": fila["anomalia"],
            "anomalia_z": fila["anomalia_z"],
            "escenario": escenario
        })

def correlacionar(df, region, nivel, variables, escenario=""):
    disponibles = [v for v in variables if v in df.columns]

    for i, v1 in enumerate(disponibles):
        for v2 in disponibles[i+1:]:
            pares = df[[v1, v2]].apply(
                pd.to_numeric, errors="coerce"
            ).dropna()

            if len(pares) < 24:
                continue

            r, p = stats.spearmanr(pares[v1], pares[v2])

            correlaciones.append({
                "nivel": nivel,
                "region_id": region,
                "variable_1": v1,
                "variable_2": v2,
                "n_pares": len(pares),
                "spearman_rho": r,
                "p_valor_exploratorio": p,
                "escenario": escenario
            })

# A. Piura general: GPM y GLDAS
general = pd.read_csv(OUT / "earthshift_general_mensual.csv")
general["fecha"] = pd.to_datetime(general["fecha"])
general = general[
    (general["fecha"] >= INICIO) &
    (general["fecha"] <= FIN)
]

for variable in ["precipitacion_mm", "humedad_suelo"]:
    analizar_serie(
        general, "piura_general_01", variable, "general"
    )

correlacionar(
    general, "piura_general_01", "general",
    ["precipitacion_mm", "humedad_suelo"]
)

calidad["general"] = {
    "filas": len(general),
    "variables": {}
}

for v in ["precipitacion_mm", "humedad_suelo"]:
    calidad["general"]["variables"][v] = {
        "disponibles": int(general[v].notna().sum()),
        "faltantes": int(general[v].isna().sum())
    }

# B. MODIS por zona y escenario
for escenario in ["estricto", "ampliado"]:
    archivo = OUT / f"earthshift_modis_zonal_{escenario}.csv"
    modis = pd.read_csv(archivo)
    modis["fecha"] = pd.to_datetime(modis["fecha"])

    modis = modis[
        (modis["fecha"] >= INICIO) &
        (modis["fecha"] <= FIN)
    ]

    calidad[escenario] = {}

    for region, grupo in modis.groupby("region_id"):
        grupo = grupo.sort_values("fecha").copy()
        variables = [
            "temperatura_superficial_c",
            "ndvi",
            "evi"
        ]

        calidad[escenario][region] = {
            "filas": len(grupo),
            "variables": {
                v: {
                    "disponibles": int(grupo[v].notna().sum()),
                    "faltantes": int(grupo[v].isna().sum())
                }
                for v in variables
            }
        }

        for variable in variables:
            analizar_serie(
                grupo, region, variable, "zonal", escenario
            )

        correlacionar(
            grupo, region, "zonal", variables, escenario
        )

# C. Guardar resultados
pd.DataFrame(estadisticas).to_csv(
    OUT / "estadisticas.csv", index=False
)

pd.DataFrame(anomalias).to_csv(
    OUT / "anomalias.csv", index=False
)

pd.DataFrame(correlaciones).to_csv(
    OUT / "correlaciones.csv", index=False
)

with open(OUT / "reporte_qa_estadistico.json", "w", encoding="utf-8") as f:
    json.dump(calidad, f, indent=4, ensure_ascii=False)

print("\n=== ANALISIS ESTADISTICO COMPLETADO ===")
print("Series estadísticas:", len(estadisticas))
print("Anomalías calculadas:", len(anomalias))
print("Correlaciones exploratorias:", len(correlaciones))
print("\nArchivos generados:")
print("- estadisticas.csv")
print("- anomalias.csv")
print("- correlaciones.csv")
print("- reporte_qa_estadistico.json")

print("\n=== RESUMEN DE TENDENCIAS ===")
if estadisticas:
    resumen = pd.DataFrame(estadisticas)
    print(resumen[
        ["nivel", "region_id", "variable", "escenario",
         "n", "pendiente_sen_por_anio", "kendall_tau", "p_kendall"]
    ].to_string(index=False))
