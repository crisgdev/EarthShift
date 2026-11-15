from pathlib import Path
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = BASE_DIR / "data" / "processed"


GENERAL_FILE = DATA_DIR / "earthshift_general_mensual.csv"
MODIS_FILE = DATA_DIR / "earthshift_modis_zonal_ampliado.csv"


def build_engine_payload(region="BajoPiura"):
    """
    Convierte los datos procesados reales al formato
    utilizado por los motores EarthShift.

    IMPORTANTE:
    La precipitacion es regional para Piura general,
    mientras que NDVI corresponde a una zona MODIS.
    Por eso la coincidencia espacial es aproximada.
    """

    # -------------------------------------------------
    # 1. Cargar datos
    # -------------------------------------------------

    general = pd.read_csv(
        GENERAL_FILE,
        parse_dates=["fecha"]
    )

    modis = pd.read_csv(
        MODIS_FILE,
        parse_dates=["fecha"]
    )

    # -------------------------------------------------
    # 2. Filtrar zona MODIS
    # -------------------------------------------------

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

    # -------------------------------------------------
    # 3. Crear año
    # -------------------------------------------------

    general["year"] = general["fecha"].dt.year
    modis_region["year"] = modis_region["fecha"].dt.year

    # -------------------------------------------------
    # 4. Precipitacion anual
    # -------------------------------------------------
    # precipitation_mm es mensual.
    # Se suma para obtener precipitacion anual.

    precipitation_annual = (
        general
        .groupby("year", as_index=False)
        .agg(
            precipitation_mm=(
                "precipitacion_mm",
                "sum"
            ),
            precipitation_months=(
                "precipitacion_mm",
                "count"
            )
        )
    )

    # -------------------------------------------------
    # 5. NDVI anual
    # -------------------------------------------------
    # Se utiliza promedio anual.

    ndvi_annual = (
        modis_region
        .groupby("year", as_index=False)
        .agg(
            ndvi=(
                "ndvi",
                "mean"
            ),
            ndvi_months=(
                "ndvi",
                "count"
            )
        )
    )

    # -------------------------------------------------
    # 6. Cruzar por año
    # -------------------------------------------------

    merged = pd.merge(
        ndvi_annual,
        precipitation_annual,
        on="year",
        how="inner"
    )

    merged = merged.dropna(
        subset=[
            "ndvi",
            "precipitation_mm"
        ]
    )

    merged = merged.sort_values(
        "year"
    ).reset_index(drop=True)

    # -------------------------------------------------
    # 7. Necesitamos al menos 4 años
    # -------------------------------------------------

    if len(merged) < 4:
        raise ValueError(
            "No existen al menos 4 años "
            "comunes entre NDVI y precipitacion."
        )

    # -------------------------------------------------
    # 8. Cobertura
    # -------------------------------------------------

    expected_months = len(merged) * 12

    ndvi_valid_months = int(
        merged["ndvi_months"].sum()
    )

    precipitation_valid_months = int(
        merged["precipitation_months"].sum()
    )

    ndvi_valid_fraction = min(
        ndvi_valid_months / expected_months,
        1.0
    )

    precipitation_valid_fraction = min(
        precipitation_valid_months
        / expected_months,
        1.0
    )

    # -------------------------------------------------
    # 9. Referencia NDVI
    # -------------------------------------------------
    # Por ahora usamos el promedio de toda la serie
    # disponible como referencia provisional.

    ndvi_reference = float(
        merged["ndvi"].mean()
    )

    # -------------------------------------------------
    # 10. Periodo
    # -------------------------------------------------

    first_year = int(
        merged["year"].iloc[0]
    )

    last_year = int(
        merged["year"].iloc[-1]
    )

    period = (
        f"{first_year}-{last_year}"
    )

    # -------------------------------------------------
    # 11. Payload para motores
    # -------------------------------------------------

    payload = {
        "cell_id": region,

        "period": period,

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

        "precipitation_values": (
            merged["precipitation_mm"]
            .astype(float)
            .round(6)
            .tolist()
        ),

        "ndvi_reference": round(
            ndvi_reference,
            6
        ),

        "quality": {
            "variables": {
                "ndvi": {
                    "valid_fraction": round(
                        ndvi_valid_fraction,
                        4
                    )
                },

                "precipitation": {
                    "valid_fraction": round(
                        precipitation_valid_fraction,
                        4
                    )
                }
            }
        },

        "metadata": {
            "source": "processed_real_data",

            "ndvi_region": region,

            "precipitation_region":
                "piura_general_01",

            "spatial_match":
                "approximate",

            "spatial_limitation": (
                "El NDVI corresponde a una zona "
                "MODIS especifica, mientras que la "
                "precipitacion corresponde a la "
                "serie regional general de Piura."
            ),

            "ndvi_aggregation":
                "annual_mean",

            "precipitation_aggregation":
                "annual_sum",

            "reference_type":
                "mean_available_ndvi_provisional"
        }
    }

    return payload


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


if __name__ == "__main__":

    import json

    print(
        "\nREGIONES DISPONIBLES:"
    )

    for region in get_available_regions():
        print("-", region)

    print(
        "\nPAYLOAD DE PRUEBA:"
    )

    result = build_engine_payload(
        "BajoPiura"
    )

    print(
        json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        )
    )