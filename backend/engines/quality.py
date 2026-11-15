
import math


MIN_COVERAGE = 0.80


def check_variable_quality(quality, variables):
    """
    Comprueba la cobertura de cada variable.

    Umbral provisional: 80 %.
    """

    if not isinstance(quality, dict):
        return {
            "valid": False,
            "missing": list(variables),
            "explanation": "No hay informacion de calidad."
        }

    variable_quality = quality.get("variables", {})

    if not isinstance(variable_quality, dict):
        variable_quality = {}

    invalid = []

    for variable in variables:
        details = variable_quality.get(variable, {})

        if not isinstance(details, dict):
            invalid.append(variable)
            continue

        coverage = details.get("valid_fraction")

        if (
            isinstance(coverage, bool)
            or not isinstance(coverage, (int, float))
            or not math.isfinite(coverage)
            or coverage < MIN_COVERAGE
            or coverage > 1
        ):
            invalid.append(variable)

    return {
        "valid": len(invalid) == 0,
        "missing": invalid,
        "explanation": (
            "Cobertura suficiente en todas las variables."
            if not invalid else
            "Cobertura insuficiente o desconocida: "
            + ", ".join(invalid)
        )
    }


if __name__ == "__main__":
    example = {
        "variables": {
            "ndvi": {"valid_fraction": 0.90},
            "precipitation": {"valid_fraction": 0.75}
        }
    }

    print(check_variable_quality(
        example, ["ndvi", "precipitation"]
    ))
