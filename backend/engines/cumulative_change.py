
import math
import json


def analyze_cumulative_change(values):
    """
    Calcula el cambio entre el primer y
    el ultimo valor del NDVI.

    Analisis preliminar con datos DEMO.
    """

    # 1. Validar entrada
    if not isinstance(values, (list, tuple)):
        raise ValueError(
            "Los valores deben estar en una lista."
        )

    if len(values) < 2:
        return {
            "status": "sin datos",
            "explanation": "Observaciones insuficientes.",
            "demo": True
        }

    for value in values:
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
        ):
            raise ValueError(
                "La serie contiene valores invalidos."
            )

        if value < -1 or value > 1:
            raise ValueError(
                "NDVI fuera del rango permitido."
            )

    # 2. Obtener valores inicial y final
    initial = values[0]
    final = values[-1]

    # 3. Calcular cambio absoluto
    absolute_change = round(
        final - initial, 6
    )

    # 4. Calcular cambio relativo
    # Solo se calcula cuando el valor inicial
    # es positivo y diferente de cero.
    if initial > 0:
        relative_change = round(
            (absolute_change / initial) * 100,
            2
        )
    else:
        relative_change = None

    # 5. Determinar direccion
    if absolute_change < 0:
        direction = "disminucion"
    elif absolute_change > 0:
        direction = "aumento"
    else:
        direction = "estable"

    # 6. Resultado
    return {
        "status": "calculado",
        "initial_ndvi": initial,
        "final_ndvi": final,
        "absolute_change": absolute_change,
        "relative_change_percent": relative_change,
        "direction": direction,
        "observations": len(values),
        "method": "endpoint_change",
        "demo": True,
        "limitations": [
            "Compara solamente el primer y ultimo valor.",
            "No mide acumulacion de anomalias.",
            "No se ha evaluado estacionalidad.",
            "El cambio relativo no representa perdida de superficie vegetal.",
            "No demuestra causalidad."
        ]
    }


if __name__ == "__main__":

    examples = {
        "Disminucion":
            [0.62, 0.59, 0.55, 0.52, 0.48],

        "Aumento":
            [0.40, 0.45, 0.50, 0.55, 0.60],

        "Estable":
            [0.50, 0.50, 0.50, 0.50, 0.50],

        "Variable":
            [0.60, 0.55, 0.58, 0.53, 0.56]
    }

    for name, values in examples.items():

        result = analyze_cumulative_change(values)

        print(f"\nESCENARIO: {name}")

        print(json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        ))

    print("\nANALISIS ACUMULADO FINALIZADO")
