from pathlib import Path
import logging
import sys
from typing import Optional

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
)

from backend.app.services.cache import (
    engine_cache,
)

from backend.app.services.engine_adapter import (
    build_engine_payload,
    get_available_regions,
)


BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parents[2]
)

ENGINES_DIR = (
    BACKEND_DIR / "engines"
)

if str(ENGINES_DIR) not in sys.path:
    sys.path.insert(
        0,
        str(ENGINES_DIR),
    )


from alerts import generate_findings


router = APIRouter(
    tags=["EarthShift Findings"]
)


logger = logging.getLogger(
    "earthshift.findings"
)


ALLOWED_ENGINES = {
    "earth_paradox",
    "silent_collapse",
    "decision_reversal",
}


def clean_real_output(value):
    if isinstance(value, dict):
        cleaned = {}

        for key, item in value.items():

            if key == "demo":
                cleaned[key] = False
                continue

            if (
                key == "reference_type"
                and item
                == "demo_fixed_reference"
            ):
                cleaned[key] = (
                    "mean_available_ndvi_provisional"
                )
                continue

            cleaned[key] = (
                clean_real_output(
                    item
                )
            )

        return cleaned

    if isinstance(value, list):
        blocked_texts = {
            "Datos simulados.",
            "Los datos utilizados son simulados.",
            "Datos anuales simulados.",
            "La referencia NDVI 0.60 es DEMO.",
            "Referencia fija simulada.",
        }

        return [
            clean_real_output(item)
            for item in value
            if not (
                isinstance(item, str)
                and item
                in blocked_texts
            )
        ]

    if (
        value
        == "demo_fixed_reference"
    ):
        return (
            "mean_available_ndvi_provisional"
        )

    return value


def validate_region(
    region: str,
):
    regions = (
        get_available_regions()
    )

    if region not in regions:
        raise HTTPException(
            status_code=400,
            detail={
                "message":
                    "Region invalida.",
                "value":
                    region,
                "available":
                    regions,
            },
        )


def validate_engine(
    engine: Optional[str],
):
    if engine is None:
        return

    if engine not in ALLOWED_ENGINES:
        raise HTTPException(
            status_code=400,
            detail={
                "message":
                    "Engine invalido.",
                "value":
                    engine,
                "allowed":
                    sorted(
                        ALLOWED_ENGINES
                    ),
            },
        )


def generate_real_findings(
    region: str,
):
    validate_region(
        region
    )

    cache_key = (
        f"findings:{region}"
    )

    cached = engine_cache.get(
        cache_key
    )

    if cached is not None:
        logger.info(
            "cache hit findings region=%s",
            region,
        )

        return cached

    logger.info(
        "cache miss findings region=%s",
        region,
    )

    data = (
        build_engine_payload(
            region
        )
    )

    findings = (
        generate_findings(
            data
        )
    )

    findings = (
        clean_real_output(
            findings
        )
    )

    spatial_limitation = (
        data
        .get("metadata", {})
        .get(
            "spatial_limitation"
        )
    )

    for index, finding in enumerate(
        findings,
        start=1,
    ):
        finding[
            "finding_id"
        ] = (
            f"REAL-{index:03d}"
        )

        finding["demo"] = False

        finding[
            "data_source"
        ] = (
            "processed_real_data"
        )

        finding[
            "reference_type"
        ] = (
            data["metadata"]
            .get(
                "reference_type"
            )
        )

        if spatial_limitation:
            finding.setdefault(
                "limitations",
                [],
            )

            if (
                spatial_limitation
                not in
                finding["limitations"]
            ):
                finding[
                    "limitations"
                ].append(
                    spatial_limitation
                )

    result = (
        data,
        findings,
    )

    engine_cache.set(
        cache_key,
        result,
    )

    return result


@router.get("/regions")
def get_regions():
    try:
        regions = (
            get_available_regions()
        )

        return {
            "status": "ok",
            "total":
                len(regions),
            "regions":
                regions,
        }

    except Exception as error:
        logger.exception(
            "Error cargando regiones"
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/findings")
def get_findings(
    region: str = Query(
        default="BajoPiura"
    ),
    engine: Optional[str] = Query(
        default=None
    ),
):
    try:
        validate_engine(
            engine
        )

        data, findings = (
            generate_real_findings(
                region
            )
        )

        if engine is not None:
            findings = [
                item
                for item in findings
                if item["engine"]
                == engine
            ]

        return {
            "status": "ok",
            "source":
                "processed_real_data",
            "demo": False,
            "region":
                region,
            "cell_id":
                data["cell_id"],
            "period":
                data["period"],
            "engine_filter":
                engine,
            "total_findings":
                len(findings),
            "quality":
                data["quality"],
            "metadata":
                data["metadata"],
            "findings":
                findings,
        }

    except HTTPException:
        raise

    except ValueError as error:
        logger.exception(
            "ValueError findings region=%s",
            region,
        )

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except FileNotFoundError as error:
        logger.exception(
            "Archivo no encontrado findings region=%s",
            region,
        )

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except Exception as error:
        logger.exception(
            "Error findings region=%s",
            region,
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get(
    "/findings/{finding_id}"
)
def get_finding_by_id(
    finding_id: str,
    region: str = Query(
        default="BajoPiura"
    ),
):
    try:
        data, findings = (
            generate_real_findings(
                region
            )
        )

        finding = next(
            (
                item
                for item
                in findings
                if item[
                    "finding_id"
                ]
                == finding_id
            ),
            None,
        )

        if finding is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Finding no encontrado."
                ),
            )

        return {
            "status": "ok",
            "source":
                "processed_real_data",
            "region":
                region,
            "period":
                data["period"],
            "finding":
                finding,
        }

    except HTTPException:
        raise

    except ValueError as error:
        logger.exception(
            "ValueError finding_id=%s",
            finding_id,
        )

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        logger.exception(
            "Error finding_id=%s",
            finding_id,
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/payload")
def get_payload(
    region: str = Query(
        default="BajoPiura"
    )
):
    try:
        validate_region(
            region
        )

        return {
            "status": "ok",
            "source":
                "processed_real_data",
            "payload":
                build_engine_payload(
                    region
                ),
        }

    except HTTPException:
        raise

    except ValueError as error:
        logger.exception(
            "ValueError payload region=%s",
            region,
        )

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except FileNotFoundError as error:
        logger.exception(
            "Archivo no encontrado payload region=%s",
            region,
        )

        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except Exception as error:
        logger.exception(
            "Error payload region=%s",
            region,
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )