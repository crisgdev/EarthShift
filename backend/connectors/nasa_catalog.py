from typing import Any, Dict, List


NASA_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "modis_ndvi",
        "variable": "ndvi",
        "provider": "NASA",
        "mission": "Terra MODIS",
        "product": "MOD13Q1",
        "version": "061",
        "bands": [
            "NDVI",
            "EVI",
            "pixel_reliability",
            "VI_Quality_MODLAND",
            "VI_Quality_Adjacent_cloud_detected",
            "VI_Quality_Possible_shadow",
        ],
        "unit": "index",
        "spatial_resolution": "250 m",
        "temporal_resolution": "16 days",
        "coverage_start": "2000",
        "access_methods": [
            "NASA Earthdata",
            "AppEEARS",
            "CMR",
        ],
        "raw_file": (
            "Piura-Variables-MODIS-"
            "MOD13Q1-061-results.csv"
        ),
        "processing_script": (
            "backend/processing/"
            "clean_modis_vegetacion.py"
        ),
        "qa_manifest": (
            "data/processed/"
            "qa_modis_vegetacion.json"
        ),
        "status": "provenance_verified",
        "api_verified": False,
        "provenance_verified": True,
        "verified_against_current_csv": True,
        "used_by_engines": True,
        "notes": (
            "La procedencia MODIS MOD13Q1.061 esta "
            "documentada por el script de procesamiento, "
            "archivo crudo y manifiesto QA del repositorio."
        ),
    },
    {
        "id": "gpm_imerg_precipitation",
        "variable": "precipitation",
        "provider": "NASA",
        "mission": "GPM",
        "product": "GPM_3IMERGM",
        "version": "07",
        "bands": [
            "precipitation",
        ],
        "unit": "mm",
        "spatial_resolution": (
            "regional series for Piura in current pipeline"
        ),
        "temporal_resolution": "monthly",
        "access_methods": [
            "NASA Earthdata",
            "GES DISC",
            "CMR",
        ],
        "raw_file": (
            "g4.areaAvgTimeSeries."
            "GPM_3IMERGM_07_precipitation."
            "20000101-20260930."
            "81W_6S_79W_4S.csv"
        ),
        "download_script": (
            "data/scripts/download_gpm.py"
        ),
        "processing_script": (
            "backend/processing/"
            "clean_precipitation.py"
        ),
        "status": "provenance_verified",
        "api_verified": False,
        "provenance_verified": True,
        "verified_against_current_csv": True,
        "used_by_engines": True,
        "spatial_match": "approximate",
        "notes": (
            "La procedencia GPM IMERG V07 esta "
            "documentada por el script de descarga y "
            "procesamiento del repositorio. "
            "La serie representa Piura general y no "
            "coincide exactamente con cada zona MODIS."
        ),
    },
    {
        "id": "nasa_power",
        "variable": "precipitation_and_temperature",
        "provider": "NASA",
        "mission": "POWER",
        "product": "NASA POWER API",
        "version": None,
        "bands": [
            "PRECTOTCORR",
            "T2M",
        ],
        "unit": "depends_on_parameter",
        "spatial_resolution": "point service",
        "temporal_resolution": "daily",
        "access_methods": [
            "NASA POWER API",
        ],
        "endpoint": (
            "https://power.larc.nasa.gov"
            "/api/temporal/daily/point"
        ),
        "status": "operational_verified",
        "api_verified": True,
        "provenance_verified": True,
        "verified_against_current_csv": False,
        "used_by_engines": False,
        "notes": (
            "Fuente NASA real verificada mediante API. "
            "Consulta probada para Piura con "
            "PRECTOTCORR y T2M. "
            "NASA POWER no es GPM IMERG."
        ),
    },
    {
        "id": "nasa_eonet",
        "variable": "natural_events",
        "provider": "NASA",
        "mission": "EONET",
        "product": "EONET API",
        "version": "v3",
        "bands": [],
        "unit": "event_metadata",
        "spatial_resolution": "event dependent",
        "temporal_resolution": "near real time",
        "access_methods": [
            "NASA EONET API",
        ],
        "endpoint": (
            "https://eonet.gsfc.nasa.gov"
            "/api/v3/events"
        ),
        "status": "operational_verified",
        "api_verified": True,
        "provenance_verified": True,
        "verified_against_current_csv": False,
        "used_by_engines": False,
        "notes": (
            "Fuente NASA real verificada mediante API. "
            "Se utiliza como fuente contextual. "
            "No sustituye MODIS ni GPM IMERG."
        ),
    },
    {
        "id": "modis_lst",
        "variable": "land_surface_temperature",
        "provider": "NASA",
        "mission": "Terra MODIS",
        "product": "MOD11A2",
        "version": "061",
        "bands": [
            "LST",
        ],
        "unit": "degrees_celsius_after_scaling",
        "spatial_resolution": "product dependent",
        "temporal_resolution": "product dependent",
        "access_methods": [
            "NASA Earthdata",
            "AppEEARS",
            "CMR",
        ],
        "raw_file": (
            "Piura-Variables-MODIS-"
            "MOD11A2-061-results.csv"
        ),
        "processing_script": (
            "backend/processing/"
            "clean_modis_temperatura.py"
        ),
        "status": "provenance_verified_partial",
        "api_verified": False,
        "provenance_verified": True,
        "verified_against_current_csv": False,
        "used_by_engines": False,
        "notes": (
            "El repositorio contiene procesamiento "
            "MOD11A2.061 y conversion de Kelvin "
            "a Celsius. Actualmente no es variable "
            "principal de los motores."
        ),
    },
]


def get_catalog() -> List[Dict[str, Any]]:
    return NASA_CATALOG


def get_catalog_item(
    source_id: str,
) -> Dict[str, Any] | None:
    for item in NASA_CATALOG:
        if item["id"] == source_id:
            return item

    return None


def get_engine_sources() -> List[Dict[str, Any]]:
    return [
        item
        for item in NASA_CATALOG
        if item.get("used_by_engines")
    ]


def get_api_verified_sources() -> List[Dict[str, Any]]:
    return [
        item
        for item in NASA_CATALOG
        if item.get("api_verified")
    ]


def get_provenance_verified_sources() -> List[Dict[str, Any]]:
    return [
        item
        for item in NASA_CATALOG
        if item.get("provenance_verified")
    ]


def get_csv_verified_sources() -> List[Dict[str, Any]]:
    return [
        item
        for item in NASA_CATALOG
        if item.get(
            "verified_against_current_csv"
        )
    ]


def get_pending_verification_sources() -> List[Dict[str, Any]]:
    return [
        item
        for item in NASA_CATALOG
        if not item.get(
            "provenance_verified"
        )
    ]


def get_catalog_summary() -> Dict[str, Any]:
    return {
        "total_sources": len(NASA_CATALOG),
        "api_verified_sources": len(
            get_api_verified_sources()
        ),
        "provenance_verified_sources": len(
            get_provenance_verified_sources()
        ),
        "csv_verified_sources": len(
            get_csv_verified_sources()
        ),
        "pending_verification": len(
            get_pending_verification_sources()
        ),
        "engine_sources": [
            item["id"]
            for item in get_engine_sources()
        ],
        "api_verified_ids": [
            item["id"]
            for item in get_api_verified_sources()
        ],
        "provenance_verified_ids": [
            item["id"]
            for item in
            get_provenance_verified_sources()
        ],
        "engine_nasa_sources_verified": [
            item["id"]
            for item in get_engine_sources()
            if item.get("provenance_verified")
        ],
        "important_note": (
            "NASA POWER y EONET estan verificados "
            "mediante API. MODIS MOD13Q1.061 y "
            "GPM IMERG V07 cuentan con evidencia "
            "reproducible de procedencia en el repositorio."
        ),
    }


if __name__ == "__main__":
    import json

    print(
        json.dumps(
            {
                "summary": get_catalog_summary(),
                "sources": get_catalog(),
            },
            indent=2,
            ensure_ascii=False,
        )
    )