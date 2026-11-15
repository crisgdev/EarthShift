"""
EarthShift - Pipeline científico v2
Etapa: control de calidad, metadatos y armonización temporal.

No calcula causalidad, tendencias ni correlaciones. Conserva unidades y
significados físicos distintos para precipitación y humedad del suelo.
"""

from pathlib import Path
import json
import pandas as pd

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "input"
OUTPUT = ROOT / "output"
OUTPUT.mkdir(exist_ok=True)

REGION_COL = "region_id"
EXPECTED_REGION = "piura_general_01"

# Bounding box acordado por el equipo: Oeste, Sur, Este, Norte (EPSG:4326)
REGIONAL_BBOX = {
    "west": -81.35,
    "south": -6.40,
    "east": -79.15,
    "north": -4.05,
    "crs": "EPSG:4326",
    "aggregation": "area_averaged",
}

FILES = {
    "precipitacion": {
        "file": "gpm_precipitacion_limpio.csv",
        "date_col": "fecha",
        "value_col": "precipitacion_mm",
        "unit": "mm/mes",
        "unit_status": "confirmada",
        "product": "GPM IMERG",
        "version": "V07",
        "spatial_resolution": "0.1°",
        "variable": "Precipitación combinada satélite-pluviómetro",
        "description": "Precipitación mensual combinada de observaciones satelitales y pluviómetros.",
        "source": "NASA GPM IMERG V07 / Giovanni",
    },
    "humedad_suelo": {
        "file": "gldas_humedad_limpio.csv",
        "date_col": "fecha",
        "value_col": "humedad_suelo",
        "unit": "kg/m²",
        "unit_status": "confirmada",
        "product": "GLDAS_NOAH025_M",
        "version": "v2.1",
        "variable": "SoilMoi0_10cm_inst",
        "description": "Humedad del suelo de 0 a 10 cm de profundidad.",
        "source": "NASA GLDAS Noah Land Surface Model L4 monthly 0.25 x 0.25 degree V2.1 / Giovanni",
    },
}


def month_sequence(start, end):
    return pd.date_range(start=start, end=end, freq="MS")


def inspect_series(key, spec):
    path = INPUT / spec["file"]
    info = {
        "variable_key": key,
        "file": spec["file"],
        "exists": path.exists(),
        "product": spec["product"],
        "version": spec["version"],
        "source": spec["source"],
        "variable": spec["variable"],
        "description": spec["description"],
        "unit": spec["unit"],
        "unit_status": spec["unit_status"],
        "spatial_coverage": REGIONAL_BBOX,
        "errors": [],
        "warnings": [],
    }

    if not path.exists():
        info["errors"].append(f"Archivo no encontrado: {path}")
        return None, info

    df = pd.read_csv(path)
    required = [REGION_COL, spec["date_col"], spec["value_col"]]
    missing_cols = [col for col in required if col not in df.columns]
    if missing_cols:
        info["errors"].append(f"Faltan columnas: {missing_cols}")
        return None, info

    df = df[required].copy().rename(columns={
        REGION_COL: "region_id",
        spec["date_col"]: "date",
        spec["value_col"]: "value",
    })

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    invalid_dates = int(df["date"].isna().sum())
    if invalid_dates:
        info["errors"].append(f"Fechas inválidas: {invalid_dates}")

    df = df.dropna(subset=["date"]).copy()
    df["date"] = df["date"].dt.to_period("M").dt.to_timestamp()
    df["value"] = pd.to_numeric(df["value"], errors="coerce")

    null_values = int(df["value"].isna().sum())
    duplicates = int(df.duplicated(["region_id", "date"]).sum())
    regions = sorted(df["region_id"].dropna().astype(str).unique().tolist())

    if duplicates:
        info["errors"].append(f"Fechas duplicadas por región: {duplicates}")
    if regions != [EXPECTED_REGION]:
        info["warnings"].append(f"Identificadores regionales encontrados: {regions}")

    df = df.sort_values(["region_id", "date"]).reset_index(drop=True)

    if not df.empty:
        expected = month_sequence(df["date"].min(), df["date"].max())
        actual = pd.DatetimeIndex(df["date"].drop_duplicates())
        missing = expected.difference(actual)
        info.update({
            "period_start": df["date"].min().strftime("%Y-%m-%d"),
            "period_end": df["date"].max().strftime("%Y-%m-%d"),
            "records": int(len(df)),
            "unique_months": int(df["date"].nunique()),
            "missing_months": [d.strftime("%Y-%m-%d") for d in missing],
            "missing_month_count": int(len(missing)),
            "null_values": null_values,
            "duplicate_dates": duplicates,
            "regions": regions,
            "min_value": None if df["value"].dropna().empty else float(df["value"].min()),
            "max_value": None if df["value"].dropna().empty else float(df["value"].max()),
        })

    if key == "precipitacion":
        info["spatial_resolution"] = spec["spatial_resolution"]
    info["warnings"].append(
        "Serie regional area-averaged: válida para análisis temporal regional, no para mapas por píxel."
    )
    return df, info


def main():
    report = {
        "project": "EarthShift",
        "region": "Piura, Peru",
        "region_id_expected": EXPECTED_REGION,
        "bounding_box_west_south_east_north": REGIONAL_BBOX,
        "pipeline_stage": "qa_metadata_temporal_harmonization",
        "scientific_analysis_enabled": False,
        "scientific_constraints": [
            "GPM IMERG V07: precipitación combinada satélite-pluviómetro, mensual, mm/mes, resolución 0.1°.",
            "Precipitación y humedad del suelo son magnitudes físicas diferentes.",
            "No convertir una variable en la otra ni comparar sus valores absolutos.",
            "La equivalencia 1 kg/m² = 1 mm solo expresa profundidad equivalente de agua.",
            "Los promedios regionales no permiten reconstruir mapas internos por píxel.",
            "Los cuatro puntos AppEEARS deben tratarse como una fuente espacial separada.",
        ],
        "metadata_pending": [
            "Metadatos de las variables restantes cuando se reciban",
        ],
        "series": {},
        "compatibility": {},
    }

    frames = {}
    for key, spec in FILES.items():
        df, info = inspect_series(key, spec)
        report["series"][key] = info
        if df is not None:
            frames[key] = df

    if len(frames) == len(FILES):
        p = frames["precipitacion"].rename(columns={"value": "precipitacion_mm"})
        s = frames["humedad_suelo"].rename(columns={"value": "humedad_suelo_kg_m2"})

        merged = p.merge(
            s[["region_id", "date", "humedad_suelo_kg_m2"]],
            on=["region_id", "date"],
            how="outer",
            indicator=True,
            validate="one_to_one",
        ).sort_values("date")

        common = merged[merged["_merge"] == "both"].drop(columns="_merge").copy()
        merged.drop(columns="_merge").to_csv(
            OUTPUT / "series_consolidadas_outer.csv", index=False
        )
        common.to_csv(OUTPUT / "series_periodo_comun.csv", index=False)

        report["compatibility"] = {
            "spatial_footprint": "same_declared_bounding_box",
            "spatial_aggregation": "both_area_averaged_regional_series",
            "temporal_common_months": int(len(common)),
            "common_start": None if common.empty else common["date"].min().strftime("%Y-%m-%d"),
            "common_end": None if common.empty else common["date"].max().strftime("%Y-%m-%d"),
            "precipitation_only_months": int((merged["_merge"] == "left_only").sum()),
            "soil_moisture_only_months": int((merged["_merge"] == "right_only").sum()),
            "physical_variables_comparable_as_absolute_values": False,
            "joint_temporal_analysis": "possible_after_GPM_metadata_confirmation_and_method_selection",
            "pixel_level_mapping_from_these_series": False,
            "note": (
                "Se pueden estudiar patrones temporales conjuntos con métodos adecuados "
                "(por ejemplo, correlación/análisis de rezagos), pero no interpretar "
                "asociación como causalidad."
            ),
        }

    (OUTPUT / "reporte_calidad.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("Pipeline finalizado. Revisa output/reporte_calidad.json.")


if __name__ == "__main__":
    main()
