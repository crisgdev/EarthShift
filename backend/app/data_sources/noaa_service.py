
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


NOAA_RONI_URL = (
    "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt"
)


def fetch_roni_data() -> str:
    """
    Descarga el registro histórico RONI publicado por NOAA CPC.

    Returns:
        str: Contenido original del archivo ASCII.

    Raises:
        RuntimeError: Si NOAA no está disponible o la respuesta es inválida.
    """

    request = Request(
        NOAA_RONI_URL,
        headers={
            "User-Agent": "EarthShift-Intelligence/1.0",
            "Accept": "text/plain",
        },
    )

    try:
        with urlopen(request, timeout=30) as response:
            content = response.read().decode("utf-8")

            if not content.strip():
                raise RuntimeError(
                    "NOAA devolvió un archivo vacío."
                )

            if "SEAS" not in content.splitlines()[0]:
                raise RuntimeError(
                    "El formato recibido de NOAA no es el esperado."
                )

            return content

    except HTTPError as error:
        raise RuntimeError(
            f"NOAA respondió con el código HTTP {error.code}."
        ) from error

    except (URLError, TimeoutError, OSError) as error:
        raise RuntimeError(
            f"No fue posible conectar con NOAA: {error}"
        ) from error
