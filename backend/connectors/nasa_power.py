import logging
from typing import Any, Dict, Iterable

import httpx

from backend.app.config import NASA_TIMEOUT_SECONDS


logger = logging.getLogger(
    "earthshift.nasa_power"
)


BASE_URL = (
    "https://power.larc.nasa.gov"
    "/api/temporal/daily/point"
)


DEFAULT_PARAMETERS = [
    "PRECTOTCORR",
    "T2M",
]


class NASAPowerError(RuntimeError):
    pass


def _validate_coordinates(
    latitude: float,
    longitude: float,
) -> None:
    if not -90 <= latitude <= 90:
        raise ValueError(
            "latitude debe estar entre -90 y 90."
        )

    if not -180 <= longitude <= 180:
        raise ValueError(
            "longitude debe estar entre -180 y 180."
        )


def _validate_date(
    value: str,
) -> None:
    if len(value) != 8 or not value.isdigit():
        raise ValueError(
            "La fecha debe usar formato YYYYMMDD."
        )


def request_daily_point(
    latitude: float,
    longitude: float,
    start: str,
    end: str,
    parameters: Iterable[str] | None = None,
) -> Dict[str, Any]:
    _validate_coordinates(
        latitude,
        longitude,
    )

    _validate_date(start)
    _validate_date(end)

    selected_parameters = list(
        parameters
        or DEFAULT_PARAMETERS
    )

    if not selected_parameters:
        raise ValueError(
            "Debe solicitarse al menos un parametro."
        )

    params = {
        "parameters": ",".join(
            selected_parameters
        ),
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": start,
        "end": end,
        "format": "JSON",
        "time-standard": "UTC",
    }

    logger.info(
        (
            "NASA POWER request "
            "lat=%s lon=%s start=%s end=%s "
            "parameters=%s"
        ),
        latitude,
        longitude,
        start,
        end,
        ",".join(selected_parameters),
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
        raise NASAPowerError(
            "NASA POWER timeout."
        ) from error

    except httpx.HTTPError as error:
        raise NASAPowerError(
            "No se pudo conectar con NASA POWER."
        ) from error

    if response.status_code == 429:
        raise NASAPowerError(
            "NASA POWER rate limit."
        )

    if response.status_code != 200:
        raise NASAPowerError(
            (
                "NASA POWER respondio HTTP "
                f"{response.status_code}."
            )
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise NASAPowerError(
            "NASA POWER devolvio JSON invalido."
        ) from error

    properties = payload.get(
        "properties",
        {},
    )

    parameter_data = properties.get(
        "parameter",
        {},
    )

    if not parameter_data:
        raise NASAPowerError(
            "NASA POWER no devolvio series."
        )

    return {
        "source": "NASA POWER",
        "provider": "NASA",
        "endpoint": BASE_URL,
        "latitude": latitude,
        "longitude": longitude,
        "start": start,
        "end": end,
        "parameters": selected_parameters,
        "time_standard": "UTC",
        "demo": False,
        "data": parameter_data,
        "metadata": {
            "community": "AG",
            "temporal_resolution": "daily",
            "spatial_mode": "point",
            "api_verified": True,
        },
    }


def get_piura_sample() -> Dict[str, Any]:
    return request_daily_point(
        latitude=-5.1945,
        longitude=-80.6328,
        start="20260101",
        end="20260107",
        parameters=[
            "PRECTOTCORR",
            "T2M",
        ],
    )


if __name__ == "__main__":
    import json

    result = get_piura_sample()

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False,
        )
    )