import pandas as pd
import numpy as np
from scipy.stats import spearmanr

from pathlib import Path

OUT = Path("data/processed")

def preparar(df, variable):
    df = df[["fecha", variable]].copy()
    df["fecha"] = pd.to_datetime(df["fecha"])
    df[variable] = pd.to_numeric(df[variable], errors="coerce")
    df = df.dropna()
    df["mes"] = df["fecha"].dt.month
    grupos = df.groupby("mes")[variable]
    media = grupos.transform("mean")
    df["anomalia"] = df[variable] - media
    return df[["fecha", "anomalia"]].rename(
        columns={"anomalia": variable}
    )

resultados = []

# Piura general
df = pd.read_csv(OUT / "earthshift_general_mensual.csv")
a = preparar(df, "precipitacion_mm")
b = preparar(df, "humedad_suelo")
pares = a.merge(b, on="fecha")

rho, p = spearmanr(pares["precipitacion_mm"], pares["humedad_suelo"])
resultados.append({
    "region": "piura_general_01",
    "variables": "precipitacion_mm-humedad_suelo",
    "n": len(pares), "rho_anomalias": rho, "p_exploratorio": p
})

# MODIS por zona y escenario
for escenario in ["estricto", "ampliado"]:
    df = pd.read_csv(OUT / f"earthshift_modis_zonal_{escenario}.csv")

    for region, grupo in df.groupby("region_id"):
        variables = [
            "temperatura_superficial_c", "ndvi", "evi"
        ]

        anomalos = {}
        for v in variables:
            anomalos[v] = preparar(grupo, v)

        for v1, v2 in [
            ("temperatura_superficial_c", "ndvi"),
            ("temperatura_superficial_c", "evi")
        ]:
            pares = anomalos[v1].merge(
                anomalos[v2], on="fecha"
            )

            if len(pares) >= 24:
                rho, p = spearmanr(pares[v1], pares[v2])
                resultados.append({
                    "region": region,
                    "variables": f"{v1}-{v2}",
                    "escenario": escenario,
                    "n": len(pares),
                    "rho_anomalias": rho,
                    "p_exploratorio": p
                })

# Corrección FDR Benjamini-Hochberg
res = pd.DataFrame(resultados)
pvals = res["p_exploratorio"].to_numpy()
m = len(pvals)
orden = np.argsort(pvals)
q = np.empty(m)
q_ordenados = pvals[orden] * m / np.arange(1, m + 1)
q_ordenados = np.minimum.accumulate(q_ordenados[::-1])[::-1]
q[orden] = np.minimum(q_ordenados, 1)
res["q_BH_exploratorio"] = q

res.to_csv(OUT / "correlaciones_anomalias.csv", index=False)

print("=== CORRELACIONES DE ANOMALIAS ===")
print(res.to_string(index=False))
print("\nArchivo generado: correlaciones_anomalias.csv")
print("Nota: FDR no corrige la autocorrelacion temporal.")
