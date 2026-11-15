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


@router.get("/cells")
def get_cells():
    try:
        regions = get_available_regions()

        cells = [
            {
                "cell_id": region,
                "region": region,
                "source": "MODIS_zonal_processed",
                "status": "available",
            }
            for region in regions
        ]

        return {
            "status": "ok",
            "total": len(cells),
            "cells": cells,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/series")
def get_series(
    region: str = Query(
        default="BajoPiura"
    )
):
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
            "cell_id": payload["cell_id"],
            "period": payload["period"],
            "total_observations": len(series),
            "quality": payload["quality"],
            "metadata": payload["metadata"],
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
    try:
        regions = get_available_regions()

        return {
            "status": "ok",
            "source": "processed_real_data",
            "regions_available": len(regions),
            "regions": regions,
            "engines": [
                "earth_paradox",
                "silent_collapse",
                "decision_reversal",
            ],
            "endpoints": [
                "/api/variables",
                "/api/regions",
                "/api/cells",
                "/api/series",
                "/api/findings",
                "/api/findings/{finding_id}",
            ],
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )