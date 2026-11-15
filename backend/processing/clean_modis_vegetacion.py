import os
import json
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

archivo_crudo = "Piura-Variables-MODIS-MOD13Q1-061-results.csv"

# --- Metadatos de zonas ---
df_raw = pd.read_csv(os.path.join(BASE_DIR, archivo_crudo))
meta = {}
for _, r in df_raw[["Category", "ID", "Latitude", "Longitude"]].drop_duplicates().iterrows():
    meta[r["Category"]] = {
        "ID": r["ID"],
        "Latitude": float(r["Latitude"]),
        "Longitude": float(r["Longitude"]),
    }
with open(os.path.join(DATA_DIR, "metadata_zonas.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

# --- Limpieza ---
df = df_raw.copy()

ndvi_col = "MOD13Q1_061__250m_16_days_NDVI"
evi_col = "MOD13Q1_061__250m_16_days_EVI"
qc_col = "MOD13Q1_061__250m_16_days_pixel_reliability"

# Conservar solo pixeles con pixel_reliability en {0, 1}
mask_ok = df[qc_col].isin([0, 1])
df.loc[~mask_ok, [ndvi_col, evi_col]] = np.nan

df["ndvi"] = df[ndvi_col]
df["evi"] = df[evi_col]

# Escalar si vienen como enteros MODIS (> 1 en valor absoluto)
for col in ["ndvi", "evi"]:
    if df[col].abs().max(skipna=True) > 1.5:
        df[col] = df[col] * 0.0001

# Fecha mensual
df["mes"] = pd.to_datetime(df["Date"]).dt.to_period("M").dt.to_timestamp()

# Agregacion mensual por zona (media)
zone_monthly = (
    df.groupby(["Category", "mes"], as_index=False)[["ndvi", "evi"]]
    .mean()
    .rename(columns={"Category": "region_id"})
)

# Promedio de las 4 zonas -> piura_general_01
general_monthly = (
    df.groupby("mes", as_index=False)[["ndvi", "evi"]]
    .mean()
)
general_monthly["region_id"] = "piura_general_01"

out = pd.concat([zone_monthly, general_monthly], ignore_index=True)
out = out.dropna(subset=["ndvi", "evi"], how="all")
out["fecha"] = out["mes"].dt.strftime("%Y-%m-%d")
out = out[["region_id", "fecha", "ndvi", "evi"]]
out = out.sort_values(["region_id", "fecha"]).reset_index(drop=True)

salida = os.path.join(DATA_DIR, "modis_vegetacion_limpio.csv")
out.to_csv(salida, index=False)
print("Listo! Filas:", len(out))
print(out.head())