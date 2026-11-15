from fastapi import APIRouter, HTTPException, Query

from backend.app.services.engine_adapter import (
    build_engine_payload,
    get_available_regions,
)


router = APIRouter(
    tags=["EarthShift Data"]
)


@router.get("/variables")
def get_variables():
    """
    Variables disponibles actualmente
    para los motores EarthShift.
    """

    return {
        "status": "ok",
        "variables": [
            {
                "id": "ndvi",
                "name": "NDVI",
                "unit": "index",
                "source": "MODIS",
                "aggregation": "annual_mean",
            },
            {
                "id": "precipitation",
                "name": "Precipitacion",
                "unit": "mm/year",
                "source": "processed_piura_general",
                "aggregation": "annual_sum",
            },
        ],
    }


@router.get("/series")
def get_series(
    region: str = Query(
        default="BajoPiura"
    )
):
    """
    Devuelve las series anuales usadas
    por los motores EarthShift.
    """

    try:
        payload = build_engine_payload(
            region
        )

        series = []

        for (
            year,
            ndvi,
            precipitation,
        ) in zip(
            payload["years"],
            payload["ndvi_values"],
            payload["precipitation_values"],
        ):
            series.append(
                {
                    "year": year,
                    "ndvi": ndvi,
                    "precipitation_mm": precipitation,
                }
            )

        return {
            "status": "ok",
            "source": "processed_real_data",
            "region": region,
            "period": payload["period"],
            "total_observations": len(
                series
            ),
            "quality": payload[
                "quality"
            ],
            "metadata": payload[
                "metadata"
            ],
            "series": series,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/data-status")
def get_data_status():
    """
    Resumen rapido de disponibilidad.
    """

    try:
        regions = (
            get_available_regions()
        )

        return {
            "status": "ok",
            "source":
                "processed_real_data",
            "regions_available":
                len(regions),
            "regions": regions,
            "engines": [
                "earth_paradox",
                "silent_collapse",
                "decision_reversal",
            ],
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )