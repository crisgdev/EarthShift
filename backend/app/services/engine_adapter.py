from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data" / "processed"

GENERAL_FILE = DATA_DIR / "earthshift_general_mensual.csv"
MODIS_FILE = DATA_DIR / "earthshift_modis_zonal_ampliado.csv"


def build_engine_payload(region="BajoPiura"):
    general = pd.read_csv(
        GENERAL_FILE,
        parse_dates=["fecha"],
    )

    modis = pd.read_csv(
        MODIS_FILE,
        parse_dates=["fecha"],
    )

    modis_region = modis[
        modis["region_id"] == region
    ].copy()

    if modis_region.empty:
        available = sorted(
            modis["region_id"]
            .dropna()
            .astype(str)
            .unique()
            .tolist()
        )

        raise ValueError(
            f"Region no encontrada: {region}. "
            f"Disponibles: {available}"
        )

    general["year"] = general["fecha"].dt.year
    modis_region["year"] = modis_region["fecha"].dt.year

    general_annual = (
        general.groupby(
            "year",
            as_index=False,
        )
        .agg(
            precipitation_mm=(
                "precipitacion_mm",
                "sum",
            ),
            precipitation_months=(
                "precipitacion_mm",
                "count",
            ),
            soil_moisture=(
                "humedad_suelo",
                "mean",
            ),
            soil_moisture_months=(
                "humedad_suelo",
                "count",
            ),
        )
    )

    modis_annual = (
        modis_region.groupby(
            "year",
            as_index=False,
        )
        .agg(
            ndvi=(
                "ndvi",
                "mean",
            ),
            evi=(
                "evi",
                "mean",
            ),
            surface_temperature_c=(
                "temperatura_superficial_c",
                "mean",
            ),
            ndvi_months=(
                "ndvi",
                "count",
            ),
            surface_temperature_months=(
                "temperatura_superficial_c",
                "count",
            ),
        )
    )

    merged = pd.merge(
        modis_annual,
        general_annual,
        on="year",
        how="inner",
    )

    merged = (
        merged
        .dropna(
            subset=[
                "ndvi",
                "precipitation_mm",
            ]
        )
        .sort_values("year")
        .reset_index(drop=True)
    )

    if len(merged) < 4:
        raise ValueError(
            "No existen al menos 4 años comunes "
            "entre las variables principales."
        )

    expected_months = len(merged) * 12

    def fraction(column):
        return round(
            min(
                float(
                    merged[column].sum()
                )
                / expected_months,
                1.0,
            ),
            4,
        )

    first_year = int(
        merged["year"].iloc[0]
    )

    last_year = int(
        merged["year"].iloc[-1]
    )

    return {
        "cell_id": region,
        "period": (
            f"{first_year}-{last_year}"
        ),
        "years": (
            merged["year"]
            .astype(int)
            .tolist()
        ),
        "ndvi_values": (
            merged["ndvi"]
            .astype(float)
            .round(6)
            .tolist()
        ),
        "evi_values": (
            merged["evi"]
            .astype(float)
            .round(6)
            .tolist()
        ),
        "precipitation_values": (
            merged["precipitation_mm"]
            .astype(float)
            .round(6)
            .tolist()
        ),
        "surface_temperature_values": (
            merged[
                "surface_temperature_c"
            ]
            .astype(float)
            .round(6)
            .tolist()
        ),
        "soil_moisture_values": (
            merged["soil_moisture"]
            .astype(float)
            .round(6)
            .tolist()
        ),
        "ndvi_reference": round(
            float(
                merged["ndvi"].mean()
            ),
            6,
        ),
        "quality": {
            "variables": {
                "ndvi": {
                    "valid_fraction":
                        fraction(
                            "ndvi_months"
                        )
                },
                "precipitation": {
                    "valid_fraction":
                        fraction(
                            "precipitation_months"
                        )
                },
                "surface_temperature": {
                    "valid_fraction":
                        fraction(
                            "surface_temperature_months"
                        )
                },
                "soil_moisture": {
                    "valid_fraction":
                        fraction(
                            "soil_moisture_months"
                        )
                },
            }
        },
        "metadata": {
            "source":
                "processed_real_data",

            "ndvi_region":
                region,

            "temperature_region":
                region,

            "precipitation_region":
                "piura_general_01",

            "soil_moisture_region":
                "piura_general_01",

            "spatial_match":
                "mixed",

            "spatial_limitation": (
                "NDVI y temperatura superficial "
                "corresponden a la zona MODIS "
                "seleccionada; precipitacion y "
                "humedad del suelo corresponden "
                "a la serie regional general "
                "de Piura."
            ),

            "ndvi_aggregation":
                "annual_mean",

            "precipitation_aggregation":
                "annual_sum",

            "surface_temperature_aggregation":
                "annual_mean",

            "soil_moisture_aggregation":
                "annual_mean",

            "reference_type":
                "mean_available_ndvi_provisional",
        },
    }


def get_available_regions():
    modis = pd.read_csv(
        MODIS_FILE
    )

    return sorted(
        modis["region_id"]
        .dropna()
        .astype(str)
        .unique()
        .tolist()
    )