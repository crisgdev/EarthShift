
import math


def validate_payload(payload):
    """
    Valida las series ambientales antes del analisis.
    """

    if not isinstance(payload, dict):
        raise ValueError("La entrada debe ser un objeto JSON.")

    required = [
        "cell_id",
        "period",
        "years",
        "ndvi_values",
        "precipitation_values",
        "quality"
    ]

    for field in required:
        if field not in payload:
            raise ValueError(
                f"Falta el campo obligatorio: {field}"
            )

    for field in ["cell_id", "period"]:
        if (
            not isinstance(payload[field], str)
            or not payload[field].strip()
        ):
            raise ValueError(
                f"{field} debe ser un texto no vacio."
            )

    years = payload["years"]
    ndvi = payload["ndvi_values"]
    precipitation = payload["precipitation_values"]

    if not all(
        isinstance(series, list)
        for series in [years, ndvi, precipitation]
    ):
        raise ValueError(
            "Las series deben ser listas."
        )

    if not (
        len(years) == len(ndvi) == len(precipitation)
    ):
        raise ValueError(
            "Las series tienen longitudes diferentes."
        )

    if len(years) < 4:
        raise ValueError(
            "Se requieren al menos cuatro observaciones."
        )

    if any(
        isinstance(year, bool)
        or not isinstance(year, int)
        for year in years
    ):
        raise ValueError(
            "Los años deben ser numeros enteros."
        )

    if len(set(years)) != len(years):
        raise ValueError(
            "Existen años repetidos."
        )

    if years != sorted(years):
        raise ValueError(
            "Los años deben estar ordenados."
        )

    for name, values in [
        ("ndvi", ndvi),
        ("precipitation", precipitation)
    ]:
        for value in values:
            if (
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or not math.isfinite(value)
            ):
                raise ValueError(
                    f"Valor invalido en {name}."
                )

    if any(value < -1 or value > 1 for value in ndvi):
        raise ValueError(
            "NDVI fuera del rango [-1, 1]."
        )

    if any(value < 0 for value in precipitation):
        raise ValueError(
            "La precipitacion no puede ser negativa."
        )

    if not isinstance(payload["quality"], dict):
        raise ValueError(
            "quality debe ser un objeto JSON."
        )

    return True
