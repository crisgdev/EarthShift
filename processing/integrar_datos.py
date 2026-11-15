from pathlib import Path
import pandas as pd
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = DATA / "processed"

INICIO = "2000-03-01"
FIN = "2025-09-01"

ZONAS = [
    "BajoPiura",
    "BosqueSecoMorropon",
    "DesiertoSechura",
    "ValleChira"
]

def cargar(nombre, carpeta=DATA):
    df = pd.read_csv(carpeta / nombre)
    df["fecha"] = pd.to_datetime(df["fecha"])
    df = df[
        (df["fecha"] >= INICIO) &
        (df["fecha"] <= FIN)
    ].copy()
    if df.duplicated(["region_id", "fecha"]).any():
        raise ValueError(f"Duplicados en {nombre}")
    return df

# Serie general hidroclimática
gpm = cargar("gpm_precipitacion_limpio.csv")
gldas = cargar("gldas_humedad_limpio.csv")

general = gpm.merge(
    gldas,
    on=["region_id", "fecha"],
    how="outer",
    validate="one_to_one"
)

general.to_csv(
    OUT / "earthshift_general_mensual.csv",
    index=False
)

# MODIS: exclusivamente las cuatro zonas
temperatura = cargar("modis_temperatura_limpio.csv")
temperatura = temperatura[
    temperatura["region_id"].isin(ZONAS)
].copy()

resultados = {}

for escenario in ["estricto", "ampliado"]:
    vegetacion = cargar(
        f"modis_vegetacion_mensual_{escenario}.csv",
        OUT
    )
    vegetacion = vegetacion[
        vegetacion["region_id"].isin(ZONAS)
    ].copy()

    zonal = temperatura.merge(
        vegetacion,
        on=["region_id", "fecha"],
        how="outer",
        validate="one_to_one",
        suffixes=("_temperatura", "_vegetacion")
    )

    zonal["quality_scenario"] = escenario
    zonal = zonal.sort_values(["region_id", "fecha"])

    zonal.to_csv(
        OUT / f"earthshift_modis_zonal_{escenario}.csv",
        index=False
    )

    resultados[escenario] = {
        "filas": int(len(zonal)),
        "zonas": sorted(zonal["region_id"].unique().tolist()),
        "fechas": int(zonal["fecha"].nunique()),
        "ndvi_disponibles": int(zonal["ndvi"].notna().sum()),
        "evi_disponibles": int(zonal["evi"].notna().sum()),
        "temperatura_disponible": int(
            zonal["temperatura_superficial_c"].notna().sum()
        )
    }

reporte = {
    "periodo": {"inicio": INICIO, "fin": FIN},
    "serie_general": {
        "filas": int(len(general)),
        "precipitacion_disponible": int(general["precipitacion_mm"].notna().sum()),
        "humedad_disponible": int(general["humedad_suelo"].notna().sum())
    },
    "modis_zonal": resultados,
    "zonas_esperadas": ZONAS,
    "advertencia": "La serie general y las cuatro zonas MODIS se mantienen separadas."
}

with open(OUT / "reporte_integracion.json", "w", encoding="utf-8") as f:
    json.dump(reporte, f, indent=4, ensure_ascii=False)

print("\n=== INTEGRACION CORREGIDA ===")
print(json.dumps(reporte, indent=2, ensure_ascii=False))
