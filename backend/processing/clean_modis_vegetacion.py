
from pathlib import Path
import json
import pandas as pd

# ============================================================
# 1. RUTAS DEL PROYECTO
# ============================================================

ROOT_DIR = Path(__file__).resolve().parents[2]

RAW_FILE = (
    ROOT_DIR
    / "data"
    / "raw"
    / "modis"
    / "Piura-Variables-MODIS-MOD13Q1-061-results.csv"
)

PROCESSED_DIR = ROOT_DIR / "data" / "processed"
METADATA_DIR = ROOT_DIR / "data" / "metadata"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
METADATA_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================
# 2. COLUMNAS MODIS
# ============================================================

NDVI_COL = "MOD13Q1_061__250m_16_days_NDVI"
EVI_COL = "MOD13Q1_061__250m_16_days_EVI"

RELIABILITY_COL = (
    "MOD13Q1_061__250m_16_days_pixel_reliability"
)

MODLAND_COL = (
    "MOD13Q1_061__250m_16_days_VI_Quality_MODLAND"
)

CLOUD_COL = (
    "MOD13Q1_061__250m_16_days_VI_Quality_Adjacent_cloud_detected"
)

SHADOW_COL = (
    "MOD13Q1_061__250m_16_days_VI_Quality_Possible_shadow"
)

REQUIRED_COLS = [
    "Category",
    "ID",
    "Latitude",
    "Longitude",
    "Date",
    NDVI_COL,
    EVI_COL,
    RELIABILITY_COL,
    MODLAND_COL,
    CLOUD_COL,
    SHADOW_COL,
]

# ============================================================
# 3. LECTURA Y VALIDACIÓN
# ============================================================

if not RAW_FILE.exists():
    raise FileNotFoundError(
        f"No se encontró el archivo original: {RAW_FILE}"
    )

df_raw = pd.read_csv(RAW_FILE)

missing_cols = [
    col for col in REQUIRED_COLS
    if col not in df_raw.columns
]

if missing_cols:
    raise ValueError(
        f"Faltan columnas obligatorias: {missing_cols}"
    )

if df_raw.empty:
    raise ValueError("El archivo original está vacío.")

df = df_raw.copy()

df["Date"] = pd.to_datetime(
    df["Date"],
    errors="raise"
)

df[NDVI_COL] = pd.to_numeric(
    df[NDVI_COL],
    errors="raise"
)

df[EVI_COL] = pd.to_numeric(
    df[EVI_COL],
    errors="raise"
)

df[RELIABILITY_COL] = pd.to_numeric(
    df[RELIABILITY_COL],
    errors="raise"
)

# Normalizar códigos QA como texto
for col in [MODLAND_COL, CLOUD_COL, SHADOW_COL]:
    df[col] = df[col].astype(str).str.strip()

# Validación de rangos
for col in [NDVI_COL, EVI_COL]:
    if not df[col].between(-1, 1).all():
        raise ValueError(
            f"Se encontraron valores fuera de [-1, 1] en {col}"
        )

# ============================================================
# 4. METADATOS DE LAS ZONAS
# ============================================================

meta = {}

for _, row in df[
    ["Category", "ID", "Latitude", "Longitude"]
].drop_duplicates().iterrows():

    category = row["Category"]

    meta[category] = {
        "ID": row["ID"],
        "Latitude": float(row["Latitude"]),
        "Longitude": float(row["Longitude"]),
    }

metadata_file = (
    METADATA_DIR / "metadata_vegetacion_zonas.json"
)

with open(metadata_file, "w", encoding="utf-8") as f:
    json.dump(
        meta,
        f,
        ensure_ascii=False,
        indent=2
    )

# ============================================================
# 5. ESCENARIOS DE CALIDAD
# ============================================================

strict_mask = (
    df[RELIABILITY_COL] == 0
)

expanded_mask = (
    strict_mask
    |
    (
        (df[RELIABILITY_COL] == 1)
        & (df[MODLAND_COL] == "0b00")
        & (df[CLOUD_COL] == "0b0")
        & (df[SHADOW_COL] == "0b0")
    )
)

scenarios = {
    "estricto": strict_mask,
    "ampliado": expanded_mask,
}

# ============================================================
# 6. PROCESAMIENTO Y AGREGACIÓN MENSUAL
# ============================================================

def process_scenario(name, mask):

    selected = df.loc[mask].copy()

    selected["ndvi"] = selected[NDVI_COL]
    selected["evi"] = selected[EVI_COL]

    selected["mes"] = (
        selected["Date"]
        .dt.to_period("M")
        .dt.to_timestamp()
    )

    # Agregación por zona y mes
    zone_monthly = (
        selected
        .groupby(
            ["Category", "mes"],
            as_index=False
        )
        .agg(
            ndvi=("ndvi", "mean"),
            evi=("evi", "mean"),
            n_obs_ndvi=("ndvi", "count"),
            n_obs_evi=("evi", "count"),
        )
        .rename(
            columns={"Category": "region_id"}
        )
    )

    # Promedio general:
    # primero se promedian las observaciones de cada zona;
    # después se promedian las zonas disponibles.
    general_monthly = (
        zone_monthly
        .groupby("mes", as_index=False)
        .agg(
            ndvi=("ndvi", "mean"),
            evi=("evi", "mean"),
            n_obs_ndvi=("n_obs_ndvi", "sum"),
            n_obs_evi=("n_obs_evi", "sum"),
            zonas_disponibles_ndvi=("ndvi", "count"),
            zonas_disponibles_evi=("evi", "count"),
        )
    )

    general_monthly["region_id"] = "piura_general_01"

    zone_monthly["zonas_disponibles_ndvi"] = 1
    zone_monthly["zonas_disponibles_evi"] = 1

    out = pd.concat(
        [zone_monthly, general_monthly],
        ignore_index=True
    )

    out["fecha"] = (
        out["mes"].dt.strftime("%Y-%m-%d")
    )

    out["quality_scenario"] = name

    out = out[
        [
            "region_id",
            "fecha",
            "ndvi",
            "evi",
            "n_obs_ndvi",
            "n_obs_evi",
            "zonas_disponibles_ndvi",
            "zonas_disponibles_evi",
            "quality_scenario",
        ]
    ]

    out = out.sort_values(
        ["region_id", "fecha"]
    ).reset_index(drop=True)

    output_file = (
        PROCESSED_DIR
        / f"modis_vegetacion_mensual_{name}.csv"
    )

    out.to_csv(output_file, index=False)

    # Resumen de control de calidad
    qa_summary = {
        "escenario": name,
        "registros_originales": int(len(df)),
        "registros_seleccionados": int(len(selected)),
        "registros_excluidos": int(len(df) - len(selected)),
        "zonas": {},
        "periodo_inicio": str(df["Date"].min().date()),
        "periodo_fin": str(df["Date"].max().date()),
        "archivo_salida": str(output_file.relative_to(ROOT_DIR)),
    }

    for zone in sorted(df["Category"].unique()):

        original_count = int(
            (df["Category"] == zone).sum()
        )

        selected_count = int(
            (selected["Category"] == zone).sum()
        )

        qa_summary["zonas"][zone] = {
            "registros_originales": original_count,
            "registros_seleccionados": selected_count,
        }

    return out, qa_summary


# ============================================================
# 7. EJECUTAR AMBOS ESCENARIOS
# ============================================================

results = {}
qa_report = {
    "producto": "MODIS MOD13Q1.061",
    "variable": "NDVI y EVI",
    "frecuencia_original": "16 días",
    "agregacion": "Media mensual de composiciones disponibles",
    "escenarios": {},
}

for name, mask in scenarios.items():

    output, summary = process_scenario(name, mask)

    results[name] = output
    qa_report["escenarios"][name] = summary

    print(f"\nESCENARIO: {name.upper()}")
    print("Registros aceptados:", summary["registros_seleccionados"])
    print("Filas mensuales generadas:", len(output))

# ============================================================
# 8. DIFERENCIA ENTRE ESCENARIOS
# ============================================================

qa_report["diferencia_ampliado_vs_estricto"] = (
    int(expanded_mask.sum() - strict_mask.sum())
)

qa_report["observaciones_marginales_adicionales"] = (
    qa_report["diferencia_ampliado_vs_estricto"]
)

qa_file = (
    PROCESSED_DIR
    / "qa_modis_vegetacion.json"
)

with open(qa_file, "w", encoding="utf-8") as f:
    json.dump(
        qa_report,
        f,
        ensure_ascii=False,
        indent=2
    )

# ============================================================
# 9. RESUMEN FINAL
# ============================================================

print("\n====================================")
print("PROCESAMIENTO MODIS VEGETACIÓN FINALIZADO")
print("====================================")

print("Archivo original:", RAW_FILE)
print("Directorio de salida:", PROCESSED_DIR)
print("Metadatos:", metadata_file)
print("Informe QA:", qa_file)

print("\nDiferencia de registros entre escenarios:",
      qa_report["diferencia_ampliado_vs_estricto"])
