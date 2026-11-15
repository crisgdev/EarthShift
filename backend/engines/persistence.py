
import math


def analyze_persistence(values):
    """
    Analiza si una serie presenta disminuciones
    consecutivas.

    Regla DEMO: al menos 3 disminuciones
    consecutivas indican persistencia preliminar.
    """

    if not isinstance(values, (list, tuple)):
        raise ValueError("Se requiere una lista de valores.")

    if len(values) < 4:
        return {
            "status": "sin datos",
            "persistent_decline": False,
            "max_consecutive_declines": 0
        }

    for value in values:
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
        ):
            raise ValueError("La serie contiene valores invalidos.")

    consecutive = 0
    maximum = 0

    for i in range(1, len(values)):
        if values[i] < values[i - 1]:
            consecutive += 1
            maximum = max(maximum, consecutive)
        else:
            consecutive = 0

    return {
        "status": "calculado",
        "persistent_decline": maximum >= 3,
        "max_consecutive_declines": maximum,
        "observations": len(values),
        "method": "consecutive_declines",
        "demo": True,
        "limitations": [
            "Regla preliminar de tres disminuciones.",
            "No se ha evaluado estacionalidad.",
            "No se ha evaluado autocorrelacion.",
            "No demuestra deterioro ambiental real."
        ]
    }


if __name__ == "__main__":
    examples = {
        "Disminucion persistente":
            [0.65, 0.60, 0.55, 0.50, 0.45],
        "Vegetacion en aumento":
            [0.40, 0.45, 0.50, 0.55, 0.60],
        "Vegetacion estable":
            [0.50, 0.50, 0.50, 0.50, 0.50],
        "Vegetacion variable":
            [0.60, 0.55, 0.58, 0.53, 0.56]
    }

    for name, values in examples.items():
        result = analyze_persistence(values)

        print(f"\n{name}")
        print(
            "Disminucion persistente:",
            result["persistent_decline"]
        )
        print(
            "Maximo de disminuciones consecutivas:",
            result["max_consecutive_declines"]
        )
