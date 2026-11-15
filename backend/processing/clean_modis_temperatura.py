import os
import json
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

archivo_crudo = "Piura-Variables-MODIS-MOD11A2-061-results.csv"

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

# Conservar solo LST diurna valida (MODLAND 0b00 / 0b01 y valor > 0)
modland_ok = df["MOD11A2_061_QC_Day_MODLAND"].isin(["0b00", "0b01"])
valor_ok = df["MOD11A2_061_LST_Day_1km"] > 0
df.loc[~(modland_ok & valor_ok), "MOD11A2_061_LST_Day_1km"] = np.nan

# Kelvin -> Celsius (AppEEARS ya entrego en Kelvin)
df["temperatura_superficial_c"] = df["MOD11A2_061_LST_Day_1km"] - 273.15

# Fecha mensual
df["mes"] = pd.to_datetime(df["Date"]).dt.to_period("M").dt.to_timestamp()

# Agregacion mensual por zona (media)
zone_monthly = (
    df.groupby(["Category", "mes"], as_index=False)["temperatura_superficial_c"]
    .mean()
    .rename(columns={"Category": "region_id"})
)

# Promedio de las 4 zonas -> piura_general_01
general_monthly = (
    df.groupby("mes", as_index=False)["temperatura_superficial_c"]
    .mean()
)
general_monthly["region_id"] = "piura_general_01"

out = pd.concat([zone_monthly, general_monthly], ignore_index=True)
out = out.dropna(subset=["temperatura_superficial_c"])
out["fecha"] = out["mes"].dt.strftime("%Y-%m-%d")
out = out[["region_id", "fecha", "temperatura_superficial_c"]]
out = out.sort_values(["region_id", "fecha"]).reset_index(drop=True)

salida = os.path.join(DATA_DIR, "modis_temperatura_limpio.csv")
out.to_csv(salida, index=False)
print("Listo! Filas:", len(out))
print(out.head())