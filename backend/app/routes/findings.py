from pathlib import Path
import sys

from fastapi import APIRouter, HTTPException, Query


BACKEND_DIR = Path(__file__).resolve().parents[2]
ENGINES_DIR = BACKEND_DIR / "engines"

if str(ENGINES_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINES_DIR))


from alerts import generate_findings

from backend.app.services.engine_adapter import (
    build_engine_payload,
    get_available_regions,
)


router = APIRouter(
    tags=["EarthShift Findings"]
)


def clean_real_output(value):
    if isinstance(value, dict):
        cleaned = {}

        for key, item in value.items():
            if key == "demo":
                cleaned[key] = False
            else:
                cleaned[key] = clean_real_output(item)

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
                and item in blocked_texts
            )
        ]

    return value


def generate_real_findings(region):
    data = build_engine_payload(
        region
    )

    findings = generate_findings(
        data
    )

    findings = clean_real_output(
        findings
    )

    spatial_limitation = (
        data
        .get("metadata", {})
        .get("spatial_limitation")
    )

    for index, finding in enumerate(
        findings,
        start=1
    ):
        finding["finding_id"] = (
            f"REAL-{index:03d}"
        )

        finding["demo"] = False

        finding["data_source"] = (
            "processed_real_data"
        )

        finding["reference_type"] = (
            data["metadata"].get(
                "reference_type"
            )
        )

        if spatial_limitation:
            finding.setdefault(
                "limitations",
                []
            )

            if (
                spatial_limitation
                not in finding["limitations"]
            ):
                finding[
                    "limitations"
                ].append(
                    spatial_limitation
                )

    return data, findings


@router.get("/regions")
def get_regions():
    try:
        regions = get_available_regions()

        return {
            "status": "ok",
            "total": len(regions),
            "regions": regions,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/findings")
def get_findings(
    region: str = Query(
        default="BajoPiura"
    )
):
    try:
        data, findings = (
            generate_real_findings(
                region
            )
        )

        return {
            "status": "ok",
            "source":
                "processed_real_data",
            "demo": False,
            "region": region,
            "cell_id":
                data["cell_id"],
            "period":
                data["period"],
            "total_findings":
                len(findings),
            "quality":
                data["quality"],
            "metadata":
                data["metadata"],
            "findings":
                findings,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )


@router.get("/findings/{finding_id}")
def get_finding_by_id(
    finding_id: str,
    region: str = Query(
        default="BajoPiura"
    )
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
                for item in findings
                if item["finding_id"]
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
            "region": region,
            "period":
                data["period"],
            "finding":
                finding,
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
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
        return {
            "status": "ok",
            "source":
                "processed_real_data",
            "payload":
                build_engine_payload(
                    region
                ),
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )