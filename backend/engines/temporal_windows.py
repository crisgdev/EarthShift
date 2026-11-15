
import math
import json


def analyze_temporal_windows(years, values, window_size=3):
    """
    Analiza cambios de NDVI en ventanas temporales.

    Regla DEMO:
    Una ventana es decreciente cuando su ultimo
    valor es menor que el primero.

    No realiza pruebas de significancia.
    """

    if not isinstance(years, (list, tuple)):
        raise ValueError("Los años deben estar en una lista.")

    if not isinstance(values, (list, tuple)):
        raise ValueError("Los valores deben estar en una lista.")

    if len(years) != len(values):
        raise ValueError(
            "Los años y valores deben tener la misma longitud."
        )

    if (
        isinstance(window_size, bool)
        or not isinstance(window_size, int)
        or window_size < 2
    ):
        raise ValueError("El tamaño de ventana no es valido.")

    if len(values) < window_size:
        return {
            "status": "sin datos",
            "total_windows": 0,
            "decreasing_windows": 0,
            "all_windows_decreasing": False,
            "windows": [],
            "demo": True
        }

    for year in years:
        if isinstance(year, bool) or not isinstance(year, int):
            raise ValueError("Los años deben ser enteros.")

    if any(
        years[i] <= years[i - 1]
        for i in range(1, len(years))
    ):
        raise ValueError(
            "Los años deben estar ordenados y sin repetirse."
        )

    for value in values:
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value < -1
            or value > 1
        ):
            raise ValueError("NDVI invalido.")

    windows = []

    for start in range(len(values) - window_size + 1):
        end = start + window_size

        window_values = values[start:end]
        window_years = years[start:end]

        change = round(
            window_values[-1] - window_values[0],
            6
        )

        if change < 0:
            direction = "decreciente"
        elif change > 0:
            direction = "creciente"
        else:
            direction = "estable"

        windows.append({
            "start_year": window_years[0],
            "end_year": window_years[-1],
            "initial_ndvi": window_values[0],
            "final_ndvi": window_values[-1],
            "change": change,
            "direction": direction
        })

    decreasing = sum(
        1
        for window in windows
        if window["direction"] == "decreciente"
    )

    total = len(windows)

    return {
        "status": "calculado",
        "window_size": window_size,
        "total_windows": total,
        "decreasing_windows": decreasing,
        "decreasing_fraction": round(
            decreasing / total, 4
        ),
        "all_windows_decreasing": decreasing == total,
        "windows": windows,
        "method": "rolling_endpoint_change",
        "demo": True,
        "limitations": [
            "Las ventanas se superponen.",
            "No son observaciones independientes.",
            "Solo compara extremos de cada ventana.",
            "No analiza estacionalidad.",
            "No analiza autocorrelacion.",
            "No demuestra deterioro ambiental."
        ]
    }


if __name__ == "__main__":

    years = [2021, 2022, 2023, 2024, 2025]

    scenarios = {
        "Disminucion continua": [
            0.62, 0.59, 0.55, 0.52, 0.48
        ],
        "Aumento continuo": [
            0.40, 0.45, 0.50, 0.55, 0.60
        ],
        "Serie estable": [
            0.50, 0.50, 0.50, 0.50, 0.50
        ],
        "Serie variable": [
            0.60, 0.55, 0.58, 0.53, 0.56
        ]
    }

    for name, values in scenarios.items():
        result = analyze_temporal_windows(
            years, values, window_size=3
        )

        print("\nESCENARIO:", name)
        print(json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        ))

    print("\nVENTANAS TEMPORALES FINALIZADAS")
