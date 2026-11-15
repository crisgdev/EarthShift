from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.app.services.engine_adapter import (
    build_engine_payload,
    get_available_regions,
)


router = APIRouter(
    tags=["EarthShift Data"]
)


ALLOWED_VARIABLES = {
    "ndvi",
    "precipitation",
}


def parse_bbox(
    bbox: Optional[str],
):
    if bbox is None:
        return None

    try:
        values = [
            float(item.strip())
            for item in bbox.split(",")
        ]
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="bbox invalido.",
        )

    if len(values) != 4:
        raise HTTPException(
            status_code=400,
            detail=(
                "bbox debe tener formato "
                "west,south,east,north."
            ),
        )

    west, south, east, north = values

    if west >= east:
        raise HTTPException(
            status_code=400,
            detail="bbox west debe ser menor que east.",
        )

    if south >= north:
        raise HTTPException(
            status_code=400,
            detail="bbox south debe ser menor que north.",
        )

    if (
        west < -180
        or east > 180
        or south < -90
        or north > 90
    ):
        raise HTTPException(
            status_code=400,
            detail="bbox fuera de rango.",
        )

    return {
        "west": west,
        "south": south,
        "east": east,
        "north": north,
    }


def parse_variables(
    variables: Optional[str],
):
    if variables is None:
        return [
            "ndvi",
            "precipitation",
        ]

    parsed = [
        item.strip()
        for item in variables.split(",")
        if item.strip()
    ]

    if not parsed:
        raise HTTPException(
            status_code=400,
            detail="variables no puede estar vacio.",
        )

    invalid = [
        item
        for item in parsed
        if item not in ALLOWED_VARIABLES
    ]

    if invalid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Variable no soportada.",
                "invalid": invalid,
                "allowed": sorted(
                    ALLOWED_VARIABLES
                ),
            },
        )

    return parsed


def resolve_region(
    region: Optional[str],
    cell_id: Optional[str],
):
    selected = (
        cell_id
        or region
        or "BajoPiura"
    )

    available = (
        get_available_regions()
    )

    if selected not in available:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Region/cell_id invalido.",
                "value": selected,
                "available": available,
            },
        )

    return selected


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
def get_cells(
    bbox: Optional[str] = Query(
        default=None
    )
):
    try:
        parsed_bbox = parse_bbox(
            bbox
        )

        regions = (
            get_available_regions()
        )

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
            "bbox": parsed_bbox,
            "cells": cells,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/series")
def get_series(
    region: Optional[str] = Query(
        default=None
    ),
    cell_id: Optional[str] = Query(
        default=None
    ),
    variables: Optional[str] = Query(
        default=None
    ),
):
    try:
        selected_region = (
            resolve_region(
                region,
                cell_id,
            )
        )

        selected_variables = (
            parse_variables(
                variables
            )
        )

        payload = (
            build_engine_payload(
                selected_region
            )
        )

        series = []

        for (
            year,
            ndvi,
            precipitation,
        ) in zip(
            payload["years"],
            payload["ndvi_values"],
            payload[
                "precipitation_values"
            ],
        ):
            point = {
                "year": year,
            }

            if (
                "ndvi"
                in selected_variables
            ):
                point["ndvi"] = (
                    ndvi
                )

            if (
                "precipitation"
                in selected_variables
            ):
                point[
                    "precipitation_mm"
                ] = precipitation

            series.append(point)

        return {
            "status": "ok",
            "source":
                "processed_real_data",
            "region":
                selected_region,
            "cell_id":
                payload["cell_id"],
            "period":
                payload["period"],
            "variables":
                selected_variables,
            "total_observations":
                len(series),
            "quality":
                payload["quality"],
            "metadata":
                payload["metadata"],
            "series":
                series,
        }

    except HTTPException:
        raise

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