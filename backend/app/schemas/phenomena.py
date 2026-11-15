from typing import Any
from pydantic import BaseModel, Field


class PhenomenaRequest(BaseModel):
    region: str = Field(default="BajoPiura", min_length=2)


class PhenomenaResponse(BaseModel):
    region: str
    period: str
    phenomena: list[dict[str, Any]]
    temporal_comparisons: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    limitations: list[str]
    sources: list[dict[str, Any]]
    engine_results: dict[str, Any] = Field(default_factory=dict)
    ai_interpretation: dict[str, Any] | None = None
    ai_status: str = "disabled"
