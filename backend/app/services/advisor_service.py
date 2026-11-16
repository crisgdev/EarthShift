import json
from typing import Any

from backend.app.config import (
    EARTHSHIFT_DEMO_MODE,
)

from backend.app.schemas.intelligence import (
    AdvisorRequest,
    AdvisorResponse,
)

from backend.app.services.groq_service import (
    generate_groq_response,
)


def _normalize_text_list(
    value: Any,
) -> list[str]:
    if value is None:
        return []

    if isinstance(value, str):
        return [value]

    if not isinstance(value, list):
        return [str(value)]

    normalized: list[str] = []

    for item in value:
        if isinstance(item, str):
            normalized.append(item)
            continue

        if isinstance(item, dict):
            normalized.append(
                json.dumps(
                    item,
                    ensure_ascii=False,
                    sort_keys=True,
                )
            )
            continue

        normalized.append(
            str(item)
        )

    return normalized


def generate_demo_response(
    data: AdvisorRequest,
) -> AdvisorResponse:

    return AdvisorResponse(
        resumen=(
            "MODO DEMOSTRACION: "
            "esta respuesta es simulada. "
            "No constituye un analisis "
            "ambiental de Piura ni una "
            "interpretacion de datos "
            "cientificos reales."
        ),

        hallazgos=[
            (
                "La solicitud fue recibida "
                "correctamente por "
                "EarthShift Advisor."
            ),
            (
                "La region indicada es: "
                + data.region
            ),
            (
                "El periodo indicado es: "
                + data.period
            ),
            (
                "No se evaluaron resultados "
                "ambientales reales."
            ),
        ],

        puntos_atencion=[
            (
                "Los resultados recibidos "
                "corresponden a una prueba "
                "de demostracion."
            ),
            (
                "No se deben utilizar estos "
                "resultados para tomar "
                "decisiones ambientales."
            ),
        ],

        recomendaciones=[
            (
                "Conectar los resultados "
                "reales de los motores "
                "cientificos de EarthShift."
            ),
            (
                "Verificar la calidad y "
                "cobertura temporal de los "
                "datos antes de "
                "interpretarlos."
            ),
        ],

        siguientes_pasos=[
            (
                "Integrar los resultados de "
                "los motores cientificos."
            ),
            (
                "Desactivar el modo "
                "demostracion para utilizar "
                "Groq."
            ),
        ],

        limitaciones=[
            (
                "Respuesta generada por el "
                "modo demostracion."
            ),
            (
                "No se realizaron calculos "
                "estadisticos ni inferencias "
                "ambientales."
            ),
            (
                "No se consulto Groq."
            ),
        ],
    )


def analyze_with_advisor(
    data: AdvisorRequest,
) -> AdvisorResponse:

    if EARTHSHIFT_DEMO_MODE:
        return generate_demo_response(
            data
        )

    scientific_context = {
        "region":
            data.region,

        "period":
            data.period,

        "engine_results":
            data.engine_results,

        "statistics":
            data.statistics,

        "question":
            data.question,
    }

    prompt = f"""
Eres EarthShift Advisor, un asistente especializado en
interpretacion de datos ambientales y analisis cientifico.

Tu funcion es interpretar los resultados proporcionados por
los motores cientificos de EarthShift y responder la pregunta
del usuario cuando exista, sin inventar evidencia.

CONTEXTO CIENTIFICO:

{json.dumps(
    scientific_context,
    ensure_ascii=False,
    indent=2
)}

REGLAS OBLIGATORIAS:

1. No inventes valores, estadisticas, fechas ni observaciones.
2. No modifiques ni recalcules los resultados de los motores.
3. Diferencia los datos observados de las interpretaciones.
4. No afirmes causalidad basandote solo en correlaciones
   o coincidencias temporales.
5. Si faltan datos, indicalo expresamente.
6. No presentes hipotesis como hechos comprobados.
7. Formula recomendaciones relacionadas con la evidencia.
8. Identifica limitaciones e incertidumbres.
9. Utiliza lenguaje cientifico, claro y comprensible.
10. Responde exclusivamente en espanol.
11. Devuelve unicamente un JSON valido.
12. IMPORTANTE: todos los elementos de las listas deben ser
    textos simples. No devuelvas objetos ni diccionarios
    dentro de hallazgos, puntos_atencion, recomendaciones,
    siguientes_pasos o limitaciones.

Estructura requerida:

{{
    "resumen": "Interpretacion general de los resultados",
    "hallazgos": [
        "Texto del hallazgo 1",
        "Texto del hallazgo 2"
    ],
    "puntos_atencion": [
        "Texto"
    ],
    "recomendaciones": [
        "Texto"
    ],
    "siguientes_pasos": [
        "Texto"
    ],
    "limitaciones": [
        "Texto"
    ]
}}
"""

    response_text = (
        generate_groq_response(
            prompt
        )
    )

    try:
        result = json.loads(
            response_text
        )

        normalized = {
            "resumen":
                str(
                    result.get(
                        "resumen",
                        "",
                    )
                ),

            "hallazgos":
                _normalize_text_list(
                    result.get(
                        "hallazgos",
                        [],
                    )
                ),

            "puntos_atencion":
                _normalize_text_list(
                    result.get(
                        "puntos_atencion",
                        [],
                    )
                ),

            "recomendaciones":
                _normalize_text_list(
                    result.get(
                        "recomendaciones",
                        [],
                    )
                ),

            "siguientes_pasos":
                _normalize_text_list(
                    result.get(
                        "siguientes_pasos",
                        [],
                    )
                ),

            "limitaciones":
                _normalize_text_list(
                    result.get(
                        "limitaciones",
                        [],
                    )
                ),
        }

        return AdvisorResponse(
            **normalized
        )

    except (
        json.JSONDecodeError,
        ValueError,
        TypeError,
    ) as error:

        raise RuntimeError(
            "No se pudo interpretar "
            "correctamente la respuesta "
            f"de Groq: {error}"
        ) from error