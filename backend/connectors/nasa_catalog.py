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
            "QA",
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
        "status": "processed_data_available",
        "verified_against_current_csv": False,
        "api_verified": False,
        "used_by_engines": True,
        "notes": (
            "Producto recomendado por la guia. "
            "Los CSV procesados actuales contienen datos MODIS, "
            "pero debe confirmarse mediante manifiesto o script "
            "que provienen exactamente de MOD13Q1 v061."
        ),
    },
    {
        "id": "gpm_imerg_precipitation",
        "variable": "precipitation",
        "provider": "NASA",
        "mission": "GPM",
        "product": "IMERG",
        "version": "V07",
        "bands": [
            "precipitation",
        ],
        "unit": "mm",
        "spatial_resolution": "approximately 0.1 degree",
        "temporal_resolution": (
            "subdaily/daily/monthly depending on product"
        ),
        "access_methods": [
            "NASA Earthdata",
            "GES DISC",
            "CMR",
        ],
        "status": "target_source_not_verified",
        "verified_against_current_csv": False,
        "api_verified": False,
        "used_by_engines": False,
        "notes": (
            "Fuente objetivo recomendada para precipitacion. "
            "No debe afirmarse que earthshift_general_mensual.csv "
            "proviene de IMERG hasta confirmar su procedencia."
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
        "verified_against_current_csv": False,
        "api_verified": True,
        "used_by_engines": False,
        "notes": (
            "Fuente NASA real verificada mediante API. "
            "Consulta probada para Piura con PRECTOTCORR y T2M. "
            "NASA POWER no debe confundirse con GPM IMERG."
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
        "verified_against_current_csv": False,
        "api_verified": True,
        "used_by_engines": False,
        "notes": (
            "Segunda fuente NASA real verificada mediante API. "
            "Se utiliza como fuente contextual de eventos. "
            "No sustituye MODIS ni GPM IMERG en los motores."
        ),
    },
    {
        "id": "modis_lst",
        "variable": "land_surface_temperature",
        "provider": "NASA",
        "mission": "Terra/Aqua MODIS",
        "product": "MODIS LST",
        "version": None,
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
        "status": "processed_partial",
        "verified_against_current_csv": False,
        "api_verified": False,
        "used_by_engines": False,
        "notes": (
            "Disponible de forma parcial en datos procesados. "
            "Producto y version exactos deben confirmarse."
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
        if not item.get("api_verified")
        and not item.get(
            "verified_against_current_csv"
        )
    ]


def get_catalog_summary() -> Dict[str, Any]:
    return {
        "total_sources": len(NASA_CATALOG),
        "api_verified_sources": len(
            get_api_verified_sources()
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
        "important_note": (
            "processed_real_data no significa "
            "automaticamente NASA API verified."
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