from typing import Any

from pydantic import (
    BaseModel,
    Field,
)


class IntelligenceRequest(
    BaseModel
):
    region: str = Field(
        default="BajoPiura",
        min_length=2,
    )

    question: str = Field(
        default="",
        max_length=1200,
    )


class AdvisorRequest(
    BaseModel
):
    region: str

    period: str

    engine_results: dict[
        str,
        Any,
    ]

    statistics: dict[
        str,
        Any,
    ] = Field(
        default_factory=dict
    )

    question: str = ""


class AdvisorResponse(
    BaseModel
):
    resumen: str

    hallazgos: list[str]

    puntos_atencion: list[str]

    recomendaciones: list[str]

    siguientes_pasos: list[str]

    limitaciones: list[str]