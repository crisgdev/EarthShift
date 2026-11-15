import logging
from typing import Any, Dict, List, Optional

import httpx

from backend.app.config import NASA_TIMEOUT_SECONDS


logger = logging.getLogger(
    "earthshift.nasa_eonet"
)


BASE_URL = (
    "https://eonet.gsfc.nasa.gov"
    "/api/v3/events"
)


class NASAEONETError(RuntimeError):
    pass


def request_events(
    status: str = "open",
    limit: int = 20,
    days: Optional[int] = None,
    category: Optional[str] = None,
) -> Dict[str, Any]:

    if status not in {
        "open",
        "closed",
        "all",
    }:
        raise ValueError(
            "status debe ser open, closed o all."
        )

    if limit < 1 or limit > 100:
        raise ValueError(
            "limit debe estar entre 1 y 100."
        )

    if days is not None and days < 1:
        raise ValueError(
            "days debe ser mayor que 0."
        )

    params: Dict[str, Any] = {
        "status": status,
        "limit": limit,
    }

    if days is not None:
        params["days"] = days

    if category:
        params["category"] = category

    logger.info(
        (
            "NASA EONET request "
            "status=%s limit=%s days=%s category=%s"
        ),
        status,
        limit,
        days,
        category,
    )

    try:
        with httpx.Client(
            timeout=NASA_TIMEOUT_SECONDS
        ) as client:
            response = client.get(
                BASE_URL,
                params=params,
            )

    except httpx.TimeoutException as error:
        raise NASAEONETError(
            "NASA EONET timeout."
        ) from error

    except httpx.HTTPError as error:
        raise NASAEONETError(
            "No se pudo conectar con NASA EONET."
        ) from error

    if response.status_code == 429:
        raise NASAEONETError(
            "NASA EONET rate limit."
        )

    if response.status_code != 200:
        raise NASAEONETError(
            (
                "NASA EONET respondio HTTP "
                f"{response.status_code}."
            )
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise NASAEONETError(
            "NASA EONET devolvio JSON invalido."
        ) from error

    events: List[Dict[str, Any]] = (
        payload.get(
            "events",
            [],
        )
    )

    return {
        "source": "NASA EONET",
        "provider": "NASA",
        "endpoint": BASE_URL,
        "api_version": "v3",
        "status_filter": status,
        "limit": limit,
        "days": days,
        "category": category,
        "demo": False,
        "event_count": len(events),
        "events": events,
        "metadata": {
            "api_verified": True,
            "data_type": (
                "near_real_time_natural_event_metadata"
            ),
            "used_by_engines": False,
            "role": (
                "contextual_event_source"
            ),
        },
    }


def get_recent_events() -> Dict[str, Any]:
    return request_events(
        status="open",
        limit=10,
        days=30,
    )


if __name__ == "__main__":
    import json

    result = get_recent_events()

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False,
        )
    )