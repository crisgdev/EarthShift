from fastapi import (
    APIRouter,
    HTTPException,
    Query,
)

from backend.app.schemas.intelligence import (
    AdvisorRequest,
    IntelligenceRequest,
)

from backend.app.services.advisor_service import (
    analyze_with_advisor,
)

from backend.app.services.intelligence_context import (
    build_intelligence_context,
)

router = APIRouter(
    prefix="/api/intelligence",
    tags=["EarthShift Intelligence"],
)


@router.get("/context")
def intelligence_context(
    region: str
    = Query(
        default="BajoPiura"
    )
):
    try:
        return (
            build_intelligence_context(
                region
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error


@router.post("/advisor")
@router.post("/chat")
def run_advisor(
    request: IntelligenceRequest
):
    try:
        context = (
            build_intelligence_context(
                request.region
            )
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    advisor = None
    ai_status = "completed"
    ai_error = None

    try:
        advisor = (
            analyze_with_advisor(
                AdvisorRequest(
                    region=
                        context["region"],

                    period=
                        context["period"],

                    engine_results=
                        context["engines"],

                    statistics={
                        "quality":
                            context[
                                "quality"
                            ],

                        "metadata":
                            context[
                                "metadata"
                            ],
                    },

                    question=
                        request.question,
                )
            )
            .model_dump()
        )

    except Exception as error:
        ai_status = "unavailable"
        ai_error = str(error)

    return {
        "status": "ok",

        **context,

        "question":
            request.question,

        "advisor":
            advisor,

        "ai_status":
            ai_status,

        "ai_error":
            ai_error,
    }