from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class VariableItem(BaseModel):
    id: str
    name: str
    unit: str
    source: str
    aggregation: str


class VariablesResponse(BaseModel):
    status: str
    variables: List[VariableItem]


class RegionResponse(BaseModel):
    status: str
    total: int
    regions: List[str]


class BBoxModel(BaseModel):
    west: float
    south: float
    east: float
    north: float


class CellItem(BaseModel):
    cell_id: str
    region: str
    source: str
    status: str


class CellsResponse(BaseModel):
    status: str
    total: int
    bbox: Optional[BBoxModel] = None
    cells: List[CellItem]


class SeriesPoint(BaseModel):
    year: int
    ndvi: Optional[float] = None
    precipitation_mm: Optional[float] = None


class SeriesResponse(BaseModel):
    status: str
    source: str
    region: str
    cell_id: str
    period: str
    variables: List[str]
    total_observations: int
    quality: Dict[str, Any]
    metadata: Dict[str, Any]
    series: List[SeriesPoint]


class FindingQuality(BaseModel):
    valid: bool
    missing: List[str]
    explanation: str


class FindingItem(BaseModel):
    finding_id: str
    cell_id: str
    period: str
    engine: str
    level: str

    variables: List[str]

    evidence: Dict[str, Any]

    counterevidence: List[Any] = Field(
        default_factory=list
    )

    quality: FindingQuality

    explanation: str

    limitations: List[str]

    demo: bool

    data_source: Optional[str] = None

    reference_type: Optional[str] = None

    reversal_detected: Optional[bool] = None

    univariable_level: Optional[str] = None

    multivariable_level: Optional[str] = None


class FindingsResponse(BaseModel):
    status: str
    source: str
    demo: bool
    region: str
    cell_id: str
    period: str
    engine_filter: Optional[str] = None
    total_findings: int
    quality: Dict[str, Any]
    metadata: Dict[str, Any]
    findings: List[FindingItem]