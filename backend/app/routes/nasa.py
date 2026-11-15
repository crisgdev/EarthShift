from fastapi import APIRouter, HTTPException, Query

from backend.connectors.nasa_catalog import (
    get_catalog,
    get_catalog_summary,
    get_catalog_item,
)

from backend.connectors.nasa_power import (
    NASAPowerError,
    request_daily_point,
)


router = APIRouter(
    prefix="/nasa",
    tags=["NASA"],
)


@router.get("/catalog")
def nasa_catalog():
    return {
        "status": "ok",
        "summary": get_catalog_summary(),
        "sources": get_catalog(),
    }


@router.get("/catalog/{source_id}")
def nasa_catalog_item(
    source_id: str,
):
    item = get_catalog_item(
        source_id
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Fuente NASA no encontrada.",
        )

    return {
        "status": "ok",
        "source": item,
    }


@router.get("/power")
def nasa_power(
    latitude: float = Query(
        default=-5.1945,
        ge=-90,
        le=90,
    ),
    longitude: float = Query(
        default=-80.6328,
        ge=-180,
        le=180,
    ),
    start: str = Query(
        default="20260101",
    ),
    end: str = Query(
        default="20260107",
    ),
):
    try:
        result = request_daily_point(
            latitude=latitude,
            longitude=longitude,
            start=start,
            end=end,
            parameters=[
                "PRECTOTCORR",
                "T2M",
            ],
        )

        return {
            "status": "ok",
            **result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except NASAPowerError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        )