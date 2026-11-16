import logging

from fastapi import APIRouter, HTTPException

from backend.app.config import (
    EARTHSHIFT_PHENOMENA_AI_ENABLED,
)
from backend.app.schemas.phenomena import (
    PhenomenaRequest,
    PhenomenaResponse,
)
from backend.app.services.intelligence_context import (
    build_intelligence_context,
)
from backend.app.services.phenomena_ai_service import (
    interpret_phenomena,
)
from backend.app.services.phenomena_service import (
    investigate_phenomena,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/intelligence",
    tags=["EarthShift Phenomena"],
)


@router.post(
    "/phenomena",
    response_model=PhenomenaResponse,
)
def run_phenomena(
    request: PhenomenaRequest,
):
    try:
        context = build_intelligence_context(
            request.region
        )

        result = investigate_phenomena(
            region=context["region"],
            period=context["period"],
            engine_results={
                "anomalies":
                    context["anomalies"],
                "engines":
                    context["engines"],
            },
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "No fue posible obtener "
                "los registros cientificos "
                "de NOAA."
            ),
        ) from error

    result["engine_results"] = (
        context["engines"]
    )

    result["ai_interpretation"] = None
    result["ai_status"] = "disabled"

    if EARTHSHIFT_PHENOMENA_AI_ENABLED:
        try:
            result[
                "ai_interpretation"
            ] = interpret_phenomena(
                result
            )

            result["ai_status"] = (
                "completed"
            )

        except Exception as error:
            logger.exception(
                "EarthShift Phenomena "
                "no pudo obtener la "
                "interpretacion de Groq: %s",
                error,
            )

            result["ai_status"] = (
                "unavailable"
            )

    return result