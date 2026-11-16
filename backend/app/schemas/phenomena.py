from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class PhenomenaRequest(BaseModel):
    region: str = Field(default="BajoPiura", min_length=2)


class PhenomenaRelationship(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    phenomenon: str
    observation: str
    interpretation: str
    causality_established: Literal[False]


class PhenomenaInterpretation(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    status: Literal["completed"]
    summary: str
    findings: list[str]
    possible_relationships: list[PhenomenaRelationship]
    limitations: list[str]
    research_questions: list[str]


class PhenomenaResponse(BaseModel):
    region: str
    period: str
    phenomena: list[dict[str, Any]]
    temporal_comparisons: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    limitations: list[str]
    sources: list[dict[str, Any]]
    engine_results: dict[str, Any] = Field(default_factory=dict)
    ai_interpretation: PhenomenaInterpretation | None = None
    ai_status: str = "disabled"
